# Context Providers Documentation

## Overview

This directory contains React Context providers for global state management in the Production Tracking System.

## Available Contexts

### 1. AuthContext

**Purpose:** Authentication and session management

**Provider:** `AuthProvider`  
**Hook:** `useAuth()`  
**File:** `lib/context/auth-context.tsx`

**Features:**
- User login/logout
- Session persistence (localStorage)
- Authentication state
- Role-based access control

**Usage:**
```tsx
import { useAuth } from '@/lib/context';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }
  
  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

### 2. UserContext

**Purpose:** User session and permission management (facade for AuthContext)

**Provider:** `UserProvider`  
**Hook:** `useUser()`  
**File:** `lib/context/user-context.tsx`

**Features:**
- User session data
- Role checking (`hasRole`)
- Outlet access checking (`hasOutletAccess`)
- Utility functions for user display

**Usage:**
```tsx
import { useUser } from '@/lib/context';

function DashboardPage() {
  const { user, hasRole, hasOutletAccess } = useUser();
  
  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Show admin panel only for admin */}
      {hasRole('admin') && <AdminPanel />}
      
      {/* Show owner features for admin and owner */}
      {hasRole(['admin', 'owner']) && <OwnerFeatures />}
      
      {/* Check outlet access */}
      {hasOutletAccess('outlet-123') && (
        <OutletData outletId="outlet-123" />
      )}
    </div>
  );
}
```

**Utility Functions:**
```tsx
import { 
  getUserDisplayName, 
  getRoleDisplayName, 
  getRoleColor,
  roleHasPermission 
} from '@/lib/context';

// Get user display name
const displayName = getUserDisplayName(user); // "John Doe"

// Get role display name in Indonesian
const roleName = getRoleDisplayName('bagian_dapur'); // "Bagian Dapur"

// Get role color for UI
const color = getRoleColor('admin'); // "purple"

// Check role permission
const canAccess = roleHasPermission('manager', 'kasir'); // true
```

---

### 3. AlertContext

**Purpose:** Global alert/notification management with polling

**Provider:** `AlertProvider`  
**Hook:** `useAlerts()`  
**File:** `lib/context/alert-context.tsx`

**Features:**
- Alert list management
- Unread count tracking
- Mark as read functionality
- Auto-polling (every 60 seconds)
- Manual refresh

**Usage:**
```tsx
import { useAlerts } from '@/lib/context';

function AlertBell() {
  const { 
    alerts, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead,
    refreshAlerts 
  } = useAlerts();
  
  return (
    <div>
      {/* Bell icon with badge */}
      <button onClick={() => setShowDropdown(!showDropdown)}>
        🔔
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>
      
      {/* Alert dropdown */}
      {showDropdown && (
        <div className="dropdown">
          <div className="header">
            <h3>Notifications ({unreadCount})</h3>
            <button onClick={markAllAsRead}>Mark all as read</button>
          </div>
          
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <ul>
              {alerts.map(alert => (
                <li key={alert.id} onClick={() => markAsRead(alert.id)}>
                  <span className={`severity-${alert.severity}`}>
                    {alert.title}
                  </span>
                  <p>{alert.message}</p>
                </li>
              ))}
            </ul>
          )}
          
          <button onClick={refreshAlerts}>Refresh</button>
        </div>
      )}
    </div>
  );
}
```

**Alert Type:**
```typescript
type Alert = {
  id: string;
  outlet_id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};
```

---

## Provider Hierarchy

The providers are nested in the following order in `app/layout.tsx`:

```tsx
<QueryProvider>           {/* React Query - outermost */}
  <AuthProvider>          {/* Authentication */}
    <UserProvider>        {/* User session facade */}
      <AlertProvider>     {/* Alerts with polling */}
        {children}        {/* App content */}
      </AlertProvider>
    </UserProvider>
  </AuthProvider>
</QueryProvider>
```

**Why this order?**
1. **QueryProvider** - Must be outermost to provide React Query to all components
2. **AuthProvider** - Provides authentication state
3. **UserProvider** - Wraps AuthProvider to provide user session interface
4. **AlertProvider** - Uses user context for outlet-specific alerts

---

## Best Practices

### 1. Always use hooks inside components

❌ **Wrong:**
```tsx
// Outside component - will throw error
const { user } = useUser();

function MyComponent() {
  return <div>{user.name}</div>;
}
```

✅ **Correct:**
```tsx
function MyComponent() {
  // Inside component
  const { user } = useUser();
  return <div>{user.name}</div>;
}
```

### 2. Check authentication before accessing user data

❌ **Wrong:**
```tsx
function MyComponent() {
  const { user } = useUser();
  return <div>{user.name}</div>; // Error if user is null
}
```

✅ **Correct:**
```tsx
function MyComponent() {
  const { user, isAuthenticated } = useUser();
  
  if (!isAuthenticated || !user) {
    return <div>Please login</div>;
  }
  
  return <div>{user.name}</div>;
}
```

### 3. Use role checking for conditional rendering

❌ **Wrong:**
```tsx
function MyComponent() {
  const { user } = useUser();
  
  if (user.role === 'admin' || user.role === 'owner') {
    return <AdminPanel />;
  }
}
```

✅ **Correct:**
```tsx
function MyComponent() {
  const { hasRole } = useUser();
  
  if (hasRole(['admin', 'owner'])) {
    return <AdminPanel />;
  }
}
```

### 4. Handle loading states

❌ **Wrong:**
```tsx
function MyComponent() {
  const { alerts } = useAlerts();
  
  return (
    <ul>
      {alerts.map(alert => <li key={alert.id}>{alert.title}</li>)}
    </ul>
  );
}
```

✅ **Correct:**
```tsx
function MyComponent() {
  const { alerts, isLoading } = useAlerts();
  
  if (isLoading) {
    return <div>Loading alerts...</div>;
  }
  
  return (
    <ul>
      {alerts.map(alert => <li key={alert.id}>{alert.title}</li>)}
    </ul>
  );
}
```

### 5. Cleanup side effects

AlertProvider automatically handles polling cleanup, but if you create custom intervals or subscriptions, always clean them up:

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    // Do something
  }, 1000);
  
  // Cleanup
  return () => clearInterval(interval);
}, []);
```

---

## Testing

### Testing components that use contexts

Use the providers in your test setup:

```tsx
import { render } from '@testing-library/react';
import { AuthProvider, UserProvider, AlertProvider } from '@/lib/context';
import { QueryProvider } from '@/lib/query';

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryProvider>
      <AuthProvider>
        <UserProvider>
          <AlertProvider>
            {ui}
          </AlertProvider>
        </UserProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

// Usage
test('renders user name', () => {
  renderWithProviders(<MyComponent />);
  // ... assertions
});
```

---

## Troubleshooting

### Error: "useAuth must be used within AuthProvider"

**Cause:** Component is trying to use `useAuth()` outside of `AuthProvider`

**Solution:** Make sure your component is rendered inside the provider hierarchy

### Error: "useUser must be used within UserProvider"

**Cause:** Component is trying to use `useUser()` outside of `UserProvider`

**Solution:** Make sure your component is rendered inside the provider hierarchy

### Error: "useAlerts must be used within AlertProvider"

**Cause:** Component is trying to use `useAlerts()` outside of `AlertProvider`

**Solution:** Make sure your component is rendered inside the provider hierarchy

### Alerts not updating

**Cause:** Alert polling might be disabled or API endpoint not working

**Solution:**
1. Check browser console for errors
2. Verify `/api/alerts` endpoint is working
3. Check network tab for failed requests
4. Manually call `refreshAlerts()` to test

### Unread count not updating after marking as read

**Cause:** `markAsRead` automatically calls `fetchAlerts()` to refresh

**Solution:** If still not working, check:
1. API endpoint `/api/alerts/:id/read` is working
2. Response is successful (200 OK)
3. Check browser console for errors

---

## Related Documentation

- [React Query Documentation](../query/README.md)
- [API Routes Documentation](../../app/api/README.md)
- [Design Document](../../.kiro/specs/production-tracking-system/design.md)

---

**Version:** 1.0  
**Last Updated:** 2026-05-02  
**Maintained by:** Production Tracking System Team
