import { supabase, isSupabaseConfigured } from './supabase'
import type {
  ProductWithCategory,
  ProductCategory,
  ShopSettings,
  CartItem,
  PaymentMethod,
  ProductionBatchWithDetails,
  BatchStatus,
  DailyReport,
  User,
  UserRole,
  InventoryStatus,
  OtrPaket,
  OtrSession,
  OtrTransaksi,
  OtrTransaksiItem,
  Outlet,
} from './types'

// ─── Demo Data (digunakan kalau Supabase belum dikonfigurasi) ────

const DEMO_USERS: User[] = [
  {
    id: 'demo-admin-001',
    name: 'admin',
    email: 'admin@donattour.com',
    role: 'admin',
    is_active: true,
    last_login: null,
  },
]

let DEMO_OUTLETS: Outlet[] = [
  { id: 'outlet-1', nama: 'Outlet Pusat', alamat: 'Jl. Utama No. 1', telepon: '081234567890', status: 'aktif' },
  { id: 'outlet-2', nama: 'Outlet Cabang 1', alamat: 'Jl. Merdeka No. 5', telepon: '081234567891', status: 'aktif' },
]

// Password demo
const DEMO_PASSWORDS: Record<string, string> = {
  admin: '1234',
}

const DEMO_CATEGORIES: ProductCategory[] = [
  { id: 'cat-1', name: 'Donat Classic' },
  { id: 'cat-2', name: 'Donat Premium' },
  { id: 'cat-3', name: 'Minuman' },
]

const DEMO_PRODUCTS: ProductWithCategory[] = [
  { id: 'prod-1', name: 'Donat Gula', price: 5000, category_id: 'cat-1', quantity_in_stock: 50, reorder_level: 10, category: { id: 'cat-1', name: 'Donat Classic' } },
  { id: 'prod-2', name: 'Donat Cokelat', price: 7000, category_id: 'cat-1', quantity_in_stock: 40, reorder_level: 10, category: { id: 'cat-1', name: 'Donat Classic' } },
  { id: 'prod-3', name: 'Donat Keju', price: 8000, category_id: 'cat-2', quantity_in_stock: 30, reorder_level: 10, category: { id: 'cat-2', name: 'Donat Premium' } },
  { id: 'prod-4', name: 'Donat Strawberry', price: 8000, category_id: 'cat-2', quantity_in_stock: 25, reorder_level: 10, category: { id: 'cat-2', name: 'Donat Premium' } },
  { id: 'prod-5', name: 'Donat Matcha', price: 10000, category_id: 'cat-2', quantity_in_stock: 20, reorder_level: 10, category: { id: 'cat-2', name: 'Donat Premium' } },
  { id: 'prod-6', name: 'Kopi Susu', price: 15000, category_id: 'cat-3', quantity_in_stock: 100, reorder_level: 20, category: { id: 'cat-3', name: 'Minuman' } },
  { id: 'prod-7', name: 'Teh Manis', price: 8000, category_id: 'cat-3', quantity_in_stock: 100, reorder_level: 20, category: { id: 'cat-3', name: 'Minuman' } },
]

const DEMO_SETTINGS: ShopSettings = {
  id: 'settings-1',
  shop_name: 'donattour Shop',
  tax_rate: 0.1,
  currency: 'IDR',
  opening_time: '07:00',
  closing_time: '21:00',
}

let demoBatches: ProductionBatchWithDetails[] = []
let demoTransactionCount = 0

// ─── OTR Demo Data ───────────────────────────────────────────
const DEMO_OTR_PAKET: OtrPaket[] = [
  {
    id: 'otr-paket-1',
    nama: 'Paket Isi 3',
    isi: 3,
    harga: 20000,
    deskripsi: '3 pcs donat pilihan',
    is_active: true,
  },
  {
    id: 'otr-paket-2',
    nama: 'Paket Isi 6',
    isi: 6,
    harga: 35000,
    deskripsi: '6 pcs donat pilihan – hemat Rp 5.000',
    is_active: true,
  },
]

const DEMO_OTR_MOBIL = [
  { id: 'mob-1', nopol: 'B 1234 ABC', nama: 'Mobil Donat 1' },
  { id: 'mob-2', nopol: 'B 5678 DEF', nama: 'Mobil Donat 2' },
]

let demoOtrSessions: OtrSession[] = []
let demoOtrTransaksi: OtrTransaksi[] = []

// ─── Products ────────────────────────────────────────────────

export async function getProducts(): Promise<ProductWithCategory[]> {
  if (!isSupabaseConfigured) return DEMO_PRODUCTS

  const { data, error } = await supabase
    .from('products')
    .select('*, category:product_categories(*)')
    .order('name')

  if (error) {
    console.error('Error fetching products:', error)
    return DEMO_PRODUCTS
  }
  return data ?? []
}

export async function getProductById(productId: string) {
  if (!isSupabaseConfigured) return DEMO_PRODUCTS.find(p => p.id === productId) ?? null

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()

  if (error) {
    console.error('Error fetching product:', error)
    return null
  }
  return data
}

export async function updateProductStock(productId: string, newStock: number) {
  if (!isSupabaseConfigured) {
    const product = DEMO_PRODUCTS.find(p => p.id === productId)
    if (product) product.quantity_in_stock = newStock
    return
  }

  const { error } = await supabase
    .from('products')
    .update({ quantity_in_stock: newStock })
    .eq('id', productId)

  if (error) {
    console.error('Error updating stock:', error)
  }
}

// ─── Categories ──────────────────────────────────────────────

export async function getCategories(): Promise<ProductCategory[]> {
  if (!isSupabaseConfigured) return DEMO_CATEGORIES

  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching categories:', error)
    return DEMO_CATEGORIES
  }
  return data ?? []
}

// ─── Transactions ────────────────────────────────────────────

export async function createTransaction(
  cashierId: string,
  cartItems: CartItem[],
  paymentMethod: PaymentMethod,
  taxRate: number,
  notes: string
) {
  const subtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0)
  const taxAmount = subtotal * taxRate
  const total = subtotal + taxAmount
  const transactionNumber = `TXN-${Date.now()}`

  if (!isSupabaseConfigured) {
    demoTransactionCount++
    // Kurangi stok di demo
    for (const item of cartItems) {
      const product = DEMO_PRODUCTS.find(p => p.id === item.product_id)
      if (product) product.quantity_in_stock = Math.max(0, product.quantity_in_stock - item.quantity)
    }
    return { transaction_number: transactionNumber }
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      transaction_number: transactionNumber,
      cashier_id: cashierId,
      subtotal,
      tax_amount: taxAmount,
      total,
      payment_method: paymentMethod,
      notes,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating transaction:', error)
    return null
  }

  // Insert transaction items
  const items = cartItems.map((item) => ({
    transaction_id: data.id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.subtotal,
  }))

  const { error: itemsError } = await supabase
    .from('transaction_items')
    .insert(items)

  if (itemsError) {
    console.error('Error creating transaction items:', itemsError)
  }

  return { transaction_number: transactionNumber }
}

export async function getTransactionsByDate(date: string) {
  if (!isSupabaseConfigured) {
    // Demo: return beberapa transaksi contoh
    void date
    return Array.from({ length: demoTransactionCount }, (_, i) => ({ total: (i + 1) * 25000 }))
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('total')
    .gte('created_at', `${date}T00:00:00`)
    .lt('created_at', `${date}T23:59:59`)

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }
  return data ?? []
}

// ─── Shop Settings ───────────────────────────────────────────

export async function getShopSettings(): Promise<ShopSettings | null> {
  if (!isSupabaseConfigured) return { ...DEMO_SETTINGS }

  const { data, error } = await supabase
    .from('shop_settings')
    .select('*')
    .single()

  if (error) {
    console.error('Error fetching shop settings:', error)
    return { ...DEMO_SETTINGS }
  }
  return data
}

export async function updateShopSettings(settings: {
  shop_name: string
  tax_rate: number
  currency: string
  opening_time: string
  closing_time: string
}): Promise<ShopSettings | null> {
  if (!isSupabaseConfigured) {
    Object.assign(DEMO_SETTINGS, settings)
    return { ...DEMO_SETTINGS }
  }

  // Try update first, if no rows exist, insert
  const { data: existing } = await supabase
    .from('shop_settings')
    .select('id')
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('shop_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating settings:', error)
      return null
    }
    return data
  } else {
    const { data, error } = await supabase
      .from('shop_settings')
      .insert(settings)
      .select()
      .single()

    if (error) {
      console.error('Error creating settings:', error)
      return null
    }
    return data
  }
}

// ─── Production Batches ──────────────────────────────────────

export async function getProductionBatches(
  status?: BatchStatus
): Promise<ProductionBatchWithDetails[]> {
  if (!isSupabaseConfigured) {
    return status ? demoBatches.filter(b => b.status === status) : demoBatches
  }

  let query = supabase
    .from('production_batches')
    .select('*, product:products(id, name)')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching batches:', error)
    return []
  }
  return data ?? []
}

export async function createProductionBatch(
  productId: string,
  quantity: number,
  userId: string,
  notes?: string
) {
  const batchNumber = `BATCH-${Date.now()}`

  if (!isSupabaseConfigured) {
    const product = DEMO_PRODUCTS.find(p => p.id === productId)
    const batch: ProductionBatchWithDetails = {
      id: `batch-${Date.now()}`,
      batch_number: batchNumber,
      status: 'planned',
      quantity_planned: quantity,
      quantity_produced: 0,
      started_at: null,
      completed_at: null,
      created_at: new Date().toISOString(),
      notes: notes || null,
      product: product ? { id: product.id, name: product.name } : undefined,
    }
    demoBatches.unshift(batch)
    void userId
    return batch
  }

  const { data, error } = await supabase
    .from('production_batches')
    .insert({
      batch_number: batchNumber,
      product_id: productId,
      quantity_planned: quantity,
      quantity_produced: 0,
      status: 'planned' as BatchStatus,
      created_by: userId,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating batch:', error)
    return null
  }
  return data
}

export async function updateBatchStatus(
  batchId: string,
  newStatus: BatchStatus
): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const batch = demoBatches.find(b => b.id === batchId)
    if (batch) {
      batch.status = newStatus
      if (newStatus === 'in_progress') batch.started_at = new Date().toISOString()
      if (newStatus === 'completed') batch.completed_at = new Date().toISOString()
    }
    return true
  }

  const updates: Record<string, unknown> = { status: newStatus }

  if (newStatus === 'in_progress') {
    updates.started_at = new Date().toISOString()
  } else if (newStatus === 'completed') {
    updates.completed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('production_batches')
    .update(updates)
    .eq('id', batchId)

  if (error) {
    console.error('Error updating batch status:', error)
    return false
  }
  return true
}

export async function updateBatchProduction(
  batchId: string,
  newQuantity: number
): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const batch = demoBatches.find(b => b.id === batchId)
    if (batch) batch.quantity_produced = newQuantity
    return true
  }

  const { error } = await supabase
    .from('production_batches')
    .update({ quantity_produced: newQuantity })
    .eq('id', batchId)

  if (error) {
    console.error('Error updating batch production:', error)
    return false
  }
  return true
}

// ─── Reports ─────────────────────────────────────────────────

export async function getDailyReport(date: string): Promise<DailyReport | null> {
  if (!isSupabaseConfigured) {
    void date
    return {
      total_sales: demoTransactionCount * 25000,
      total_transactions: demoTransactionCount,
      total_cash: demoTransactionCount * 15000,
      total_card: demoTransactionCount * 10000,
      net_profit: demoTransactionCount * 12000,
      total_expenses: demoTransactionCount * 5000,
    }
  }

  const { data, error } = await supabase
    .from('v_daily_sales_summary')
    .select('*')
    .eq('report_date', date)
    .single()

  if (error) {
    return {
      total_sales: 0,
      total_transactions: 0,
      total_cash: 0,
      total_card: 0,
      net_profit: 0,
      total_expenses: 0,
    }
  }
  return data
}

export async function getTopProducts(date: string, limit: number) {
  if (!isSupabaseConfigured) {
    void date
    return DEMO_PRODUCTS.slice(0, limit).map(p => ({
      product_id: p.id,
      product_name: p.name,
      total_quantity_sold: Math.floor(Math.random() * 20) + 1,
      total_revenue: p.price * (Math.floor(Math.random() * 20) + 1),
      times_sold: Math.floor(Math.random() * 10) + 1,
    }))
  }

  const { data, error } = await supabase
    .from('v_product_sales_ranking')
    .select('product_id, product_name, total_quantity_sold, total_revenue, times_sold')
    .eq('sale_date', date)
    .order('total_revenue', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching top products:', error)
    return []
  }
  return data ?? []
}

// ─── Users ───────────────────────────────────────────────────

export async function getAllUsers(): Promise<User[]> {
  if (!isSupabaseConfigured) return [...DEMO_USERS]

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching users:', error)
    return []
  }
  return data ?? []
}

export async function createUser(
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<User | null> {
  if (!isSupabaseConfigured) {
    const newUser: User = {
      id: `demo-${Date.now()}`,
      name,
      email,
      role,
      is_active: true,
      last_login: null,
    }
    DEMO_USERS.push(newUser)
    DEMO_PASSWORDS[name] = password
    return newUser
  }

  const { data, error } = await supabase
    .from('users')
    .insert({ email, password, name, role, is_active: true })
    .select()
    .single()

  if (error) {
    console.error('Error creating user:', error)
    return null
  }
  return data
}

export async function loginUser(
  username: string,
  password: string
): Promise<User | null> {
  if (!isSupabaseConfigured) {
    // Mode demo: cek dari data lokal
    const user = DEMO_USERS.find(u => u.name === username && u.is_active)
    const expectedPassword = DEMO_PASSWORDS[username]
    if (user && expectedPassword === password) {
      user.last_login = new Date().toISOString()
      return user
    }
    return null
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('name', username)
    .eq('password', password)
    .eq('is_active', true)
    .single()

  if (error) {
    console.error('Login error:', error)
    return null
  }

  if (data) {
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.id)
  }

  return data
}

// ─── Inventory ───────────────────────────────────────────────

export async function getInventoryStatus(): Promise<InventoryStatus[]> {
  if (!isSupabaseConfigured) {
    return DEMO_PRODUCTS.map(p => ({
      id: p.id,
      name: p.name,
      quantity_in_stock: p.quantity_in_stock,
      reorder_level: p.reorder_level,
      stock_status:
        p.quantity_in_stock <= p.reorder_level
          ? 'LOW' as const
          : p.quantity_in_stock >= p.reorder_level * 3
            ? 'HIGH' as const
            : 'NORMAL' as const,
    }))
  }

  const { data, error } = await supabase
    .from('v_inventory_status')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching inventory status:', error)
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, quantity_in_stock, reorder_level')
      .order('name')

    if (prodError || !products) return []

    return products.map((p) => ({
      ...p,
      stock_status:
        p.quantity_in_stock <= p.reorder_level
          ? 'LOW' as const
          : p.quantity_in_stock >= p.reorder_level * 3
            ? 'HIGH' as const
            : 'NORMAL' as const,
    }))
  }
  return data ?? []
}

// ─── OTR Functions ───────────────────────────────────────────

export async function getOtrPaket(): Promise<OtrPaket[]> {
  return [...DEMO_OTR_PAKET.filter(p => p.is_active)]
}

export async function getAllOtrPaket(): Promise<OtrPaket[]> {
  return [...DEMO_OTR_PAKET]
}

export async function createOtrPaket(data: Omit<OtrPaket, 'id'>): Promise<OtrPaket> {
  const newPaket: OtrPaket = { ...data, id: `otr-paket-${Date.now()}` }
  DEMO_OTR_PAKET.push(newPaket)
  return newPaket
}

export async function updateOtrPaket(id: string, data: Partial<OtrPaket>): Promise<boolean> {
  const idx = DEMO_OTR_PAKET.findIndex(p => p.id === id)
  if (idx === -1) return false
  Object.assign(DEMO_OTR_PAKET[idx], data)
  return true
}

export async function deleteOtrPaket(id: string): Promise<boolean> {
  const idx = DEMO_OTR_PAKET.findIndex(p => p.id === id)
  if (idx === -1) return false
  DEMO_OTR_PAKET.splice(idx, 1)
  return true
}

export async function getOtrMobil() {
  return [...DEMO_OTR_MOBIL]
}

export async function getOtrSessions(): Promise<OtrSession[]> {
  return [...demoOtrSessions].reverse()
}

export async function getActiveOtrSession(karyawanId: string): Promise<OtrSession | null> {
  return demoOtrSessions.find(s => s.karyawan_id === karyawanId && s.status === 'aktif') ?? null
}

export async function startOtrSession(data: {
  karyawan_id: string
  karyawan_nama: string
  nopol_mobil: string
  lokasi_awal: string
  stok_bawa: { paket_id: string; jumlah: number }[]
}): Promise<OtrSession> {
  const paketAll = DEMO_OTR_PAKET
  const session: OtrSession = {
    id: `ses-${Date.now()}`,
    karyawan_id: data.karyawan_id,
    karyawan_nama: data.karyawan_nama,
    nopol_mobil: data.nopol_mobil,
    lokasi_awal: data.lokasi_awal,
    started_at: new Date().toISOString(),
    ended_at: null,
    status: 'aktif',
    total_penjualan: 0,
    stok_bawa: data.stok_bawa.map(s => {
      const paket = paketAll.find(p => p.id === s.paket_id)
      return {
        paket_id: s.paket_id,
        paket_nama: paket?.nama ?? s.paket_id,
        jumlah_bawa: s.jumlah,
        jumlah_terjual: 0,
      }
    }),
  }
  demoOtrSessions.push(session)
  return session
}

export async function endOtrSession(sessionId: string): Promise<boolean> {
  const session = demoOtrSessions.find(s => s.id === sessionId)
  if (!session) return false
  session.status = 'selesai'
  session.ended_at = new Date().toISOString()
  return true
}

export async function createOtrTransaksi(data: {
  session_id: string
  items: OtrTransaksiItem[]
  metode_bayar: 'tunai' | 'transfer'
}): Promise<OtrTransaksi | null> {
  const total = data.items.reduce((s, i) => s + i.subtotal, 0)
  const trx: OtrTransaksi = {
    id: `otr-trx-${Date.now()}`,
    session_id: data.session_id,
    nomor_transaksi: `OTR-${Date.now()}`,
    items: data.items,
    total,
    metode_bayar: data.metode_bayar,
    created_at: new Date().toISOString(),
  }
  demoOtrTransaksi.push(trx)

  // Update stok terjual di session
  const session = demoOtrSessions.find(s => s.id === data.session_id)
  if (session) {
    session.total_penjualan += total
    for (const item of data.items) {
      const stok = session.stok_bawa.find(s => s.paket_id === item.paket_id)
      if (stok) stok.jumlah_terjual += item.jumlah
    }
  }
  return trx
}

export async function getOtrTransaksiBySession(sessionId: string): Promise<OtrTransaksi[]> {
  return demoOtrTransaksi.filter(t => t.session_id === sessionId)
}

export async function getAllOtrTransaksi(): Promise<OtrTransaksi[]> {
  return [...demoOtrTransaksi].reverse()
}

// ─── Outlet Functions ────────────────────────────────────────

export async function getOutlets(): Promise<Outlet[]> {
  return [...DEMO_OUTLETS]
}

export async function getActiveOutlets(): Promise<Outlet[]> {
  return DEMO_OUTLETS.filter(o => o.status === 'aktif')
}

export async function createOutlet(data: Omit<Outlet, 'id' | 'status'>): Promise<Outlet> {
  const outlet: Outlet = { ...data, id: `outlet-${Date.now()}`, status: 'aktif' }
  DEMO_OUTLETS.push(outlet)
  return outlet
}

export async function updateOutlet(id: string, data: Partial<Outlet>): Promise<boolean> {
  const idx = DEMO_OUTLETS.findIndex(o => o.id === id)
  if (idx === -1) return false
  Object.assign(DEMO_OUTLETS[idx], data)
  return true
}

export async function toggleOutletStatus(id: string): Promise<boolean> {
  const outlet = DEMO_OUTLETS.find(o => o.id === id)
  if (!outlet) return false
  outlet.status = outlet.status === 'aktif' ? 'tutup' : 'aktif'
  return true
}

