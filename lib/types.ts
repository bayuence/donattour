export type UserRole = 'cashier' | 'admin' | 'owner' | 'production_manager' | 'supervisor'

export type PaymentMethod = 'cash' | 'card' | 'mobile_money'

export type BatchStatus = 'planned' | 'in_progress' | 'quality_check' | 'completed'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  is_active: boolean
  last_login: string | null
  created_at?: string
}

export interface ProductCategory {
  id: string
  name: string
}

export interface Product {
  id: string
  name: string
  price: number
  category_id: string
  quantity_in_stock: number
  reorder_level: number
  created_at?: string
}

export interface ProductWithCategory extends Product {
  category?: ProductCategory
}

export interface CartItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface ShopSettings {
  id?: string
  shop_name: string
  tax_rate: number
  currency: string
  opening_time: string
  closing_time: string
  updated_at?: string
}

export interface ProductionBatchWithDetails {
  id: string
  batch_number: string
  status: BatchStatus
  quantity_planned: number
  quantity_produced: number
  started_at: string | null
  completed_at: string | null
  created_at: string
  notes: string | null
  product?: {
    id: string
    name: string
  }
}

export interface DailyReport {
  total_sales: number
  total_transactions: number
  total_cash: number
  total_card: number
  net_profit: number
  total_expenses: number
}

export interface InventoryStatus {
  id: string
  name: string
  quantity_in_stock: number
  reorder_level: number
  stock_status: 'LOW' | 'NORMAL' | 'HIGH'
}
