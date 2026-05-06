// ============================================================================
// ALERT TRIGGERS
// ============================================================================
// File: lib/services/alert-triggers.ts
// Description: Helper functions to trigger alerts from business logic
// Version: 2.0
// Date: 2026-05-05
// Updated: Support both client and server-side Supabase
// ============================================================================

import { createClient as createClientSide } from '@/lib/supabase/client';
import { createClient as createServerSide } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// TYPES
// ============================================================================

type AlertSeverity = 'info' | 'warning' | 'critical';

interface CreateAlertParams {
  outlet_id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get Supabase client (server-side by default)
 */
async function getSupabaseClient(): Promise<SupabaseClient> {
  return await createServerSide();
}

/**
 * Create alert in database
 */
async function createAlert(
  supabase: SupabaseClient,
  params: CreateAlertParams
): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .insert({
      outlet_id: params.outlet_id,
      type: params.type,
      severity: params.severity,
      title: params.title,
      message: params.message,
      metadata: params.metadata || {},
      is_read: false,
    });
  
  if (error) {
    console.error('Failed to create alert:', error);
  }
}

/**
 * Check if alert already exists (to avoid duplicates)
 */
async function alertExists(
  supabase: SupabaseClient,
  outlet_id: string,
  type: string,
  date: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('alerts')
    .select('id')
    .eq('outlet_id', outlet_id)
    .eq('type', type)
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`)
    .limit(1);
  
  if (error) {
    console.error('Failed to check alert existence:', error);
    return false;
  }
  
  return (data?.length || 0) > 0;
}

// ============================================================================
// ALERT TRIGGERS
// ============================================================================

/**
 * Trigger stock low alert when inventory < 20% of daily production
 * 
 * @param outlet_id - Outlet ID
 * @param ukuran - Donut size (standar/mini)
 * @param current_stock - Current stock quantity
 * @param daily_production - Daily production quantity
 * @param date - Date (YYYY-MM-DD)
 */
export async function triggerStockLowAlert(
  outlet_id: string,
  ukuran: string,
  current_stock: number,
  daily_production: number,
  date: string
): Promise<void> {
  const supabase = await getSupabaseClient();
  
  // Calculate percentage
  const percentage = (current_stock / daily_production) * 100;
  
  // Only trigger if < 20%
  if (percentage >= 20) {
    return;
  }
  
  // Check if alert already exists today
  const exists = await alertExists(supabase, outlet_id, 'stock_low', date);
  if (exists) {
    return;
  }
  
  // Create alert
  await createAlert(supabase, {
    outlet_id,
    type: 'stock_low',
    severity: 'warning',
    title: '⚠️ Stok Non-Topping Menipis',
    message: `Stok donat ${ukuran} tinggal ${percentage.toFixed(1)}% dari produksi hari ini (${current_stock} dari ${daily_production} pcs). Segera produksi tambahan!`,
    metadata: {
      ukuran,
      current_stock,
      daily_production,
      percentage: percentage.toFixed(1),
      date,
    },
  });
}

/**
 * Trigger waste rate high alert when waste > 15%
 * 
 * @param outlet_id - Outlet ID
 * @param waste_rate - Waste rate percentage
 * @param total_waste_qty - Total waste quantity
 * @param total_production - Total production quantity
 * @param date - Date (YYYY-MM-DD)
 */
export async function triggerWasteRateAlert(
  outlet_id: string,
  waste_rate: number,
  total_waste_qty: number,
  total_production: number,
  date: string
): Promise<void> {
  const supabase = await getSupabaseClient();
  
  // Only trigger if > 15%
  if (waste_rate <= 15) {
    return;
  }
  
  // Check if alert already exists today
  const exists = await alertExists(supabase, outlet_id, 'waste_high', date);
  if (exists) {
    return;
  }
  
  // Determine severity
  let severity: AlertSeverity = 'warning';
  if (waste_rate > 25) {
    severity = 'critical';
  }
  
  // Create alert
  await createAlert(supabase, {
    outlet_id,
    type: 'waste_high',
    severity,
    title: severity === 'critical' ? '🔴 Waste Rate Sangat Tinggi!' : '⚠️ Waste Rate Tinggi',
    message: `Waste rate hari ini ${waste_rate.toFixed(1)}% (${total_waste_qty} dari ${total_production} pcs). Target maksimal 15%. Perlu evaluasi proses produksi!`,
    metadata: {
      waste_rate: waste_rate.toFixed(1),
      total_waste_qty,
      total_production,
      date,
    },
  });
}

/**
 * Trigger no production alert (should be called at 08:00)
 * 
 * @param outlet_id - Outlet ID
 * @param date - Date (YYYY-MM-DD)
 */
export async function triggerNoProductionAlert(
  outlet_id: string,
  date: string
): Promise<void> {
  const supabase = await getSupabaseClient();
  
  // Check if alert already exists today
  const exists = await alertExists(supabase, outlet_id, 'no_production', date);
  if (exists) {
    return;
  }
  
  // Create alert
  await createAlert(supabase, {
    outlet_id,
    type: 'no_production',
    severity: 'warning',
    title: '⚠️ Belum Ada Input Produksi',
    message: `Belum ada input produksi untuk hari ini (${date}). Kasir tidak bisa operasional tanpa input produksi!`,
    metadata: {
      date,
    },
  });
}

/**
 * Trigger no closing alert (should be called at 21:00)
 * 
 * @param outlet_id - Outlet ID
 * @param date - Date (YYYY-MM-DD)
 */
export async function triggerNoClosingAlert(
  outlet_id: string,
  date: string
): Promise<void> {
  const supabase = await getSupabaseClient();
  
  // Check if alert already exists today
  const exists = await alertExists(supabase, outlet_id, 'no_closing', date);
  if (exists) {
    return;
  }
  
  // Create alert
  await createAlert(supabase, {
    outlet_id,
    type: 'no_closing',
    severity: 'warning',
    title: '⚠️ Belum Ada Closing Harian',
    message: `Belum ada closing untuk hari ini (${date}). Segera lakukan closing untuk menghitung rugi harian!`,
    metadata: {
      date,
    },
  });
}

// ============================================================================
// BATCH TRIGGERS (for scheduled jobs)
// ============================================================================

/**
 * Check and trigger stock low alerts for all outlets
 */
export async function checkAllStockLowAlerts(date: string): Promise<void> {
  const supabase = await getSupabaseClient();
  
  // Get all outlets
  const { data: outlets, error: outletsError } = await supabase
    .from('outlets')
    .select('id');
  
  if (outletsError || !outlets) {
    console.error('Failed to fetch outlets:', outletsError);
    return;
  }
  
  // Check each outlet
  for (const outlet of outlets) {
    // Get production for today
    const { data: productions, error: prodError } = await supabase
      .from('production_daily')
      .select('ukuran, success_qty')
      .eq('outlet_id', outlet.id)
      .eq('tanggal', date);
    
    if (prodError || !productions) {
      continue;
    }
    
    // Check stock for each size
    for (const production of productions) {
      const { data: stock, error: stockError } = await supabase
        .from('inventory_non_topping')
        .select('qty_available')
        .eq('outlet_id', outlet.id)
        .eq('ukuran', production.ukuran)
        .eq('production_date', date)
        .eq('status', 'fresh')
        .single();
      
      if (stockError || !stock) {
        continue;
      }
      
      // Trigger alert if needed
      await triggerStockLowAlert(
        outlet.id,
        production.ukuran,
        stock.qty_available,
        production.success_qty,
        date
      );
    }
  }
}

/**
 * Check and trigger waste rate alerts for all outlets
 */
export async function checkAllWasteRateAlerts(date: string): Promise<void> {
  const supabase = await getSupabaseClient();
  
  // Get all outlets with closing today
  const { data: closings, error: closingsError } = await supabase
    .from('daily_closing')
    .select(`
      outlet_id,
      outlets!inner(id)
    `)
    .eq('tanggal', date);
  
  if (closingsError || !closings) {
    console.error('Failed to fetch closings:', closingsError);
    return;
  }
  
  // Check each outlet
  for (const closing of closings) {
    // Get production totals
    const { data: productions, error: prodError } = await supabase
      .from('production_daily')
      .select('target_qty, success_qty, waste_qty')
      .eq('outlet_id', closing.outlet_id)
      .eq('tanggal', date);
    
    if (prodError || !productions || productions.length === 0) {
      continue;
    }
    
    // Calculate totals
    const total_production = productions.reduce((sum, p) => sum + p.target_qty, 0);
    const total_waste = productions.reduce((sum, p) => sum + p.waste_qty, 0);
    const waste_rate = (total_waste / total_production) * 100;
    
    // Trigger alert if needed
    await triggerWasteRateAlert(
      closing.outlet_id,
      waste_rate,
      total_waste,
      total_production,
      date
    );
  }
}
