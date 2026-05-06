/**
 * Supabase Client (Legacy)
 * 
 * This file is kept for backward compatibility with existing code.
 * For new code, use the type-safe client from @/lib/supabase/client
 * 
 * @deprecated Use @/lib/supabase/client instead
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Cek apakah Supabase sudah dikonfigurasi dengan benar
export const isSupabaseConfigured =
  supabaseUrl !== '' &&
  supabaseAnonKey !== '' &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key'
)

// Re-export type-safe client for convenience
export { 
  supabase as supabaseClient,
  createSupabaseClient,
  getCurrentUser,
  getCurrentSession,
  isAuthenticated,
  signOut,
  getTable,
  executeFunction,
  healthCheck,
} from './supabase/client'
