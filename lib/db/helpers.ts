/**
 * Database Helper Functions
 * 
 * Common database operations and utilities
 */

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getTodayWIB, getNowWIB } from '@/lib/utils/timezone';

/**
 * Get a single record by ID
 */
export async function getById<T extends keyof Database['public']['Tables']>(
  table: T,
  id: string
): Promise<Database['public']['Tables'][T]['Row'] | null> {
  const supabase = createClient();
  
  const { data, error } = await (supabase as any)
    .from(table)
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error(`Error fetching ${String(table)} by id:`, error);
    return null;
  }
  
  return data as Database['public']['Tables'][T]['Row'];
}

/**
 * Check if a record exists
 */
export async function exists<T extends keyof Database['public']['Tables']>(
  table: T,
  filters: Record<string, any>
): Promise<boolean> {
  const supabase = createClient();
  
  let query = supabase.from(table).select('id', { count: 'exact', head: true });
  
  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  const { count, error } = await query;
  
  if (error) {
    console.error(`Error checking existence in ${String(table)}:`, error);
    return false;
  }
  
  return (count ?? 0) > 0;
}

/**
 * Get records with pagination
 */
export async function getPaginated<T extends keyof Database['public']['Tables']>(
  table: T,
  options: {
    page?: number;
    limit?: number;
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
  } = {}
): Promise<{
  data: Database['public']['Tables'][T]['Row'][];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_more: boolean;
  };
}> {
  const supabase = createClient();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  let query = (supabase as any).from(table).select('*', { count: 'exact' });
  
  // Apply filters
  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  // Apply ordering
  if (options.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? false,
    });
  }
  
  // Apply pagination
  query = query.range(from, to);
  
  const { data, error, count } = await query;
  
  if (error) {
    console.error(`Error fetching paginated ${String(table)}:`, error);
    throw error;
  }
  
  const total = count ?? 0;
  
  return {
    data: (data as any) ?? [],
    pagination: {
      page,
      limit,
      total,
      has_more: to < total - 1,
    },
  };
}

/**
 * Soft delete (if table has deleted_at column)
 */
export async function softDelete<T extends keyof Database['public']['Tables']>(
  table: T,
  id: string
): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await (supabase as any)
    .from(table)
    .update({ deleted_at: new Date().toISOString() } as any)
    .eq('id', id);
  
  if (error) {
    console.error(`Error soft deleting ${String(table)}:`, error);
    return false;
  }
  
  return true;
}

/**
 * Hard delete
 */
export async function hardDelete<T extends keyof Database['public']['Tables']>(
  table: T,
  id: string
): Promise<boolean> {
  const supabase = createClient();
  
  const { error } = await supabase.from(table).delete().eq('id', id);
  
  if (error) {
    console.error(`Error hard deleting ${String(table)}:`, error);
    return false;
  }
  
  return true;
}

/**
 * Batch insert
 */
export async function batchInsert<T extends keyof Database['public']['Tables']>(
  table: T,
  records: Database['public']['Tables'][T]['Insert'][]
): Promise<Database['public']['Tables'][T]['Row'][] | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from(table)
    .insert(records as any)
    .select();
  
  if (error) {
    console.error(`Error batch inserting into ${String(table)}:`, error);
    return null;
  }
  
  return data as Database['public']['Tables'][T]['Row'][];
}

/**
 * Upsert (insert or update)
 */
export async function upsert<T extends keyof Database['public']['Tables']>(
  table: T,
  record: Database['public']['Tables'][T]['Insert'],
  onConflict?: string
): Promise<Database['public']['Tables'][T]['Row'] | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from(table)
    .upsert(record as any, { onConflict })
    .select()
    .single();
  
  if (error) {
    console.error(`Error upserting into ${String(table)}:`, error);
    return null;
  }
  
  return data as Database['public']['Tables'][T]['Row'];
}

/**
 * Count records
 */
export async function count<T extends keyof Database['public']['Tables']>(
  table: T,
  filters?: Record<string, any>
): Promise<number> {
  const supabase = createClient();
  
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  const { count, error } = await query;
  
  if (error) {
    console.error(`Error counting ${String(table)}:`, error);
    return 0;
  }
  
  return count ?? 0;
}

/**
 * Execute RPC function
 */
export async function executeRPC<T = any>(
  functionName: string,
  params?: Record<string, any>
): Promise<T | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase.rpc(functionName, params as any);
  
  if (error) {
    console.error(`Error executing RPC ${functionName}:`, error);
    return null;
  }
  
  return data as T;
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return getNowWIB(); // ✅ WIB (UTC+7) - bukan UTC
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return getTodayWIB(); // ✅ WIB (UTC+7) - bukan UTC
}

/**
 * Parse date to YYYY-MM-DD format
 */
export function parseDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}
