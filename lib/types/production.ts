// ============================================================================
// PRODUCTION TRACKING SYSTEM - TYPESCRIPT TYPES
// ============================================================================
// File: lib/types/production.ts
// Description: TypeScript interfaces for production tracking database tables
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Status donat non-topping di inventory
 */
export type InventoryStatus = 'fresh' | 'aging' | 'expired';

/**
 * Status produk jadi (sudah topping) saat closing
 */
export type FinishedProductStatus = 'fresh' | 'aging' | 'reject';

/**
 * Ukuran donat
 */
export type DonutSize = 'standar' | 'mini';

/**
 * User roles untuk production tracking
 */
export type ProductionUserRole = 
  | 'admin' 
  | 'owner' 
  | 'manager' 
  | 'bagian_dapur' 
  | 'kasir' 
  | 'closing_staff';

// ============================================================================
// DATABASE TABLE INTERFACES
// ============================================================================

/**
 * 1. production_daily
 * Purpose: Menyimpan data produksi harian donat non-topping per outlet per ukuran
 */
export interface ProductionDaily {
  id: string;
  outlet_id: string;
  tanggal: string;                    // ISO date format "YYYY-MM-DD"
  ukuran: DonutSize;
  target_qty: number;
  success_qty: number;
  waste_qty: number;
  total_hpp_loss: number;
  created_by: string | null;
  created_at: string;                 // ISO timestamp
  updated_at: string;                 // ISO timestamp
}

/**
 * 2. production_waste_details
 * Purpose: Detail alasan waste produksi dengan qty dan HPP loss per alasan
 */
export interface ProductionWasteDetail {
  id: string;
  production_daily_id: string;
  reason: string;                     // gosong, bentuk_jelek, adonan_gagal, dll
  qty: number;
  hpp_per_pcs: number;
  hpp_loss: number;                   // Calculated: qty * hpp_per_pcs
  created_at: string;                 // ISO timestamp
}

/**
 * 3. inventory_non_topping
 * Purpose: Stok real-time donat non-topping per outlet per ukuran
 */
export interface InventoryNonTopping {
  id: string;
  outlet_id: string;
  ukuran: DonutSize;
  qty_available: number;
  production_date: string;            // ISO date format "YYYY-MM-DD"
  status: InventoryStatus;
  last_updated: string;               // ISO timestamp
}

/**
 * 4. topping_usage
 * Purpose: Track topping yang terpakai per transaksi penjualan
 */
export interface ToppingUsage {
  id: string;
  order_id: string;
  product_id: string;
  topping_name: string;               // Coklat, Strawberry, dll
  qty: number;
  created_at: string;                 // ISO timestamp
}

/**
 * 5. topping_errors
 * Purpose: Laporan kesalahan topping saat penjualan
 */
export interface ToppingError {
  id: string;
  outlet_id: string;
  kasir_id: string;
  tanggal: string;                    // ISO date format "YYYY-MM-DD"
  product_ordered: string;
  product_made: string;
  qty: number;
  hpp_loss: number;
  reason: string;
  created_at: string;                 // ISO timestamp
}

/**
 * 6. daily_closing
 * Purpose: Data closing harian per outlet
 */
export interface DailyClosing {
  id: string;
  outlet_id: string;
  tanggal: string;                    // ISO date format "YYYY-MM-DD"
  closed_by: string;
  notes: string | null;
  created_at: string;                 // ISO timestamp
}

/**
 * 7. closing_non_topping_status
 * Purpose: Status sisa donat non-topping saat closing
 */
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
  created_at: string;                 // ISO timestamp
}

/**
 * 8. closing_finished_products
 * Purpose: Status sisa donat sudah topping saat closing
 */
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
  created_at: string;                 // ISO timestamp
}

/**
 * 9. daily_loss_summary
 * Purpose: Summary rugi harian per outlet (auto-generated dari closing)
 */
export interface DailyLossSummary {
  id: string;
  outlet_id: string;
  tanggal: string;                    // ISO date format "YYYY-MM-DD"
  production_waste_loss: number;
  topping_error_loss: number;
  non_topping_expired_loss: number;
  finished_product_reject_loss: number;
  total_loss: number;                 // Calculated field
  total_waste_qty: number;
  created_at: string;                 // ISO timestamp
}

// ============================================================================
// EXTENDED INTERFACES (WITH RELATIONS)
// ============================================================================

/**
 * ProductionDaily with waste details
 */
export interface ProductionDailyWithDetails extends ProductionDaily {
  waste_details: ProductionWasteDetail[];
  outlet?: {
    id: string;
    nama: string;
  };
  created_by_user?: {
    id: string;
    name: string;
  };
}

/**
 * DailyClosing with all related data
 */
export interface DailyClosingWithDetails extends DailyClosing {
  non_topping_status: ClosingNonToppingStatus[];
  finished_products: ClosingFinishedProduct[];
  loss_summary?: DailyLossSummary;
  outlet?: {
    id: string;
    nama: string;
  };
  closed_by_user?: {
    id: string;
    name: string;
  };
}

/**
 * ToppingError with relations
 */
export interface ToppingErrorWithDetails extends ToppingError {
  outlet?: {
    id: string;
    nama: string;
  };
  kasir?: {
    id: string;
    name: string;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Type for creating new production daily (without auto-generated fields)
 */
export type CreateProductionDaily = Omit<
  ProductionDaily,
  'id' | 'created_at' | 'updated_at'
>;

/**
 * Type for updating production daily
 */
export type UpdateProductionDaily = Partial<
  Omit<ProductionDaily, 'id' | 'outlet_id' | 'tanggal' | 'created_at' | 'updated_at'>
>;

/**
 * Type for creating waste detail
 */
export type CreateProductionWasteDetail = Omit<
  ProductionWasteDetail,
  'id' | 'hpp_loss' | 'created_at'
>;

/**
 * Type for creating topping error
 */
export type CreateToppingError = Omit<
  ToppingError,
  'id' | 'created_at'
>;

/**
 * Type for creating daily closing
 */
export type CreateDailyClosing = Omit<
  DailyClosing,
  'id' | 'created_at'
>;

/**
 * Type for creating closing non-topping status
 */
export type CreateClosingNonToppingStatus = Omit<
  ClosingNonToppingStatus,
  'id' | 'created_at'
>;

/**
 * Type for creating closing finished product
 */
export type CreateClosingFinishedProduct = Omit<
  ClosingFinishedProduct,
  'id' | 'created_at'
>;

// ============================================================================
// CALCULATED/DERIVED TYPES
// ============================================================================

/**
 * Production summary with calculated metrics
 */
export interface ProductionSummary {
  target_qty: number;
  success_qty: number;
  waste_qty: number;
  success_rate: number;               // (success_qty / target_qty) * 100
  waste_rate: number;                 // (waste_qty / target_qty) * 100
  total_hpp_loss: number;
}

/**
 * Inventory stock summary
 */
export interface InventoryStockSummary {
  ukuran: DonutSize;
  total_available: number;
  fresh: number;
  aging: number;
  expired: number;
  status: 'sufficient' | 'low' | 'out_of_stock';
  percentage: number;                 // % dari produksi hari ini
}

/**
 * Loss breakdown by category
 */
export interface LossBreakdown {
  production_waste: {
    qty: number;
    hpp_loss: number;
    percentage: number;
    details: Array<{
      reason: string;
      qty: number;
      hpp_loss: number;
    }>;
  };
  topping_errors: {
    qty: number;
    hpp_loss: number;
    percentage: number;
  };
  non_topping_expired: {
    qty: number;
    hpp_loss: number;
    percentage: number;
  };
  finished_product_reject: {
    qty: number;
    hpp_loss: number;
    percentage: number;
  };
}

/**
 * Stock validation result
 */
export interface StockValidationResult {
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

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for DonutSize
 */
export function isDonutSize(value: unknown): value is DonutSize {
  return value === 'standar' || value === 'mini';
}

/**
 * Type guard for InventoryStatus
 */
export function isInventoryStatus(value: unknown): value is InventoryStatus {
  return value === 'fresh' || value === 'aging' || value === 'expired';
}

/**
 * Type guard for FinishedProductStatus
 */
export function isFinishedProductStatus(value: unknown): value is FinishedProductStatus {
  return value === 'fresh' || value === 'aging' || value === 'reject';
}

/**
 * Type guard for ProductionUserRole
 */
export function isProductionUserRole(value: unknown): value is ProductionUserRole {
  return (
    value === 'admin' ||
    value === 'owner' ||
    value === 'manager' ||
    value === 'bagian_dapur' ||
    value === 'kasir' ||
    value === 'closing_staff'
  );
}

/**
 * Check if production is editable (only today's production)
 */
export function isProductionEditable(production: ProductionDaily): boolean {
  const today = new Date().toISOString().split('T')[0];
  return production.tanggal === today;
}

/**
 * Check if closing is editable (only today's closing)
 */
export function isClosingEditable(closing: DailyClosing): boolean {
  const today = new Date().toISOString().split('T')[0];
  return closing.tanggal === today;
}
