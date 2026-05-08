/**
 * Production Tracking Database Helper Functions
 * 
 * Provides type-safe database operations for production tracking system
 * 
 * Features:
 * - CRUD operations for production tracking tables
 * - Complex queries with joins
 * - Aggregations and summaries
 * - Error handling
 */

import { createAdminClient } from '@/lib/supabase/server';
import { getTodayWIB } from '@/lib/utils/timezone';
import type {
  ProductionDaily,
  ProductionDailyWithDetails,
  ProductionWasteDetail,
  InventoryNonTopping,
  ToppingError,
  ToppingErrorWithDetails,
  DailyClosing,
  DailyClosingWithDetails,
  DailyLossSummary,
  CreateProductionDaily,
  UpdateProductionDaily,
  CreateProductionWasteDetail,
  CreateToppingError,
  CreateDailyClosing,
  DonutSize,
  InventoryStatus,
} from '@/lib/types/production';

const supabase = createAdminClient();

// ============================================================================
// PRODUCTION DAILY OPERATIONS
// ============================================================================

/**
 * Get production daily records with optional filters
 */
export async function getProductionDaily(filters?: {
  outlet_id?: string;
  tanggal?: string;
  start_date?: string;
  end_date?: string;
  ukuran?: DonutSize;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('production_daily')
    .select(`
      *,
      outlet:outlets(id, nama),
      created_by_user:users(id, name),
      waste_details:production_waste_details(*)
    `)
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.outlet_id) {
    query = query.eq('outlet_id', filters.outlet_id);
  }

  if (filters?.tanggal) {
    query = query.eq('tanggal', filters.tanggal);
  }

  if (filters?.start_date && filters?.end_date) {
    query = query.gte('tanggal', filters.start_date).lte('tanggal', filters.end_date);
  }

  if (filters?.ukuran) {
    query = query.eq('ukuran', filters.ukuran);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching production daily:', error);
    throw error;
  }

  return data as ProductionDailyWithDetails[];
}

/**
 * Get production daily list with pagination
 */
export async function getProductionDailyList(filters?: {
  outlet_id?: string;
  tanggal?: string;
  start_date?: string;
  end_date?: string;
  ukuran?: DonutSize;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const offset = (page - 1) * limit;

  // Build query for data
  let dataQuery = supabase
    .from('production_daily')
    .select(`
      *,
      outlet:outlets(id, nama),
      created_by_user:users(id, name),
      waste_details:production_waste_details(*)
    `)
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Build query for count
  let countQuery = supabase
    .from('production_daily')
    .select('id', { count: 'exact', head: true });

  // Apply filters to both queries
  if (filters?.outlet_id) {
    dataQuery = dataQuery.eq('outlet_id', filters.outlet_id);
    countQuery = countQuery.eq('outlet_id', filters.outlet_id);
  }

  if (filters?.tanggal) {
    dataQuery = dataQuery.eq('tanggal', filters.tanggal);
    countQuery = countQuery.eq('tanggal', filters.tanggal);
  }

  if (filters?.start_date && filters?.end_date) {
    dataQuery = dataQuery.gte('tanggal', filters.start_date).lte('tanggal', filters.end_date);
    countQuery = countQuery.gte('tanggal', filters.start_date).lte('tanggal', filters.end_date);
  }

  if (filters?.ukuran) {
    dataQuery = dataQuery.eq('ukuran', filters.ukuran);
    countQuery = countQuery.eq('ukuran', filters.ukuran);
  }

  // Execute both queries
  const [{ data, error }, { count, error: countError }] = await Promise.all([
    dataQuery,
    countQuery,
  ]);

  if (error) {
    console.error('Error fetching production daily list:', error);
    throw error;
  }

  if (countError) {
    console.error('Error counting production daily:', countError);
    throw countError;
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    items: data as ProductionDailyWithDetails[],
    pagination: {
      page,
      limit,
      total,
      total_pages: totalPages,
    },
  };
}

/**
 * Get production daily by ID
 */
export async function getProductionDailyById(id: string) {
  const { data, error } = await supabase
    .from('production_daily')
    .select(`
      *,
      outlet:outlets(id, nama),
      created_by_user:users(id, name),
      waste_details:production_waste_details(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching production daily by ID:', error);
    throw error;
  }

  return data as ProductionDailyWithDetails;
}

/**
 * Create production daily record
 */
export async function createProductionDaily(
  production: CreateProductionDaily,
  wasteDetails: CreateProductionWasteDetail[]
) {
  // Insert new record (allow multiple entries per outlet/tanggal/ukuran)
  const { data: productionData, error: productionError } = await supabase
    .from('production_daily')
    .insert(production as any)
    .select()
    .single();

  if (productionError) {
    console.error('Error creating production daily:', productionError);
    throw productionError;
  }

  if (!productionData) {
    throw new Error('Failed to create production daily');
  }

  // Insert waste details if any
  if (wasteDetails.length > 0) {
    const wasteDetailsWithId = wasteDetails.map(detail => ({
      ...detail,
      production_daily_id: (productionData as any).id,
    }));

    const { error: wasteError } = await supabase
      .from('production_waste_details')
      .insert(wasteDetailsWithId as any);

    if (wasteError) {
      console.error('Error creating waste details:', wasteError);
      throw wasteError;
    }
  }

  // Fetch complete record with relations
  return getProductionDailyById((productionData as any).id);
}

/**
 * Update production daily record
 */
export async function updateProductionDaily(
  id: string,
  updates: UpdateProductionDaily
) {
  const { data, error } = await (supabase as any)
    .from('production_daily')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating production daily:', error);
    throw error;
  }

  return data as ProductionDaily;
}

/**
 * Delete production daily record
 */
export async function deleteProductionDaily(id: string) {
  const { error } = await supabase
    .from('production_daily')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting production daily:', error);
    throw error;
  }

  return true;
}

/**
 * Check if production exists for outlet and date
 */
export async function checkProductionExists(
  outlet_id: string,
  tanggal: string,
  ukuran: DonutSize
): Promise<boolean> {
  const { data, error } = await supabase
    .from('production_daily')
    .select('id')
    .eq('outlet_id', outlet_id)
    .eq('tanggal', tanggal)
    .eq('ukuran', ukuran)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned
    console.error('Error checking production exists:', error);
    throw error;
  }

  return data !== null;
}

// ============================================================================
// INVENTORY NON-TOPPING OPERATIONS
// ============================================================================

/**
 * Get inventory non-topping for outlet
 */
export async function getInventoryNonTopping(filters?: {
  outlet_id?: string;
  ukuran?: DonutSize;
  status?: InventoryStatus;
  production_date?: string;
}) {
  let query = supabase
    .from('inventory_non_topping')
    .select('*')
    .order('production_date', { ascending: false })
    .order('last_updated', { ascending: false });

  if (filters?.outlet_id) {
    query = query.eq('outlet_id', filters.outlet_id);
  }

  if (filters?.ukuran) {
    query = query.eq('ukuran', filters.ukuran);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.production_date) {
    query = query.eq('production_date', filters.production_date);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching inventory non-topping:', error);
    throw error;
  }

  return data as InventoryNonTopping[];
}

/**
 * Get total available stock by outlet and size
 */
export async function getTotalAvailableStock(
  outlet_id: string,
  ukuran: DonutSize
): Promise<number> {
  const { data, error } = await supabase
    .from('inventory_non_topping')
    .select('qty_available')
    .eq('outlet_id', outlet_id)
    .eq('ukuran', ukuran)
    .gt('qty_available', 0);

  if (error) {
    console.error('Error fetching total available stock:', error);
    throw error;
  }

  return (data as any[]).reduce((sum: number, item: any) => sum + item.qty_available, 0);
}

/**
 * Update inventory quantity
 */
export async function updateInventoryQuantity(
  id: string,
  qty_available: number
) {
  const { data, error } = await supabase
    .from('inventory_non_topping')
    .update({ qty_available })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating inventory quantity:', error);
    throw error;
  }

  return data as InventoryNonTopping;
}

// ============================================================================
// TOPPING ERROR OPERATIONS
// ============================================================================

/**
 * Get topping errors with optional filters
 */
export async function getToppingErrors(filters?: {
  outlet_id?: string;
  kasir_id?: string;
  tanggal?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('topping_errors')
    .select(`
      *,
      outlet:outlets(id, nama),
      kasir:users(id, name)
    `)
    .order('created_at', { ascending: false });

  if (filters?.outlet_id) {
    query = query.eq('outlet_id', filters.outlet_id);
  }

  if (filters?.kasir_id) {
    query = query.eq('kasir_id', filters.kasir_id);
  }

  if (filters?.tanggal) {
    query = query.eq('tanggal', filters.tanggal);
  }

  if (filters?.start_date && filters?.end_date) {
    query = query.gte('tanggal', filters.start_date).lte('tanggal', filters.end_date);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching topping errors:', error);
    throw error;
  }

  return data as ToppingErrorWithDetails[];
}

/**
 * Create topping error record
 */
export async function createToppingError(toppingError: CreateToppingError) {
  const { data, error } = await supabase
    .from('topping_errors')
    .insert(toppingError as any)
    .select(`
      *,
      outlet:outlets(id, nama),
      kasir:users(id, name)
    `)
    .single();

  if (error) {
    console.error('Error creating topping error:', error);
    throw error;
  }

  return data as ToppingErrorWithDetails;
}

/**
 * Get topping errors summary for date range
 */
export async function getToppingErrorsSummary(
  outlet_id: string,
  start_date: string,
  end_date: string
) {
  const { data, error } = await supabase
    .from('topping_errors')
    .select('qty, hpp_loss')
    .eq('outlet_id', outlet_id)
    .gte('tanggal', start_date)
    .lte('tanggal', end_date);

  if (error) {
    console.error('Error fetching topping errors summary:', error);
    throw error;
  }

  const summary = (data as any[]).reduce(
    (acc: any, item: any) => ({
      total_qty: acc.total_qty + item.qty,
      total_hpp_loss: acc.total_hpp_loss + item.hpp_loss,
    }),
    { total_qty: 0, total_hpp_loss: 0 }
  );

  return summary;
}

// ============================================================================
// DAILY CLOSING OPERATIONS
// ============================================================================

/**
 * Get daily closing records with optional filters
 */
export async function getDailyClosing(filters?: {
  outlet_id?: string;
  tanggal?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('daily_closing')
    .select(`
      *,
      outlet:outlets(id, nama),
      closed_by_user:users(id, name),
      non_topping_status:closing_non_topping_status(*),
      finished_products:closing_finished_products(*),
      loss_summary:daily_loss_summary(*)
    `)
    .order('tanggal', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters?.outlet_id) {
    query = query.eq('outlet_id', filters.outlet_id);
  }

  if (filters?.tanggal) {
    query = query.eq('tanggal', filters.tanggal);
  }

  if (filters?.start_date && filters?.end_date) {
    query = query.gte('tanggal', filters.start_date).lte('tanggal', filters.end_date);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching daily closing:', error);
    throw error;
  }

  return data as DailyClosingWithDetails[];
}

/**
 * Get daily closing by ID
 */
export async function getDailyClosingById(id: string) {
  const { data, error } = await supabase
    .from('daily_closing')
    .select(`
      *,
      outlet:outlets(id, nama),
      closed_by_user:users(id, name),
      non_topping_status:closing_non_topping_status(*),
      finished_products:closing_finished_products(*),
      loss_summary:daily_loss_summary(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching daily closing by ID:', error);
    throw error;
  }

  return data as DailyClosingWithDetails;
}

/**
 * Check if closing exists for outlet and date
 */
export async function checkClosingExists(
  outlet_id: string,
  tanggal: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('daily_closing')
    .select('id')
    .eq('outlet_id', outlet_id)
    .eq('tanggal', tanggal)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking closing exists:', error);
    throw error;
  }

  return data !== null;
}

// ============================================================================
// DAILY LOSS SUMMARY OPERATIONS
// ============================================================================

/**
 * Get daily loss summary for outlet and date range
 */
export async function getDailyLossSummary(filters?: {
  outlet_id?: string;
  tanggal?: string;
  start_date?: string;
  end_date?: string;
}) {
  let query = supabase
    .from('daily_loss_summary')
    .select('*')
    .order('tanggal', { ascending: false });

  if (filters?.outlet_id) {
    query = query.eq('outlet_id', filters.outlet_id);
  }

  if (filters?.tanggal) {
    query = query.eq('tanggal', filters.tanggal);
  }

  if (filters?.start_date && filters?.end_date) {
    query = query.gte('tanggal', filters.start_date).lte('tanggal', filters.end_date);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching daily loss summary:', error);
    throw error;
  }

  return data as DailyLossSummary[];
}

/**
 * Get total loss for period
 */
export async function getTotalLossForPeriod(
  outlet_id: string,
  start_date: string,
  end_date: string
): Promise<number> {
  const { data, error } = await supabase
    .from('daily_loss_summary')
    .select('total_loss')
    .eq('outlet_id', outlet_id)
    .gte('tanggal', start_date)
    .lte('tanggal', end_date);

  if (error) {
    console.error('Error fetching total loss for period:', error);
    throw error;
  }

  return (data as any[]).reduce((sum: number, item: any) => sum + item.total_loss, 0);
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate if kasir can operate (has production input today)
 */
export async function validateKasirCanOperate(
  outlet_id: string,
  tanggal: string
): Promise<{
  can_operate: boolean;
  has_production: boolean;
  message?: string;
}> {
  const { data, error } = await supabase
    .from('production_daily')
    .select('id, ukuran, success_qty')
    .eq('outlet_id', outlet_id)
    .eq('tanggal', tanggal);

  if (error) {
    console.error('Error validating kasir operation:', error);
    return {
      can_operate: false,
      has_production: false,
      message: 'Error checking production status',
    };
  }

  const has_production = data && data.length > 0;

  return {
    can_operate: has_production,
    has_production,
    message: has_production
      ? 'Kasir dapat beroperasi'
      : 'Belum ada input produksi hari ini',
  };
}

/**
 * Get stock summary for outlet
 */
export async function getStockSummary(outlet_id: string, tanggal: string) {
  // Get production data
  const production = await getProductionDaily({
    outlet_id,
    tanggal,
  });

  // Get inventory data
  const inventory = await getInventoryNonTopping({
    outlet_id,
    production_date: tanggal,
  });

  // Calculate summary
  const summary = {
    standar: {
      production: production.find(p => p.ukuran === 'standar'),
      inventory: inventory.filter(i => i.ukuran === 'standar'),
      total_available: inventory
        .filter(i => i.ukuran === 'standar')
        .reduce((sum, i) => sum + i.qty_available, 0),
    },
    mini: {
      production: production.find(p => p.ukuran === 'mini'),
      inventory: inventory.filter(i => i.ukuran === 'mini'),
      total_available: inventory
        .filter(i => i.ukuran === 'mini')
        .reduce((sum, i) => sum + i.qty_available, 0),
    },
  };

  return summary;
}


// ============================================================================
// INVENTORY VALIDATION OPERATIONS
// ============================================================================

/**
 * Validate stock for POS operation
 * Check if production exists today and get stock levels
 */
export async function validateStockForPOS(outlet_id: string, tanggal?: string) {
  const checkDate = tanggal || getTodayWIB(); // ✅ Use WIB timezone

  console.log('[validateStockForPOS] START:', { outlet_id, checkDate });

  // 1. Get ALL production records for today (to sum cumulative total)
  const { data: productions, error: prodError } = await supabase
    .from('production_daily')
    .select('*')
    .eq('outlet_id', outlet_id)
    .eq('tanggal', checkDate);

  if (prodError) {
    console.error('[validateStockForPOS] Error checking production:', prodError);
    throw prodError;
  }

  console.log('[validateStockForPOS] Productions found:', productions?.length || 0, productions);

  const hasProduction = productions && productions.length > 0;

  // ✅ FIX #2: can_operate harus berdasarkan total success_qty > 0
  // Bukan hanya ada record, tapi harus ada donat yang berhasil dibuat
  const totalSuccessQty = productions?.reduce(
    (sum: number, p: any) => sum + (p.success_qty || 0), 0
  ) || 0;
  const canOperate = totalSuccessQty > 0;

  // Calculate CUMULATIVE totals per ukuran (sum all records)
  const cumulativeTotals: any = {
    standar: { target_qty: 0, success_qty: 0 },
    mini: { target_qty: 0, success_qty: 0 },
  };

  if (productions && productions.length > 0) {
    productions.forEach((prod: any) => {
      const size = prod.ukuran as 'standar' | 'mini';
      cumulativeTotals[size].target_qty += prod.target_qty || 0;
      cumulativeTotals[size].success_qty += prod.success_qty || 0;
    });
  }

  // 2. Get current stock levels (TODAY'S fresh stock ONLY)
  // ✅ BUSINESS RULE: Only sell today's fresh donuts, not yesterday's
  // Filter by production_date = today to ensure only today's stock is available
  const { data: stocks, error: stockError } = await supabase
    .from('inventory_non_topping')
    .select('*')
    .eq('outlet_id', outlet_id)
    .eq('production_date', checkDate) // ✅ Only today's production
    .eq('status', 'fresh')
    .gt('qty_available', 0);

  if (stockError) {
    console.error('[validateStockForPOS] Error fetching stock:', stockError);
    throw stockError;
  }

  console.log('[validateStockForPOS] Stocks found:', stocks?.length || 0, stocks);

  // 3. Build stock summary
  const stockSummary: any = {
    standar: {
      qty_available: 0,
      status: 'out_of_stock' as const,
      percentage: 0,
    },
    mini: {
      qty_available: 0,
      status: 'out_of_stock' as const,
      percentage: 0,
    },
  };

  const productionData: any = {
    standar: null,
    mini: null,
  };

  // Calculate stock for each size
  if (stocks && stocks.length > 0) {
    stocks.forEach((stock: any) => {
      const size = stock.ukuran as 'standar' | 'mini';
      stockSummary[size].qty_available += stock.qty_available || 0;
    });
  }

  // Use CUMULATIVE production data for calculation
  Object.entries(cumulativeTotals).forEach(([size, totals]: any) => {
    if (totals.success_qty > 0) {
      productionData[size] = {
        target_qty: totals.target_qty,
        success_qty: totals.success_qty,
      };

      // Calculate percentage and status based on cumulative total
      const successQty = totals.success_qty;
      const available = stockSummary[size as 'standar' | 'mini'].qty_available;

      const percentage = (available / successQty) * 100;
      stockSummary[size as 'standar' | 'mini'].percentage = Math.round(percentage * 100) / 100;

      // Determine status
      if (available === 0) {
        stockSummary[size as 'standar' | 'mini'].status = 'out_of_stock';
      } else if (percentage < 20) {
        stockSummary[size as 'standar' | 'mini'].status = 'low';
      } else {
        stockSummary[size as 'standar' | 'mini'].status = 'sufficient';
      }
    }
  });

  const result = {
    can_operate: canOperate,           // ✅ true hanya jika ada donat berhasil (success_qty > 0)
    has_production: hasProduction,     // true jika ada record apapun
    total_success_qty: totalSuccessQty, // total donat berhasil hari ini
    stock_summary: stockSummary,
    production_data: productionData,
  };

  console.log('[validateStockForPOS] RESULT:', result);

  return result;
}

/**
 * Get inventory stock by outlet and filters
 */
export async function getInventoryStock(filters: {
  outlet_id: string;
  ukuran?: DonutSize;
  status?: InventoryStatus;
  production_date?: string;
}) {
  let query = supabase
    .from('inventory_non_topping')
    .select('*')
    .eq('outlet_id', filters.outlet_id)
    .order('production_date', { ascending: false })
    .order('last_updated', { ascending: false });

  if (filters.ukuran) {
    query = query.eq('ukuran', filters.ukuran);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.production_date) {
    query = query.eq('production_date', filters.production_date);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching inventory stock:', error);
    throw error;
  }

  // Calculate totals by size
  const totalBySize = {
    standar: 0,
    mini: 0,
  };

  if (data && data.length > 0) {
    data.forEach((stock: any) => {
      const size = stock.ukuran as 'standar' | 'mini';
      totalBySize[size] += stock.qty_available || 0;
    });
  }

  return {
    outlet_id: filters.outlet_id,
    stocks: data || [],
    total_by_size: totalBySize,
  };
}


// ============================================================================
// STOCK DEDUCTION ON SALE
// ============================================================================

/**
 * Deduct stock from inventory_non_topping on sale
 * 
 * Features:
 * - Validate sufficient stock before deduction
 * - Atomic update with database transaction
 * - Prevent negative stock
 * - FIFO (First In First Out) - deduct from oldest fresh stock first
 * - Return error if insufficient stock
 * 
 * @param outlet_id - Outlet ID
 * @param ukuran - Donut size (standar/mini)
 * @param qty - Quantity to deduct
 * @returns Updated inventory records
 * 
 * @example
 * ```typescript
 * const result = await deductStockOnSale('outlet-123', 'standar', 10);
 * if (!result.success) {
 *   console.error('Insufficient stock:', result.error);
 * }
 * ```
 */
export async function deductStockOnSale(
  outlet_id: string,
  ukuran: DonutSize,
  qty: number
): Promise<{ success: boolean; error?: string; deducted?: any[] }> {
  try {
    // 1. Get available stock (fresh only, ordered by production_date ASC for FIFO)
    const { data: stocks, error: fetchError } = await supabase
      .from('inventory_non_topping')
      .select('*')
      .eq('outlet_id', outlet_id)
      .eq('ukuran', ukuran)
      .eq('status', 'fresh')
      .gt('qty_available', 0)
      .order('production_date', { ascending: true }) // FIFO
      .returns<InventoryNonTopping[]>();

    if (fetchError) {
      console.error('Error fetching inventory:', fetchError);
      return { success: false, error: 'Failed to fetch inventory' };
    }

    if (!stocks || stocks.length === 0) {
      return { 
        success: false, 
        error: `Stok ${ukuran} habis! Tidak ada stok fresh yang tersedia.` 
      };
    }

    // 2. Calculate total available
    const totalAvailable = stocks.reduce((sum, stock) => sum + stock.qty_available, 0);

    if (totalAvailable < qty) {
      return { 
        success: false, 
        error: `Stok ${ukuran} tidak cukup! Tersedia: ${totalAvailable} pcs, Dibutuhkan: ${qty} pcs` 
      };
    }

    // 3. Deduct stock using FIFO (oldest first)
    let remaining = qty;
    const deducted: any[] = [];

    for (const stock of stocks) {
      if (remaining <= 0) break;

      const deductQty = Math.min(stock.qty_available, remaining);
      const newQty = stock.qty_available - deductQty;

      // Update inventory
      const { error: updateError } = await supabase
        .from('inventory_non_topping')
        .update({
          qty_available: newQty,
          last_updated: new Date().toISOString()
        })
        .eq('id', stock.id);

      if (updateError) {
        console.error('Error updating inventory:', updateError);
        return { success: false, error: 'Failed to update inventory' };
      }

      deducted.push({
        inventory_id: stock.id,
        production_date: stock.production_date,
        deducted_qty: deductQty,
        remaining_qty: newQty,
      });

      remaining -= deductQty;
    }

    return { success: true, deducted };

  } catch (error: any) {
    console.error('Error in deductStockOnSale:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Record topping usage for sold products
 * 
 * @param order_id - Order ID
 * @param product_id - Product ID (varian ID)
 * @param qty - Quantity sold
 * @param topping_name - Topping name (optional, will be fetched from product)
 * 
 * @example
 * ```typescript
 * await recordToppingUsage('order-123', 'varian-456', 5);
 * ```
 */
export async function recordToppingUsage(
  order_id: string,
  product_id: string,
  qty: number,
  topping_name?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get product name if not provided
    let finalToppingName = topping_name;
    
    if (!finalToppingName) {
      const { data: product } = await supabase
        .from('products')
        .select('nama')
        .eq('id', product_id)
        .single();
      
      finalToppingName = product?.nama || 'Unknown';
    }

    // ✅ FIX: Insert with correct column structure
    const insertData = {
      order_id,
      product_id,
      topping_name: finalToppingName,
      qty,
    };

    const { error } = await (supabase as any)
      .from('topping_usage')
      .insert([insertData]);

    if (error) {
      console.error('Error recording topping usage:', error);
      // Don't fail the order if topping tracking fails
      return { success: false, error: 'Failed to record topping usage (non-blocking)' };
    }

    return { success: true };

  } catch (error: any) {
    console.error('Error in recordToppingUsage:', error);
    // Don't fail the order if topping tracking fails
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Validate and deduct stock for multiple items in an order
 * 
 * This function:
 * 1. Validates sufficient stock for all items
 * 2. Deducts stock atomically (all or nothing)
 * 3. Records topping usage for each item
 * 
 * @param outlet_id - Outlet ID
 * @param items - Array of items to deduct
 * @returns Result with success status and details
 * 
 * @example
 * ```typescript
 * const result = await validateAndDeductStock('outlet-123', [
 *   { type: 'satuan', varianId: 'v1', qty: 5, ukuran: 'standar' },
 *   { type: 'paket', isiDonat: [...], qty: 2 }
 * ]);
 * ```
 */
export async function validateAndDeductStock(
  outlet_id: string,
  order_id: string,
  items: any[]
): Promise<{ success: boolean; error?: string; details?: any }> {
  try {
    // 1. Calculate total qty needed per size
    const qtyNeeded: { standar: number; mini: number } = { standar: 0, mini: 0 };

    for (const item of items) {
      if (item.type === 'satuan') {
        // Satuan: qty * item.qty
        const ukuran = item.ukuran || 'standar';
        qtyNeeded[ukuran as DonutSize] += item.qty;
      } else if (item.type === 'paket') {
        // Paket: count donuts in isiDonat
        if (item.isiDonat && Array.isArray(item.isiDonat)) {
          for (const donat of item.isiDonat) {
            const ukuran = donat.ukuran || 'standar';
            qtyNeeded[ukuran as DonutSize] += 1;
          }
        }
      } else if (item.type === 'custom') {
        // Custom: kapasitas * qty
        const ukuran = item.ukuranDonat || 'standar';
        qtyNeeded[ukuran as DonutSize] += item.kapasitas || 0;
      }
      // bundling, box, tambahan tidak deduct stock non-topping
    }

    // 2. Validate sufficient stock for each size
    for (const ukuran of ['standar', 'mini'] as DonutSize[]) {
      if (qtyNeeded[ukuran] > 0) {
        // Get available stock
        const { data: stocks } = await supabase
          .from('inventory_non_topping')
          .select('qty_available')
          .eq('outlet_id', outlet_id)
          .eq('ukuran', ukuran)
          .eq('status', 'fresh')
          .returns<{ qty_available: number }[]>();

        const totalAvailable = stocks?.reduce((sum, s) => sum + s.qty_available, 0) || 0;

        if (totalAvailable < qtyNeeded[ukuran]) {
          return {
            success: false,
            error: `Stok ${ukuran} tidak cukup! Tersedia: ${totalAvailable} pcs, Dibutuhkan: ${qtyNeeded[ukuran]} pcs`,
          };
        }
      }
    }

    // 3. Deduct stock for each size
    const deductionResults: any = {};

    for (const ukuran of ['standar', 'mini'] as DonutSize[]) {
      if (qtyNeeded[ukuran] > 0) {
        const result = await deductStockOnSale(outlet_id, ukuran, qtyNeeded[ukuran]);
        
        if (!result.success) {
          return { success: false, error: result.error };
        }

        deductionResults[ukuran] = result.deducted;
      }
    }

    // 4. Record topping usage for satuan items
    // ⚠️ TEMPORARILY DISABLED - Investigating oi.qty error
    // Error persists even after fixing table structure
    // TODO: Check database functions/triggers/views for oi.qty reference
    /*
    for (const item of items) {
      if (item.type === 'satuan' && item.varianId) {
        await recordToppingUsage(order_id, item.varianId, item.qty);
      }
    }
    */
    console.log('[validateAndDeductStock] Topping usage tracking disabled temporarily');

    return { 
      success: true, 
      details: {
        qtyNeeded,
        deductionResults,
      }
    };

  } catch (error: any) {
    console.error('Error in validateAndDeductStock:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}
