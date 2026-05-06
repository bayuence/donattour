// ============================================================================
// ALERT CHECKING SERVICE
// ============================================================================
// File: lib/services/alert-checker.ts
// Description: Background service to check conditions and generate alerts
// Version: 1.0
// Date: 2026-05-04
// ============================================================================

import { createClient } from '@/lib/supabase/server';

// ============================================================================
// TYPES
// ============================================================================

export type AlertCheck = {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, any>;
};

export type CheckResult = {
  check_name: string;
  passed: boolean;
  alert_created: boolean;
  alert?: AlertCheck;
  error?: string;
};

// ============================================================================
// ALERT CHECKING FUNCTIONS
// ============================================================================

/**
 * Check if stock is running low (< 20% of daily production)
 * 
 * @param outletId - Outlet ID to check
 * @param date - Date to check (default: today)
 * @returns Check result with alert if needed
 */
export async function checkStockLow(
  outletId: string,
  date: string = new Date().toISOString().split('T')[0]
): Promise<CheckResult> {
  try {
    const supabase = await createClient();

    // Get today's production
    const { data: production, error: prodError } = await supabase
      .from('production_daily')
      .select('success_qty, ukuran')
      .eq('outlet_id', outletId)
      .eq('tanggal', date);

    if (prodError) throw prodError;

    if (!production || production.length === 0) {
      return {
        check_name: 'stock_low',
        passed: true,
        alert_created: false,
      };
    }

    // Calculate total production
    const totalProduction = production.reduce((sum, p) => sum + (p.success_qty || 0), 0);

    // Get current inventory
    const { data: inventory, error: invError } = await supabase
      .from('inventory_non_topping')
      .select('qty_fresh, qty_aging, ukuran')
      .eq('outlet_id', outletId)
      .eq('tanggal', date);

    if (invError) throw invError;

    // Calculate total stock
    const totalStock = (inventory || []).reduce(
      (sum, inv) => sum + (inv.qty_fresh || 0) + (inv.qty_aging || 0),
      0
    );

    // Calculate percentage
    const stockPercentage = totalProduction > 0 ? (totalStock / totalProduction) * 100 : 100;

    // Check if stock is low (< 20%)
    if (stockPercentage < 20) {
      const alert: AlertCheck = {
        type: 'stock_low',
        severity: 'warning',
        title: '⚠️ Stok Non-Topping Menipis',
        message: `Stok donat non-topping tinggal ${stockPercentage.toFixed(1)}% dari produksi hari ini (${totalStock}/${totalProduction} pcs). Segera produksi lebih banyak atau kurangi penjualan.`,
        metadata: {
          current_stock: totalStock,
          production_qty: totalProduction,
          percentage: Math.round(stockPercentage * 100) / 100,
          date,
        },
      };

      return {
        check_name: 'stock_low',
        passed: false,
        alert_created: true,
        alert,
      };
    }

    return {
      check_name: 'stock_low',
      passed: true,
      alert_created: false,
    };
  } catch (error) {
    console.error('Error checking stock low:', error);
    return {
      check_name: 'stock_low',
      passed: true,
      alert_created: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if waste rate is high (> 15%)
 * 
 * @param outletId - Outlet ID to check
 * @param date - Date to check (default: today)
 * @returns Check result with alert if needed
 */
export async function checkWasteHigh(
  outletId: string,
  date: string = new Date().toISOString().split('T')[0]
): Promise<CheckResult> {
  try {
    const supabase = await createClient();

    // Get today's production
    const { data: production, error: prodError } = await supabase
      .from('production_daily')
      .select('target_qty, waste_qty, ukuran')
      .eq('outlet_id', outletId)
      .eq('tanggal', date);

    if (prodError) throw prodError;

    if (!production || production.length === 0) {
      return {
        check_name: 'waste_high',
        passed: true,
        alert_created: false,
      };
    }

    // Calculate totals
    const totalTarget = production.reduce((sum, p) => sum + (p.target_qty || 0), 0);
    const totalWaste = production.reduce((sum, p) => sum + (p.waste_qty || 0), 0);

    // Calculate waste rate
    const wasteRate = totalTarget > 0 ? (totalWaste / totalTarget) * 100 : 0;

    // Check if waste rate is high (> 15%)
    if (wasteRate > 15) {
      const alert: AlertCheck = {
        type: 'waste_high',
        severity: 'critical',
        title: '🚨 Waste Rate Tinggi!',
        message: `Waste rate hari ini mencapai ${wasteRate.toFixed(1)}%, melebihi target 15%. Total waste: ${totalWaste} dari ${totalTarget} pcs target. Segera evaluasi proses produksi!`,
        metadata: {
          waste_rate: Math.round(wasteRate * 100) / 100,
          target_rate: 15,
          waste_qty: totalWaste,
          target_qty: totalTarget,
          date,
        },
      };

      return {
        check_name: 'waste_high',
        passed: false,
        alert_created: true,
        alert,
      };
    }

    return {
      check_name: 'waste_high',
      passed: true,
      alert_created: false,
    };
  } catch (error) {
    console.error('Error checking waste high:', error);
    return {
      check_name: 'waste_high',
      passed: true,
      alert_created: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if no production input by 08:00
 * 
 * @param outletId - Outlet ID to check
 * @param date - Date to check (default: today)
 * @returns Check result with alert if needed
 */
export async function checkNoProduction(
  outletId: string,
  date: string = new Date().toISOString().split('T')[0]
): Promise<CheckResult> {
  try {
    const supabase = await createClient();

    // Get current time
    const now = new Date();
    const currentHour = now.getHours();

    // Only check after 08:00
    if (currentHour < 8) {
      return {
        check_name: 'no_production',
        passed: true,
        alert_created: false,
      };
    }

    // Check if production exists for today
    const { data: production, error: prodError } = await supabase
      .from('production_daily')
      .select('id')
      .eq('outlet_id', outletId)
      .eq('tanggal', date)
      .limit(1);

    if (prodError) throw prodError;

    // If no production found after 08:00
    if (!production || production.length === 0) {
      const alert: AlertCheck = {
        type: 'no_production',
        severity: 'warning',
        title: '⚠️ Belum Ada Input Produksi',
        message: `Sudah pukul ${currentHour.toString().padStart(2, '0')}:00 tapi belum ada input produksi untuk hari ini. Segera input data produksi!`,
        metadata: {
          current_hour: currentHour,
          target_hour: 8,
          date,
        },
      };

      return {
        check_name: 'no_production',
        passed: false,
        alert_created: true,
        alert,
      };
    }

    return {
      check_name: 'no_production',
      passed: true,
      alert_created: false,
    };
  } catch (error) {
    console.error('Error checking no production:', error);
    return {
      check_name: 'no_production',
      passed: true,
      alert_created: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if no closing by 21:00
 * 
 * @param outletId - Outlet ID to check
 * @param date - Date to check (default: today)
 * @returns Check result with alert if needed
 */
export async function checkNoClosing(
  outletId: string,
  date: string = new Date().toISOString().split('T')[0]
): Promise<CheckResult> {
  try {
    const supabase = await createClient();

    // Get current time
    const now = new Date();
    const currentHour = now.getHours();

    // Only check after 21:00
    if (currentHour < 21) {
      return {
        check_name: 'no_closing',
        passed: true,
        alert_created: false,
      };
    }

    // Check if closing exists for today
    const { data: closing, error: closingError } = await supabase
      .from('daily_closing')
      .select('id')
      .eq('outlet_id', outletId)
      .eq('tanggal', date)
      .limit(1);

    if (closingError) throw closingError;

    // If no closing found after 21:00
    if (!closing || closing.length === 0) {
      const alert: AlertCheck = {
        type: 'no_closing',
        severity: 'warning',
        title: '⚠️ Belum Ada Closing Harian',
        message: `Sudah pukul ${currentHour.toString().padStart(2, '0')}:00 tapi belum ada closing untuk hari ini. Segera lakukan closing harian!`,
        metadata: {
          current_hour: currentHour,
          target_hour: 21,
          date,
        },
      };

      return {
        check_name: 'no_closing',
        passed: false,
        alert_created: true,
        alert,
      };
    }

    return {
      check_name: 'no_closing',
      passed: true,
      alert_created: false,
    };
  } catch (error) {
    console.error('Error checking no closing:', error);
    return {
      check_name: 'no_closing',
      passed: true,
      alert_created: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create alert in database
 * 
 * @param outletId - Outlet ID
 * @param alert - Alert data
 * @returns Created alert or null
 */
export async function createAlert(
  outletId: string,
  alert: AlertCheck
): Promise<any> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('alerts')
      .insert({
        outlet_id: outletId,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        metadata: alert.metadata || null,
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error creating alert:', error);
    return null;
  }
}

/**
 * Run all alert checks for an outlet
 * 
 * @param outletId - Outlet ID to check
 * @param date - Date to check (default: today)
 * @returns Array of check results
 */
export async function runAllChecks(
  outletId: string,
  date: string = new Date().toISOString().split('T')[0]
): Promise<{
  checks_run: number;
  alerts_created: number;
  results: CheckResult[];
  alerts: any[];
}> {
  // Run all checks in parallel
  const [stockLowResult, wasteHighResult, noProductionResult, noClosingResult] =
    await Promise.all([
      checkStockLow(outletId, date),
      checkWasteHigh(outletId, date),
      checkNoProduction(outletId, date),
      checkNoClosing(outletId, date),
    ]);

  const results = [stockLowResult, wasteHighResult, noProductionResult, noClosingResult];

  // Create alerts for failed checks
  const alerts: any[] = [];
  for (const result of results) {
    if (result.alert_created && result.alert) {
      const createdAlert = await createAlert(outletId, result.alert);
      if (createdAlert) {
        alerts.push(createdAlert);
      }
    }
  }

  return {
    checks_run: results.length,
    alerts_created: alerts.length,
    results,
    alerts,
  };
}
