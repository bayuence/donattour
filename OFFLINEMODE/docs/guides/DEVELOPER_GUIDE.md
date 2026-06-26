# 🛠️ DEVELOPER GUIDE: OFFLINE MODE INTEGRATION

This guide explains how to maintain, extend, and debug the offline-first capability in the Donattour POS system.

## 🏗️ Architecture Overview

The offline capabilities are built on top of:
1. **Next.js PWA + Serwist:** For caching code assets and routes, allowing the POS cash register page to load without an internet connection.
2. **PGLite (PostgreSQL WASM):** A local queryable client-side SQL database used to cache products, payment methods, inventory status, and offline orders.
3. **IndexedDB Queue:** A mutation queue to store transactions performed offline and replay them once connectivity is restored.

---

## 💻 Working with PGLite

To run queries locally on PGLite:

```typescript
import { getPGLite } from '@/lib/db/pglite-client';

async function queryLocalProducts() {
  const db = await getPGLite();
  if (!db) return []; // SSR safety
  
  const result = await db.query('SELECT * FROM products WHERE is_active = true');
  return result.rows;
}
```

### Database Schema Updates
PGLite tables are defined in [pglite-client.ts](file:///c:/Users/bayue/Desktop/donattourSYSTEM/lib/db/pglite-client.ts). 
If you add tables to `prisma/schema.prisma`, make sure to add the corresponding `CREATE TABLE` query inside `initializeSchema(db)` in `pglite-client.ts`.

---

## 🔄 The Sync Cycle

Syncing is handled by [sync.ts](file:///c:/Users/bayue/Desktop/donattourSYSTEM/lib/offline/sync.ts):

1. **Auto-Trigger:** Every 30 seconds, if `navigator.onLine` is true.
2. **Event-Trigger:** Triggered automatically when the window receives the `online` event or when page visibility changes to active.
3. **Queue Replay:** Loops through `STORES.OFFLINE_QUEUE` in IndexedDB, posts mutations to `/api/orders/create` or `/api/inventory/update-stock`, and clears local deductions in localStorage via `clearOfflineDeductions`.

---

## 🔒 Security Best Practices

1. **No Plaintext Passwords:** Do not cache cashier passwords in plaintext. Use SHA-256 client-side hashing (implemented in `lib/auth/offline-auth.ts`) to hash credentials locally before saving them to `localStorage`.
2. **Role Restrictions:** Only authenticated cashiers cached during online mode can perform offline logins.
