# API Standards - Donattour POS

## Overview

All API endpoints must use the `withHandler()` wrapper for consistent response format, error handling, and authentication.

## Standard Response Format

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "order-123",
    "total_amount": 50000,
    "status": "completed"
  },
  "meta": {
    "timestamp": "2026-05-19T10:30:00.000Z",
    "correlationId": "abc-123-def",
    "responseTime": 145
  }
}
```

### Error Response (400/401/403/500)
```json
{
  "success": false,
  "error": "Validation failed",
  "meta": {
    "timestamp": "2026-05-19T10:30:00.000Z",
    "correlationId": "abc-123-def",
    "responseTime": 45
  }
}
```

### Paginated Response (200)
```json
{
  "success": true,
  "data": [
    { "id": "order-1", "amount": 10000 },
    { "id": "order-2", "amount": 20000 }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 45,
    "totalPages": 5
  },
  "meta": {
    "timestamp": "2026-05-19T10:30:00.000Z",
    "correlationId": "abc-123-def",
    "responseTime": 234
  }
}
```

## Using withHandler()

### Basic Example (No Auth)

**Before** (old):
```typescript
export async function GET(request: NextRequest) {
  try {
    const data = await fetch('...')
    return Response.json({ success: true, data })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

**After** (new):
```typescript
import { withHandler } from '@/lib/api/with-handler'

export const GET = withHandler(
  async (req, context) => {
    const data = await context.prisma.products.findMany()
    return data
  }
)
```

### With Authentication & Authorization

```typescript
import { withHandler } from '@/lib/api/with-handler'
import { CreateOrderSchema } from '@/lib/validation'

export const POST = withHandler(
  async (req, context) => {
    const { outlet_id, items } = await req.json()

    // Create order using Prisma (type-safe!)
    const order = await context.prisma.orders.create({
      data: {
        outlet_id,
        kasir_id: context.userId,
        total_amount: items.reduce((sum, item) => sum + item.subtotal, 0),
        payment_method: 'cash',
        payment_status: 'unpaid',
        order_items: {
          create: items,
        },
      },
      include: {
        order_items: true,
      },
    })

    // Log audit trail
    await context.prisma.audit_logs.create({
      data: {
        outlet_id,
        user_id: context.userId,
        action: 'order_created',
        entity_type: 'order',
        entity_id: order.id,
        new_values: {
          total: order.total_amount,
          items: items.length,
        },
      },
    })

    return order
  },
  {
    requireAuth: true,
    roles: ['kasir', 'owner', 'manager'],
    validateZod: CreateOrderSchema,
    description: 'Create new order in kasir'
  }
)
```

## withHandler() Options

### `requireAuth: boolean`
Require authentication token in headers

```typescript
{
  requireAuth: true
  // Checks: x-user-id header exists and userRole != 'guest'
}
```

### `roles: string[]`
Restrict to specific roles

```typescript
{
  requireAuth: true,
  roles: ['admin', 'manager']
  // User must have one of these roles
}
```

### `validateZod: ZodSchema`
Validate request body with Zod

```typescript
{
  validateZod: CreateOrderSchema
  // Automatically parses & validates JSON body
  // Returns 400 if validation fails
}
```

### `description: string`
Document endpoint (for future API docs)

```typescript
{
  description: 'Create order with items and payment'
}
```

## Handler Context

Inside your handler, `context` provides:

```typescript
interface HandlerContext {
  correlationId: string      // For tracing
  userId: string             // From x-user-id header
  userRole: string           // From x-user-role header
  outlet_id: string          // From x-outlet-id header
  prisma: PrismaClient       // Type-safe database access
}
```

### Example: Use Context

```typescript
export const POST = withHandler(
  async (req, context) => {
    // Access all user context
    console.log(context.userId)      // 'user-123'
    console.log(context.userRole)    // 'kasir'
    console.log(context.outlet_id)   // 'outlet-456'
    console.log(context.correlationId) // 'abc-123-def'

    // Use Prisma (type-safe)
    const user = await context.prisma.users.findUnique({
      where: { id: context.userId }
    })

    return { user, role: context.userRole }
  },
  { requireAuth: true }
)
```

## Automatic Features

### 1. Error Handling
- ✅ Catches all exceptions
- ✅ Logs errors with context
- ✅ Returns 500 with error message
- ✅ Hides stack traces in production

### 2. Request Logging
- ✅ Logs request start with method, path, user
- ✅ Logs response with status, duration
- ✅ Includes correlation ID for tracing
- ✅ Tracks performance (responseTime in ms)

### 3. Validation
- ✅ Automatic Zod schema validation
- ✅ Returns 400 with validation errors
- ✅ JSON parse error handling

### 4. Authentication
- ✅ Checks requireAuth option
- ✅ Returns 401 if missing auth
- ✅ Returns 403 if insufficient role

## Common Patterns

### Create Resource
```typescript
export const POST = withHandler(
  async (req, context) => {
    const data = await req.json()
    
    const created = await context.prisma.products.create({
      data: { ...data, created_by: context.userId }
    })
    
    return created
  },
  { 
    requireAuth: true,
    roles: ['admin', 'manager'],
    validateZod: CreateProductSchema 
  }
)
```

### Read Many (Paginated)
```typescript
export const GET = withHandler(
  async (req, context) => {
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1')
    const pageSize = 10

    const [data, total] = await Promise.all([
      context.prisma.orders.findMany({
        where: { outlet_id: context.outlet_id },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { created_at: 'desc' }
      }),
      context.prisma.orders.count({
        where: { outlet_id: context.outlet_id }
      })
    ])

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  },
  { requireAuth: true }
)
```

### Update Resource
```typescript
export const PATCH = withHandler(
  async (req, context) => {
    const { id, ...updates } = await req.json()
    
    const updated = await context.prisma.orders.update({
      where: { id },
      data: updates
    })
    
    return updated
  },
  { 
    requireAuth: true,
    roles: ['owner', 'manager'],
    validateZod: UpdateOrderSchema 
  }
)
```

### Delete Resource
```typescript
export const DELETE = withHandler(
  async (req, context) => {
    const { id } = req.query
    
    await context.prisma.orders.delete({
      where: { id }
    })
    
    return { success: true }
  },
  { 
    requireAuth: true,
    roles: ['admin']
  }
)
```

## Required Headers

All authenticated endpoints require these headers:

```
x-user-id: user-123                          (always)
x-user-role: kasir                          (always)
x-outlet-id: outlet-456                    (for outlet-specific ops)
x-correlation-id: auto-generated           (auto-added by middleware)
```

Headers are sent by frontend/client automatically from Supabase auth context.

## Testing API Endpoints

### With cURL
```bash
curl -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -H "x-user-role: kasir" \
  -H "x-outlet-id: outlet-456" \
  -d '{"outlet_id":"outlet-456","items":[]}'
```

### Expected Response
```json
{
  "success": true,
  "data": { "id": "order-123", ... },
  "meta": {
    "timestamp": "2026-05-19T...",
    "correlationId": "abc-123",
    "responseTime": 145
  }
}
```

## Migration Guide

### Step 1: Import withHandler
```typescript
import { withHandler } from '@/lib/api/with-handler'
```

### Step 2: Wrap handler
```typescript
export const POST = withHandler(
  async (req, context) => {
    // Your code here
  },
  { /* options */ }
)
```

### Step 3: Use context.prisma
Replace Supabase client with `context.prisma`:
```typescript
// Before
const data = await supabase.from('orders').select()

// After
const data = await context.prisma.orders.findMany()
```

### Step 4: Log important events
```typescript
await context.prisma.audit_logs.create({
  data: {
    outlet_id: context.outlet_id,
    user_id: context.userId,
    action: 'order_created',
    entity_type: 'order',
    entity_id: order.id,
  }
})
```

## Troubleshooting

### 401 Unauthorized
- Check `x-user-id` header sent from client
- Verify `x-user-role` is not 'guest'
- Check `requireAuth: true` option set

### 403 Forbidden
- Check user role in `x-user-role` header
- Verify role in allowed `roles` array
- Case-sensitive: 'kasir' ≠ 'Kasir'

### 400 Validation Error
- Check Zod schema matches request body
- Verify all required fields present
- Check data types (string vs number, etc)

### Slow Response (responseTime > 1000ms)
- Check Prisma query N+1 problems
- Add missing database indexes
- Consider query pagination for large datasets
