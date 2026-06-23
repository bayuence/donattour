# Donat Stock Sync Fix - Bugfix Design

## Overview

This bugfix addresses critical real-time synchronization issues in the donat non-topping stock management system when online. The system has seven distinct bug manifestations across three menus (Input Produksi, Riwayat Produksi, and POS/Kasir), all stemming from race conditions, missing idempotency checks, and incomplete transaction management.

**Root Problem**: The system attempts to sync production to inventory using `syncInventoryAfterProduction`, but lacks proper idempotency mechanisms, leading to UNIQUE_CONSTRAINT_VIOLATION errors. Additionally, transaction state management is incomplete—stock deduction happens before receipts are printed, and stock restoration is missing when transactions are deleted.

**Fix Strategy**: 
1. Implement idempotency check using `inventory_sync_log` table (already exists but not fully utilized)
2. Add distributed lock mechanism to prevent concurrent production inputs
3. Implement real-time Supabase subscriptions for Input Produksi ↔ Riwayat Produksi sync
4. Move stock deduction to happen only AFTER receipt printing (order status = 'completed')
5. Add stock restoration logic when transactions are deleted
6. Add clear success/failure notifications for all operations

## Glossary

- **Bug_Condition (C)**: The condition that triggers synchronization bugs - online system attempting to process donat production/sales without proper idempotency and transaction management
- **Property (P)**: The desired behavior - all stock operations are idempotent, atomic, and provide clear feedback
- **Preservation**: Offline mode functionality and Non-Donat product handling must remain unchanged
- **syncInventoryAfterProduction**: Function in `/app/api/production/daily/route.ts` (line 45-105) that syncs production data to inventory_non_topping
- **inventory_sync_log**: Database table tracking which production_daily records have been synced to inventory (prevents double-sync)
- **production_daily**: Database table storing daily production records per outlet/date/size
- **inventory_non_topping**: Real-time inventory table for donat non-topping stock (used by kasir)
- **UNIQUE_CONSTRAINT_VIOLATION**: PostgreSQL error (code 23505) when attempting duplicate insert on unique constraint
- **Idempotency**: Property where operation can be applied multiple times without changing result beyond first application
- **FIFO**: First In First Out - inventory consumption strategy (oldest batch sold first)


## Bug Details

### Bug Condition

The bug manifests when the system is online and attempts to process donat non-topping stock operations. The `syncInventoryAfterProduction` function in `/app/api/production/daily/route.ts` (lines 45-105) performs an INSERT into `inventory_non_topping` but lacks proper distributed locking and complete idempotency checks.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type StockSyncEvent = {
    eventType: 'input_production' | 'edit_riwayat' | 'delete_riwayat' | 
               'sale_transaction' | 'delete_transaction',
    isOnline: boolean,
    donutType: 'donat' | 'non-donat',
    outletId: string,
    receiptPrinted: boolean,
    hasError: boolean,
    errorMessage: string
  }
  OUTPUT: boolean
  
  RETURN input.isOnline = TRUE 
         AND input.donutType = 'donat'
         AND (
           // Bug 1: UNIQUE_CONSTRAINT_VIOLATION
           (input.eventType = 'input_production' 
            AND input.hasError = TRUE 
            AND input.errorMessage CONTAINS 'UNIQUE_CONSTRAINT_VIOLATION')
           
           // Bug 2: No notification
           OR (input.eventType = 'input_production' 
               AND input.successNotificationShown = FALSE)
           
           // Bug 3: No lock mechanism (concurrent inputs allowed)
           OR (input.eventType = 'input_production' 
               AND input.concurrentInputsBlocked = FALSE)
           
           // Bug 4: Not real-time synced
           OR (input.eventType = 'input_production' 
               AND input.riwayatSyncDelayMs > 2000)
           
           // Bug 5: Edit/Delete not working
           OR (input.eventType IN ('edit_riwayat', 'delete_riwayat') 
               AND input.hasError = TRUE)
           
           // Bug 6: Stock deducted before receipt
           OR (input.eventType = 'sale_transaction' 
               AND input.receiptPrinted = FALSE 
               AND input.stockDeducted = TRUE)
           
           // Bug 7: Stock not restored on delete
           OR (input.eventType = 'delete_transaction' 
               AND input.stockRestored = FALSE)
         )
END FUNCTION
```

### Examples

**Example 1: UNIQUE_CONSTRAINT_VIOLATION**
```
Input:
- Event: input_production
- Outlet: Toko Pusat (ID: abc-123)
- User: Kasir A submits 100 donat standar
- Status: Online
- Action: Clicks "Submit" button

Current Behavior (Buggy):
1. API receives POST /api/production/daily
2. Inserts into production_daily (success)
3. Calls syncInventoryAfterProduction()
4. inventory_sync_log check passes (first time)
5. Inserts into inventory_non_topping (success)
6. User sees long loading (5 seconds)
7. Console shows error: UNIQUE_CONSTRAINT_VIOLATION (line 291)
8. No success notification displayed
9. User confused, clicks Submit again → error repeats

Root Cause: Line 291 returns 409 status when detecting duplicate constraint, 
but this fires AFTER the data is already inserted successfully. The error 
handler catches a phantom error from subsequent operations.

Expected Behavior (Fixed):
1. API receives POST /api/production/daily  
2. Acquires distributed lock for outlet_id + tanggal + ukuran
3. Checks inventory_sync_log (idempotency)
4. Inserts production_daily + inventory_non_topping atomically
5. Releases lock
6. Returns success in <2 seconds
7. Toast notification: "✓ Berhasil disimpan: 100 donat standar"
8. Data appears in Riwayat Produksi immediately via realtime subscription
```


**Example 2: Stock Deducted Before Receipt Printed**
```
Input:
- Stok awal: 100 donat standar
- Kasir: Adds 20 donat standar to cart in POS
- Action: Clicks "Bayar" → enters payment → clicks "Proses Bayar"

Current Behavior (Buggy):
1. handleProsesBayar() called
2. Order inserted with status='pending'
3. Stock deducted: inventory_non_topping.qty_available -= 20 (now 80)
4. Bluetooth printer fails / user cancels
5. Order remains in 'pending' state
6. Stock: 80 (INCORRECT - should still be 100 since receipt not printed)

Root Cause: Stock deduction happens in the order creation API call, 
not after receipt confirmation. See kasir/page.tsx line ~70-80.

Expected Behavior (Fixed):
1. handleProsesBayar() called
2. Order inserted with status='pending'
3. Stock NOT deducted yet (qty_available stays 100)
4. Receipt printed successfully
5. Order status updated to 'completed'
6. Stock deducted ONLY NOW: qty_available -= 20 (now 80)
7. If receipt fails, order stays 'pending' and stock unchanged
```

**Example 3: Stock Not Restored When Transaction Deleted**
```
Input:
- Stok awal: 100 donat standar
- Transaksi completed: 20 donat standar sold (stock now 80)
- Pembeli: Cancels order / returns product
- Admin: Deletes transaction in Menu Transaksi

Current Behavior (Buggy):
1. Admin clicks "Hapus" on transaction
2. Order deleted from orders table
3. order_items deleted (cascade)
4. Stock remains: 80 (INCORRECT - should be 100)
5. 20 donat "lost" from inventory

Root Cause: No stock restoration logic in transaction delete handler.
See transaksi/page.tsx - no stock restoration API call.

Expected Behavior (Fixed):
1. Admin clicks "Hapus" on transaction
2. API checks order.status = 'completed' (stock was deducted)
3. Reads order_items to calculate stock restoration amount
4. Restores stock: inventory_non_topping.qty_available += 20 (now 100)
5. Deletes order + order_items
6. Toast notification: "✓ Transaksi dihapus, stok dikembalikan: +20 donat standar"
```

**Example 4: Edit/Delete in Riwayat Produksi Not Working**
```
Input:
- Kasir salah input: 100 donat standar (should be 150)
- Menu: Riwayat Produksi
- Action: Click "Edit" → Change qty to 150 → Save

Current Behavior (Buggy):
1. Edit modal opens (if UI exists)
2. User changes success_qty: 100 → 150
3. Clicks "Simpan"
4. No API call OR API call fails silently
5. Data unchanged in database
6. No error notification shown

Root Cause: Edit/Delete functionality not implemented in Riwayat Produksi component.
No useUpdateProduction / useDeleteProduction hook usage found.

Expected Behavior (Fixed):
1. Edit modal opens with current data
2. User changes success_qty: 100 → 150
3. Clicks "Simpan"
4. API PUT /api/production/daily/{id} called
5. production_daily.success_qty updated: 150
6. inventory_non_topping adjusted: qty_available += 50
7. Real-time sync updates both Input Produksi and Riwayat Produksi
8. Toast notification: "✓ Data berhasil diupdate"
```


## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Offline mode functionality must continue to work exactly as before (already correct)
- Non-Donat product transactions must not be affected by any changes
- Stock header badge in POS/Kasir must continue showing accurate real-time counts
- HPP calculation formula (HPP = Harga Donat Polos + Harga Toping) must remain unchanged
- Multi-outlet support with independent stock per outlet must be preserved
- Channel pricing (Toko, GoFood, GrabFood, Shopee, TikTok) must work identically

**Scope:**
All inputs that do NOT involve online donat non-topping stock operations should be completely unaffected by this fix. This includes:
- Offline mode operations (already working correctly)
- Non-Donat product sales and inventory management
- Transaction history viewing (read-only operations)
- Reporting and analytics functions
- User authentication and authorization
- Outlet management and configuration

## Hypothesized Root Cause

Based on the bug analysis and code inspection, the root causes are:

### 1. **Incomplete Idempotency in syncInventoryAfterProduction**
**Location**: `/app/api/production/daily/route.ts` lines 54-66

**Problem**: The function checks `inventory_sync_log` for duplicate sync prevention (lines 54-66), but the check has a race condition. If two requests arrive simultaneously:
- Both pass the `syncLog` check (neither sees the other's log yet)
- Both attempt INSERT into `inventory_non_topping`
- Second request hits UNIQUE constraint (if exists on outlet_id + production_date + ukuran)
- Error propagates to user even though first request succeeded

**Evidence**: Line 291 error handler catches `23505` (unique violation) but returns 409 status, confusing the user since data was already inserted successfully.


### 2. **No Distributed Lock Mechanism During Production Input**
**Location**: `/app/api/production/daily/route.ts` POST handler (line 127+)

**Problem**: When multiple kasir submit production at the same outlet simultaneously, no lock prevents concurrent processing. This leads to:
- Race conditions in inventory_sync_log checks
- Multiple INSERTs attempted for same batch
- Unpredictable stock counts

**Missing**: Advisory lock acquisition at request start, release at request end.

**Solution Needed**: Use PostgreSQL advisory locks or Redis-based distributed locks scoped to `{outlet_id}:{tanggal}:{ukuran}`.

### 3. **Missing Real-time Subscription Between Input Produksi and Riwayat Produksi**
**Location**: Riwayat Produksi component (needs investigation)

**Problem**: Input Produksi uses React Query mutations (useCreateProduction hook), which only invalidates cache locally. Riwayat Produksi doesn't subscribe to `production_daily` table changes via Supabase Realtime.

**Evidence**: Kasir POS has realtime subscription (kasir/page.tsx line 280-320 for `inventory_non_topping`), but production menus lack similar subscriptions.

**Missing**: Supabase channel subscription to `postgres_changes` on `production_daily` table, filtered by outlet_id.

### 4. **Stock Deduction Timing Error in Order Flow**
**Location**: Order creation API (needs investigation of `/api/orders` route)

**Problem**: Current flow deducts stock when order is created with status='pending', but should only deduct when status='completed' (after receipt printed).

**Current Flow**:
```
1. Create order (status='pending')
2. Deduct stock immediately ❌
3. Print receipt (may fail)
4. Update status='completed'
```

**Correct Flow**:
```
1. Create order (status='pending')
2. Print receipt
3. Update status='completed'
4. Deduct stock (atomic with status update) ✓
```


### 5. **Missing Stock Restoration Logic in Transaction Deletion**
**Location**: Transaction delete handler (needs investigation of `/api/orders/[id]` DELETE route)

**Problem**: When deleting a completed transaction, the system removes the order record but doesn't restore the stock that was deducted.

**Missing Logic**:
```typescript
// Before deleting order
if (order.status === 'completed') {
  // Read order_items to get quantities
  // Restore stock: inventory_non_topping.qty_available += item.quantity
  // For each donat item
}
// Then delete order
```

**Data Needed**: 
- order.status to check if stock was deducted
- order_items to calculate restoration amounts per ukuran
- product metadata to identify donat vs non-donat items

### 6. **Edit/Delete Functionality Not Implemented in Riwayat Produksi**
**Location**: Riwayat Produksi component UI

**Problem**: The UI may have edit/delete buttons, but they're not wired to the existing hooks:
- `useUpdateProduction()` hook exists in `/lib/hooks/useProduction.ts` (line 270+)
- `useDeleteProduction()` hook exists (line 300+)
- But component doesn't call these hooks

**Missing Implementation**:
- Edit modal/form component
- Integration with useUpdateProduction mutation
- Integration with useDeleteProduction mutation
- Inventory adjustment logic when qty changes (delta = new_qty - old_qty)

### 7. **No Success/Failure Notifications**
**Location**: All mutation handlers in production and transaction components

**Problem**: React Query mutations complete but don't show toast notifications to user. No visual feedback on success/failure.

**Missing**: 
```typescript
const createMutation = useCreateProduction({
  onSuccess: () => {
    toast.success('✓ Berhasil disimpan: {qty} donat {ukuran}');
  },
  onError: (err) => {
    toast.error('✗ Gagal: ' + err.message);
  }
});
```


## Correctness Properties

Property 1: Bug Condition - Production Input Idempotency

_For any_ production input where the bug condition holds (concurrent inputs, duplicate submissions), the fixed system SHALL process the input exactly once, store it successfully in both production_daily and inventory_non_topping, log it in inventory_sync_log, and display a success notification within 3 seconds.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition - Real-time Synchronization

_For any_ production input successfully saved, the fixed system SHALL propagate the data to Riwayat Produksi menu within 2 seconds via Supabase Realtime subscription, without requiring manual refresh.

**Validates: Requirements 2.4**

Property 3: Bug Condition - Edit/Delete Operations

_For any_ edit or delete operation on production records in Riwayat Produksi, the fixed system SHALL successfully update/delete the production_daily record, adjust inventory_non_topping accordingly, and sync changes in real-time to all connected clients.

**Validates: Requirements 2.5**

Property 4: Bug Condition - Stock Deduction Timing

_For any_ sale transaction in POS/Kasir, the fixed system SHALL deduct stock from inventory_non_topping ONLY after the receipt is successfully printed AND the order status is updated to 'completed', not before.

**Validates: Requirements 2.6**

Property 5: Bug Condition - Stock Restoration on Delete

_For any_ completed transaction deleted in Menu Transaksi, the fixed system SHALL restore the exact quantity of donat stock that was originally deducted, update inventory_non_topping, and display a confirmation notification showing the restored amount.

**Validates: Requirements 2.7**

Property 6: Preservation - Offline Mode Unchanged

_For any_ stock operation performed while the system is offline, the fixed system SHALL produce exactly the same result as the original system, using the existing offline queue mechanism without any behavioral changes.

**Validates: Requirements 3.1**

Property 7: Preservation - Non-Donat Products Unchanged

_For any_ transaction or inventory operation involving Non-Donat products, the fixed system SHALL process it identically to the original system, with no changes to stock management, pricing, or transaction flow.

**Validates: Requirements 3.2, 3.4, 3.5, 3.7**

Property 8: Preservation - Real-time Stock Display

_For any_ stock change event (production input, sale, or deletion), the fixed system SHALL continue to update the stock badge in POS/Kasir header within 2 seconds via existing Supabase Realtime subscription, maintaining current accuracy.

**Validates: Requirements 3.3**


## Fix Implementation

### Changes Required

Based on root cause analysis, here are the specific implementation changes:

### Change 1: Add Distributed Lock to Production Input API

**File**: `/app/api/production/daily/route.ts`

**Function**: `POST` handler (line 127+)

**Specific Changes**:

1. **Add Advisory Lock Acquisition** (at start of POST handler, after validation):
   ```typescript
   // After validation.data is ready (around line 230)
   const lockKey = `production_lock:${data.outlet_id}:${data.tanggal}:${data.ukuran}`;
   const lockAcquired = await acquireAdvisoryLock(lockKey, 5000); // 5 second timeout
   
   if (!lockAcquired) {
     return NextResponse.json({
       success: false,
       message: 'Sedang memproses input lain. Mohon tunggu sebentar...',
     }, { status: 409 });
   }
   ```

2. **Implement Advisory Lock Helper** (new file: `/lib/utils/advisory-lock.ts`):
   ```typescript
   export async function acquireAdvisoryLock(
     lockKey: string, 
     timeoutMs: number = 5000
   ): Promise<boolean> {
     // Use PostgreSQL pg_advisory_lock or Redis SETNX
     // Return true if acquired, false if timeout
   }
   
   export async function releaseAdvisoryLock(lockKey: string): Promise<void> {
     // Release the lock
   }
   ```

3. **Wrap Main Logic in try-finally** (ensure lock release):
   ```typescript
   try {
     // Existing production creation logic
     const result = await createProductionDaily(...);
     await syncInventoryAfterProduction(...);
     return NextResponse.json({ success: true, ... });
   } finally {
     await releaseAdvisoryLock(lockKey);
   }
   ```

4. **Add Lock Status Indicator** (optional frontend enhancement):
   - Add loading state with message: "Memproses input produksi..."
   - Disable submit button during lock acquisition


### Change 2: Strengthen Idempotency in syncInventoryAfterProduction

**File**: `/app/api/production/daily/route.ts`

**Function**: `syncInventoryAfterProduction` (lines 45-105)

**Specific Changes**:

1. **Add Transaction Wrapper** (make sync atomic):
   ```typescript
   async function syncInventoryAfterProduction(...) {
     // Use Supabase transaction or pg transaction
     const { error: txError } = await adminSupabase.rpc('sync_production_atomic', {
       p_production_id: production_id,
       p_outlet_id: outlet_id,
       p_ukuran: ukuran,
       p_tanggal: tanggal,
       p_success_qty: success_qty
     });
     
     if (txError) throw txError;
   }
   ```

2. **Create Database Function** (PostgreSQL stored procedure for atomicity):
   ```sql
   CREATE OR REPLACE FUNCTION sync_production_atomic(
     p_production_id UUID,
     p_outlet_id UUID,
     p_ukuran TEXT,
     p_tanggal DATE,
     p_success_qty INTEGER
   ) RETURNS VOID AS $$
   BEGIN
     -- Check if already synced (within same transaction)
     IF EXISTS (SELECT 1 FROM inventory_sync_log WHERE production_daily_id = p_production_id) THEN
       RETURN; -- Already synced, exit
     END IF;
     
     -- Insert inventory batch
     INSERT INTO inventory_non_topping (outlet_id, ukuran, qty_available, production_date, status)
     VALUES (p_outlet_id, p_ukuran, p_success_qty, p_tanggal, 'fresh');
     
     -- Log sync
     INSERT INTO inventory_sync_log (production_daily_id, outlet_id, ukuran, qty_synced)
     VALUES (p_production_id, p_outlet_id, p_ukuran, p_success_qty);
   END;
   $$ LANGUAGE plpgsql;
   ```

3. **Remove Error Handler for 23505** (line 291):
   - Delete the error handler that returns 409 on UNIQUE_CONSTRAINT_VIOLATION
   - Let the transaction handle idempotency internally

4. **Add Retry Logic** (optional, for transient network errors):
   ```typescript
   const maxRetries = 3;
   for (let i = 0; i < maxRetries; i++) {
     try {
       await syncInventoryAfterProduction(...);
       break; // Success
     } catch (err) {
       if (i === maxRetries - 1) throw err;
       await sleep(100 * (i + 1)); // Exponential backoff
     }
   }
   ```


### Change 3: Add Real-time Subscription to Riwayat Produksi

**File**: Riwayat Produksi component (needs identification - likely `/app/dashboard/input-produksi/page.tsx` or similar)

**Specific Changes**:

1. **Add Supabase Realtime Subscription Hook**:
   ```typescript
   useEffect(() => {
     if (!outletId) return;
     
     const channel = supabase
       .channel(`riwayat-production-${outletId}-${Date.now()}`)
       .on('postgres_changes', {
         event: '*', // INSERT, UPDATE, DELETE
         schema: 'public',
         table: 'production_daily',
         filter: `outlet_id=eq.${outletId}`
       }, async (payload) => {
         console.log('🔄 Production changed:', payload);
         
         // Invalidate React Query cache
         await queryClient.invalidateQueries({
           queryKey: ['productions', { outlet_id: outletId }]
         });
         
         // Optional: Show toast notification
         if (payload.eventType === 'INSERT') {
           toast.info('📦 Produksi baru ditambahkan', { duration: 3000 });
         }
       })
       .subscribe();
     
     return () => {
       supabase.removeChannel(channel);
     };
   }, [outletId, queryClient]);
   ```

2. **Use Existing useRealtimeProduction Hook** (if available):
   - Check if `/lib/hooks/useRealtimeProduction.ts` already exists
   - Import and use: `useRealtimeProduction(outletId)`
   - Ensure it invalidates the correct query keys

3. **Add Loading State During Realtime Update**:
   ```typescript
   const [isRealtimeUpdating, setIsRealtimeUpdating] = useState(false);
   
   // In subscription callback
   setIsRealtimeUpdating(true);
   await queryClient.invalidateQueries(...);
   setTimeout(() => setIsRealtimeUpdating(false), 500);
   ```

4. **Display Realtime Indicator** (UI enhancement):
   - Show badge: "🟢 Live" when subscription is active
   - Show spinner during realtime updates


### Change 4: Move Stock Deduction to After Receipt Printing

**Files**: 
- Order creation API: `/app/api/orders/route.ts` (or similar)
- Kasir component: `/app/dashboard/kasir/page.tsx` (line ~70-80)

**Specific Changes**:

1. **Modify Order Creation Flow** (API):
   ```typescript
   // Current: Stock deducted on order creation
   POST /api/orders {
     // Create order with status='pending'
     // ❌ Deduct stock here (WRONG)
   }
   
   // Fixed: Stock deducted on completion
   POST /api/orders {
     // Create order with status='pending'
     // ✅ Do NOT deduct stock yet
   }
   
   PUT /api/orders/{id}/complete {
     // Update status='completed'
     // ✅ Deduct stock atomically with status update
     BEGIN TRANSACTION;
       UPDATE orders SET status='completed' WHERE id=...;
       UPDATE inventory_non_topping SET qty_available = qty_available - ? WHERE ...;
     COMMIT;
   }
   ```

2. **Add Order Completion Endpoint** (new API route):
   ```typescript
   // File: /app/api/orders/[id]/complete/route.ts
   export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
     const orderId = params.id;
     
     // Fetch order details
     const order = await getOrderById(orderId);
     if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
     if (order.status !== 'pending') return NextResponse.json({ error: 'Order not pending' }, { status: 400 });
     
     // Atomic transaction: update status + deduct stock
     await adminSupabase.rpc('complete_order_with_stock_deduction', {
       p_order_id: orderId,
       p_outlet_id: order.outlet_id
     });
     
     return NextResponse.json({ success: true });
   }
   ```

3. **Create Database Function** (PostgreSQL stored procedure):
   ```sql
   CREATE OR REPLACE FUNCTION complete_order_with_stock_deduction(
     p_order_id UUID,
     p_outlet_id UUID
   ) RETURNS VOID AS $$
   DECLARE
     item RECORD;
   BEGIN
     -- Update order status
     UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = p_order_id;
     
     -- Deduct stock for each donat item (FIFO)
     FOR item IN 
       SELECT oi.product_id, oi.quantity, p.nama, p.ukuran
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = p_order_id AND p.category = 'donat'
     LOOP
       -- Deduct from oldest batch first (FIFO)
       UPDATE inventory_non_topping
       SET qty_available = qty_available - item.quantity
       WHERE outlet_id = p_outlet_id 
         AND ukuran = item.ukuran
         AND qty_available > 0
       ORDER BY production_date ASC, created_at ASC
       LIMIT 1;
     END LOOP;
   END;
   $$ LANGUAGE plpgsql;
   ```

4. **Update Kasir Flow** (frontend):
   ```typescript
   // In kasir/page.tsx handleProsesBayar function
   const handleProsesBayar = async (methodId?: string) => {
     setIsProcessingPayment(true);
     try {
       // 1. Create order (status='pending', no stock deduction)
       const order = await createOrder(...);
       
       // 2. Print receipt
       const printResult = await printReceipt(order);
       
       if (!printResult.success) {
         throw new Error('Receipt printing failed');
       }
       
       // 3. Complete order (deduct stock atomically)
       await fetch(`/api/orders/${order.id}/complete`, { method: 'PUT' });
       
       // 4. Show success
       toast.success('✓ Transaksi berhasil, stok telah dikurangi');
       
     } catch (err) {
       toast.error('❌ ' + err.message);
       // Order remains 'pending', stock unchanged
     } finally {
       setIsProcessingPayment(false);
     }
   };
   ```


### Change 5: Add Stock Restoration Logic for Transaction Deletion

**Files**:
- Transaction delete API: `/app/api/orders/[id]/route.ts` DELETE handler
- Transaksi component: `/app/dashboard/transaksi/page.tsx`

**Specific Changes**:

1. **Create Delete with Stock Restoration Endpoint** (API):
   ```typescript
   // File: /app/api/orders/[id]/route.ts
   export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
     const orderId = params.id;
     
     // Fetch order details
     const { data: order, error } = await adminSupabase
       .from('orders')
       .select(`
         *, 
         order_items (
           quantity, 
           products (id, nama, category, ukuran)
         )
       `)
       .eq('id', orderId)
       .single();
     
     if (error || !order) {
       return NextResponse.json({ error: 'Order not found' }, { status: 404 });
     }
     
     // Only restore stock if order was completed (stock was deducted)
     if (order.status === 'completed') {
       await adminSupabase.rpc('delete_order_with_stock_restoration', {
         p_order_id: orderId,
         p_outlet_id: order.outlet_id
       });
     } else {
       // Order was pending/cancelled, just delete without stock restoration
       await adminSupabase.from('orders').delete().eq('id', orderId);
     }
     
     return NextResponse.json({ 
       success: true, 
       stockRestored: order.status === 'completed',
       message: order.status === 'completed' 
         ? 'Transaksi dihapus, stok dikembalikan' 
         : 'Transaksi dihapus'
     });
   }
   ```

2. **Create Database Function** (PostgreSQL stored procedure):
   ```sql
   CREATE OR REPLACE FUNCTION delete_order_with_stock_restoration(
     p_order_id UUID,
     p_outlet_id UUID
   ) RETURNS VOID AS $$
   DECLARE
     item RECORD;
   BEGIN
     -- Restore stock for each donat item
     FOR item IN 
       SELECT oi.quantity, p.ukuran
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = p_order_id AND p.category = 'donat'
     LOOP
       -- Add back to most recent batch (or create new batch)
       UPDATE inventory_non_topping
       SET qty_available = qty_available + item.quantity,
           last_updated = NOW()
       WHERE outlet_id = p_outlet_id 
         AND ukuran = item.ukuran
       ORDER BY created_at DESC
       LIMIT 1;
       
       -- If no batch found (shouldn't happen), create one
       IF NOT FOUND THEN
         INSERT INTO inventory_non_topping (outlet_id, ukuran, qty_available, production_date, status)
         VALUES (p_outlet_id, item.ukuran, item.quantity, CURRENT_DATE, 'restored');
       END IF;
     END LOOP;
     
     -- Delete order (cascade will delete order_items)
     DELETE FROM orders WHERE id = p_order_id;
   END;
   $$ LANGUAGE plpgsql;
   ```

3. **Update Transaksi Component** (frontend):
   ```typescript
   // In transaksi/page.tsx
   const handleDeleteTransaction = async (transactionId: string) => {
     if (!confirm('Yakin hapus transaksi ini? Stok akan dikembalikan jika transaksi sudah selesai.')) {
       return;
     }
     
     try {
       const response = await fetch(`/api/orders/${transactionId}`, { method: 'DELETE' });
       const result = await response.json();
       
       if (result.success) {
         toast.success(result.message);
         if (result.stockRestored) {
           // Refresh stock display
           queryClient.invalidateQueries({ queryKey: ['inventory'] });
         }
         // Refresh transaction list
         loadTransaksi();
       } else {
         toast.error('Gagal menghapus transaksi');
       }
     } catch (err) {
       toast.error('Error: ' + err.message);
     }
   };
   ```


### Change 6: Implement Edit/Delete Functionality in Riwayat Produksi

**File**: Riwayat Produksi component (needs identification)

**Specific Changes**:

1. **Add Edit Modal Component**:
   ```typescript
   // Component: EditProductionModal.tsx
   interface EditProductionModalProps {
     production: ProductionDaily;
     onClose: () => void;
     onSuccess: () => void;
   }
   
   export function EditProductionModal({ production, onClose, onSuccess }: EditProductionModalProps) {
     const [successQty, setSuccessQty] = useState(production.success_qty);
     const [wasteQty, setWasteQty] = useState(production.waste_qty);
     
     const updateMutation = useUpdateProduction();
     
     const handleSubmit = async () => {
       try {
         await updateMutation.mutateAsync({
           id: production.id,
           data: {
             success_qty: successQty,
             waste_qty: wasteQty,
             target_qty: successQty + wasteQty,
           }
         });
         
         toast.success('✓ Data berhasil diupdate');
         onSuccess();
         onClose();
       } catch (err) {
         toast.error('❌ Gagal update: ' + err.message);
       }
     };
     
     return (
       <Modal open onClose={onClose}>
         <h2>Edit Produksi</h2>
         <label>Jumlah Berhasil</label>
         <input type="number" value={successQty} onChange={e => setSuccessQty(Number(e.target.value))} />
         
         <label>Jumlah Waste</label>
         <input type="number" value={wasteQty} onChange={e => setWasteQty(Number(e.target.value))} />
         
         <button onClick={handleSubmit} disabled={updateMutation.isPending}>
           {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
         </button>
       </Modal>
     );
   }
   ```

2. **Update API to Handle Inventory Adjustment**:
   ```typescript
   // File: /app/api/production/daily/[id]/route.ts - PUT handler
   export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
     const productionId = params.id;
     const body = await req.json();
     
     // Fetch old production data
     const { data: oldProduction } = await adminSupabase
       .from('production_daily')
       .select('*')
       .eq('id', productionId)
       .single();
     
     if (!oldProduction) {
       return NextResponse.json({ error: 'Production not found' }, { status: 404 });
     }
     
     // Calculate delta
     const qtyDelta = body.success_qty - oldProduction.success_qty;
     
     // Update production record
     await adminSupabase
       .from('production_daily')
       .update({
         success_qty: body.success_qty,
         waste_qty: body.waste_qty,
         target_qty: body.success_qty + body.waste_qty,
         updated_at: new Date().toISOString()
       })
       .eq('id', productionId);
     
     // Adjust inventory
     if (qtyDelta !== 0) {
       await adminSupabase
         .from('inventory_non_topping')
         .update({
           qty_available: supabase.raw(`qty_available + ${qtyDelta}`),
           last_updated: new Date().toISOString()
         })
         .eq('outlet_id', oldProduction.outlet_id)
         .eq('ukuran', oldProduction.ukuran)
         .eq('production_date', oldProduction.tanggal);
     }
     
     return NextResponse.json({ success: true });
   }
   ```

3. **Add Delete Confirmation**:
   ```typescript
   const handleDelete = async (productionId: string) => {
     if (!confirm('Yakin hapus data produksi ini? Stok akan dikurangi sesuai jumlah yang dihapus.')) {
       return;
     }
     
     const deleteMutation = useDeleteProduction();
     
     try {
       await deleteMutation.mutateAsync(productionId);
       toast.success('✓ Data berhasil dihapus');
     } catch (err) {
       toast.error('❌ Gagal hapus: ' + err.message);
     }
   };
   ```

4. **Update DELETE API to Adjust Inventory**:
   ```typescript
   // File: /app/api/production/daily/[id]/route.ts - DELETE handler
   export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
     const productionId = params.id;
     
     // Fetch production data
     const { data: production } = await adminSupabase
       .from('production_daily')
       .select('*')
       .eq('id', productionId)
       .single();
     
     if (!production) {
       return NextResponse.json({ error: 'Production not found' }, { status: 404 });
     }
     
     // Reduce inventory (remove the batch)
     await adminSupabase
       .from('inventory_non_topping')
       .update({
         qty_available: supabase.raw(`qty_available - ${production.success_qty}`),
         last_updated: new Date().toISOString()
       })
       .eq('outlet_id', production.outlet_id)
       .eq('ukuran', production.ukuran)
       .eq('production_date', production.tanggal);
     
     // Delete production record
     await adminSupabase
       .from('production_daily')
       .delete()
       .eq('id', productionId);
     
     // Delete sync log
     await adminSupabase
       .from('inventory_sync_log')
       .delete()
       .eq('production_daily_id', productionId);
     
     return NextResponse.json({ success: true });
   }
   ```


### Change 7: Add Success/Failure Notifications Across All Operations

**Files**: All mutation handlers in production and transaction components

**Specific Changes**:

1. **Update useCreateProduction Hook Usage**:
   ```typescript
   // In Input Produksi component
   const createMutation = useCreateProduction();
   
   const handleSubmit = async (data: CreateProductionDaily) => {
     try {
       const result = await createMutation.mutateAsync(data);
       
       toast.success(
         `✓ Berhasil disimpan: ${data.success_qty} donat ${data.ukuran}`,
         { duration: 5000 }
       );
       
       // Reset form
       resetForm();
       
     } catch (err: any) {
       toast.error(
         `❌ Gagal menyimpan: ${err.message}`,
         { duration: 8000 }
       );
     }
   };
   ```

2. **Add Loading State with Clear Feedback**:
   ```typescript
   const handleSubmit = async (data: CreateProductionDaily) => {
     const toastId = toast.loading('⏳ Menyimpan data produksi...');
     
     try {
       const result = await createMutation.mutateAsync(data);
       
       toast.success(
         `✓ Berhasil disimpan: ${data.success_qty} donat ${data.ukuran}`,
         { id: toastId }
       );
       
     } catch (err: any) {
       toast.error(
         `❌ Gagal: ${err.message}`,
         { id: toastId }
       );
     }
   };
   ```

3. **Add Notification for Edit Operations**:
   ```typescript
   const handleEdit = async (id: string, data: UpdateProductionDaily) => {
     const toastId = toast.loading('⏳ Mengupdate data...');
     
     try {
       await updateMutation.mutateAsync({ id, data });
       
       toast.success('✓ Data berhasil diupdate', { id: toastId });
       
     } catch (err: any) {
       toast.error(`❌ Gagal update: ${err.message}`, { id: toastId });
     }
   };
   ```

4. **Add Notification for Delete Operations**:
   ```typescript
   const handleDelete = async (id: string) => {
     const toastId = toast.loading('⏳ Menghapus data...');
     
     try {
       await deleteMutation.mutateAsync(id);
       
       toast.success('✓ Data berhasil dihapus', { id: toastId });
       
     } catch (err: any) {
       toast.error(`❌ Gagal hapus: ${err.message}`, { id: toastId });
     }
   };
   ```

5. **Add Notification for Transaction Delete with Stock Restoration**:
   ```typescript
   const handleDeleteTransaction = async (id: string, order: Order) => {
     const toastId = toast.loading('⏳ Menghapus transaksi...');
     
     try {
       const result = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
       const data = await result.json();
       
       if (data.stockRestored) {
         const donatItems = order.order_items.filter(i => i.products.category === 'donat');
         const totalQty = donatItems.reduce((sum, i) => sum + i.quantity, 0);
         
         toast.success(
           `✓ Transaksi dihapus, stok dikembalikan: +${totalQty} donat`,
           { id: toastId, duration: 6000 }
         );
       } else {
         toast.success('✓ Transaksi dihapus', { id: toastId });
       }
       
     } catch (err: any) {
       toast.error(`❌ Gagal hapus transaksi: ${err.message}`, { id: toastId });
     }
   };
   ```

6. **Add Notification for Lock Acquisition Failures**:
   ```typescript
   // In API response when lock not acquired
   if (!lockAcquired) {
     return NextResponse.json({
       success: false,
       message: 'Sedang memproses input lain. Mohon tunggu sebentar...',
       retryAfter: 5 // seconds
     }, { status: 409 });
   }
   
   // In frontend
   if (response.status === 409) {
     toast.warning(
       '⏳ Sedang memproses input lain. Silakan coba lagi dalam beberapa detik.',
       { duration: 5000 }
     );
   }
   ```


## Testing Strategy

### Validation Approach

The testing strategy follows a three-phase approach:
1. **Exploratory Bug Condition Checking**: Surface counterexamples on unfixed code to confirm root causes
2. **Fix Checking**: Verify fixes work correctly for all buggy inputs
3. **Preservation Checking**: Ensure non-buggy scenarios remain unchanged

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fix. Confirm or refute the root cause analysis.

**Test Plan**: Write integration tests that simulate real user scenarios on the UNFIXED codebase, expecting failures that demonstrate each bug.

**Test Cases**:

1. **UNIQUE_CONSTRAINT_VIOLATION Test** (will fail on unfixed code):
   ```typescript
   test('Bug 1: Concurrent production inputs cause UNIQUE_CONSTRAINT_VIOLATION', async () => {
     const productionData = {
       outlet_id: TEST_OUTLET_ID,
       tanggal: getTodayWIB(),
       ukuran: 'standar',
       target_qty: 100,
       success_qty: 95,
       waste_details: [{ reason: 'gosong', qty: 5, hpp_per_pcs: 1000 }]
     };
     
     // Submit two identical requests concurrently
     const [response1, response2] = await Promise.all([
       fetch('/api/production/daily', { method: 'POST', body: JSON.stringify(productionData) }),
       fetch('/api/production/daily', { method: 'POST', body: JSON.stringify(productionData) })
     ]);
     
     // Expected on unfixed code: One success, one error 409 with UNIQUE_CONSTRAINT_VIOLATION
     // This confirms the race condition exists
     expect(response1.status === 409 || response2.status === 409).toBe(true);
   });
   ```

2. **No Notification Test** (will fail on unfixed code):
   ```typescript
   test('Bug 2: Production input shows no success notification', async () => {
     const toastSpy = jest.spyOn(toast, 'success');
     
     // Submit production via UI
     await userEvent.type(screen.getByLabelText('Jumlah Berhasil'), '100');
     await userEvent.click(screen.getByText('Simpan'));
     
     await waitFor(() => {
       expect(toastSpy).not.toHaveBeenCalled(); // Expected on unfixed code
     });
   });
   ```

3. **Stock Deducted Before Receipt Test** (will fail on unfixed code):
   ```typescript
   test('Bug 6: Stock deducted before receipt printed', async () => {
     // Get initial stock
     const initialStock = await getInventoryQty(TEST_OUTLET_ID, 'standar');
     
     // Create order (no receipt printed yet)
     const order = await createOrder({
       outlet_id: TEST_OUTLET_ID,
       items: [{ product_id: DONAT_STANDAR_ID, quantity: 20 }],
       status: 'pending'
     });
     
     // Check stock immediately
     const stockAfterOrder = await getInventoryQty(TEST_OUTLET_ID, 'standar');
     
     // Expected on unfixed code: stock already deducted
     expect(stockAfterOrder).toBe(initialStock - 20); // BUG: stock deducted too early
   });
   ```

4. **Stock Not Restored on Delete Test** (will fail on unfixed code):
   ```typescript
   test('Bug 7: Stock not restored when transaction deleted', async () => {
     // Create and complete order
     const order = await createAndCompleteOrder({
       outlet_id: TEST_OUTLET_ID,
       items: [{ product_id: DONAT_STANDAR_ID, quantity: 20 }]
     });
     
     const stockBeforeDelete = await getInventoryQty(TEST_OUTLET_ID, 'standar');
     
     // Delete order
     await deleteOrder(order.id);
     
     const stockAfterDelete = await getInventoryQty(TEST_OUTLET_ID, 'standar');
     
     // Expected on unfixed code: stock unchanged (not restored)
     expect(stockAfterDelete).toBe(stockBeforeDelete); // BUG: stock not restored
   });
   ```

**Expected Counterexamples**:
- UNIQUE_CONSTRAINT_VIOLATION appears in console when concurrent requests occur
- No toast notifications shown after successful operations
- Stock deduction happens before order completion
- Stock not restored when completed orders are deleted
- Edit/Delete buttons in Riwayat Produksi don't work or don't exist


### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := processStockOperation_fixed(input)
  ASSERT expectedBehavior(result) = TRUE
END FOR
```

**Test Cases**:

1. **Idempotency Test** (should pass on fixed code):
   ```typescript
   test('Fix 1: Concurrent production inputs are idempotent', async () => {
     const productionData = {
       outlet_id: TEST_OUTLET_ID,
       tanggal: getTodayWIB(),
       ukuran: 'standar',
       target_qty: 100,
       success_qty: 95,
       waste_details: [{ reason: 'gosong', qty: 5, hpp_per_pcs: 1000 }]
     };
     
     // Submit two identical requests concurrently
     const [response1, response2] = await Promise.all([
       fetch('/api/production/daily', { method: 'POST', body: JSON.stringify(productionData) }),
       fetch('/api/production/daily', { method: 'POST', body: JSON.stringify(productionData) })
     ]);
     
     // Expected on fixed code: Both return success OR one returns 409 with clear message
     expect(response1.ok || response2.ok).toBe(true);
     
     // Check database: exactly one production record created
     const productions = await getProductionRecords(TEST_OUTLET_ID, getTodayWIB(), 'standar');
     expect(productions.length).toBe(1);
     
     // Check inventory: stock increased exactly once
     const inventory = await getInventoryQty(TEST_OUTLET_ID, 'standar');
     expect(inventory).toBe(INITIAL_STOCK + 95);
     
     // Check sync log: exactly one log entry
     const syncLogs = await getSyncLogs(productions[0].id);
     expect(syncLogs.length).toBe(1);
   });
   ```

2. **Success Notification Test** (should pass on fixed code):
   ```typescript
   test('Fix 2: Production input shows success notification', async () => {
     const toastSpy = jest.spyOn(toast, 'success');
     
     await userEvent.type(screen.getByLabelText('Jumlah Berhasil'), '100');
     await userEvent.click(screen.getByText('Simpan'));
     
     await waitFor(() => {
       expect(toastSpy).toHaveBeenCalledWith(
         expect.stringContaining('Berhasil disimpan: 100 donat standar')
       );
     });
   });
   ```

3. **Stock Deduction After Receipt Test** (should pass on fixed code):
   ```typescript
   test('Fix 6: Stock deducted only after receipt printed', async () => {
     const initialStock = await getInventoryQty(TEST_OUTLET_ID, 'standar');
     
     // Create order (status='pending')
     const order = await createOrder({
       outlet_id: TEST_OUTLET_ID,
       items: [{ product_id: DONAT_STANDAR_ID, quantity: 20 }],
       status: 'pending'
     });
     
     // Check stock: should NOT be deducted yet
     let stockAfterOrder = await getInventoryQty(TEST_OUTLET_ID, 'standar');
     expect(stockAfterOrder).toBe(initialStock); // ✓ Stock unchanged
     
     // Complete order (print receipt)
     await completeOrder(order.id);
     
     // Check stock: NOW it should be deducted
     stockAfterOrder = await getInventoryQty(TEST_OUTLET_ID, 'standar');
     expect(stockAfterOrder).toBe(initialStock - 20); // ✓ Stock deducted
   });
   ```

4. **Stock Restoration Test** (should pass on fixed code):
   ```typescript
   test('Fix 7: Stock restored when completed transaction deleted', async () => {
     const order = await createAndCompleteOrder({
       outlet_id: TEST_OUTLET_ID,
       items: [{ product_id: DONAT_STANDAR_ID, quantity: 20 }]
     });
     
     const stockBeforeDelete = await getInventoryQty(TEST_OUTLET_ID, 'standar');
     
     // Delete order
     await deleteOrder(order.id);
     
     const stockAfterDelete = await getInventoryQty(TEST_OUTLET_ID, 'standar');
     
     // Stock should be restored
     expect(stockAfterDelete).toBe(stockBeforeDelete + 20); // ✓ Stock restored
   });
   ```

5. **Real-time Sync Test** (should pass on fixed code):
   ```typescript
   test('Fix 4: Production data syncs to Riwayat Produksi in real-time', async () => {
     // Open Riwayat Produksi (subscribes to realtime)
     render(<RiwayatProduksiPage outletId={TEST_OUTLET_ID} />);
     
     // Submit production in Input Produksi
     await createProduction({
       outlet_id: TEST_OUTLET_ID,
       tanggal: getTodayWIB(),
       ukuran: 'standar',
       success_qty: 100
     });
     
     // Wait for realtime update (should appear within 2 seconds)
     await waitFor(() => {
       expect(screen.getByText(/100 donat standar/i)).toBeInTheDocument();
     }, { timeout: 2000 });
   });
   ```


### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalFunction(input) = fixedFunction(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Write tests that verify offline mode and non-donat operations work identically before and after the fix.

**Test Cases**:

1. **Offline Mode Preservation Test**:
   ```typescript
   test('Preservation: Offline mode production input works unchanged', async () => {
     // Simulate offline
     mockOffline();
     
     const productionData = {
       outlet_id: TEST_OUTLET_ID,
       tanggal: getTodayWIB(),
       ukuran: 'standar',
       success_qty: 50
     };
     
     // Submit production offline
     await submitProductionOffline(productionData);
     
     // Check offline queue
     const offlineQueue = await getOfflineQueue();
     expect(offlineQueue).toHaveLength(1);
     expect(offlineQueue[0].data).toMatchObject(productionData);
     
     // Come back online
     mockOnline();
     await syncOfflineQueue();
     
     // Verify data synced correctly (same as before fix)
     const production = await getProductionRecords(TEST_OUTLET_ID, getTodayWIB(), 'standar');
     expect(production[0].success_qty).toBe(50);
   });
   ```

2. **Non-Donat Product Preservation Test**:
   ```typescript
   test('Preservation: Non-donat product transactions unchanged', async () => {
     const initialStock = await getInventoryQty(TEST_OUTLET_ID, 'non-donat-product');
     
     // Create and complete order for non-donat product
     const order = await createAndCompleteOrder({
       outlet_id: TEST_OUTLET_ID,
       items: [{ product_id: NON_DONAT_PRODUCT_ID, quantity: 10 }]
     });
     
     // Stock should be handled by existing non-donat logic (unchanged)
     const stockAfterOrder = await getInventoryQty(TEST_OUTLET_ID, 'non-donat-product');
     expect(stockAfterOrder).toBe(initialStock - 10);
     
     // Delete order
     await deleteOrder(order.id);
     
     // Stock restoration should work for non-donat too
     const stockAfterDelete = await getInventoryQty(TEST_OUTLET_ID, 'non-donat-product');
     expect(stockAfterDelete).toBe(initialStock);
   });
   ```

3. **Stock Header Badge Preservation Test**:
   ```typescript
   test('Preservation: Stock header badge updates remain accurate', async () => {
     render(<KasirPage />);
     
     const initialBadgeText = screen.getByTestId('stock-badge-standar').textContent;
     
     // Perform production input
     await createProduction({
       outlet_id: TEST_OUTLET_ID,
       ukuran: 'standar',
       success_qty: 50
     });
     
     // Wait for realtime update (existing mechanism)
     await waitFor(() => {
       const newBadgeText = screen.getByTestId('stock-badge-standar').textContent;
       expect(Number(newBadgeText)).toBe(Number(initialBadgeText) + 50);
     }, { timeout: 3000 });
   });
   ```

4. **Multi-Outlet Independence Preservation Test**:
   ```typescript
   test('Preservation: Multi-outlet stock independence maintained', async () => {
     // Submit production to outlet A
     await createProduction({
       outlet_id: OUTLET_A_ID,
       ukuran: 'standar',
       success_qty: 100
     });
     
     // Check outlet A stock increased
     const stockA = await getInventoryQty(OUTLET_A_ID, 'standar');
     expect(stockA).toBeGreaterThan(0);
     
     // Check outlet B stock unchanged
     const stockB = await getInventoryQty(OUTLET_B_ID, 'standar');
     expect(stockB).toBe(INITIAL_STOCK_OUTLET_B);
   });
   ```

5. **Channel Pricing Preservation Test**:
   ```typescript
   test('Preservation: Channel pricing works identically', async () => {
     // Test each channel
     const channels = ['toko', 'gofood', 'grabfood', 'shopee', 'tiktok'];
     
     for (const channel of channels) {
       const order = await createOrder({
         outlet_id: TEST_OUTLET_ID,
         channel: channel,
         items: [{ product_id: DONAT_STANDAR_ID, quantity: 1 }]
       });
       
       // Price should match channel pricing (unchanged)
       expect(order.total_amount).toBe(getExpectedPriceForChannel(channel, DONAT_STANDAR_ID));
     }
   });
   ```

### Unit Tests

- Test advisory lock acquire/release functions
- Test syncInventoryAfterProduction with various inputs (0 qty, negative qty, missing data)
- Test inventory sync log creation and duplicate detection
- Test stock deduction calculation for multi-item orders
- Test stock restoration calculation with mixed donat/non-donat items
- Test edit production delta calculation (positive and negative deltas)

### Property-Based Tests

- Generate random production quantities (0-1000) and verify stock always matches sum of all productions
- Generate random order sequences and verify stock never goes negative
- Generate random edit/delete sequences and verify inventory consistency
- Test concurrent operations with random timing to verify no race conditions

### Integration Tests

- Full flow: Input Produksi → Riwayat Produksi sync → POS sale → Transaction delete → Stock restored
- Multi-user scenario: Multiple kasir submitting production simultaneously
- Network failure scenario: Offline production → Online sync → Verify data integrity
- Error recovery: Failed receipt print → Order remains pending → Stock unchanged
