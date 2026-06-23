/**
 * Expense Management Types
 * 
 * Type definitions for outlet expense tracking system
 */

// ============================================================================
// EXPENSE TYPES
// ============================================================================

export type ExpenseCategory = 
  | 'operasional'    // Operasional (listrik, gas, air, dll)
  | 'bahan_baku'     // Bahan Baku (tepung, gula, minyak, dll)
  | 'gaji'           // Gaji & Upah
  | 'transportasi'   // Transportasi & Pengiriman
  | 'perawatan'      // Perawatan & Perbaikan
  | 'marketing'      // Marketing & Promosi
  | 'lainnya';       // Lainnya

export type ExpenseStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export interface Expense {
  id: string;
  outlet_id: string;
  tanggal: string;  // DATE format: YYYY-MM-DD
  kategori: ExpenseCategory;
  jumlah: number;
  keterangan: string;
  bukti_url?: string | null;  // URL foto bukti pengeluaran (optional)
  receipt_url?: string | null; // Database column name
  
  // Status & Approval (NEW in v2.0)
  status: ExpenseStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  
  // Closing Integration (NEW in v2.0)
  is_included_in_closing: boolean;
  closing_id?: string | null;
  
  // Audit Trail (NEW in v2.0)
  device_info?: Record<string, any> | null;
  ip_address?: string | null;
  
  created_by: string;  // User ID yang input
  created_at: string;
  updated_at: string;
}

export interface ExpenseWithDetails extends Expense {
  outlet?: {
    id: string;
    nama: string;
  };
  created_by_user?: {
    id: string;
    name: string;
  };
}

// ============================================================================
// CREATE/UPDATE TYPES
// ============================================================================

export interface CreateExpense {
  outlet_id: string;
  tanggal: string;
  kategori: ExpenseCategory;
  keterangan: string;
  jumlah: number;
  bukti_url?: string | null;
  created_by: string;
}

export interface UpdateExpense {
  kategori?: ExpenseCategory;
  keterangan?: string;
  jumlah?: number;
  bukti_url?: string | null;
}

// ============================================================================
// QUERY FILTERS
// ============================================================================

export interface ExpenseFilters {
  outlet_id?: string;
  tanggal?: string;
  start_date?: string;
  end_date?: string;
  kategori?: ExpenseCategory;
  created_by?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// SUMMARY TYPES
// ============================================================================

export interface ExpenseSummary {
  total_pengeluaran: number;
  jumlah_item: number;
  breakdown_by_kategori: {
    kategori: ExpenseCategory;
    total: number;
    count: number;
    percentage: number;
  }[];
}

export interface ExpenseDailySummary {
  tanggal: string;
  outlet_id: string;
  outlet_nama?: string;
  total_pengeluaran: number;
  jumlah_item: number;
  breakdown: {
    operasional: number;
    bahan_baku: number;
    gaji: number;
    transportasi: number;
    perawatan: number;
    marketing: number;
    lainnya: number;
  };
}

export interface ExpensePeriodSummary {
  start_date: string;
  end_date: string;
  outlet_id?: string;
  total_pengeluaran: number;
  jumlah_item: number;
  rata_rata_harian: number;
  breakdown_by_kategori: {
    kategori: ExpenseCategory;
    total: number;
    count: number;
    percentage: number;
  }[];
  breakdown_by_date: {
    tanggal: string;
    total: number;
    count: number;
  }[];
}

// ============================================================================
// AUDIT LOG TYPES (NEW in v2.0)
// ============================================================================

export type AuditAction = 'created' | 'updated' | 'deleted' | 'approved' | 'rejected';

export interface ExpenseAuditLog {
  id: string;
  expense_id: string;
  action: AuditAction;
  performed_by: string;
  performed_at: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string | null;
  device_info?: Record<string, any> | null;
  reason?: string | null;
}

export interface ExpenseAuditLogWithDetails extends ExpenseAuditLog {
  performed_by_user?: {
    id: string;
    name: string;
  };
}

// ============================================================================
// BUDGET TYPES (NEW in v2.0)
// ============================================================================

export interface OutletExpenseBudget {
  id: string;
  outlet_id: string;
  kategori: ExpenseCategory;
  budget_harian?: number | null;
  budget_bulanan?: number | null;
  alert_threshold_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetStatus {
  kategori: ExpenseCategory;
  budget_harian?: number | null;
  budget_bulanan?: number | null;
  used_today: number;
  used_this_month: number;
  remaining_today?: number | null;
  remaining_month?: number | null;
  percentage_used_today?: number;
  percentage_used_month?: number;
  alert_level: 'safe' | 'warning' | 'danger';
}

export interface CreateBudget {
  outlet_id: string;
  kategori: ExpenseCategory;
  budget_harian?: number | null;
  budget_bulanan?: number | null;
  alert_threshold_percent?: number;
}

export interface UpdateBudget {
  budget_harian?: number | null;
  budget_bulanan?: number | null;
  alert_threshold_percent?: number;
  is_active?: boolean;
}

