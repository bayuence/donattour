# Technical Design Document

## System Overview

Advanced Outlet Reporting System adalah sistem pelaporan outlet real-time yang menggantikan laporan outlet statis yang ada. Sistem ini mengintegrasikan data dari produksi, kasir, pengeluaran, dan closing dengan arsitektur real-time yang scalable untuk 5000+ outlet.

## Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
├─────────────────────────────────────────────────────────────┤
│  React Components (Mobile Responsive)                      │
│  ├── OutletSelector                                        │
│  ├── LiveDashboard                                         │
│  ├── ReportsModule                                         │
│  ├── ClosingModule                                         │
│  └── AnalyticsModule                                       │
├─────────────────────────────────────────────────────────────┤
│                 Real-Time Layer                             │
├─────────────────────────────────────────────────────────────┤
│  WebSocket/SSE Server                                      │
│  ├── Data Stream Manager                                   │
│  ├── Notification Service                                  │
│  └── Cache Manager (Redis)                                │
├─────────────────────────────────────────────────────────────┤
│                   API Layer                                 │
├─────────────────────────────────────────────────────────────┤
│  Next.js API Routes                                        │
│  ├── /api/reports/*                                        │
│  ├── /api/closing/*                                        │
│  ├── /api/analytics/*                                      │
│  └── /api/realtime/*                                       │
├─────────────────────────────────────────────────────────────┤
│                 Business Logic Layer                        │
├─────────────────────────────────────────────────────────────┤
│  Services                                                   │
│  ├── ReportService                                         │
│  ├── ClosingService                                        │
│  ├── AnalyticsService                                      │
│  ├── NotificationService                                   │
│  └── CacheService                                          │
├─────────────────────────────────────────────────────────────┤
│                   Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│  Supabase PostgreSQL                                       │
│  ├── Existing Tables (production_daily, transactions, etc) │
│  ├── New Tables (closing_reports, report_cache)           │
│  └── Optimized Indexes & Views                            │
└─────────────────────────────────────────────────────────────┘
```

### Real-Time Architecture

```
Data Sources → Event Bus → Cache Layer → WebSocket → Client
     ↓             ↓           ↓           ↓         ↓
Production    Supabase    Redis Cache   Socket.io   React
Transactions  Triggers    TTL: 5min     Rooms      Components
Expenses      Functions   Invalidation  Namespaces  Live Updates
Closing       Webhooks    Compression   Auth       Notifications
```

## Component Design

### 1. OutletSelector Component

```typescript
interface OutletSelectorProps {
  userRole: UserRole;
  onOutletSelect: (outlets: Outlet[]) => void;
  multiSelect?: boolean;
  showFavorites?: boolean;
}

interface OutletSelectorState {
  outlets: Outlet[];
  filteredOutlets: Outlet[];
  favorites: string[];
  searchQuery: string;
  selectedOutlets: Outlet[];
  loading: boolean;
}

// Features:
// - Role-based outlet filtering
// - Search with debouncing
// - Favorites management
// - Multi-select capability
// - Responsive grid layout
```

### 2. LiveDashboard Component

```typescript
interface LiveDashboardProps {
  outletIds: string[];
  dateRange: DateRange;
  realTimeEnabled: boolean;
}

interface DashboardData {
  financial: FinancialMetrics;
  production: ProductionMetrics;
  sales: SalesMetrics;
  expenses: ExpenseMetrics;
  lastUpdated: Date;
}

// Features:
// - Real-time data updates via WebSocket
// - Animated counters for metrics
// - Trend indicators (up/down arrows)
// - Responsive card layout
// - Offline data caching
```

### 3. ClosingModule Component

```typescript
interface ClosingModuleProps {
  outletId: string;
  date: string;
  userPermissions: Permission[];
}

interface ClosingData {
  production: ProductionSummary;
  sales: SalesSummary;
  expenses: ExpenseSummary;
  inventory: InventorySummary;
  balance: BalanceValidation;
  status: ClosingStatus;
}

// Features:
// - Step-by-step closing workflow
// - Data validation and balance checking
// - Approval workflow for discrepancies
// - Audit trail logging
// - Integration with notification system
```

### 4. ReportsModule Component

```typescript
interface ReportsModuleProps {
  outletIds: string[];
  dateRange: DateRange;
  reportType: ReportType;
  filters: ReportFilters;
}

// Sub-components:
// - ProductionReport
// - SalesReport
// - ExpenseReport
// - FinancialReport
// - ComparisonReport
```

### 5. AnalyticsModule Component

```typescript
interface AnalyticsModuleProps {
  outletIds: string[];
  dateRange: DateRange;
  analyticsType: AnalyticsType;
}

// Features:
// - Interactive charts (Chart.js/Recharts)
// - Trend analysis
// - Predictive insights
// - Anomaly detection
// - Export capabilities
```

## Database Schema Design

### New Tables

#### 1. closing_reports Table

```sql
CREATE TABLE closing_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id),
    closing_date DATE NOT NULL,
    closed_by UUID NOT NULL REFERENCES users(id),
    closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Financial Summary
    total_sales NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_expenses NUMERIC(15,2) NOT NULL DEFAULT 0,
    gross_profit NUMERIC(15,2) NOT NULL DEFAULT 0,
    net_profit NUMERIC(15,2) NOT NULL DEFAULT 0,
    
    -- Production Summary
    total_production INTEGER NOT NULL DEFAULT 0,
    total_sold INTEGER NOT NULL DEFAULT 0,
    total_waste INTEGER NOT NULL DEFAULT 0,
    remaining_stock INTEGER NOT NULL DEFAULT 0,
    
    -- Balance Validation
    is_balanced BOOLEAN NOT NULL DEFAULT false,
    balance_notes TEXT,
    discrepancies JSONB,
    
    -- Approval Workflow
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(outlet_id, closing_date)
);
```

#### 2. report_cache Table

```sql
CREATE TABLE report_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    outlet_ids UUID[] NOT NULL,
    date_range DATERANGE NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    filters JSONB,
    data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX idx_report_cache_key (cache_key),
    INDEX idx_report_cache_expires (expires_at),
    INDEX idx_report_cache_outlets (outlet_ids)
);
```

#### 3. user_preferences Table

```sql
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    preference_type VARCHAR(50) NOT NULL,
    preference_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, preference_type)
);
```

### Database Views for Performance

#### 1. outlet_daily_summary View

```sql
CREATE VIEW outlet_daily_summary AS
SELECT 
    o.id as outlet_id,
    o.nama as outlet_name,
    pd.tanggal as report_date,
    
    -- Production Metrics
    COALESCE(SUM(pd.total_produksi), 0) as total_production,
    COALESCE(SUM(pd.total_terjual), 0) as total_sold,
    COALESCE(SUM(pd.total_gagal), 0) as total_waste,
    
    -- Sales Metrics
    COALESCE(sales.total_transactions, 0) as total_transactions,
    COALESCE(sales.total_revenue, 0) as total_revenue,
    
    -- Expense Metrics
    COALESCE(expenses.total_expenses, 0) as total_expenses,
    
    -- Calculated Metrics
    COALESCE(sales.total_revenue, 0) - COALESCE(expenses.total_expenses, 0) as net_profit,
    
    -- Status
    CASE WHEN cr.id IS NOT NULL THEN 'closed' ELSE 'open' END as closing_status
    
FROM outlets o
LEFT JOIN production_daily pd ON o.id = pd.outlet_id
LEFT JOIN (
    SELECT 
        outlet_id,
        DATE(created_at) as transaction_date,
        COUNT(*) as total_transactions,
        SUM(total_amount) as total_revenue
    FROM transactions 
    GROUP BY outlet_id, DATE(created_at)
) sales ON o.id = sales.outlet_id AND pd.tanggal = sales.transaction_date
LEFT JOIN (
    SELECT 
        outlet_id,
        tanggal,
        SUM(jumlah) as total_expenses
    FROM expenses
    GROUP BY outlet_id, tanggal
) expenses ON o.id = expenses.outlet_id AND pd.tanggal = expenses.tanggal
LEFT JOIN closing_reports cr ON o.id = cr.outlet_id AND pd.tanggal = cr.closing_date
GROUP BY o.id, o.nama, pd.tanggal, sales.total_transactions, sales.total_revenue, expenses.total_expenses, cr.id;
```

### Database Indexes for Performance

```sql
-- Composite indexes for common queries
CREATE INDEX idx_production_daily_outlet_date ON production_daily (outlet_id, tanggal DESC);
CREATE INDEX idx_transactions_outlet_date ON transactions (outlet_id, DATE(created_at) DESC);
CREATE INDEX idx_expenses_outlet_date ON expenses (outlet_id, tanggal DESC);
CREATE INDEX idx_closing_reports_outlet_date ON closing_reports (outlet_id, closing_date DESC);

-- Indexes for real-time queries
CREATE INDEX idx_transactions_realtime ON transactions (outlet_id, created_at DESC) WHERE created_at > NOW() - INTERVAL '1 day';
CREATE INDEX idx_expenses_realtime ON expenses (outlet_id, created_at DESC) WHERE created_at > NOW() - INTERVAL '1 day';

-- Partial indexes for active data
CREATE INDEX idx_outlets_active ON outlets (id) WHERE status = 'active';
CREATE INDEX idx_closing_reports_pending ON closing_reports (outlet_id, closing_date) WHERE status IN ('draft', 'pending');
```

## API Design

### REST API Endpoints

#### 1. Reports API

```typescript
// GET /api/reports/dashboard
interface DashboardRequest {
  outlet_ids: string[];
  date_range: DateRange;
  metrics: MetricType[];
}

interface DashboardResponse {
  success: boolean;
  data: {
    financial: FinancialMetrics;
    production: ProductionMetrics;
    sales: SalesMetrics;
    expenses: ExpenseMetrics;
    last_updated: string;
  };
  cache_info: CacheInfo;
}

// GET /api/reports/detailed
interface DetailedReportRequest {
  outlet_ids: string[];
  date_range: DateRange;
  report_type: 'production' | 'sales' | 'expenses' | 'financial';
  filters: ReportFilters;
  pagination: PaginationParams;
}

// GET /api/reports/comparison
interface ComparisonRequest {
  outlet_ids: string[];
  date_range: DateRange;
  comparison_type: 'outlet' | 'period' | 'product';
}
```

#### 2. Closing API

```typescript
// GET /api/closing/status
interface ClosingStatusRequest {
  outlet_id: string;
  date: string;
}

interface ClosingStatusResponse {
  success: boolean;
  data: {
    status: ClosingStatus;
    can_close: boolean;
    validation_results: ValidationResult[];
    summary: ClosingSummary;
  };
}

// POST /api/closing/initiate
interface InitiateClosingRequest {
  outlet_id: string;
  date: string;
  force_close?: boolean;
}

// POST /api/closing/approve
interface ApproveClosingRequest {
  closing_id: string;
  approval_notes?: string;
}
```

#### 3. Analytics API

```typescript
// GET /api/analytics/trends
interface TrendsRequest {
  outlet_ids: string[];
  date_range: DateRange;
  metric: 'sales' | 'production' | 'expenses' | 'profit';
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly';
}

// GET /api/analytics/insights
interface InsightsRequest {
  outlet_ids: string[];
  date_range: DateRange;
  insight_types: InsightType[];
}
```

### Real-Time API (WebSocket)

```typescript
// WebSocket Events
interface WebSocketEvents {
  // Client to Server
  'join_outlet': { outlet_ids: string[] };
  'leave_outlet': { outlet_ids: string[] };
  'subscribe_metrics': { metrics: MetricType[] };
  
  // Server to Client
  'data_update': {
    outlet_id: string;
    metric_type: MetricType;
    data: any;
    timestamp: string;
  };
  'closing_update': {
    outlet_id: string;
    status: ClosingStatus;
    data: ClosingSummary;
  };
  'notification': {
    type: NotificationType;
    message: string;
    data?: any;
  };
}

// WebSocket Rooms
// - outlet:{outlet_id} - for outlet-specific updates
// - user:{user_id} - for user-specific notifications
// - role:{role} - for role-based broadcasts
```

## Data Flow Design

### Real-Time Data Flow

```
1. Data Change Event
   ├── Production Input → production_daily table
   ├── Kasir Transaction → transactions table
   ├── Expense Input → expenses table
   └── Closing Action → closing_reports table

2. Database Trigger
   ├── AFTER INSERT/UPDATE/DELETE
   ├── Extract changed data
   └── Publish to event bus

3. Event Processing
   ├── Validate event data
   ├── Update cache (Redis)
   ├── Calculate derived metrics
   └── Prepare WebSocket payload

4. WebSocket Broadcast
   ├── Identify affected rooms
   ├── Send to subscribed clients
   └── Log delivery status

5. Client Update
   ├── Receive WebSocket event
   ├── Update React state
   ├── Trigger re-render
   └── Show notification (if needed)
```

### Caching Strategy

```typescript
interface CacheStrategy {
  // L1 Cache (Browser)
  browser: {
    type: 'localStorage' | 'sessionStorage';
    ttl: number;
    keys: string[];
  };
  
  // L2 Cache (Redis)
  redis: {
    ttl: number;
    invalidation: 'time' | 'event' | 'manual';
    compression: boolean;
  };
  
  // L3 Cache (Database Views)
  database: {
    materialized_views: string[];
    refresh_strategy: 'realtime' | 'scheduled';
  };
}

// Cache Keys Pattern
const cacheKeys = {
  dashboard: `dashboard:${outlet_ids.join(',')}:${date_range}:${hash(filters)}`,
  report: `report:${type}:${outlet_ids.join(',')}:${date_range}:${hash(filters)}`,
  closing: `closing:${outlet_id}:${date}`,
  analytics: `analytics:${type}:${outlet_ids.join(',')}:${date_range}`
};
```

## Performance Optimization Strategy

### 1. Database Optimization

```sql
-- Partitioning for large tables
CREATE TABLE transactions_y2026m01 PARTITION OF transactions
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Materialized views for complex aggregations
CREATE MATERIALIZED VIEW outlet_monthly_summary AS
SELECT 
    outlet_id,
    DATE_TRUNC('month', report_date) as month,
    SUM(total_revenue) as monthly_revenue,
    SUM(total_expenses) as monthly_expenses,
    AVG(total_production) as avg_daily_production
FROM outlet_daily_summary
GROUP BY outlet_id, DATE_TRUNC('month', report_date);

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY outlet_monthly_summary;
END;
$$ LANGUAGE plpgsql;
```

### 2. Application-Level Optimization

```typescript
// Query Optimization
interface QueryOptimization {
  // Pagination
  pagination: {
    default_limit: 50;
    max_limit: 1000;
    cursor_based: boolean;
  };
  
  // Lazy Loading
  lazy_loading: {
    components: string[];
    data_sections: string[];
  };
  
  // Batch Processing
  batch_processing: {
    max_batch_size: 100;
    batch_timeout: 5000; // ms
  };
  
  // Connection Pooling
  connection_pool: {
    min_connections: 5;
    max_connections: 50;
    idle_timeout: 30000; // ms
  };
}
```

### 3. Frontend Optimization

```typescript
// React Optimization
const optimizations = {
  // Code Splitting
  code_splitting: {
    route_based: true;
    component_based: true;
    dynamic_imports: true;
  };
  
  // Memoization
  memoization: {
    react_memo: ['OutletCard', 'MetricCard', 'ChartComponent'];
    use_memo: ['expensiveCalculations', 'filteredData'];
    use_callback: ['eventHandlers', 'apiCalls'];
  };
  
  // Virtual Scrolling
  virtual_scrolling: {
    enabled_for: ['OutletList', 'TransactionList', 'ReportTable'];
    item_height: 60;
    buffer_size: 10;
  };
  
  // Service Worker
  service_worker: {
    cache_strategy: 'stale-while-revalidate';
    offline_fallback: true;
    background_sync: true;
  };
};
```

## Security Design

### 1. Authentication & Authorization

```typescript
interface SecurityModel {
  authentication: {
    method: 'JWT' | 'Session';
    token_expiry: number;
    refresh_strategy: 'automatic' | 'manual';
  };
  
  authorization: {
    model: 'RBAC'; // Role-Based Access Control
    granularity: 'resource' | 'action' | 'field';
    inheritance: boolean;
  };
  
  data_access: {
    row_level_security: boolean;
    column_level_security: boolean;
    audit_logging: boolean;
  };
}

// Permission Matrix
const permissions = {
  owner: ['*'], // All permissions
  manager: [
    'reports:read:managed_outlets',
    'closing:execute:managed_outlets',
    'analytics:read:managed_outlets'
  ],
  staff_laporan: [
    'reports:read:assigned_outlets',
    'closing:execute:assigned_outlets',
    'reports:export:assigned_outlets'
  ],
  kasir: [
    'reports:read:own_outlet', // Limited read access
    // No closing permissions (moved to staff_laporan)
  ]
};
```

### 2. Data Protection

```typescript
interface DataProtection {
  encryption: {
    at_rest: 'AES-256';
    in_transit: 'TLS 1.3';
    key_management: 'AWS KMS' | 'HashiCorp Vault';
  };
  
  data_masking: {
    sensitive_fields: ['financial_data', 'personal_info'];
    masking_rules: MaskingRule[];
  };
  
  audit_trail: {
    log_all_access: boolean;
    log_data_changes: boolean;
    retention_period: number; // days
  };
}
```

## Integration Points

### 1. Existing Module Integration

```typescript
interface ModuleIntegration {
  // Production Module
  production: {
    data_source: 'production_daily, production_batches';
    real_time_events: ['production_completed', 'batch_failed'];
    api_endpoints: ['/api/production/*'];
  };
  
  // Kasir Module
  kasir: {
    data_source: 'transactions, transaction_items';
    real_time_events: ['transaction_completed', 'payment_received'];
    api_endpoints: ['/api/transactions/*'];
    integration_changes: [
      'Remove closing functionality from kasir',
      'Add closing status indicator',
      'Redirect closing to reports module'
    ];
  };
  
  // Expense Module
  expense: {
    data_source: 'expenses';
    real_time_events: ['expense_added', 'expense_updated'];
    api_endpoints: ['/api/expenses/*'];
  };
}
```

### 2. External System Integration

```typescript
interface ExternalIntegration {
  // Notification System
  notifications: {
    channels: ['email', 'sms', 'push', 'in_app'];
    triggers: ['closing_completed', 'anomaly_detected', 'target_achieved'];
  };
  
  // Export Services
  export: {
    formats: ['xlsx', 'pdf', 'csv'];
    storage: 'local' | 'cloud';
    delivery: 'download' | 'email' | 'api';
  };
  
  // Analytics Platform
  analytics: {
    platform: 'custom' | 'google_analytics' | 'mixpanel';
    events: ['report_viewed', 'export_generated', 'closing_completed'];
  };
}
```

## Mobile Responsive Design

### 1. Responsive Breakpoints

```css
/* Mobile First Approach */
.container {
  /* Mobile (320px - 768px) */
  padding: 1rem;
  
  /* Tablet (768px - 1024px) */
  @media (min-width: 768px) {
    padding: 1.5rem;
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
  
  /* Desktop (1024px+) */
  @media (min-width: 1024px) {
    padding: 2rem;
    grid-template-columns: 1fr 3fr 1fr;
  }
}
```

### 2. Mobile-Specific Components

```typescript
// Mobile Navigation
interface MobileNavigation {
  type: 'bottom_tabs' | 'hamburger' | 'drawer';
  items: NavigationItem[];
  gestures: {
    swipe_navigation: boolean;
    pull_to_refresh: boolean;
    infinite_scroll: boolean;
  };
}

// Touch Optimizations
interface TouchOptimizations {
  minimum_touch_target: 44; // px
  gesture_support: ['tap', 'swipe', 'pinch', 'long_press'];
  haptic_feedback: boolean;
}
```

## Offline Capability Design

### 1. Offline Storage Strategy

```typescript
interface OfflineStorage {
  // Critical Data (Always Available)
  critical: {
    storage: 'IndexedDB';
    data: ['dashboard_summary', 'closing_status', 'user_preferences'];
    sync_strategy: 'immediate';
  };
  
  // Cached Data (Performance)
  cached: {
    storage: 'localStorage';
    data: ['recent_reports', 'outlet_list', 'filter_preferences'];
    ttl: 86400; // 24 hours
  };
  
  // Temporary Data (Session)
  temporary: {
    storage: 'sessionStorage';
    data: ['form_drafts', 'search_history', 'navigation_state'];
    clear_on_close: true;
  };
}
```

### 2. Sync Strategy

```typescript
interface SyncStrategy {
  // Background Sync
  background_sync: {
    enabled: boolean;
    retry_attempts: 3;
    retry_delay: 5000; // ms
  };
  
  // Conflict Resolution
  conflict_resolution: {
    strategy: 'server_wins' | 'client_wins' | 'merge' | 'manual';
    merge_fields: string[];
  };
  
  // Sync Indicators
  sync_indicators: {
    show_sync_status: boolean;
    show_last_sync_time: boolean;
    show_pending_changes: boolean;
  };
}
```

## Deployment Architecture

### 1. Infrastructure

```yaml
# Docker Compose for Development
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=donattour
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### 2. Monitoring & Observability

```typescript
interface Monitoring {
  // Performance Monitoring
  performance: {
    metrics: ['response_time', 'throughput', 'error_rate'];
    alerts: AlertRule[];
    dashboards: DashboardConfig[];
  };
  
  // Application Monitoring
  application: {
    logging: {
      level: 'info' | 'debug' | 'error';
      structured: boolean;
      correlation_id: boolean;
    };
    tracing: {
      enabled: boolean;
      sample_rate: number;
      trace_headers: string[];
    };
  };
  
  // Business Metrics
  business: {
    kpis: ['daily_closings', 'report_generation_time', 'user_engagement'];
    real_time_alerts: boolean;
  };
}
```

This technical design provides a comprehensive foundation for implementing the Advanced Outlet Reporting System with all the required features including real-time capabilities, multi-outlet support, performance optimization, and mobile responsiveness.