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
  Product,
  User,
  UserRole,
  InventoryStatus,
  OtrPaket,
  OtrSession,
  OtrTransaksi,
  OtrTransaksiItem,
  Outlet,
  ReceiptSettings,
  UserWithProfile,
  EmployeeProfile,
  ProductBox,
  ProductPackage,
  ProductBundling,
  ProductCustomTemplate,
  OutletProductionCost,
  ChannelType,
  OutletChannelPrice
} from './types'

// ─── Demo Data (digunakan kalau Supabase belum dikonfigurasi) ────

const DEMO_USERS: User[] = [
  {
    id: 'demo-admin-001',
    username: 'admin',
    name: 'Admin Donattour',
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
  { id: 'cat-1', nama: 'Donat Classic' },
  { id: 'cat-2', nama: 'Donat Premium' },
  { id: 'cat-3', nama: 'Minuman' },
]

const DEMO_PRODUCTS: ProductWithCategory[] = [
  { id: 'prod-1', nama: 'Donat Gula', kode: 'prod-1', is_active: true, harga_jual: 5000, biaya_topping: 0, category_id: 'cat-1', quantity_in_stock: 50, reorder_level: 10, category: { id: 'cat-1', nama: 'Donat Classic' } },
  { id: 'prod-2', nama: 'Donat Cokelat', kode: 'prod-2', is_active: true, harga_jual: 7000, biaya_topping: 0, category_id: 'cat-1', quantity_in_stock: 40, reorder_level: 10, category: { id: 'cat-1', nama: 'Donat Classic' } },
  { id: 'prod-3', nama: 'Donat Keju', kode: 'prod-3', is_active: true, harga_jual: 8000, biaya_topping: 0, category_id: 'cat-2', quantity_in_stock: 30, reorder_level: 10, category: { id: 'cat-2', nama: 'Donat Premium' } },
  { id: 'prod-4', nama: 'Donat Strawberry', kode: 'prod-4', is_active: true, harga_jual: 8000, biaya_topping: 0, category_id: 'cat-2', quantity_in_stock: 25, reorder_level: 10, category: { id: 'cat-2', nama: 'Donat Premium' } },
  { id: 'prod-5', nama: 'Donat Matcha', kode: 'prod-5', is_active: true, harga_jual: 10000, biaya_topping: 0, category_id: 'cat-2', quantity_in_stock: 20, reorder_level: 10, category: { id: 'cat-2', nama: 'Donat Premium' } },
  { id: 'prod-6', nama: 'Kopi Susu', kode: 'prod-6', is_active: true, harga_jual: 15000, biaya_topping: 0, category_id: 'cat-3', quantity_in_stock: 100, reorder_level: 20, category: { id: 'cat-3', nama: 'Minuman' } },
  { id: 'prod-7', nama: 'Teh Manis', kode: 'prod-7', is_active: true, harga_jual: 8000, biaya_topping: 0, category_id: 'cat-3', quantity_in_stock: 100, reorder_level: 20, category: { id: 'cat-3', nama: 'Minuman' } },
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
let demoProductionCost: OutletProductionCost | null = {
  id: 'demo-cost-1',
  outlet_id: '00000000-0000-0000-0000-000000000000',
  cost_polos_standar: 1500,
  cost_polos_mini: 800,
  updated_at: new Date().toISOString()
}

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
    .order('nama')

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
    .order('nama')

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
      product: product ? { id: product.id, name: product.nama } : undefined,
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
      product_name: p.nama,
      total_quantity_sold: Math.floor(Math.random() * 20) + 1,
      total_revenue: p.harga_jual * (Math.floor(Math.random() * 20) + 1),
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

export async function getUsersDetailed(outletId?: string): Promise<UserWithProfile[]> {
  if (!isSupabaseConfigured) return DEMO_USERS as UserWithProfile[]

  let query = supabase
    .from('users')
    .select(`
      *,
      outlet:outlets(id, nama),
      profile:employee_profiles(*)
    `)
    .order('name')

  if (outletId) {
    query = query.eq('outlet_id', outletId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching detailed users:', JSON.stringify(error, null, 2))
    return []
  }
  return data as any ?? [] // Cast because Postgrest returns nested objects arrays
}

export async function updateUserAccess(userId: string, updates: Partial<{ password_hash: string, is_active: boolean, outlet_id: string | null }>): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  const { error } = await supabase.from('users').update(updates).eq('id', userId)
  if (error) console.error('Error updating user access:', error)
  return !error
}

export async function upsertEmployeeProfile(profile: EmployeeProfile): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  
  const { error } = await supabase
    .from('employee_profiles')
    .upsert(profile, { onConflict: 'user_id' })
    
  if (error) console.error('Error upserting employee profile:', error)
  return !error
}

export async function createUser(
  username: string,
  email: string,
  password: string,
  name: string,
  role: UserRole
): Promise<User | null> {
  if (!isSupabaseConfigured) {
    const newUser: User = {
      id: `demo-${Date.now()}`,
      username,
      name,
      email,
      role,
      is_active: true,
      last_login: null,
    }
    DEMO_USERS.push(newUser)
    DEMO_PASSWORDS[username] = password
    return newUser
  }

  const { data, error } = await supabase
    .from('users')
    .insert({ email, password_hash: password, name, role, is_active: true, username })
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
): Promise<UserWithProfile | null> {
  if (!isSupabaseConfigured) {
    // Mode demo: cek dari data lokal
    const user = DEMO_USERS.find(u => u.username === username && u.is_active)
    const expectedPassword = DEMO_PASSWORDS[username]
    if (user && expectedPassword === password) {
      user.last_login = new Date().toISOString()
      return user as UserWithProfile
    }
    return null
  }

  const { data, error } = await supabase
    .from('users')
    .select(`
      id, username, name, email, phone, role, outlet_id, is_active, last_login, created_at,
      profile:employee_profiles(accessible_menus)
    `)
    .eq('username', username)
    .eq('password_hash', password)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Login error:', JSON.stringify(error, null, 2))
    }
    return null
  }

  if (data) {
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', data.id)
  }

  return {
    ...data,
    profile: Array.isArray(data.profile) ? data.profile[0] : data.profile
  } as any as UserWithProfile
}

// ─── Inventory ───────────────────────────────────────────────

export async function getInventoryStatus(): Promise<InventoryStatus[]> {
  if (!isSupabaseConfigured) {
    return DEMO_PRODUCTS.map(p => ({
      id: p.id,
      name: p.nama,
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
  if (!isSupabaseConfigured) return [...DEMO_OUTLETS]
  
  const { data, error } = await supabase
    .from('outlets')
    .select('*')
    .order('nama')
    
  if (error) {
    console.error('Error fetching outlets:', error)
    return DEMO_OUTLETS
  }
  return data ?? []
}

export async function getActiveOutlets(): Promise<Outlet[]> {
  if (!isSupabaseConfigured) return DEMO_OUTLETS.filter(o => o.status === 'aktif')

  const { data, error } = await supabase
    .from('outlets')
    .select('*')
    .eq('status', 'aktif')
    .order('nama')

  if (error) return []
  return data ?? []
}

export async function createOutlet(data: Omit<Outlet, 'id' | 'status'>): Promise<Outlet | null> {
  if (!isSupabaseConfigured) {
    const outlet: Outlet = { ...data, id: `outlet-${Date.now()}`, status: 'aktif' }
    DEMO_OUTLETS.push(outlet)
    return outlet
  }

  // Generate kode unik dari nama outlet atau timestamp
  const prefix = data.nama.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'O');
  const kode = `OUT-${prefix}-${Date.now().toString().slice(-4)}`;

  const { data: newOutlet, error } = await supabase
    .from('outlets')
    .insert({ ...data, kode, status: 'aktif' })
    .select()
    .single()

  if (error) {
    console.error('Error creating outlet:', error)
    return null
  }
  return newOutlet
}

export async function updateOutlet(id: string, data: Partial<Outlet>): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const idx = DEMO_OUTLETS.findIndex(o => o.id === id)
    if (idx === -1) return false
    Object.assign(DEMO_OUTLETS[idx], data)
    return true
  }

  const { error } = await supabase
    .from('outlets')
    .update(data)
    .eq('id', id)

  if (error) {
    console.error('Error updating outlet:', error)
    return false
  }
  return true
}

export async function toggleOutletStatus(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) {
    const outlet = DEMO_OUTLETS.find(o => o.id === id)
    if (!outlet) return false
    outlet.status = outlet.status === 'aktif' ? 'tutup' : 'aktif'
    return true
  }

  const { data } = await supabase.from('outlets').select('status').eq('id', id).single()
  if (!data) return false

  const newStatus = data.status === 'aktif' ? 'tutup' : 'aktif'
  const { error } = await supabase.from('outlets').update({ status: newStatus }).eq('id', id)
  
  return !error
}

// ─── Receipt Settings ────────────────────────────────────────

export async function getReceiptSettings(outletId: string): Promise<ReceiptSettings | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase
    .from('receipt_settings')
    .select('*')
    .eq('outlet_id', outletId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error fetching receipt settings:', error)
  }
  return data
}

export async function updateReceiptSettings(outletId: string, settings: Partial<ReceiptSettings>): Promise<boolean> {
  if (!isSupabaseConfigured) return false

  // Check if it exists
  const existing = await getReceiptSettings(outletId)

  if (existing) {
    const { error } = await supabase
      .from('receipt_settings')
      .update(settings)
      .eq('outlet_id', outletId)
    if (error) console.error('Error updating receipt settings:', error)
    return !error
  } else {
    const { error } = await supabase
      .from('receipt_settings')
      .insert({ outlet_id: outletId, ...settings })
    if (error) console.error('Error creating receipt settings:', error)
    return !error
  }
}


// ─── Omnichannel Pricing & Inventory ────────────────────────

export async function getOutletChannelPrices(outletId: string): Promise<OutletChannelPrice[]> {
  if (!isSupabaseConfigured) return []
  
  const { data, error } = await supabase
    .from('outlet_channel_prices')
    .select('*')
    .eq('outlet_id', outletId)
    
  if (error) {
    console.error('Error fetching outlet channel prices:', error)
    return []
  }
  
  return data as OutletChannelPrice[]
}

export async function upsertOutletChannelPrice(priceData: Omit<OutletChannelPrice, 'id' | 'created_at' | 'updated_at'>) {
  if (!isSupabaseConfigured) return false
  
  // Try to find if it exists
  const { data: existing } = await supabase
    .from('outlet_channel_prices')
    .select('id')
    .eq('outlet_id', priceData.outlet_id)
    .eq('product_id', priceData.product_id)
    .eq('channel', priceData.channel)
    .single()
    
  let result;
  if (existing) {
    result = await supabase
      .from('outlet_channel_prices')
      .update({
        harga_jual: priceData.harga_jual,
        is_active: priceData.is_active
      })
      .eq('id', existing.id)
  } else {
    result = await supabase
      .from('outlet_channel_prices')
      .insert(priceData)
  }
  
  if (result.error) {
    console.error('Error upserting outlet price:', result.error)
    return false
  }
  return true
}

//  CRUD Master & Advanced 

export async function upsertCategory(cat: Partial<ProductCategory>) {
  if (!isSupabaseConfigured) return false
  try {
    if (cat.id) {
      const { error } = await supabase.from('product_categories').update(cat).eq('id', cat.id)
      if (error) { console.error('Error updating category:', error); return false; }
    } else {
      const { error } = await supabase.from('product_categories').insert(cat)
      if (error) { console.error('Error inserting category:', error); return false; }
    }
    return true
  } catch { return false }
}

export async function deleteCategory(id: string) {
  if (!isSupabaseConfigured) return false
  const { error } = await supabase.from('product_categories').delete().eq('id', id)
  if (error) { console.error('Error deleting category:', error); return false; }
  return true
}

export async function upsertProduct(prod: Partial<ProductWithCategory>) {
  if (!isSupabaseConfigured) return false
  const { category, ...baseProd } = prod as any;
  if (baseProd.harga_jual) baseProd.harga_jual = Number(baseProd.harga_jual);
  if ('biaya_topping' in baseProd) delete baseProd.biaya_topping;
  if (!baseProd.category_id) delete baseProd.category_id;


  try {
    if (baseProd.id) {
      // Update existing
      const { error } = await supabase
        .from('products')
        .update(baseProd)
        .eq('id', baseProd.id)
      if (error) { console.error('Error updating product:', error); return false; }
    } else {
      // Insert new — generate required fields
      const kode = baseProd.kode || `PRD-${Date.now().toString().slice(-6)}`;
      const { error } = await supabase
        .from('products')
        .insert({
          ...baseProd,
          kode,
          quantity_in_stock: baseProd.quantity_in_stock ?? 0,
          reorder_level: baseProd.reorder_level ?? 0,
        })
      if (error) { console.error('Error inserting product:', error.message || error, JSON.stringify(error)); return false; }
    }
    return true
  } catch (err) {
    console.error('Error upserting product:', err)
    return false
  }
}

export async function deleteProduct(id: string) {
  if (!isSupabaseConfigured) return false
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) { console.error('Error deleting product:', error); return false; }
  return true
}

export async function getBoxes(): Promise<ProductBox[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.from('product_boxes').select('*').order('kapasitas')
  if (error) { console.error('Error fetching boxes:', error); return []; }
  return data || []
}

export async function upsertBox(box: Partial<ProductBox>) {
  if (!isSupabaseConfigured) return false
  try {
    if (box.id) {
      const { error } = await supabase.from('product_boxes').update(box).eq('id', box.id)
      if (error) { console.error('Error updating box:', error); return false; }
    } else {
      const { error } = await supabase.from('product_boxes').insert(box)
      if (error) { console.error('Error inserting box:', error); return false; }
    }
    return true
  } catch { return false }
}

export async function deleteBox(id: string) {
  if (!isSupabaseConfigured) return false
  const { error } = await supabase.from('product_boxes').delete().eq('id', id)
  if (error) { console.error('Error deleting box:', error); return false; }
  return true
}

export async function getPackages(): Promise<ProductPackage[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('product_packages')
    .select('*, box:product_boxes(kapasitas)')
    .order('nama')
  if (error) { console.error('Error fetching packages:', error); return []; }
  return (data || []).map((p: any) => ({
    ...p,
    kapasitas: p.box?.kapasitas || 0
  }))
}

export async function upsertPackage(pkg: Partial<ProductPackage>) {
  if (!isSupabaseConfigured) return false
  if (!pkg.category_id) delete pkg.category_id;
  if (!pkg.box_id) delete pkg.box_id;
  try {
    if (pkg.id) {
      const { error } = await supabase.from('product_packages').update(pkg).eq('id', pkg.id)
      if (error) { console.error('Error updating package:', error); return false; }
    } else {
      const { error } = await supabase.from('product_packages').insert(pkg)
      if (error) { console.error('Error inserting package:', error); return false; }
    }
    return true
  } catch { return false }
}

export async function getBundlings(): Promise<ProductBundling[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.from('product_bundling').select('*').order('nama')
  if (error) { console.error('Error fetching bundlings:', error); return []; }
  return data || []
}

export async function upsertBundling(bundling: Partial<ProductBundling>) {
  if (!isSupabaseConfigured) return false
  try {
    if (bundling.id) {
      const { error } = await supabase.from('product_bundling').update(bundling).eq('id', bundling.id)
      if (error) { console.error('Error updating bundling:', error); return false; }
    } else {
      const { error } = await supabase.from('product_bundling').insert(bundling)
      if (error) { console.error('Error inserting bundling:', error); return false; }
    }
    return true
  } catch { return false }
}

export async function getCustomTemplates(): Promise<ProductCustomTemplate[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.from('product_custom_templates').select('*').order('kapasitas')
  if (error) { console.error('Error fetching custom templates:', error); return []; }
  return data || []
}

export async function upsertCustomTemplate(template: Partial<ProductCustomTemplate>) {
  if (!isSupabaseConfigured) return false
  try {
    if (template.id) {
      const { error } = await supabase.from('product_custom_templates').update(template).eq('id', template.id)
      if (error) { console.error('Error updating custom template:', error); return false; }
    } else {
      const { error } = await supabase.from('product_custom_templates').insert(template)
      if (error) { console.error('Error inserting custom template:', error); return false; }
    }
    return true
  } catch { return false }
}

export async function getOutletProductionCost(outletId: string): Promise<OutletProductionCost | null> {
  if (!isSupabaseConfigured) return demoProductionCost
  const { data, error } = await supabase.from('outlet_production_costs').select('*').eq('outlet_id', outletId).maybeSingle()
  if (error) { console.error('Error fetching production cost:', error); return null; }
  return data || null
}

export async function upsertOutletProductionCost(cost: Partial<OutletProductionCost>) {
  if (!isSupabaseConfigured) {
    demoProductionCost = {
      id: 'demo-cost-1',
      outlet_id: cost.outlet_id || '00000000-0000-0000-0000-000000000000',
      cost_polos_standar: cost.cost_polos_standar ?? 1500,
      cost_polos_mini: cost.cost_polos_mini ?? 800,
      updated_at: new Date().toISOString()
    }
    return true
  }

  if (!cost.outlet_id) {
    console.error('upsertOutletProductionCost: outlet_id is required')
    return false
  }

  try {
    // Check if exists first
    const { data: existing } = await supabase
      .from('outlet_production_costs')
      .select('id')
      .eq('outlet_id', cost.outlet_id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('outlet_production_costs')
        .update({
          cost_polos_standar: cost.cost_polos_standar,
          cost_polos_mini: cost.cost_polos_mini,
          updated_at: new Date().toISOString()
        })
        .eq('outlet_id', cost.outlet_id)
      
      if (error) {
        console.error('Error updating production cost:', error)
        return false
      }
    } else {
      const { error } = await supabase
        .from('outlet_production_costs')
        .insert({
          outlet_id: cost.outlet_id,
          cost_polos_standar: cost.cost_polos_standar ?? 1500,
          cost_polos_mini: cost.cost_polos_mini ?? 800,
        })
      
      if (error) {
        console.error('Error inserting production cost:', error)
        return false
      }
    }
    return true
  } catch (err) {
    console.error('Error upserting production cost:', err)
    return false
  }
}

export async function recordInventoryMovement(movement: {
  location_id: string;
  product_id: string;
  type: 'in' | 'out' | 'sale' | 'waste' | 'transfer';
  quantity: number;
}) {
  if (!isSupabaseConfigured) return false
  const { error: moveError } = await supabase.from('inventory_movements').insert(movement)
  if (moveError) { console.error('Error recording movement:', moveError); return false; }
  const mod = (movement.type === 'in' || movement.type === 'transfer') ? movement.quantity : -movement.quantity
  const { error: stockError } = await supabase.rpc('update_stock_quantity', {
    p_location_id: movement.location_id,
    p_product_id: movement.product_id,
    p_quantity_change: mod
  })
  if (stockError) { console.error('Error updating base stock:', stockError); return false; }
  return true
}

export async function getInventorySummary() {
  if (!isSupabaseConfigured) return []
  
  // Ambil semua outlet untuk inisialisasi baris
  const { data: outlets } = await supabase.from('outlets').select('id, nama')
  if (!outlets) return []

  // Ambil stok per outlet/lokasi
  const { data: stocks } = await supabase
    .from('stocks')
    .select(`
      quantity,
      location:inventory_locations(tipe, outlet_id),
      product:products(tipe_produk)
    `)

  // Ambil movement per outlet/lokasi untuk sold/waste
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select(`
      type,
      quantity,
      location:inventory_locations(outlet_id)
    `)

  // Agregasi Data
  return outlets.map(out => {
    const outStocks = stocks?.filter(s => (s.location as any)?.outlet_id === out.id) || []
    const outMoves = movements?.filter(m => (m.location as any)?.outlet_id === out.id) || []

    return {
      outlet: out.nama,
      raw: outStocks.filter(s => (s.location as any)?.tipe === 'toko' && (s.product as any)?.tipe_produk === 'donat_base').reduce((sum, s) => sum + s.quantity, 0),
      qc: 0, // Placeholder jika belum ada stage QC eksplisit
      ready: outStocks.filter(s => (s.location as any)?.tipe === 'toko' && (s.product as any)?.tipe_produk === 'donat_varian').reduce((sum, s) => sum + s.quantity, 0),
      sold: outMoves.filter(m => m.type === 'sale').reduce((sum, m) => sum + m.quantity, 0),
      waste: outMoves.filter(m => m.type === 'waste').reduce((sum, m) => sum + m.quantity, 0),
      rejected: 0,
      otr: outStocks.filter(s => (s.location as any)?.tipe === 'otr').reduce((sum, s) => sum + s.quantity, 0),
    }
  })
}

export async function getChannelPrices(outletId: string, channel: ChannelType): Promise<OutletChannelPrice[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('outlet_channel_prices')
    .select('*')
    .eq('outlet_id', outletId)
    .eq('channel', channel)
    .eq('is_active', true)
  
  if (error) { console.error('Error fetching channel prices:', error); return []; }
  return data || []
}

export async function getProductCategories(): Promise<ProductCategory[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase.from('product_categories').select('*').order('nama')
  if (error) { console.error('Error fetching categories:', error); return []; }
  return data || []
}

export async function getProductsWithCategory(): Promise<ProductWithCategory[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('products')
    .select('*, category:product_categories(*)')
    .eq('is_active', true)
  
  if (error) { console.error('Error fetching products with category:', error); return []; }
  return data || []
}

export async function getProductsByTipe(tipe: string): Promise<Product[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('tipe_produk', tipe)
    .eq('is_active', true)
  
  if (error) { console.error('Error fetching products by tipe:', error); return []; }
  return data || []
}

export async function getProductPackages(): Promise<ProductPackage[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('product_packages')
    .select('*')
    .eq('is_active', true)
    .order('nama')
  
  if (error) { console.error('Error fetching product packages:', error); return []; }
  return data || []
}

export async function getProductBundlings(): Promise<ProductBundling[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('product_bundling')
    .select('*')
    .eq('is_active', true)
    .order('nama')
  
  if (error) { console.error('Error fetching product bundlings:', error); return []; }
  return data || []
}

export async function getProductCustomTemplates(): Promise<ProductCustomTemplate[]> {
  if (!isSupabaseConfigured) return []
  const { data, error } = await supabase
    .from('product_custom_templates')
    .select('*')
    .eq('is_active', true)
    .order('nama')
  
  if (error) { console.error('Error fetching product custom templates:', error); return []; }
  return data || []
}

export async function createOrder(
  order: { 
    outlet_id: string; 
    customer_name?: string; 
    total_amount: number; 
    payment_method: string;
    channel: ChannelType;
  },
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    tipe_produk?: string;
    base_product_id?: string | null;
  }[],
  location_id: string
) {
  if (!isSupabaseConfigured) return { success: false, error: 'Supabase not configured' }

  // 1. Insert Order
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert([{
      ...order,
      status: 'completed',
      created_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (orderError) return { success: false, error: orderError.message }

  // 2. Insert Order Items
  const orderItems = items.map(item => ({
    order_id: orderData.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.subtotal
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) return { success: false, error: itemsError.message }

  // 3. Auto-Backflush (Potong Stok Polos)
  // Untuk setiap item yang terjual, jika itu donat_varian, potong stok donat_base-nya
  for (const item of items) {
    if (item.tipe_produk === 'donat_varian' && item.base_product_id) {
      // Catat pergerakan stok (fungsi recordInventoryMovement sudah ada dan mengupdate tabel stocks)
      await recordInventoryMovement({
        location_id,
        product_id: item.base_product_id,
        type: 'sale',
        quantity: item.quantity
      })
    } else {
      // Jika produk biasa (minuman/cemilan), potong stok produk itu sendiri
      await recordInventoryMovement({
        location_id,
        product_id: item.product_id,
        type: 'sale',
        quantity: item.quantity
      })
    }
  }

  return { success: true, data: orderData }
}
