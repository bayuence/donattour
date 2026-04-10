import { supabase } from '../supabase'
import type { KasirMenu } from '../types'

// ─── Ambil Semua Menu Kasir Milik Sebuah Outlet ───────────────

export async function getKasirMenus(outletId: string): Promise<KasirMenu[]> {
  const { data, error } = await supabase
    .from('outlet_kasir_menus')
    .select('*')
    .eq('outlet_id', outletId)
    .order('urutan', { ascending: true })

  if (error) {
    console.error('Error mengambil kasir menu:', error)
    return []
  }
  return (data as KasirMenu[]) ?? []
}

// ─── Ambil Hanya Menu yang Aktif ─────────────────────────────

export async function getActiveKasirMenus(outletId: string): Promise<KasirMenu[]> {
  const menus = await getKasirMenus(outletId)
  return menus.filter(m => m.is_active)
}

// ─── Tambah Menu Kasir Baru ───────────────────────────────────

export async function addKasirMenu(
  outletId: string,
  payload: { nama: string; slug: string; color: string; urutan?: number }
): Promise<{ success: boolean; error?: string; data?: KasirMenu }> {
  const { data, error } = await supabase
    .from('outlet_kasir_menus')
    .insert({
      outlet_id: outletId,
      nama: payload.nama,
      slug: payload.slug.toLowerCase().replace(/\s+/g, '_'),
      color: payload.color,
      urutan: payload.urutan ?? 99,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error menambah kasir menu:', error)
    return { success: false, error: error.message }
  }
  return { success: true, data: data as KasirMenu }
}

// ─── Update Nama/Warna/Urutan ─────────────────────────────────

export async function updateKasirMenu(
  menuId: string,
  payload: Partial<Pick<KasirMenu, 'nama' | 'color' | 'urutan' | 'is_active'>>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('outlet_kasir_menus')
    .update(payload)
    .eq('id', menuId)

  if (error) {
    console.error('Error update kasir menu:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}

// ─── Toggle Aktif/Nonaktif Menu ───────────────────────────────

export async function toggleKasirMenu(
  menuId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  return updateKasirMenu(menuId, { is_active: isActive })
}

// ─── Hapus Menu Kasir ─────────────────────────────────────────

export async function deleteKasirMenu(
  menuId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('outlet_kasir_menus')
    .delete()
    .eq('id', menuId)

  if (error) {
    console.error('Error menghapus kasir menu:', error)
    return { success: false, error: error.message }
  }
  return { success: true }
}
