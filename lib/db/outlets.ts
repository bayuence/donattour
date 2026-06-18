import { supabase } from '../supabase'
import type {
  Outlet,
  ReceiptSettings,
  OutletProductionCost,
} from '../types'
import { getNowWIB } from '../utils/timezone' // ✅ WIB

function createAuthHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (typeof window === 'undefined') return headers

  try {
    const storedUser = localStorage.getItem('donutshop_user')
    if (!storedUser) return headers

    const user = JSON.parse(storedUser)
    if (user?.id) headers['x-user-id'] = String(user.id)
    if (user?.role) headers['x-user-role'] = String(user.role)
    if (user?.outlet_id) headers['x-outlet-id'] = String(user.outlet_id)
  } catch {
    // Ignore malformed localStorage data
  }

  return headers
}

// ─── Outlets ─────────────────────────────────────────────────

export async function getOutlets(): Promise<Outlet[]> {
  const { data, error } = await supabase
    .from('outlets')
    .select('*')
    .order('nama')

  if (error) {
    console.error('Error fetching outlets:', error)
    return []
  }
  return data ?? []
}

export async function getActiveOutlets(): Promise<Outlet[]> {
  const { data, error } = await supabase
    .from('outlets')
    .select('*')
    .eq('status', 'aktif')
    .order('nama')

  if (error) {
    console.error('Error fetching active outlets:', error)
    return []
  }
  return data ?? []
}

export async function createOutlet(data: Omit<Outlet, 'id' | 'status'>): Promise<Outlet | null> {
  const prefix = data.nama.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'O')
  const kode = `OUT-${prefix}-${Date.now().toString().slice(-4)}`

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
  const { data } = await supabase.from('outlets').select('status').eq('id', id).single()
  if (!data) return false

  const newStatus = data.status === 'aktif' ? 'tutup' : 'aktif'
  const { error } = await supabase.from('outlets').update({ status: newStatus }).eq('id', id)
  return !error
}

// ─── Receipt Settings ────────────────────────────────────────

export async function getReceiptSettings(outletId: string): Promise<ReceiptSettings | null> {
  try {
    const response = await fetch(
      `/api/receipt-settings?outlet_id=${encodeURIComponent(outletId)}`,
      { cache: 'no-store', headers: createAuthHeaders() }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error fetching receipt settings:', response.status, errorText)
      return null
    }

    const result = await response.json()
    return result?.data ?? null
  } catch (err) {
    console.error('Error fetching receipt settings:', err)
    return null
  }
}

export async function updateReceiptSettings(
  outletId: string,
  settings: Partial<ReceiptSettings>
): Promise<boolean> {
  try {
    const response = await fetch('/api/receipt-settings', {
      method: 'PUT',
      headers: createAuthHeaders(),
      cache: 'no-store',
      body: JSON.stringify({ outlet_id: outletId, settings }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error updating receipt settings:', response.status, errorText)
      return false
    }

    const result = await response.json()
    return result?.success === true
  } catch (err) {
    console.error('Error updating receipt settings:', err)
    return false
  }
}

// ─── Outlet Production Cost ──────────────────────────────────

export async function getOutletProductionCost(outletId: string): Promise<OutletProductionCost | null> {
  const { data, error } = await supabase
    .from('outlet_production_costs')
    .select('*')
    .eq('outlet_id', outletId)
    .maybeSingle()

  if (error) { console.error('Error fetching production cost:', error); return null }
  return data ?? null
}

export async function upsertOutletProductionCost(cost: Partial<OutletProductionCost>): Promise<boolean> {
  if (!cost.outlet_id) {
    console.error('upsertOutletProductionCost: outlet_id is required')
    return false
  }

  try {
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
          harga_jual_polos_standar: cost.harga_jual_polos_standar,
          harga_jual_polos_mini: cost.harga_jual_polos_mini,
          updated_at: getNowWIB(), // ✅ WIB
        })
        .eq('outlet_id', cost.outlet_id)
      if (error) { console.error('Error updating production cost:', error); return false }
    } else {
      const { error } = await supabase
        .from('outlet_production_costs')
        .insert({
          outlet_id: cost.outlet_id,
          cost_polos_standar: cost.cost_polos_standar ?? 1500,
          cost_polos_mini: cost.cost_polos_mini ?? 800,
          harga_jual_polos_standar: cost.harga_jual_polos_standar ?? 0,
          harga_jual_polos_mini: cost.harga_jual_polos_mini ?? 0,
        })
      if (error) { console.error('Error inserting production cost:', error); return false }
    }
    return true
  } catch (err) {
    console.error('Error upserting production cost:', err)
    return false
  }
}
