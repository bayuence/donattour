# 💸 Expense Tracking System

## Overview
Sistem pelacakan pengeluaran outlet yang terintegrasi penuh dengan database untuk mendukung 500+ outlet.

**Status:** ✅ **PRODUCTION READY** (May 19, 2026)

---

## Features

### ✅ Core Features
1. **Real-time Expense Tracking**
   - Input pengeluaran harian per outlet
   - 7 kategori pengeluaran yang komprehensif
   - Timestamp otomatis dengan timezone WIB
   - Audit trail (siapa yang input)

2. **Category Management**
   - 🧂 Bahan Baku (tepung, gula, minyak, dll)
   - ⚙️ Operasional (listrik, gas, air, dll)
   - 👤 Gaji & Upah
   - 🚗 Transportasi & Pengiriman
   - 🔧 Perawatan & Perbaikan
   - 📢 Marketing & Promosi
   - 📌 Lainnya

3. **Date-based Filtering**
   - View expenses by specific date
   - Date range queries
   - Historical data access

4. **Summary & Analytics**
   - Daily summary per outlet
   - Period summary with breakdown
   - Category-wise analysis
   - Average daily expense calculation

5. **Security & Access Control**
   - Row Level Security (RLS) enabled
   - Users can only view/edit expenses from their outlet
   - Only expense creator can edit/delete (within 24 hours)
   - Owner role has full access

---

## Database Schema

### Table: `expenses`

```sql
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    kategori VARCHAR(50) NOT NULL CHECK (kategori IN (
        'operasional', 'bahan_baku', 'gaji', 'transportasi', 
        'perawatan', 'marketing', 'lainnya'
    )),
    keterangan TEXT NOT NULL,
    jumlah NUMERIC(15,2) NOT NULL CHECK (jumlah > 0),
    bukti_url TEXT,  -- Optional: URL foto bukti
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Indexes (Performance Optimized)
```sql
-- Most common query: by outlet and date
CREATE INDEX idx_expenses_outlet_date ON expenses (outlet_id, tanggal DESC);

-- Category filtering
CREATE INDEX idx_expenses_kategori ON expenses (outlet_id, kategori, tanggal DESC);

-- Audit trail
CREATE INDEX idx_expenses_created_by ON expenses (created_by, tanggal DESC);

-- Date range queries
CREATE INDEX idx_expenses_date_range ON expenses (tanggal DESC, outlet_id);
```

---

## API Endpoints

### 1. GET /api/expenses
**Purpose:** Fetch expenses with filters

**Query Parameters:**
- `outlet_id` (required): UUID of outlet
- `tanggal` (optional): Specific date (YYYY-MM-DD)
- `start_date` (optional): Start date for range
- `end_date` (optional): End date for range
- `kategori` (optional): Filter by category
- `summary` (optional): 'daily' | 'period' | 'category'
- `limit` (optional): Number of records (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "outlet_id": "uuid",
      "tanggal": "2026-05-19",
      "kategori": "bahan_baku",
      "keterangan": "Tepung terigu 25kg",
      "jumlah": 175000,
      "bukti_url": null,
      "created_by": "uuid",
      "created_at": "2026-05-19T08:30:00Z",
      "updated_at": "2026-05-19T08:30:00Z",
      "outlet": {
        "id": "uuid",
        "nama": "Outlet Pusat"
      },
      "created_by_user": {
        "id": "uuid",
        "name": "Rina"
      }
    }
  ],
  "meta": {
    "count": 10,
    "limit": 50,
    "offset": 0
  }
}
```

### 2. POST /api/expenses
**Purpose:** Create new expense

**Request Body:**
```json
{
  "outlet_id": "uuid",
  "tanggal": "2026-05-19",
  "kategori": "bahan_baku",
  "keterangan": "Tepung terigu 25kg",
  "jumlah": 175000,
  "bukti_url": null
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* expense object */ },
  "message": "Expense created successfully"
}
```

### 3. GET /api/expenses/[id]
**Purpose:** Get single expense by ID

**Response:**
```json
{
  "success": true,
  "data": { /* expense object with details */ }
}
```

### 4. PUT /api/expenses/[id]
**Purpose:** Update expense (only by creator)

**Request Body:**
```json
{
  "kategori": "operasional",
  "keterangan": "Updated description",
  "jumlah": 200000
}
```

### 5. DELETE /api/expenses/[id]
**Purpose:** Delete expense (only by creator within 24 hours)

**Response:**
```json
{
  "success": true,
  "message": "Expense deleted successfully"
}
```

---

## Database Functions

### 1. get_expense_daily_summary()
**Purpose:** Get daily expense summary with category breakdown

```sql
SELECT * FROM get_expense_daily_summary(
    'outlet-uuid',
    '2026-05-19'
);
```

**Returns:**
```
total_pengeluaran | jumlah_item | operasional | bahan_baku | gaji | ...
------------------|-------------|-------------|------------|------|----
750000            | 8           | 150000      | 400000     | 200000 | ...
```

### 2. get_expense_period_summary()
**Purpose:** Get period summary with analytics

```sql
SELECT * FROM get_expense_period_summary(
    'outlet-uuid',
    '2026-05-01',
    '2026-05-31'
);
```

**Returns:**
```
total_pengeluaran | jumlah_item | rata_rata_harian | kategori | kategori_total | ...
------------------|-------------|------------------|----------|----------------|----
15000000          | 150         | 500000           | bahan_baku | 8000000      | ...
```

---

## UI Components

### Page: `/dashboard/pengeluaran-outlet`

**Features:**
- ✅ Date selector for viewing specific dates
- ✅ Real-time summary cards (Total & Count)
- ✅ Add expense form with validation
- ✅ Category selector with visual indicators
- ✅ Expense list with delete functionality
- ✅ Loading states
- ✅ Error handling
- ✅ Responsive design

**User Flow:**
1. Select date to view expenses
2. Click "+ Tambah" to open form
3. Fill in details (keterangan, jumlah, kategori)
4. Submit to save to database
5. View in list with ability to delete

---

## Integration Points

### 1. Dashboard Owner
Expense data can be integrated into main dashboard for:
- Daily financial summary
- Profit/loss calculation
- Cost analysis by category
- Trend analysis

### 2. Laporan Outlet
Expense data will be used in outlet daily reports:
- Complete financial picture
- Expense breakdown by category
- Comparison with revenue

### 3. Reports Module
Period reports can include:
- Expense trends over time
- Category-wise analysis
- Outlet comparison
- Budget vs actual

---

## Security Features

### Row Level Security (RLS)
```sql
-- Users can only view expenses from their outlet
CREATE POLICY expenses_select_policy ON expenses
    FOR SELECT
    USING (outlet_id IN (
        SELECT outlet_id FROM users WHERE id = auth.uid()
    ));

-- Users can only insert for their outlet
CREATE POLICY expenses_insert_policy ON expenses
    FOR INSERT
    WITH CHECK (
        outlet_id IN (SELECT outlet_id FROM users WHERE id = auth.uid())
        AND created_by = auth.uid()
    );

-- Users can only update their own expenses
CREATE POLICY expenses_update_policy ON expenses
    FOR UPDATE
    USING (created_by = auth.uid());

-- Users can only delete their own expenses (within 24 hours)
CREATE POLICY expenses_delete_policy ON expenses
    FOR DELETE
    USING (
        created_by = auth.uid()
        AND created_at > NOW() - INTERVAL '24 hours'
    );
```

---

## Performance Optimization

### 1. Database Indexes
- 4 strategic indexes for common queries
- Optimized for date-based filtering
- Category and audit trail support

### 2. Query Optimization
- Efficient aggregation functions
- Minimal joins
- Proper use of COALESCE for null handling

### 3. API Response
- Pagination support (limit/offset)
- Selective field loading
- Summary endpoints for analytics

---

## Testing Checklist

### ✅ Database
- [x] Table created successfully
- [x] Indexes created
- [x] Functions working
- [x] RLS policies active
- [x] Constraints enforced

### ✅ API
- [x] GET /api/expenses (list)
- [x] GET /api/expenses (with filters)
- [x] GET /api/expenses (summary modes)
- [x] POST /api/expenses (create)
- [x] PUT /api/expenses/[id] (update)
- [x] DELETE /api/expenses/[id] (delete)
- [x] Error handling
- [x] Authentication checks
- [x] Authorization checks

### ✅ UI
- [x] Date selector working
- [x] Form validation
- [x] Submit to API
- [x] List display
- [x] Delete functionality
- [x] Loading states
- [x] Error messages
- [x] Responsive design

---

## Deployment Steps

### 1. Run SQL Schema
```bash
# In Supabase SQL Editor
# Run: QueryDATABASE/11-schema-expenses.sql
```

### 2. Verify Database
```sql
-- Check table exists
SELECT * FROM information_schema.tables WHERE table_name = 'expenses';

-- Check indexes
SELECT * FROM pg_indexes WHERE tablename = 'expenses';

-- Check functions
SELECT * FROM information_schema.routines WHERE routine_name LIKE '%expense%';
```

### 3. Test API Endpoints
```bash
# Test GET
curl http://localhost:3000/api/expenses?outlet_id=xxx

# Test POST
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{"outlet_id":"xxx","tanggal":"2026-05-19","kategori":"bahan_baku","keterangan":"Test","jumlah":50000}'
```

### 4. Test UI
- Navigate to `/dashboard/pengeluaran-outlet`
- Add expense
- View list
- Delete expense
- Change date

---

## Future Enhancements

### Phase 2 (Optional)
1. **Photo Upload**
   - Upload bukti pengeluaran (receipt photo)
   - Store in Supabase Storage
   - Display in expense detail

2. **Bulk Import**
   - Import expenses from Excel/CSV
   - Validation and error handling
   - Batch processing

3. **Budget Management**
   - Set monthly budget per category
   - Alert when exceeding budget
   - Budget vs actual comparison

4. **Approval Workflow**
   - Manager approval for large expenses
   - Multi-level approval
   - Notification system

5. **Export & Reports**
   - Export to Excel/PDF
   - Custom date ranges
   - Category-wise reports
   - Outlet comparison

---

## Support

For issues or questions:
1. Check database logs in Supabase
2. Check API logs in Vercel/deployment platform
3. Check browser console for UI errors
4. Review this documentation

---

**Last Updated:** May 19, 2026  
**Status:** ✅ Production Ready  
**Version:** 1.0
