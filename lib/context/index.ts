// ============================================================================
// CONTEXT - BARREL EXPORT
// ============================================================================
// File: lib/context/index.ts
// Description: Central export point for all context providers
// Version: 1.0
// Date: 2026-05-02
// ============================================================================

// Auth context (existing)
export { AuthProvider, useAuth, ProtectedRoute } from './auth-context';

// User context (new)
export { 
  UserProvider, 
  useUser,
  roleHasPermission,
  getUserDisplayName,
  getRoleDisplayName,
  getRoleColor,
} from './user-context';
export type { UserContextValue } from './user-context';

// Alert context (new)
export { AlertProvider, useAlerts } from './alert-context';
export type { Alert, AlertContextType } from './alert-context';
