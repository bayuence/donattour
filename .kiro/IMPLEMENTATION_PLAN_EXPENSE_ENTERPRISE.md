# 📋 IMPLEMENTATION PLAN: Pengeluaran Outlet Enterprise-Level

**Project**: Donattour System - Expense Management Module  
**Target**: Menu Pengeluaran untuk Karyawan (Employee-Focused)  
**Scale**: 10,000+ Outlets  
**Standard**: Enterprise PT Level  
**Created**: 2026-05-20  
**Status**: Ready for Implementation

---

## 🎯 EXECUTIVE SUMMARY

Redesign menu Pengeluaran Outlet dari universal dashboard menjadi **employee-focused workflow** dengan standar enterprise untuk mendukung 10,000+ outlet. Fokus pada **closing laporan harian** yang smooth dan akurat.

### Key Objectives:
1. ✅ **Two-step flow**: Pilih outlet → Input pengeluaran
2. ✅ **Employee-centric UX**: Simple, fast, mobile-first
3. ✅ **Closing integration**: Pengeluaran masuk laporan harian otomatis
4. ✅ **Enterprise features**: Audit trail, approval workflow, budget control
5. ✅ **Performance**: Optimized untuk 10,000+ outlet

---

## 📊 PHASE BREAKDOWN

### **PHASE 1: Core Functionality (MVP)** ⭐ PRIORITY
**Timeline**: Week 1-2  
**Goal**: Employee dapat input pengeluaran dengan smooth workflow

#### 1.1 Database Schema Enhancement
**File**: `QueryDATABASE/11-schema-expenses-v2.sql`

```sql
-- Add new columns to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' 
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS is_included_in_closing BOOLEAN DEFAULT false;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS closing_id UUID;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS device_info JSONB;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS ip_address INET;

-- Audit log table
CREATE TABLE expense_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'approved', 'rejected')),
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  device_info JSONB,
  reason TEXT
);

CREATE INDEX idx_audit_expense ON expense_audit_logs(expense_id, performed_at DESC);
CREATE INDEX idx_audit_user ON expense_audit_logs(performed_by, performed_at DESC);

-- Budget control table
CREATE TABLE outlet_expense_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  kategori VARCHAR(50) NOT NULL,
  budget_harian NUMERIC(15,2),
  budget_bulanan NUMERIC(15,2),
  alert_threshold_percent INTEGER DEFAULT 80,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(outlet_id, kategori)
);

CREATE INDEX idx_budget_outlet ON outlet_expense_budgets(outlet_id, is_active);
```

**Tasks**:
- [ ] Create migration file
- [ ] Test migration on dev database
- [ ] Update Supabase schema
- [ ] Verify indexes created

---

#### 1.2 TypeScript Types Update
**File**: `lib/types/expenses.ts`

```typescript
// Enhanced Expense type
export interface Expense {
  id: string;
  outlet_id: string;
  tanggal: string;
  kategori: ExpenseCategory;
  keterangan: string;
  jumlah: number;
  bukti_url?: string | null;
  
  // NEW: Status & Approval
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  
  // NEW: Closing Integration
  is_included_in_closing: boolean;
  closing_id?: string | null;
  
  // NEW: Audit Trail
  device_info?: Record<string, any> | null;
  ip_address?: string | null;
  
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Audit Log
export interface ExpenseAuditLog {
  id: string;
  expense_id: string;
  action: 'created' | 'updated' | 'deleted' | 'approved' | 'rejected';
  performed_by: string;
  performed_at: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  device_info?: any;
  reason?: string;
}

// Budget
export interface OutletExpenseBudget {
  id: string;
  outlet_id: string;
  kategori: ExpenseCategory;
  budget_harian?: number;
  budget_bulanan?: number;
  alert_threshold_percent: number;
  is_active: boolean;
}

// Budget Status
export interface BudgetStatus {
  kategori: ExpenseCategory;
  budget_harian?: number;
  budget_bulanan?: number;
  used_today: number;
  used_this_month: number;
  remaining_today?: number;
  remaining_month?: number;
  percentage_used_today?: number;
  percentage_used_month?: number;
  is_over_budget: boolean;
  alert_level: 'safe' | 'warning' | 'danger';
}
```

**Tasks**:
- [ ] Update types file
- [ ] Export new types from main types.ts
- [ ] Update API response types
- [ ] Run TypeScript check

---

#### 1.3 Outlet Selector Component
**File**: `components/expenses/OutletSelector.tsx`

**Features**:
- Search dengan autocomplete (untuk 10,000+ outlet)
- Recent outlets (last 5 accessed)
- Favorite outlets (starred)
- Filter by region/area
- Badge: pending expenses count

**UI/UX**:
- Large search input (mobile-friendly)
- Card-based outlet list
- Quick stats per outlet
- Skeleton loading state

**Tasks**:
- [ ] Create component
- [ ] Implement search with debounce
- [ ] Add recent outlets (localStorage)
- [ ] Add favorites (localStorage)
- [ ] Test with 100+ outlets
- [ ] Mobile responsive

---

#### 1.4 Expense Dashboard (Outlet-Specific)
**File**: `components/expenses/ExpenseDashboardEmployee.tsx`

**Layout**:
```
┌─────────────────────────────────────────┐
│ Header: Outlet Name + Budget Bar        │
├─────────────────────────────────────────┤
│ Quick Stats (4 Cards)                   │
├─────────────────────────────────────────┤
│ Quick Actions: [+ Baru] [Template]     │
├─────────────────────────────────────────┤
│ Smart Form (Collapsible)                │
├─────────────────────────────────────────┤
│ Expense List Today (Timeline)           │
├─────────────────────────────────────────┤
│ Tabs: [Hari Ini] [Minggu] [Bulan]      │
└─────────────────────────────────────────┘
```

**Features**:
- Budget status bar (visual indicator)
- Quick stats: Total today, Transactions, Avg, Top category
- Smart form with validation
- Timeline view (grouped by time)
- Inline edit/delete
- Pull-to-refresh (mobile)

**Tasks**:
- [ ] Create component structure
- [ ] Implement budget bar
- [ ] Build smart form
- [ ] Create timeline view
- [ ] Add inline actions
- [ ] Mobile gestures

---

#### 1.5 Smart Form Component
**File**: `components/expenses/ExpenseFormSmart.tsx`

**Features**:
- Auto-save draft (localStorage)
- Category selection with icons
- Currency input with formatting
- Photo upload (drag & drop + camera)
- OCR scan struk (future)
- Template save/load
- Validation real-time

**Validation Rules**:
- Keterangan: min 5 chars
- Jumlah: > 0, max based on budget
- Kategori: required
- Bukti: recommended (warning if empty)

**Tasks**:
- [ ] Create form component
- [ ] Implement auto-save draft
- [ ] Add photo upload
- [ ] Real-time validation
- [ ] Template system
- [ ] Error handling

---

#### 1.6 API Endpoints Enhancement
**Files**: 
- `app/api/expenses/route.ts` (GET, POST)
- `app/api/expenses/[id]/route.ts` (GET, PUT, DELETE)
- `app/api/expenses/budget/route.ts` (NEW)
- `app/api/expenses/audit/route.ts` (NEW)

**New Endpoints**:

```typescript
// GET /api/expenses/budget?outlet_id=xxx
// Response: Budget status for all categories

// POST /api/expenses with audit trail
// Body: { ...expense, device_info, ip_address }

// GET /api/expenses/audit?expense_id=xxx
// Response: Audit log for expense

// PUT /api/expenses/[id]/approve
// Body: { approved_by, notes }

// PUT /api/expenses/[id]/reject
// Body: { rejected_by, reason }
```

**Tasks**:
- [ ] Update POST endpoint (add audit)
- [ ] Create budget endpoint
- [ ] Create audit endpoint
- [ ] Add approval endpoints
- [ ] Error handling
- [ ] Rate limiting

---

#### 1.7 Page Integration
**File**: `app/(dashboard)/dashboard/pengeluaran-outlet/page.tsx`

**Flow**:
1. Check if outlet selected (from state/localStorage)
2. If not → Show OutletSelector
3. If yes → Show ExpenseDashboardEmployee
4. Allow outlet switching (header button)

**Tasks**:
- [ ] Implement routing logic
- [ ] State management (Zustand/Context)
- [ ] Persist outlet selection
- [ ] Handle outlet switch
- [ ] Loading states

---

### **PHASE 2: Advanced Features** 🚀
**Timeline**: Week 3-4  
**Goal**: Enterprise-grade features

#### 2.1 Approval Workflow
**Components**:
- `components/expenses/ApprovalPanel.tsx`
- `components/expenses/ApprovalNotification.tsx`

**Features**:
- Threshold-based approval (> Rp 500k)
- Multi-level approval (Supervisor → Manager)
- Notification system (in-app + email)
- Approval dashboard
- Bulk approve/reject

**Tasks**:
- [ ] Create approval UI
- [ ] Implement notification
- [ ] Email integration
- [ ] Approval dashboard
- [ ] Bulk actions

---

#### 2.2 Budget Control & Alerts
**Components**:
- `components/expenses/BudgetControl.tsx`
- `components/expenses/BudgetAlert.tsx`

**Features**:
- Budget setting per outlet/kategori
- Real-time budget tracking
- Alert at 80% threshold
- Block/warn on exceed
- Budget dashboard

**Tasks**:
- [ ] Budget setting UI
- [ ] Real-time tracking
- [ ] Alert system
- [ ] Block logic
- [ ] Dashboard

---

#### 2.3 Analytics & Reporting
**Components**:
- `components/expenses/ExpenseAnalytics.tsx`
- `components/expenses/ExpenseReport.tsx`

**Features**:
- Trend analysis (7/30 days)
- Category breakdown (donut chart)
- Comparison (vs last period)
- Anomaly detection
- Export PDF/Excel

**Tasks**:
- [ ] Chart components
- [ ] Trend calculation
- [ ] Comparison logic
- [ ] Anomaly detection
- [ ] Export functionality

---

#### 2.4 Closing Integration
**Files**:
- `lib/services/closing-service.ts`
- `components/closing/ClosingExpenseSummary.tsx`

**Features**:
- Auto-include expenses in closing
- Validation: all expenses recorded
- Summary in closing report
- Lock expenses after closing
- Reopen mechanism (with approval)

**Tasks**:
- [ ] Closing service
- [ ] Validation logic
- [ ] Summary component
- [ ] Lock mechanism
- [ ] Reopen flow

---

### **PHASE 3: Performance & Scale** ⚡
**Timeline**: Week 5  
**Goal**: Optimize untuk 10,000+ outlet

#### 3.1 Database Optimization
- [ ] Add composite indexes
- [ ] Implement partitioning (by date)
- [ ] Query optimization
- [ ] Connection pooling
- [ ] Read replica setup

#### 3.2 Caching Strategy
- [ ] Redis setup
- [ ] Cache budget status (5 min TTL)
- [ ] Cache outlet list (1 hour TTL)
- [ ] Cache summary stats (10 min TTL)
- [ ] Invalidation strategy

#### 3.3 API Performance
- [ ] Response time < 200ms
- [ ] Pagination (20 items/page)
- [ ] Lazy loading
- [ ] Debounce search
- [ ] Rate limiting

#### 3.4 Frontend Optimization
- [ ] Code splitting
- [ ] Lazy load components
- [ ] Image optimization
- [ ] Service worker (PWA)
- [ ] Offline mode

---

### **PHASE 4: Mobile & PWA** 📱
**Timeline**: Week 6  
**Goal**: Mobile-first experience

#### 4.1 Progressive Web App
- [ ] Service worker setup
- [ ] Offline mode
- [ ] Push notifications
- [ ] Install prompt
- [ ] App manifest

#### 4.2 Mobile Optimization
- [ ] Touch gestures
- [ ] Pull-to-refresh
- [ ] Swipe actions
- [ ] Camera integration
- [ ] Haptic feedback

#### 4.3 Responsive Design
- [ ] Mobile layout
- [ ] Tablet layout
- [ ] Desktop layout
- [ ] Breakpoint testing
- [ ] Cross-browser testing

---

## 🎨 UI/UX DESIGN SYSTEM

### Color Palette
```typescript
const EXPENSE_COLORS = {
  primary: '#3B82F6',      // Blue
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Amber
  danger: '#EF4444',       // Red
  info: '#6366F1',         // Indigo
  
  // Category colors
  operasional: '#3B82F6',  // Blue
  bahan_baku: '#F59E0B',   // Amber
  gaji: '#10B981',         // Green
  transportasi: '#8B5CF6', // Purple
  perawatan: '#F97316',    // Orange
  marketing: '#EC4899',    // Pink
  lainnya: '#6B7280',      // Gray
};
```

### Typography
- **Heading**: Inter Bold, 24px/32px
- **Subheading**: Inter Semibold, 18px/24px
- **Body**: Inter Regular, 14px/20px
- **Caption**: Inter Regular, 12px/16px

### Spacing
- **Base unit**: 4px
- **Small**: 8px (2 units)
- **Medium**: 16px (4 units)
- **Large**: 24px (6 units)
- **XLarge**: 32px (8 units)

### Components
- **Cards**: rounded-xl, shadow-sm, border
- **Buttons**: rounded-lg, font-semibold, transition
- **Inputs**: rounded-lg, border, focus:ring-2
- **Badges**: rounded-full, text-xs, px-2 py-1

---

## 🔒 SECURITY CONSIDERATIONS

### Authentication & Authorization
- [ ] JWT token validation
- [ ] Role-based access control (RBAC)
- [ ] Outlet-based permissions
- [ ] Session timeout (30 min)
- [ ] Two-factor auth (for approval)

### Data Security
- [ ] Input sanitization
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF tokens
- [ ] Encryption at rest

### Audit Trail
- [ ] Log all actions
- [ ] IP address tracking
- [ ] Device fingerprinting
- [ ] Retention policy (7 years)
- [ ] Export for audit

---

## 📊 PERFORMANCE METRICS

### Target Metrics
- **Page Load**: < 2 seconds
- **API Response**: < 200ms
- **Search**: < 100ms (with debounce)
- **Form Submit**: < 500ms
- **Uptime**: 99.9% SLA

### Monitoring
- [ ] Setup Sentry (error tracking)
- [ ] Setup Datadog (performance)
- [ ] Setup Uptime Robot (availability)
- [ ] Custom analytics dashboard
- [ ] Alert system

---

## 🧪 TESTING STRATEGY

### Unit Tests
- [ ] Component tests (Jest + React Testing Library)
- [ ] API endpoint tests
- [ ] Utility function tests
- [ ] Type checking (TypeScript)
- [ ] Coverage > 80%

### Integration Tests
- [ ] User flow tests (Playwright)
- [ ] API integration tests
- [ ] Database tests
- [ ] Auth flow tests
- [ ] Payment flow tests

### Performance Tests
- [ ] Load testing (10,000 concurrent users)
- [ ] Stress testing
- [ ] Database query performance
- [ ] API endpoint benchmarks
- [ ] Frontend performance (Lighthouse)

### User Acceptance Testing (UAT)
- [ ] Beta testing with 10 outlets
- [ ] Feedback collection
- [ ] Bug fixing
- [ ] Performance tuning
- [ ] Final approval

---

## 📦 DEPLOYMENT PLAN

### Pre-Deployment
- [ ] Code review
- [ ] Security audit
- [ ] Performance testing
- [ ] Database backup
- [ ] Rollback plan

### Deployment Steps
1. [ ] Deploy database migrations
2. [ ] Deploy API changes
3. [ ] Deploy frontend changes
4. [ ] Update environment variables
5. [ ] Clear cache
6. [ ] Smoke testing
7. [ ] Monitor logs

### Post-Deployment
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] User feedback
- [ ] Bug triage
- [ ] Hotfix if needed

---

## 📚 DOCUMENTATION

### Technical Documentation
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Database schema documentation
- [ ] Component documentation (Storybook)
- [ ] Architecture diagram
- [ ] Deployment guide

### User Documentation
- [ ] User manual (Bahasa Indonesia)
- [ ] Video tutorials
- [ ] FAQ
- [ ] Troubleshooting guide
- [ ] Best practices

---

## 🎯 SUCCESS CRITERIA

### Functional
- ✅ Karyawan dapat pilih outlet dengan mudah (< 5 detik)
- ✅ Input pengeluaran < 30 detik
- ✅ Pengeluaran otomatis masuk closing
- ✅ Budget control berfungsi
- ✅ Approval workflow smooth

### Performance
- ✅ Support 10,000+ outlet
- ✅ Page load < 2 detik
- ✅ API response < 200ms
- ✅ 99.9% uptime
- ✅ Mobile-friendly (Lighthouse > 90)

### User Experience
- ✅ User satisfaction > 4.5/5
- ✅ Task completion rate > 95%
- ✅ Error rate < 1%
- ✅ Support ticket < 5/week
- ✅ Training time < 15 menit

---

## 🚀 QUICK START GUIDE

### For Developers

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Run database migrations
npm run db:migrate

# 5. Start development server
npm run dev

# 6. Open browser
# http://localhost:3000/dashboard/pengeluaran-outlet
```

### For Testers

1. Login dengan akun kasir
2. Buka menu "Pengeluaran Outlet"
3. Pilih outlet dari list
4. Klik "+ Tambah Pengeluaran"
5. Isi form dan submit
6. Verifikasi data muncul di list
7. Test closing integration

---

## 📞 SUPPORT & CONTACT

### Development Team
- **Lead Developer**: [Your Name]
- **Backend**: [Backend Dev]
- **Frontend**: [Frontend Dev]
- **QA**: [QA Engineer]

### Stakeholders
- **Product Owner**: [PO Name]
- **Project Manager**: [PM Name]
- **Business Analyst**: [BA Name]

### Communication Channels
- **Slack**: #donattour-expense
- **Email**: dev@donattour.com
- **Jira**: EXPENSE-XXX
- **Wiki**: confluence.donattour.com

---

## 📝 CHANGELOG

### Version 2.0.0 (2026-05-20)
- ✨ NEW: Two-step flow (Outlet Selector → Dashboard)
- ✨ NEW: Employee-focused UX
- ✨ NEW: Budget control & alerts
- ✨ NEW: Approval workflow
- ✨ NEW: Audit trail
- ✨ NEW: Closing integration
- ✨ NEW: Mobile-first PWA
- 🚀 IMPROVED: Performance for 10,000+ outlet
- 🚀 IMPROVED: Search with autocomplete
- 🚀 IMPROVED: Real-time validation
- 🐛 FIXED: Hydration errors
- 🐛 FIXED: Mobile responsiveness

---

## 🎉 CONCLUSION

Implementation plan ini dirancang untuk mengubah menu Pengeluaran Outlet dari universal dashboard menjadi **employee-focused workflow** dengan standar enterprise. Fokus utama adalah **kemudahan karyawan** dalam input pengeluaran dan **integrasi dengan closing laporan harian**.

**Next Steps**:
1. Review plan dengan tim
2. Approval dari stakeholder
3. Mulai Phase 1 (Core Functionality)
4. Weekly progress review
5. Deploy & monitor

**Estimated Timeline**: 6 weeks  
**Team Size**: 4 developers + 1 QA  
**Budget**: [To be determined]

---

**Document Version**: 1.0  
**Last Updated**: 2026-05-20  
**Status**: ✅ Ready for Implementation  
**Approved By**: [Pending]

---

