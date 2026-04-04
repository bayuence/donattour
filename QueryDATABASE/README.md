# 🗄️ DONATTOUR DATABASE - Schema & Queries

**Dibuat:** 1 April 2026  
**Database:** PostgreSQL (Supabase)  
**Purpose:** Centralized SQL queries untuk Donattour System

---

## 📋 DAFTAR FILE QUERIES:

1. `01-schema-core.sql` - Core tables (outlets, users, products)
2. `02-schema-inventory.sql` - Inventory tracking system
3. `03-schema-otr.sql` - OTR management system
4. `04-schema-orders.sql` - Order management (outlet)
5. `05-views.sql` - Database views untuk query cepat
6. `06-indexes.sql` - Performance indexes
7. `07-functions.sql` - Stored procedures & functions
8. `08-seed-data.sql` - Sample/demo data
9. `09-migrations.sql` - Migration scripts
10. `10-queries-common.sql` - Common queries untuk aplikasi

---

## 🚀 CARA PENGGUNAAN:

### Setup Database Baru:
```bash
# Jalankan berurutan di Supabase SQL Editor:
1. 01-schema-core.sql
2. 02-schema-inventory.sql
3. 03-schema-otr.sql
4. 04-schema-orders.sql
5. 05-views.sql
6. 06-indexes.sql
7. 07-functions.sql
8. 08-seed-data.sql (optional - untuk development)
```

### Update Database:
```bash
# Jalankan migration sesuai versi
09-migrations.sql
```

---

## 📝 KONVENSI PENAMAAN:

### Tables:
- Singular noun: `user`, `product`, `outlet`
- Lowercase dengan underscore: `otr_session`, `inventory_item`

### Columns:
- Lowercase dengan underscore: `created_at`, `user_id`
- Foreign keys: `{table}_id` (e.g., `outlet_id`, `user_id`)
- Timestamps: `created_at`, `updated_at`, `deleted_at`

### Views:
- Prefix `v_`: `v_outlet_inventory`, `v_otr_stock_realtime`

### Functions:
- Prefix `fn_`: `fn_update_stock()`, `fn_calculate_total()`

### Indexes:
- Format: `idx_{table}_{column}`: `idx_products_outlet_id`

---

## 🔐 SECURITY NOTES:

- **Row Level Security (RLS)** enabled untuk semua tables
- **Policies** defined per user role (admin, owner, cashier, dll)
- **Audit logs** untuk semua perubahan data penting

---

## 📊 ER DIAGRAM:

```
[outlets] ──1:N── [users]
[outlets] ──1:N── [products]
[outlets] ──1:N── [inventory_items]
[outlets] ──1:N── [orders]
[outlets] ──1:N── [otr_sessions]

[otr_sessions] ──1:N── [otr_loading]
[otr_sessions] ──1:N── [otr_transaksi]

[otr_paket_master] ──1:N── [otr_loading]
[otr_paket_master] ──1:N── [otr_transaksi_items]

[inventory_items] ──1:N── [inventory_movements]
[orders] ──1:N── [order_items]
```

---

## 📞 KONTAK:

Untuk pertanyaan atau issue terkait database:
- Database Admin: Bayuence
- Repository: github.com/bayuence/donattour

---

**Last Updated:** 1 April 2026
