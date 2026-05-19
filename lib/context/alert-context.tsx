// ============================================================================
// ALERT CONTEXT
// ============================================================================
// File: lib/context/alert-context.tsx
// Description: Global alert state management with TanStack Query & offline support
// Version: 2.0
// Date: 2026-05-08
// ============================================================================

'use client';

import { createContext, useContext, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// TYPES
// ============================================================================

export type Alert = {
  id: string;
  outlet_id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export type AlertContextType = {
  alerts: Alert[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (outletId?: string) => Promise<void>;
  refreshAlerts: () => Promise<void>;
};

// ============================================================================
// CONTEXT
// ============================================================================

const AlertContext = createContext<AlertContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface AlertProviderProps {
  children: React.ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const queryClient = useQueryClient();

  /**
   * Get auth headers
   */
  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const storedUser = localStorage.getItem('donutshop_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user?.id) headers['x-user-id'] = user.id;
        if (user?.role) headers['x-user-role'] = user.role;
      }
    } catch (error) {
      // Silent error - invalid JSON in localStorage
    }

    return headers;
  }, []);

  /**
   * Fetch alerts with TanStack Query
   * 
   * Features:
   * - Offline support (uses cache when offline)
   * - Auto-refetch every 60 seconds
   * - Silent error handling
   * - Persisted to IndexedDB
   */
  const {
    data: alertsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['alerts', 'unread'],
    queryFn: async () => {
      // ✅ Check if online before fetching
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Return cached data or empty state
        throw new Error('Offline');
      }

      const headers = getAuthHeaders();
      const response = await fetch('/api/alerts?is_read=false&limit=10', { headers });

      // User belum login atau session belum tersedia — return empty
      if (response.status === 401) {
        return { items: [], unread_count: 0 };
      }

      if (!response.ok) {
        // Silent error - don't log to console
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();

      if (data.success) {
        return {
          items: data.data.items || [],
          unread_count: data.data.unread_count || 0,
        };
      }

      return { items: [], unread_count: 0 };
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000, // Refetch every 60 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1, // Only retry once
    retryDelay: 1000,
    // ✅ Silent error handling
    onError: () => {
      // Don't log errors - silent failure
    },
    // ✅ Use cache when offline
    networkMode: 'offlineFirst',
  });

  /**
   * Mark single alert as read mutation
   */
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      // ✅ Check if online before mutating
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Offline - cannot mark as read');
      }

      const headers = getAuthHeaders();
      const response = await fetch(`/api/alerts/${id}/read`, {
        method: 'PUT',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to mark alert as read');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch alerts
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: () => {
      // Silent error - don't log to console
    },
    networkMode: 'online', // Only execute when online
  });

  /**
   * Mark all alerts as read mutation
   */
  const markAllAsReadMutation = useMutation({
    mutationFn: async (outletId?: string) => {
      // ✅ Check if online before mutating
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Offline - cannot mark all as read');
      }

      const headers = getAuthHeaders();
      const body = outletId ? JSON.stringify({ outlet_id: outletId }) : undefined;

      const response = await fetch('/api/alerts/read-all', {
        method: 'PUT',
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error('Failed to mark all alerts as read');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch alerts
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: () => {
      // Silent error - don't log to console
    },
    networkMode: 'online', // Only execute when online
  });

  /**
   * Wrapper functions for backward compatibility
   */
  const markAsRead = useCallback(
    async (id: string) => {
      await markAsReadMutation.mutateAsync(id);
    },
    [markAsReadMutation]
  );

  const markAllAsRead = useCallback(
    async (outletId?: string) => {
      await markAllAsReadMutation.mutateAsync(outletId);
    },
    [markAllAsReadMutation]
  );

  const refreshAlerts = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value: AlertContextType = {
    alerts: alertsData?.items || [],
    unreadCount: alertsData?.unread_count || 0,
    isLoading,
    markAsRead,
    markAllAsRead,
    refreshAlerts,
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
    </AlertContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access alert context
 * 
 * @throws Error if used outside AlertProvider
 */
export function useAlerts() {
  const context = useContext(AlertContext);
  
  if (context === undefined) {
    throw new Error('useAlerts must be used within AlertProvider');
  }
  
  return context;
}
