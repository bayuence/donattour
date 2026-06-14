// ============================================================================
// LOCAL STOCK LEDGER
// ============================================================================
// File: lib/offline/local-stock.ts
// Description: Melacak pengurangan stok donat selama mode offline
//              Disimpan di localStorage agar tetap ada meski halaman refresh
// ============================================================================

export interface LocalStockDeduction {
  outletId: string;
  standar: number;  // total pcs standar yang dijual offline (belum sync)
  mini: number;     // total pcs mini yang dijual offline (belum sync)
  transactions: Array<{
    offlineId: string;
    standar: number;
    mini: number;
    timestamp: number;
    amount: number;  // total harga transaksi
  }>;
  lastUpdated: number;
}

const STORAGE_KEY_PREFIX = 'offline_stock_';

function getStorageKey(outletId: string): string {
  return `${STORAGE_KEY_PREFIX}${outletId}`;
}

/**
 * Dapatkan total pengurangan stok offline yang belum di-sync
 */
export function getOfflineDeductions(outletId: string): { standar: number; mini: number } {
  if (typeof window === 'undefined') return { standar: 0, mini: 0 };
  try {
    const raw = localStorage.getItem(getStorageKey(outletId));
    if (!raw) return { standar: 0, mini: 0 };
    const ledger: LocalStockDeduction = JSON.parse(raw);
    return { standar: ledger.standar || 0, mini: ledger.mini || 0 };
  } catch {
    return { standar: 0, mini: 0 };
  }
}

/**
 * Dapatkan ledger lengkap (termasuk list transaksi)
 */
export function getOfflineLedger(outletId: string): LocalStockDeduction | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getStorageKey(outletId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Catat pengurangan stok untuk satu transaksi offline
 */
export function addOfflineDeduction(
  outletId: string,
  standar: number,
  mini: number,
  offlineId: string,
  amount: number = 0
): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getOfflineLedger(outletId);
    const ledger: LocalStockDeduction = existing || {
      outletId,
      standar: 0,
      mini: 0,
      transactions: [],
      lastUpdated: Date.now(),
    };

    ledger.standar += standar;
    ledger.mini += mini;
    ledger.transactions.push({
      offlineId,
      standar,
      mini,
      timestamp: Date.now(),
      amount,
    });
    ledger.lastUpdated = Date.now();

    localStorage.setItem(getStorageKey(outletId), JSON.stringify(ledger));
  } catch (e) {
    console.error('[LOCAL STOCK] Error adding deduction:', e);
  }
}

/**
 * Hapus ledger setelah sync berhasil
 */
export function clearOfflineDeductions(outletId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getStorageKey(outletId));
  } catch (e) {
    console.error('[LOCAL STOCK] Error clearing deductions:', e);
  }
}

/**
 * Hitung qty donat standar & mini dari cart items
 */
export function calcCartStockQty(cartItems: any[]): { standar: number; mini: number } {
  let standar = 0;
  let mini = 0;

  for (const item of cartItems) {
    if (item.type === 'satuan') {
      if (item.ukuran === 'mini' || item.nama?.toLowerCase().includes('mini')) {
        mini += item.qty;
      } else if (
        item.tipe_produk === 'donat_varian' ||
        item.tipe_produk === 'donat_base' ||
        item.ukuran === 'standar'
      ) {
        standar += item.qty;
      }
    } else if (item.type === 'paket') {
      // Hitung dari isi donat paket
      if (Array.isArray(item.isiDonat)) {
        for (const donat of item.isiDonat) {
          if (donat.ukuran === 'mini' || donat.nama?.toLowerCase().includes('mini')) {
            mini++;
          } else {
            standar++;
          }
        }
      }
    } else if (item.type === 'custom') {
      // Custom: berdasarkan ukuranDonat dan kapasitas
      const isCustomMini = item.ukuranDonat === 'mini' || item.jenisMode?.includes('mini');
      const cap = item.kapasitas || item.isiDonat?.length || 0;
      if (isCustomMini) {
        mini += cap;
      } else {
        standar += cap;
      }
    }
    // bundling, box, tambahan, biaya_ekstra tidak memotong stok donat polos
  }

  return { standar, mini };
}
