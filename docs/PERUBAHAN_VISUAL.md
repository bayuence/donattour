# 🎨 Visualisasi Perubahan Sistem

## 📊 Perbandingan BEFORE vs AFTER

### **1. STRUKTUR PRODUK**

#### **SEBELUM:**
```
Product: "Donat Coklat Regular"
├─ harga_jual: 6,000
├─ hpp: 3,000 (RATA-RATA, tidak detail!)
├─ biaya_topping: 500 (FLAT, sama untuk semua topping!)
└─ margin: 3,000 - 3,000 = 0? ❌ TIDAK AKURAT!
```

#### **SESUDAH:**
```
Product: "Donat Coklat Regular"
├─ is_donat: ✅ YES
├─ ukuran_donat: "regular"
├─ 
├─ HPP DETAIL:
│  ├─ hpp_base_donat: 2,000 (cost donat polos)
│  ├─ hpp_topping: 1,500 (cost topping coklat spesifik)
│  └─ hpp_total: 3,500 (auto calculated)
├─
├─ harga_jual: 6,000
└─ margin: 2,500 (41.7%) ✅ AKURAT!
```

---

### **2. FLOW PEMBUATAN PRODUK**

#### **SEBELUM:**
```
[Form Tambah Produk]
  ↓
Nama: "Donat Coklat"
Harga: 6,000
HPP: ??? (input manual, biasanya salah)
  ↓
SAVE → Margin tidak akurat ❌
```

#### **SESUDAH:**
```
[Form Tambah Produk - Step by Step]

STEP 1: Informasi Dasar
  Nama: "Donat Coklat Regular"
  Kategori: "Donat"
  
STEP 2: ☑️ Apakah ini produk donat?
  [✓] Ya, ini donat
  [ ] Bukan donat
  
  ↓ (jika Ya)
  
STEP 3: Pilih Ukuran
  [ ] Mini (20 pcs/papan)
  [✓] Regular (12 pcs/papan)
  [ ] Jumbo (6 pcs/papan)
  
STEP 4: Rincian Biaya
  ┌─────────────────────────────────┐
  │ HPP Donat Polos: Rp 2,000      │ ← Base cost per pcs
  │ HPP Topping:     Rp 1,500      │ ← Topping cost
  │ ────────────────────────────────│
  │ Total HPP:       Rp 3,500 ✓   │ ← Auto calculate
  │                                 │
  │ Harga Jual:      Rp 6,000      │
  │ ────────────────────────────────│
  │ Margin:          Rp 2,500      │ ← Auto calculate
  │                  (41.7%)       │ ← Percentage
  │                                 │
  │ [Preview:]                      │
  │ Jual 100 pcs = Untung Rp 250k  │
  └─────────────────────────────────┘
  
STEP 5: SAVE
  ↓
Produk tersimpan dengan margin AKURAT ✅
```

---

### **3. KASIR INTERFACE**

#### **SEBELUM:**
```
┌─────────────────────────────────────────────────────────┐
│ KASIR DONATTOUR                                         │
├─────────────────────────────────────────────────────────┤
│ Channel: [Toko] [GoFood] [Shopee] [Grab] [Online] [OTR]│ ← RIBET!
│          ▲                                              │
│          └─ User harus pilih channel dulu               │
│                                                         │
│ [List Produk dengan harga berbeda per channel]        │
│                                                         │
│ Cart:                                                   │
│ - Donat Coklat @ 6,000 (Toko)                         │
│ - Donat Coklat @ 7,000 (GoFood) ← Beda harga! Ribet!  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### **SESUDAH:**
```
┌─────────────────────────────────────────────────────────┐
│ KASIR DONATTOUR                                         │
├─────────────────────────────────────────────────────────┤
│ Outlet: Cabang Utama  │  Kasir: John  │  Shift: Pagi  │ ← SIMPLE!
│                                                         │
│ [List Produk dengan 1 harga saja]                     │
│                                                         │
│ Cart:                                                   │
│ - Donat Coklat @ 6,000                                 │
│   Margin: Rp 2,500 ✅                                  │
│                                                         │
│ - Es Teh @ 3,000                                       │
│   Margin: Rp 2,000 ✅                                  │
│                                                         │
│ Total: Rp 9,000                                        │
│ Profit: Rp 4,500 (50%) 💰                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### **4. LAPORAN KEUANGAN**

#### **SEBELUM:**
```
┌────────────────────────────────────┐
│ LAPORAN HARIAN                     │
├────────────────────────────────────┤
│ Pendapatan: Rp 5,000,000          │
│ HPP:        Rp ??? (tidak jelas)  │ ← TIDAK DETAIL
│ Laba:       Rp ??? (asal-asalan)  │ ← TIDAK AKURAT
│                                    │
│ ❌ Tidak tahu margin real-nya     │
└────────────────────────────────────┘
```

#### **SESUDAH:**
```
┌─────────────────────────────────────────────────────┐
│ LAPORAN HARIAN - DETAIL                             │
├─────────────────────────────────────────────────────┤
│ 💰 PENDAPATAN                                       │
│    Pendapatan Kotor:  Rp 5,000,000                 │
│                                                     │
│ 📊 HPP BREAKDOWN                                    │
│    ├─ HPP Donat Polos:  Rp 1,200,000 (24%)        │
│    ├─ HPP Topping:      Rp   800,000 (16%)        │
│    └─ HPP Produk Lain:  Rp   300,000 (6%)         │
│    ────────────────────────────────────            │
│    Total HPP:           Rp 2,300,000 (46%)        │
│                                                     │
│ 💵 LABA                                            │
│    Laba Kotor:          Rp 2,700,000 (54%) ✅     │
│    Biaya Operasional:   Rp   500,000 (10%)        │
│    ────────────────────────────────────            │
│    Laba Bersih:         Rp 2,200,000 (44%) ✅     │
│                                                     │
│ 📈 PERFORMA PER PRODUK                             │
│ ┌───────────────────────────────────────────────┐  │
│ │ Produk           │ Qty │ Margin │ Total      │  │
│ ├───────────────────────────────────────────────┤  │
│ │ Donat Coklat Reg │ 50  │ 41.7% │ Rp 125,000 │  │
│ │ Donat Original   │ 80  │ 50.0% │ Rp 200,000 │  │
│ │ Es Teh           │ 30  │ 66.7% │ Rp  60,000 │  │
│ └───────────────────────────────────────────────┘  │
│                                                     │
│ ✅ SEKARANG TAHU PRODUK MANA YANG PALING UNTUNG!  │
└─────────────────────────────────────────────────────┘
```

---

### **5. CONTOH KASUS REAL**

#### **Scenario: Jual 100 Donat Coklat Regular**

**SEBELUM (Sistem Lama):**
```
Harga jual: 6,000 × 100 = 600,000
HPP (rata-rata): 3,000 × 100 = 300,000
Margin: 300,000 (???%)

❓ Pertanyaan:
- Berapa cost donat polosnya?
- Berapa cost toppingnya?
- Topping coklat lebih mahal dari original?
- Ukuran mini/jumbo beda cost?

JAWABAN: TIDAK TAHU! ❌
```

**SESUDAH (Sistem Baru):**
```
100 Donat Coklat Regular:

Revenue:
  100 × Rp 6,000 = Rp 600,000

HPP Breakdown:
  • HPP Donat Polos: 100 × Rp 2,000 = Rp 200,000
  • HPP Topping:     100 × Rp 1,500 = Rp 150,000
  ──────────────────────────────────────────────
  Total HPP:                         Rp 350,000

Margin:
  Rp 600,000 - Rp 350,000 = Rp 250,000 (41.7%)

✅ JELAS & DETAIL!

Insight:
• Donat polos cost: Rp 2,000/pcs
• Topping coklat cost: Rp 1,500/pcs
• Jika ganti topping lebih murah (Rp 1,000), margin naik!
• Jika produksi mini (cost lebih murah), margin bisa lebih besar!
```

---

### **6. MATRIX PERBANDINGAN**

| Aspek | SEBELUM | SESUDAH |
|-------|---------|---------|
| **Pricing Detail** | ❌ HPP rata-rata | ✅ HPP per komponen |
| **Topping Cost** | ❌ Flat semua topping | ✅ Detail per topping |
| **Ukuran Awareness** | ❌ Tidak mempengaruhi cost | ✅ Mini/Regular/Jumbo beda cost |
| **Margin Accuracy** | ❌ Tidak akurat | ✅ Real-time & akurat |
| **Kasir Complexity** | ❌ Multi-channel ribet | ✅ Single kasir simple |
| **Harga Management** | ❌ Harga per channel | ✅ 1 harga master |
| **Laporan Detail** | ❌ HPP total saja | ✅ HPP breakdown |
| **Decision Making** | ❌ Sulit analisa | ✅ Data-driven |

---

### **7. WORKFLOW COMPARISON**

#### **Proses Tambah Produk Baru:**

**SEBELUM:**
```
1. Input nama
2. Input harga jual
3. Input HPP (tebak-tebakan!)
4. Save
   ↓
   Margin tidak tahu akurat atau tidak ❌
```

**SESUDAH:**
```
1. Input nama
2. Centang "ini donat"
3. Pilih ukuran (mini/regular/jumbo)
4. Input HPP donat polos
5. Input HPP topping
   ↓
   System auto calculate total HPP ✅
6. Input harga jual
   ↓
   System show margin real-time ✅
7. Save
   ↓
   Margin 100% akurat! ✅
```

---

### **8. BENEFIT SUMMARY**

```
┌─────────────────────────────────────────────────────────┐
│ KEUNTUNGAN SISTEM BARU                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 💰 FINANCIAL                                           │
│   ✅ Margin calculation akurat per produk              │
│   ✅ Tahu produk mana yang paling untung               │
│   ✅ Bisa optimize harga berdasarkan cost real         │
│   ✅ Decision making based on real data                │
│                                                         │
│ 🎯 OPERATIONAL                                         │
│   ✅ Kasir lebih simple (1 kasir saja)                │
│   ✅ Tidak perlu maintain harga per channel           │
│   ✅ User tidak bingung pilih channel                  │
│   ✅ Training kasir lebih mudah                        │
│                                                         │
│ 📊 REPORTING                                           │
│   ✅ Laporan lebih detail                              │
│   ✅ HPP breakdown clear                               │
│   ✅ Profit tracking per produk                        │
│   ✅ Data untuk business intelligence                  │
│                                                         │
│ 🚀 SCALABILITY                                         │
│   ✅ Mudah tambah produk baru                          │
│   ✅ Mudah ubah harga                                  │
│   ✅ Sistem lebih maintainable                         │
│   ✅ Database lebih clean                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**Created:** 5 Juni 2026  
**Purpose:** Visualisasi untuk approval perubahan sistem  
**Status:** 📋 Proposal Visual
