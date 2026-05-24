# 🔧 TECHNICAL SPECIFICATION: Expense Management Employee Module

**Project**: Donattour System  
**Module**: Pengeluaran Outlet (Employee-Focused)  
**Version**: 2.0.0  
**Date**: 2026-05-20  
**Status**: Ready for Development

---

## 📋 TABLE OF CONTENTS

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [API Specifications](#api-specifications)
4. [Component Structure](#component-structure)
5. [State Management](#state-management)
6. [Business Logic](#business-logic)
7. [Security](#security)
8. [Performance](#performance)

---

## 🏗️ ARCHITECTURE OVERVIEW

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser/PWA)                  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Outlet     │  │   Expense    │  │   Closing    │ │
│  │   Selector   │→ │   Dashboard  │→ │  Integration │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────┤
│                    State Management                      │
│              (Zustand + React Query)                     │
├─────────────────────────────────────────────────────────┤
│                    API Layer (Next.js)                   │
│  /api/expenses  /api/expenses/budget  /api/expenses/audit│
├─────────────────────────────────────────────────────────┤
│                    Caching Layer (Redis)                 │
├─────────────────────────────────────────────────────────┤
│                    Database (Supabase)                   │
│  expenses | expense_audit_logs | outlet_expense_budgets │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Component → State Update → API Call → Database
     ↓                                        ↓
  UI Update ← State Update ← Response ← Query Result
```

---

## 🗄️ DATABASE SCHEMA

### Enhanced Expenses Table


```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  tanggal DATE NOT NULL,
  kategori VARCHAR(50) NOT NULL,
  keterangan TEXT NOT NULL,
  jumlah NUMERIC(15,2) NOT NULL,
  bukti_url TEXT,
  
  -- Status & Approval
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Closing Integration
  is_included_in_closing BOOLEAN DEFAULT false,
  closing_id UUID,
  
  -- Audit Trail
  device_info JSONB,
  ip_address INET,
  
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Audit Log Table

```sql
CREATE TABLE expense_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id),
  action VARCHAR(20) NOT NULL,
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  device_info JSONB,
  reason TEXT
);
```

### Budget Table

```sql
CREATE TABLE outlet_expense_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES outlets(id),
  kategori VARCHAR(50) NOT NULL,
  budget_harian NUMERIC(15,2),
  budget_bulanan NUMERIC(15,2),
  alert_threshold_percent INTEGER DEFAULT 80,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(outlet_id, kategori)
);
```

---

## 🔌 API SPECIFICATIONS

### 1. GET /api/expenses

**Purpose**: Fetch expenses with filters

**Query Parameters**:
```typescript
{
  outlet_id: string;          // Required
  tanggal?: string;           // YYYY-MM-DD
  start_date?: string;
  end_date?: string;
  kategori?: ExpenseCategory;
  status?: 'pending' | 'approved' | 'rejected';
  limit?: number;             // Default: 20
  offset?: number;            // Default: 0
  summary?: 'category' | 'daily' | 'period';
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    expenses: ExpenseWithDetails[],
    summary?: ExpenseSummary
  },
  meta: {
    total: number,
    limit: number,
    offset: number
  }
}
```

