/**
 * Supabase Client Configuration
 * 
 * Type-safe Supabase client with TypeScript types for production tracking system
 * 
 * Features:
 * - Type-safe database operations
 * - Connection pooling
 * - Error handling
 * - Authentication helpers
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Check if Supabase is configured
export const isSupabaseConfigured =
  supabaseUrl !== '' &&
  supabaseAnonKey !== '' &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key');

/**
 * Create a type-safe Supabase client
 * 
 * @returns Supabase client with TypeScript types
 */
export function createSupabaseClient() {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured. Using placeholder values.');
    return createClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-application-name': 'donut-pos-production-tracking',
      },
    },
  });
}

/**
 * Singleton Supabase client instance
 * 
 * Use this for client-side operations
 */
export const supabase = createSupabaseClient();

/**
 * Get current authenticated user
 * 
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  
  return user;
}

/**
 * Get current session
 * 
 * @returns Session object or null if not authenticated
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Error getting current session:', error);
    return null;
  }
  
  return session;
}

/**
 * Check if user is authenticated
 * 
 * @returns True if user is authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return session !== null;
}

/**
 * Sign out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Type-safe table accessor
 * 
 * Usage:
 * ```typescript
 * const { data, error } = await getTable('production_daily')
 *   .select('*')
 *   .eq('outlet_id', outletId);
 * ```
 */
export function getTable<T extends keyof Database['public']['Tables']>(
  tableName: T
) {
  return supabase.from(tableName);
}

/**
 * Execute a database function with type safety
 * 
 * @param functionName - Name of the database function
 * @param params - Function parameters
 * @returns Function result
 */
export async function executeFunction<T = any>(
  functionName: string,
  params?: Record<string, any>
) {
  const { data, error } = await supabase.rpc(functionName, params as any);
  
  if (error) {
    console.error(`Error executing function ${functionName}:`, error);
    throw error;
  }
  
  return data as T;
}

/**
 * Health check for Supabase connection
 * 
 * @returns True if connection is healthy, false otherwise
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const { error } = await supabase.from('outlets').select('id').limit(1);
    return !error;
  } catch (error) {
    console.error('Supabase health check failed:', error);
    return false;
  }
}
