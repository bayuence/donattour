# 🔔 Alert System Documentation

**Version:** 1.0  
**Date:** 2026-05-06  
**Status:** ✅ COMPLETED

---

## 📋 Overview

Alert System adalah sistem notifikasi otomatis yang memonitor kondisi bisnis dan memberikan peringatan kepada user saat ada kondisi yang memerlukan perhatian.

---

## 🎯 Alert Types

### 1. **Stock Low** (`stock_low`)
**Trigger:** Stock < 20% dari produksi harian  
**Severity:** 
- `critical` jika < 10%
- `warning` jika < 20%

**Example:**
```
Title: Stok standar Menipis!
Message: Stok donat non-topping standar tinggal 15.0% (30 dari 200 pcs). 
         Segera tambah produksi atau kurangi penjualan.
```

---

### 2. **Waste Rate High** (`waste_high`)
**Trigger:** Waste rate > 15%  
**Severity:**
- `critical` jika > 20%
- `warning` jika > 15%

**Example:**
```
Title: 🚨 Waste Rate Tinggi!
Message: Waste rate hari ini mencapai 18.5%, melebihi target 15%. 
         Total waste: 37 pcs dari 200 pcs target. 
         Segera review proses produksi!
```

---

### 3. **No Production** (`no_production`)
**Trigger:** Belum ada input produksi setelah jam 08:00  
**Severity:** `critical`

**Example:**
```
Title: ⚠️ Belum Ada Input Produksi!
Message: Sudah lewat jam 08:00 tapi belum ada input produksi untuk hari ini. 
         Kasir tidak bisa melakukan penjualan tanpa input produksi. 
         Segera input produksi!
```

---

### 4. **No Closing** (`no_closing`)
**Trigger:** Belum ada closing setelah jam 21:00  
**Severity:** `warning`

**Example:**
```
Title: 📋 Belum Ada Closing Harian!
Message: Sudah lewat jam 21:00 tapi belum ada closing harian untuk hari ini. 
         Segera lakukan closing untuk melihat laporan rugi lengkap!
```

---

### 5. **Margin Low** (`margin_low`)
**Trigger:** Margin < 30%  
**Severity:**
- `critical` jika < 20%
- `warning` jika < 30%

**Example:**
```
Title: 📉 Margin Rendah!
Message: Margin hari ini hanya 25.0%, di bawah target 30%. 
         Revenue: Rp 5,000,000, HPP: Rp 3,750,000. 
         Review pricing atau kurangi biaya produksi!
```

---

### 6. **Topping Errors High** (`topping_error_high`)
**Trigger:** Kesalahan topping > 5 per hari  
**Severity:**
- `critical` jika > 10
- `warning` jika > 5

**Example:**
```
Title: ❌ Kesalahan Topping Tinggi!
Message: Hari ini sudah ada 8 kesalahan topping (target: max 5). 
         Total rugi: Rp 48,000. 
         Perlu training ulang untuk kasir!
```

---

## 🔧 API Endpoints

### 1. **GET /api/alerts**
Get list of alerts with filters

**Query Params:**
- `outlet_id` (optional): Filter by outlet
- `user_id` (optional): Filter by user
- `type` (optional): Filter by alert type
- `severity` (optional): Filter by severity (info/warning/critical)
- `is_read` (optional): Filter by read status (true/false)
- `limit` (optional): Number of alerts (default: 10, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "outlet_id": "uuid",
        "user_id": "uuid",
        "type": "stock_low",
        "severity": "warning",
        "title": "Stok standar Menipis!",
        "message": "Stok donat non-topping standar tinggal 15.0%...",
        "metadata": {
          "ukuran": "standar",
          "current_stock": 30,
          "production_qty": 200,
          "percentage": "15.0"
        },
        "is_read": false,
        "read_at": null,
        "created_at": "2026-05-06T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "limit": 10,
      "offset": 0,
      "has_more": false
    },
    "unread_count": 3
  }
}
```

---

### 2. **POST /api/alerts**
Create a new alert manually

**Body:**
```json
{
  "outlet_id": "uuid",
  "user_id": "uuid",
  "type": "stock_low",
  "severity": "warning",
  "title": "Custom Alert Title",
  "message": "Custom alert message",
  "metadata": {
    "custom_field": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "outlet_id": "uuid",
    "type": "stock_low",
    "severity": "warning",
    "title": "Custom Alert Title",
    "message": "Custom alert message",
    "is_read": false,
    "created_at": "2026-05-06T10:30:00Z"
  }
}
```

---

### 3. **PUT /api/alerts/[id]/read**
Mark single alert as read

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "is_read": true,
    "read_at": "2026-05-06T10:35:00Z"
  }
}
```

---

### 4. **PUT /api/alerts/read-all**
Mark all alerts as read

**Query Params:**
- `outlet_id` (optional): Filter by outlet
- `user_id` (optional): Filter by user

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_count": 5
  },
  "message": "5 alerts marked as read"
}
```

---

### 5. **POST /api/alerts/check**
Trigger alert checks manually

**Body:**
```json
{
  "outlet_id": "uuid",
  "date": "2026-05-06"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert checks completed for outlet uuid",
  "data": {
    "outlet_id": "uuid",
    "date": "2026-05-06"
  }
}
```

---

### 6. **GET /api/alerts/check**
Trigger alert checks via GET (for cron)

**Query Params:**
- `outlet_id` (optional): Check specific outlet
- `date` (optional): Check specific date (default: today)
- `token` (required for cron): Secret token

**Example:**
```
GET /api/alerts/check?token=YOUR_SECRET_TOKEN
```

---

## ⚙️ Alert Service Functions

### Core Functions

```typescript
// Check single outlet
await runAlertChecks(outlet_id, date);

// Check all outlets
await runAlertChecksForAllOutlets(date);

// Individual checks
await checkStockLow(outlet_id, date);
await checkWasteRateHigh(outlet_id, date);
await checkNoProduction(outlet_id, date);
await checkNoClosing(outlet_id, date);
await checkMarginLow(outlet_id, date);
await checkToppingErrorsHigh(outlet_id, date);
```

---

## 🔄 Alert Context (Frontend)

### Usage

```typescript
import { useAlerts } from '@/lib/context/alert-context';

function MyComponent() {
  const { 
    alerts, 
    unreadCount, 
    isLoading, 
    markAsRead, 
    markAllAsRead, 
    refreshAlerts 
  } = useAlerts();

  return (
    <div>
      <p>Unread: {unreadCount}</p>
      {alerts.map(alert => (
        <div key={alert.id}>
          <h3>{alert.title}</h3>
          <p>{alert.message}</p>
          <button onClick={() => markAsRead(alert.id)}>
            Mark as Read
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Features
- ✅ Auto-fetch alerts on mount
- ✅ Auto-refresh every 60 seconds
- ✅ Mark single alert as read
- ✅ Mark all alerts as read
- ✅ Manual refresh
- ✅ Unread count tracking

---

## 🕐 Cron Job Setup

### Option 1: Vercel Cron (Recommended)

**File:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/alerts/check?token=YOUR_SECRET_TOKEN",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Schedule:** Every hour (0 * * * *)

---

### Option 2: GitHub Actions

**File:** `.github/workflows/alert-checks.yml`
```yaml
name: Alert Checks

on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:  # Manual trigger

jobs:
  check-alerts:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Alert Checks
        run: |
          curl -X GET "https://your-domain.com/api/alerts/check?token=${{ secrets.CRON_SECRET_TOKEN }}"
```

---

### Option 3: External Cron Service

Use services like:
- **cron-job.org**
- **EasyCron**
- **Cronitor**

**URL:** `https://your-domain.com/api/alerts/check?token=YOUR_SECRET_TOKEN`  
**Schedule:** Every hour

---

## 🔐 Security

### Environment Variables

Add to `.env.local`:
```bash
CRON_SECRET_TOKEN=your-random-secret-token-here
```

**Generate token:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Token Verification

The `/api/alerts/check` GET endpoint verifies the token:
```typescript
const cronToken = process.env.CRON_SECRET_TOKEN;
if (cronToken && token !== cronToken) {
  return NextResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
    { status: 401 }
  );
}
```

---

## 📊 Alert Thresholds

Current thresholds (configurable in `lib/services/alert-service.ts`):

```typescript
const THRESHOLDS = {
  STOCK_LOW_PERCENTAGE: 20,      // Alert when stock < 20%
  WASTE_RATE_HIGH: 15,           // Alert when waste rate > 15%
  MARGIN_LOW: 30,                // Alert when margin < 30%
  PRODUCTION_TIME: '08:00',      // Alert if no production by 08:00
  CLOSING_TIME: '21:00',         // Alert if no closing by 21:00
  TOPPING_ERROR_COUNT: 5,        // Alert if topping errors > 5
};
```

---

## 🎨 UI Components

### AlertBell Component

Located in: `components/dashboard/alert-bell.tsx` (if exists)

**Features:**
- 🔔 Bell icon with unread badge
- 📋 Dropdown with recent alerts
- 🎨 Color coding by severity
- ✅ Mark as read functionality
- 🔄 Auto-refresh every 60 seconds

---

## 🧪 Testing

### Manual Testing

1. **Create test alert:**
```bash
curl -X POST http://localhost:3000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "outlet_id": "uuid",
    "type": "stock_low",
    "severity": "warning",
    "title": "Test Alert",
    "message": "This is a test alert"
  }'
```

2. **Get alerts:**
```bash
curl http://localhost:3000/api/alerts?is_read=false
```

3. **Mark as read:**
```bash
curl -X PUT http://localhost:3000/api/alerts/[id]/read
```

4. **Trigger checks:**
```bash
curl -X POST http://localhost:3000/api/alerts/check \
  -H "Content-Type: application/json" \
  -d '{"outlet_id": "uuid"}'
```

---

## 📝 Integration Points

### When to Trigger Alert Checks

1. **After Production Input** (Task 3.1)
   ```typescript
   // In POST /api/production/daily
   await runAlertChecks(outlet_id, date);
   ```

2. **After Sale** (Task 4.4)
   ```typescript
   // In POST /api/orders
   await checkStockLow(outlet_id, date);
   ```

3. **After Closing** (Task 6.1)
   ```typescript
   // In POST /api/closing/daily
   await runAlertChecks(outlet_id, date);
   ```

4. **Scheduled (Cron)**
   ```
   Every hour: Check all outlets
   ```

---

## ✅ Checklist

### Implementation
- [x] Database table created (`alerts`)
- [x] API routes created (GET, POST, PUT)
- [x] Alert service created (`alert-service.ts`)
- [x] Alert context created (`alert-context.tsx`)
- [x] Alert checks implemented (6 types)
- [x] Cron endpoint created (`/api/alerts/check`)
- [x] Documentation created

### Integration
- [ ] Integrate with production input (Task 3.1)
- [ ] Integrate with POS (Task 4.4)
- [ ] Integrate with closing (Task 6.1)
- [ ] Setup cron job (Vercel/GitHub Actions)
- [ ] Add AlertBell to dashboard header
- [ ] Test all alert types

### Testing
- [ ] Test alert creation
- [ ] Test alert fetching
- [ ] Test mark as read
- [ ] Test alert checks
- [ ] Test cron endpoint
- [ ] Test with real data

---

## 🚀 Deployment

### Steps

1. **Add environment variable:**
   ```bash
   CRON_SECRET_TOKEN=your-secret-token
   ```

2. **Setup cron job** (choose one):
   - Vercel Cron (add `vercel.json`)
   - GitHub Actions (add workflow file)
   - External service (configure URL)

3. **Deploy to production**

4. **Verify cron is running:**
   - Check Vercel logs
   - Check GitHub Actions runs
   - Check external service logs

5. **Monitor alerts:**
   - Check `/api/alerts` endpoint
   - Check database `alerts` table
   - Check user notifications

---

## 📚 References

- **Task:** 8.1, 8.2
- **Files:**
  - `app/api/alerts/route.ts`
  - `app/api/alerts/[id]/read/route.ts`
  - `app/api/alerts/read-all/route.ts`
  - `app/api/alerts/check/route.ts`
  - `lib/services/alert-service.ts`
  - `lib/context/alert-context.tsx`
  - `QueryDATABASE/32-alerts-system.sql`

---

**Status:** ✅ **READY FOR INTEGRATION**

**Next Steps:**
1. Integrate alert checks into business logic
2. Setup cron job
3. Add AlertBell UI component
4. Test with real data

---

**Last Updated:** 2026-05-06  
**Author:** Kiro AI
