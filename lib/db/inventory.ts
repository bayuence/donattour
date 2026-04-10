import { supabase } from '../supabase'
import type { InventoryStatus, OutletChannelPrice, ChannelType } from '../types'

// ─── Inventory Status ────────────────────────────────────────

export async function getInventoryStatus(): Promise<InventoryStatus[]> {
  const { data, error } = await supabase
    .from('v_inventory_status')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching inventory status:', error)
    // Fallback ke tabel products jika view belum ada
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

export async function getInventorySummary() {
  const { data: outlets } = await supabase.from('outlets').select('id, nama')
  if (!outlets) return []

  const { data: stocks } = await supabase
    .from('stocks')
    .select(`
      quantity,
      location:inventory_locations(tipe, outlet_id),
      product:products(tipe_produk)
    `)

  const { data: movements } = await supabase
    .from('inventory_movements')
    .select(`
      type,
      quantity,
      location:inventory_locations(outlet_id)
    `)

  return outlets.map((out) => {
    const outStocks = stocks?.filter((s) => (s.location as any)?.outlet_id === out.id) || []
    const outMoves = movements?.filter((m) => (m.location as any)?.outlet_id === out.id) || []

    return {
      outlet: out.nama,
      raw: outStocks
        .filter((s) => (s.location as any)?.tipe === 'toko' && (s.product as any)?.tipe_produk === 'donat_base')
        .reduce((sum, s) => sum + s.quantity, 0),
      qc: 0,
      ready: outStocks
        .filter((s) => (s.location as any)?.tipe === 'toko' && (s.product as any)?.tipe_produk === 'donat_varian')
        .reduce((sum, s) => sum + s.quantity, 0),
      sold: outMoves.filter((m) => m.type === 'sale').reduce((sum, m) => sum + m.quantity, 0),
      waste: outMoves.filter((m) => m.type === 'waste').reduce((sum, m) => sum + m.quantity, 0),
      rejected: 0,
      otr: outStocks
        .filter((s) => (s.location as any)?.tipe === 'otr')
        .reduce((sum, s) => sum + s.quantity, 0),
    }
  })
}

export async function recordInventoryMovement(movement: {
  location_id: string
  product_id: string
  type: 'in' | 'out' | 'sale' | 'waste' | 'transfer'
  quantity: number
}) {
  const { error: moveError } = await supabase.from('inventory_movements').insert(movement)
  if (moveError) { console.error('Error recording movement:', moveError); return false }

  const mod =
    movement.type === 'in' || movement.type === 'transfer'
      ? movement.quantity
      : -movement.quantity

  const { error: stockError } = await supabase.rpc('update_stock_quantity', {
    p_location_id: movement.location_id,
    p_product_id: movement.product_id,
    p_quantity_change: mod,
  })
  if (stockError) { console.error('Error updating base stock:', stockError); return false }
  return true
}

// ─── Channel Prices ──────────────────────────────────────────

export async function getOutletChannelPrices(outletId: string): Promise<OutletChannelPrice[]> {
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

export async function upsertOutletChannelPrice(
  priceData: Omit<OutletChannelPrice, 'id' | 'created_at' | 'updated_at'>
) {
  const { data: existing } = await supabase
    .from('outlet_channel_prices')
    .select('id')
    .eq('outlet_id', priceData.outlet_id)
    .eq('product_id', priceData.product_id)
    .eq('channel', priceData.channel)
    .single()

  let result
  if (existing) {
    result = await supabase
      .from('outlet_channel_prices')
      .update({ harga_jual: priceData.harga_jual, is_active: priceData.is_active })
      .eq('id', existing.id)
  } else {
    result = await supabase.from('outlet_channel_prices').insert(priceData)
  }

  if (result.error) { console.error('Error upserting outlet price:', result.error); return false }
  return true
}

export async function getChannelPrices(
  outletId: string,
  channel: ChannelType
): Promise<OutletChannelPrice[]> {
  if (!outletId) return []

  const { data, error } = await supabase
    .from('outlet_channel_prices')
    .select('*')
    .eq('outlet_id', outletId)
    .eq('channel', channel)

  if (error) {
    console.error('Error fetching channel prices:', JSON.stringify(error, null, 2))
    return []
  }
  
  // Filter is_active di sisi client agar aman jika kolom belum ada di semua baris
  return (data || []).filter((p: any) => p.is_active !== false)
}

// ─── Ambil semua harga kanal untuk outlet (1 query, efisien) ─
export async function getAllChannelPricesForOutlet(
  outletId: string
): Promise<OutletChannelPrice[]> {
  if (!outletId) return []
  const { data, error } = await supabase
    .from('outlet_channel_prices')
    .select('*')
    .eq('outlet_id', outletId)
  if (error) {
    console.error('Error fetching all channel prices:', error)
    return []
  }
  return (data as OutletChannelPrice[]) ?? []
}

// ─── Upsert banyak harga kanal sekaligus (bulk) ───────────────
export async function upsertManyChannelPrices(
  prices: Omit<OutletChannelPrice, 'id' | 'created_at' | 'updated_at'>[]
): Promise<boolean> {
  if (prices.length === 0) return true
  const { error } = await supabase
    .from('outlet_channel_prices')
    .upsert(prices, { onConflict: 'outlet_id,product_id,channel' })
  if (error) {
    console.error('Error bulk upsert channel prices:', error)
    return false
  }
  return true
}

