# 💳 PAYMENT SYSTEM CLARIFICATION - DONATTOUR

**Document Version:** 1.0  
**Last Updated:** June 26, 2026  
**Status:** ✅ Clarified

---

## ⚠️ IMPORTANT NOTICE

### ❌ MIDTRANS IS NOT USED

This project **DOES NOT** use Midtrans or any external payment gateway!

**Reasons:**
1. All payments are **manual entries** by kasir
2. Payment methods are **custom-configured** by admin
3. **No automatic payment processing** (no API calls to payment providers)
4. Simpler, more flexible for offline-first design

---

## ✅ ACTUAL PAYMENT SYSTEM

### Architecture

```
┌──────────────────────────────────────────────────────┐
│           CUSTOM PAYMENT METHODS SYSTEM              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. ADMIN SETUP (Menu: Kelola Metode Pembayaran)    │
│     ├─ Create payment method                        │
│     │  • Name: "BCA Transfer"                       │
│     │  • Type: "transfer"                           │
│     │  • Account Number: "1234567890"               │
│     │  • Account Name: "PT Donattour"               │
│     │  • Logo: upload image                         │
│     └─ Save to database: payment_methods table      │
│                                                      │
│  2. KASIR CHECKOUT                                   │
│     ├─ Select product & quantity                    │
│     ├─ Click "Bayar"                                │
│     ├─ Select payment method (from list)            │
│     │  Options: Tunai, BCA Transfer, QRIS, etc.    │
│     ├─ Confirm payment                              │
│     └─ Print receipt                                │
│                                                      │
│  3. TRANSACTION RECORDED                             │
│     ├─ Order saved with payment_method UUID         │
│     ├─ No external API call                         │
│     └─ Manual verification by staff                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 📋 DATABASE SCHEMA

### Table: `payment_methods`

```sql
CREATE TABLE payment_methods (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,              -- Display name (e.g., "BCA Transfer")
  type           TEXT NOT NULL,              -- Category (cash, transfer, qris, ewallet, card, other)
  account_number TEXT,                       -- Optional: bank account or phone number
  account_name   TEXT,                       -- Optional: account holder name
  logo_url       TEXT,                       -- Optional: logo image URL
  is_active      BOOLEAN DEFAULT true,       -- Active/inactive status
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);
```

### Example Data

| id | name | type | account_number | account_name | logo_url | is_active |
|----|------|------|----------------|--------------|----------|-----------|
| uuid-1 | Tunai | cash | NULL | NULL | NULL | true |
| uuid-2 | BCA Transfer | transfer | 1234567890 | PT Donattour | /logos/bca.png | true |
| uuid-3 | QRIS DANA | qris | 08123456789 | Donattour | /logos/dana.png | true |
| uuid-4 | GoPay | ewallet | 08123456789 | NULL | /logos/gopay.png | true |
| uuid-5 | Kartu Debit/Kredit | card | NULL | NULL | /logos/card.png | true |

---

## 🔄 PAYMENT FLOW

### Scenario: Customer buys 6 donuts for Rp 60,000

#### Step-by-Step:

1. **Kasir scans/selects products**
   - 6x Donut Coklat @ Rp 10,000 = Rp 60,000

2. **Kasir clicks "Bayar"**
   - Modal appears with payment method options

3. **Customer chooses "BCA Transfer"**
   - Kasir selects "BCA Transfer" from list
   - Shows account info: **BCA 1234567890 a/n PT Donattour**

4. **Customer transfers money**
   - Customer opens their banking app
   - Transfers Rp 60,000 to BCA account
   - Shows proof of transfer to kasir

5. **Kasir confirms payment**
   - Kasir verifies transfer receipt
   - Clicks "Konfirmasi Pembayaran"

6. **System records transaction**
   ```json
   {
     "order_id": "uuid-order-123",
     "total_amount": 60000,
     "payment_method": "uuid-2",  // BCA Transfer UUID
     "payment_status": "paid",
     "payment_method_detail": "BCA Transfer"
   }
   ```

7. **Receipt printed**
   ```
   ================================
        DONATTOUR RECEIPT
   ================================
   Order #: ORD-20260626-0001
   Date: 26 Jun 2026 14:30
   
   6x Donut Coklat      Rp 60,000
   --------------------------------
   Total:               Rp 60,000
   
   Payment: BCA Transfer
   Account: 1234567890
   A/n: PT Donattour
   
   Thank you! 🍩
   ================================
   ```

---

## 🎯 KEY DIFFERENCES FROM MIDTRANS

| Aspect | Midtrans System | Donattour System |
|--------|-----------------|------------------|
| **Payment Processing** | Automatic via API | Manual confirmation |
| **Online Requirement** | Required for payment | Optional (offline works) |
| **Payment Verification** | Webhook callback | Staff manual check |
| **External Dependency** | Yes (Midtrans API) | No |
| **Setup Complexity** | High (API keys, etc.) | Low (just database) |
| **Transaction Fees** | ~2-3% per transaction | Zero |
| **Offline Capability** | ❌ Cannot work offline | ✅ Fully offline-capable |
| **Customization** | Limited to Midtrans options | Fully customizable |

---

## 🛠️ ADMIN MENU: KELOLA METODE PEMBAYARAN

### Location
```
Dashboard → Pengaturan → Kelola Metode Pembayaran
```

### Features

#### 1. View Payment Methods List
- Shows all configured payment methods
- Filter by: Active/Inactive
- Sort by: Name, Type, Created Date

#### 2. Create New Payment Method
```typescript
interface CreatePaymentMethodForm {
  name: string;              // Required: e.g., "BCA Transfer"
  type: string;              // Required: cash|transfer|qris|ewallet|card|other
  account_number?: string;   // Optional: bank account or phone
  account_name?: string;     // Optional: account holder name
  logo_url?: string;         // Optional: upload logo image
  is_active: boolean;        // Default: true
}
```

#### 3. Edit Payment Method
- Update name, account info
- Upload/change logo
- Activate/deactivate

#### 4. Delete Payment Method
- Soft delete (set `is_active = false`)
- Cannot delete if used in existing orders
- Warning: "This method has X transactions"

---

## 💻 CODE IMPLEMENTATION

### API Routes

#### Get Payment Methods
```typescript
// lib/db/payment-methods.ts
export async function getPaymentMethods() {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data;
}
```

#### Create Payment Method
```typescript
// app/api/payment-methods/create/route.ts
export async function POST(req: Request) {
  const body = await req.json();
  
  const { data, error } = await supabase
    .from('payment_methods')
    .insert([{
      name: body.name,
      type: body.type,
      account_number: body.account_number,
      account_name: body.account_name,
      logo_url: body.logo_url,
      is_active: true,
    }])
    .select()
    .single();
  
  if (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
  
  return Response.json(data);
}
```

### POS Component

```typescript
// components/pos/payment-selector.tsx
'use client';

import { useState, useEffect } from 'react';
import { getPaymentMethods } from '@/lib/db/payment-methods';

export function PaymentSelector({ onSelect }: { onSelect: (id: string) => void }) {
  const [methods, setMethods] = useState([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    getPaymentMethods().then(setMethods);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-3">
      {methods.map((method) => (
        <button
          key={method.id}
          onClick={() => {
            setSelected(method.id);
            onSelect(method.id);
          }}
          className={`
            p-4 border-2 rounded-lg
            ${selected === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          `}
        >
          {method.logo_url && (
            <img src={method.logo_url} alt={method.name} className="h-8 mb-2" />
          )}
          <div className="font-semibold">{method.name}</div>
          <div className="text-sm text-gray-500">{method.type}</div>
          {method.account_number && (
            <div className="text-xs text-gray-400 mt-1">
              {method.account_number}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
```

---

## 🚀 OFFLINE IMPLEMENTATION

### Cache Payment Methods

```typescript
// lib/offline/cache-payment-methods.ts
import { getPGLite } from './pglite-client';
import { getPaymentMethods } from '../db/payment-methods';

export async function cachePaymentMethods() {
  const methods = await getPaymentMethods();
  const db = await getPGLite();
  
  await db.query('DELETE FROM payment_methods');
  
  for (const method of methods) {
    await db.query(`
      INSERT INTO payment_methods (id, name, type, account_number, account_name, logo_url)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [method.id, method.name, method.type, method.account_number, method.account_name, method.logo_url]);
  }
  
  console.log(`✅ Cached ${methods.length} payment methods offline`);
}
```

### Use Offline Payment Methods

```typescript
// lib/offline/get-cached-payment-methods.ts
import { getPGLite } from './pglite-client';

export async function getCachedPaymentMethods() {
  const db = await getPGLite();
  const result = await db.query('SELECT * FROM payment_methods ORDER BY name');
  return result.rows;
}
```

---

## ✅ BENEFITS OF CUSTOM SYSTEM

1. **Zero Transaction Fees** - No payment gateway fees
2. **Full Offline Support** - Works without internet
3. **Complete Flexibility** - Add any payment method you want
4. **Simpler Architecture** - No external API dependencies
5. **Better Privacy** - No customer data sent to third parties
6. **Easier Maintenance** - No API key rotations or updates
7. **Custom Branding** - Full control over payment flow UI

---

## 📚 MIGRATION FROM MIDTRANS

If project previously used Midtrans, follow these steps:

### 1. Remove Midtrans Dependencies
```bash
npm uninstall midtrans-client
```

### 2. Remove Environment Variables
```env
# Remove these from .env.local:
# MIDTRANS_SERVER_KEY
# NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
# MIDTRANS_IS_PRODUCTION
```

### 3. Remove Midtrans Files
```bash
rm -rf app/api/midtrans/
rm -rf docs/integrations/Midtrans.md
rm -rf components/midtrans/
rm types/midtrans-client.d.ts
```

### 4. Update Order Creation Logic
```typescript
// Old: Midtrans API call
const snap = await midtrans.createTransaction({ ... });

// New: Direct database insert
const { data } = await supabase
  .from('orders')
  .insert([{
    total_amount: 60000,
    payment_method: selectedMethodId, // From payment_methods table
    payment_status: 'paid',
    status: 'completed',
  }])
  .select()
  .single();
```

---

## 🎓 TRAINING FOR STAFF

### For Admin
- How to add new payment methods
- How to update account info
- How to activate/deactivate methods
- Best practices for naming

### For Kasir
- How to select payment method
- How to verify manual payments
- What to do if method not listed
- Offline payment workflow

---

**Status:** ✅ **PAYMENT SYSTEM CLARIFIED**

*No external payment gateway is used. All payment methods are custom-configured and managed internally.*
