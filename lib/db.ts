/**
 * lib/db.ts — Barrel file
 *
 * Semua fungsi database dipisah per domain di dalam folder lib/db/
 * File ini meng-re-export semuanya agar semua import yang ada
 * (`import * as db from '@/lib/db'`) tetap berjalan tanpa perubahan.
 */

export * from './db/products'
export * from './db/outlets'
export * from './db/users'
export * from './db/transactions'
export * from './db/production'
export * from './db/inventory'
export * from './db/otr'
export * from './db/storage'

// --- REAL IMPLEMENTATIONS ---

/**
 * Create an order in the database (cash/toko flow)
 * Used by useKasir.prosesBayar
 */
export const createOrder = async (
  orderData: {
    outlet_id: string;
    customer_name: string;
    total_amount: number;
    payment_method: string;
    channel: string;
    paid_amount: number;
    change_amount: number;
    kasir_name?: string;
    kasir_id?: string;
  },
  items: any[],
  outletId: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // Add auth headers
    try {
      const storedUser = localStorage.getItem('donutshop_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user?.id) headers['x-user-id'] = user.id;
        if (user?.role) headers['x-user-role'] = user.role;
      }
    } catch (e) {}

    const response = await fetch('/api/orders/create', {
      method: 'POST',
      headers,
      body: JSON.stringify({ orderData, items, outletId })
    });

    const result = await response.json();
    return result;
  } catch (err: any) {
    console.error('createOrder exception:', err);
    return { success: false, error: err.message || 'Gagal membuat order' };
  }
};

/**
 * Create a transaction record
 */
export const createTransaction = async (...args: any[]) => {
  console.warn('createTransaction: use createOrder for POS transactions');
  return null;
};

/**
 * Get shop settings for an outlet
 */
export const getShopSettings = async (outletId?: string) => {
  if (!outletId) return null;
  try {
    const headers: Record<string, string> = {};
    try {
      const storedUser = localStorage.getItem('donutshop_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user?.id) headers['x-user-id'] = user.id;
        if (user?.role) headers['x-user-role'] = user.role;
      }
    } catch (e) {}

    const response = await fetch(`/api/settings/shop?outlet_id=${outletId}`, { headers });
    if (!response.ok) return null;
    const result = await response.json();
    return result.data;
  } catch {
    return null;
  }
};

/**
 * Update shop settings
 */
export const updateShopSettings = async (data: {
  shop_name?: string;
  tax_rate?: number;
  currency?: string;
  opening_time?: string;
  closing_time?: string;
}) => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const storedUser = localStorage.getItem('donutshop_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user?.id) headers['x-user-id'] = user.id;
        if (user?.role) headers['x-user-role'] = user.role;
      }
    } catch (e) {}

    const response = await fetch('/api/settings/shop', {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    const result = await response.json();
    return result.data ?? result;
  } catch {
    return null;
  }
};
