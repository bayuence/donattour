/**
 * API Route Authentication & Authorization Middleware
 * 
 * Provides helper functions to protect API routes with:
 * - Authentication checks
 * - Role-based access control (RBAC)
 * - Permission checks
 * - Outlet access control
 * 
 * Usage in API routes:
 * ```typescript
 * import { requireAuth, requireRole, requirePermission } from '@/lib/middleware/api-auth';
 * 
 * export async function POST(request: NextRequest) {
 *   // Require authentication
 *   const user = await requireAuth();
 *   
 *   // Require specific role
 *   await requireRole(user, ['admin', 'manager']);
 *   
 *   // Require specific permission
 *   await requirePermission(user, 'production:create');
 *   
 *   // Your API logic here...
 * }
 * ```
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ProductionUserRole } from '@/lib/types/production';
import type { Permission } from '@/lib/utils/auth-helpers';
import {
  hasPermission,
  hasRole,
  canAccessOutlet,
} from '@/lib/utils/auth-helpers';

// ============================================================================
// TYPES
// ============================================================================

export interface ApiAuthUser {
  id: string;
  email: string;
  role: ProductionUserRole;
  outlet_id?: string;
  name?: string;
}

export interface ApiAuthError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

// ============================================================================
// ERROR RESPONSES
// ============================================================================

/**
 * Create unauthorized error response (401)
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse<ApiAuthError> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message,
      },
    },
    { status: 401 }
  );
}

/**
 * Create forbidden error response (403)
 */
export function forbiddenResponse(message: string = 'Forbidden: Insufficient permissions'): NextResponse<ApiAuthError> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message,
      },
    },
    { status: 403 }
  );
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Get current authenticated user from API route
 * 
 * @returns ApiAuthUser or null if not authenticated
 */
export async function getApiAuthUser(): Promise<ApiAuthUser | null> {
  try {
    const supabase = await createClient();

    // Get current session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Fetch user details from database
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('id, name, role, outlet_id')
      .eq('id', user.id)
      .single();

    if (dbError || !userData) {
      console.error('Error fetching user data:', dbError);
      return null;
    }

    const userDataAny = userData as any;

    return {
      id: user.id,
      email: user.email || '',
      role: userDataAny.role as ProductionUserRole,
      outlet_id: userDataAny.outlet_id,
      name: userDataAny.name,
    };
  } catch (error) {
    console.error('Error in getApiAuthUser:', error);
    return null;
  }
}

/**
 * Require authentication in API route
 * 
 * @returns ApiAuthUser
 * @throws NextResponse with 401 if not authenticated
 */
export async function requireAuth(): Promise<ApiAuthUser> {
  const user = await getApiAuthUser();

  if (!user) {
    throw unauthorizedResponse('Authentication required');
  }

  return user;
}

// ============================================================================
// AUTHORIZATION FUNCTIONS
// ============================================================================

/**
 * Require specific role(s) in API route
 * 
 * @param user - Authenticated user
 * @param allowedRoles - Array of allowed roles
 * @throws NextResponse with 403 if user doesn't have required role
 */
export async function requireRole(
  user: ApiAuthUser,
  allowedRoles: ProductionUserRole[]
): Promise<void> {
  if (!hasRole(user.role, allowedRoles)) {
    throw forbiddenResponse(
      `Forbidden: Requires one of the following roles: ${allowedRoles.join(', ')}`
    );
  }
}

/**
 * Require specific permission in API route
 * 
 * @param user - Authenticated user
 * @param permission - Required permission
 * @throws NextResponse with 403 if user doesn't have permission
 */
export async function requirePermission(
  user: ApiAuthUser,
  permission: Permission
): Promise<void> {
  if (!hasPermission(user.role, permission)) {
    throw forbiddenResponse(`Forbidden: Missing required permission: ${permission}`);
  }
}

/**
 * Require outlet access in API route
 * 
 * @param user - Authenticated user
 * @param outlet_id - Outlet ID to check
 * @throws NextResponse with 403 if user cannot access outlet
 */
export async function requireOutletAccess(
  user: ApiAuthUser,
  outlet_id: string
): Promise<void> {
  if (!canAccessOutlet(user, outlet_id)) {
    throw forbiddenResponse('Forbidden: Insufficient outlet permissions');
  }
}

// ============================================================================
// COMBINED VALIDATION FUNCTIONS
// ============================================================================

/**
 * Require authentication and specific role(s)
 * 
 * @param allowedRoles - Array of allowed roles
 * @returns ApiAuthUser
 * @throws NextResponse with 401 or 403 if not authorized
 */
export async function requireAuthWithRole(
  allowedRoles: ProductionUserRole[]
): Promise<ApiAuthUser> {
  const user = await requireAuth();
  await requireRole(user, allowedRoles);
  return user;
}

/**
 * Require authentication and specific permission
 * 
 * @param permission - Required permission
 * @returns ApiAuthUser
 * @throws NextResponse with 401 or 403 if not authorized
 */
export async function requireAuthWithPermission(
  permission: Permission
): Promise<ApiAuthUser> {
  const user = await requireAuth();
  await requirePermission(user, permission);
  return user;
}

/**
 * Require authentication, role, and outlet access
 * 
 * @param allowedRoles - Array of allowed roles
 * @param outlet_id - Outlet ID to check
 * @returns ApiAuthUser
 * @throws NextResponse with 401 or 403 if not authorized
 */
export async function requireAuthWithRoleAndOutlet(
  allowedRoles: ProductionUserRole[],
  outlet_id: string
): Promise<ApiAuthUser> {
  const user = await requireAuth();
  await requireRole(user, allowedRoles);
  await requireOutletAccess(user, outlet_id);
  return user;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get accessible outlet IDs for user
 * 
 * @param user - Authenticated user
 * @returns Array of accessible outlet IDs (empty array means all outlets)
 */
export async function getAccessibleOutletIds(
  user: ApiAuthUser
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
 * Build outlet filter for database queries
 * 
 * @param user - Authenticated user
 * @returns Outlet filter object for Supabase queries
 */
export async function buildOutletFilter(
  user: ApiAuthUser
): Promise<{ outlet_id?: string | string[] }> {
  const accessibleOutlets = await getAccessibleOutletIds(user);

  // Empty array means all outlets (no filter)
  if (accessibleOutlets.length === 0) {
    return {};
  }

  // Single outlet
  if (accessibleOutlets.length === 1) {
    return { outlet_id: accessibleOutlets[0] };
  }

  // Multiple outlets
  return { outlet_id: accessibleOutlets };
}

// ============================================================================
// ERROR HANDLING WRAPPER
// ============================================================================

/**
 * Wrap API route handler with authentication and error handling
 * 
 * @param handler - API route handler function
 * @param options - Authentication options
 * @returns Wrapped handler with auth and error handling
 * 
 * @example
 * ```typescript
 * export const POST = withAuth(
 *   async (request, user) => {
 *     // Your API logic here with authenticated user
 *     return NextResponse.json({ success: true });
 *   },
 *   {
 *     roles: ['admin', 'manager'],
 *     permission: 'production:create',
 *   }
 * );
 * ```
 */
export function withAuth<T = any>(
  handler: (request: Request, user: ApiAuthUser) => Promise<NextResponse<T>>,
  options?: {
    roles?: ProductionUserRole[];
    permission?: Permission;
    requireOutlet?: boolean;
  }
) {
  return async (request: Request): Promise<NextResponse<T | ApiAuthError>> => {
    try {
      // Require authentication
      const user = await requireAuth();

      // Check role if specified
      if (options?.roles) {
        await requireRole(user, options.roles);
      }

      // Check permission if specified
      if (options?.permission) {
        await requirePermission(user, options.permission);
      }

      // Check outlet requirement
      if (options?.requireOutlet && !user.outlet_id) {
        throw forbiddenResponse('User must be assigned to an outlet');
      }

      // Call handler with authenticated user
      return await handler(request, user);
    } catch (error) {
      // If error is already a NextResponse, return it
      if (error instanceof NextResponse) {
        return error;
      }

      // Log unexpected errors
      console.error('Error in withAuth wrapper:', error);

      // Return generic error response
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
        },
        { status: 500 }
      ) as NextResponse<ApiAuthError>;
    }
  };
}
