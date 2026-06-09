# 📘 Integration Guide - ProductPricingForm

## Cara Pakai di Form Produk

### 1. Import Component

```typescript
import { ProductPricingForm, type ProductPricingData } from '@/components/products/ProductPricingForm';
```

### 2. Tambahkan State di Form

```typescript
const [pricingData, setPricingData] = useState<ProductPricingData>({
  is_donat: false,
  ukuran_donat: null,
  hpp_base_donat: null,
  hpp_topping: null,
  hpp_total: 0,
  harga_jual: 0,
  margin_amount: 0,
  margin_percent: 0,
});
```

### 3. Render Component

```typescript
<ProductPricingForm
  value={pricingData}
  onChange={setPricingData}
  showRecommendation={true}
  targetMarginPercent={35}
/>
```

### 4. Saat Submit Form

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validasi pricing
  const validation = validateProductPricing(pricingData);
  if (!validation.valid) {
    toast.error('Pricing tidak valid: ' + validation.errors.join(', '));
    return;
  }
  
  // Kirim ke database
  const result = await upsertProduct({
    nama: form.nama,
    category_id: form.category_id,
    // ... field lain ...
    
    // Pricing fields
    is_donat: pricingData.is_donat,
    ukuran_donat: pricingData.ukuran_donat,
    hpp_base_donat: pricingData.hpp_base_donat,
    hpp_topping: pricingData.hpp_topping,
    hpp_total: pricingData.hpp_total,
    harga_jual: pricingData.harga_jual,
    margin_amount: pricingData.margin_amount,
    margin_percent: pricingData.margin_percent,
  });
  
  if (result) {
    toast.success('Produk berhasil disimpan!');
    resetForm();
  }
};
```

### 5. Saat Edit Produk

```typescript
const handleEdit = (product: Product) => {
  // Set pricing data dari product existing
  setPricingData({
    is_donat: product.is_donat,
    ukuran_donat: product.ukuran_donat,
    hpp_base_donat: product.hpp_base_donat,
    hpp_topping: product.hpp_topping,
    hpp_total: product.hpp_total,
    harga_jual: product.harga_jual,
    margin_amount: product.margin_amount,
    margin_percent: product.margin_percent,
  });
  
  // ... set form fields lainnya ...
};
```

---

## 📸 Screenshot Preview

**Untuk Donat:**
```
┌─────────────────────────────────────────┐
│ 🍩 TIPE PRODUK                          │
├─────────────────────────────────────────┤
│ Apakah ini produk donat?                │
│ [✓ Ya] [✗ Bukan]                        │
│                                         │
│ Pilih Ukuran:                           │
│ [Mini] [●Regular] [Jumbo] [Dozen]       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 💰 HPP BREAKDOWN                        │
├─────────────────────────────────────────┤
│ HPP Donat Polos*    HPP Topping*        │
│ Rp [3.500]          Rp [1.500]          │
│                                         │
│ ────────────────────────────────────    │
│ Total HPP: Rp 5.000                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 💵 HARGA JUAL                           │
├─────────────────────────────────────────┤
│ Harga Jual ke Customer*                 │
│ Rp [8.000]                              │
│                                         │
│ 💡 Rekomendasi (35%): Rp 7.700 [Pakai] │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ✅ KEUNTUNGAN (MARGIN)                  │
├─────────────────────────────────────────┤
│  Margin (Rp)    │  Margin (%)          │
│  Rp 3.000       │  37.5%               │
│                                         │
│  ✓✓ Margin sangat baik!                │
└─────────────────────────────────────────┘
```

**Untuk Non-Donat:**
```
┌─────────────────────────────────────────┐
│ 🍹 TIPE PRODUK                          │
├─────────────────────────────────────────┤
│ Apakah ini produk donat?                │
│ [✓ Ya] [●Bukan]                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 💰 HPP TOTAL                            │
├─────────────────────────────────────────┤
│ HPP Total (Modal)*                      │
│ Rp [2.000]                              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 💵 HARGA JUAL                           │
├─────────────────────────────────────────┤
│ Harga Jual ke Customer*                 │
│ Rp [5.000]                              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ ✅ KEUNTUNGAN (MARGIN)                  │
├─────────────────────────────────────────┤
│  Margin (Rp)    │  Margin (%)          │
│  Rp 3.000       │  60.0%               │
│                                         │
│  ✓✓ Margin sangat baik!                │
└─────────────────────────────────────────┘
```

---

## 🎨 Features

✅ **Auto-calculation** - Margin otomatis dihitung
✅ **Real-time validation** - Error langsung muncul
✅ **Recommended pricing** - Saran harga berdasarkan margin target
✅ **Color-coded margin** - Merah (<20%), Kuning (20-35%), Hijau (>35%)
✅ **Responsive design** - Mobile-friendly
✅ **Type-safe** - Full TypeScript support

---

## 🔧 Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `ProductPricingData` | - | Current pricing data |
| `onChange` | `(data) => void` | - | Callback when data changes |
| `showRecommendation` | `boolean` | `true` | Show recommended price |
| `targetMarginPercent` | `number` | `35` | Target margin for recommendation |

---

## 📝 Example: Full Form Integration

```typescript
'use client';

import { useState } from 'react';
import { ProductPricingForm, type ProductPricingData } from '@/components/products/ProductPricingForm';
import { upsertProduct } from '@/lib/db/products';
import { toast } from 'sonner';

export function TambahProdukForm() {
  const [nama, setNama] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [pricing, setPricing] = useState<ProductPricingData>({
    is_donat: false,
    ukuran_donat: null,
    hpp_base_donat: null,
    hpp_topping: null,
    hpp_total: 0,
    harga_jual: 0,
    margin_amount: 0,
    margin_percent: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await upsertProduct({
      nama,
      category_id: categoryId,
      ...pricing, // Spread pricing data
      is_active: true,
      tipe_produk: pricing.is_donat ? 'donat_varian' : 'minuman',
    });

    if (result) {
      toast.success('Produk berhasil ditambahkan!');
    } else {
      toast.error('Gagal menambahkan produk');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama Produk"
          required
        />
        {/* ... category select, etc ... */}
      </div>

      {/* Pricing Form */}
      <ProductPricingForm
        value={pricing}
        onChange={setPricing}
      />

      {/* Submit Button */}
      <button type="submit">
        Simpan Produk
      </button>
    </form>
  );
}
```

---

## ✅ Next Steps

1. ✅ Component sudah dibuat
2. ⏳ Integrate ke `TabVarian.tsx`
3. ⏳ Integrate ke `TabTambahan.tsx`
4. ⏳ Test dengan data real
5. ⏳ Jalankan database migration

Mau saya buatkan contoh integrasi lengkap ke TabVarian sekarang?
