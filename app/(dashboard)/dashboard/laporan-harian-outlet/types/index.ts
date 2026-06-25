// Types untuk Laporan Harian Outlet

export interface DashboardData {
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
    channel_deductions?: number;
    channel_deductions_hpp?: number;
    channels_summary?: Array<{ channel_key: string; channel_name: string; qty: number }>;
    success_rate: number;
    waste_rate: number;
    sold_rate: number;
    remaining_rate: number;
  };
  sales_by_product: Array<{
    product_id: string;
    product_name: string;
    category_id: string | null;
    category_name: string | null;
    qty: number;
    revenue: number;
    percentage: number;
  }>;
  payment_methods: Array<{
    method: string;
    count: number;
    total: number;
  }>;
  transaction_count: number;
  average_order_value: number;
  loss_breakdown: {
    production_waste: { amount: number; percentage: number };
    topping_error: { amount: number; percentage: number };
    non_topping_expired: { amount: number; percentage: number };
    finished_product_reject: { amount: number; percentage: number };
  };
  has_closing: boolean;
  is_kasir_locked?: boolean;
}

export interface ExpenseItem {
  id: string;
  kategori: string;
  keterangan: string;
  jumlah: number;
  created_at: string;
  bukti_url?: string | null; // URL gambar bukti pengeluaran (dari API /api/expenses)
  receipt_url?: string | null; // Alias field name (dari storage upload)
}
