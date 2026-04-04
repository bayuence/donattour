import { supabase } from '../supabase'
import type {
  CartItem,
  PaymentMethod,
  ShopSettings,
  DailyReport,
  ChannelType,
} from '../types'

async function _recordMovement(movement: {
  location_id: string
  product_id: string
  type: 'in' | 'out' | 'sale' | 'waste' | 'transfer'
  quantity: number
}) {
  const { error: moveError } = await supabase.from('inventory_movements').insert(movement)
  if (moveError) { console.error('Error recording movement:', moveError); return }
  const mod = movement.type === 'in' || movement.type === 'transfer' ? movement.quantity : -movement.quantity
  await supabase.rpc('update_stock_quantity', {
    p_location_id: movement.location_id,
    p_product_id: movement.product_id,
    p_quantity_change: mod,
  })
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
  const { data, error } = await supabase
    .from('shop_settings')
    .select('*')
    .single()

  if (error) {
    console.error('Error fetching shop settings:', error)
    return null
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

    if (error) { console.error('Error updating settings:', error); return null }
    return data
  } else {
    const { data, error } = await supabase
      .from('shop_settings')
      .insert(settings)
      .select()
      .single()

    if (error) { console.error('Error creating settings:', error); return null }
    return data
  }
}

// ─── Reports ─────────────────────────────────────────────────

export async function getDailyReport(date: string): Promise<DailyReport | null> {
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

// ─── Orders (Omnichannel) ────────────────────────────────────

export async function createOrder(
  order: {
    outlet_id: string
    customer_name?: string
    total_amount: number
    payment_method: string
    channel: ChannelType
  },
  items: {
    product_id: string
    quantity: number
    unit_price: number
    subtotal: number
    tipe_produk?: string
    base_product_id?: string | null
  }[],
  location_id: string
) {
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .insert([{
      ...order,
      status: 'completed',
      created_at: new Date().toISOString(),
    }])
    .select()
    .single()

  if (orderError) return { success: false, error: orderError.message }

  const orderItems = items.map((item) => ({
    order_id: orderData.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.subtotal,
  }))

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
  if (itemsError) return { success: false, error: itemsError.message }

  // Auto-backflush stok
  for (const item of items) {
    if (item.tipe_produk === 'donat_varian' && item.base_product_id) {
      await _recordMovement({
        location_id,
        product_id: item.base_product_id,
        type: 'sale',
        quantity: item.quantity,
      })
    } else {
      await _recordMovement({
        location_id,
        product_id: item.product_id,
        type: 'sale',
        quantity: item.quantity,
      })
    }
  }

  return { success: true, data: orderData }
}
