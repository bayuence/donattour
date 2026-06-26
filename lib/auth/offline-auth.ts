// ============================================================================
// OFFLINE AUTHENTICATION SERVICE
// ============================================================================
// File: lib/auth/offline-auth.ts
// Description: Secure credentials caching and offline login verification.
// Version: 1.0
// Date: 2026-06-26
// ============================================================================

export interface CachedUser {
  id: string;
  username: string;
  name: string | null;
  email: string;
  role: string;
  outlet_id: string | null;
  password_hash: string; // SHA-256 hashed password for client-side security
  profile?: {
    accessible_menus: string[];
  };
}

const STORAGE_KEY = 'donattour_cached_users';
const SESSION_KEY = 'donutshop_user'; // Matches online session storage key

/**
 * Hash password securely on the client.
 */
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Get all cached users from local storage.
 */
export function getCachedUsers(): Record<string, CachedUser> {
  if (typeof window === 'undefined') return {};
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

/**
 * Cache user credentials securely when logging in online.
 */
export async function cacheUserCredentials(user: any, plaintextPassword: string): Promise<void> {
  if (typeof window === 'undefined' || !user || !user.username) return;
  
  try {
    const hashed = await hashPassword(plaintextPassword);
    const cachedUsers = getCachedUsers();
    
    cachedUsers[user.username.toLowerCase()] = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      outlet_id: user.outlet_id,
      password_hash: hashed,
      profile: user.profile,
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedUsers));
    console.log(`🔒 [OFFLINE AUTH] Cached credentials for: ${user.username}`);
  } catch (error) {
    console.error('❌ [OFFLINE AUTH] Failed to cache user:', error);
  }
}

/**
 * Check if the username is cached for offline access.
 */
export function hasOfflineAccess(username: string): boolean {
  if (!username) return false;
  const cached = getCachedUsers();
  return !!cached[username.toLowerCase()];
}

/**
 * Perform offline login verification.
 */
export async function offlineLogin(username: string, password: string): Promise<any> {
  const cached = getCachedUsers();
  const user = cached[username.toLowerCase()];
  
  if (!user) {
    throw new Error('Username tidak terdaftar untuk akses offline. Silakan login saat online terlebih dahulu.');
  }
  
  const inputHashed = await hashPassword(password);
  if (user.password_hash !== inputHashed) {
    throw new Error('Username atau password salah.');
  }
  
  // Successful verification, create session
  const sessionUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    outlet_id: user.outlet_id,
    profile: user.profile,
    offline: true,
  };
  
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  return sessionUser;
}
