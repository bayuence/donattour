import { supabase } from '../supabase'
import type {
  OtrPaket,
  OtrSession,
  OtrTransaksi,
  OtrTransaksiItem,
} from '../types'

// ─── OTR Paket ───────────────────────────────────────────────

export async function getOtrPaket(): Promise<OtrPaket[]> {
  const { data, error } = await supabase
    .from('otr_paket')
    .select('*')
    .eq('is_active', true)
    .order('nama')

  if (error) {
    console.error('Error fetching OTR paket:', JSON.stringify(error, null, 2))
    return []
  }
  return data ?? []
}

export async function getAllOtrPaket(): Promise<OtrPaket[]> {
  const { data, error } = await supabase
    .from('otr_paket')
    .select('*')
    .order('nama')

  if (error) {
    console.error('Error fetching all OTR paket:', JSON.stringify(error, null, 2))
    return []
  }
  return data ?? []
}

export async function createOtrPaket(data: Omit<OtrPaket, 'id'>): Promise<OtrPaket | null> {
  const { data: newPaket, error } = await supabase
    .from('otr_paket')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating OTR paket:', JSON.stringify(error, null, 2))
    return null
  }
  return newPaket
}

export async function updateOtrPaket(id: string, data: Partial<OtrPaket>): Promise<boolean> {
  const { error } = await supabase
    .from('otr_paket')
    .update(data)
    .eq('id', id)

  if (error) {
    console.error('Error updating OTR paket:', JSON.stringify(error, null, 2))
    return false
  }
  return true
}

export async function deleteOtrPaket(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('otr_paket')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting OTR paket:', JSON.stringify(error, null, 2))
    return false
  }
  return true
}

// ─── OTR Mobil ───────────────────────────────────────────────

export async function getOtrMobil() {
  const { data, error } = await supabase
    .from('otr_mobil')
    .select('*')
    .order('nopol')

  if (error) {
    console.error('Error fetching OTR mobil:', JSON.stringify(error, null, 2))
    return []
  }
  return data ?? []
}

// ─── OTR Sessions ────────────────────────────────────────────

export async function getOtrSessions(): Promise<OtrSession[]> {
  const { data, error } = await supabase
    .from('otr_sessions')
    .select('*')
    .order('started_at', { ascending: false })

  if (error) {
    console.error('Error fetching OTR sessions:', JSON.stringify(error, null, 2))
    return []
  }
  return data ?? []
}

export async function getActiveOtrSession(karyawanId: string): Promise<OtrSession | null> {
  const { data, error } = await supabase
    .from('otr_sessions')
    .select('*')
    .eq('karyawan_id', karyawanId)
    .eq('status', 'aktif')
    .maybeSingle()

  if (error) {
    console.error('Error fetching active OTR session:', JSON.stringify(error, null, 2))
    return null
  }
  return data ?? null
}

export async function startOtrSession(data: {
  karyawan_id: string
  karyawan_nama: string
  nopol_mobil: string
  lokasi_awal: string
  stok_bawa: { paket_id: string; jumlah: number }[]
}): Promise<OtrSession | null> {
  const { data: session, error } = await supabase
    .from('otr_sessions')
    .insert({
      karyawan_id: data.karyawan_id,
      karyawan_nama: data.karyawan_nama,
      nopol_mobil: data.nopol_mobil,
      lokasi_awal: data.lokasi_awal,
      stok_bawa: data.stok_bawa,
      started_at: new Date().toISOString(),
      status: 'aktif',
      total_penjualan: 0,
    })
    .select()
    .single()

  if (error) {
    console.error('Error starting OTR session:', JSON.stringify(error, null, 2))
    return null
  }
  return session
}

export async function endOtrSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase
    .from('otr_sessions')
    .update({
      status: 'selesai',
      ended_at: new Date().toISOString(),
    })
    .eq('id', sessionId)

  if (error) {
    console.error('Error ending OTR session:', JSON.stringify(error, null, 2))
    return false
  }
  return true
}

// ─── OTR Transaksi ───────────────────────────────────────────

export async function createOtrTransaksi(data: {
  session_id: string
  items: OtrTransaksiItem[]
  metode_bayar: 'tunai' | 'transfer'
}): Promise<OtrTransaksi | null> {
  const total = data.items.reduce((s, i) => s + i.subtotal, 0)

  const { data: trx, error } = await supabase
    .from('otr_transaksi')
    .insert({
      session_id: data.session_id,
      nomor_transaksi: `OTR-${Date.now()}`,
      items: data.items,
      total,
      metode_bayar: data.metode_bayar,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating OTR transaksi:', JSON.stringify(error, null, 2))
    return null
  }

  // Update total penjualan di session
  await supabase.rpc('update_otr_session_total', {
    p_session_id: data.session_id,
    p_amount: total,
  }).then(({ error: rpcError }) => {
    if (rpcError) {
      // Fallback: update manual jika RPC belum ada
      supabase
        .from('otr_sessions')
        .select('total_penjualan')
        .eq('id', data.session_id)
        .single()
        .then(({ data: ses }) => {
          if (ses) {
            supabase
              .from('otr_sessions')
              .update({ total_penjualan: (ses.total_penjualan || 0) + total })
              .eq('id', data.session_id)
          }
        })
    }
  })

  return trx
}

export async function getOtrTransaksiBySession(sessionId: string): Promise<OtrTransaksi[]> {
  const { data, error } = await supabase
    .from('otr_transaksi')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching OTR transaksi by session:', JSON.stringify(error, null, 2))
    return []
  }
  return data ?? []
}

export async function getAllOtrTransaksi(): Promise<OtrTransaksi[]> {
  const { data, error } = await supabase
    .from('otr_transaksi')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all OTR transaksi:', JSON.stringify(error, null, 2))
    return []
  }
  return data ?? []
}
