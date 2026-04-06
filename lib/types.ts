export type UserRole = 'cashier' | 'admin' | 'owner' | 'production_manager' | 'supervisor'

export type PaymentMethod = 'cash' | 'card' | 'mobile_money'

// Metode bayar kasir lengkap (digunakan di tabel orders)
export type PaymentMethodKasir =
  | 'cash'       // Tunai
  | 'qris'       // QRIS (QR Code)
  | 'transfer'   // Transfer Bank
  | 'gopay'      // GoPay
  | 'ovo'        // OVO
  | 'dana'       // Dana
  | 'shopeepay'  // ShopeePay
  | 'card'       // Kartu Debet/Kredit
  | 'mobile_money'

export type BatchStatus = 'planned' | 'in_progress' | 'quality_check' | 'completed'

export interface Outlet {
  id: string
  nama: string
  alamat: string
  telepon: string
  status: 'aktif' | 'tutup'
}

export interface ReceiptSettings {
  outlet_id: string
  header_text: string | null
  address_text: string | null
  footer_text: string | null
  logo_url: string | null
  show_logo: boolean
  tax_info: string | null
  wifi_password: string | null
  social_media: string | null
}



export interface User {
  id: string
  username: string
  name: string
  email: string
  phone?: string
  role: UserRole
  outlet_id?: string
  is_active: boolean
  last_login: string | null
  created_at?: string
  password_hash?: string
}

export interface EmployeeProfile {
  user_id: string
  bank_name: string | null
  bank_account: string | null
  bank_account_name: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  employment_type: 'full_time' | 'part_time' | 'otr_driver' | 'freelance'
  join_date: string | null
  accessible_menus?: string[]
}

export interface UserWithProfile extends User {
  profile?: EmployeeProfile
  outlet?: { id: string; nama: string }
}


export interface ProductCategory {
  id: string
  nama: string
  deskripsi?: string
  kode?: string
  icon?: string
}

export interface Product {
  id: string
  nama: string
  kode: string
  category_id: string | null
  deskripsi?: string
  ukuran?: string
  harga_jual: number
  harga_pokok_penjualan?: number
  quantity_in_stock: number
  reorder_level: number
  image_url?: string
  is_active: boolean
  biaya_topping: number
  created_at?: string
  updated_at?: string
  
  // Omnichannel JIT Additions
  tipe_produk?: 'donat_base' | 'donat_varian' | 'minuman' | 'cemilan' | 'paket' | 'tambahan' | 'box' | 'bundling' | 'biaya_ekstra'
  base_product_id?: string | null
}

export type ChannelType = 'toko' | 'otr' | 'gofood' | 'shopeefood' | 'grabfood' | 'online';

export interface OutletChannelPrice {
  id: string
  outlet_id: string
  product_id: string
  channel: ChannelType
  harga_jual: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface InventoryLocation {
  id: string
  outlet_id: string
  nama: string
  tipe: 'toko' | 'otr'
  dikepalai_oleh?: string | null
  created_at?: string
  updated_at?: string
}

export interface Stock {
  id: string
  location_id: string
  product_id: string
  quantity: number
  last_updated_at?: string
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
    nama: string
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

// ─── OTR (On The Road) ──────────────────────────────────────

export interface OtrPaket {
  id: string
  nama: string          // e.g. "Paket Isi 3"
  isi: number           // 3 atau 6
  harga: number
  deskripsi?: string
  is_active: boolean
}

// ─── Advanced Product Entities ──────────────────────────────

export interface ProductBox {
  id: string
  nama: string
  kapasitas: number
  harga_box: number
  created_at?: string
  updated_at?: string
}
export interface ProductPackage {
  id: string
  nama: string
  category_id: string
  box_id: string
  kapasitas: number
  harga_paket: number
  is_active: boolean
  created_at?: string
  updated_at?: string
  
  // Joined data
  box?: { id: string; nama: string; kapasitas: number }
  category?: ProductCategory
}

export interface ProductBundling {
  id: string
  nama: string
  deskripsi: string | null
  pilihan_item: string | null
  harga_normal: number | null
  harga_bundling: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}


export interface ProductCustomTemplate {
  id: string
  nama: string
  kapasitas: number
  ukuran_donat: 'standar' | 'mini'
  harga_satuan_default: number
  harga_klasik_full: number
  harga_reguler_full: number
  harga_premium_full: number
  is_active: boolean
}

export interface OutletProductionCost {
  id: string
  outlet_id: string
  // HPP (Harga Pokok Penjualan) — biaya produksi donat polos
  cost_polos_standar: number
  cost_polos_mini: number
  // Harga jual donat polos (tanpa topping)
  harga_jual_polos_standar: number
  harga_jual_polos_mini: number
  updated_at?: string
}

export type OtrSessionStatus = 'aktif' | 'selesai'

export interface OtrSession {
  id: string
  karyawan_id: string
  karyawan_nama: string
  nopol_mobil: string
  lokasi_awal: string
  stok_bawa: OtrStokBawa[]
  started_at: string
  ended_at: string | null
  status: OtrSessionStatus
  total_penjualan: number
  catatan?: string
}

export interface OtrStokBawa {
  paket_id: string
  paket_nama: string
  jumlah_bawa: number
  jumlah_terjual: number
}

export interface OtrTransaksi {
  id: string
  session_id: string
  nomor_transaksi: string
  items: OtrTransaksiItem[]
  total: number
  metode_bayar: 'tunai' | 'transfer'
  created_at: string
}

export interface OtrTransaksiItem {
  paket_id: string
  paket_nama: string
  jumlah: number
  harga_satuan: number
  subtotal: number
}
