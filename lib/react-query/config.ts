/**
 * React Query configuration for optimal caching and performance
 * Configured for Production Tracking System requirements
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';
import { getTodayWIB } from '@/lib/utils/timezone'; // ✅ WIB

// Query key factory for consistent key management
export const queryKeys = {
  // Production queries
  production: {
    all: ['production'] as const,
    lists: () => [...queryKeys.production.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.production.lists(), filters] as const,
    details: () => [...queryKeys.production.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.production.details(), id] as const,
  },
  
  // Inventory queries
  inventory: {
    all: ['inventory'] as const,
    validation: () => [...queryKeys.inventory.all, 'validation'] as const,
    stock: (outletId: string, date: string) => [...queryKeys.inventory.validation(), outletId, date] as const,
  },
  
  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    daily: (outletId?: string, date?: string) => [...queryKeys.dashboard.all, 'daily', outletId, date] as const,
  },
  
  // Reports queries
  reports: {
    all: ['reports'] as const,
    period: (filters: Record<string, any>) => [...queryKeys.reports.all, 'period', filters] as const,
  },
  
  // Closing queries
  closing: {
    all: ['closing'] as const,
    check: (outletId: string, date: string) => [...queryKeys.closing.all, 'check', outletId, date] as const,
  },
  
  // Topping errors queries
  toppingErrors: {
    all: ['toppingErrors'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.toppingErrors.all, 'list', filters] as const,
  },
  
  // Alerts queries
  alerts: {
    all: ['alerts'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.alerts.all, 'list', filters] as const,
    unreadCount: () => [...queryKeys.alerts.all, 'unreadCount'] as const,
  },
  
  // User queries
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
  },
} as const;

// Default query options optimized for different data types
const queryDefaults: DefaultOptions = {
  queries: {
    // Global defaults
    staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection (was cacheTime)
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchOnWindowFocus: false, // Disable refetch on window focus for better UX
    refetchOnReconnect: true, // Refetch when connection is restored
    refetchOnMount: true, // Always refetch on component mount
  },
  mutations: {
    retry: false, // Don't retry mutations by default
    onError: (error) => {
      console.error('Mutation error:', error);
      // TODO: Send to error tracking service
    },
  },
};

// Create optimized QueryClient instance
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: queryDefaults,
  });
}

// Cache configuration for different data types
export const cacheConfig = {
  // Real-time data (stock levels, alerts) - short cache
  realTime: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Auto-refetch every minute
  },
  
  // Dashboard data - medium cache
  dashboard: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: false, // Manual refresh only
  },
  
  // Historical data (reports, production history) - long cache
  historical: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: false, // Manual refresh only
  },
  
  // Static data (products, outlets) - very long cache
  static: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchInterval: false, // Manual refresh only
  },
  
  // User data - medium cache with background updates
  user: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: true, // Refetch user data on focus
  },
} as const;

// Cache invalidation helpers
export const invalidateQueries = {
  // Invalidate all production-related queries
  production: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.production.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  },
  
  // Invalidate dashboard after any data change
  dashboard: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  },
  
  // Invalidate stock after production or sales
  stock: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.validation() });
  },
  
  // Invalidate alerts after any significant change
  alerts: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
  },
  
  // Invalidate all data (use sparingly)
  all: (queryClient: QueryClient) => {
    queryClient.invalidateQueries();
  },
};

// Prefetch helpers for better UX
export const prefetchQueries = {
  // Prefetch dashboard data
  dashboard: async (queryClient: QueryClient, outletId?: string, date?: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.daily(outletId, date),
      queryFn: () => fetch(`/api/dashboard/daily?${new URLSearchParams({
        ...(outletId && { outlet_id: outletId }),
        ...(date && { date }),
      })}`).then(res => res.json()),
      ...cacheConfig.dashboard,
    });
  },
  
  // Prefetch stock validation
  stockValidation: async (queryClient: QueryClient, outletId: string, date: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.inventory.stock(outletId, date),
      queryFn: () => fetch(`/api/inventory/validate?outlet_id=${outletId}&date=${date}`)
        .then(res => res.json()),
      ...cacheConfig.realTime,
    });
  },
};

// Optimistic update helpers
export const optimisticUpdates = {
  // Optimistically update production list after creation
  addProduction: (queryClient: QueryClient, newProduction: any, filters: Record<string, any>) => {
    queryClient.setQueryData(
      queryKeys.production.list(filters),
      (old: any) => {
        if (!old?.data?.items) return old;
        return {
          ...old,
          data: {
            ...old.data,
            items: [newProduction, ...old.data.items],
          },
        };
      }
    );
  },
  
  // Optimistically update stock after sale
  updateStock: (queryClient: QueryClient, outletId: string, date: string, soldQty: number, size: string) => {
    queryClient.setQueryData(
      queryKeys.inventory.stock(outletId, date),
      (old: any) => {
        if (!old?.data) return old;
        const key = size === 'standar' ? 'standar_available' : 'mini_available';
        return {
          ...old,
          data: {
            ...old.data,
            [key]: Math.max(0, old.data[key] - soldQty),
          },
        };
      }
    );
  },
  
  // Optimistically mark alert as read
  markAlertRead: (queryClient: QueryClient, alertId: string) => {
    queryClient.setQueriesData(
      { queryKey: queryKeys.alerts.all },
      (old: any) => {
        if (!old?.data?.items) return old;
        return {
          ...old,
          data: {
            ...old.data,
            items: old.data.items.map((alert: any) =>
              alert.id === alertId ? { ...alert, status: 'read' } : alert
            ),
          },
        };
      }
    );
  },
};

// Background sync for critical data
export const backgroundSync = {
  // Setup background sync for stock levels
  setupStockSync: (queryClient: QueryClient, outletId: string) => {
    const today = getTodayWIB(); // ✅ WIB bukan UTC
    
    // Refetch stock every 30 seconds during business hours
    const interval = setInterval(() => {
      const now = new Date();
      const hour = now.getHours();
      
      // Only sync during business hours (6 AM - 10 PM)
      if (hour >= 6 && hour <= 22) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.inventory.stock(outletId, today),
        });
      }
    }, 30 * 1000);
    
    return () => clearInterval(interval);
  },
  
  // Setup background sync for alerts
  setupAlertSync: (queryClient: QueryClient) => {
    // Refetch alerts every 60 seconds
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.alerts.unreadCount(),
      });
    }, 60 * 1000);
    
    return () => clearInterval(interval);
  },
};

// Performance monitoring
export const performanceMonitoring = {
  // Log slow queries for optimization
  logSlowQueries: (queryClient: QueryClient) => {
    queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated' && event.query.state.fetchStatus === 'idle') {
        const duration = Date.now() - (event.query.state.dataUpdatedAt || 0);
        if (duration > 2000) { // Log queries taking more than 2 seconds
          console.warn('Slow query detected:', {
            queryKey: event.query.queryKey,
            duration: `${duration}ms`,
            staleTime: event.query.options.staleTime,
          });
        }
      }
    });
  },
  
  // Monitor cache hit rates
  monitorCacheHits: (queryClient: QueryClient) => {
    let hits = 0;
    let misses = 0;
    
    queryClient.getQueryCache().subscribe((event) => {
      if (event?.type === 'updated') {
        if (event.query.state.dataUpdatedAt && event.query.state.dataUpdatedAt > Date.now() - 1000) {
          misses++;
        } else {
          hits++;
        }
        
        // Log cache performance every 100 queries
        if ((hits + misses) % 100 === 0) {
          const hitRate = (hits / (hits + misses)) * 100;
          console.log(`Cache hit rate: ${hitRate.toFixed(1)}% (${hits} hits, ${misses} misses)`);
        }
      }
    });
  },
};

// Export singleton instance
let queryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = createQueryClient();
    
    // Setup performance monitoring in development
    if (process.env.NODE_ENV === 'development') {
      performanceMonitoring.logSlowQueries(queryClient);
      performanceMonitoring.monitorCacheHits(queryClient);
    }
  }
  
  return queryClient;
}