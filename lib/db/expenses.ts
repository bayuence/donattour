/**
 * Expense Database Helper Functions
 * 
 * Provides type-safe database operations for expense tracking
 */

import { createAdminClient } from '@/lib/supabase/server';
import { getTodayWIB } from '@/lib/utils/timezone';
import type {
  Expense,
  ExpenseWithDetails,
  CreateExpense,
  UpdateExpense,
  ExpenseFilters,
  ExpenseSummary,
  ExpenseDailySummary,
  ExpensePeriodSummary,
  ExpenseCategory,
} from '@/lib/types/expenses';

// ============================================================================
// EXPENSE CRUD OPERATIONS
// ============================================================================

// Helper to map database rows to Expense types
function mapExpenseRow(row: any): ExpenseWithDetails {
  if (!row) return row;
  return {
    ...row,
    created_by: row.recorded_by_user_id,
    bukti_url: row.receipt_url || row.bukti_url || null,
  } as ExpenseWithDetails;
}

/**
 * Get expenses with optional filters
 */
export async function getExpenses(filters?: ExpenseFilters) {
  const supabase = createAdminClient();
  
  let query = supabase
    .from('expenses')
    .select(`
      *,
      outlet:outlets(id, nama),
      created_by_user:users!expenses_recorded_by_user_id_fkey(id, name)
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

  if (filters?.kategori) {
    query = query.eq('kategori', filters.kategori);
  }

  if (filters?.created_by) {
    query = query.eq('recorded_by_user_id', filters.created_by);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getExpenses] Error:', error);
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  return (data || []).map(mapExpenseRow);
}

/**
 * Get single expense by ID
 */
export async function getExpenseById(id: string) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      outlet:outlets(id, nama),
      created_by_user:users!expenses_recorded_by_user_id_fkey(id, name)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[getExpenseById] Error:', error);
    throw new Error(`Failed to fetch expense: ${error.message}`);
  }

  return data ? mapExpenseRow(data) : null;
}

/**
 * Create new expense
 */
export async function createExpense(expense: CreateExpense) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      outlet_id: expense.outlet_id,
      tanggal: expense.tanggal,
      kategori: expense.kategori,
      keterangan: expense.keterangan,
      jumlah: expense.jumlah,
      receipt_url: expense.bukti_url || null,  // Fixed: database uses receipt_url
      recorded_by_user_id: expense.created_by,  // Fixed: database uses recorded_by_user_id
    })
    .select(`
      *,
      outlet:outlets(id, nama),
      created_by_user:users!expenses_recorded_by_user_id_fkey(id, name)
    `)
    .single();

  if (error) {
    console.error('[createExpense] Error:', error);
    throw new Error(`Failed to create expense: ${error.message}`);
  }

  return mapExpenseRow(data);
}

/**
 * Update expense
 */
export async function updateExpense(id: string, updates: UpdateExpense) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from('expenses')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(`
      *,
      outlet:outlets(id, nama),
      created_by_user:users!expenses_recorded_by_user_id_fkey(id, name)
    `)
    .single();

  if (error) {
    console.error('[updateExpense] Error:', error);
    throw new Error(`Failed to update expense: ${error.message}`);
  }

  return mapExpenseRow(data);
}

/**
 * Delete expense
 */
export async function deleteExpense(id: string) {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteExpense] Error:', error);
    throw new Error(`Failed to delete expense: ${error.message}`);
  }

  return { success: true };
}

// ============================================================================
// EXPENSE SUMMARY OPERATIONS
// ============================================================================

/**
 * Get expense summary for a specific date
 */
export async function getExpenseDailySummary(
  outlet_id: string,
  tanggal: string = getTodayWIB()
): Promise<ExpenseDailySummary> {
  const supabase = createAdminClient();
  
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('kategori, jumlah')
    .eq('outlet_id', outlet_id)
    .eq('tanggal', tanggal);

  if (error) {
    console.error('[getExpenseDailySummary] Error:', error);
    throw new Error(`Failed to fetch daily summary: ${error.message}`);
  }

  // Calculate breakdown
  const breakdown = {
    operasional: 0,
    bahan_baku: 0,
    gaji: 0,
    transportasi: 0,
    perawatan: 0,
    marketing: 0,
    lainnya: 0,
  };

  let total = 0;
  expenses.forEach((exp) => {
    const amount = Number(exp.jumlah);
    total += amount;
    breakdown[exp.kategori as ExpenseCategory] = (breakdown[exp.kategori as ExpenseCategory] || 0) + amount;
  });

  return {
    tanggal,
    outlet_id,
    total_pengeluaran: total,
    jumlah_item: expenses.length,
    breakdown,
  };
}

/**
 * Get expense summary for a period
 */
export async function getExpensePeriodSummary(
  start_date: string,
  end_date: string,
  outlet_id?: string
): Promise<ExpensePeriodSummary> {
  const supabase = createAdminClient();
  
  let query = supabase
    .from('expenses')
    .select('tanggal, kategori, jumlah')
    .gte('tanggal', start_date)
    .lte('tanggal', end_date);

  if (outlet_id) {
    query = query.eq('outlet_id', outlet_id);
  }

  const { data: expenses, error } = await query;

  if (error) {
    console.error('[getExpensePeriodSummary] Error:', error);
    throw new Error(`Failed to fetch period summary: ${error.message}`);
  }

  // Calculate totals
  let total = 0;
  const categoryMap = new Map<ExpenseCategory, { total: number; count: number }>();
  const dateMap = new Map<string, { total: number; count: number }>();

  expenses.forEach((exp) => {
    const amount = Number(exp.jumlah);
    total += amount;

    // By category
    const catData = categoryMap.get(exp.kategori as ExpenseCategory) || { total: 0, count: 0 };
    catData.total += amount;
    catData.count += 1;
    categoryMap.set(exp.kategori as ExpenseCategory, catData);

    // By date
    const dateData = dateMap.get(exp.tanggal) || { total: 0, count: 0 };
    dateData.total += amount;
    dateData.count += 1;
    dateMap.set(exp.tanggal, dateData);
  });

  // Calculate days in period
  const startMs = new Date(start_date).getTime();
  const endMs = new Date(end_date).getTime();
  const days = Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;

  // Build breakdown by category
  const breakdown_by_kategori = Array.from(categoryMap.entries()).map(([kategori, data]) => ({
    kategori,
    total: data.total,
    count: data.count,
    percentage: total > 0 ? (data.total / total) * 100 : 0,
  }));

  // Build breakdown by date
  const breakdown_by_date = Array.from(dateMap.entries())
    .map(([tanggal, data]) => ({
      tanggal,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  return {
    start_date,
    end_date,
    outlet_id,
    total_pengeluaran: total,
    jumlah_item: expenses.length,
    rata_rata_harian: days > 0 ? total / days : 0,
    breakdown_by_kategori,
    breakdown_by_date,
  };
}

/**
 * Get expense summary with category breakdown
 */
export async function getExpenseSummary(filters?: ExpenseFilters): Promise<ExpenseSummary> {
  const expenses = await getExpenses(filters);
  
  let total = 0;
  const categoryMap = new Map<ExpenseCategory, { total: number; count: number }>();

  expenses.forEach((exp) => {
    const amount = Number(exp.jumlah);
    total += amount;

    const catData = categoryMap.get(exp.kategori) || { total: 0, count: 0 };
    catData.total += amount;
    catData.count += 1;
    categoryMap.set(exp.kategori, catData);
  });

  const breakdown_by_kategori = Array.from(categoryMap.entries()).map(([kategori, data]) => ({
    kategori,
    total: data.total,
    count: data.count,
    percentage: total > 0 ? (data.total / total) * 100 : 0,
  }));

  return {
    total_pengeluaran: total,
    jumlah_item: expenses.length,
    breakdown_by_kategori,
  };
}
