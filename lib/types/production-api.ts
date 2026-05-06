// ============================================================================
// PRODUCTION TRACKING SYSTEM - API REQUEST/RESPONSE TYPES
// ============================================================================
// File: lib/types/production-api.ts
// Description: TypeScript types for API requests and responses
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

import type {
  ProductionDaily,
  ProductionWasteDetail,
  ToppingError,
  DailyClosing,
  DailyLossSummary,
  InventoryStockSummary,
  ProductionSummary,
  LossBreakdown,
} from './production';

// ============================================================================
// API RESPONSE WRAPPER TYPES
// ============================================================================

/**
 * Standard success response
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Standard error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
}

/**
 * API response type (success or error)
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Error codes
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_LOGIC_ERROR'
  | 'INTERNAL_ERROR';

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ============================================================================
// PRODUCTION INPUT API TYPES
// ============================================================================

/**
 * Request body for POST /api/production/daily
 */
export interface CreateProductionRequest {
  outlet_id: string;
  tanggal: string;
  ukuran: 'standar' | 'mini';
  target_qty: number;
  success_qty: number;
  waste_details: Array<{
    reason: string;
    qty: number;
    hpp_per_pcs: number;
  }>;
}

/**
 * Response for POST /api/production/daily
 */
export interface CreateProductionResponse {
  production_daily: ProductionDaily;
  waste_details: ProductionWasteDetail[];
  inventory_created: {
    id: string;
    qty_available: number;
  };
}

/**
 * Response for GET /api/production/daily
 */
export interface GetProductionListResponse {
  items: Array<{
    id: string;
    outlet: {
      id: string;
      nama: string;
    };
    tanggal: string;
    ukuran: string;
    target_qty: number;
    success_qty: number;
    waste_qty: number;
    total_hpp_loss: number;
    success_rate: number;
    waste_rate: number;
    waste_details: Array<{
      reason: string;
      qty: number;
      hpp_loss: number;
    }>;
    created_at: string;
  }>;
  pagination: PaginationMeta;
}

/**
 * Request body for PUT /api/production/daily/[id]
 */
export interface UpdateProductionRequest {
  target_qty?: number;
  success_qty?: number;
  waste_details?: Array<{
    reason: string;
    qty: number;
    hpp_per_pcs: number;
  }>;
}

// ============================================================================
// INVENTORY VALIDATION API TYPES
// ============================================================================

/**
 * Response for GET /api/inventory/validate
 */
export interface InventoryValidationResponse {
  can_operate: boolean;
  has_production: boolean;
  stock_summary: {
    standar: InventoryStockSummary;
    mini: InventoryStockSummary;
  };
  production_data?: {
    standar?: ProductionSummary;
    mini?: ProductionSummary;
  };
}

/**
 * Response for GET /api/inventory/stock
 */
export interface InventoryStockResponse {
  outlet_id: string;
  stocks: Array<{
    ukuran: string;
    status: string;
    qty_available: number;
    production_date: string;
    last_updated: string;
  }>;
  total_by_size: {
    standar: number;
    mini: number;
  };
}

// ============================================================================
// TOPPING ERROR API TYPES
// ============================================================================

/**
 * Request body for POST /api/topping-errors
 */
export interface CreateToppingErrorRequest {
  outlet_id: string;
  tanggal: string;
  product_ordered: string;
  product_made: string;
  qty: number;
  hpp_loss: number;
  reason: string;
}

/**
 * Response for POST /api/topping-errors
 */
export interface CreateToppingErrorResponse extends ToppingError {}

/**
 * Response for GET /api/topping-errors
 */
export interface GetToppingErrorsResponse {
  items: Array<{
    id: string;
    outlet: {
      id: string;
      nama: string;
    };
    kasir: {
      id: string;
      name: string;
    };
    tanggal: string;
    product_ordered: string;
    product_made: string;
    qty: number;
    hpp_loss: number;
    reason: string;
    created_at: string;
  }>;
  summary: {
    total_errors: number;
    total_qty: number;
    total_hpp_loss: number;
  };
  pagination: PaginationMeta;
}

// ============================================================================
// CLOSING API TYPES
// ============================================================================

/**
 * Request body for POST /api/closing/daily
 */
export interface CreateClosingRequest {
  outlet_id: string;
  tanggal: string;
  non_topping_status: Array<{
    ukuran: 'standar' | 'mini';
    total_sisa: number;
    qty_fresh: number;
    qty_aging: number;
    qty_expired: number;
    hpp_loss_expired: number;
    reason_expired?: string;
  }>;
  finished_products: Array<{
    product_id?: string;
    product_name: string;
    total_sisa: number;
    qty_fresh: number;
    qty_aging: number;
    qty_reject: number;
    hpp_topping_loss: number;
    reason_reject?: string;
  }>;
  notes?: string;
}

/**
 * Response for POST /api/closing/daily
 */
export interface CreateClosingResponse {
  daily_closing: DailyClosing;
  loss_summary: DailyLossSummary;
}

/**
 * Response for GET /api/closing/daily
 */
export interface GetClosingListResponse {
  items: Array<{
    id: string;
    outlet: {
      id: string;
      nama: string;
    };
    tanggal: string;
    closed_by: {
      id: string;
      name: string;
    };
    non_topping_status: Array<{
      ukuran: string;
      total_sisa: number;
      qty_fresh: number;
      qty_aging: number;
      qty_expired: number;
      hpp_loss_expired: number;
      reason_expired: string | null;
    }>;
    finished_products: Array<{
      product_id: string | null;
      product_name: string;
      total_sisa: number;
      qty_fresh: number;
      qty_aging: number;
      qty_reject: number;
      hpp_topping_loss: number;
      reason_reject: string | null;
    }>;
    loss_summary: DailyLossSummary;
    notes: string | null;
    created_at: string;
  }>;
  pagination: PaginationMeta;
}

/**
 * Response for GET /api/closing/check
 */
export interface ClosingCheckResponse {
  has_closed: boolean;
  closing_data?: {
    id: string;
    tanggal: string;
    closed_by: {
      id: string;
      name: string;
    };
    loss_summary: DailyLossSummary;
  };
}

// ============================================================================
// DASHBOARD API TYPES
// ============================================================================

/**
 * Response for GET /api/dashboard/daily
 */
export interface DashboardDailyResponse {
  financial_summary: {
    omzet: number;
    hpp_sold: number;
    total_loss: number;
    gross_profit: number;
    margin_percentage: number;
  };
  production_sales: {
    target_production: number;
    successful_production: number;
    failed_production: number;
    sold_qty: number;
    remaining_qty: number;
    success_rate: number;
    waste_rate: number;
    sales_rate: number;
  };
  loss_breakdown: LossBreakdown;
  sales_by_flavor: Array<{
    product_name: string;
    qty_sold: number;
    revenue: number;
    percentage: number;
  }>;
  recommendations: Array<{
    type: 'warning' | 'info' | 'success';
    priority: 'high' | 'medium' | 'low';
    message: string;
    action?: string;
  }>;
}

/**
 * Response for GET /api/reports/period
 */
export interface ReportsPeriodResponse {
  period: {
    start_date: string;
    end_date: string;
    total_days: number;
  };
  summary: {
    total_production: number;
    total_target: number;
    total_sold: number;
    total_waste: number;
    total_loss: number;
    average_waste_rate: number;
    average_margin: number;
  };
  trends: {
    waste_rate_by_period: Array<{
      date: string;
      waste_rate: number;
    }>;
    loss_by_category: Array<{
      date: string;
      production_waste: number;
      topping_errors: number;
      non_topping_expired: number;
      finished_product_reject: number;
    }>;
    sales_by_flavor: Array<{
      date: string;
      flavor: string;
      qty: number;
      revenue: number;
    }>;
  };
  outlet_comparison?: Array<{
    outlet_id: string;
    outlet_name: string;
    total_production: number;
    waste_rate: number;
    total_loss: number;
  }>;
}

/**
 * Request body for POST /api/reports/export
 */
export interface ExportReportRequest {
  outlet_id?: string;
  start_date: string;
  end_date: string;
  format: 'excel' | 'pdf';
  include_sheets: Array<'summary' | 'production' | 'sales' | 'loss' | 'flavors'>;
}

// ============================================================================
// ALERT API TYPES
// ============================================================================

/**
 * Alert type
 */
export type AlertType = 'stock_low' | 'waste_high' | 'no_production' | 'no_closing';

/**
 * Alert severity
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Alert interface
 */
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  outlet: {
    id: string;
    nama: string;
  };
  is_read: boolean;
  created_at: string;
}

/**
 * Response for GET /api/alerts
 */
export interface GetAlertsResponse {
  items: Alert[];
  unread_count: number;
  pagination: PaginationMeta;
}

/**
 * Response for POST /api/alerts/check
 */
export interface CheckAlertsResponse {
  alerts_created: number;
  alerts: Alert[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Date range filter
 */
export interface DateRangeFilter {
  start_date?: string;
  end_date?: string;
}

/**
 * Outlet filter
 */
export interface OutletFilter {
  outlet_id?: string;
}

/**
 * Pagination params
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Common query params
 */
export interface CommonQueryParams extends DateRangeFilter, OutletFilter, PaginationParams {}
