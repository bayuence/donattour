/**
 * Next.js Middleware for Route Protection + Logging
 *
 * This middleware runs on every request to:
 * - Protect routes based on authentication and roles
 * - Add correlation IDs for request tracing
 * - Log all API requests with structured logging
 *
 * Features:
 * - Redirect unauthenticated users to login
 * - Redirect unauthorized users to appropriate dashboard
 * - Allow public routes without authentication
 * - Role-based route protection
 * - Correlation IDs for debugging
 * - Structured logging via Pino
 *
 * Note: This middleware uses Supabase client-side approach
 * For full authentication, we rely on API routes to verify
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { ProductionUserRole } from '@/lib/types/production';
// Note: crypto.randomUUID() uses the Web Crypto API (available in Edge Runtime)
// Do NOT import Node.js 'crypto' module here — it's not supported in Edge Runtime
// Do NOT import '@supabase/supabase-js' here — it uses Node.js crypto internally

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/api/auth',
];

/**
 * API routes that should skip middleware (handled by API route itself)
 */
const API_ROUTES_SKIP = [
  '/api/auth',
];

/**
 * Route access configuration by role
 */
const ROUTE_ACCESS: Record<string, ProductionUserRole[]> = {
  '/dashboard': ['admin', 'owner', 'manager', 'bagian_dapur', 'kasir', 'closing_staff'],
  '/dashboard/input-produksi': ['bagian_dapur', 'manager', 'admin'],
  '/dashboard/kasir': ['kasir', 'manager', 'admin'],
  '/dashboard/closing': ['closing_staff', 'manager', 'admin'],
  '/dashboard/reports': ['owner', 'manager', 'admin'],
  '/dashboard/analytics': ['owner', 'manager', 'admin'],
  '/dashboard/kelola-karyawan': ['admin'],
  '/dashboard/kelola-outlet': ['admin'],
  '/dashboard/kelola-produk': ['admin', 'manager'],
  '/dashboard/pengaturan': ['admin', 'owner', 'manager'],
};

/**
 * Default dashboard paths by role
 */
const DEFAULT_DASHBOARD: Record<ProductionUserRole, string> = {
  admin: '/dashboard',
  owner: '/dashboard',
  manager: '/dashboard',
  bagian_dapur: '/dashboard/input-produksi',
  kasir: '/dashboard/kasir',
  closing_staff: '/dashboard/closing',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if route is public (no authentication required)
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route));
}

/**
 * Check if route should skip middleware
 */
function shouldSkipMiddleware(pathname: string): boolean {
  return API_ROUTES_SKIP.some(route => pathname.startsWith(route));
}

/**
 * Check if user can access route based on role
 */
function canAccessRoute(pathname: string, role: ProductionUserRole): boolean {
  // Find matching route pattern
  const matchingRoute = Object.keys(ROUTE_ACCESS).find(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  // If no matching route, allow access (default behavior)
  if (!matchingRoute) {
    return true;
  }

  // Check if user's role is in allowed roles
  const allowedRoles = ROUTE_ACCESS[matchingRoute];
  return allowedRoles.includes(role);
}

/**
 * Get default dashboard path for user role
 */
function getDefaultDashboardPath(role: ProductionUserRole): string {
  return DEFAULT_DASHBOARD[role] || '/dashboard';
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Generate or retrieve correlation ID for request tracing
  const correlationId = request.headers.get('x-correlation-id') || globalThis.crypto.randomUUID()

  // This app uses a custom PIN-based login (not Supabase Auth cookies).
  // The session lives in localStorage as 'donutshop_user' and is forwarded
  // to API routes via x-user-id / x-user-role headers.
  //
  // Authentication is enforced by:
  // - <ProtectedRoute> in app/(dashboard)/dashboard/layout.tsx for pages
  // - getUserFromRequest() inside each API route for server actions
  //
  // The middleware therefore only adds tracing headers and lets the request
  // through. Doing a cookie check here would falsely redirect every PIN
  // user back to /login (the bug that broke the expenses page earlier).

  const response = NextResponse.next();
  response.headers.set('x-correlation-id', correlationId);
  return response;
}

// ============================================================================
// MIDDLEWARE CONFIG
// ============================================================================

/**
 * Configure which routes should run middleware
 * 
 * Matcher patterns:
 * - /dashboard/:path* - All dashboard routes
 * - /api/:path* - All API routes (except auth)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
