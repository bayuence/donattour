// ============================================================================
// REACT QUERY CLIENT CONFIGURATION
// ============================================================================
// File: lib/query/query-client.ts
// Description: QueryClient configuration with default options and offline support
// Version: 2.0
// Date: 2026-05-08
// ============================================================================

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

// ============================================================================
// CACHE TIME CONFIGURATION
// ============================================================================

/**
 * Cache time configuration per query type
 * 
 * staleTime: How long data is considered fresh (won't refetch)
 * gcTime: How long unused data stays in cache before garbage collection (formerly cacheTime)
 */
export const cacheConfig = {
  // Real-time data - short stale time, frequent refetch
  realtime: {
    staleTime: 30 * 1000,        // 30 seconds
    gcTime: 5 * 60 * 1000,       // 5 minutes
  },
  
  // Frequently changing data - moderate stale time
  frequent: {
    staleTime: 2 * 60 * 1000,    // 2 minutes
    gcTime: 10 * 60 * 1000,      // 10 minutes
  },
  
  // Stable data - longer stale time
  stable: {
    staleTime: 5 * 60 * 1000,    // 5 minutes
    gcTime: 30 * 60 * 1000,      // 30 minutes
  },
  
  // Static data - very long stale time
  static: {
    staleTime: 60 * 60 * 1000,   // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },
} as const;

/**
 * Query type to cache config mapping
 * 
 * Usage: Apply specific cache times based on query type
 */
export const queryCacheConfig = {
  // Real-time queries (30s stale, 5min gc)
  'inventory-validation': cacheConfig.realtime,
  'inventory-stock': cacheConfig.realtime,
  'alerts-unread-count': cacheConfig.realtime,
  
  // Frequent queries (2min stale, 10min gc)
  'productions-list': cacheConfig.frequent,
  'closing-list': cacheConfig.frequent,
  'topping-errors-list': cacheConfig.frequent,
  'dashboard-daily': cacheConfig.frequent,
  'alerts-list': cacheConfig.frequent,
  
  // Stable queries (5min stale, 30min gc)
  'productions-detail': cacheConfig.stable,
  'closing-detail': cacheConfig.stable,
  'loss-summary': cacheConfig.stable,
  'dashboard-weekly': cacheConfig.stable,
  'dashboard-monthly': cacheConfig.stable,
  
  // Static queries (1hr stale, 24hr gc)
  'outlets-list': cacheConfig.static,
  'products-list': cacheConfig.static,
} as const;

// ============================================================================
// DEFAULT QUERY OPTIONS
// ============================================================================

/**
 * Default options for all queries
 */
const defaultQueryOptions: DefaultOptions = {
  queries: {
    // Default cache times (can be overridden per query)
    staleTime: cacheConfig.frequent.staleTime,
    gcTime: cacheConfig.frequent.gcTime,
    
    // Refetch behavior
    refetchOnWindowFocus: true,      // Refetch when window regains focus
    refetchOnReconnect: true,        // Refetch when reconnecting
    refetchOnMount: true,            // Refetch when component mounts
    
    // Retry configuration
    retry: 1,                        // Retry failed requests once
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Error handling
    throwOnError: false,             // Don't throw errors, handle in components
    
    // Network mode - CHANGED for offline support
    networkMode: 'offlineFirst',     // Use cache when offline
  },
  
  mutations: {
    // Retry configuration for mutations
    retry: 0,                        // Don't retry mutations by default
    
    // Error handling
    throwOnError: false,             // Don't throw errors, handle in components
    
    // Network mode - CHANGED for offline support
    networkMode: 'offlineFirst',     // Queue mutations when offline
  },
};

// ============================================================================
// QUERY CLIENT INSTANCE
// ============================================================================

/**
 * Create a new QueryClient instance
 * 
 * Note: In Next.js App Router, we need to create a new instance per request
 * to avoid sharing cache between users
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
  });
}

/**
 * Singleton QueryClient for client-side usage
 * 
 * This is used in the QueryClientProvider
 */
let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new query client
    return createQueryClient();
  } else {
    // Browser: create a new query client if we don't have one yet
    if (!browserQueryClient) {
      browserQueryClient = createQueryClient();
    }
    return browserQueryClient;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get cache config for a specific query type
 */
export function getCacheConfig(queryType: keyof typeof queryCacheConfig) {
  return queryCacheConfig[queryType] || cacheConfig.frequent;
}

/**
 * Check if query should refetch on interval (for real-time data)
 */
export function shouldRefetchOnInterval(queryType: keyof typeof queryCacheConfig): number | false {
  const config = queryCacheConfig[queryType];
  
  // Only refetch on interval for real-time queries
  if (config === cacheConfig.realtime) {
    return 30 * 1000; // 30 seconds
  }
  
  return false;
}
