export type UserRole = 'cashier' | 'admin' | 'owner' | 'production_manager' | 'supervisor'

export type PaymentMethod = 'cash' | 'card' | 'mobile_money'

// Metode bayar kasir lengkap (digunakan di tabel orders)
export type PaymentMethodKasir =
  | 'cash'       // Tunai
  | 'digital'    // Pembayaran Digital (Midtrans: QRIS, E-wallet, Transfer Bank, Kartu)
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
  sort_order?: number
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

// ChannelType dibuat fleksibel agar mendukung kanal kasir yang dibuat secara dinamis.
// Nilai asli bawaan: 'toko' | 'otr' | 'gofood' | 'shopeefood' | 'grabfood' | 'online'
export type ChannelType = string;

// ─── Kasir Menu (Kanal Kasir Dinamis per Outlet) ─────────────
export interface KasirMenu {
  id: string
  outlet_id: string
  nama: string        // Nama tampilan, misal: "GoFood"
  slug: string        // Identitas kanal, misal: "gofood"
  color: string       // Warna tombol, misal: "amber", "green"
  urutan: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

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
  peruntukan?: string  // 'standar', 'mini', 'universal', dll.
  created_at?: string
  updated_at?: string
}
export interface ProductPackage {
  id: string
  nama: string
  kode?: string                           // Kode singkat, e.g. "REG3"
  deskripsi?: string | null               // Panduan untuk kasir
  category_id: string
  box_id: string
  kapasitas: number                       // Dari box (computed on fetch)
  harga_paket: number                     // Harga default (toko/fallback)
  diskon_persen: number                   // Diskon %, 0 jika tidak ada
  diskon_nominal: number                  // Diskon nominal Rp, 0 jika tidak ada
  channel_prices: Record<string, number>  // { toko: 25000, gofood: 28000 }
  allowed_extras: string[]                // Array product IDs untuk ekstra
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
  kode?: string              // Singkatan tampil di struk, misal: "CSTM6", "CSTM3"
  nama: string               // Nama panjang, misal: "Custom Box Isi 6"
  kapasitas: number          // Jumlah slot donat
  ukuran_donat: 'standar' | 'mini'

  // ─── NEW FLEXIBLE PRICING STRUCTURE ──────────────────
  mode_pricing?: CustomModePricing[]  // Array of mode configurations with integrated topping pricing
  
  // ─── LEGACY FIELDS (Deprecated, kept for backward compatibility) ─
  harga_satuan_default: number
  harga_klasik_full: number
  harga_reguler_full: number
  harga_premium_full: number
  harga_mix?: number
  biaya_paket_custom?: number
  allow_mix?: boolean
  mix_rasio_reguler?: number
  mix_rasio_premium?: number
  allow_random?: boolean
  enable_tulisan?: boolean
  deskripsi?: string
  diskon_persen?: number
  diskon_nominal?: number
  category_id_klasik?: string | null
  category_id_reguler?: string | null
  category_id_premium?: string | null

  is_active: boolean
}

// ─── Custom Mode Configuration (Mode Reguler, Mix, Premium) ──
export interface CustomModeConfig {
  id: string
  nama: string                   // Nama mode bebas, misal: "Mode Reguler", "AB", "Mix", "Triple"
  slug: string                   // Auto-generated dari nama
  tipe_mode: string              // Always 'flexible'
  category_limits: Array<{       // Flexible category limits
    category_id: string
    max_reguler: number
    max_mini: number
  }>
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// ─── NEW: Flexible Mode Pricing Structure ────────────────
export interface CustomModePricing {
  id: string                     // Unique ID for this mode config
  mode_config_id: string         // Reference to custom_mode_config.id
  mode_label: string             // Display name from custom_mode_config
  is_enabled: boolean            // Enable/disable this mode
  
  // ─── Pricing ─────────────────────────────────────────
  harga_jual: number             // Selling price for this mode
  hpp_estimated: number          // Estimated cost of goods (HPP)
  biaya_topping?: number         // Estimated topping cost per box
  margin_amount: number          // Calculated: harga_jual - hpp_estimated - biaya_topping
  margin_percent: number         // Calculated: (margin_amount / harga_jual) * 100
  
  // ─── Discount (Mode-specific) ────────────────────────
  diskon_nominal?: number        // Discount in Rupiah
  diskon_persen?: number         // Discount in percentage
  harga_setelah_diskon: number   // Final price after discount
  
  // ─── Topping/Printilan Pricing (Integrated) ──────────
  topping_pricing?: ToppingPricing[]  // Array of available toppings for this mode
  
  // ─── Notes ───────────────────────────────────────────
  keterangan?: string            // Internal notes for this mode
}

// ─── Topping/Printilan Pricing (Used within CustomModePricing) ───
export interface ToppingPricing {
  id: string
  product_id: string             // Reference to Product (tipe: tambahan)
  nama: string
  hpp_per_unit: number           // Cost per unit
  harga_jual: number             // Selling price
  margin_amount: number          // Calculated profit
  margin_percent: number         // Profit percentage
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
