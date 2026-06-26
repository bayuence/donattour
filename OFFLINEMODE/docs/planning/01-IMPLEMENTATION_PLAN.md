# 🚀 DONATTOUR OFFLINE-FIRST IMPLEMENTATION PLAN

**Project:** Donattour POS System  
**Goal:** Full offline capability from login to close  
**Scale:** 500 employees, 5000+ transactions/day, multi-outlet  
**Timeline:** 4-6 weeks  
**Status:** Planning Phase  

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Current Architecture Analysis](#current-architecture-analysis)
3. [Target Architecture](#target-architecture)
4. [Technical Stack](#technical-stack)
5. [Implementation Phases](#implementation-phases)
6. [Detailed Implementation Steps](#detailed-implementation-steps)
7. [Data Synchronization Strategy](#data-synchronization-strategy)
8. [Conflict Resolution](#conflict-resolution)
9. [Security Considerations](#security-considerations)
10. [Testing Strategy](#testing-strategy)
11. [Rollout Plan](#rollout-plan)
12. [Risk Management](#risk-management)
13. [Success Metrics](#success-metrics)
14. [Maintenance & Support](#maintenance--support)

---

## 🎯 EXECUTIVE SUMMARY

### Current State
- **Dependency:** 100% online (Supabase for database operations)
- **Payment System:** Custom payment methods (managed via admin menu)
- **Problem:** Cannot operate during internet outages
- **Impact:** Lost sales, frustrated customers, blocked operations

### Target State
- **Capability:** 100% offline operation
- **Sync:** Automatic bidirectional sync when online
- **Benefits:** Zero downtime, improved UX, data resilience
- **Trade-offs:** Increased complexity, storage requirements, sync overhead

### Key Deliverables
✅ PWA with full offline support  
✅ Local database (PGLite) with complete schema  
✅ Bidirectional sync engine  
✅ Conflict resolution system  
✅ Offline-first authentication  
✅ Queue management system  
✅ Comprehensive testing suite  

---

## 🏗️ CURRENT ARCHITECTURE ANALYSIS

### External Dependencies
```
┌─────────────────────────────────────────────┐
│  CURRENT ONLINE-ONLY ARCHITECTURE           │
├─────────────────────────────────────────────┤
│  Frontend (Next.js 15 App Router)           │
│       ↓                                     │
│  API Routes (/api/*)                        │
│       ↓                                     │
│  Supabase Client                            │
│       ↓                                     │
│  PostgreSQL (Supabase Cloud)                │
│                                             │
│  External Services:                         │
│  ├─ Google Sheets (Export - Optional)      │
│  └─ Vercel (Hosting)                       │
│                                             │
│  Payment System:                            │
│  └─ Custom payment_methods table           │
│      (Cash, QRIS, Transfer, etc.)          │
└─────────────────────────────────────────────┘
```

### Current Offline Infrastructure (60% Complete)

✅ **Already Implemented:**
- `lib/offline/indexeddb.ts` - IndexedDB wrapper
- `lib/offline/queue.ts` - Offline queue system
- `lib/offline/sync.ts` - Sync manager
- `lib/offline/persister.ts` - React Query persistence
- `lib/offline/local-stock.ts` - Local stock tracking

❌ **Missing for Full Offline:**
- Offline authentication & session management
- Local database (complete schema)
- Service Worker (PWA)
- Conflict resolution engine
- Bidirectional sync
- Dynamic route caching
- Offline UI indicators

### Database Schema (Prisma)
**Tables:** 13 core models
- `users` - Team members & authentication
- `outlets` - Store locations
- `products` - Product catalog with pricing
- `inventory` - Stock per outlet
- `orders` - Transactions
- `order_items` - Line items
- `production` - Production tracking
- `expenses` - Financial tracking
- `audit_logs` - Change tracking
- `payment_methods` - **Custom payment configurations** (Cash, QRIS, Transfer, etc.)
- `receipt_settings` - Receipt configurations
- `saga_logs` - Transaction logs
- `channel_stock_deductions` - Stock movement history

#### Payment Methods System (Custom - No Third Party)

**Table: `payment_methods`**
```sql
CREATE TABLE payment_methods (
  id             UUID PRIMARY KEY,
  name           TEXT NOT NULL,           -- e.g., "BCA Transfer", "QRIS DANA", "Tunai"
  type           TEXT NOT NULL,           -- e.g., "cash", "transfer", "qris", "ewallet"
  account_number TEXT,                    -- Optional: account/phone number
  account_name   TEXT,                    -- Optional: account holder name
  logo_url       TEXT,                    -- Optional: logo image
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);
```

**Features:**
- ✅ Admin can create custom payment methods via "Kelola Metode Pembayaran" menu
- ✅ Kasir selects from active payment methods during checkout
- ✅ No external payment gateway dependency (Midtrans removed)
- ✅ Manual payment recording only
- ✅ Flexible: supports cash, transfer, QRIS, e-wallet, etc.

**Flow:**
1. Admin creates payment methods (e.g., "BCA Transfer", "QRIS DANA")
2. Kasir at POS selects payment method from dropdown
3. Order is recorded with `payment_method` = method ID (UUID)
4. Receipt shows payment method name

---

## 🎯 TARGET ARCHITECTURE

```
┌──────────────────────────────────────────────────────────┐
│         OFFLINE-FIRST HYBRID ARCHITECTURE                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────────────────────────────────┐        │
│  │  UI Layer (React 19 + Next.js 15)          │        │
│  │  - Offline-aware components                 │        │
│  │  - Loading/syncing states                   │        │
│  │  - Error boundaries                         │        │
│  └─────────────────────────────────────────────┘        │
│                    ↕                                     │
│  ┌─────────────────────────────────────────────┐        │
│  │  Service Worker (Serwist)                   │        │
│  │  - Asset caching                            │        │
│  │  - Dynamic route fallback                   │        │
│  │  - Network-first strategies                 │        │
│  └─────────────────────────────────────────────┘        │
│                    ↕                                     │
│  ┌─────────────────────────────────────────────┐        │
│  │  Data Access Layer                          │        │
│  │  ├─ Online:  Supabase API                  │        │
│  │  └─ Offline: PGLite (Local DB)             │        │
│  └─────────────────────────────────────────────┘        │
│                    ↕                                     │
│  ┌─────────────────────────────────────────────┐        │
│  │  Sync Engine                                │        │
│  │  - Differential sync (only changes)         │        │
│  │  - Conflict detection & resolution          │        │
│  │  - Priority queue (orders > production)   │        │
│  │  - Retry with exponential backoff          │        │
│  └─────────────────────────────────────────────┘        │
│                    ↕                                     │
│  ┌─────────────────────────────────────────────┐        │
│  │  Storage Layer                              │        │
│  │  ├─ PGLite (50-100MB) - Main data          │        │
│  │  ├─ IndexedDB (20MB) - Cache & Queue       │        │
│  │  └─ LocalStorage (5MB) - Session & Config  │        │
│  └─────────────────────────────────────────────┘        │
│                    ↕                                     │
│  ┌─────────────────────────────────────────────┐        │
│  │  Network Layer (When Online)                │        │
│  │  ├─ Supabase PostgreSQL (Primary DB)       │        │
│  │  └─ Google Sheets (Optional export)        │        │
│  └─────────────────────────────────────────────┘        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Offline-First Mindset**
   - Assume network is unreliable
   - Local operations always succeed instantly
   - Sync in background when possible

2. **Progressive Enhancement**
   - Core features work offline
   - Advanced features require online (reports, analytics)
   - Graceful degradation when offline

3. **Data Consistency**
   - Single source of truth (Supabase when online)
   - Eventual consistency model
   - Conflict resolution strategies
   - Audit trail for all changes

4. **Performance**
   - Local-first reads (instant UI)
   - Optimistic updates
   - Background sync
   - Lazy loading for large datasets

---

## 🛠️ TECHNICAL STACK

### Core Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Frontend** | Next.js | 15.5.12 | React framework with App Router |
| **UI Framework** | React | 19.0.0 | Component library |
| **State Management** | TanStack Query | 5.100.7 | Data fetching & caching |
| **Local Database** | PGLite | Latest | PostgreSQL in browser |
| **Service Worker** | Serwist | Latest | PWA & caching |
| **Primary Database** | Supabase (PostgreSQL) | Latest | Cloud database |
| **ORM** | Prisma | 7.8.0 | Database client & migrations |
| **Storage** | IndexedDB | Native | Browser storage |
| **Type Safety** | TypeScript | 5.7.0 | Type checking |

### Additional Libraries

```json
{
  "dependencies": {
    "@serwist/next": "^10.0.0",
    "@electric-sql/pglite": "^0.2.0",
    "uuid": "^11.0.0",
    "dexie": "^4.0.0",
    "idb-keyval": "^6.2.0"
  },
  "devDependencies": {
    "@types/uuid": "^10.0.0"
  }
}
```

### Browser Requirements

| Browser | Minimum Version | Features Required |
|---------|----------------|-------------------|
| Chrome/Edge | 90+ | Service Workers, IndexedDB, WebAssembly |
| Firefox | 88+ | Service Workers, IndexedDB, WebAssembly |
| Safari | 14+ | Service Workers, IndexedDB (limited) |
| Mobile Chrome | 90+ | Full support |
| Mobile Safari | 14+ | Limited storage (1GB max) |

**Critical:** Safari iOS has 1GB storage limit - monitor usage!

---

## 📅 IMPLEMENTATION PHASES

### Phase 1: Foundation (Week 1-2) 🏗️

**Goal:** Setup PWA infrastructure and local database

**Deliverables:**
- ✅ Install and configure Serwist
- ✅ Create Service Worker with caching strategies
- ✅ Setup PWA manifest
- ✅ Initialize PGLite with Prisma schema
- ✅ Create offline detection system
- ✅ Build sync status indicator UI

**Success Criteria:**
- PWA installable on all devices
- Local database operational
- Basic offline detection working

---

### Phase 2: Offline Authentication (Week 2) 🔐

**Goal:** Enable login and session management offline

**Deliverables:**
- ✅ Implement credential caching (encrypted)
- ✅ Create offline login flow
- ✅ Build session persistence layer
- ✅ Add PIN-based quick login (fallback)
- ✅ Implement token refresh strategy

**Success Criteria:**
- Users can login without internet
- Session persists across browser restarts
- Secure credential storage
- Automatic re-authentication when online

---

### Phase 3: Core Offline Features (Week 3-4) 💼

**Goal:** Make critical business operations work offline

#### 3A. POS/Kasir Offline (Priority 1)
- ✅ Cache product catalog locally
- ✅ **Cache payment methods list** (from `payment_methods` table)
- ✅ Offline order creation with UUID
- ✅ Local inventory deduction
- ✅ Queue orders for sync
- ✅ Offline receipt generation
- ✅ Manual payment entry (select from cached methods)

#### 3B. Production Tracking Offline (Priority 2)
- ✅ Cache production forms
- ✅ Offline production batch creation
- ✅ Local waste tracking
- ✅ Queue production records for sync

#### 3C. Inventory Management Offline (Priority 3)
- ✅ View inventory (cached)
- ✅ Local stock adjustments
- ✅ Conflict detection for concurrent edits
- ✅ Queue inventory updates

**Success Criteria:**
- All core operations work without internet
- Data queued properly for sync
- No blocking errors in offline mode

---

### Phase 4: Sync Engine (Week 4-5) 🔄

**Goal:** Implement robust bidirectional synchronization

**Deliverables:**
- ✅ Differential sync algorithm (only changes)
- ✅ Conflict detection mechanism
- ✅ Conflict resolution strategies
- ✅ Priority-based sync queue
- ✅ Batch sync for efficiency
- ✅ Retry with exponential backoff
- ✅ Sync progress indicators
- ✅ Manual sync trigger
- ✅ Sync logs and debugging

**Sync Priority Order:**
1. Orders (critical - revenue)
2. Payment methods (if admin adds new methods)
3. Inventory updates (prevent overselling)
4. Production records
5. Expenses
6. Audit logs
7. Reports (lowest priority)

**Success Criteria:**
- Sync completes within 30 seconds for 100 orders
- No data loss during sync
- Conflicts resolved automatically (90% cases)
- Clear sync status for users

---

### Phase 5: Reports & Analytics (Week 5) 📊

**Goal:** Enable offline viewing of reports

**Deliverables:**
- ✅ Cache recent reports (7-30 days)
- ✅ Offline report generation from local data
- ✅ Export to Excel offline (xlsx library)
- ✅ PDF generation offline (jspdf)
- ✅ Analytics dashboard (read-only offline)

**Success Criteria:**
- Recent reports viewable offline
- Export works without internet
- Data refreshes when online

---

### Phase 6: Testing & QA (Week 6) 🧪

**Goal:** Comprehensive testing across scenarios

**Testing Scope:**
- ✅ Unit tests (Jest)
- ✅ Integration tests
- ✅ E2E tests (Playwright/Cypress)
- ✅ Offline scenario testing
- ✅ Sync conflict testing
- ✅ Performance testing
- ✅ Security testing
- ✅ Browser compatibility testing
- ✅ Load testing (5000 txn/day simulation)

**Test Scenarios:**
1. **Happy Path:** Full offline → online sync
2. **Network Loss:** Mid-transaction disconnect
3. **Concurrent Edits:** Multiple devices editing same data
4. **Storage Full:** Handle quota exceeded
5. **Long Offline:** 24+ hours offline operation
6. **Sync Failure:** Network errors during sync
7. **Partial Sync:** Some records succeed, some fail

**Success Criteria:**
- 95%+ test coverage
- Zero critical bugs
- Performance benchmarks met

---

### Phase 7: Rollout & Training (Week 7) 🚀

**Goal:** Deploy to production with user training

**Deliverables:**
- ✅ Staged rollout plan
- ✅ User training materials
- ✅ Video tutorials
- ✅ Quick reference guide
- ✅ Support hotline setup
- ✅ Monitoring dashboard
- ✅ Incident response plan

**Rollout Stages:**
1. **Pilot (1-2 outlets)** - Week 7 Day 1-3
2. **Beta (10% outlets)** - Week 7 Day 4-5
3. **Production (all outlets)** - Week 8

**Success Criteria:**
- Zero downtime during rollout
- <1% incident rate
- Positive user feedback

---

## 🔧 DETAILED IMPLEMENTATION STEPS

### 1. Setup Serwist & PWA

#### Install Dependencies
```bash
npm install --save-dev @serwist/next
npm install uuid
```

#### Create Service Worker (`src/app/sw.ts`)
```typescript
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    ignoreURLParametersMatching: [/.*/],
  },
  
  // Fallback pages for offline
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
  
  runtimeCaching: defaultCache,
});

// Precache critical routes
const criticalRoutes = [
  "/",
  "/login",
  "/dashboard",
  "/dashboard/kasir",
  "/dashboard/input-produksi",
  "/offline",
] as const;

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all(
      criticalRoutes.map((route) =>
        serwist.handleRequest({
          request: new Request(route),
          event,
        })
      )
    )
  );
});

serwist.addEventListeners();
```

#### Update `next.config.js`
```javascript
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  additionalPrecacheEntries: [
    { url: '/offline', revision: '1' },
  ],
});

export default withSerwist({
  // ... existing config
});
```

#### Create PWA Manifest (`public/manifest.json`)
```json
{
  "name": "Donattour POS",
  "short_name": "Donattour",
  "description": "Offline-capable POS system for donut stores",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#f97316",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### Create Offline Fallback Page (`app/offline/page.tsx`)
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setTimeout(() => router.back(), 1000);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <WifiOff className="w-24 h-24 mx-auto text-gray-400 mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Mode Offline
        </h1>
        <p className="text-gray-600 mb-8">
          Anda sedang offline. Aplikasi akan tetap berfungsi untuk operasi dasar.
        </p>
        {isOnline ? (
          <div className="text-green-600 font-semibold">
            ✓ Koneksi kembali! Mengalihkan...
          </div>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <RefreshCw className="w-5 h-5" />
            Coba Lagi
          </button>
        )}
      </div>
    </div>
  );
}
```

---

### 2. Setup PGLite Local Database

#### Install PGLite
```bash
npm install @electric-sql/pglite
```

#### Create Database Client (`lib/db/pglite-client.ts`)
```typescript
import { PGlite } from '@electric-sql/pglite';

let db: PGlite | null = null;

export async function getPGLite(): Promise<PGlite> {
  if (db) return db;
  
  // Initialize PGlite with IndexedDB persistence
  db = new PGlite('idb://donattour-db', {
    debug: process.env.NODE_ENV === 'development' ? 1 : 0,
  });

  // Run initial schema setup
  await initializeSchema(db);
  
  return db;
}

async function initializeSchema(db: PGlite) {
  // Create all tables from Prisma schema
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      role TEXT NOT NULL,
      outlet_id TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS outlets (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      alamat TEXT,
      phone TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      tipe_produk TEXT,
      ukuran TEXT,
      is_donat BOOLEAN DEFAULT false,
      ukuran_donat TEXT,
      hpp_base_donat DECIMAL(15, 2),
      hpp_topping DECIMAL(15, 2),
      hpp_total DECIMAL(15, 2),
      harga_jual DECIMAL(15, 2),
      margin_amount DECIMAL(15, 2),
      margin_percent DECIMAL(5, 2),
      harga INTEGER,
      hpp INTEGER,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      outlet_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(outlet_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      outlet_id TEXT NOT NULL,
      kasir_id TEXT,
      customer_name TEXT DEFAULT 'Umum',
      total_amount INTEGER NOT NULL,
      paid_amount INTEGER,
      change_amount INTEGER,
      payment_method TEXT NOT NULL,
      payment_status TEXT DEFAULT 'unpaid',
      status TEXT DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT,
      quantity INTEGER DEFAULT 1,
      unit_price INTEGER NOT NULL,
      subtotal INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS production (
      id TEXT PRIMARY KEY,
      outlet_id TEXT NOT NULL,
      tanggal TIMESTAMP NOT NULL,
      jam_mulai TEXT,
      jam_selesai TEXT,
      standar INTEGER,
      mini INTEGER,
      waste_standar INTEGER,
      waste_mini INTEGER,
      total_produksi INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      outlet_id TEXT NOT NULL,
      tanggal TIMESTAMP NOT NULL,
      kategori TEXT DEFAULT 'operasional',
      keterangan TEXT NOT NULL,
      jumlah INTEGER NOT NULL,
      bukti_url TEXT,
      receipt_url TEXT,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      account_number TEXT,
      account_name TEXT,
      logo_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS receipt_settings (
      id TEXT PRIMARY KEY,
      outlet_id TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      show_logo BOOLEAN DEFAULT false,
      header_text TEXT,
      address_text TEXT,
      footer_text TEXT,
      tax_info TEXT,
      social_media TEXT,
      wifi_password TEXT,
      paper_width TEXT DEFAULT '58mm',
      enable_auto_cut BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      outlet_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      old_values JSONB,
      new_values JSONB,
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Sync metadata table
    CREATE TABLE IF NOT EXISTS _sync_metadata (
      id SERIAL PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      last_synced_at TIMESTAMP,
      sync_status TEXT DEFAULT 'pending',
      conflict_data JSONB,
      retry_count INTEGER DEFAULT 0,
      UNIQUE(table_name, record_id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_users_outlet_id ON users(outlet_id);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_inventory_outlet_id ON inventory(outlet_id);
    CREATE INDEX IF NOT EXISTS idx_orders_outlet_id ON orders(outlet_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_production_outlet_id ON production(outlet_id);
    CREATE INDEX IF NOT EXISTS idx_production_tanggal ON production(tanggal);
    CREATE INDEX IF NOT EXISTS idx_expenses_outlet_id ON expenses(outlet_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_tanggal ON expenses(tanggal);
  `);

  console.log('✅ PGLite schema initialized');
}

export async function closePGLite() {
  if (db) {
    await db.close();
    db = null;
  }
}
```

#### Create Data Access Layer (`lib/db/offline-dal.ts`)
```typescript
import { getPGLite } from './pglite-client';
import { v4 as uuidv4 } from 'uuid';

// Orders
export async function createOfflineOrder(orderData: any, items: any[]) {
  const db = await getPGLite();
  const orderId = uuidv4();
  
  await db.transaction(async (tx) => {
    // Insert order
    await tx.query(`
      INSERT INTO orders (
        id, outlet_id, kasir_id, customer_name, 
        total_amount, paid_amount, change_amount,
        payment_method, payment_status, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      orderId,
      orderData.outlet_id,
      orderData.kasir_id,
      orderData.customer_name || 'Umum',
      orderData.total_amount,
      orderData.paid_amount,
      orderData.change_amount,
      orderData.payment_method,
      'paid',
      'completed'
    ]);

    // Insert order items
    for (const item of items) {
      await tx.query(`
        INSERT INTO order_items (
          id, order_id, product_id, product_name,
          quantity, unit_price, subtotal
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(),
        orderId,
        item.product_id,
        item.product_name,
        item.quantity,
        item.unit_price,
        item.subtotal
      ]);

      // Update inventory
      await tx.query(`
        UPDATE inventory 
        SET quantity = quantity - $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE outlet_id = $2 AND product_id = $3
      `, [item.quantity, orderData.outlet_id, item.product_id]);
    }

    // Mark for sync
    await tx.query(`
      INSERT INTO _sync_metadata (table_name, record_id, sync_status)
      VALUES ('orders', $1, 'pending')
    `, [orderId]);
  });

  return { success: true, orderId };
}

// Products
export async function getOfflineProducts(outletId: string) {
  const db = await getPGLite();
  const result = await db.query(`
    SELECT * FROM products WHERE is_active = true
  `);
  return result.rows;
}

// Payment Methods (untuk kasir offline)
export async function getOfflinePaymentMethods() {
  const db = await getPGLite();
  const result = await db.query(`
    SELECT * FROM payment_methods WHERE is_active = true
    ORDER BY name ASC
  `);
  return result.rows;
}

// Inventory
export async function getOfflineInventory(outletId: string) {
  const db = await getPGLite();
  const result = await db.query(`
    SELECT i.*, p.nama as product_name
    FROM inventory i
    LEFT JOIN products p ON i.product_id = p.id
    WHERE i.outlet_id = $1
  `, [outletId]);
  return result.rows;
}

// Production
export async function createOfflineProduction(data: any) {
  const db = await getPGLite();
  const prodId = uuidv4();
  
  await db.query(`
    INSERT INTO production (
      id, outlet_id, tanggal, jam_mulai, jam_selesai,
      standar, mini, waste_standar, waste_mini, total_produksi
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    prodId, data.outlet_id, data.tanggal, data.jam_mulai,
    data.jam_selesai, data.standar, data.mini,
    data.waste_standar, data.waste_mini, data.total_produksi
  ]);

  // Mark for sync
  await db.query(`
    INSERT INTO _sync_metadata (table_name, record_id, sync_status)
    VALUES ('production', $1, 'pending')
  `, [prodId]);

  return { success: true, prodId };
}
```

---

### 3. Offline Authentication System

#### Create Auth Provider (`lib/auth/offline-auth.ts`)
```typescript
import { getPGLite } from '../db/pglite-client';

interface CachedUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  outlet_id: string | null;
  pin?: string; // Encrypted PIN for offline login
}

const STORAGE_KEY = 'donattour_cached_users';
const SESSION_KEY = 'donattour_session';

// Cache user credentials when online
export async function cacheUserCredentials(user: CachedUser) {
  const cached = getCachedUsers();
  cached[user.email] = {
    ...user,
    cached_at: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
}

// Get cached users
function getCachedUsers(): Record<string, any> {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
}

// Offline login with PIN
export async function offlineLogin(email: string, pin: string) {
  const cached = getCachedUsers();
  const user = cached[email];

  if (!user) {
    throw new Error('User tidak ditemukan di cache. Harap login online terlebih dahulu.');
  }

  // Verify PIN (in production, use proper hashing)
  const hashedPin = await hashPin(pin);
  if (user.pin !== hashedPin) {
    throw new Error('PIN salah');
  }

  // Create session
  const session = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      outlet_id: user.outlet_id,
    },
    created_at: Date.now(),
    offline: true,
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

// Simple PIN hashing (use bcrypt in production)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Get current session
export function getSession() {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
}

// Logout
export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

// Check if user has offline access
export function hasOfflineAccess(email: string): boolean {
  const cached = getCachedUsers();
  return !!cached[email];
}
```

#### Update Login Page (`app/login/page.tsx`)
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { offlineLogin, hasOfflineAccess } from '@/lib/auth/offline-auth';
import { WifiOff } from 'lucide-react';

export default function LoginPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleOfflineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await offlineLogin(email, pin);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-amber-800">Mode Offline Aktif</span>
          </div>
        )}

        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            {isOnline ? 'Login' : 'Login Offline'}
          </h2>
          <p className="mt-2 text-gray-600">
            {isOnline 
              ? 'Masuk ke akun Anda' 
              : 'Gunakan PIN untuk login offline'}
          </p>
        </div>

        <form onSubmit={handleOfflineLogin} className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {isOnline ? 'Password' : 'PIN (Offline)'}
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              maxLength={isOnline ? undefined : 6}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            {isOnline ? 'Login' : 'Login Offline'}
          </button>
        </form>

        {!isOnline && !hasOfflineAccess(email) && email && (
          <div className="text-sm text-amber-600 text-center">
            ⚠️ Anda belum pernah login dengan akun ini. Harap login online terlebih dahulu.
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## � PAYMENT METHODS MANAGEMENT (OFFLINE-CAPABLE)

### System Overview

**Architecture:** Custom payment methods system (NO external gateway)

```
┌────────────────────────────────────────────────┐
│       PAYMENT METHODS FLOW                     │
├────────────────────────────────────────────────┤
│                                                │
│  Admin Actions (Kelola Metode Pembayaran):    │
│  ├─ Create payment method                     │
│  │  (Name, Type, Account Number, Logo)        │
│  ├─ Update payment method                     │
│  ├─ Deactivate/Delete method                  │
│  └─ Saved to: payment_methods table           │
│                                                │
│  Sync to Local (When Kasir Online):           │
│  ├─ Fetch all active payment methods          │
│  ├─ Cache to PGLite                           │
│  └─ Available for offline use                 │
│                                                │
│  Kasir Usage (Offline-Ready):                 │
│  ├─ Select from cached payment methods        │
│  ├─ Create order with payment_method ID       │
│  ├─ Queue order for sync                      │
│  └─ Print receipt with method name            │
│                                                │
└────────────────────────────────────────────────┘
```

### Payment Method Types

| Type | Example | Account Info | Notes |
|------|---------|--------------|-------|
| `cash` | Tunai | N/A | Direct cash payment |
| `transfer` | BCA Transfer, Mandiri | Account number + name | Manual bank transfer |
| `qris` | QRIS DANA, QRIS OVO | Merchant ID (optional) | Static QRIS code |
| `ewallet` | GoPay, ShopeePay | Phone number | Manual confirmation |
| `card` | Debit/Credit Card | N/A | Manual card swipe |
| `other` | Custom | Varies | Any other method |

### Offline Implementation

#### Cache Payment Methods on Login
```typescript
// lib/sync/cache-payment-methods.ts
import { getPGLite } from '../db/pglite-client';
import { getPaymentMethods } from '../db/payment-methods';

export async function cachePaymentMethodsOffline() {
  // Fetch from Supabase (when online)
  const methods = await getPaymentMethods();
  
  // Save to PGLite
  const db = await getPGLite();
  
  await db.transaction(async (tx) => {
    // Clear existing
    await tx.query('DELETE FROM payment_methods');
    
    // Insert all active methods
    for (const method of methods) {
      if (!method.is_active) continue;
      
      await tx.query(`
        INSERT INTO payment_methods (
          id, name, type, account_number, account_name, 
          logo_url, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        method.id,
        method.name,
        method.type,
        method.account_number,
        method.account_name,
        method.logo_url,
        true
      ]);
    }
  });
  
  console.log(`✅ Cached ${methods.length} payment methods offline`);
}
```

#### Use Cached Methods in POS
```typescript
// components/pos/offline-payment-selector.tsx
'use client';

import { useState, useEffect } from 'react';
import { getOfflinePaymentMethods } from '@/lib/db/offline-dal';

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  logo_url?: string;
}

export function OfflinePaymentSelector({ 
  onSelect 
}: { 
  onSelect: (methodId: string) => void 
}) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    getOfflinePaymentMethods().then(setMethods);
  }, []);

  const handleSelect = (methodId: string) => {
    setSelected(methodId);
    onSelect(methodId);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold">Metode Pembayaran</label>
      <div className="grid grid-cols-2 gap-2">
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => handleSelect(method.id)}
            className={`
              p-3 border-2 rounded-lg text-sm font-medium
              ${selected === method.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300'}
            `}
          >
            {method.logo_url && (
              <img 
                src={method.logo_url} 
                alt={method.name}
                className="h-6 mb-1 mx-auto"
              />
            )}
            <div>{method.name}</div>
            <div className="text-xs text-gray-500 capitalize">
              {method.type}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Sync Considerations

**When Admin Creates New Payment Method:**
1. Saved to Supabase immediately (online)
2. Broadcast to all kasir devices (WebSocket/polling)
3. Each kasir re-caches payment methods
4. New method available for next transaction

**When Kasir is Offline:**
1. Use last cached methods
2. Display "Last updated: [timestamp]" indicator
3. Prompt to sync when online

**Conflict Resolution:**
- Payment methods rarely conflict (admin-only edits)
- Use Last-Write-Wins strategy
- No merge needed

---

## �🔄 DATA SYNCHRONIZATION STRATEGY

### Sync Architecture

```
┌────────────────────────────────────────────────────┐
│            SYNC ENGINE WORKFLOW                    │
├────────────────────────────────────────────────────┤
│                                                    │
│  1. CHANGE DETECTION                               │
│     ├─ Track modified records in _sync_metadata   │
│     ├─ Timestamp-based change detection           │
│     └─ Trigger: Auto (30s) / Manual / On connect  │
│                                                    │
│  2. PRIORITY QUEUE                                 │
│     ├─ P0: Orders (critical)                      │
│     ├─ P1: Inventory                              │
│     ├─ P2: Production                             │
│     └─ P3: Others                                 │
│                                                    │
│  3. DIFFERENTIAL SYNC                              │
│     ├─ Only sync changed records                  │
│     ├─ Batch operations (max 100 records/batch)   │
│     └─ Compare checksums for conflict detection   │
│                                                    │
│  4. CONFLICT RESOLUTION                            │
│     ├─ Last-Write-Wins (default)                  │
│     ├─ Merge strategies (inventory: sum)          │
│     └─ Manual review (critical conflicts)         │
│                                                    │
│  5. ERROR HANDLING                                 │
│     ├─ Retry with exponential backoff            │
│     ├─ Max 3 retries before manual review         │
│     └─ Alert user for persistent failures         │
│                                                    │
│  6. VERIFICATION                                   │
│     ├─ Confirm server acceptance                  │
│     ├─ Update local sync status                   │
│     └─ Cleanup synced records                     │
│                                                    │
└────────────────────────────────────────────────────┘
```

### Sync Implementation (`lib/sync/sync-engine.ts`)

```typescript
import { getPGLite } from '../db/pglite-client';
import { supabase } from '../supabase/client';

interface SyncTask {
  priority: number;
  table: string;
  recordId: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
}

export class SyncEngine {
  private isSyncing = false;
  private syncQueue: SyncTask[] = [];
  
  // Priority mapping
  private PRIORITIES = {
    orders: 0,            // Highest - revenue critical
    order_items: 0,
    payment_methods: 1,   // Payment methods updates
    inventory: 2,
    production: 3,
    expenses: 4,
    audit_logs: 5,        // Lowest
  };

  async startSync() {
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    if (!navigator.onLine) {
      console.log('Offline, skipping sync');
      return;
    }

    this.isSyncing = true;

    try {
      // 1. Collect pending changes
      await this.collectPendingChanges();

      // 2. Sort by priority
      this.syncQueue.sort((a, b) => a.priority - b.priority);

      // 3. Sync in batches
      await this.syncInBatches();

      // 4. Verify and cleanup
      await this.cleanupSyncedRecords();

      console.log('✅ Sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async collectPendingChanges() {
    const db = await getPGLite();
    const result = await db.query(`
      SELECT table_name, record_id, sync_status
      FROM _sync_metadata
      WHERE sync_status = 'pending'
      ORDER BY id ASC
    `);

    for (const row of result.rows) {
      const priority = this.PRIORITIES[row.table_name] ?? 99;
      
      // Fetch actual record data
      const data = await db.query(`
        SELECT * FROM ${row.table_name} WHERE id = $1
      `, [row.record_id]);

      if (data.rows.length > 0) {
        this.syncQueue.push({
          priority,
          table: row.table_name,
          recordId: row.record_id,
          action: 'insert', // Simplified - detect actual action
          data: data.rows[0],
        });
      }
    }
  }

  private async syncInBatches() {
    const BATCH_SIZE = 100;
    
    for (let i = 0; i < this.syncQueue.length; i += BATCH_SIZE) {
      const batch = this.syncQueue.slice(i, i + BATCH_SIZE);
      await this.syncBatch(batch);
    }
  }

  private async syncBatch(tasks: SyncTask[]) {
    for (const task of tasks) {
      try {
        await this.syncSingleRecord(task);
      } catch (error) {
        console.error(`Failed to sync ${task.table}:${task.recordId}`, error);
        await this.markSyncFailed(task.table, task.recordId, error);
      }
    }
  }

  private async syncSingleRecord(task: SyncTask) {
    const { data, error } = await supabase
      .from(task.table)
      .upsert(task.data)
      .select();

    if (error) throw error;

    await this.markSyncSuccess(task.table, task.recordId);
  }

  private async markSyncSuccess(table: string, recordId: string) {
    const db = await getPGLite();
    await db.query(`
      UPDATE _sync_metadata
      SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP
      WHERE table_name = $1 AND record_id = $2
    `, [table, recordId]);
  }

  private async markSyncFailed(table: string, recordId: string, error: any) {
    const db = await getPGLite();
    await db.query(`
      UPDATE _sync_metadata
      SET sync_status = 'failed', 
          retry_count = retry_count + 1,
          conflict_data = $3
      WHERE table_name = $1 AND record_id = $2
    `, [table, recordId, JSON.stringify({ error: error.message })]);
  }

  private async cleanupSyncedRecords() {
    const db = await getPGLite();
    // Keep synced records for 7 days for audit
    await db.query(`
      DELETE FROM _sync_metadata
      WHERE sync_status = 'synced' 
      AND last_synced_at < NOW() - INTERVAL '7 days'
    `);
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
```

---

## ⚔️ CONFLICT RESOLUTION

### Conflict Types & Strategies

| Conflict Type | Strategy | Rationale |
|--------------|----------|-----------|
| **Orders** | Last-Write-Wins | Orders are immutable after creation |
| **Inventory (Add)** | Sum | Multiple additions should accumulate |
| **Inventory (Deduct)** | First-Write-Wins | Prevent overselling |
| **Production** | Last-Write-Wins | Production records rarely conflict |
| **Settings** | Manual Review | Critical configs need human decision |
| **User Profile** | Last-Write-Wins | Low conflict probability |

### Conflict Detection Algorithm

```typescript
interface ConflictData {
  localVersion: any;
  serverVersion: any;
  timestamp_local: number;
  timestamp_server: number;
}

async function detectConflict(
  table: string, 
  recordId: string, 
  localData: any
): Promise<ConflictData | null> {
  // Fetch server version
  const { data: serverData } = await supabase
    .from(table)
    .select('*')
    .eq('id', recordId)
    .single();

  if (!serverData) return null; // No conflict, server has no record

  // Compare timestamps
  const localTimestamp = new Date(localData.updated_at).getTime();
  const serverTimestamp = new Date(serverData.updated_at).getTime();

  // If server version is newer, conflict exists
  if (serverTimestamp > localTimestamp) {
    return {
      localVersion: localData,
      serverVersion: serverData,
      timestamp_local: localTimestamp,
      timestamp_server: serverTimestamp,
    };
  }

  return null; // No conflict
}
```

### Inventory Merge Strategy

```typescript
async function mergeInventory(conflict: ConflictData) {
  const local = conflict.localVersion;
  const server = conflict.serverVersion;

  // If both deducted, keep lower (prevent overselling)
  if (local.quantity < server.quantity) {
    return local.quantity; // More conservative
  }

  // If one added, one deducted - calculate difference
  const localDelta = local.quantity - server.quantity;
  return server.quantity + localDelta;
}
```

---

## 🔒 SECURITY CONSIDERATIONS

### Data Security Measures

**Note on Payment Methods:**  
⚠️ System does NOT use external payment gateway (Midtrans removed). All payments are manual entries recorded by kasir. Payment methods are configured via admin menu "Kelola Metode Pembayaran" and cached locally for offline use.

1. **Encrypted Storage**
   - Sensitive data encrypted at rest
   - Use Web Crypto API for encryption
   - Keys stored in secure enclave (if available)

2. **Authentication**
   - PIN hashing with salt (bcrypt/scrypt)
   - Session tokens with expiry
   - Auto-logout after inactivity

3. **Authorization**
   - Role-based access control (RBAC)
   - Feature flags per role
   - Audit trail for sensitive operations

4. **Data Validation**
   - Input sanitization
   - SQL injection prevention (parameterized queries)
   - XSS prevention

5. **Network Security**
   - HTTPS only
   - Certificate pinning
   - API rate limiting

### Implementation Example

```typescript
// lib/security/encryption.ts
export async function encryptData(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  return btoa(JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted)),
  }));
}

export async function decryptData(encryptedData: string, key: CryptoKey): Promise<string> {
  const { iv, data } = JSON.parse(atob(encryptedData));
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(data)
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
```

---

## 🧪 TESTING STRATEGY

### Test Coverage Matrix

| Layer | Unit Tests | Integration Tests | E2E Tests |
|-------|-----------|-------------------|-----------|
| **Service Worker** | Cache strategies | Offline fallback | PWA install flow |
| **Local Database** | CRUD operations | Transactions | Data integrity |
| **Sync Engine** | Conflict detection | Batch sync | Full sync cycle |
| **Auth** | PIN validation | Session management | Login/logout flow |
| **POS** | Order creation | Inventory update | Complete transaction |
| **Reports** | Data aggregation | Export functions | Report generation |

### Critical Test Scenarios

#### 1. Offline Transaction Flow
```typescript
describe('Offline POS Transaction', () => {
  it('should create order offline and sync when online', async () => {
    // 1. Go offline
    await page.context().setOffline(true);
    
    // 2. Create order
    await page.goto('/dashboard/kasir');
    await page.click('[data-testid="product-1"]');
    await page.click('[data-testid="checkout"]');
    await page.fill('[data-testid="payment"]', '100000');
    await page.click('[data-testid="confirm"]');
    
    // 3. Verify order saved locally
    const localOrders = await page.evaluate(() => {
      return window.indexedDB.databases();
    });
    expect(localOrders).toHaveLength(1);
    
    // 4. Go online
    await page.context().setOffline(false);
    
    // 5. Wait for sync
    await page.waitForSelector('[data-testid="sync-complete"]');
    
    // 6. Verify order on server
    const serverOrder = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    expect(serverOrder.data).toBeTruthy();
    expect(serverOrder.data.total_amount).toBe(100000);
  });
});
```

#### 2. Concurrent Edit Conflict
```typescript
describe('Inventory Conflict Resolution', () => {
  it('should resolve concurrent inventory edits', async () => {
    // Device 1: Deduct 10 units offline
    await device1.setOffline(true);
    await updateInventory('product-1', -10);
    
    // Device 2: Deduct 5 units offline
    await device2.setOffline(true);
    await updateInventory('product-1', -5);
    
    // Both go online and sync
    await Promise.all([
      device1.setOffline(false),
      device2.setOffline(false),
    ]);
    
    // Wait for sync
    await sleep(5000);
    
    // Verify final quantity (should be original - 15)
    const finalQty = await getInventoryQuantity('product-1');
    expect(finalQty).toBe(originalQty - 15);
  });
});
```

---

## 📈 SUCCESS METRICS

### Key Performance Indicators (KPIs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Offline Availability** | 99.9% | App works offline in 999/1000 cases |
| **Sync Success Rate** | >95% | Successful syncs / Total sync attempts |
| **Sync Duration** | <30s | Time to sync 100 orders |
| **Conflict Rate** | <5% | Conflicts / Total sync operations |
| **Auto-resolution Rate** | >90% | Auto-resolved / Total conflicts |
| **Data Loss Rate** | 0% | Lost records / Total records |
| **PWA Install Rate** | >60% | Installs / Total users |
| **User Satisfaction** | >4.5/5 | Post-rollout survey score |
| **Incident Rate** | <1% | Critical issues / Total operations |

### Monitoring Dashboard

```typescript
// lib/monitoring/metrics.ts
export interface OfflineMetrics {
  total_offline_orders: number;
  pending_sync_count: number;
  failed_sync_count: number;
  avg_sync_duration_ms: number;
  conflict_count: number;
  storage_used_mb: number;
  last_sync_timestamp: number;
}

export async function collectMetrics(): Promise<OfflineMetrics> {
  const db = await getPGLite();
  
  const [orders, pending, failed, storage] = await Promise.all([
    db.query('SELECT COUNT(*) FROM orders'),
    db.query(`SELECT COUNT(*) FROM _sync_metadata WHERE sync_status = 'pending'`),
    db.query(`SELECT COUNT(*) FROM _sync_metadata WHERE sync_status = 'failed'`),
    estimateStorageUsage(),
  ]);

  return {
    total_offline_orders: orders.rows[0].count,
    pending_sync_count: pending.rows[0].count,
    failed_sync_count: failed.rows[0].count,
    avg_sync_duration_ms: 0, // Calculate from sync logs
    conflict_count: 0, // From conflict table
    storage_used_mb: storage,
    last_sync_timestamp: Date.now(),
  };
}

async function estimateStorageUsage(): Promise<number> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return Math.round((estimate.usage || 0) / (1024 * 1024));
  }
  return 0;
}
```

---

## 🚨 RISK MANAGEMENT

### High-Priority Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Data Loss** | Critical | Low | Comprehensive backup, transaction logs |
| **Sync Failures** | High | Medium | Retry mechanism, manual sync, alerting |
| **Storage Quota** | High | Medium | Cleanup old data, compression, monitoring |
| **Conflicts** | Medium | High | Auto-resolution strategies, manual review UI |
| **Security Breach** | Critical | Low | Encryption, audit logs, access controls |
| **Performance Degradation** | Medium | Medium | Lazy loading, indexing, batch operations |
| **Browser Compatibility** | Medium | Low | Polyfills, feature detection, graceful degradation |

### Contingency Plans

#### Plan A: Sync Failure
1. Alert user with clear message
2. Enable manual sync button
3. Log error details
4. Notify admin via dashboard
5. Provide export option (CSV backup)

#### Plan B: Storage Full
1. Detect quota exceeded
2. Trigger automatic cleanup (old data)
3. Compress cached data
4. Prompt user to sync and clear
5. Fall back to essential data only

#### Plan C: Critical Bug
1. Feature flag to disable offline mode
2. Rollback to previous version
3. Force online-only mode
4. Emergency hotfix deployment
5. Post-mortem analysis

---

## 📚 ROLLOUT PLAN

### Stage 1: Pilot (Week 7, Days 1-3)

**Scope:** 1-2 friendly outlets  
**Participants:** 5-10 employees  
**Duration:** 3 days  

**Activities:**
- Deploy to pilot outlets
- On-site training (2 hours)
- Monitor usage closely
- Collect feedback daily
- Fix critical bugs immediately

**Success Criteria:**
- Zero blocking issues
- Positive user feedback
- All features working

---

### Stage 2: Beta (Week 7, Days 4-5)

**Scope:** 10% of outlets (~5-10 outlets)  
**Participants:** 50+ employees  
**Duration:** 2 days  

**Activities:**
- Gradual rollout
- Remote support available
- Monitor metrics dashboard
- Performance testing
- Address feedback

**Success Criteria:**
- <2% incident rate
- Sync success rate >95%
- No data loss

---

### Stage 3: Production (Week 8)

**Scope:** All outlets  
**Participants:** 500 employees  
**Duration:** Phased over 2-3 days  

**Activities:**
- Staggered rollout (region-by-region)
- 24/7 support hotline
- Real-time monitoring
- Quick response team
- Communication plan

**Success Criteria:**
- Smooth rollout
- User adoption >80%
- Positive sentiment

---

## 🛠️ MAINTENANCE & SUPPORT

### Ongoing Maintenance Tasks

#### Daily
- Monitor sync success rates
- Check error logs
- Review storage usage
- Verify system health

#### Weekly
- Analyze metrics trends
- Review conflict resolutions
- Update documentation
- Performance optimization

#### Monthly
- Security audit
- Database cleanup
- User feedback analysis
- Feature improvements

### Support Structure

```
┌─────────────────────────────────────┐
│      SUPPORT ESCALATION PATH        │
├─────────────────────────────────────┤
│                                     │
│  Level 1: User Self-Service         │
│  ├─ FAQ documentation               │
│  ├─ Video tutorials                 │
│  └─ In-app help                     │
│                                     │
│  Level 2: Outlet Manager            │
│  ├─ Basic troubleshooting           │
│  ├─ Manual sync trigger             │
│  └─ Local issue resolution          │
│                                     │
│  Level 3: Support Hotline           │
│  ├─ Technical support team          │
│  ├─ Remote debugging                │
│  └─ Escalation to dev team          │
│                                     │
│  Level 4: Development Team          │
│  ├─ Critical bug fixes              │
│  ├─ Emergency patches                │
│  └─ Architecture changes             │
│                                     │
└─────────────────────────────────────┘
```

---

## 📖 TRAINING MATERIALS

### Quick Reference Guide

#### For Kasir (Cashier)

**Offline Mode Checklist:**
1. ✅ Check offline indicator (top-right corner)
2. ✅ Create orders normally
3. ✅ Look for "Pending Sync" badge
4. ✅ When online, wait for auto-sync
5. ✅ Verify sync complete (green checkmark)

**Troubleshooting:**
- **Order not syncing?** Click "Sync Now" button
- **Storage full?** Contact manager
- **App not working?** Refresh browser (F5)

#### For Manager

**Daily Checklist:**
1. Check sync status dashboard
2. Review pending orders (should be 0)
3. Monitor storage usage
4. Verify all staff logged in successfully

**Weekly Tasks:**
1. Export backup data
2. Review conflict resolutions
3. Clean up old cached data (>30 days)

---

## 🎯 FINAL IMPLEMENTATION CHECKLIST

### Phase 1: Foundation ✅
- [ ] Install Serwist & configure Service Worker
- [ ] Create PWA manifest.json
- [ ] Setup offline fallback page
- [ ] Initialize PGLite with full schema
- [ ] Create offline detection system
- [ ] Build sync status indicator UI

### Phase 2: Authentication ✅
- [ ] Implement credential caching
- [ ] Create offline login flow
- [ ] Build PIN-based authentication
- [ ] Session persistence layer
- [ ] Token refresh strategy

### Phase 3: Core Features ✅
- [ ] **Cache payment methods from database**
- [ ] **Offline payment method selector**
- [ ] Offline POS (order creation)
- [ ] Offline production tracking
- [ ] Offline inventory view
- [ ] Queue system for all operations
- [ ] Receipt generation offline

### Phase 4: Sync Engine ✅
- [ ] Differential sync algorithm
- [ ] Priority queue implementation
- [ ] Conflict detection & resolution
- [ ] Batch sync operations
- [ ] Retry with exponential backoff
- [ ] Sync progress indicators
- [ ] Manual sync trigger

### Phase 5: Reports ✅
- [ ] Cache recent reports (7-30 days)
- [ ] Offline report generation
- [ ] Excel export offline
- [ ] PDF generation offline
- [ ] Analytics dashboard (read-only)

### Phase 6: Testing ✅
- [ ] Unit tests (>80% coverage)
- [ ] Integration tests
- [ ] E2E tests (critical flows)
- [ ] Offline scenario testing
- [ ] Conflict resolution testing
- [ ] Performance testing
- [ ] Security testing
- [ ] Browser compatibility testing

### Phase 7: Deployment ✅
- [ ] Pilot rollout (1-2 outlets)
- [ ] Beta rollout (10% outlets)
- [ ] Production rollout (all outlets)
- [ ] Training materials prepared
- [ ] Support hotline operational
- [ ] Monitoring dashboard live
- [ ] Incident response plan ready

---

## 📞 SUPPORT CONTACTS

### Emergency Contacts

**Development Team Lead**  
Email: dev-lead@donattour.com  
Phone: +62 XXX-XXXX-XXXX  
Hours: 24/7 for critical issues

**Technical Support**  
Email: support@donattour.com  
Phone: +62 XXX-XXXX-XXXX  
Hours: 08:00 - 20:00 WIB

**Project Manager**  
Email: pm@donattour.com  
Phone: +62 XXX-XXXX-XXXX  
Hours: 08:00 - 17:00 WIB

---

## 📝 CHANGE LOG

### Version 1.0.0 (Initial Plan)
- Created comprehensive offline-first implementation plan
- Defined architecture and technical stack
- Established 7-phase rollout strategy
- Set success metrics and KPIs
- Identified risks and mitigation strategies

---

## 🎓 LESSONS LEARNED (To be updated post-implementation)

_This section will be populated after each phase completion_

### Phase 1: Foundation
- TBD

### Phase 2: Authentication
- TBD

### Phase 3: Core Features
- TBD

---

## 📚 REFERENCES & RESOURCES

### Official Documentation
- [Next.js 15 App Router](https://nextjs.org/docs/app)
- [Serwist Documentation](https://serwist.pages.dev/)
- [PGLite Documentation](https://electric-sql.com/docs/pglite)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB Guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

### Community Resources
- [Next.js PWA Discussion](https://github.com/vercel/next.js/discussions/82498)
- [Offline-First Architecture Patterns](https://offlinefirst.org/)
- [CRDTs for Conflict Resolution](https://crdt.tech/)

### Inspirational Projects
- [LocalFirst Software](https://www.inkandswitch.com/local-first/)
- [ElectricSQL](https://electric-sql.com/)
- [RxDB Offline-First](https://rxdb.info/)

---

## ✅ APPROVAL & SIGN-OFF

### Stakeholder Approval

| Role | Name | Approval Date | Signature |
|------|------|---------------|-----------|
| **Project Owner** | _____________ | ___/___/2026 | _________ |
| **Technical Lead** | _____________ | ___/___/2026 | _________ |
| **Product Manager** | _____________ | ___/___/2026 | _________ |
| **QA Lead** | _____________ | ___/___/2026 | _________ |

---

## 🏁 CONCLUSION

This comprehensive implementation plan provides a detailed roadmap for transforming the Donattour POS system into a fully offline-capable application. The 7-phase approach ensures:

1. **Minimal Risk:** Phased rollout with pilot testing
2. **Maximum Coverage:** All critical features work offline
3. **Data Integrity:** Robust sync and conflict resolution
4. **User Experience:** Seamless offline/online transitions
5. **Maintainability:** Clear documentation and support structure

**Timeline Summary:**
- **Weeks 1-2:** Foundation & Auth (Setup)
- **Weeks 3-4:** Core Features (POS, Production, Inventory)
- **Week 5:** Sync Engine & Reports
- **Week 6:** Comprehensive Testing
- **Weeks 7-8:** Rollout & Training

**Total Duration:** 8 weeks from kickoff to full production

---

## 📧 FEEDBACK & UPDATES

This document is a living plan and will be updated throughout the implementation process.

**Last Updated:** June 26, 2026  
**Document Version:** 1.0.0  
**Next Review:** Start of each phase


---

**Status:** ✅ **READY FOR IMPLEMENTATION**

---

*Document prepared by: Kiro AI Assistant*  
*For: Donattour POS System Offline-First Transformation*  
*Project Code: DONATTOUR-OFFLINE-2026*
