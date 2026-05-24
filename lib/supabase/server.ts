/**
 * Supabase Server Client
 * 
 * For use in API routes and server-side operations
 * Enhanced with TypeScript types and error handling
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { Database } from '@/lib/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Create Supabase client for server-side operations with request
 * Uses anon key with RLS policies and cookie-based auth
 */
export function createClient(request?: NextRequest) {
  if (!request) {
    // Fallback to basic client without cookies
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Cannot set cookies in API routes, this is handled by middleware
        },
        remove(name: string, options: CookieOptions) {
          // Cannot remove cookies in API routes, this is handled by middleware
        },
      },
    }
  );
}

/**
 * Create Supabase admin client (bypasses RLS)
 * Use with caution - only for admin operations
 */
export function createAdminClient() {
  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
