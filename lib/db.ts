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
