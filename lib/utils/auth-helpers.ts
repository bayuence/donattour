/**
 * Authentication Helper Functions
 * 
 * Provides authentication and authorization utilities for production tracking system
 * 
 * Features:
 * - Role-based access control (RBAC)
 * - Permission checking
 * - User context management
 * - Route protection helpers
 */

import { supabase, getCurrentUser, getCurrentSession } from '@/lib/supabase/client';
import type { ProductionUserRole } from '@/lib/types/production';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  role: ProductionUserRole;
  outlet_id?: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface AuthContext {
  user: AuthUser;
  session: any;
  isAuthenticated: boolean;
}

export type Permission =
  | 'production:create'
  | 'production:read'
  | 'production:update'
  | 'production:delete'
  | 'inventory:read'
  | 'sales:create'
  | 'sales:read'
  | 'closing:create'
  | 'closing:read'
  | 'closing:update'
  | 'closing:delete'
  | 'dashboard:read'
  | 'reports:read'
  | 'reports:export'
  | 'alerts:read'
  | 'alerts:manage'
  | 'users:create'
  | 'users:read'
  | 'users:update'
  | 'users:delete'
  | 'topping_errors:create'
  | 'topping_errors:read';

// ============================================================================
// ROLE PERMISSIONS MAPPING
// ============================================================================

const rolePermissions: Record<ProductionUserRole, Permission[]> = {
  admin: [
    'production:create',
    'production:read',
    'production:update',
    'production:delete',
    'inventory:read',
    'sales:create',
    'sales:read',
    'closing:create',
    'closing:read',
    'closing:update',
    'closing:delete',
    'dashboard:read',
    'reports:read',
    'reports:export',
    'alerts:read',
    'alerts:manage',
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'topping_errors:create',
    'topping_errors:read',
  ],
  owner: [
    'production:read',
    'inventory:read',
    'sales:read',
    'closing:read',
    'dashboard:read',
    'reports:read',
    'reports:export',
    'alerts:read',
  ],
  manager: [
    'production:read',
    'inventory:read',
    'sales:read',
    'closing:read',
    'dashboard:read',
    'reports:read',
    'reports:export',
    'alerts:read',
  ],
  bagian_dapur: [
    'production:create',
    'production:read',
    'production:update',
    'inventory:read',
    'alerts:read',
  ],
  kasir: [
    'inventory:read',
    'sales:create',
    'sales:read',
    'topping_errors:create',
    'topping_errors:read',
    'alerts:read',
  ],
  closing_staff: [
    'inventory:read',
    'closing:create',
    'closing:read',
    'alerts:read',
  ],
};

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Get current authenticated user with role and outlet info
 * 
 * @returns AuthUser or null if not authenticated
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }

  // Fetch user details from database
  const { data: userData, error } = await supabase
    .from('users')
    .select('id, name, role, outlet_id')
    .eq('id', user.id)
    .single();

  if (error || !userData) {
    console.error('Error fetching user data:', error);
    return null;
  }

  const userDataAny = userData as any;

  return {
    id: user.id,
    email: user.email || '',
    role: userDataAny.role as ProductionUserRole,
    outlet_id: userDataAny.outlet_id,
    name: userDataAny.name,
    metadata: user.user_metadata,
  };
}

/**
 * Get full authentication context
 * 
 * @returns AuthContext
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const user = await getAuthUser();
  const session = await getCurrentSession();

  if (!user || !session) {
    return null;
  }

  return {
    user,
    session,
    isAuthenticated: true,
  };
}

/**
 * Check if user is authenticated
 * 
 * @returns True if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Get current user with role information
 * Alias for getAuthUser() for convenience
 * 
 * @returns AuthUser with role or null
 */
export async function getCurrentUserWithRole(): Promise<AuthUser | null> {
  return getAuthUser();
}

/**
 * Get user from request headers (custom PIN-based auth flow).
 * Frontend stores user in localStorage and forwards x-user-id / x-user-role headers.
 * This is the preferred auth method for this codebase.
 *
 * @param request - NextRequest object
 * @returns AuthUser-like object or null
 */
export function getUserFromRequest(
  request: { headers: { get(name: string): string | null } }
): { id: string; role: ProductionUserRole; outlet_id?: string } | null {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');
  const outletId = request.headers.get('x-outlet-id');

  if (!userId || !userRole) {
    return null;
  }

  return {
    id: userId,
    role: userRole as ProductionUserRole,
    outlet_id: outletId || undefined,
  };
}

/**
 * Require authentication (throws error if not authenticated)
 * 
 * @returns AuthUser
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

// ============================================================================
// AUTHORIZATION FUNCTIONS
// ============================================================================

/**
 * Check if user has specific permission
 * 
 * @param role - User role
 * @param permission - Permission to check
 * @returns True if user has permission, false otherwise
 */
export function hasPermission(
  role: ProductionUserRole,
  permission: Permission
): boolean {
  const permissions = rolePermissions[role];
  return permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 * 
 * @param role - User role
 * @param permissions - Array of permissions to check
 * @returns True if user has any permission, false otherwise
 */
export function hasAnyPermission(
  role: ProductionUserRole,
  permissions: Permission[]
): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if user has all specified permissions
 * 
 * @param role - User role
 * @param permissions - Array of permissions to check
 * @returns True if user has all permissions, false otherwise
 */
export function hasAllPermissions(
  role: ProductionUserRole,
  permissions: Permission[]
): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Require specific permission (throws error if not authorized)
 * 
 * @param role - User role
 * @param permission - Required permission
 * @throws Error if user doesn't have permission
 */
export function requirePermission(
  role: ProductionUserRole,
  permission: Permission
): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
}

/**
 * Require any of the specified permissions (throws error if not authorized)
 * 
 * @param role - User role
 * @param permissions - Array of required permissions
 * @throws Error if user doesn't have any permission
 */
export function requireAnyPermission(
  role: ProductionUserRole,
  permissions: Permission[]
): void {
  if (!hasAnyPermission(role, permissions)) {
    throw new Error(`Permission denied: requires one of ${permissions.join(', ')}`);
  }
}

/**
 * Check if user has specific role
 * 
 * @param userRole - User's role
 * @param allowedRoles - Array of allowed roles
 * @returns True if user has one of the allowed roles, false otherwise
 */
export function hasRole(
  userRole: ProductionUserRole,
  allowedRoles: ProductionUserRole[]
): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Require specific role (throws error if not authorized)
 * 
 * @param userRole - User's role
 * @param allowedRoles - Array of allowed roles
 * @throws Error if user doesn't have required role
 */
export function requireRole(
  userRole: ProductionUserRole,
  allowedRoles: ProductionUserRole[]
): void {
  if (!hasRole(userRole, allowedRoles)) {
    throw new Error(`Role required: one of ${allowedRoles.join(', ')}`);
  }
}

// ============================================================================
// OUTLET ACCESS CONTROL
// ============================================================================

/**
 * Check if user can access specific outlet
 * 
 * @param user - Auth user
 * @param outlet_id - Outlet ID to check
 * @returns True if user can access outlet, false otherwise
 */
export function canAccessOutlet(
  user: AuthUser,
  outlet_id: string
): boolean {
  // Admin and owner can access all outlets
  if (user.role === 'admin' || user.role === 'owner') {
    return true;
  }

  // Other roles can only access their assigned outlet
  return user.outlet_id === outlet_id;
}

/**
 * Require outlet access (throws error if not authorized)
 * 
 * @param user - Auth user
 * @param outlet_id - Outlet ID to check
 * @throws Error if user cannot access outlet
 */
export function requireOutletAccess(
  user: AuthUser,
  outlet_id: string
): void {
  if (!canAccessOutlet(user, outlet_id)) {
    throw new Error('Access denied: insufficient outlet permissions');
  }
}

/**
 * Get accessible outlet IDs for user
 * 
 * @param user - Auth user
 * @returns Array of accessible outlet IDs (empty array means all outlets)
 */
export async function getAccessibleOutletIds(
  user: AuthUser
): Promise<string[]> {
  // Admin and owner can access all outlets
  if (user.role === 'admin' || user.role === 'owner') {
    return []; // Empty array means all outlets
  }

  // Manager can access managed outlets
  if (user.role === 'manager') {
    // TODO: Implement manager outlet assignments
    // For now, return user's outlet
    return user.outlet_id ? [user.outlet_id] : [];
  }

  // Other roles can only access their assigned outlet
  return user.outlet_id ? [user.outlet_id] : [];
}

/**
 * Filter query by accessible outlets
 * 
 * @param user - Auth user
 * @returns Outlet filter for database queries
 */
export async function getOutletFilter(
  user: AuthUser
): Promise<string | string[] | undefined> {
  const accessibleOutlets = await getAccessibleOutletIds(user);
  
  // Empty array means all outlets (no filter)
  if (accessibleOutlets.length === 0) {
    return undefined;
  }
  
  // Single outlet
  if (accessibleOutlets.length === 1) {
    return accessibleOutlets[0];
  }
  
  // Multiple outlets
  return accessibleOutlets;
}

// ============================================================================
// ROUTE PROTECTION HELPERS
// ============================================================================

/**
 * Route access configuration
 */
export const routeAccess: Record<string, ProductionUserRole[]> = {
  '/dashboard/input-produksi': ['bagian_dapur', 'admin'],
  '/dashboard/kasir': ['kasir', 'admin'],
  '/dashboard/closing-harian': ['closing_staff', 'manager', 'admin'],
  '/dashboard/dashboard-owner': ['owner', 'manager', 'admin'],
  '/dashboard/laporan': ['owner', 'manager', 'admin'],
  '/dashboard/analytics': ['owner', 'manager', 'admin'],
};

/**
 * Check if user can access route
 * 
 * @param path - Route path
 * @param role - User role
 * @returns True if user can access route, false otherwise
 */
export function canAccessRoute(
  path: string,
  role: ProductionUserRole
): boolean {
  const allowedRoles = routeAccess[path];
  
  // If route is not in config, allow access
  if (!allowedRoles) {
    return true;
  }
  
  return allowedRoles.includes(role);
}

/**
 * Require route access (throws error if not authorized)
 * 
 * @param path - Route path
 * @param role - User role
 * @throws Error if user cannot access route
 */
export function requireRouteAccess(
  path: string,
  role: ProductionUserRole
): void {
  if (!canAccessRoute(path, role)) {
    throw new Error(`Access denied: insufficient permissions for ${path}`);
  }
}

/**
 * Get redirect path based on user role
 * 
 * @param role - User role
 * @returns Default dashboard path for role
 */
export function getDefaultDashboardPath(role: ProductionUserRole): string {
  switch (role) {
    case 'admin':
      return '/dashboard/dashboard-owner';
    case 'owner':
      return '/dashboard/dashboard-owner';
    case 'manager':
      return '/dashboard/dashboard-owner';
    case 'bagian_dapur':
      return '/dashboard/input-produksi';
    case 'kasir':
      return '/dashboard/kasir';
    case 'closing_staff':
      return '/dashboard/closing-harian';
    default:
      return '/dashboard';
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate production input permission
 * 
 * @param user - Auth user
 * @param outlet_id - Outlet ID
 * @throws Error if user cannot input production for outlet
 */
export async function validateProductionInputPermission(
  user: AuthUser,
  outlet_id: string
): Promise<void> {
  requirePermission(user.role, 'production:create');
  requireOutletAccess(user, outlet_id);
}

/**
 * Validate closing permission
 * 
 * @param user - Auth user
 * @param outlet_id - Outlet ID
 * @throws Error if user cannot perform closing for outlet
 */
export async function validateClosingPermission(
  user: AuthUser,
  outlet_id: string
): Promise<void> {
  requirePermission(user.role, 'closing:create');
  requireOutletAccess(user, outlet_id);
}

/**
 * Validate kasir operation permission
 * 
 * @param user - Auth user
 * @param outlet_id - Outlet ID
 * @throws Error if user cannot operate kasir for outlet
 */
export async function validateKasirPermission(
  user: AuthUser,
  outlet_id: string
): Promise<void> {
  requirePermission(user.role, 'sales:create');
  requireOutletAccess(user, outlet_id);
}

/**
 * Validate dashboard access permission
 * 
 * @param user - Auth user
 * @throws Error if user cannot access dashboard
 */
export async function validateDashboardPermission(
  user: AuthUser
): Promise<void> {
  requirePermission(user.role, 'dashboard:read');
}

/**
 * Validate report access permission
 * 
 * @param user - Auth user
 * @param canExport - Whether user needs export permission
 * @throws Error if user cannot access reports
 */
export async function validateReportPermission(
  user: AuthUser,
  canExport: boolean = false
): Promise<void> {
  requirePermission(user.role, 'reports:read');
  
  if (canExport) {
    requirePermission(user.role, 'reports:export');
  }
}
