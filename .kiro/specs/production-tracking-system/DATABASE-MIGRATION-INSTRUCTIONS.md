# 🗄️ DATABASE MIGRATION INSTRUCTIONS

**Date:** May 4, 2026  
**Status:** ⚠️ **ACTION REQUIRED**

---

## ⚠️ CRITICAL: SQL BELUM DIJALANKAN!

**File:** `QueryDATABASE/32-alerts-system.sql`  
**Status:** ❌ **BELUM DIJALANKAN DI SUPABASE**

---

## 🚨 DAMPAK

Tanpa menjalankan SQL ini, alert system **TIDAK AKAN BEKERJA**:

- ❌ Table `alerts` tidak ada
- ❌ API `/api/alerts` akan error 500
- ❌ AlertContext akan gagal fetch
- ❌ Console error akan muncul lagi

---

## ✅ CARA MENJALANKAN

### Step 1: Buka Supabase Dashboard

1. Login ke [https://supabase.com](https://supabase.com)
2. Pilih project kamu
3. Klik **SQL Editor** di sidebar kiri

---

### Step 2: Copy SQL Script

Buka file: `QueryDATABASE/32-alerts-system.sql`

**Atau copy dari sini:**

```sql
-- ============================================================================
-- ALERTS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID REFERENCES outlets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical'))
);

-- Indexes
CREATE INDEX idx_alerts_outlet ON alerts(outlet_id);
CREATE INDEX idx_alerts_user ON alerts(user_id);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_is_read ON alerts(is_read);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alerts_unread ON alerts(outlet_id, is_read, created_at DESC) WHERE is_read = FALSE;

-- Comments
COMMENT ON TABLE alerts IS 'System alerts and notifications for users';
COMMENT ON COLUMN alerts.outlet_id IS 'Outlet related to this alert (nullable for system-wide alerts)';
COMMENT ON COLUMN alerts.user_id IS 'User who should receive this alert (nullable for all users)';
COMMENT ON COLUMN alerts.type IS 'Alert type: stock_low, waste_high, no_production, no_closing, etc.';
COMMENT ON COLUMN alerts.severity IS 'Alert severity: info, warning, critical';
COMMENT ON COLUMN alerts.title IS 'Short alert title';
COMMENT ON COLUMN alerts.message IS 'Detailed alert message';
COMMENT ON COLUMN alerts.metadata IS 'Additional data in JSON format';
COMMENT ON COLUMN alerts.is_read IS 'Whether alert has been read';
COMMENT ON COLUMN alerts.read_at IS 'Timestamp when alert was read';
```

---

### Step 3: Paste & Run

1. Paste SQL ke SQL Editor
2. Klik **Run** atau tekan `Ctrl+Enter`
3. Tunggu sampai selesai (biasanya < 1 detik)

---

### Step 4: Verify

Cek apakah table berhasil dibuat:

```sql
-- Check table exists
SELECT * FROM alerts LIMIT 1;

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'alerts';
```

Expected output:
- Query berhasil (meskipun 0 rows)
- 7 indexes muncul

---

## 🧪 TEST ALERT SYSTEM

Setelah SQL dijalankan, test dengan insert sample alert:

```sql
-- Insert sample alert
INSERT INTO alerts (
    outlet_id, 
    type, 
    severity, 
    title, 
    message, 
    metadata
) VALUES (
    (SELECT id FROM outlets LIMIT 1),
    'stock_low',
    'warning',
    'Stok Non-Topping Menipis',
    'Stok donat non-topping standar tinggal 15% dari produksi hari ini.',
    '{"current_stock": 30, "production_qty": 200, "percentage": 15}'::jsonb
);

-- Verify
SELECT * FROM alerts;
```

Expected:
- 1 row inserted
- Alert muncul dengan semua field

---

## 🔄 SETELAH SQL DIJALANKAN

### 1. Refresh Browser

Refresh halaman dashboard untuk trigger AlertContext fetch ulang.

### 2. Check Console

Buka browser console (F12), seharusnya:
- ✅ No errors
- ✅ Alert fetch berhasil
- ✅ Polling berjalan setiap 60 detik

### 3. Test API Manually

```bash
# Test GET alerts
curl http://localhost:3000/api/alerts

# Expected response:
{
  "success": true,
  "data": {
    "items": [...],
    "unread_count": 1,
    "pagination": {...}
  }
}
```

---

## 📋 CHECKLIST

Sebelum lanjut ke Task 8.2, pastikan:

- [ ] SQL `32-alerts-system.sql` sudah dijalankan di Supabase
- [ ] Table `alerts` sudah ada
- [ ] 7 indexes sudah dibuat
- [ ] Sample alert berhasil di-insert
- [ ] API `/api/alerts` return 200 OK
- [ ] No console errors
- [ ] AlertContext fetch berhasil

---

## 🚀 SETELAH SELESAI

**Ketik:** "SQL sudah dijalankan, lanjut Task 8.2"

Saya akan:
1. Verify alert system bekerja
2. Lanjut build Task 8.2 (Alert Checking Service)

---

## 💡 TIPS

### Jika Error: "relation outlets does not exist"

Berarti table `outlets` belum ada. Jalankan dulu:
```sql
-- Check outlets table
SELECT * FROM outlets LIMIT 1;
```

Jika error, jalankan dulu `31-production-tracking-system.sql`

### Jika Error: "relation users does not exist"

Berarti table `users` belum ada. Ini optional, bisa skip dengan:
```sql
-- Modify foreign key to be optional
ALTER TABLE alerts ALTER COLUMN user_id DROP NOT NULL;
```

---

**Status:** ⏳ **WAITING FOR USER TO RUN SQL**  
**Next:** Task 8.2 (after SQL executed)

