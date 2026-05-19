# 📅 WEEK 1 ACTION PLAN - Setup Observability (Logging & Monitoring)

**Goal**: Get visibility into what breaks in production. When something fails, you get email immediately.

**Timeline**: 5 hari (40 jam)

---

## 🔴 DAY 1-2: Setup Pino Logger (12 jam)

### Tujuan
Setiap API request tercatat dengan format JSON terstruktur → nanti bisa di-aggregate

### Langkah-Langkah

#### Step 1: Install Pino
```bash
npm install pino pino-pretty pino-http
npm install -D @types/pino
```

#### Step 2: Create logger utility
**File baru**: `lib/utils/logger.ts`
```typescript
import pino from 'pino'

const isDev = process.env.NODE_ENV === 'development'

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'warn'),
  transport: isDev
    ? { target: 'pino-pretty' }
    : undefined,
})

// Create specialized loggers
export const apiLogger = logger.child({ module: 'api' })
export const dbLogger = logger.child({ module: 'db' })
export const syncLogger = logger.child({ module: 'sync' })
```

#### Step 3: Update middleware untuk log semua requests
**File update**: `middleware.ts` (atau buat baru)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { apiLogger } from '@/lib/utils/logger'
import crypto from 'crypto'

export function middleware(request: NextRequest) {
  const correlationId = crypto.randomUUID()
  const startTime = Date.now()
  
  apiLogger.info({
    correlationId,
    method: request.method,
    path: request.nextUrl.pathname,
    userAgent: request.headers.get('user-agent'),
    timestamp: new Date().toISOString(),
    event: 'request_start'
  })
  
  // Response logging dilakukan di route handler
  return NextResponse.next({
    headers: {
      'x-correlation-id': correlationId,
    }
  })
}

export const config = {
  matcher: '/api/:path*',
}
```

#### Step 4: Add logging ke semua API routes
**Pattern untuk setiap route** (contoh: `app/api/orders/create/route.ts`):

```typescript
import { apiLogger } from '@/lib/utils/logger'

export async function POST(request: Request) {
  const correlationId = request.headers.get('x-correlation-id')
  const startTime = Date.now()
  
  try {
    apiLogger.info({
      correlationId,
      event: 'order_create_start',
      body: await request.clone().json()
    })
    
    // Your existing code...
    const order = await createOrder(data)
    
    const duration = Date.now() - startTime
    apiLogger.info({
      correlationId,
      event: 'order_create_success',
      duration,
      orderId: order.id
    })
    
    return Response.json({ success: true, data: order })
  } catch (error) {
    const duration = Date.now() - startTime
    apiLogger.error({
      correlationId,
      event: 'order_create_error',
      duration,
      error: error.message,
      stack: error.stack
    })
    
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

#### Step 5: Test locally
```bash
# Terminal 1: Run dev server
npm run dev

# Terminal 2: Test endpoint
curl -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{"outlet_id": 1, "items": []}'

# Harus ada di console:
# [11:23:45.123] INFO: api: {
#   "correlationId": "abc-123",
#   "event": "order_create_start",
#   ...
# }
```

✅ **Deliverable Day 1-2**: Semua API routes logging dengan Pino

---

## 🟡 DAY 3: Setup Sentry Free Tier (8 jam)

### Tujuan
Automatic error capture → you get email when production breaks

### Langkah-Langkah

#### Step 1: Create Sentry account
1. Go to https://sentry.io/signup/
2. Create account (gunakan email pribadi)
3. Create project: `donattour-pos`
4. Choose platform: **Node.js**
5. Copy `SENTRY_DSN` (nanti butuh)

#### Step 2: Install Sentry SDK
```bash
npm install @sentry/nextjs
npm install -D @sentry/cli
```

#### Step 3: Create Sentry configuration
**File baru**: `sentry.client.config.ts`
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**File baru**: `sentry.server.config.ts`
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**File baru**: `sentry.edge.config.ts`
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

#### Step 4: Update Next.js config
**File update**: `next.config.js`

```javascript
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  // ... existing config
};

module.exports = withSentryConfig(nextConfig, {
  org: "your-org",  // bisa skip dulu
  project: "donattour-pos",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  transpileClientSDK: true,
  hideSourceMaps: true,
  disableLogger: true,
  tunnelRoute: "/monitoring",
});
```

#### Step 5: Add to Vercel environment variables
Di Vercel dashboard:
```
NEXT_PUBLIC_SENTRY_DSN = <dari Sentry account>
SENTRY_DSN = <dari Sentry account>
SENTRY_AUTH_TOKEN = <dari Sentry organization settings>
```

#### Step 6: Test error capture locally
Buat temporary test endpoint:
**File baru**: `app/api/test-error/route.ts`
```typescript
export async function GET() {
  throw new Error('Test error from Donattour')
}
```

```bash
# Deploy ke Vercel (atau test di production)
curl https://your-vercel-url/api/test-error

# Go to Sentry dashboard - harus ada error baru!
# Delete test endpoint setelah test sukses
```

✅ **Deliverable Day 3**: Sentry connected & capturing production errors

---

## 🟢 DAY 4: Create Health Check Endpoint (6 jam)

### Tujuan
Endpoint `/api/health` yang monitor status: Supabase, Google Sheets, Midtrans
→ Vercel cron hit endpoint setiap 5 menit
→ Jika gagal, email alert ke Anda

### Langkah-Langkah

#### Step 1: Create health check route
**File baru**: `app/api/health/route.ts`

```typescript
import { apiLogger } from '@/lib/utils/logger'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const secret = request.headers.get('x-health-secret')
  
  // Prevent abuse
  if (secret !== process.env.HEALTH_CHECK_SECRET) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const health = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {} as Record<string, any>,
  }

  try {
    // Check Supabase connection
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    
    const { data, error } = await supabase
      .from('outlets')
      .select('id')
      .limit(1)
    
    health.services.supabase = error ? 'down' : 'up'
    if (error) health.status = 'degraded'

    // Check Google Sheets API
    try {
      const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.GOOGLE_SHEETS_ACCESS_TOKEN}`,
        },
      })
      health.services.googleSheets = response.ok ? 'up' : 'down'
      if (!response.ok) health.status = 'degraded'
    } catch {
      health.services.googleSheets = 'down'
      health.status = 'degraded'
    }

    // Check Midtrans (optional - just ping their API)
    try {
      const response = await fetch('https://app.sandbox.midtrans.com/api/v1/ping', {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(
            process.env.MIDTRANS_SERVER_KEY + ':'
          ).toString('base64'),
        },
      })
      health.services.midtrans = response.ok ? 'up' : 'down'
      if (!response.ok) health.status = 'degraded'
    } catch {
      health.services.midtrans = 'down'
      health.status = 'degraded'
    }

    apiLogger.info({
      event: 'health_check',
      ...health,
    })

    const statusCode = health.status === 'healthy' ? 200 : 503
    return Response.json(health, { status: statusCode })
  } catch (error) {
    apiLogger.error({
      event: 'health_check_error',
      error: error.message,
    })

    return Response.json(
      {
        timestamp: new Date().toISOString(),
        status: 'unhealthy',
        error: error.message,
      },
      { status: 500 }
    )
  }
}
```

#### Step 2: Setup Vercel cron
**File update**: `vercel.json` (create if not exists)

```json
{
  "crons": [
    {
      "path": "/api/health",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

#### Step 3: Add Vercel environment variables
Di Vercel dashboard, tambah:
```
HEALTH_CHECK_SECRET = <random strong string>
```

#### Step 4: Test health endpoint
```bash
# Test locally
curl -H "x-health-secret: YOUR_SECRET" \
  http://localhost:3000/api/health

# Deploy ke Vercel
vercel deploy

# Test di production
curl -H "x-health-secret: YOUR_SECRET" \
  https://your-vercel-url/api/health
```

✅ **Deliverable Day 4**: `/api/health` endpoint working + Vercel cron configured

---

## 🔵 DAY 5: Verify Everything & Test Logs (4 jam)

### Tujuan
Confirm semua setup berjalan, logs muncul di Vercel, errors capture di Sentry

### Checklist

- [ ] Deploy ke Vercel (atau sudah production)
- [ ] Buka Vercel dashboard → Logs → lihat request logs dengan correlation ID
- [ ] Test `/api/health` endpoint via curl (harus return 200 + all services up)
- [ ] Deliberately break something → check Sentry dashboard (harus ada error)
- [ ] Check email dari Sentry (harus ada alert email)
- [ ] Check Vercel analytics → see request patterns
- [ ] Document: Write file `docs/LOGGING-SETUP.md` explaining:
  - Correlation IDs (gunakan untuk debug)
  - How to check logs (Vercel dashboard)
  - How to check errors (Sentry dashboard)
  - How to interpret health check response

### Test Production Error
Temporary test (hapus setelah sukses):
```bash
# Deploy ini ke production dan trigger
curl https://your-vercel-url/api/test-error

# Harus ada di:
# 1. Vercel Logs (dengan correlation ID)
# 2. Sentry Dashboard (dengan error details)
# 3. Email notification dari Sentry
```

✅ **WEEK 1 COMPLETE**: Observability fully setup!

---

## 📊 Summary Week 1

| Day | Task | Status | Deliverable |
|-----|------|--------|-------------|
| 1-2 | Pino Logger setup | TBD | All API routes logging |
| 3 | Sentry integration | TBD | Error tracking active |
| 4 | Health check endpoint | TBD | `/api/health` endpoint working |
| 5 | Verification & testing | TBD | Logs visible, alerts working |

**Total Time**: ~30-35 hours (leave 5-10 hours for troubleshooting)

---

## 🆘 Troubleshooting

### Issue: Logs tidak muncul di Vercel
- **Fix**: Check `LOG_LEVEL` environment variable (should be `debug` or lower)
- Restart dev server: `npm run dev`

### Issue: Sentry not capturing errors
- **Fix**: Check `SENTRY_DSN` in Vercel (must start with `https://`)
- Redeploy: `vercel deploy --prod`

### Issue: Cron not running
- **Fix**: Check `vercel.json` syntax (must be valid JSON)
- Check Vercel dashboard → Cron Jobs → verify scheduled

### Issue: Health check returns 401
- **Fix**: Check `x-health-secret` header matches `HEALTH_CHECK_SECRET`
- The header name is `x-health-secret` (lowercase with hyphen)

---

## 🎯 Week 1 Success Criteria

✅ When complete:
1. Pino logs showing in Vercel Logs tab
2. Sentry dashboard shows recent errors
3. `/api/health` endpoint returns 200 + all services up
4. Correlation IDs in all request logs
5. Email alerts from Sentry working
6. You can trace production issues using correlation IDs

**Next**: Start Week 2 (Prisma + Jest)
