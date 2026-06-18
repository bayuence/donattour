/**
 * lib/db/outlet-channels.ts
 *
 * ORM layer untuk manajemen channel penjualan per outlet.
 */

import { supabase } from '@/lib/supabase';

/* ── Types ──────────────────────────────────────────────────── */
export interface OutletChannel {
  id: string;
  outlet_id: string;
  channel_key: string;
  channel_name: string;
  icon_url?: string | null;
  is_active: boolean;
  store_url?: string | null;
  store_name?: string | null;
  commission_pct?: number | null;
  notes?: string | null;
  sort_order?: number;
  created_at: string;
  updated_at: string;
}

export type OutletChannelInsert = Omit<OutletChannel, 'id' | 'created_at' | 'updated_at'>;
export type OutletChannelUpdate = Partial<Omit<OutletChannelInsert, 'outlet_id' | 'channel_key'>>;

/* ── READ ────────────────────────────────────────────────────── */

export async function getOutletChannels(outletId: string): Promise<OutletChannel[]> {
  const { data, error } = await supabase
    .from('outlet_channels')
    .select('*')
    .eq('outlet_id', outletId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[getOutletChannels] error:', error.message);
    return [];
  }
  return data ?? [];
}

export async function getActiveOutletChannels(outletId: string): Promise<OutletChannel[]> {
  const { data, error } = await supabase
    .from('outlet_channels')
    .select('*')
    .eq('outlet_id', outletId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[getActiveOutletChannels] error:', error.message);
    return [];
  }
  return data ?? [];
}

/* ── CREATE ──────────────────────────────────────────────────── */

export async function addOutletChannel(
  payload: OutletChannelInsert,
): Promise<OutletChannel | null> {
  const { data, error } = await supabase
    .from('outlet_channels')
    .insert({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('[addOutletChannel] error:', error.message);
    return null;
  }
  return data;
}

/* ── UPDATE ──────────────────────────────────────────────────── */

export async function updateOutletChannel(
  id: string,
  updates: OutletChannelUpdate,
): Promise<OutletChannel | null> {
  const { data, error } = await supabase
    .from('outlet_channels')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[updateOutletChannel] error:', error.message);
    return null;
  }
  return data;
}

export async function toggleOutletChannel(id: string, isActive: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('outlet_channels')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[toggleOutletChannel] error:', error.message);
    return false;
  }
  return true;
}

export async function reorderOutletChannels(
  items: { id: string; sort_order: number }[],
): Promise<boolean> {
  const now = new Date().toISOString();
  const promises = items.map(({ id, sort_order }) =>
    supabase
      .from('outlet_channels')
      .update({ sort_order, updated_at: now })
      .eq('id', id),
  );
  const results = await Promise.all(promises);
  const anyError = results.some(r => r.error);
  if (anyError) console.error('[reorderOutletChannels] some updates failed');
  return !anyError;
}

/* ── DELETE ──────────────────────────────────────────────────── */

export async function deleteOutletChannel(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('outlet_channels')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteOutletChannel] error:', error.message);
    return false;
  }
  return true;
}
