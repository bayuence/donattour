/**
 * Protected Component Wrapper
 * 
 * Provides role-based rendering for UI components
 * 
 * Features:
 * - Show/hide components based on user role
 * - Show/hide components based on permissions
 * - Show fallback UI for unauthorized users
 * - Outlet access control
 * 
 * Usage:
 * ```tsx
 * <ProtectedComponent roles={['admin', 'manager']}>
 *   <AdminPanel />
 * </ProtectedComponent>
 * 
 * <ProtectedComponent permission="production:create">
 *   <CreateProductionButton />
 * </ProtectedComponent>
 * 
 * <ProtectedComponent 
 *   roles={['kasir']} 
 *   fallback={<div>Access Denied</div>}
 * >
 *   <POSInterface />
 * </ProtectedComponent>
 * ```
 */

'use client';

import { useUser } from '@/lib/context/user-context';
import type { ProductionUserRole } from '@/lib/types/production';
import type { Permission } from '@/lib/utils/auth-helpers';
import { hasPermission, hasRole, canAccessOutlet } from '@/lib/utils/auth-helpers';

// ============================================================================
// TYPES
// ============================================================================

interface ProtectedComponentProps {
  children: React.ReactNode;
  roles?: ProductionUserRole[];
  permission?: Permission;
  outlet_id?: string;
  fallback?: React.ReactNode;
  showLoading?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Protected Component Wrapper
 * 
 * Renders children only if user has required role/permission
 * Shows fallback UI if user is not authorized
 */
export function ProtectedComponent({
  children,
  roles,
  permission,
  outlet_id,
  fallback = null,
  showLoading = false,
}: ProtectedComponentProps) {
  const { user, isLoading } = useUser();

  // Show loading state
  if (isLoading && showLoading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  // Not authenticated
  if (!user) {
    return <>{fallback}</>;
  }

  // Check role if specified
  if (roles && !hasRole(user.role, roles)) {
    return <>{fallback}</>;
  }

  // Check permission if specified
  if (permission && !hasPermission(user.role, permission)) {
    return <>{fallback}</>;
  }

  // Check outlet access if specified
  if (outlet_id && !canAccessOutlet(user, outlet_id)) {
    return <>{fallback}</>;
  }

  // User is authorized, render children
  return <>{children}</>;
}

// ============================================================================
// SPECIALIZED COMPONENTS
// ============================================================================

/**
 * Admin Only Component
 * Only visible to admin users
 */
export function AdminOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <ProtectedComponent roles={['admin']} fallback={fallback}>
      {children}
    </ProtectedComponent>
  );
}

/**
 * Owner/Manager Only Component
 * Only visible to owner and manager users
 */
export function OwnerManagerOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <ProtectedComponent roles={['owner', 'manager', 'admin']} fallback={fallback}>
      {children}
    </ProtectedComponent>
  );
}

/**
 * Staff Only Component
 * Only visible to staff users (bagian_dapur, kasir, closing_staff)
 */
export function StaffOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  return (
    <ProtectedComponent
      roles={['bagian_dapur', 'kasir', 'closing_staff', 'manager', 'admin']}
      fallback={fallback}
    >
      {children}
    </ProtectedComponent>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to check if user has specific role
 */
export function useHasRole(roles: ProductionUserRole[]): boolean {
  const { user } = useUser();
  
  if (!user) {
    return false;
  }
  
  return hasRole(user.role, roles);
}

/**
 * Hook to check if user has specific permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { user } = useUser();
  
  if (!user) {
    return false;
  }
  
  return hasPermission(user.role, permission);
}

/**
 * Hook to check if user can access outlet
 */
export function useCanAccessOutlet(outlet_id: string): boolean {
  const { user } = useUser();
  
  if (!user) {
    return false;
  }
  
  return canAccessOutlet(user, outlet_id);
}

/**
 * Hook to check if user is admin
 */
export function useIsAdmin(): boolean {
  return useHasRole(['admin']);
}

/**
 * Hook to check if user is owner or manager
 */
export function useIsOwnerOrManager(): boolean {
  return useHasRole(['owner', 'manager', 'admin']);
}

/**
 * Hook to check if user is staff
 */
export function useIsStaff(): boolean {
  return useHasRole(['bagian_dapur', 'kasir', 'closing_staff', 'manager', 'admin']);
}
