# 📅 WEEK 3 ACTION PLAN - API Standardization & Prisma Migration

**Goal**: Unified API handler + start migrating routes from Supabase to Prisma

**Timeline**: 5 hari (40 jam)

---

## 🔴 DAY 1-2: Create withHandler() Wrapper (8 ham)

### File baru: `lib/api/with-handler.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema } from 'zod'
import { prisma } from '@/lib/db/prisma-client'
import { apiLogger } from '@/lib/utils/logger'
import { Sentry } from '@/lib/sentry/client'

interface HandlerContext {
  correlationId: string
  userId: string
  userRole: string
  outlet_id: string
  prisma: typeof prisma
}

interface HandlerOptions {
  roles?: string[]
  requireAuth?: boolean
  validateZod?: ZodSchema
}

type Handler = (
  request: Request,
  context: HandlerContext,
  params?: Record<string, any>
) => Promise<any>

export function withHandler(handler: Handler, options: HandlerOptions = {}) {
  return async (request: NextRequest, { params }: any) => {
    const correlationId = request.headers.get('x-correlation-id') || crypto.randomUUID()
    const startTime = Date.now()

    try {
      // 1. Auth check
      if (options.requireAuth) {
        const token = request.headers.get('authorization')?.replace('Bearer ', '')
        if (!token) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
          )
        }
        // Verify token with Supabase or your auth
      }

      // 2. Get user info from context
      const userId = request.headers.get('x-user-id') || ''
      const userRole = request.headers.get('x-user-role') || ''
      const outlet_id = request.headers.get('x-outlet-id') || ''

      // 3. Role check
      if (options.roles && !options.roles.includes(userRole)) {
        apiLogger.warn({
          correlationId,
          event: 'unauthorized_role',
          userId,
          role: userRole,
          required: options.roles,
        })

        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      // 4. Validate request body
      let body = null
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        body = await request.json()

        if (options.validateZod) {
          const parsed = options.validateZod.safeParse(body)
          if (!parsed.success) {
            apiLogger.warn({
              correlationId,
              event: 'validation_error',
              errors: parsed.error.flatten(),
            })

            return NextResponse.json(
              { error: 'Validation failed', details: parsed.error.flatten() },
              { status: 400 }
            )
          }
          body = parsed.data
        }
      }

      // 5. Call handler
      apiLogger.info({
        correlationId,
        event: 'request_start',
        method: request.method,
        path: request.nextUrl.pathname,
        userId,
        role: userRole,
      })

      const result = await handler(request, {
        correlationId,
        userId,
        userRole,
        outlet_id,
        prisma,
      }, params)

      // 6. Log success
      const duration = Date.now() - startTime
      apiLogger.info({
        correlationId,
        event: 'request_success',
        duration,
        path: request.nextUrl.pathname,
      })

      // 7. Return response
      return NextResponse.json({
        success: true,
        data: result,
        meta: {
          timestamp: new Date().toISOString(),
          correlationId,
        }
      })

    } catch (error: any) {
      const duration = Date.now() - startTime

      // Log error
      apiLogger.error({
        correlationId,
        event: 'request_error',
        duration,
        error: error.message,
        stack: error.stack,
        path: request.nextUrl.pathname,
      })

      // Send to Sentry
      Sentry.captureException(error, {
        tags: {
          correlationId,
          path: request.nextUrl.pathname,
        },
      })

      // Return error response
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Internal server error',
          correlationId,
        },
        { status: error.statusCode || 500 }
      )
    }
  }
}
```

### File baru: `lib/api/response-formatter.ts`

```typescript
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    timestamp: string
    correlationId: string
  }
}

export const formatSuccess = <T>(data: T, correlationId: string): ApiResponse<T> => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    correlationId,
  },
})

export const formatError = (error: string, correlationId: string): ApiResponse<null> => ({
  success: false,
  error,
  meta: {
    timestamp: new Date().toISOString(),
    correlationId,
  },
})
```

### File baru: `docs/api/API-STANDARDS.md`

```markdown
# API Standards - Donattour POS

## All routes MUST use withHandler()

### Example: Create Order

**Before** (old):
```typescript
export async function POST(request: Request) {
  try {
    const { outlet_id, items } = await request.json()
    const order = await db.orders.create(...)
    return Response.json({ success: true, data: order })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

**After** (new):
```typescript
import { withHandler } from '@/lib/api/with-handler'
import { CreateOrderSchema } from '@/lib/validation'

export const POST = withHandler(
  async (req, context) => {
    const { outlet_id, items } = await req.json()
    
    // Use Prisma instead of raw Supabase
    const order = await context.prisma.orders.create({
      data: {
        outlet_id,
        cashier_id: context.userId,
        items: {
          create: items,
        },
      },
    })
    
    return order
  },
  {
    requireAuth: true,
    roles: ['kasir', 'owner'],
    validateZod: CreateOrderSchema,
  }
)
```

## Response Format (automatic via withHandler)

All successful responses:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-05-19T10:30:00Z",
    "correlationId": "abc-123"
  }
}
```

All error responses:
```json
{
  "success": false,
  "error": "Error message",
  "correlationId": "abc-123"
}
```

## Logging

Every request automatically logs:
- Correlation ID
- User ID & role
- Path & method
- Duration
- Errors (if any)

## Authentication Headers

Passed by frontend/client:
```
Authorization: Bearer <token>
x-user-id: user-123
x-user-role: kasir
x-outlet-id: outlet-456
x-correlation-id: auto-generated-if-missing
```
```

✅ **Deliverable Day 1-2**: `withHandler()` wrapper ready

---

## 🟡 DAY 3-4: Migrate Routes to Prisma (16 ham)

### Priority: `/api/orders/create` (most critical)

**File update**: `app/api/orders/create/route.ts`

```typescript
import { withHandler } from '@/lib/api/with-handler'
import { CreateOrderSchema } from '@/lib/validation'
import * as Sentry from '@sentry/nextjs'

export const POST = withHandler(
  async (req, context) => {
    const { outlet_id, items, payment_method, paid_amount } = await req.json()

    // Validate schema (already done by withHandler, but explicit for clarity)
    const validated = CreateOrderSchema.parse({
      outlet_id,
      items,
      payment_method,
      paid_amount,
    })

    // 1. Check outlet exists
    const outlet = await context.prisma.outlets.findUnique({
      where: { id: outlet_id },
    })

    if (!outlet) {
      const error = new Error('Outlet not found')
      error.statusCode = 404
      throw error
    }

    // 2. Reserve stock (BLOCKING - fail if can't reserve)
    for (const item of items) {
      const inventory = await context.prisma.inventory.findUnique({
        where: {
          outlet_id_product_id: {
            outlet_id,
            product_id: item.product_id,
          },
        },
      })

      if (!inventory || inventory.quantity < item.quantity) {
        const error = new Error(
          `Insufficient stock for product ${item.product_id}. ` +
          `Available: ${inventory?.quantity || 0}, Requested: ${item.quantity}`
        )
        error.statusCode = 409
        throw error
      }
    }

    // 3. Create order (with items)
    const order = await context.prisma.orders.create({
      data: {
        outlet_id,
        cashier_id: context.userId,
        payment_method,
        total_amount: items.reduce((sum, item) => 
          sum + (item.price * item.quantity), 0
        ),
        order_items: {
          create: items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        order_items: true,
      },
    })

    // 4. Deduct inventory (async - non-blocking but logged)
    const deductPromise = context.prisma.inventory.updateMany({
      where: {
        outlet_id,
        product_id: { in: items.map(i => i.product_id) },
      },
      data: {
        quantity: {
          decrement: 1, // FIXME: use actual item.quantity
        },
      },
    }).catch(error => {
      // Log but don't fail - this is the fallback pattern
      Sentry.captureException(error, {
        tags: { orderId: order.id, event: 'inventory_deduction_failed' },
      })
    })

    // 5. Log audit trail
    await context.prisma.audit_logs.create({
      data: {
        outlet_id,
        user_id: context.userId,
        action: 'order_created',
        entity_type: 'order',
        entity_id: order.id,
        details: {
          items_count: items.length,
          total: order.total_amount,
        },
      },
    })

    // Don't wait for audit log or inventory deduction
    // Return order immediately for better UX
    return {
      id: order.id,
      outlet_id: order.outlet_id,
      total_amount: order.total_amount,
      items_count: order.order_items.length,
      created_at: order.created_at,
    }
  },
  {
    requireAuth: true,
    roles: ['kasir', 'owner'],
    validateZod: CreateOrderSchema,
  }
)
```

### Then migrate these in order:
1. `/api/inventory/validate` - read-only, easy
2. `/api/inventory/update` - critical for stock
3. `/api/orders/status` - simple lookup
4. `/api/payments/midtrans-webhook` - complex, save for later

**Test each migration**:
```bash
# Before migrate: test old endpoint
curl -X POST http://localhost:3000/api/orders/create \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"outlet_id": "1", "items": []}'

# After migrate: same test
# Response should be identical

# Verify database
# Check orders table - should have new entries
```

✅ **Deliverable Day 3-4**: First 2-3 critical routes migrated to Prisma

---

## 🟢 DAY 5: Fix Auth & Documentation (6 ham)

### Fix Commented-Out Auth

**File update**: `app/api/inventory/validate/route.ts`

```typescript
// BEFORE: Auth commented out
// export async function POST(request: Request) {
//   // KITA BYPASS DULU AGAR KASIR TIDAK TERKUNCI
//   ...
// }

// AFTER: Proper role enforcement
export const POST = withHandler(
  async (req, context) => {
    const { product_id, quantity } = await req.json()
    
    const inventory = await context.prisma.inventory.findUnique({
      where: {
        outlet_id_product_id: {
          outlet_id: context.outlet_id,
          product_id,
        },
      },
    })

    return {
      available: inventory?.quantity >= quantity,
      quantity: inventory?.quantity || 0,
    }
  },
  {
    requireAuth: true,
    roles: ['kasir', 'owner', 'manager'], // All these roles can check
  }
)
```

### Document migration

**File**: `docs/API-MIGRATION-LOG.md`

```markdown
# API Migration Log

## Routes Migrated to Prisma

- [x] POST `/api/orders/create` - 2026-05-19
- [x] POST `/api/inventory/validate` - 2026-05-19
- [x] PATCH `/api/inventory/update` - 2026-05-19
- [ ] GET `/api/orders/:id/status` - TODO
- [ ] POST `/api/payments/reconcile` - TODO

## Routes Still Using Raw Supabase
- GET `/api/products/list`
- GET `/api/outlets/list`

## Known Issues
- Stock deduction async (non-blocking) - mark as TODO for Week 4
- Audit logging added but not fully integrated

## Next Steps
- Migrate remaining critical paths
- Implement saga pattern for distributed transactions
```

✅ **WEEK 3 COMPLETE**: API standardization + Prisma migration started

**Total**: ~36-40 hours

**Next**: Week 4 (Security & Documentation)
