// ============================================================================
// ALERT CONTEXT
// ============================================================================
// File: lib/context/alert-context.tsx
// Description: Global alert state management with polling
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

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
  markAllAsRead: () => Promise<void>;
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
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Fetch alerts from API
   */
  const fetchAlerts = useCallback(async () => {
    try {
      const storedUser = localStorage.getItem('donutshop_user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (user?.id) headers['x-user-id'] = user.id;
      if (user?.role) headers['x-user-role'] = user.role;

      const response = await fetch('/api/alerts?is_read=false&limit=10', { headers });
      
      // User belum login atau session belum tersedia — skip silently
      if (response.status === 401) {
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        console.error('Failed to fetch alerts:', response.statusText);
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAlerts(data.data.items || []);
        setUnreadCount(data.data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Mark single alert as read
   */
  const markAsRead = useCallback(async (id: string) => {
    try {
      const storedUser = localStorage.getItem('donutshop_user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (user?.id) headers['x-user-id'] = user.id;
      if (user?.role) headers['x-user-role'] = user.role;

      const response = await fetch(`/api/alerts/${id}/read`, { 
        method: 'PUT',
        headers,
      });
      
      if (!response.ok) {
        console.error('Failed to mark alert as read:', response.statusText);
        return;
      }
      
      // Refresh alerts after marking as read
      await fetchAlerts();
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  }, [fetchAlerts]);

  /**
   * Mark all alerts as read
   */
  const markAllAsRead = useCallback(async (outletId?: string) => {
    try {
      const storedUser = localStorage.getItem('donutshop_user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (user?.id) headers['x-user-id'] = user.id;
      if (user?.role) headers['x-user-role'] = user.role;

      const body = outletId ? JSON.stringify({ outlet_id: outletId }) : undefined;
      
      const response = await fetch('/api/alerts/read-all', { 
        method: 'PUT',
        headers,
        body,
      });
      
      if (!response.ok) {
        console.error('Failed to mark all alerts as read:', response.statusText);
        return;
      }
      
      // Refresh alerts after marking all as read
      await fetchAlerts();
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
    }
  }, [fetchAlerts]);

  /**
   * Manually refresh alerts
   */
  const refreshAlerts = useCallback(async () => {
    setIsLoading(true);
    await fetchAlerts();
  }, [fetchAlerts]);

  /**
   * Setup polling on mount
   */
  useEffect(() => {
    // Fetch alerts on mount
    fetchAlerts();
    
    // Poll for new alerts every 60 seconds
    const interval = setInterval(() => {
      fetchAlerts();
    }, 60 * 1000);
    
    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const value: AlertContextType = {
    alerts,
    unreadCount,
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
