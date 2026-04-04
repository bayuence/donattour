# 🚀 PANDUAN SETUP DATABASE DONATTOUR

## 📋 Langkah-langkah Setup Database

### **STEP 1: Setup Supabase Project**

1. **Buka Supabase** (jika belum punya akun):
   - Buka https://supabase.com
   - Sign up / Login
   - Create New Project

2. **Catat Credentials**:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **API Key (anon)**: `eyJhbGc...` (untuk public access)
   - **Service Role Key**: `eyJhbGc...` (untuk admin access)

3. **Buat file `.env.local`** di root project:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

---

### **STEP 2: Jalankan SQL Schema**

Di **Supabase Dashboard** → **SQL Editor** → **New Query**

**Jalankan file-file SQL berurutan:**

#### 1️⃣ **Core Schema** (01-schema-core.sql)
```bash
# Copy-paste isi file QueryDATABASE/01-schema-core.sql
# Klik "Run"
```

**Hasilnya:** 
- ✅ Table `outlets` created
- ✅ Table `users` created
- ✅ Table `products` created
- ✅ Table `transactions` created
- ✅ Dan lainnya...

#### 2️⃣ **Inventory Schema** (02-schema-inventory.sql)
```bash
# Copy-paste isi file QueryDATABASE/02-schema-inventory.sql
# Klik "Run"
```

**Hasilnya:**
- ✅ Table `inventory_items` created
- ✅ Table `inventory_movements` created
- ✅ Table `topping_sessions` created
- ✅ Triggers otomatis created

#### 3️⃣ **OTR Schema** (03-schema-otr.sql)
```bash
# Copy-paste isi file QueryDATABASE/03-schema-otr.sql
# Klik "Run"
```

**Hasilnya:**
- ✅ Table `otr_vehicles` created
- ✅ Table `otr_paket_master` created
- ✅ Table `otr_sessions` created
- ✅ Table `otr_transaksi` created

#### 4️⃣ **Orders Schema** (04-schema-orders.sql)
```bash
# Copy-paste isi file QueryDATABASE/04-schema-orders.sql
# Klik "Run"
```

**Hasilnya:**
- ✅ Table `orders` created
- ✅ Table `kasir_sessions` created
- ✅ Table `kitchen_display_queue` created

#### 5️⃣ **Views** (05-views.sql)
```bash
# Copy-paste isi file QueryDATABASE/05-views.sql
# Klik "Run"
```

**Hasilnya:**
- ✅ View `v_inventory_status_per_outlet` created
- ✅ View `v_otr_stock_realtime` created
- ✅ Dan 8 views lainnya...

#### 6️⃣ **Indexes** (06-indexes.sql)
```bash
# Copy-paste isi file QueryDATABASE/06-indexes.sql
# Klik "Run"
```

**Hasilnya:**
- ✅ Performance indexes created

---

### **STEP 3: Insert Sample Data** (Optional - untuk testing)

Buat query baru, copy-paste ini:

```sql
-- Insert Sample Outlets
INSERT INTO outlets (id, nama, kode, alamat, telepon, status) VALUES
  (uuid_generate_v4(), 'Outlet Pusat', 'OUT-PUSAT', 'Jl. Sudirman No. 123', '021-1234567', 'aktif'),
  (uuid_generate_v4(), 'Outlet Mall', 'OUT-MALL', 'Mall Grand Indonesia Lt. 2', '021-7654321', 'aktif'),
  (uuid_generate_v4(), 'Outlet Timur', 'OUT-TIMUR', 'Jl. Raya Bogor KM 5', '021-9876543', 'aktif');

-- Insert Sample Users
INSERT INTO users (id, username, password_hash, name, role, is_active) VALUES
  (uuid_generate_v4(), 'admin', '$2a$10$example', 'Admin Pusat', 'admin', true),
  (uuid_generate_v4(), 'kasir1', '$2a$10$example', 'Kasir 1', 'cashier', true),
  (uuid_generate_v4(), 'supervisor1', '$2a$10$example', 'Supervisor Produksi', 'supervisor', true);

-- Insert Sample Product Categories
INSERT INTO product_categories (id, nama, kode) VALUES
  (uuid_generate_v4(), 'Donat Classic', 'CAT-CLASSIC'),
  (uuid_generate_v4(), 'Donat Premium', 'CAT-PREMIUM'),
  (uuid_generate_v4(), 'Minuman', 'CAT-DRINK');

-- Insert Sample OTR Paket
INSERT INTO otr_paket_master (kode, nama, tipe, varian_detail, harga) VALUES
  ('REG1', 'Reguler Paket 1', 'isi_3', '[{"topping": "Ceres", "qty": 1}, {"topping": "Gula", "qty": 1}, {"topping": "Cokelat", "qty": 1}]', 20000),
  ('REG2', 'Reguler Paket 2', 'isi_3', '[{"topping": "Cokelat", "qty": 3}]', 25000),
  ('PREM1', 'Premium Paket 1', 'isi_6', '[{"topping": "Cokelat", "qty": 2}, {"topping": "Strawberry", "qty": 2}, {"topping": "Vanilla", "qty": 2}]', 45000);

SELECT 'Sample data berhasil di-insert! ✅' AS status;
```

---

### **STEP 4: Verify Database**

Cek apakah semua table berhasil dibuat:

```sql
-- Cek semua table
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Harusnya ada 30+ tables!** ✅

---

### **STEP 5: Update Supabase Client di Aplikasi**

Buat file `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

### **STEP 6: Test Connection**

Buat file test di `app/test-db/page.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestDBPage() {
  const [outlets, setOutlets] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOutlets() {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
      
      if (error) {
        setError(error.message)
      } else {
        setOutlets(data || [])
      }
    }
    
    fetchOutlets()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4">
          Error: {error}
        </div>
      )}
      
      {outlets.length > 0 ? (
        <div className="bg-green-100 text-green-700 p-4 rounded">
          ✅ Database Connected! Found {outlets.length} outlets.
          <pre className="mt-2 text-xs">
            {JSON.stringify(outlets, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="bg-yellow-100 text-yellow-700 p-4 rounded">
          ⏳ Loading...
        </div>
      )}
    </div>
  )
}
```

Akses: `http://localhost:3000/test-db`

Jika muncul "✅ Database Connected!" → **BERHASIL!** 🎉

---

## 🎯 CHECKLIST SETUP:

- [ ] Supabase project created
- [ ] `.env.local` file created dengan credentials
- [ ] Run 01-schema-core.sql ✅
- [ ] Run 02-schema-inventory.sql ✅
- [ ] Run 03-schema-otr.sql ✅
- [ ] Run 04-schema-orders.sql ✅
- [ ] Run 05-views.sql ✅
- [ ] Run 06-indexes.sql ✅
- [ ] Insert sample data (optional)
- [ ] Create `lib/supabase.ts`
- [ ] Test connection berhasil ✅

---

## 🚨 TROUBLESHOOTING:

### **Error: "permission denied"**
- Cek Row Level Security (RLS) di Supabase
- Untuk development, bisa disable RLS dulu:
  ```sql
  ALTER TABLE outlets DISABLE ROW LEVEL SECURITY;
  ```

### **Error: "relation does not exist"**
- Pastikan run schema SQL di **correct order** (01 → 02 → 03 → 04 → 05 → 06)
- Refresh schema di Supabase dashboard

### **Error: "duplicate key"**
- Sample data sudah pernah di-insert
- Skip atau delete dulu data lama

---

## 📞 BUTUH BANTUAN?

Jika ada error atau stuck, screenshot error-nya dan tanya ke saya! 💬

---

**Next Step:** Setelah database setup, kita bisa lanjut integrate dengan frontend! 🚀
