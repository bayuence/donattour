// ============================================================================
// ALERT SERVICE
// ============================================================================
// File: lib/services/alert-service.ts
// Description: Service for checking business conditions and generating alerts
// Version: 1.0
// Date: 2026-05-06
// ============================================================================

import { createClient } from '@/lib/supabase/server';
import { getTodayWIB } from '@/lib/utils/timezone'; // ✅ WIB

// ============================================================================
// TYPES
// ============================================================================

export type AlertType = 
  | 'stock_low'
  | 'waste_high'
  | 'no_production'
  | 'no_closing'
  | 'margin_low'
  | 'topping_error_high';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface AlertData {
  outlet_id: string;
  user_id?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// ALERT THRESHOLDS
// ============================================================================

const THRESHOLDS = {
  STOCK_LOW_PERCENTAGE: 20, // Alert when stock < 20% of daily production
  WASTE_RATE_HIGH: 15, // Alert when waste rate > 15%
  MARGIN_LOW: 30, // Alert when margin < 30%
  PRODUCTION_TIME: '08:00', // Alert if no production by 08:00
  CLOSING_TIME: '21:00', // Alert if no closing by 21:00
  TOPPING_ERROR_COUNT: 5, // Alert if topping errors > 5 per day
};

// ============================================================================
// ALERT CREATION
// ============================================================================

/**
 * Create an alert in the database
 */
async function createAlert(alertData: AlertData): Promise<void> {
  const supabase = await createClient();
  
  // Check if similar alert already exists (within last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data: existingAlert } = await supabase
    .from('alerts')
    .select('id')
    .eq('outlet_id', alertData.outlet_id)
    .eq('type', alertData.type)
    .gte('created_at', oneHourAgo)
    .single();
  
  // Don't create duplicate alert if one exists within last hour
  if (existingAlert) {
    console.log(`Alert already exists for ${alertData.type} at outlet ${alertData.outlet_id}`);
    return;
  }
  
  // Create new alert
  const { error } = await supabase
    .from('alerts')
    .insert({
      outlet_id: alertData.outlet_id,
      user_id: alertData.user_id || null,
      type: alertData.type,
      severity: alertData.severity,
      title: alertData.title,
      message: alertData.message,
      metadata: alertData.metadata || null,
    });
  
  if (error) {
    console.error('Error creating alert:', error);
    throw error;
  }
  
  console.log(`Alert created: ${alertData.type} for outlet ${alertData.outlet_id}`);
}

// ============================================================================
// ALERT CHECKS
// ============================================================================

/**
 * Check if stock is running low
 * Trigger: Stock < 20% of daily production
 */
export async function checkStockLow(outlet_id: string, date: string): Promise<void> {
  const supabase = await createClient();
  
  // Get today's production
  const { data: production } = await supabase
    .from('production_daily')
    .select('ukuran, success_qty')
    .eq('outlet_id', outlet_id)
    .eq('tanggal', date);
  
  if (!production || production.length === 0) {
    return; // No production data, skip check
  }
  
  // Get current inventory
  const { data: inventory } = await supabase
    .from('inventory_non_topping')
    .select('ukuran, qty_available')
    .eq('outlet_id', outlet_id)
    .eq('tanggal', date);
  
  if (!inventory || inventory.length === 0) {
    return; // No inventory data, skip check
  }
  
  // Check each size
  for (const prod of production) {
    const inv = inventory.find(i => i.ukuran === prod.ukuran);
    if (!inv) continue;
    
    const percentage = (inv.qty_available / prod.success_qty) * 100;
    
    if (percentage < THRESHOLDS.STOCK_LOW_PERCENTAGE) {
      await createAlert({
        outlet_id,
        type: 'stock_low',
        severity: percentage < 10 ? 'critical' : 'warning',
        title: `Stok ${prod.ukuran} Menipis!`,
        message: `Stok donat non-topping ${prod.ukuran} tinggal ${percentage.toFixed(1)}% (${inv.qty_available} dari ${prod.success_qty} pcs). Segera tambah produksi atau kurangi penjualan.`,
        metadata: {
          ukuran: prod.ukuran,
          current_stock: inv.qty_available,
          production_qty: prod.success_qty,
          percentage: percentage.toFixed(1),
        },
      });
    }
  }
}

/**
 * Check if waste rate is high
 * Trigger: Waste rate > 15%
 */
export async function checkWasteRateHigh(outlet_id: string, date: string): Promise<void> {
  const supabase = await createClient();
  
  // Get today's production
  const { data: production } = await supabase
    .from('production_daily')
    .select('target_qty, success_qty, waste_qty')
    .eq('outlet_id', outlet_id)
    .eq('tanggal', date);
  
  if (!production || production.length === 0) {
    return; // No production data, skip check
  }
  
  // Calculate total waste rate
  const totalTarget = production.reduce((sum, p) => sum + p.target_qty, 0);
  const totalWaste = production.reduce((sum, p) => sum + p.waste_qty, 0);
  const wasteRate = (totalWaste / totalTarget) * 100;
  
  if (wasteRate > THRESHOLDS.WASTE_RATE_HIGH) {
    await createAlert({
      outlet_id,
      type: 'waste_high',
      severity: wasteRate > 20 ? 'critical' : 'warning',
      title: '🚨 Waste Rate Tinggi!',
      message: `Waste rate hari ini mencapai ${wasteRate.toFixed(1)}%, melebihi target ${THRESHOLDS.WASTE_RATE_HIGH}%. Total waste: ${totalWaste} pcs dari ${totalTarget} pcs target. Segera review proses produksi!`,
      metadata: {
        waste_rate: wasteRate.toFixed(1),
        target: THRESHOLDS.WASTE_RATE_HIGH,
        waste_qty: totalWaste,
        target_qty: totalTarget,
      },
    });
  }
}

/**
 * Check if no production input by specified time
 * Trigger: No production input by 08:00
 */
export async function checkNoProduction(outlet_id: string, date: string): Promise<void> {
  const supabase = await createClient();
  
  // Check current time
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  // Only check after production time threshold
  if (currentTime < THRESHOLDS.PRODUCTION_TIME) {
    return;
  }
  
  // Check if production exists for today
  const { data: production } = await supabase
    .from('production_daily')
    .select('id')
    .eq('outlet_id', outlet_id)
    .eq('tanggal', date)
    .single();
  
  if (!production) {
    await createAlert({
      outlet_id,
      type: 'no_production',
      severity: 'critical',
      title: '⚠️ Belum Ada Input Produksi!',
      message: `Sudah lewat jam ${THRESHOLDS.PRODUCTION_TIME} tapi belum ada input produksi untuk hari ini. Kasir tidak bisa melakukan penjualan tanpa input produksi. Segera input produksi!`,
      metadata: {
        expected_time: THRESHOLDS.PRODUCTION_TIME,
        current_time: currentTime,
      },
    });
  }
}

/**
 * Check if no closing by specified time
 * Trigger: No closing by 21:00
 */
export async function checkNoClosing(outlet_id: string, date: string): Promise<void> {
  const supabase = await createClient();
  
  // Check current time
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
  
  // Only check after closing time threshold
  if (currentTime < THRESHOLDS.CLOSING_TIME) {
    return;
  }
  
  // Check if closing exists for today
  const { data: closing } = await supabase
    .from('daily_closing')
    .select('id')
    .eq('outlet_id', outlet_id)
    .eq('tanggal', date)
    .single();
  
  if (!closing) {
    await createAlert({
      outlet_id,
      type: 'no_closing',
      severity: 'warning',
      title: '📋 Belum Ada Closing Harian!',
      message: `Sudah lewat jam ${THRESHOLDS.CLOSING_TIME} tapi belum ada closing harian untuk hari ini. Segera lakukan closing untuk melihat laporan rugi lengkap!`,
      metadata: {
        expected_time: THRESHOLDS.CLOSING_TIME,
        current_time: currentTime,
      },
    });
  }
}

/**
 * Check if margin is low
 * Trigger: Margin < 30%
 */
export async function checkMarginLow(outlet_id: string, date: string): Promise<void> {
  const supabase = await createClient();
  
  // Get today's orders
  const { data: orders } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('outlet_id', outlet_id)
    .eq('tanggal', date)
    .eq('status', 'completed');
  
  if (!orders || orders.length === 0) {
    return; // No sales data, skip check
  }
  
  // Calculate total revenue
  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  
  // Get total HPP sold (from order_items)
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('orders!inner(outlet_id, tanggal, status), product_id, quantity, products!inner(harga_pokok_penjualan)')
    .eq('orders.outlet_id', outlet_id)
    .eq('orders.tanggal', date)
    .eq('orders.status', 'completed');
  
  if (!orderItems || orderItems.length === 0) {
    return;
  }
  
  // Calculate total HPP
  const totalHPP = orderItems.reduce((sum, item) => {
    return sum + (item.quantity * (item.products as any).harga_pokok_penjualan);
  }, 0);
  
  // Calculate margin
  const grossProfit = totalRevenue - totalHPP;
  const margin = (grossProfit / totalRevenue) * 100;
  
  if (margin < THRESHOLDS.MARGIN_LOW) {
    await createAlert({
      outlet_id,
      type: 'margin_low',
      severity: margin < 20 ? 'critical' : 'warning',
      title: '📉 Margin Rendah!',
      message: `Margin hari ini hanya ${margin.toFixed(1)}%, di bawah target ${THRESHOLDS.MARGIN_LOW}%. Revenue: Rp ${totalRevenue.toLocaleString('id-ID')}, HPP: Rp ${totalHPP.toLocaleString('id-ID')}. Review pricing atau kurangi biaya produksi!`,
      metadata: {
        margin: margin.toFixed(1),
        target: THRESHOLDS.MARGIN_LOW,
        revenue: totalRevenue,
        hpp: totalHPP,
        gross_profit: grossProfit,
      },
    });
  }
}

/**
 * Check if topping errors are high
 * Trigger: Topping errors > 5 per day
 */
export async function checkToppingErrorsHigh(outlet_id: string, date: string): Promise<void> {
  const supabase = await createClient();
  
  // Get today's topping errors
  const { data: errors, count } = await supabase
    .from('topping_errors')
    .select('*', { count: 'exact' })
    .eq('outlet_id', outlet_id)
    .gte('reported_at', `${date}T00:00:00`)
    .lte('reported_at', `${date}T23:59:59`);
  
  if (!count || count <= THRESHOLDS.TOPPING_ERROR_COUNT) {
    return; // Below threshold, skip
  }
  
  // Calculate total loss
  const totalLoss = errors?.reduce((sum, e) => sum + e.total_hpp_loss, 0) || 0;
  
  await createAlert({
    outlet_id,
    type: 'topping_error_high',
    severity: count > 10 ? 'critical' : 'warning',
    title: '❌ Kesalahan Topping Tinggi!',
    message: `Hari ini sudah ada ${count} kesalahan topping (target: max ${THRESHOLDS.TOPPING_ERROR_COUNT}). Total rugi: Rp ${totalLoss.toLocaleString('id-ID')}. Perlu training ulang untuk kasir!`,
    metadata: {
      error_count: count,
      target: THRESHOLDS.TOPPING_ERROR_COUNT,
      total_loss: totalLoss,
    },
  });
}

// ============================================================================
// MAIN CHECK FUNCTION
// ============================================================================

/**
 * Run all alert checks for an outlet
 * This should be called periodically (e.g., every hour) or after key events
 */
export async function runAlertChecks(outlet_id: string, date?: string): Promise<void> {
  const checkDate = date || getTodayWIB(); // ✅ WIB bukan UTC
  
  console.log(`Running alert checks for outlet ${outlet_id} on ${checkDate}`);
  
  try {
    // Run all checks in parallel
    await Promise.all([
      checkStockLow(outlet_id, checkDate),
      checkWasteRateHigh(outlet_id, checkDate),
      checkNoProduction(outlet_id, checkDate),
      checkNoClosing(outlet_id, checkDate),
      checkMarginLow(outlet_id, checkDate),
      checkToppingErrorsHigh(outlet_id, checkDate),
    ]);
    
    console.log(`Alert checks completed for outlet ${outlet_id}`);
  } catch (error) {
    console.error(`Error running alert checks for outlet ${outlet_id}:`, error);
    throw error;
  }
}

/**
 * Run alert checks for all active outlets
 */
export async function runAlertChecksForAllOutlets(date?: string): Promise<void> {
  const supabase = await createClient();
  const checkDate = date || getTodayWIB(); // ✅ WIB bukan UTC
  
  console.log(`Running alert checks for all outlets on ${checkDate}`);
  
  // Get all active outlets
  const { data: outlets, error } = await supabase
    .from('outlets')
    .select('id')
    .eq('is_active', true);
  
  if (error) {
    console.error('Error fetching outlets:', error);
    throw error;
  }
  
  if (!outlets || outlets.length === 0) {
    console.log('No active outlets found');
    return;
  }
  
  // Run checks for each outlet
  for (const outlet of outlets) {
    try {
      await runAlertChecks(outlet.id, checkDate);
    } catch (error) {
      console.error(`Error running checks for outlet ${outlet.id}:`, error);
      // Continue with other outlets even if one fails
    }
  }
  
  console.log(`Alert checks completed for ${outlets.length} outlets`);
}
