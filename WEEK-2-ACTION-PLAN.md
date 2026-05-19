# 📅 WEEK 2 ACTION PLAN - Prisma + Jest Foundation

**Goal**: Setup type-safe database layer + testing framework

**Timeline**: 5 hari (40 jam)

---

## 🔴 DAY 1-2: Install & Setup Prisma (10 jam)

### Langkah-Langkah

#### Step 1: Install Prisma
```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
```

#### Step 2: Connect ke Supabase
**File**: `.env.local`
```
# Existing Supabase vars sudah ada, pastikan:
DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]?schema=public"
```

Ambil dari Supabase dashboard:
- Settings → Database → Connection string → URI

#### Step 3: Introspect existing schema
```bash
# Pull existing Supabase schema ke Prisma
npx prisma db pull

# Ini generate prisma/schema.prisma dari database
```

#### Step 4: Verify schema
Buka `prisma/schema.prisma`:
- Semua tables ada? (orders, order_items, inventory, outlets, dll)
- Relations correct?
- Constraints proper?

Jika ada issue, fix di Supabase dan run `npx prisma db pull` lagi

#### Step 5: Generate Prisma Client
```bash
npx prisma generate
```

Ini create `node_modules/.prisma/client/` - jangan commit

#### Step 6: Update .gitignore
```
# .gitignore tambah:
.env.local
prisma/migrations/
node_modules/.prisma/
dist/
```

#### Step 7: Create Prisma Client singleton
**File baru**: `lib/db/prisma-client.ts`

```typescript
import { PrismaClient } from '@prisma/client'
import { dbLogger } from '@/lib/utils/logger'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
    ],
  })

// Log database events
prisma.$on('warn', (e) => {
  dbLogger.warn({ event: 'prisma_warn', message: e.message })
})

prisma.$on('error', (e) => {
  dbLogger.error({ event: 'prisma_error', message: e.message })
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Test connection on startup
prisma.$executeRaw`SELECT 1`.then(() => {
  dbLogger.info({ event: 'prisma_connected' })
}).catch((error) => {
  dbLogger.error({ event: 'prisma_connection_failed', error: error.message })
})
```

#### Step 8: Test Prisma connection
```bash
# Create test file temporarily
cat > test-prisma.ts << 'EOF'
import { prisma } from './lib/db/prisma-client'

async function main() {
  try {
    // Test read
    const outlets = await prisma.outlets.findMany({ take: 1 })
    console.log('✅ Outlets:', outlets)

    // Test count
    const orderCount = await prisma.orders.count()
    console.log('✅ Total orders:', orderCount)

    console.log('✅ Prisma connected successfully!')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
EOF

npx ts-node test-prisma.ts

# Hapus file setelah test
rm test-prisma.ts
```

✅ **Deliverable Day 1-2**: Prisma connected & Client ready

---

## 🟡 DAY 3: Setup Jest Testing Framework (8 ham)

### Langkah-Langkah

#### Step 1: Install Jest dependencies
```bash
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
```

#### Step 2: Create Jest config
**File baru**: `jest.config.js`

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'app/api/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

#### Step 3: Create Jest setup file
**File baru**: `jest.setup.js`

```javascript
import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key'
process.env.NODE_ENV = 'test'
```

#### Step 4: Add test script to package.json
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

#### Step 5: Create test setup utilities
**File baru**: `tests/__setup__.ts`

```typescript
import { Prisma } from '@prisma/client'

// Mock Prisma for testing
export const mockPrisma = {
  orders: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  inventory: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  outlets: {
    findUnique: jest.fn(),
  },
}

// Helper untuk create test data
export const createMockOrder = (overrides = {}) => ({
  id: '1',
  outlet_id: '1',
  cashier_id: '1',
  total_amount: 50000,
  payment_method: 'cash',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
})

export const createMockInventory = (overrides = {}) => ({
  id: '1',
  outlet_id: '1',
  product_id: '1',
  quantity: 100,
  updated_at: new Date(),
  ...overrides,
})
```

✅ **Deliverable Day 3**: Jest configured & ready to write tests

---

## 🟢 DAY 4-5: Write Critical Path Tests (16 jam)

### Tujuan
Write tests untuk:
1. Stock deduction (inventory logic)
2. Order creation
3. Payment reconciliation

### Test 1: Stock Deduction

**File baru**: `tests/unit/inventory.test.ts`

```typescript
import { validateStockDeduction, deductStock } from '@/lib/db/inventory'
import { mockPrisma, createMockInventory } from '@/__setup__'

jest.mock('@/lib/db/prisma-client', () => ({
  prisma: mockPrisma,
}))

describe('Stock Deduction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should deduct stock when enough inventory', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValue(
      createMockInventory({ quantity: 100 })
    )

    const result = await deductStock('outlet-1', 'product-1', 50)

    expect(result).toEqual(expect.objectContaining({
      success: true,
      quantity: 50,
    }))
  })

  test('should fail when insufficient stock', async () => {
    mockPrisma.inventory.findUnique.mockResolvedValue(
      createMockInventory({ quantity: 10 })
    )

    const result = await deductStock('outlet-1', 'product-1', 50)

    expect(result).toEqual(expect.objectContaining({
      success: false,
      error: 'Insufficient stock',
    }))
  })

  test('should handle concurrent deductions', async () => {
    // Test untuk concurrency edge case
    mockPrisma.inventory.findUnique.mockResolvedValue(
      createMockInventory({ quantity: 100 })
    )

    // Simulasi 2 concurrent requests
    const results = await Promise.all([
      deductStock('outlet-1', 'product-1', 60),
      deductStock('outlet-1', 'product-1', 60),
    ])

    // Should fail salah satu (race condition)
    const succeeded = results.filter(r => r.success).length
    expect(succeeded).toBe(1)
  })
})
```

### Test 2: Order Creation

**File baru**: `tests/unit/orders.test.ts`

```typescript
import { createOrder } from '@/lib/db/orders'
import { mockPrisma, createMockOrder } from '@/__setup__'

jest.mock('@/lib/db/prisma-client')
jest.mock('@/lib/db/inventory')

describe('Order Creation', () => {
  test('should create order with valid data', async () => {
    mockPrisma.orders.create.mockResolvedValue(
      createMockOrder({ id: 'new-order-id' })
    )

    const result = await createOrder({
      outlet_id: '1',
      cashier_id: '1',
      items: [{ product_id: '1', quantity: 2, price: 25000 }],
      payment_method: 'cash',
    })

    expect(result.id).toBe('new-order-id')
    expect(mockPrisma.orders.create).toHaveBeenCalled()
  })

  test('should reject if outlet not found', async () => {
    mockPrisma.outlets.findUnique.mockResolvedValue(null)

    await expect(
      createOrder({
        outlet_id: 'invalid',
        cashier_id: '1',
        items: [],
        payment_method: 'cash',
      })
    ).rejects.toThrow('Outlet not found')
  })

  test('should deduct inventory during order creation', async () => {
    // This tests the integration: order → stock deduction
    // ...test code
  })
})
```

### Test 3: Payment Reconciliation

**File baru**: `tests/integration/payment-reconciliation.test.ts`

```typescript
describe('Payment Reconciliation', () => {
  test('should reconcile payment after Midtrans webhook', async () => {
    // Simulate: order created → payment via Midtrans → webhook received
    // Verify: order status updated to 'paid'
    // ...test code
  })

  test('should handle payment timeout', async () => {
    // Payment expires after 24 hours
    // Order should be marked as 'expired'
    // ...test code
  })
})
```

#### Run tests
```bash
npm run test -- tests/unit

# Output harus:
# PASS  tests/unit/inventory.test.ts
#   Stock Deduction
#     ✓ should deduct stock when enough inventory
#     ✓ should fail when insufficient stock
#     ✓ should handle concurrent deductions
#
# PASS  tests/unit/orders.test.ts
#   Order Creation
#     ✓ should create order with valid data
#     ✓ should reject if outlet not found
#
# Test Suites: 2 passed, 2 total
# Tests: 5 passed, 5 total
```

#### Check coverage
```bash
npm run test:coverage

# Harus >60% untuk critical paths:
# ────────────────────────────────────────────────
# File          | % Stmts | % Branch | % Uncovered
# ────────────────────────────────────────────────
# inventory.ts  |   80    |   75     | 45-48
# orders.ts     |   85    |   80     | 62-65
# ────────────────────────────────────────────────
```

✅ **Deliverable Day 4-5**: Critical path tests written & passing

---

## ✅ WEEK 2 COMPLETE

**Total Time**: ~34-40 hours

**Next**: Start Week 3 (API standardization with `withHandler()`)
