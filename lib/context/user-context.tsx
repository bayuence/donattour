// ============================================================================
// USER CONTEXT
// ============================================================================
// File: lib/context/user-context.tsx
// Description: User session management context (wrapper for AuthContext)
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from './auth-context';
import type { User } from '@/lib/types';

// ============================================================================
// TYPES
// ============================================================================

export interface UserContextValue {
  /**
   * Current authenticated user
   */
  user: User | null;
  
  /**
   * Whether user data is being loaded
   */
  isLoading: boolean;
  
  /**
   * Whether user is authenticated
   */
  isAuthenticated: boolean;
  
  /**
   * User's role
   */
  role: string | null;
  
  /**
   * User's outlet ID (if assigned to specific outlet)
   */
  outletId: string | null;
  
  /**
   * Login function
   */
  login: (username: string, password: string) => Promise<boolean>;
  
  /**
   * Logout function
   */
  logout: () => void;
  
  /**
   * Check if user has specific role
   */
  hasRole: (role: string | string[]) => boolean;
  
  /**
   * Check if user has access to specific outlet
   */
  hasOutletAccess: (outletId: string) => boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const UserContext = createContext<UserContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface UserProviderProps {
  children: ReactNode;
}

/**
 * UserProvider component
 * 
 * Wraps AuthContext to provide a consistent user session interface
 * This is a facade pattern to decouple components from AuthContext implementation
 */
export function UserProvider({ children }: UserProviderProps) {
  const auth = useAuth();

  /**
   * Check if user has specific role(s)
   */
  const hasRole = (role: string | string[]): boolean => {
    if (!auth.user) return false;
    
    const roles = Array.isArray(role) ? role : [role];
    return roles.includes(auth.user.role);
  };

  /**
   * Check if user has access to specific outlet
   */
  const hasOutletAccess = (outletId: string): boolean => {
    if (!auth.user) return false;
    
    // Admin and owner have access to all outlets
    if (auth.user.role === 'admin' || auth.user.role === 'owner') {
      return true;
    }
    
    // Other users only have access to their assigned outlet
    return auth.user.outlet_id === outletId;
  };

  const value: UserContextValue = {
    user: auth.user,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    role: auth.user?.role || null,
    outletId: auth.user?.outlet_id || null,
    login: auth.login,
    logout: auth.logout,
    hasRole,
    hasOutletAccess,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to access user context
 * 
 * @throws Error if used outside UserProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, hasRole } = useUser();
 *   
 *   if (!isAuthenticated) {
 *     return <div>Please login</div>;
 *   }
 *   
 *   return (
 *     <div>
 *       <p>Welcome, {user.name}!</p>
 *       {hasRole('admin') && <AdminPanel />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useUser() {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Role hierarchy for permission checking
 */
const ROLE_HIERARCHY: Record<string, string[]> = {
  admin: ['admin', 'owner', 'manager', 'bagian_dapur', 'kasir', 'closing_staff', 'supervisor'],
  owner: ['owner', 'manager', 'bagian_dapur', 'kasir', 'closing_staff', 'supervisor'],
  manager: ['manager', 'bagian_dapur', 'kasir', 'closing_staff'],
  supervisor: ['supervisor', 'kasir'],
  bagian_dapur: ['bagian_dapur'],
  kasir: ['kasir'],
  closing_staff: ['closing_staff'],
};

/**
 * Check if a role has permission to access another role's features
 */
export function roleHasPermission(userRole: string, requiredRole: string): boolean {
  const allowedRoles = ROLE_HIERARCHY[userRole] || [];
  return allowedRoles.includes(requiredRole);
}

/**
 * Get user display name
 */
export function getUserDisplayName(user: User | null): string {
  if (!user) return 'Guest';
  return user.name || user.username || 'User';
}

/**
 * Get role display name in Indonesian
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    admin: 'Administrator',
    owner: 'Pemilik',
    manager: 'Manager',
    bagian_dapur: 'Bagian Dapur',
    kasir: 'Kasir',
    closing_staff: 'Staff Closing',
    supervisor: 'Supervisor',
    production_manager: 'Manager Produksi',
  };
  
  return roleNames[role] || role;
}

/**
 * Get role color for UI
 */
export function getRoleColor(role: string): string {
  const roleColors: Record<string, string> = {
    admin: 'purple',
    owner: 'blue',
    manager: 'green',
    bagian_dapur: 'orange',
    kasir: 'yellow',
    closing_staff: 'pink',
    supervisor: 'teal',
  };
  
  return roleColors[role] || 'gray';
}
