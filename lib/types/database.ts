/**
 * Database Types for Production Tracking System
 * Auto-generated TypeScript interfaces for all database tables
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum DonutSize {
  STANDAR = 'standar',
  MINI = 'mini',
}

export enum InventoryStatus {
  FRESH = 'fresh',
  AGING = 'aging',
  EXPIRED = 'expired',
  REJECT = 'reject',
}

export enum UserRole {
  ADMIN = 'admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  BAGIAN_DAPUR = 'bagian_dapur',
  KASIR = 'kasir',
  CLOSING_STAFF = 'closing_staff',
}

export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

// ============================================================================
// DATABASE TABLE INTERFACES
// ============================================================================

export interface ProductionDaily {
  id: string;
  outlet_id: string;
  tanggal: string; // DATE format: YYYY-MM-DD
  ukuran: DonutSize;
  target_qty: number;
  success_qty: number;
  waste_qty: number;
  total_hpp_loss: number;
  created_by: string | null;
  created_at: string; // TIMESTAMPTZ
  updated_at: string; // TIMESTAMPTZ
}

export interface ProductionWasteDetail {
  id: string;
  production_daily_id: string;
  reason: string;
  qty: number;
  hpp_per_pcs: number;
  hpp_loss: number; // Calculated: qty * hpp_per_pcs
  created_at: string;
}

export interface InventoryNonTopping {
  id: string;
  outlet_id: string;
  ukuran: DonutSize;
  qty_available: number;
  production_date: string; // DATE
  status: InventoryStatus;
  last_updated: string; // TIMESTAMPTZ
}

export interface ToppingUsage {
  id: string;
  order_id: string;
  product_id: string;
  topping_name: string;
  qty: number;
  created_at: string;
}

export interface ToppingError {
  id: string;
  outlet_id: string;
  product_ordered: string;
  product_made: string;
  qty: number;
  reason: string;
  hpp_per_pcs: number;
  topping_cost: number;
  total_hpp_loss: number;
  reported_by: string | null;
  reported_at: string; // TIMESTAMPTZ
  created_at: string;
}

export interface DailyClosing {
  id: string;
  outlet_id: string;
  tanggal: string; // DATE
  closed_by: string;
  notes: string | null;
  created_at: string;
}

export interface ClosingNonToppingStatus {
  id: string;
  daily_closing_id: string;
  ukuran: DonutSize;
  total_sisa: number;
  qty_fresh: number;
  qty_aging: number;
  qty_expired: number;
  hpp_loss_expired: number;
  reason_expired: string | null;
  created_at: string;
}

export interface ClosingFinishedProduct {
  id: string;
  daily_closing_id: string;
  product_id: string | null;
  product_name: string;
  total_sisa: number;
  qty_fresh: number;
  qty_aging: number;
  qty_reject: number;
  hpp_topping_loss: number;
  reason_reject: string | null;
  created_at: string;
}

export interface DailyLossSummary {
  id: string;
  outlet_id: string;
  tanggal: string; // DATE
  production_waste_loss: number;
  topping_error_loss: number;
  non_topping_expired_loss: number;
  finished_product_reject_loss: number;
  total_loss: number; // Calculated
  total_waste_qty: number;
  created_at: string;
}

// ============================================================================
// EXTENDED TYPES WITH RELATIONS
// ============================================================================

export interface ProductionDailyWithDetails extends ProductionDaily {
  waste_details: ProductionWasteDetail[];
  outlet?: {
    nama: string;
  };
}

export interface DailyClosingWithDetails extends DailyClosing {
  closing_non_topping_status: ClosingNonToppingStatus[];
  closing_finished_products: ClosingFinishedProduct[];
  outlet?: {
    nama: string;
  };
  closed_by_user?: {
    name: string;
  };
}

export interface ToppingErrorWithDetails extends ToppingError {
  outlet?: {
    nama: string;
  };
  reported_by_user?: {
    name: string;
  };
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreateProductionRequest {
  outlet_id: string;
  tanggal: string; // YYYY-MM-DD
  ukuran: DonutSize;
  target_qty: number;
  success_qty: number;
  waste_details: {
    reason: string;
    qty: number;
    hpp_per_pcs: number;
  }[];
}

export interface CreateProductionResponse {
  success: boolean;
  data: ProductionDailyWithDetails;
}

export interface CreateToppingErrorRequest {
  outlet_id: string;
  product_ordered: string;
  product_made: string;
  qty: number;
  reason: string;
}

export interface CreateToppingErrorResponse {
  success: boolean;
  data: ToppingError;
}

export interface CreateClosingRequest {
  outlet_id: string;
  tanggal: string; // YYYY-MM-DD
  non_topping_status: {
    ukuran: DonutSize;
    total_sisa: number;
    qty_fresh: number;
    qty_aging: number;
    qty_expired: number;
    reason_expired?: string;
  }[];
  finished_products: {
    product_id?: string;
    product_name: string;
    total_sisa: number;
    qty_fresh: number;
    qty_aging: number;
    qty_reject: number;
    reason_reject?: string;
  }[];
  notes?: string;
}

export interface CreateClosingResponse {
  success: boolean;
  data: {
    closing: DailyClosingWithDetails;
    loss_summary: DailyLossSummary;
  };
}

export interface DashboardDailyResponse {
  success: boolean;
  data: {
    date: string;
    outlet_id: string | null;
    financial_summary: {
      omzet: number;
      hpp_sold: number;
      total_loss: number;
      gross_profit: number;
      margin: number;
    };
    production_sales: {
      target: number;
      success: number;
      waste: number;
      sold: number;
      remaining: number;
      success_rate: number;
      waste_rate: number;
      sold_rate: number;
      remaining_rate: number;
    };
    loss_breakdown: {
      production_waste: { amount: number; percentage: number };
      topping_error: { amount: number; percentage: number };
      non_topping_expired: { amount: number; percentage: number };
      finished_product_reject: { amount: number; percentage: number };
    };
    sales_by_product: Array<{
      product_id: string;
      product_name: string;
      qty: number;
      revenue: number;
      percentage: number;
    }>;
    total_waste_qty: number;
    has_closing: boolean;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
};

export type PaginatedResponse<T> = {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      has_more: boolean;
    };
  };
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isDonutSize(value: string): value is DonutSize {
  return Object.values(DonutSize).includes(value as DonutSize);
}

export function isInventoryStatus(value: string): value is InventoryStatus {
  return Object.values(InventoryStatus).includes(value as InventoryStatus);
}

export function isUserRole(value: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

export function isApiSuccess<T>(response: ApiResponse<T>): response is { success: true; data: T } {
  return response.success === true;
}

export function isApiError<T>(response: ApiResponse<T>): response is { success: false; error: any } {
  return response.success === false;
}
