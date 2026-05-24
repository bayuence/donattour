# 🚀 DEVELOPER QUICK REFERENCE: Expense Module

**Quick access guide untuk development**

---

## 📁 FILE STRUCTURE

```
donattourSYSTEM/
├── app/
│   └── (dashboard)/
│       └── dashboard/
│           └── pengeluaran-outlet/
│               └── page.tsx                    # Main page
│
├── components/
│   └── expenses/
│       ├── OutletSelector.tsx                  # NEW: Outlet picker
│       ├── ExpenseDashboardEmployee.tsx        # NEW: Main dashboard
│       ├── ExpenseFormSmart.tsx                # NEW: Smart form
│       ├── ExpenseTimeline.tsx                 # NEW: Timeline view
│       ├── BudgetStatusBar.tsx                 # NEW: Budget indicator
│       ├── ExpenseManagementAdvanced.tsx       # OLD: To be replaced
│       ├── ExpenseChart.tsx                    # Keep: Analytics
│       └── AdvancedFilters.tsx                 # Keep: Filters
│
├── lib/
│   ├── types/
│   │   └── expenses.ts                         # Type definitions
│   ├── services/
│   │   ├── expense-service.ts                  # NEW: Business logic
│   │   └── budget-service.ts                   # NEW: Budget logic
│   └── hooks/
│       ├── useExpenses.ts                      # NEW: React Query hook
│       └── useBudget.ts                        # NEW: Budget hook
│
├── app/api/
│   └── expenses/
│       ├── route.ts                            # GET, POST
│       ├── [id]/
│       │   └── route.ts                        # GET, PUT, DELETE
│       ├── budget/
│       │   └── route.ts                        # NEW: Budget API
│       └── audit/
│           └── route.ts                        # NEW: Audit API
│
└── QueryDATABASE/
    └── 11-schema-expenses-v2.sql               # NEW: Enhanced schema
```

---

## 🗄️ DATABASE QUICK REFERENCE

### Main Tables

```sql
-- expenses (enhanced)
id, outlet_id, tanggal, kategori, keterangan, jumlah, bukti_url,
status, approved_by, approved_at, rejection_reason,
is_included_in_closing, closing_id,
device_info, ip_address,
created_by, created_at, updated_at

-- expense_audit_logs (new)
id, expense_id, action, performed_by, performed_at,
old_value, new_value, ip_address, device_info, reason

-- outlet_expense_budgets (new)
id, outlet_id, kategori, budget_harian, budget_bulanan,
alert_threshold_percent, is_active, created_at, updated_at
```

### Common Queries

```sql
-- Get today's expenses
SELECT * FROM expenses 
WHERE outlet_id = $1 AND tanggal = CURRENT_DATE
ORDER BY created_at DESC;

-- Get budget status
SELECT 
  b.kategori,
  b.budget_harian,
  COALESCE(SUM(e.jumlah), 0) as used_today
FROM outlet_expense_budgets b
LEFT JOIN expenses e ON b.outlet_id = e.outlet_id 
  AND b.kategori = e.kategori 
  AND e.tanggal = CURRENT_DATE
WHERE b.outlet_id = $1 AND b.is_active = true
GROUP BY b.kategori, b.budget_harian;

-- Insert with audit
INSERT INTO expenses (...) VALUES (...) RETURNING *;
INSERT INTO expense_audit_logs (expense_id, action, ...) VALUES (...);
```

---

## 🔌 API QUICK REFERENCE

### Endpoints

```typescript
// GET /api/expenses
// Query: outlet_id, tanggal, start_date, end_date, kategori, status, limit, offset
Response: { success, data: { expenses, summary }, meta }

// POST /api/expenses
Body: { outlet_id, tanggal, kategori, keterangan, jumlah, bukti_url, device_info }
Response: { success, data: expense }

// PUT /api/expenses/[id]
Body: { kategori?, keterangan?, jumlah?, bukti_url? }
Response: { success, data: expense }

// DELETE /api/expenses/[id]
Response: { success, message }

// GET /api/expenses/budget?outlet_id=xxx
Response: { success, data: BudgetStatus[] }

// GET /api/expenses/audit?expense_id=xxx
Response: { success, data: ExpenseAuditLog[] }
```

### Example Usage

```typescript
// Fetch expenses
const response = await fetch(
  `/api/expenses?outlet_id=${outletId}&tanggal=${date}`
);
const { data } = await response.json();

// Create expense
const response = await fetch('/api/expenses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    outlet_id: outletId,
    tanggal: date,
    kategori: 'bahan_baku',
    keterangan: 'Tepung 25kg',
    jumlah: 175000,
    device_info: { userAgent, platform }
  })
});
```

---

## 🎨 COMPONENT QUICK REFERENCE

### OutletSelector

```tsx
<OutletSelector
  onSelect={(outlet) => setSelectedOutlet(outlet)}
  recentOutlets={recentOutlets}
  favoriteOutlets={favoriteOutlets}
/>
```

### ExpenseDashboardEmployee

```tsx
<ExpenseDashboardEmployee
  outletId={outletId}
  onOutletChange={() => setSelectedOutlet(null)}
/>
```

### ExpenseFormSmart

```tsx
<ExpenseFormSmart
  outletId={outletId}
  onSubmit={handleSubmit}
  onCancel={() => setShowForm(false)}
  initialValues={draft}
/>
```

### BudgetStatusBar

```tsx
<BudgetStatusBar
  budget={1000000}
  used={650000}
  threshold={80}
/>
```

---

## 🪝 HOOKS QUICK REFERENCE

### useExpenses

```typescript
const {
  expenses,
  summary,
  isLoading,
  error,
  refetch,
  createExpense,
  updateExpense,
  deleteExpense
} = useExpenses({
  outletId,
  tanggal,
  kategori
});
```

### useBudget

```typescript
const {
  budgets,
  isLoading,
  checkBudget,
  getBudgetStatus
} = useBudget(outletId);

const status = getBudgetStatus('bahan_baku');
// { budget, used, remaining, percentage, alertLevel }
```

---

## 🎯 TYPES QUICK REFERENCE

```typescript
// Core types
type ExpenseCategory = 
  | 'operasional' | 'bahan_baku' | 'gaji' 
  | 'transportasi' | 'perawatan' | 'marketing' | 'lainnya';

type ExpenseStatus = 'draft' | 'pending' | 'approved' | 'rejected';

interface Expense {
  id: string;
  outlet_id: string;
  tanggal: string;
  kategori: ExpenseCategory;
  keterangan: string;
  jumlah: number;
  bukti_url?: string;
  status: ExpenseStatus;
  // ... more fields
}

interface BudgetStatus {
  kategori: ExpenseCategory;
  budget_harian?: number;
  used_today: number;
  remaining?: number;
  percentage_used?: number;
  alert_level: 'safe' | 'warning' | 'danger';
}
```

---

## 🎨 STYLING QUICK REFERENCE

### Category Colors

```typescript
const KATEGORI_CONFIG = {
  operasional: { emoji: '⚙️', color: 'blue' },
  bahan_baku: { emoji: '🧂', color: 'amber' },
  gaji: { emoji: '👤', color: 'green' },
  transportasi: { emoji: '🚗', color: 'purple' },
  perawatan: { emoji: '🔧', color: 'orange' },
  marketing: { emoji: '📢', color: 'pink' },
  lainnya: { emoji: '📌', color: 'gray' }
};
```

### Common Classes

```tsx
// Cards
className="bg-white rounded-xl shadow-sm border p-6"

// Buttons
className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"

// Inputs
className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"

// Budget bar
className="w-full bg-gray-200 rounded-full h-2"
```

---

## 🧪 TESTING QUICK REFERENCE

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react';
import ExpenseFormSmart from './ExpenseFormSmart';

test('renders form with all fields', () => {
  render(<ExpenseFormSmart outletId="123" />);
  expect(screen.getByLabelText(/keterangan/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/jumlah/i)).toBeInTheDocument();
});
```

### API Test Example

```typescript
import { POST } from './route';

test('creates expense successfully', async () => {
  const request = new Request('http://localhost/api/expenses', {
    method: 'POST',
    body: JSON.stringify({
      outlet_id: '123',
      tanggal: '2026-05-20',
      kategori: 'bahan_baku',
      keterangan: 'Test',
      jumlah: 100000
    })
  });
  
  const response = await POST(request);
  const data = await response.json();
  
  expect(data.success).toBe(true);
  expect(data.data.jumlah).toBe(100000);
});
```

---

## 🐛 DEBUGGING TIPS

### Common Issues

```typescript
// 1. Hydration error
// Fix: Use useEffect for client-side only code
useEffect(() => {
  setSelectedDate(getTodayWIB());
}, []);

// 2. Budget not updating
// Fix: Invalidate React Query cache
queryClient.invalidateQueries(['budget', outletId]);

// 3. Form not submitting
// Fix: Check validation and error state
console.log('Form errors:', errors);
console.log('Form values:', values);

// 4. API returning 401
// Fix: Check auth token
const token = await getToken();
console.log('Token:', token);
```

### Useful Console Commands

```javascript
// Check current user
console.log(user);

// Check selected outlet
console.log(selectedOutlet);

// Check budget status
console.log(budgetStatus);

// Force refetch
refetch();
```

---

## 📦 DEPLOYMENT CHECKLIST

```bash
# 1. Run tests
npm run test

# 2. Type check
npm run type-check

# 3. Lint
npm run lint

# 4. Build
npm run build

# 5. Database migration
npm run db:migrate

# 6. Deploy
vercel --prod

# 7. Verify
curl https://your-domain.com/api/expenses/health
```

---

## 🔗 USEFUL LINKS

- **Figma**: [Design Link]
- **Jira**: EXPENSE-XXX
- **Slack**: #donattour-expense
- **Docs**: confluence.donattour.com/expense
- **API Docs**: your-domain.com/api-docs

---

## 💡 PRO TIPS

1. **Use React Query** for all API calls (auto caching)
2. **Debounce search** (300ms) untuk performance
3. **Optimistic updates** untuk better UX
4. **Error boundaries** untuk graceful errors
5. **Lazy load** components untuk faster initial load
6. **Use TypeScript** strictly (no `any`)
7. **Test on mobile** first (mobile-first approach)
8. **Monitor performance** dengan Lighthouse

---

**Last Updated**: 2026-05-20  
**Version**: 1.0

