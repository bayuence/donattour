# Design: Sistem Tracking Produksi & Rugi Lengkap

## Overview

### Purpose

The Production Tracking System is a comprehensive solution for tracking donut production, sales, and waste management in a multi-outlet donut business. The system ensures complete visibility into the production lifecycle—from raw non-topping donuts through sales to end-of-day closing—enabling accurate cost control, waste reduction, and data-driven business decisions.

### Key Design Principles

1. **Data Integrity First**: Every donut produced, sold, or wasted must be tracked with full traceability
2. **Validation at Entry Points**: Prevent invalid operations (e.g., selling without production input) at the system level
3. **Real-time Inventory**: Maintain accurate non-topping donut inventory that updates with every transaction
4. **Comprehensive Loss Tracking**: Capture all waste categories with reasons and HPP (cost of goods sold) calculations
5. **Role-Based Workflows**: Design interfaces and permissions around specific user roles and their daily tasks
6. **Audit Trail**: Maintain complete history of all production, sales, and waste events for analysis

### System Scope

**In Scope:**
- Daily production input (non-topping donuts) with waste tracking
- POS validation requiring production input before sales
- Real-time non-topping inventory management
- Topping usage and error tracking
- Daily closing with status categorization (fresh/aging/expired/reject)
- Comprehensive loss reporting with HPP calculations
- Owner dashboard with analytics and recommendations
- Alert system for critical events

**Out of Scope:**
- Supplier and raw material management
- Payroll and HR systems
- Customer loyalty programs
- Online ordering and delivery
- Multi-currency or multi-language support

### Technology Stack

- **Frontend**: Next.js 14+ with TypeScript, React Server Components
- **UI Framework**: Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API Routes (serverless functions)
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth with role-based access control
- **Deployment**: Vercel (auto-deploy from GitHub)
- **State Management**: React Context + Server State
- **Validation**: Zod schemas for type-safe validation

---

## Architecture

### System Architecture

The system follows a modern three-tier architecture with serverless backend:

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Next.js UI Components]
        SC[Server Components]
        CC[Client Components]
    end
    
    subgraph "Application Layer"
        API[API Routes]
        BL[Business Logic]
        VAL[Validation Layer]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL/Supabase)]
        CACHE[Query Cache]
    end
    
    subgraph "External Services"
        AUTH[Supabase Auth]
        STORAGE[File Storage]
        EMAIL[Email Service]
    end
    
    UI --> SC
    UI --> CC
    SC --> API
    CC --> API
    API --> BL
    BL --> VAL
    VAL --> DB
    API --> CACHE
    CACHE --> DB
    API --> AUTH
    API --> EMAIL
    
    style UI fill:#e1f5ff
    style API fill:#fff4e1
    style DB fill:#ffe1e1

```

---

## Database Schema Design

### Entity Relationship Diagram

```mermaid
erDiagram
    outlets ||--o{ production_daily : has
    outlets ||--o{ inventory_non_topping : has
    outlets ||--o{ daily_closing : has
    outlets ||--o{ topping_errors : has
    outlets ||--o{ daily_loss_summary : has
    
    production_daily ||--o{ production_waste_details : contains
    production_daily ||--|| inventory_non_topping : creates
    
    orders ||--o{ topping_usage : tracks
    products ||--o{ topping_usage : uses
    
    daily_closing ||--o{ closing_non_topping_status : has
    daily_closing ||--o{ closing_finished_products : has
    daily_closing ||--|| daily_loss_summary : generates
    
    users ||--o{ production_daily : creates
    users ||--o{ daily_closing : performs
    users ||--o{ topping_errors : reports
```

### Table Schemas

#### 1. production_daily
**Purpose:** Menyimpan data produksi harian donat non-topping per outlet per ukuran

```sql
CREATE TABLE production_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    ukuran VARCHAR(10) NOT NULL CHECK (ukuran IN ('standar', 'mini')),
    target_qty INTEGER NOT NULL CHECK (target_qty > 0),
    success_qty INTEGER NOT NULL CHECK (success_qty >= 0),
    waste_qty INTEGER NOT NULL CHECK (waste_qty >= 0),
    total_hpp_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_production_per_outlet_date_size 
        UNIQUE(outlet_id, tanggal, ukuran),
    CONSTRAINT valid_production_qty 
        CHECK (success_qty + waste_qty <= target_qty)
);

CREATE INDEX idx_production_outlet_date ON production_daily(outlet_id, tanggal);
CREATE INDEX idx_production_date ON production_daily(tanggal DESC);
CREATE INDEX idx_production_created_at ON production_daily(created_at DESC);
```

**Key Fields:**
- `outlet_id`: Outlet yang melakukan produksi
- `tanggal`: Tanggal produksi
- `ukuran`: Ukuran donat (standar/mini)
- `target_qty`: Target produksi yang direncanakan
- `success_qty`: Jumlah donat non-topping yang berhasil diproduksi
- `waste_qty`: Jumlah donat yang gagal/waste
- `total_hpp_loss`: Total HPP loss dari waste produksi

**Business Rules:**
- UNIQUE constraint memastikan 1 outlet hanya bisa input 1x per ukuran per hari
- CHECK constraint memastikan success + waste tidak melebihi target
- Cascade delete jika outlet dihapus

#### 2. production_waste_details
**Purpose:** Detail alasan waste produksi dengan qty dan HPP loss per alasan

```sql
CREATE TABLE production_waste_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    production_daily_id UUID NOT NULL REFERENCES production_daily(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    hpp_per_pcs DECIMAL(10,2) NOT NULL CHECK (hpp_per_pcs > 0),
    hpp_loss DECIMAL(12,2) GENERATED ALWAYS AS (qty * hpp_per_pcs) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waste_details_production ON production_waste_details(production_daily_id);
CREATE INDEX idx_waste_details_reason ON production_waste_details(reason);
```

**Key Fields:**
- `production_daily_id`: FK ke production_daily
- `reason`: Alasan waste (gosong, bentuk_jelek, adonan_gagal, dll)
- `qty`: Jumlah donat waste untuk alasan ini
- `hpp_per_pcs`: HPP per pcs donat
- `hpp_loss`: Calculated field (qty * hpp_per_pcs)

**Business Rules:**
- Cascade delete jika production_daily dihapus
- hpp_loss dihitung otomatis oleh database (GENERATED ALWAYS AS)

#### 3. inventory_non_topping
**Purpose:** Stok real-time donat non-topping per outlet per ukuran

```sql
CREATE TABLE inventory_non_topping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    ukuran VARCHAR(10) NOT NULL CHECK (ukuran IN ('standar', 'mini')),
    qty_available INTEGER NOT NULL CHECK (qty_available >= 0),
    production_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('fresh', 'aging', 'expired')),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_inventory_per_outlet_size_date 
        UNIQUE(outlet_id, ukuran, production_date, status)
);

CREATE INDEX idx_inventory_outlet_date ON inventory_non_topping(outlet_id, production_date);
CREATE INDEX idx_inventory_status ON inventory_non_topping(status);
CREATE INDEX idx_inventory_updated ON inventory_non_topping(last_updated DESC);
```

**Key Fields:**
- `outlet_id`: Outlet pemilik stok
- `ukuran`: Ukuran donat (standar/mini)
- `qty_available`: Jumlah stok tersedia
- `production_date`: Tanggal produksi donat ini
- `status`: Status donat (fresh/aging/expired)
- `last_updated`: Timestamp terakhir update

**Business Rules:**
- qty_available tidak boleh negatif (enforced by CHECK constraint)
- UNIQUE constraint per outlet, ukuran, tanggal produksi, dan status
- Update last_updated setiap kali ada perubahan qty

#### 4. topping_usage
**Purpose:** Track topping yang terpakai per transaksi penjualan

```sql
CREATE TABLE topping_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    topping_name VARCHAR(50) NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_topping_usage_order ON topping_usage(order_id);
CREATE INDEX idx_topping_usage_product ON topping_usage(product_id);
CREATE INDEX idx_topping_usage_name ON topping_usage(topping_name);
CREATE INDEX idx_topping_usage_date ON topping_usage(created_at DESC);
```

**Key Fields:**
- `order_id`: FK ke orders (transaksi penjualan)
- `product_id`: FK ke products (produk yang dijual)
- `topping_name`: Nama topping yang dipakai
- `qty`: Jumlah topping terpakai

**Business Rules:**
- Cascade delete jika order dihapus
- Digunakan untuk analisis topping terlaris dan cost tracking

#### 5. topping_errors
**Purpose:** Laporan kesalahan topping saat penjualan

```sql
CREATE TABLE topping_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    kasir_id UUID NOT NULL REFERENCES users(id),
    tanggal DATE NOT NULL,
    product_ordered VARCHAR(100) NOT NULL,
    product_made VARCHAR(100) NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    hpp_loss DECIMAL(12,2) NOT NULL CHECK (hpp_loss > 0),
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_topping_errors_outlet_date ON topping_errors(outlet_id, tanggal);
CREATE INDEX idx_topping_errors_kasir ON topping_errors(kasir_id);
CREATE INDEX idx_topping_errors_date ON topping_errors(created_at DESC);
```

**Key Fields:**
- `outlet_id`: Outlet tempat terjadi kesalahan
- `kasir_id`: Kasir yang melaporkan kesalahan
- `tanggal`: Tanggal kejadian
- `product_ordered`: Produk yang dipesan customer
- `product_made`: Produk yang dibuat (salah)
- `qty`: Jumlah produk salah
- `hpp_loss`: HPP + topping loss
- `reason`: Alasan kesalahan

**Business Rules:**
- Stok non-topping sudah berkurang saat penjualan
- hpp_loss = HPP donat + harga topping
- Reason wajib diisi untuk analisis

#### 6. daily_closing
**Purpose:** Data closing harian per outlet

```sql
CREATE TABLE daily_closing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    closed_by UUID NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_closing_per_outlet_date 
        UNIQUE(outlet_id, tanggal)
);

CREATE INDEX idx_closing_outlet_date ON daily_closing(outlet_id, tanggal);
CREATE INDEX idx_closing_date ON daily_closing(tanggal DESC);
CREATE INDEX idx_closing_user ON daily_closing(closed_by);
```

**Key Fields:**
- `outlet_id`: Outlet yang melakukan closing
- `tanggal`: Tanggal closing
- `closed_by`: User yang melakukan closing
- `notes`: Catatan closing (optional)

**Business Rules:**
- UNIQUE constraint memastikan 1 outlet hanya bisa closing 1x per hari
- Cascade delete jika outlet dihapus

#### 7. closing_non_topping_status
**Purpose:** Status sisa donat non-topping saat closing

```sql
CREATE TABLE closing_non_topping_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_closing_id UUID NOT NULL REFERENCES daily_closing(id) ON DELETE CASCADE,
    ukuran VARCHAR(10) NOT NULL CHECK (ukuran IN ('standar', 'mini')),
    total_sisa INTEGER NOT NULL CHECK (total_sisa >= 0),
    qty_fresh INTEGER NOT NULL CHECK (qty_fresh >= 0),
    qty_aging INTEGER NOT NULL CHECK (qty_aging >= 0),
    qty_expired INTEGER NOT NULL CHECK (qty_expired >= 0),
    hpp_loss_expired DECIMAL(12,2) NOT NULL DEFAULT 0,
    reason_expired TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_non_topping_status 
        CHECK (total_sisa = qty_fresh + qty_aging + qty_expired),
    CONSTRAINT reason_required_if_expired 
        CHECK (qty_expired = 0 OR reason_expired IS NOT NULL)
);

CREATE INDEX idx_closing_non_topping_closing ON closing_non_topping_status(daily_closing_id);
```

**Key Fields:**
- `daily_closing_id`: FK ke daily_closing
- `ukuran`: Ukuran donat (standar/mini)
- `total_sisa`: Total sisa dari sistem
- `qty_fresh`: Qty fresh (simpan besok)
- `qty_aging`: Qty aging (diskon besok)
- `qty_expired`: Qty expired (buang)
- `hpp_loss_expired`: HPP loss dari expired
- `reason_expired`: Alasan expired (wajib jika ada expired)

**Business Rules:**
- CHECK constraint memastikan total_sisa = fresh + aging + expired
- Reason wajib diisi jika ada expired
- Fresh & aging masuk ke inventory besok
- Expired tidak bisa dijual (waste)

#### 8. closing_finished_products
**Purpose:** Status sisa donat sudah topping saat closing

```sql
CREATE TABLE closing_finished_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_closing_id UUID NOT NULL REFERENCES daily_closing(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name VARCHAR(100) NOT NULL,
    total_sisa INTEGER NOT NULL CHECK (total_sisa >= 0),
    qty_fresh INTEGER NOT NULL CHECK (qty_fresh >= 0),
    qty_aging INTEGER NOT NULL CHECK (qty_aging >= 0),
    qty_reject INTEGER NOT NULL CHECK (qty_reject >= 0),
    hpp_topping_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
    reason_reject TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_finished_product_status 
        CHECK (total_sisa = qty_fresh + qty_aging + qty_reject),
    CONSTRAINT reason_required_if_reject 
        CHECK (qty_reject = 0 OR reason_reject IS NOT NULL)
);

CREATE INDEX idx_closing_finished_closing ON closing_finished_products(daily_closing_id);
CREATE INDEX idx_closing_finished_product ON closing_finished_products(product_id);
```

**Key Fields:**
- `daily_closing_id`: FK ke daily_closing
- `product_id`: FK ke products (optional, bisa NULL jika produk dihapus)
- `product_name`: Nama produk (stored untuk history)
- `total_sisa`: Total sisa (input manual)
- `qty_fresh`: Qty fresh (jual besok diskon)
- `qty_aging`: Qty aging (diskon besar)
- `qty_reject`: Qty reject (buang)
- `hpp_topping_loss`: HPP + topping loss dari reject
- `reason_reject`: Alasan reject (wajib jika ada reject)

**Business Rules:**
- CHECK constraint memastikan total_sisa = fresh + aging + reject
- Reason wajib diisi jika ada reject
- Fresh & aging bisa dijual besok dengan diskon
- Reject tidak bisa dijual (waste)

#### 9. daily_loss_summary
**Purpose:** Summary rugi harian per outlet (auto-generated dari closing)

```sql
CREATE TABLE daily_loss_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL,
    production_waste_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
    topping_error_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
    non_topping_expired_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
    finished_product_reject_loss DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_loss DECIMAL(12,2) GENERATED ALWAYS AS (
        production_waste_loss + topping_error_loss + 
        non_topping_expired_loss + finished_product_reject_loss
    ) STORED,
    total_waste_qty INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_loss_summary_per_outlet_date 
        UNIQUE(outlet_id, tanggal)
);

CREATE INDEX idx_loss_summary_outlet_date ON daily_loss_summary(outlet_id, tanggal);
CREATE INDEX idx_loss_summary_date ON daily_loss_summary(tanggal DESC);
CREATE INDEX idx_loss_summary_total_loss ON daily_loss_summary(total_loss DESC);
```

**Key Fields:**
- `outlet_id`: Outlet
- `tanggal`: Tanggal
- `production_waste_loss`: Rugi dari produksi gagal
- `topping_error_loss`: Rugi dari kesalahan topping
- `non_topping_expired_loss`: Rugi dari non-topping expired
- `finished_product_reject_loss`: Rugi dari produk jadi reject
- `total_loss`: Total rugi (calculated field)
- `total_waste_qty`: Total qty waste

**Business Rules:**
- UNIQUE constraint per outlet per tanggal
- total_loss dihitung otomatis oleh database
- Digunakan untuk dashboard owner dan analisis

### Database Triggers

#### 1. Update inventory_non_topping on production
```sql
CREATE OR REPLACE FUNCTION update_inventory_on_production()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO inventory_non_topping (
        outlet_id, ukuran, qty_available, production_date, status
    ) VALUES (
        NEW.outlet_id, NEW.ukuran, NEW.success_qty, NEW.tanggal, 'fresh'
    )
    ON CONFLICT (outlet_id, ukuran, production_date, status)
    DO UPDATE SET 
        qty_available = inventory_non_topping.qty_available + NEW.success_qty,
        last_updated = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_on_production
AFTER INSERT OR UPDATE ON production_daily
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_production();
```

#### 2. Update inventory_non_topping on sale
```sql
CREATE OR REPLACE FUNCTION deduct_inventory_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    donut_size VARCHAR(10);
    donut_qty INTEGER;
BEGIN
    -- Get donut size and qty from order_items
    SELECT p.ukuran, oi.qty INTO donut_size, donut_qty
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = NEW.id;
    
    -- Deduct from inventory
    UPDATE inventory_non_topping
    SET qty_available = qty_available - donut_qty,
        last_updated = NOW()
    WHERE outlet_id = NEW.outlet_id
      AND ukuran = donut_size
      AND status = 'fresh'
      AND production_date = CURRENT_DATE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_inventory_on_sale
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION deduct_inventory_on_sale();
```

#### 3. Auto-update updated_at timestamp
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_production_updated_at
BEFORE UPDATE ON production_daily
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```



---

## API Design

### API Architecture

All API routes follow RESTful conventions and are implemented as Next.js API Routes (serverless functions).

**Base URL:** `/api`

**Response Format:**
```typescript
// Success Response
{
  success: true,
  data: any,
  message?: string
}

// Error Response
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

**Authentication:**
- All API routes require authentication via Supabase Auth
- JWT token passed in Authorization header: `Bearer <token>`
- User role checked for authorization

### API Endpoints

#### 1. Production Input APIs

##### POST /api/production/daily
**Purpose:** Input produksi harian donat non-topping

**Authorization:** Role: `bagian_dapur`, `admin`

**Request Body:**
```typescript
{
  outlet_id: string;        // UUID
  tanggal: string;          // ISO date format "YYYY-MM-DD"
  ukuran: "standar" | "mini";
  target_qty: number;       // > 0
  success_qty: number;      // >= 0
  waste_details: Array<{
    reason: string;         // gosong, bentuk_jelek, adonan_gagal, dll
    qty: number;            // > 0
    hpp_per_pcs: number;    // > 0
  }>;
}
```

**Validation Rules:**
- `target_qty` > 0
- `success_qty` >= 0
- `success_qty + sum(waste_details.qty)` <= `target_qty`
- `tanggal` tidak boleh masa depan
- Jika ada waste_details, reason wajib diisi
- UNIQUE constraint: outlet_id + tanggal + ukuran

**Response (201 Created):**
```typescript
{
  success: true,
  data: {
    production_daily: {
      id: string;
      outlet_id: string;
      tanggal: string;
      ukuran: string;
      target_qty: number;
      success_qty: number;
      waste_qty: number;
      total_hpp_loss: number;
      created_at: string;
    },
    waste_details: Array<{
      id: string;
      reason: string;
      qty: number;
      hpp_per_pcs: number;
      hpp_loss: number;
    }>,
    inventory_created: {
      id: string;
      qty_available: number;
    }
  },
  message: "Produksi berhasil disimpan"
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `409 Conflict`: Duplicate entry (sudah ada input untuk outlet + tanggal + ukuran)
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions

##### GET /api/production/daily
**Purpose:** Get list produksi harian dengan filter

**Authorization:** Role: `bagian_dapur`, `manager`, `admin`

**Query Parameters:**
```typescript
{
  outlet_id?: string;       // Filter by outlet
  tanggal?: string;         // Filter by date (YYYY-MM-DD)
  start_date?: string;      // Date range start
  end_date?: string;        // Date range end
  ukuran?: "standar" | "mini";
  page?: number;            // Default: 1
  limit?: number;           // Default: 20
}
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    items: Array<{
      id: string;
      outlet: {
        id: string;
        name: string;
      };
      tanggal: string;
      ukuran: string;
      target_qty: number;
      success_qty: number;
      waste_qty: number;
      total_hpp_loss: number;
      success_rate: number;    // Calculated: (success_qty / target_qty) * 100
      waste_rate: number;      // Calculated: (waste_qty / target_qty) * 100
      waste_details: Array<{
        reason: string;
        qty: number;
        hpp_loss: number;
      }>;
      created_at: string;
    }>,
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    }
  }
}
```

##### PUT /api/production/daily/[id]
**Purpose:** Update produksi harian (hanya untuk hari yang sama)

**Authorization:** Role: `bagian_dapur`, `admin`

**Request Body:** Same as POST /api/production/daily

**Business Rules:**
- Hanya bisa edit produksi hari ini
- Tidak bisa edit produksi hari sebelumnya

**Response (200 OK):** Same as POST response

**Error Responses:**
- `400 Bad Request`: Cannot edit past production
- `404 Not Found`: Production not found

##### DELETE /api/production/daily/[id]
**Purpose:** Delete produksi harian (hanya untuk hari yang sama)

**Authorization:** Role: `admin` only

**Response (200 OK):**
```typescript
{
  success: true,
  message: "Produksi berhasil dihapus"
}
```

#### 2. Inventory Validation APIs

##### GET /api/inventory/validate
**Purpose:** Validasi apakah kasir bisa operasional (cek ada produksi hari ini)

**Authorization:** Role: `kasir`, `manager`, `admin`

**Query Parameters:**
```typescript
{
  outlet_id: string;        // Required
  tanggal?: string;         // Optional, default: today
}
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    can_operate: boolean;
    has_production: boolean;
    stock_summary: {
      standar: {
        qty_available: number;
        status: "sufficient" | "low" | "out_of_stock";
        percentage: number;  // % dari produksi hari ini
      },
      mini: {
        qty_available: number;
        status: "sufficient" | "low" | "out_of_stock";
        percentage: number;
      }
    },
    production_data?: {
      standar?: {
        target_qty: number;
        success_qty: number;
      },
      mini?: {
        target_qty: number;
        success_qty: number;
      }
    }
  }
}
```

**Business Logic:**
- `can_operate` = true jika ada production input hari ini
- `status` = "low" jika qty_available < 20% dari success_qty
- `status` = "out_of_stock" jika qty_available = 0

##### GET /api/inventory/stock
**Purpose:** Get real-time stock non-topping per outlet

**Authorization:** Role: `kasir`, `bagian_dapur`, `manager`, `admin`

**Query Parameters:**
```typescript
{
  outlet_id: string;        // Required
  ukuran?: "standar" | "mini";
  status?: "fresh" | "aging" | "expired";
}
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    outlet_id: string;
    stocks: Array<{
      ukuran: string;
      status: string;
      qty_available: number;
      production_date: string;
      last_updated: string;
    }>,
    total_by_size: {
      standar: number;
      mini: number;
    }
  }
}
```

#### 3. Topping Error APIs

##### POST /api/topping-errors
**Purpose:** Lapor kesalahan topping

**Authorization:** Role: `kasir`, `admin`

**Request Body:**
```typescript
{
  outlet_id: string;
  tanggal: string;          // ISO date
  product_ordered: string;  // Nama produk yang dipesan
  product_made: string;     // Nama produk yang dibuat (salah)
  qty: number;              // > 0
  hpp_loss: number;         // HPP + topping cost
  reason: string;           // Alasan kesalahan (required)
}
```

**Validation Rules:**
- `qty` > 0
- `hpp_loss` > 0
- `reason` wajib diisi (min 10 characters)
- `product_ordered` != `product_made`

**Response (201 Created):**
```typescript
{
  success: true,
  data: {
    id: string;
    outlet_id: string;
    kasir_id: string;
    tanggal: string;
    product_ordered: string;
    product_made: string;
    qty: number;
    hpp_loss: number;
    reason: string;
    created_at: string;
  },
  message: "Kesalahan topping berhasil dilaporkan"
}
```

##### GET /api/topping-errors
**Purpose:** Get list kesalahan topping dengan filter

**Authorization:** Role: `kasir`, `manager`, `admin`

**Query Parameters:**
```typescript
{
  outlet_id?: string;
  kasir_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    items: Array<{
      id: string;
      outlet: { id: string; name: string; };
      kasir: { id: string; name: string; };
      tanggal: string;
      product_ordered: string;
      product_made: string;
      qty: number;
      hpp_loss: number;
      reason: string;
      created_at: string;
    }>,
    summary: {
      total_errors: number;
      total_qty: number;
      total_hpp_loss: number;
    },
    pagination: { ... }
  }
}
```

#### 4. Daily Closing APIs

##### POST /api/closing/daily
**Purpose:** Submit closing harian

**Authorization:** Role: `closing_staff`, `manager`, `admin`

**Request Body:**
```typescript
{
  outlet_id: string;
  tanggal: string;          // ISO date
  non_topping_status: Array<{
    ukuran: "standar" | "mini";
    total_sisa: number;
    qty_fresh: number;
    qty_aging: number;
    qty_expired: number;
    hpp_loss_expired: number;
    reason_expired?: string;  // Required if qty_expired > 0
  }>,
  finished_products: Array<{
    product_id?: string;      // Optional
    product_name: string;
    total_sisa: number;
    qty_fresh: number;
    qty_aging: number;
    qty_reject: number;
    hpp_topping_loss: number;
    reason_reject?: string;   // Required if qty_reject > 0
  }>,
  notes?: string;             // Optional closing notes
}
```

**Validation Rules:**
- UNIQUE constraint: outlet_id + tanggal
- Untuk setiap non_topping_status: `total_sisa = qty_fresh + qty_aging + qty_expired`
- Untuk setiap finished_products: `total_sisa = qty_fresh + qty_aging + qty_reject`
- `reason_expired` wajib jika `qty_expired > 0`
- `reason_reject` wajib jika `qty_reject > 0`

**Response (201 Created):**
```typescript
{
  success: true,
  data: {
    daily_closing: {
      id: string;
      outlet_id: string;
      tanggal: string;
      closed_by: string;
      notes: string;
      created_at: string;
    },
    loss_summary: {
      production_waste_loss: number;
      topping_error_loss: number;
      non_topping_expired_loss: number;
      finished_product_reject_loss: number;
      total_loss: number;
      total_waste_qty: number;
    }
  },
  message: "Closing berhasil disimpan"
}
```

**Error Responses:**
- `409 Conflict`: Closing sudah dilakukan untuk tanggal ini
- `400 Bad Request`: Validation error (total_sisa tidak sesuai)

##### GET /api/closing/daily
**Purpose:** Get closing data dengan filter

**Authorization:** Role: `closing_staff`, `manager`, `admin`

**Query Parameters:**
```typescript
{
  outlet_id?: string;
  tanggal?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    items: Array<{
      id: string;
      outlet: { id: string; name: string; };
      tanggal: string;
      closed_by: { id: string; name: string; };
      non_topping_status: Array<{ ... }>;
      finished_products: Array<{ ... }>;
      loss_summary: { ... };
      notes: string;
      created_at: string;
    }>,
    pagination: { ... }
  }
}
```

##### GET /api/closing/check
**Purpose:** Cek apakah outlet sudah closing hari ini

**Authorization:** Role: `closing_staff`, `manager`, `admin`

**Query Parameters:**
```typescript
{
  outlet_id: string;        // Required
  tanggal?: string;         // Optional, default: today
}
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    has_closed: boolean;
    closing_data?: { ... };  // If has_closed = true
  }
}
```

#### 5. Dashboard & Analytics APIs

##### GET /api/dashboard/daily
**Purpose:** Get dashboard data harian untuk owner

**Authorization:** Role: `manager`, `admin`, `owner`

**Query Parameters:**
```typescript
{
  outlet_id?: string;       // Optional, if not provided: all outlets
  tanggal?: string;         // Optional, default: today
}
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    financial_summary: {
      omzet: number;              // Total revenue
      hpp_sold: number;           // HPP terjual
      total_loss: number;         // Total waste/loss
      gross_profit: number;       // Omzet - HPP - Loss
      margin_percentage: number;  // (Gross profit / Omzet) * 100
    },
    production_sales: {
      target_production: number;
      successful_production: number;
      failed_production: number;
      sold_qty: number;
      remaining_qty: number;
      success_rate: number;       // %
      waste_rate: number;         // %
      sales_rate: number;         // %
    },
    loss_breakdown: {
      production_waste: {
        qty: number;
        hpp_loss: number;
        percentage: number;       // % dari total loss
        details: Array<{
          reason: string;
          qty: number;
          hpp_loss: number;
        }>;
      },
      topping_errors: {
        qty: number;
        hpp_loss: number;
        percentage: number;
      },
      non_topping_expired: {
        qty: number;
        hpp_loss: number;
        percentage: number;
      },
      finished_product_reject: {
        qty: number;
        hpp_loss: number;
        percentage: number;
      }
    },
    sales_by_flavor: Array<{
      product_name: string;
      qty_sold: number;
      revenue: number;
      percentage: number;         // % dari total sales
    }>,
    recommendations: Array<{
      type: "warning" | "info" | "success";
      priority: "high" | "medium" | "low";
      message: string;
      action?: string;
    }>
  }
}
```

##### GET /api/reports/period
**Purpose:** Get laporan periode (mingguan/bulanan)

**Authorization:** Role: `manager`, `admin`, `owner`

**Query Parameters:**
```typescript
{
  outlet_id?: string;       // Optional
  start_date: string;       // Required (YYYY-MM-DD)
  end_date: string;         // Required (YYYY-MM-DD)
  group_by?: "day" | "week" | "month";  // Default: "day"
}
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    period: {
      start_date: string;
      end_date: string;
      total_days: number;
    },
    summary: {
      total_production: number;
      total_target: number;
      total_sold: number;
      total_waste: number;
      total_loss: number;
      average_waste_rate: number;
      average_margin: number;
    },
    trends: {
      waste_rate_by_period: Array<{
        date: string;
        waste_rate: number;
      }>,
      loss_by_category: Array<{
        date: string;
        production_waste: number;
        topping_errors: number;
        non_topping_expired: number;
        finished_product_reject: number;
      }>,
      sales_by_flavor: Array<{
        date: string;
        flavor: string;
        qty: number;
        revenue: number;
      }>
    },
    outlet_comparison?: Array<{
      outlet_id: string;
      outlet_name: string;
      total_production: number;
      waste_rate: number;
      total_loss: number;
    }>
  }
}
```

##### POST /api/reports/export
**Purpose:** Export laporan ke Excel

**Authorization:** Role: `manager`, `admin`, `owner`

**Request Body:**
```typescript
{
  outlet_id?: string;
  start_date: string;
  end_date: string;
  format: "excel" | "pdf";
  include_sheets: Array<"summary" | "production" | "sales" | "loss" | "flavors">;
}
```

**Response (200 OK):**
```typescript
// Returns file download
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="laporan-{start_date}-{end_date}.xlsx"
```

#### 6. Alert APIs

##### GET /api/alerts
**Purpose:** Get list alerts untuk user

**Authorization:** All authenticated users

**Query Parameters:**
```typescript
{
  outlet_id?: string;
  status?: "unread" | "read" | "all";  // Default: "unread"
  severity?: "info" | "warning" | "critical";
  page?: number;
  limit?: number;
}
```

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    items: Array<{
      id: string;
      type: string;           // stock_low, waste_high, no_production, no_closing
      severity: string;
      title: string;
      message: string;
      outlet: { id: string; name: string; };
      is_read: boolean;
      created_at: string;
    }>,
    unread_count: number;
    pagination: { ... }
  }
}
```

##### PUT /api/alerts/[id]/read
**Purpose:** Mark alert as read

**Authorization:** All authenticated users

**Response (200 OK):**
```typescript
{
  success: true,
  message: "Alert ditandai sudah dibaca"
}
```

##### POST /api/alerts/check
**Purpose:** Trigger manual alert check (untuk testing)

**Authorization:** Role: `admin` only

**Response (200 OK):**
```typescript
{
  success: true,
  data: {
    alerts_created: number;
    alerts: Array<{ ... }>
  }
}
```

### API Error Handling

**Standard Error Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `422` - Unprocessable Entity (business logic error)
- `500` - Internal Server Error

**Error Response Format:**
```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "BUSINESS_LOGIC_ERROR" | "INTERNAL_ERROR",
    message: string,
    details?: {
      field?: string;
      constraint?: string;
      value?: any;
    }
  }
}
```

### API Rate Limiting

**Rate Limits:**
- Production Input: 10 requests per minute per user
- Closing: 5 requests per minute per user
- Dashboard: 30 requests per minute per user
- Reports Export: 5 requests per hour per user

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1620000000
```



---

## Component Architecture

### Component Hierarchy

```
app/
├── dashboard/
│   ├── input-produksi/
│   │   ├── page.tsx                          (Server Component)
│   │   └── components/
│   │       ├── ProductionInputForm.tsx       (Client Component)
│   │       ├── WasteReasonInput.tsx          (Client Component)
│   │       ├── ProductionSummaryCard.tsx     (Client Component)
│   │       └── ProductionHistoryList.tsx     (Client Component)
│   │
│   ├── kasir/
│   │   ├── page.tsx                          (Server Component)
│   │   └── components/
│   │       ├── StockValidationModal.tsx      (Client Component)
│   │       ├── StockSummaryBar.tsx           (Client Component)
│   │       ├── POSInterface.tsx              (Client Component - existing)
│   │       └── ToppingErrorForm.tsx          (Client Component)
│   │
│   ├── closing-harian/
│   │   ├── page.tsx                          (Server Component)
│   │   └── components/
│   │       ├── ClosingTabs.tsx               (Client Component)
│   │       ├── NonToppingStatusTab.tsx       (Client Component)
│   │       ├── FinishedProductsTab.tsx       (Client Component)
│   │       ├── ClosingSummaryTab.tsx         (Client Component)
│   │       └── ClosingConfirmDialog.tsx      (Client Component)
│   │
│   ├── dashboard-owner/
│   │   ├── page.tsx                          (Server Component)
│   │   └── components/
│   │       ├── FinancialSummaryCards.tsx     (Client Component)
│   │       ├── ProductionSalesOverview.tsx   (Client Component)
│   │       ├── LossBreakdownChart.tsx        (Client Component)
│   │       ├── SalesByFlavorChart.tsx        (Client Component)
│   │       └── RecommendationsPanel.tsx      (Client Component)
│   │
│   └── laporan/
│       ├── page.tsx                          (Server Component)
│       └── components/
│           ├── ReportFilters.tsx             (Client Component)
│           ├── PeriodSelector.tsx            (Client Component)
│           ├── TrendCharts.tsx               (Client Component)
│           ├── OutletComparison.tsx          (Client Component)
│           └── ExportButton.tsx              (Client Component)
│
└── components/
    ├── shared/
    │   ├── AlertNotification.tsx             (Client Component)
    │   ├── DatePicker.tsx                    (Client Component)
    │   ├── OutletSelector.tsx                (Client Component)
    │   └── LoadingSkeleton.tsx               (Client Component)
    │
    └── layout/
        ├── DashboardNav.tsx                  (Client Component - existing)
        └── AlertBell.tsx                     (Client Component)
```

### Page Components (Server Components)

#### 1. Input Produksi Page
**File:** `app/dashboard/input-produksi/page.tsx`

**Purpose:** Halaman input produksi harian untuk bagian dapur

**Server-side Data Fetching:**
```typescript
async function InputProduksiPage() {
  const user = await getUser();
  const outlets = await getOutlets(user.id);
  const todayProduction = await getTodayProduction(user.outlet_id);
  
  return (
    <div>
      <PageHeader title="Input Produksi Harian" />
      <ProductionInputForm 
        outlets={outlets}
        existingProduction={todayProduction}
      />
      <ProductionHistoryList outlet_id={user.outlet_id} />
    </div>
  );
}
```

**Features:**
- Server-side authentication check
- Pre-fetch outlets and today's production
- Pass data to client components

#### 2. Kasir Page
**File:** `app/dashboard/kasir/page.tsx`

**Purpose:** Halaman kasir dengan validasi stok

**Server-side Data Fetching:**
```typescript
async function KasirPage() {
  const user = await getUser();
  const stockValidation = await validateStock(user.outlet_id);
  const products = await getProducts();
  
  return (
    <div>
      {!stockValidation.can_operate && (
        <StockValidationModal validation={stockValidation} />
      )}
      <StockSummaryBar stock={stockValidation.stock_summary} />
      <POSInterface 
        products={products}
        canOperate={stockValidation.can_operate}
      />
    </div>
  );
}
```

**Features:**
- Check stock validation on server
- Show blocking modal if no production
- Display stock summary bar

#### 3. Closing Harian Page
**File:** `app/dashboard/closing-harian/page.tsx`

**Purpose:** Halaman closing harian

**Server-side Data Fetching:**
```typescript
async function ClosingHarianPage() {
  const user = await getUser();
  const hasClosedToday = await checkClosingStatus(user.outlet_id);
  const stockData = await getStockForClosing(user.outlet_id);
  const productionData = await getTodayProduction(user.outlet_id);
  
  return (
    <div>
      <PageHeader title="Closing Harian" />
      {hasClosedToday ? (
        <ClosingSummary data={hasClosedToday} />
      ) : (
        <ClosingTabs 
          stockData={stockData}
          productionData={productionData}
        />
      )}
    </div>
  );
}
```

**Features:**
- Check if already closed today
- Pre-fetch stock and production data
- Show summary if already closed

#### 4. Dashboard Owner Page
**File:** `app/dashboard/dashboard-owner/page.tsx`

**Purpose:** Dashboard lengkap untuk owner/manager

**Server-side Data Fetching:**
```typescript
async function DashboardOwnerPage({ searchParams }) {
  const user = await getUser();
  const date = searchParams.date || new Date().toISOString().split('T')[0];
  const outlet_id = searchParams.outlet_id || user.outlet_id;
  
  const dashboardData = await getDashboardData(outlet_id, date);
  
  return (
    <div>
      <PageHeader title="Dashboard Owner" />
      <DateFilter defaultDate={date} />
      <OutletFilter defaultOutlet={outlet_id} />
      
      <FinancialSummaryCards data={dashboardData.financial_summary} />
      <ProductionSalesOverview data={dashboardData.production_sales} />
      <LossBreakdownChart data={dashboardData.loss_breakdown} />
      <SalesByFlavorChart data={dashboardData.sales_by_flavor} />
      <RecommendationsPanel recommendations={dashboardData.recommendations} />
    </div>
  );
}
```

**Features:**
- Support date and outlet filtering via URL params
- Pre-fetch all dashboard data on server
- Pass data to visualization components

### Client Components

#### 1. ProductionInputForm
**File:** `components/production/ProductionInputForm.tsx`

**Purpose:** Form input produksi dengan waste tracking

**Props:**
```typescript
interface ProductionInputFormProps {
  outlets: Outlet[];
  existingProduction?: ProductionDaily;
}
```

**State Management:**
```typescript
const [formData, setFormData] = useState({
  outlet_id: '',
  tanggal: new Date().toISOString().split('T')[0],
  ukuran: 'standar',
  target_qty: 0,
  success_qty: 0,
  waste_details: []
});
const [isSubmitting, setIsSubmitting] = useState(false);
const [errors, setErrors] = useState({});
```

**Key Features:**
- Dynamic waste reasons (add/remove)
- Real-time validation
- Auto-calculate waste totals
- Show success/waste rate
- Warning if waste rate > 15%

**Component Structure:**
```tsx
<Form onSubmit={handleSubmit}>
  <OutletSelector />
  <DatePicker />
  <SizeSelector />
  <Input label="Target Produksi" />
  <Input label="Qty Berhasil" />
  
  <WasteSection>
    {wasteDetails.map((waste, index) => (
      <WasteReasonInput 
        key={index}
        data={waste}
        onChange={(data) => updateWaste(index, data)}
        onRemove={() => removeWaste(index)}
      />
    ))}
    <Button onClick={addWaste}>+ Tambah Alasan Gagal</Button>
  </WasteSection>
  
  <ProductionSummaryCard 
    target={formData.target_qty}
    success={formData.success_qty}
    waste={totalWaste}
  />
  
  <Button type="submit" disabled={isSubmitting}>
    Simpan Produksi
  </Button>
</Form>
```

#### 2. StockValidationModal
**File:** `components/pos/StockValidationModal.tsx`

**Purpose:** Modal blocking kasir jika belum ada produksi

**Props:**
```typescript
interface StockValidationModalProps {
  validation: {
    can_operate: boolean;
    has_production: boolean;
  };
}
```

**Component Structure:**
```tsx
<Modal open={!validation.can_operate} closable={false}>
  <AlertIcon type="error" />
  <Title>KASIR DIBLOKIR</Title>
  <Message>
    Belum ada input produksi hari ini!
    Hubungi bagian dapur untuk input produksi terlebih dahulu.
  </Message>
  <Actions>
    <Button onClick={handleRefresh}>🔄 Refresh</Button>
    <Button onClick={handleContact}>📞 Hubungi Dapur</Button>
  </Actions>
</Modal>
```

**Key Features:**
- Cannot be closed by user
- Refresh button to re-check
- Contact button (optional)

#### 3. ClosingTabs
**File:** `components/closing/ClosingTabs.tsx`

**Purpose:** Tab navigation untuk closing harian

**Props:**
```typescript
interface ClosingTabsProps {
  stockData: StockData;
  productionData: ProductionData;
}
```

**State Management:**
```typescript
const [activeTab, setActiveTab] = useState(0);
const [nonToppingData, setNonToppingData] = useState([]);
const [finishedProductsData, setFinishedProductsData] = useState([]);
const [notes, setNotes] = useState('');
const [isSubmitting, setIsSubmitting] = useState(false);
```

**Component Structure:**
```tsx
<Tabs value={activeTab} onChange={setActiveTab}>
  <TabList>
    <Tab>Sisa Non-Topping</Tab>
    <Tab>Sisa Sudah Topping</Tab>
    <Tab>Summary & Submit</Tab>
  </TabList>
  
  <TabPanel value={0}>
    <NonToppingStatusTab 
      data={nonToppingData}
      onChange={setNonToppingData}
      stockData={stockData}
    />
  </TabPanel>
  
  <TabPanel value={1}>
    <FinishedProductsTab 
      data={finishedProductsData}
      onChange={setFinishedProductsData}
    />
  </TabPanel>
  
  <TabPanel value={2}>
    <ClosingSummaryTab 
      nonToppingData={nonToppingData}
      finishedProductsData={finishedProductsData}
      productionData={productionData}
      notes={notes}
      onNotesChange={setNotes}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
    />
  </TabPanel>
</Tabs>
```

**Key Features:**
- Three-tab interface
- Data flows from Tab 1 & 2 to Tab 3
- Validation before allowing tab change
- Submit only from Tab 3

#### 4. FinancialSummaryCards
**File:** `components/dashboard/FinancialSummaryCards.tsx`

**Purpose:** Display financial metrics in card format

**Props:**
```typescript
interface FinancialSummaryCardsProps {
  data: {
    omzet: number;
    hpp_sold: number;
    total_loss: number;
    gross_profit: number;
    margin_percentage: number;
  };
}
```

**Component Structure:**
```tsx
<Grid cols={4}>
  <MetricCard
    title="Omzet"
    value={formatCurrency(data.omzet)}
    trend={getTrend('omzet')}
    color="blue"
  />
  <MetricCard
    title="Gross Profit"
    value={formatCurrency(data.gross_profit)}
    trend={getTrend('profit')}
    color="green"
  />
  <MetricCard
    title="Total Rugi"
    value={formatCurrency(data.total_loss)}
    trend={getTrend('loss')}
    color="red"
  />
  <MetricCard
    title="Margin"
    value={`${data.margin_percentage.toFixed(1)}%`}
    trend={getTrend('margin')}
    color={data.margin_percentage > 30 ? 'green' : 'yellow'}
  />
</Grid>
```

**Key Features:**
- Color-coded cards
- Trend indicators (up/down)
- Responsive grid layout

#### 5. LossBreakdownChart
**File:** `components/dashboard/LossBreakdownChart.tsx`

**Purpose:** Pie chart untuk breakdown rugi per kategori

**Props:**
```typescript
interface LossBreakdownChartProps {
  data: {
    production_waste: { qty: number; hpp_loss: number; percentage: number; };
    topping_errors: { qty: number; hpp_loss: number; percentage: number; };
    non_topping_expired: { qty: number; hpp_loss: number; percentage: number; };
    finished_product_reject: { qty: number; hpp_loss: number; percentage: number; };
  };
}
```

**Component Structure:**
```tsx
<Card>
  <CardHeader>
    <Title>Detail Rugi per Kategori</Title>
  </CardHeader>
  <CardContent>
    <PieChart data={chartData} />
    <Legend>
      {categories.map(cat => (
        <LegendItem 
          key={cat.name}
          color={cat.color}
          label={cat.name}
          value={formatCurrency(cat.hpp_loss)}
          percentage={cat.percentage}
          onClick={() => handleDrillDown(cat)}
        />
      ))}
    </Legend>
  </CardContent>
</Card>
```

**Key Features:**
- Interactive pie chart (recharts)
- Click to drill-down details
- Show qty and HPP loss
- Color-coded categories

#### 6. AlertBell
**File:** `components/layout/AlertBell.tsx`

**Purpose:** Notification bell icon di header

**State Management:**
```typescript
const [alerts, setAlerts] = useState([]);
const [unreadCount, setUnreadCount] = useState(0);
const [isOpen, setIsOpen] = useState(false);
```

**Component Structure:**
```tsx
<Popover open={isOpen} onOpenChange={setIsOpen}>
  <PopoverTrigger>
    <Button variant="ghost" size="icon">
      <BellIcon />
      {unreadCount > 0 && (
        <Badge variant="destructive">{unreadCount}</Badge>
      )}
    </Button>
  </PopoverTrigger>
  
  <PopoverContent>
    <AlertList>
      {alerts.map(alert => (
        <AlertItem 
          key={alert.id}
          alert={alert}
          onMarkRead={handleMarkRead}
        />
      ))}
    </AlertList>
    <ViewAllLink href="/dashboard/alerts">
      Lihat Semua Alert
    </ViewAllLink>
  </PopoverContent>
</Popover>
```

**Key Features:**
- Real-time unread count
- Dropdown with recent alerts
- Color-coded by severity
- Mark as read functionality

### Shared Components

#### 1. DatePicker
**File:** `components/shared/DatePicker.tsx`

**Purpose:** Reusable date picker component

**Props:**
```typescript
interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
}
```

#### 2. OutletSelector
**File:** `components/shared/OutletSelector.tsx`

**Purpose:** Dropdown selector untuk outlet

**Props:**
```typescript
interface OutletSelectorProps {
  outlets: Outlet[];
  value: string;
  onChange: (outlet_id: string) => void;
  label?: string;
  allowAll?: boolean;  // Show "Semua Outlet" option
}
```

#### 3. LoadingSkeleton
**File:** `components/shared/LoadingSkeleton.tsx`

**Purpose:** Loading placeholder untuk data fetching

**Variants:**
- `CardSkeleton` - For metric cards
- `ChartSkeleton` - For charts
- `TableSkeleton` - For tables
- `FormSkeleton` - For forms

### Component Communication Patterns

#### 1. Server to Client (Props)
```typescript
// Server Component
async function Page() {
  const data = await fetchData();
  return <ClientComponent data={data} />;
}

// Client Component
'use client';
function ClientComponent({ data }) {
  // Use data
}
```

#### 2. Client to Server (Server Actions)
```typescript
// Server Action
'use server';
async function submitProduction(formData) {
  // Validate and save
  revalidatePath('/dashboard/input-produksi');
}

// Client Component
'use client';
function Form() {
  const handleSubmit = async (data) => {
    await submitProduction(data);
  };
}
```

#### 3. Client to Client (Props & Callbacks)
```typescript
// Parent Component
function Parent() {
  const [data, setData] = useState([]);
  return <Child data={data} onChange={setData} />;
}

// Child Component
function Child({ data, onChange }) {
  const handleChange = (newData) => {
    onChange(newData);
  };
}
```

#### 4. Global State (Context)
```typescript
// Context Provider
'use client';
export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);
  return (
    <AlertContext.Provider value={{ alerts, setAlerts }}>
      {children}
    </AlertContext.Provider>
  );
}

// Consumer
function Component() {
  const { alerts } = useContext(AlertContext);
}
```



---

## Business Logic Design

### 🚨 CRITICAL: HPP Calculation Logic

**WAJIB DIBACA SEBELUM IMPLEMENTASI!**

HPP (Harga Pokok Penjualan) dalam sistem ini memiliki struktur khusus yang **BERBEDA PER OUTLET**. Kesalahan dalam perhitungan HPP akan menyebabkan data rugi tidak akurat dan merugikan perusahaan.

#### HPP Structure

```
HPP Produk Varian = HPP Polos + Biaya Topping
```

**Data Sources:**
1. **HPP Polos** → Table `outlet_production_costs` (berbeda per outlet, per ukuran)
2. **HPP Total** → Table `products.harga_pokok_penjualan` (global)
3. **Biaya Topping** → **CALCULATED** (tidak disimpan di database)

#### Calculation Formula

```typescript
// CORRECT IMPLEMENTATION ✅
async function calculateHPPBreakdown(
  outlet_id: string,
  product_name: string
): Promise<HPPBreakdown> {
  // 1. Get product data (HPP total & size)
  const product = await db.products.findFirst({
    where: { nama: product_name, is_active: true },
    select: { harga_pokok_penjualan: true, ukuran: true }
  });
  
  if (!product) {
    throw new Error(`Product "${product_name}" not found`);
  }
  
  const hpp_total = product.harga_pokok_penjualan;
  const ukuran = product.ukuran; // 'standar' or 'mini'
  
  // 2. Get outlet production costs (HPP polos)
  const costs = await db.outlet_production_costs.findUnique({
    where: { outlet_id },
    select: { 
      cost_polos_standar: true, 
      cost_polos_mini: true 
    }
  });
  
  if (!costs) {
    throw new Error(`Production costs not found for outlet ${outlet_id}`);
  }
  
  const hpp_polos = ukuran === 'standar' 
    ? costs.cost_polos_standar 
    : costs.cost_polos_mini;
  
  // 3. Calculate biaya topping
  const biaya_topping = hpp_total - hpp_polos;
  
  // Validation
  if (hpp_polos <= 0) {
    throw new Error('HPP polos must be greater than 0');
  }
  if (biaya_topping < 0) {
    throw new Error('Biaya topping cannot be negative (HPP total < HPP polos)');
  }
  
  return {
    hpp_polos,
    biaya_topping,
    hpp_total,
    ukuran
  };
}
```

#### Example Calculation

**Case: Bomboloni Strawberry di Donattour Pusat (2 pcs)**

```typescript
// Step 1: Query products
const product = {
  harga_pokok_penjualan: 6000,
  ukuran: 'standar'
};

// Step 2: Query outlet_production_costs
const costs = {
  cost_polos_standar: 2000,
  cost_polos_mini: 2500
};

// Step 3: Calculate
const hpp_polos = 2000; // standar
const hpp_total = 6000;
const biaya_topping = 6000 - 2000; // = 4000

// Step 4: Total loss for 2 pcs
const qty = 2;
const total_rugi = (hpp_polos + biaya_topping) * qty;
// = (2000 + 4000) * 2 = 12000
```

#### ❌ WRONG IMPLEMENTATIONS TO AVOID

```typescript
// ❌ WRONG: Querying non-existent field
const product = await db.products.findFirst({
  select: { 
    harga_pokok_penjualan: true,
    biaya_topping: true  // ❌ FIELD DOES NOT EXIST!
  }
});

// ❌ WRONG: Using only products table (not outlet-specific)
const hpp_loss = product.harga_pokok_penjualan * qty;

// ❌ WRONG: Hardcoding values
const hpp_polos = 3000; // ❌ Different per outlet!
const biaya_topping = 2000; // ❌ Must be calculated!

// ❌ WRONG: Not considering outlet
const hpp = await getHPP(product_name); // Missing outlet_id!
```

#### ✅ CORRECT USAGE IN TOPPING ERROR API

```typescript
// app/api/topping-errors/route.ts
export async function POST(request: NextRequest) {
  const { outlet_id, product_made, qty, reason } = await request.json();
  
  // ✅ CORRECT: Calculate HPP breakdown
  const breakdown = await calculateHPPBreakdown(outlet_id, product_made);
  
  // ✅ CORRECT: Use calculated values
  const total_hpp_loss = (breakdown.hpp_polos + breakdown.biaya_topping) * qty;
  
  // ✅ CORRECT: Save breakdown to database
  await db.topping_errors.create({
    data: {
      outlet_id,
      product_made,
      qty,
      reason,
      hpp_per_pcs: breakdown.hpp_polos,      // HPP polos
      topping_cost: breakdown.biaya_topping,  // Calculated
      total_hpp_loss                          // Total
    }
  });
}
```

#### Validation Checklist

Before implementing any HPP-related feature:

- [ ] Query `outlet_production_costs` for HPP polos
- [ ] Query `products` for HPP total and ukuran
- [ ] Calculate biaya topping: `hpp_total - hpp_polos`
- [ ] Validate: hpp_polos > 0
- [ ] Validate: biaya_topping >= 0
- [ ] Save complete breakdown (hpp_per_pcs, topping_cost, total_hpp_loss)
- [ ] Test with data from multiple outlets
- [ ] Verify calculation matches manual calculation

**📖 Full Documentation:** See `.kiro/specs/production-tracking-system/HPP-STRUCTURE-DOCUMENTATION.md`

---

### Core Business Flows

#### 1. Production Input Flow

```mermaid
sequenceDiagram
    participant U as Bagian Dapur
    participant UI as ProductionInputForm
    participant API as POST /api/production/daily
    participant DB as Database
    participant INV as Inventory System

    U->>UI: Input produksi data
    UI->>UI: Validate form (client-side)
    UI->>API: Submit production data
    
    API->>API: Validate request (Zod schema)
    API->>DB: Check duplicate (outlet+date+size)
    
    alt Duplicate Found
        DB-->>API: Conflict
        API-->>UI: 409 Error
        UI-->>U: Show error message
    else No Duplicate
        API->>DB: BEGIN TRANSACTION
        
        API->>DB: INSERT production_daily
        API->>DB: INSERT production_waste_details (batch)
        API->>INV: CREATE/UPDATE inventory_non_topping
        
        API->>DB: COMMIT TRANSACTION
        DB-->>API: Success
        API-->>UI: 201 Created
        UI-->>U: Show success message
        UI->>UI: Refresh history list
    end
```

**Business Rules Implementation:**

```typescript
// lib/business-logic/production.ts

export async function createProductionInput(data: ProductionInputData) {
  // 1. Validation
  const validated = productionInputSchema.parse(data);
  
  // 2. Business rule: success + waste <= target
  const totalQty = validated.success_qty + 
    validated.waste_details.reduce((sum, w) => sum + w.qty, 0);
  
  if (totalQty > validated.target_qty) {
    throw new BusinessLogicError(
      'Total qty (success + waste) tidak boleh melebihi target'
    );
  }
  
  // 3. Check duplicate
  const existing = await db.production_daily.findUnique({
    where: {
      outlet_id_tanggal_ukuran: {
        outlet_id: validated.outlet_id,
        tanggal: validated.tanggal,
        ukuran: validated.ukuran
      }
    }
  });
  
  if (existing) {
    throw new ConflictError('Produksi untuk outlet, tanggal, dan ukuran ini sudah ada');
  }
  
  // 4. Calculate total HPP loss
  const total_hpp_loss = validated.waste_details.reduce(
    (sum, w) => sum + (w.qty * w.hpp_per_pcs), 
    0
  );
  
  // 5. Execute in transaction
  return await db.$transaction(async (tx) => {
    // Insert production_daily
    const production = await tx.production_daily.create({
      data: {
        outlet_id: validated.outlet_id,
        tanggal: validated.tanggal,
        ukuran: validated.ukuran,
        target_qty: validated.target_qty,
        success_qty: validated.success_qty,
        waste_qty: totalQty - validated.success_qty,
        total_hpp_loss,
        created_by: userId
      }
    });
    
    // Insert waste details
    if (validated.waste_details.length > 0) {
      await tx.production_waste_details.createMany({
        data: validated.waste_details.map(w => ({
          production_daily_id: production.id,
          reason: w.reason,
          qty: w.qty,
          hpp_per_pcs: w.hpp_per_pcs
        }))
      });
    }
    
    // Create/Update inventory
    await tx.inventory_non_topping.upsert({
      where: {
        outlet_id_ukuran_production_date_status: {
          outlet_id: validated.outlet_id,
          ukuran: validated.ukuran,
          production_date: validated.tanggal,
          status: 'fresh'
        }
      },
      create: {
        outlet_id: validated.outlet_id,
        ukuran: validated.ukuran,
        qty_available: validated.success_qty,
        production_date: validated.tanggal,
        status: 'fresh'
      },
      update: {
        qty_available: {
          increment: validated.success_qty
        },
        last_updated: new Date()
      }
    });
    
    return production;
  });
}
```

#### 2. Stock Validation Flow (Kasir)

```mermaid
sequenceDiagram
    participant K as Kasir
    participant UI as Kasir Page
    participant API as GET /api/inventory/validate
    participant DB as Database

    K->>UI: Open kasir page
    UI->>API: Check stock validation
    API->>DB: Query production_daily (today)
    
    alt No Production Today
        DB-->>API: Empty result
        API-->>UI: can_operate: false
        UI->>UI: Show blocking modal
        UI-->>K: "Belum ada input produksi!"
        
        K->>UI: Click Refresh
        UI->>API: Re-check validation
    else Has Production
        DB-->>API: Production data found
        API->>DB: Query inventory_non_topping
        DB-->>API: Stock data
        API->>API: Calculate stock status
        API-->>UI: can_operate: true + stock_summary
        UI->>UI: Show stock summary bar
        UI->>UI: Enable POS interface
        UI-->>K: Ready to operate
    end
```

**Business Rules Implementation:**

```typescript
// lib/business-logic/stock-validation.ts

export async function validateStockForPOS(outlet_id: string, tanggal: string) {
  // 1. Check if production exists today
  const productions = await db.production_daily.findMany({
    where: {
      outlet_id,
      tanggal
    }
  });
  
  if (productions.length === 0) {
    return {
      can_operate: false,
      has_production: false,
      stock_summary: null,
      production_data: null
    };
  }
  
  // 2. Get current stock
  const stocks = await db.inventory_non_topping.findMany({
    where: {
      outlet_id,
      production_date: tanggal,
      status: 'fresh'
    }
  });
  
  // 3. Calculate stock status
  const stock_summary = {};
  
  for (const production of productions) {
    const stock = stocks.find(s => s.ukuran === production.ukuran);
    const qty_available = stock?.qty_available || 0;
    const percentage = (qty_available / production.success_qty) * 100;
    
    let status: 'sufficient' | 'low' | 'out_of_stock';
    if (qty_available === 0) {
      status = 'out_of_stock';
    } else if (percentage < 20) {
      status = 'low';
    } else {
      status = 'sufficient';
    }
    
    stock_summary[production.ukuran] = {
      qty_available,
      status,
      percentage: Math.round(percentage)
    };
  }
  
  return {
    can_operate: true,
    has_production: true,
    stock_summary,
    production_data: productions.reduce((acc, p) => {
      acc[p.ukuran] = {
        target_qty: p.target_qty,
        success_qty: p.success_qty
      };
      return acc;
    }, {})
  };
}
```

#### 3. Sale Transaction Flow (with Stock Deduction)

```mermaid
sequenceDiagram
    participant K as Kasir
    participant UI as POS Interface
    participant API as POST /api/orders
    participant DB as Database
    participant INV as Inventory System

    K->>UI: Add product to cart
    K->>UI: Click checkout
    UI->>API: Create order
    
    API->>API: Validate order data
    API->>DB: BEGIN TRANSACTION
    
    loop For each order item
        API->>INV: Check stock availability
        
        alt Insufficient Stock
            INV-->>API: Stock not enough
            API->>DB: ROLLBACK
            API-->>UI: 400 Error
            UI-->>K: "Stok tidak cukup!"
        else Stock Available
            API->>DB: INSERT order & order_items
            API->>INV: Deduct stock (UPDATE inventory_non_topping)
            API->>DB: INSERT topping_usage
        end
    end
    
    API->>DB: COMMIT TRANSACTION
    API-->>UI: 201 Created
    UI->>UI: Update stock display
    UI-->>K: Show success + print receipt
```

**Business Rules Implementation:**

```typescript
// lib/business-logic/sales.ts

export async function createSaleTransaction(orderData: OrderData) {
  const validated = orderSchema.parse(orderData);
  
  return await db.$transaction(async (tx) => {
    // 1. Create order
    const order = await tx.orders.create({
      data: {
        outlet_id: validated.outlet_id,
        kasir_id: validated.kasir_id,
        total_amount: validated.total_amount,
        payment_method: validated.payment_method,
        status: 'completed'
      }
    });
    
    // 2. Process each order item
    for (const item of validated.items) {
      // Get product details
      const product = await tx.products.findUnique({
        where: { id: item.product_id }
      });
      
      if (!product) {
        throw new NotFoundError(`Product ${item.product_id} not found`);
      }
      
      // Check stock availability
      const stock = await tx.inventory_non_topping.findFirst({
        where: {
          outlet_id: validated.outlet_id,
          ukuran: product.ukuran,
          status: 'fresh',
          production_date: new Date().toISOString().split('T')[0],
          qty_available: { gte: item.qty }
        }
      });
      
      if (!stock) {
        throw new BusinessLogicError(
          `Stok ${product.ukuran} tidak cukup. Tersedia: ${stock?.qty_available || 0}, Dibutuhkan: ${item.qty}`
        );
      }
      
      // Create order item
      await tx.order_items.create({
        data: {
          order_id: order.id,
          product_id: item.product_id,
          qty: item.qty,
          price: item.price,
          subtotal: item.qty * item.price
        }
      });
      
      // Deduct stock
      await tx.inventory_non_topping.update({
        where: { id: stock.id },
        data: {
          qty_available: {
            decrement: item.qty
          },
          last_updated: new Date()
        }
      });
      
      // Track topping usage
      await tx.topping_usage.create({
        data: {
          order_id: order.id,
          product_id: item.product_id,
          topping_name: product.topping_name,
          qty: item.qty
        }
      });
    }
    
    return order;
  });
}
```

#### 4. Daily Closing Flow

```mermaid
sequenceDiagram
    participant C as Closing Staff
    participant UI as Closing Form
    participant API as POST /api/closing/daily
    participant DB as Database
    participant LOSS as Loss Calculator

    C->>UI: Fill Tab 1 (Non-Topping Status)
    C->>UI: Fill Tab 2 (Finished Products)
    C->>UI: Review Tab 3 (Summary)
    C->>UI: Submit closing
    
    UI->>API: Submit closing data
    API->>API: Validate data
    
    API->>DB: Check if already closed today
    alt Already Closed
        DB-->>API: Conflict
        API-->>UI: 409 Error
        UI-->>C: "Sudah closing hari ini"
    else Not Closed Yet
        API->>DB: BEGIN TRANSACTION
        
        API->>DB: INSERT daily_closing
        API->>DB: INSERT closing_non_topping_status (batch)
        API->>DB: INSERT closing_finished_products (batch)
        
        API->>LOSS: Calculate total loss
        LOSS->>DB: Query production waste
        LOSS->>DB: Query topping errors
        LOSS->>LOSS: Sum all losses
        
        API->>DB: INSERT daily_loss_summary
        
        API->>DB: UPDATE inventory_non_topping (fresh/aging status)
        
        API->>DB: COMMIT TRANSACTION
        API-->>UI: 201 Created + loss_summary
        UI-->>C: Show success + summary
    end
```

**Business Rules Implementation:**

```typescript
// lib/business-logic/closing.ts

export async function createDailyClosing(closingData: ClosingData) {
  const validated = closingSchema.parse(closingData);
  
  // 1. Validate total_sisa calculations
  for (const item of validated.non_topping_status) {
    const total = item.qty_fresh + item.qty_aging + item.qty_expired;
    if (total !== item.total_sisa) {
      throw new BusinessLogicError(
        `Total sisa ${item.ukuran} tidak sesuai: ${total} != ${item.total_sisa}`
      );
    }
    
    if (item.qty_expired > 0 && !item.reason_expired) {
      throw new BusinessLogicError(
        `Alasan expired wajib diisi untuk ${item.ukuran}`
      );
    }
  }
  
  for (const item of validated.finished_products) {
    const total = item.qty_fresh + item.qty_aging + item.qty_reject;
    if (total !== item.total_sisa) {
      throw new BusinessLogicError(
        `Total sisa ${item.product_name} tidak sesuai: ${total} != ${item.total_sisa}`
      );
    }
    
    if (item.qty_reject > 0 && !item.reason_reject) {
      throw new BusinessLogicError(
        `Alasan reject wajib diisi untuk ${item.product_name}`
      );
    }
  }
  
  // 2. Check duplicate
  const existing = await db.daily_closing.findUnique({
    where: {
      outlet_id_tanggal: {
        outlet_id: validated.outlet_id,
        tanggal: validated.tanggal
      }
    }
  });
  
  if (existing) {
    throw new ConflictError('Closing sudah dilakukan untuk tanggal ini');
  }
  
  // 3. Execute in transaction
  return await db.$transaction(async (tx) => {
    // Create daily_closing
    const closing = await tx.daily_closing.create({
      data: {
        outlet_id: validated.outlet_id,
        tanggal: validated.tanggal,
        closed_by: userId,
        notes: validated.notes
      }
    });
    
    // Insert non-topping status
    await tx.closing_non_topping_status.createMany({
      data: validated.non_topping_status.map(item => ({
        daily_closing_id: closing.id,
        ukuran: item.ukuran,
        total_sisa: item.total_sisa,
        qty_fresh: item.qty_fresh,
        qty_aging: item.qty_aging,
        qty_expired: item.qty_expired,
        hpp_loss_expired: item.hpp_loss_expired,
        reason_expired: item.reason_expired
      }))
    });
    
    // Insert finished products
    await tx.closing_finished_products.createMany({
      data: validated.finished_products.map(item => ({
        daily_closing_id: closing.id,
        product_id: item.product_id,
        product_name: item.product_name,
        total_sisa: item.total_sisa,
        qty_fresh: item.qty_fresh,
        qty_aging: item.qty_aging,
        qty_reject: item.qty_reject,
        hpp_topping_loss: item.hpp_topping_loss,
        reason_reject: item.reason_reject
      }))
    });
    
    // Calculate loss summary
    const loss_summary = await calculateDailyLoss(
      tx,
      validated.outlet_id,
      validated.tanggal,
      validated.non_topping_status,
      validated.finished_products
    );
    
    // Insert loss summary
    await tx.daily_loss_summary.create({
      data: {
        outlet_id: validated.outlet_id,
        tanggal: validated.tanggal,
        ...loss_summary
      }
    });
    
    // Update inventory status for fresh/aging items
    for (const item of validated.non_topping_status) {
      if (item.qty_fresh > 0) {
        await tx.inventory_non_topping.upsert({
          where: {
            outlet_id_ukuran_production_date_status: {
              outlet_id: validated.outlet_id,
              ukuran: item.ukuran,
              production_date: validated.tanggal,
              status: 'fresh'
            }
          },
          create: {
            outlet_id: validated.outlet_id,
            ukuran: item.ukuran,
            qty_available: item.qty_fresh,
            production_date: validated.tanggal,
            status: 'fresh'
          },
          update: {
            qty_available: item.qty_fresh,
            last_updated: new Date()
          }
        });
      }
      
      if (item.qty_aging > 0) {
        await tx.inventory_non_topping.upsert({
          where: {
            outlet_id_ukuran_production_date_status: {
              outlet_id: validated.outlet_id,
              ukuran: item.ukuran,
              production_date: validated.tanggal,
              status: 'aging'
            }
          },
          create: {
            outlet_id: validated.outlet_id,
            ukuran: item.ukuran,
            qty_available: item.qty_aging,
            production_date: validated.tanggal,
            status: 'aging'
          },
          update: {
            qty_available: item.qty_aging,
            last_updated: new Date()
          }
        });
      }
    }
    
    return {
      closing,
      loss_summary
    };
  });
}

async function calculateDailyLoss(
  tx: any,
  outlet_id: string,
  tanggal: string,
  non_topping_status: any[],
  finished_products: any[]
) {
  // 1. Production waste loss
  const production_waste = await tx.production_daily.findMany({
    where: { outlet_id, tanggal },
    select: { total_hpp_loss: true }
  });
  const production_waste_loss = production_waste.reduce(
    (sum, p) => sum + p.total_hpp_loss, 
    0
  );
  
  // 2. Topping error loss
  const topping_errors = await tx.topping_errors.findMany({
    where: { outlet_id, tanggal },
    select: { hpp_loss: true }
  });
  const topping_error_loss = topping_errors.reduce(
    (sum, e) => sum + e.hpp_loss, 
    0
  );
  
  // 3. Non-topping expired loss
  const non_topping_expired_loss = non_topping_status.reduce(
    (sum, item) => sum + item.hpp_loss_expired, 
    0
  );
  
  // 4. Finished product reject loss
  const finished_product_reject_loss = finished_products.reduce(
    (sum, item) => sum + item.hpp_topping_loss, 
    0
  );
  
  // 5. Total waste qty
  const total_waste_qty = 
    production_waste.reduce((sum, p) => sum + p.waste_qty, 0) +
    topping_errors.reduce((sum, e) => sum + e.qty, 0) +
    non_topping_status.reduce((sum, item) => sum + item.qty_expired, 0) +
    finished_products.reduce((sum, item) => sum + item.qty_reject, 0);
  
  return {
    production_waste_loss,
    topping_error_loss,
    non_topping_expired_loss,
    finished_product_reject_loss,
    total_waste_qty
  };
}
```

#### 5. Alert Generation Flow

```mermaid
sequenceDiagram
    participant CRON as Scheduled Job
    participant ALERT as Alert Service
    participant DB as Database
    participant NOTIF as Notification System

    CRON->>ALERT: Trigger alert check (every hour)
    
    ALERT->>DB: Check stock levels
    loop For each outlet
        alt Stock < 20%
            ALERT->>DB: Create alert (stock_low)
            ALERT->>NOTIF: Send to kasir & manager
        end
    end
    
    ALERT->>DB: Check waste rates
    loop For each outlet with closing
        alt Waste rate > 15%
            ALERT->>DB: Create alert (waste_high)
            ALERT->>NOTIF: Send to manager & owner
        end
    end
    
    ALERT->>DB: Check missing production (08:00)
    loop For each outlet
        alt No production today
            ALERT->>DB: Create alert (no_production)
            ALERT->>NOTIF: Send to dapur & manager
        end
    end
    
    ALERT->>DB: Check missing closing (21:00)
    loop For each outlet
        alt No closing today
            ALERT->>DB: Create alert (no_closing)
            ALERT->>NOTIF: Send to closing staff
        end
    end
```

**Business Rules Implementation:**

```typescript
// lib/business-logic/alerts.ts

export async function checkAndGenerateAlerts() {
  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getHours();
  
  // 1. Check stock low alerts (real-time)
  await checkStockLowAlerts(today);
  
  // 2. Check waste rate alerts (after closing)
  await checkWasteRateAlerts(today);
  
  // 3. Check missing production (at 08:00)
  if (currentHour === 8) {
    await checkMissingProductionAlerts(today);
  }
  
  // 4. Check missing closing (at 21:00)
  if (currentHour === 21) {
    await checkMissingClosingAlerts(today);
  }
}

async function checkStockLowAlerts(tanggal: string) {
  const outlets = await db.outlets.findMany();
  
  for (const outlet of outlets) {
    const productions = await db.production_daily.findMany({
      where: { outlet_id: outlet.id, tanggal }
    });
    
    for (const production of productions) {
      const stock = await db.inventory_non_topping.findFirst({
        where: {
          outlet_id: outlet.id,
          ukuran: production.ukuran,
          production_date: tanggal,
          status: 'fresh'
        }
      });
      
      if (stock) {
        const percentage = (stock.qty_available / production.success_qty) * 100;
        
        if (percentage < 20 && percentage > 0) {
          await createAlert({
            type: 'stock_low',
            severity: 'warning',
            outlet_id: outlet.id,
            title: 'Stok Menipis',
            message: `Stok ${production.ukuran} tinggal ${stock.qty_available} pcs (${Math.round(percentage)}%)`,
            target_roles: ['kasir', 'manager']
          });
        } else if (percentage === 0) {
          await createAlert({
            type: 'stock_out',
            severity: 'critical',
            outlet_id: outlet.id,
            title: 'Stok Habis',
            message: `Stok ${production.ukuran} sudah habis!`,
            target_roles: ['kasir', 'manager', 'bagian_dapur']
          });
        }
      }
    }
  }
}

async function checkWasteRateAlerts(tanggal: string) {
  const closings = await db.daily_closing.findMany({
    where: { tanggal },
    include: {
      outlet: true,
      daily_loss_summary: true
    }
  });
  
  for (const closing of closings) {
    const productions = await db.production_daily.findMany({
      where: {
        outlet_id: closing.outlet_id,
        tanggal
      }
    });
    
    const total_production = productions.reduce((sum, p) => sum + p.target_qty, 0);
    const total_waste = closing.daily_loss_summary?.total_waste_qty || 0;
    const waste_rate = (total_waste / total_production) * 100;
    
    if (waste_rate > 15) {
      await createAlert({
        type: 'waste_high',
        severity: 'warning',
        outlet_id: closing.outlet_id,
        title: 'Waste Rate Tinggi',
        message: `Waste rate hari ini ${waste_rate.toFixed(1)}%! Target: <15%`,
        target_roles: ['manager', 'owner']
      });
    }
  }
}
```

### Calculation Logic

#### 1. Success Rate & Waste Rate
```typescript
function calculateProductionRates(production: ProductionDaily) {
  const success_rate = (production.success_qty / production.target_qty) * 100;
  const waste_rate = (production.waste_qty / production.target_qty) * 100;
  
  return {
    success_rate: Math.round(success_rate * 10) / 10,  // 1 decimal
    waste_rate: Math.round(waste_rate * 10) / 10
  };
}
```

#### 2. Gross Profit & Margin
```typescript
function calculateFinancialMetrics(data: DashboardData) {
  const omzet = data.total_revenue;
  const hpp_sold = data.total_hpp_sold;
  const total_loss = data.total_loss;
  
  const gross_profit = omzet - hpp_sold - total_loss;
  const margin_percentage = (gross_profit / omzet) * 100;
  
  return {
    omzet,
    hpp_sold,
    total_loss,
    gross_profit,
    margin_percentage: Math.round(margin_percentage * 10) / 10
  };
}
```

#### 3. Loss Percentage by Category
```typescript
function calculateLossBreakdown(loss_summary: DailyLossSummary) {
  const total = loss_summary.total_loss;
  
  return {
    production_waste: {
      amount: loss_summary.production_waste_loss,
      percentage: (loss_summary.production_waste_loss / total) * 100
    },
    topping_errors: {
      amount: loss_summary.topping_error_loss,
      percentage: (loss_summary.topping_error_loss / total) * 100
    },
    non_topping_expired: {
      amount: loss_summary.non_topping_expired_loss,
      percentage: (loss_summary.non_topping_expired_loss / total) * 100
    },
    finished_product_reject: {
      amount: loss_summary.finished_product_reject_loss,
      percentage: (loss_summary.finished_product_reject_loss / total) * 100
    }
  };
}
```

### Error Handling Strategy

#### 1. Custom Error Classes
```typescript
// lib/errors.ts

export class BusinessLogicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessLogicError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
```

#### 2. Error Handler Middleware
```typescript
// lib/api/error-handler.ts

export function handleApiError(error: Error) {
  if (error instanceof ValidationError) {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: { field: error.field }
        }
      }
    };
  }
  
  if (error instanceof ConflictError) {
    return {
      status: 409,
      body: {
        success: false,
        error: {
          code: 'CONFLICT',
          message: error.message
        }
      }
    };
  }
  
  if (error instanceof BusinessLogicError) {
    return {
      status: 422,
      body: {
        success: false,
        error: {
          code: 'BUSINESS_LOGIC_ERROR',
          message: error.message
        }
      }
    };
  }
  
  // Default: Internal Server Error
  console.error('Unhandled error:', error);
  return {
    status: 500,
    body: {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server'
      }
    }
  };
}
```



---

## State Management Design

### State Management Strategy

The system uses a hybrid approach combining:
1. **Server State** - Data from database (React Query / SWR)
2. **Client State** - UI state (React useState/useReducer)
3. **Global State** - Shared state (React Context)
4. **URL State** - Filters and pagination (Next.js searchParams)

### State Categories

#### 1. Server State (React Query)

**Purpose:** Cache and synchronize server data

**Implementation:**
```typescript
// lib/hooks/useProduction.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useProductionList(filters: ProductionFilters) {
  return useQuery({
    queryKey: ['productions', filters],
    queryFn: () => fetchProductions(filters),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    cacheTime: 10 * 60 * 1000   // 10 minutes
  });
}

export function useCreateProduction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProduction,
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });
}

export function useStockValidation(outlet_id: string) {
  return useQuery({
    queryKey: ['stock-validation', outlet_id],
    queryFn: () => validateStock(outlet_id),
    refetchInterval: 30 * 1000,  // Refetch every 30 seconds
    refetchOnWindowFocus: true
  });
}
```

**Query Keys Structure:**
```typescript
// Query key patterns
const queryKeys = {
  productions: {
    all: ['productions'] as const,
    lists: () => [...queryKeys.productions.all, 'list'] as const,
    list: (filters: ProductionFilters) => 
      [...queryKeys.productions.lists(), filters] as const,
    details: () => [...queryKeys.productions.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.productions.details(), id] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    validation: (outlet_id: string) => 
      [...queryKeys.inventory.all, 'validation', outlet_id] as const,
    stock: (outlet_id: string, filters: StockFilters) => 
      [...queryKeys.inventory.all, 'stock', outlet_id, filters] as const,
  },
  closing: {
    all: ['closing'] as const,
    check: (outlet_id: string, tanggal: string) => 
      [...queryKeys.closing.all, 'check', outlet_id, tanggal] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    daily: (outlet_id: string, tanggal: string) => 
      [...queryKeys.dashboard.all, 'daily', outlet_id, tanggal] as const,
  },
  alerts: {
    all: ['alerts'] as const,
    list: (filters: AlertFilters) => 
      [...queryKeys.alerts.all, 'list', filters] as const,
  }
};
```

#### 2. Client State (Component State)

**Purpose:** Local UI state within components

**Examples:**

```typescript
// Form state
const [formData, setFormData] = useState<ProductionFormData>({
  outlet_id: '',
  tanggal: new Date().toISOString().split('T')[0],
  ukuran: 'standar',
  target_qty: 0,
  success_qty: 0,
  waste_details: []
});

// UI state
const [isModalOpen, setIsModalOpen] = useState(false);
const [activeTab, setActiveTab] = useState(0);
const [isSubmitting, setIsSubmitting] = useState(false);

// Validation errors
const [errors, setErrors] = useState<Record<string, string>>({});
```

**Form State Management with useReducer:**
```typescript
// For complex forms like Closing
type ClosingState = {
  non_topping_status: NonToppingStatus[];
  finished_products: FinishedProduct[];
  notes: string;
  activeTab: number;
};

type ClosingAction =
  | { type: 'UPDATE_NON_TOPPING'; index: number; data: Partial<NonToppingStatus> }
  | { type: 'ADD_FINISHED_PRODUCT'; product: FinishedProduct }
  | { type: 'REMOVE_FINISHED_PRODUCT'; index: number }
  | { type: 'UPDATE_NOTES'; notes: string }
  | { type: 'SET_ACTIVE_TAB'; tab: number };

function closingReducer(state: ClosingState, action: ClosingAction): ClosingState {
  switch (action.type) {
    case 'UPDATE_NON_TOPPING':
      return {
        ...state,
        non_topping_status: state.non_topping_status.map((item, i) =>
          i === action.index ? { ...item, ...action.data } : item
        )
      };
    case 'ADD_FINISHED_PRODUCT':
      return {
        ...state,
        finished_products: [...state.finished_products, action.product]
      };
    case 'REMOVE_FINISHED_PRODUCT':
      return {
        ...state,
        finished_products: state.finished_products.filter((_, i) => i !== action.index)
      };
    case 'UPDATE_NOTES':
      return { ...state, notes: action.notes };
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab };
    default:
      return state;
  }
}

// Usage in component
const [state, dispatch] = useReducer(closingReducer, initialState);
```

#### 3. Global State (React Context)

**Purpose:** Share state across components without prop drilling

**Alert Context:**
```typescript
// contexts/AlertContext.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type Alert = {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type AlertContextType = {
  alerts: Alert[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  refreshAlerts: () => Promise<void>;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    // Fetch alerts on mount
    fetchAlerts();
    
    // Poll for new alerts every 60 seconds
    const interval = setInterval(fetchAlerts, 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  const fetchAlerts = async () => {
    const response = await fetch('/api/alerts?status=unread&limit=10');
    const data = await response.json();
    
    if (data.success) {
      setAlerts(data.data.items);
      setUnreadCount(data.data.unread_count);
    }
  };
  
  const markAsRead = async (id: string) => {
    await fetch(`/api/alerts/${id}/read`, { method: 'PUT' });
    await fetchAlerts();
  };
  
  const refreshAlerts = async () => {
    await fetchAlerts();
  };
  
  return (
    <AlertContext.Provider value={{ alerts, unreadCount, markAsRead, refreshAlerts }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within AlertProvider');
  }
  return context;
}
```

**User Context:**
```typescript
// contexts/UserContext.tsx
'use client';

import { createContext, useContext } from 'react';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  outlet_id?: string;
};

type UserContextType = {
  user: User | null;
  isLoading: boolean;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ 
  children, 
  user 
}: { 
  children: React.ReactNode;
  user: User | null;
}) {
  return (
    <UserContext.Provider value={{ user, isLoading: false }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}
```

#### 4. URL State (Search Params)

**Purpose:** Store filters and pagination in URL for shareability

**Implementation:**
```typescript
// hooks/useFilters.ts
import { useSearchParams, useRouter } from 'next/navigation';

export function useFilters<T extends Record<string, any>>(defaultFilters: T) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Parse filters from URL
  const filters = Object.keys(defaultFilters).reduce((acc, key) => {
    const value = searchParams.get(key);
    acc[key] = value !== null ? value : defaultFilters[key];
    return acc;
  }, {} as T);
  
  // Update filters in URL
  const setFilters = (newFilters: Partial<T>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });
    
    router.push(`?${params.toString()}`);
  };
  
  return { filters, setFilters };
}

// Usage in component
function DashboardPage() {
  const { filters, setFilters } = useFilters({
    outlet_id: '',
    tanggal: new Date().toISOString().split('T')[0]
  });
  
  const handleOutletChange = (outlet_id: string) => {
    setFilters({ outlet_id });
  };
  
  const handleDateChange = (tanggal: string) => {
    setFilters({ tanggal });
  };
}
```

### Data Flow Patterns

#### 1. Server → Client (Initial Load)
```
Server Component (fetch data) 
  → Pass as props 
    → Client Component (display)
```

#### 2. Client → Server → Client (Mutation)
```
Client Component (user action)
  → API call (POST/PUT/DELETE)
    → Server processes
      → Response
        → Update cache (React Query)
          → Re-render components
```

#### 3. Real-time Updates (Polling)
```
Client Component (mount)
  → React Query (refetchInterval)
    → API call every X seconds
      → Update cache
        → Re-render if data changed
```

#### 4. Optimistic Updates
```
Client Component (user action)
  → Update cache immediately (optimistic)
    → Re-render with new data
      → API call in background
        → On success: keep optimistic update
        → On error: rollback to previous data
```

**Example:**
```typescript
export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => markAlertAsRead(id),
    
    // Optimistic update
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['alerts'] });
      
      // Snapshot previous value
      const previousAlerts = queryClient.getQueryData(['alerts']);
      
      // Optimistically update
      queryClient.setQueryData(['alerts'], (old: any) => ({
        ...old,
        items: old.items.map((alert: Alert) =>
          alert.id === id ? { ...alert, is_read: true } : alert
        ),
        unread_count: old.unread_count - 1
      }));
      
      return { previousAlerts };
    },
    
    // Rollback on error
    onError: (err, id, context) => {
      queryClient.setQueryData(['alerts'], context?.previousAlerts);
    },
    
    // Refetch on success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    }
  });
}
```

### Cache Strategy

#### 1. Cache Time Configuration

```typescript
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default cache times
      staleTime: 5 * 60 * 1000,      // 5 minutes
      cacheTime: 10 * 60 * 1000,     // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

// Custom cache times per query type
export const cacheConfig = {
  // Real-time data (short cache)
  stockValidation: {
    staleTime: 30 * 1000,           // 30 seconds
    refetchInterval: 30 * 1000,
  },
  
  // Frequently changing data
  inventory: {
    staleTime: 1 * 60 * 1000,       // 1 minute
    refetchInterval: 60 * 1000,
  },
  
  // Moderate changing data
  production: {
    staleTime: 5 * 60 * 1000,       // 5 minutes
  },
  
  // Rarely changing data
  outlets: {
    staleTime: 30 * 60 * 1000,      // 30 minutes
  },
  
  // Static data
  products: {
    staleTime: 60 * 60 * 1000,      // 1 hour
  },
};
```

#### 2. Cache Invalidation Rules

```typescript
// When to invalidate cache

// After production input
mutationFn: createProduction,
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['productions'] });
  queryClient.invalidateQueries({ queryKey: ['inventory'] });
  queryClient.invalidateQueries({ queryKey: ['stock-validation'] });
}

// After sale transaction
mutationFn: createOrder,
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['inventory'] });
  queryClient.invalidateQueries({ queryKey: ['stock-validation'] });
  queryClient.invalidateQueries({ queryKey: ['orders'] });
}

// After closing
mutationFn: createClosing,
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['closing'] });
  queryClient.invalidateQueries({ queryKey: ['inventory'] });
  queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  queryClient.invalidateQueries({ queryKey: ['loss-summary'] });
}
```

### State Persistence

#### 1. Local Storage (for UI preferences)
```typescript
// hooks/useLocalStorage.ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });
  
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };
  
  return [storedValue, setValue] as const;
}

// Usage: Save user preferences
const [preferences, setPreferences] = useLocalStorage('user-preferences', {
  defaultOutlet: '',
  theme: 'light',
  dashboardLayout: 'grid'
});
```

#### 2. Session Storage (for temporary data)
```typescript
// For form drafts
const [formDraft, setFormDraft] = useSessionStorage('production-form-draft', null);

// Auto-save form on change
useEffect(() => {
  if (formData) {
    setFormDraft(formData);
  }
}, [formData]);

// Restore on mount
useEffect(() => {
  if (formDraft) {
    setFormData(formDraft);
  }
}, []);
```

---

## Security & Authorization Design

### Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Login Page
    participant AUTH as Supabase Auth
    participant API as API Routes
    participant DB as Database

    U->>UI: Enter credentials
    UI->>AUTH: signInWithPassword()
    
    alt Valid Credentials
        AUTH-->>UI: Session + JWT token
        UI->>UI: Store session in cookie
        UI->>API: Request with JWT
        API->>AUTH: Verify JWT
        AUTH-->>API: User data + role
        API->>DB: Fetch user details
        DB-->>API: User + outlet info
        API-->>UI: Success + user data
        UI->>UI: Redirect to dashboard
    else Invalid Credentials
        AUTH-->>UI: Error
        UI-->>U: Show error message
    end
```

### Role-Based Access Control (RBAC)

#### 1. Role Definitions

```typescript
// types/roles.ts
export enum UserRole {
  ADMIN = 'admin',
  OWNER = 'owner',
  MANAGER = 'manager',
  BAGIAN_DAPUR = 'bagian_dapur',
  KASIR = 'kasir',
  CLOSING_STAFF = 'closing_staff'
}

export const rolePermissions = {
  [UserRole.ADMIN]: {
    production: ['create', 'read', 'update', 'delete'],
    inventory: ['read'],
    sales: ['read'],
    closing: ['create', 'read', 'update', 'delete'],
    dashboard: ['read'],
    reports: ['read', 'export'],
    alerts: ['read', 'manage'],
    users: ['create', 'read', 'update', 'delete']
  },
  [UserRole.OWNER]: {
    production: ['read'],
    inventory: ['read'],
    sales: ['read'],
    closing: ['read'],
    dashboard: ['read'],
    reports: ['read', 'export'],
    alerts: ['read']
  },
  [UserRole.MANAGER]: {
    production: ['read'],
    inventory: ['read'],
    sales: ['read'],
    closing: ['read', 'approve'],
    dashboard: ['read'],
    reports: ['read', 'export'],
    alerts: ['read']
  },
  [UserRole.BAGIAN_DAPUR]: {
    production: ['create', 'read', 'update'],
    inventory: ['read'],
    alerts: ['read']
  },
  [UserRole.KASIR]: {
    inventory: ['read'],
    sales: ['create', 'read'],
    topping_errors: ['create', 'read'],
    alerts: ['read']
  },
  [UserRole.CLOSING_STAFF]: {
    inventory: ['read'],
    closing: ['create', 'read'],
    alerts: ['read']
  }
};
```

#### 2. Authorization Middleware

```typescript
// lib/auth/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // Check authorization for protected routes
  const path = req.nextUrl.pathname;
  const userRole = session.user.user_metadata.role;
  
  if (!hasAccess(path, userRole)) {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }
  
  return res;
}

function hasAccess(path: string, role: UserRole): boolean {
  const routePermissions = {
    '/dashboard/input-produksi': [UserRole.BAGIAN_DAPUR, UserRole.ADMIN],
    '/dashboard/kasir': [UserRole.KASIR, UserRole.ADMIN],
    '/dashboard/closing-harian': [UserRole.CLOSING_STAFF, UserRole.MANAGER, UserRole.ADMIN],
    '/dashboard/dashboard-owner': [UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN],
    '/dashboard/laporan': [UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN]
  };
  
  const allowedRoles = routePermissions[path];
  return allowedRoles ? allowedRoles.includes(role) : true;
}

export const config = {
  matcher: ['/dashboard/:path*']
};
```

#### 3. API Route Protection

```typescript
// lib/auth/api-auth.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function requireAuth(requiredRoles?: UserRole[]) {
  const supabase = createRouteHandlerClient({ cookies });
  
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new UnauthorizedError('Not authenticated');
  }
  
  const userRole = session.user.user_metadata.role;
  
  if (requiredRoles && !requiredRoles.includes(userRole)) {
    throw new ForbiddenError('Insufficient permissions');
  }
  
  return {
    user: session.user,
    role: userRole,
    outlet_id: session.user.user_metadata.outlet_id
  };
}

// Usage in API route
export async function POST(request: Request) {
  try {
    const auth = await requireAuth([UserRole.BAGIAN_DAPUR, UserRole.ADMIN]);
    
    // Process request
    const body = await request.json();
    const result = await createProduction(body, auth.user.id);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

#### 4. Component-Level Authorization

```typescript
// components/auth/ProtectedComponent.tsx
'use client';

import { useUser } from '@/contexts/UserContext';
import { UserRole } from '@/types/roles';

type ProtectedComponentProps = {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function ProtectedComponent({ 
  allowedRoles, 
  children, 
  fallback = null 
}: ProtectedComponentProps) {
  const { user } = useUser();
  
  if (!user || !allowedRoles.includes(user.role as UserRole)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Usage
<ProtectedComponent allowedRoles={[UserRole.ADMIN, UserRole.OWNER]}>
  <DeleteButton />
</ProtectedComponent>
```

### Data Access Control

#### 1. Row-Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE production_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_non_topping ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closing ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see data from their outlet
CREATE POLICY "Users can view own outlet data"
ON production_daily
FOR SELECT
USING (
  outlet_id IN (
    SELECT outlet_id 
    FROM user_outlets 
    WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'owner')
  )
);

-- Policy: Only bagian_dapur can insert production
CREATE POLICY "Bagian dapur can insert production"
ON production_daily
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = auth.uid() 
    AND role IN ('bagian_dapur', 'admin')
    AND outlet_id = production_daily.outlet_id
  )
);
```

#### 2. API-Level Data Filtering

```typescript
// lib/data-access/production.ts
export async function getProductions(filters: ProductionFilters, auth: AuthContext) {
  let query = db.production_daily.findMany({
    where: {
      ...filters,
      // Filter by outlet based on role
      outlet_id: getOutletFilter(auth)
    }
  });
  
  return query;
}

function getOutletFilter(auth: AuthContext) {
  // Admin/Owner can see all outlets
  if ([UserRole.ADMIN, UserRole.OWNER].includes(auth.role)) {
    return undefined;  // No filter
  }
  
  // Manager can see managed outlets
  if (auth.role === UserRole.MANAGER) {
    return {
      in: auth.managed_outlet_ids
    };
  }
  
  // Others can only see their own outlet
  return auth.outlet_id;
}
```

### Security Best Practices

#### 1. Input Validation
- All inputs validated with Zod schemas
- SQL injection prevention via Prisma ORM
- XSS prevention via React's built-in escaping

#### 2. Authentication Security
- JWT tokens with expiration
- Secure HTTP-only cookies
- CSRF protection

#### 3. API Security
- Rate limiting per endpoint
- Request size limits
- CORS configuration

#### 4. Data Security
- Sensitive data encrypted at rest
- HTTPS only in production
- No sensitive data in logs



---

## Performance Considerations

### Database Performance

#### 1. Indexing Strategy

```sql
-- Primary indexes (already defined in schema)
CREATE INDEX idx_production_outlet_date ON production_daily(outlet_id, tanggal);
CREATE INDEX idx_production_date ON production_daily(tanggal DESC);
CREATE INDEX idx_inventory_outlet_date ON inventory_non_topping(outlet_id, production_date);
CREATE INDEX idx_closing_outlet_date ON daily_closing(outlet_id, tanggal);
CREATE INDEX idx_loss_summary_outlet_date ON daily_loss_summary(outlet_id, tanggal);

-- Composite indexes for common queries
CREATE INDEX idx_production_outlet_date_ukuran 
ON production_daily(outlet_id, tanggal, ukuran);

CREATE INDEX idx_inventory_outlet_ukuran_status 
ON inventory_non_topping(outlet_id, ukuran, status) 
WHERE qty_available > 0;

CREATE INDEX idx_topping_errors_outlet_date 
ON topping_errors(outlet_id, tanggal);

-- Partial indexes for active data
CREATE INDEX idx_inventory_fresh_only 
ON inventory_non_topping(outlet_id, ukuran, production_date) 
WHERE status = 'fresh' AND qty_available > 0;

-- Covering indexes for dashboard queries
CREATE INDEX idx_production_dashboard 
ON production_daily(outlet_id, tanggal) 
INCLUDE (target_qty, success_qty, waste_qty, total_hpp_loss);
```

#### 2. Query Optimization

**Avoid N+1 Queries:**
```typescript
// BAD: N+1 query
const productions = await db.production_daily.findMany();
for (const prod of productions) {
  const wasteDetails = await db.production_waste_details.findMany({
    where: { production_daily_id: prod.id }
  });
}

// GOOD: Single query with include
const productions = await db.production_daily.findMany({
  include: {
    waste_details: true,
    outlet: {
      select: { id: true, name: true }
    }
  }
});
```

**Use Aggregations in Database:**
```typescript
// BAD: Fetch all and calculate in JS
const productions = await db.production_daily.findMany();
const totalWaste = productions.reduce((sum, p) => sum + p.waste_qty, 0);

// GOOD: Aggregate in database
const result = await db.production_daily.aggregate({
  where: { outlet_id, tanggal },
  _sum: {
    waste_qty: true,
    total_hpp_loss: true
  }
});
```

**Pagination for Large Datasets:**
```typescript
// Cursor-based pagination for better performance
async function getProductionsPaginated(cursor?: string, limit = 20) {
  return await db.production_daily.findMany({
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { created_at: 'desc' }
  });
}
```

#### 3. Connection Pooling

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

// Connection pool configuration in DATABASE_URL
// postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
```

### Caching Strategy

#### 1. Server-Side Caching (Redis)

```typescript
// lib/cache/redis.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!
});

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300  // 5 minutes default
): Promise<T> {
  // Try to get from cache
  const cached = await redis.get<T>(key);
  if (cached) {
    return cached;
  }
  
  // Fetch fresh data
  const data = await fetcher();
  
  // Store in cache
  await redis.setex(key, ttl, data);
  
  return data;
}

// Usage in API route
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const outlet_id = searchParams.get('outlet_id');
  const tanggal = searchParams.get('tanggal');
  
  const cacheKey = `dashboard:${outlet_id}:${tanggal}`;
  
  const data = await getCached(
    cacheKey,
    () => getDashboardData(outlet_id, tanggal),
    300  // Cache for 5 minutes
  );
  
  return NextResponse.json({ success: true, data });
}
```

**Cache Invalidation:**
```typescript
// Invalidate cache after mutations
export async function createProduction(data: ProductionData) {
  const result = await db.production_daily.create({ data });
  
  // Invalidate related caches
  await redis.del(`dashboard:${data.outlet_id}:${data.tanggal}`);
  await redis.del(`inventory:${data.outlet_id}`);
  await redis.del(`stock-validation:${data.outlet_id}:${data.tanggal}`);
  
  return result;
}
```

#### 2. Client-Side Caching (React Query)

Already covered in State Management section. Key points:
- Stale time: 5 minutes for most queries
- Cache time: 10 minutes
- Automatic refetch on window focus (disabled for most)
- Optimistic updates for better UX

#### 3. Next.js Caching

**Static Generation for Public Pages:**
```typescript
// app/page.tsx (Landing page)
export const revalidate = 3600;  // Revalidate every hour

export default async function HomePage() {
  // This page is statically generated
  return <LandingPage />;
}
```

**Dynamic with Caching for Dashboard:**
```typescript
// app/dashboard/dashboard-owner/page.tsx
import { unstable_cache } from 'next/cache';

const getCachedDashboardData = unstable_cache(
  async (outlet_id: string, tanggal: string) => {
    return await getDashboardData(outlet_id, tanggal);
  },
  ['dashboard-data'],
  {
    revalidate: 300,  // 5 minutes
    tags: ['dashboard']
  }
);

export default async function DashboardPage({ searchParams }) {
  const data = await getCachedDashboardData(
    searchParams.outlet_id,
    searchParams.tanggal
  );
  
  return <DashboardView data={data} />;
}
```

### Frontend Performance

#### 1. Code Splitting

```typescript
// Lazy load heavy components
import dynamic from 'next/dynamic';

const LossBreakdownChart = dynamic(
  () => import('@/components/dashboard/LossBreakdownChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false  // Don't render on server
  }
);

const ReportExportModal = dynamic(
  () => import('@/components/reports/ExportModal'),
  { ssr: false }
);
```

#### 2. Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  priority  // For above-the-fold images
/>

// For dynamic images
<Image
  src={product.image_url}
  alt={product.name}
  width={100}
  height={100}
  loading="lazy"
/>
```

#### 3. Bundle Size Optimization

```javascript
// next.config.js
module.exports = {
  // Enable SWC minification
  swcMinify: true,
  
  // Analyze bundle size
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20
          },
          // Common chunk
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true
          }
        }
      };
    }
    return config;
  }
};
```

#### 4. Virtualization for Long Lists

```typescript
// For long lists (e.g., production history)
import { useVirtualizer } from '@tanstack/react-virtual';

function ProductionHistoryList({ items }: { items: Production[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,  // Estimated row height
    overscan: 5
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <ProductionRow item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### API Performance

#### 1. Response Compression

```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export function middleware(request: Request) {
  const response = NextResponse.next();
  
  // Enable compression for API responses
  response.headers.set('Content-Encoding', 'gzip');
  
  return response;
}
```

#### 2. Parallel Data Fetching

```typescript
// Fetch multiple data sources in parallel
async function getDashboardData(outlet_id: string, tanggal: string) {
  const [
    financial,
    production,
    sales,
    loss
  ] = await Promise.all([
    getFinancialSummary(outlet_id, tanggal),
    getProductionData(outlet_id, tanggal),
    getSalesData(outlet_id, tanggal),
    getLossBreakdown(outlet_id, tanggal)
  ]);
  
  return { financial, production, sales, loss };
}
```

#### 3. Streaming Responses (for large exports)

```typescript
// For Excel/PDF export
export async function POST(request: Request) {
  const body = await request.json();
  
  // Create readable stream
  const stream = new ReadableStream({
    async start(controller) {
      const data = await generateReport(body);
      const chunks = splitIntoChunks(data);
      
      for (const chunk of chunks) {
        controller.enqueue(chunk);
      }
      
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="report.xlsx"'
    }
  });
}
```

### Monitoring & Optimization

#### 1. Performance Monitoring

```typescript
// lib/monitoring/performance.ts
export function measurePerformance(name: string, fn: () => Promise<any>) {
  return async (...args: any[]) => {
    const start = performance.now();
    
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow operation: ${name} took ${duration}ms`);
      }
      
      // Send to monitoring service (e.g., Vercel Analytics)
      if (typeof window !== 'undefined') {
        window.performance.measure(name, { start, duration });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`Failed operation: ${name} took ${duration}ms`, error);
      throw error;
    }
  };
}

// Usage
const getDashboardData = measurePerformance(
  'getDashboardData',
  async (outlet_id, tanggal) => {
    // ... fetch data
  }
);
```

#### 2. Database Query Logging

```typescript
// Prisma middleware for query logging
db.$use(async (params, next) => {
  const before = Date.now();
  const result = await next(params);
  const after = Date.now();
  
  const duration = after - before;
  
  // Log slow queries
  if (duration > 1000) {
    console.warn(`Slow query: ${params.model}.${params.action} took ${duration}ms`);
  }
  
  return result;
});
```

#### 3. Core Web Vitals Optimization

**Largest Contentful Paint (LCP):**
- Optimize images with Next.js Image
- Use priority loading for above-the-fold content
- Minimize render-blocking resources

**First Input Delay (FID):**
- Code splitting to reduce JS bundle size
- Defer non-critical JavaScript
- Use web workers for heavy computations

**Cumulative Layout Shift (CLS):**
- Set explicit dimensions for images and embeds
- Avoid inserting content above existing content
- Use CSS transforms instead of layout-triggering properties

### Scalability Considerations

#### 1. Horizontal Scaling
- Stateless API routes (no server-side sessions)
- Database connection pooling
- Redis for distributed caching
- CDN for static assets

#### 2. Database Scaling
- Read replicas for reporting queries
- Partitioning by outlet_id for large datasets
- Archive old data (> 1 year) to separate tables

#### 3. Load Testing
```bash
# Use k6 for load testing
k6 run --vus 100 --duration 30s load-test.js

# Test critical endpoints
# - POST /api/production/daily
# - GET /api/inventory/validate
# - POST /api/orders
# - GET /api/dashboard/daily
```

---

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────┐
│                     Vercel Edge Network                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │   Region   │  │   Region   │  │   Region   │       │
│  │   US-East  │  │   EU-West  │  │  Asia-SE   │       │
│  └────────────┘  └────────────┘  └────────────┘       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js Application (Vercel)                │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Server Components  │  API Routes  │  Middleware  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
           │                    │                │
           ▼                    ▼                ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Supabase        │  │  Upstash Redis   │  │  Vercel Blob     │
│  (PostgreSQL)    │  │  (Caching)       │  │  (File Storage)  │
│  - Production DB │  │  - Session cache │  │  - Exports       │
│  - Auth          │  │  - Query cache   │  │  - Uploads       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Environment Variables

```bash
# .env.production
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
REDIS_URL="https://..."
REDIS_TOKEN="..."
BLOB_READ_WRITE_TOKEN="..."
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Summary

This design document provides a comprehensive blueprint for implementing the Production Tracking System with:

1. **Robust Database Schema** - 9 tables with proper constraints, indexes, and triggers
2. **RESTful API Design** - 20+ endpoints with clear request/response formats
3. **Component Architecture** - Server and client components with clear separation
4. **Business Logic** - Detailed flows for all core processes
5. **State Management** - Hybrid approach with React Query, Context, and URL state
6. **Security** - RBAC with role-based permissions and RLS policies
7. **Performance** - Caching, indexing, and optimization strategies
8. **Scalability** - Horizontal scaling with stateless architecture

**Next Steps:**
1. Review and approve this design
2. Create implementation tasks based on this design
3. Begin development starting with database schema
4. Implement features incrementally following the task list

---

**Document Version:** 1.0  
**Last Updated:** 2026-05-02  
**Status:** ✅ Complete - Ready for Implementation  
**Next Phase:** Create Tasks Document

