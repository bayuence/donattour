# Implementation Plan

## Overview

This implementation follows the bugfix exploration workflow using the bug condition methodology for fixing real-time donat stock synchronization issues when online. The implementation is structured in three phases:

1. **Exploration Phase (Tasks 1-1.8)**: Write bug condition exploration tests BEFORE implementing the fix to understand and confirm all seven bugs exist
2. **Preservation Phase (Tasks 2-2.7)**: Write preservation property tests BEFORE implementing the fix to capture current working behavior that must be preserved
3. **Implementation Phase (Tasks 3-11)**: Apply fixes with understanding from exploration, then verify both exploration and preservation tests pass

The bug condition methodology ensures we:
- Explore the bug with tests that FAIL on unfixed code (confirms bug exists)
- Preserve existing correct behavior with tests that PASS on unfixed code
- Implement fixes that make exploration tests PASS while keeping preservation tests PASSING

## Tasks

### Exploration Phase

- [ ] 1. Write bug condition exploration tests (BEFORE implementing fix)
  - **Property 1: Bug Condition** - Real-time Stock Synchronization Bugs
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fix when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate all seven bugs exist in the system
  
  - [x] 1.1 Test UNIQUE_CONSTRAINT_VIOLATION bug
    - Create integration test simulating concurrent production inputs to same outlet/date/size
    - Submit two identical production requests using Promise.all()
    - Test location: `__tests__/integration/production-bugs.test.ts`
    - Assert: One or both requests return error 409 with UNIQUE_CONSTRAINT_VIOLATION message
    - Document counterexample: specific outlet_id, date, size combination that triggers the error
    - _Requirements: 1.1, 2.1_
  
  - [ ] 1.2 Test missing notification bug
    - Create component test for Input Produksi form submission
    - Spy on toast.success and toast.error calls
    - Submit valid production data
    - Assert: No toast notification is shown after successful submission
    - Document counterexample: Form submission that succeeds in database but shows no UI feedback
    - _Requirements: 1.2, 2.2_
  
  - [ ] 1.3 Test missing lock mechanism bug
    - Create integration test with multiple concurrent submissions
    - Simulate 3 kasir submitting production simultaneously to same outlet
    - Assert: All requests are processed concurrently (no blocking)
    - Document counterexample: Race condition causing inventory count mismatch
    - _Requirements: 1.3, 2.3_

  - [ ] 1.4 Test real-time sync delay bug
    - Create integration test with Input Produksi and Riwayat Produksi components
    - Submit production in Input Produksi
    - Measure time until data appears in Riwayat Produksi
    - Assert: Data does NOT appear within 2 seconds (requires manual refresh)
    - Document counterexample: Specific production entry that doesn't sync automatically
    - _Requirements: 1.4, 2.4_
  
  - [ ] 1.5 Test edit/delete not working bug
    - Create component test for Riwayat Produksi edit functionality
    - Attempt to edit existing production record (change success_qty)
    - Assert: Edit operation fails or does nothing
    - Attempt to delete existing production record
    - Assert: Delete operation fails or does nothing
    - Document counterexample: Specific production_daily record that cannot be edited/deleted
    - _Requirements: 1.5, 2.5_
  
  - [ ] 1.6 Test stock deducted before receipt bug
    - Create integration test for POS order flow
    - Get initial inventory quantity
    - Create order with status='pending' (before receipt printed)
    - Query inventory immediately after order creation
    - Assert: Stock is already deducted (qty_available reduced)
    - Document counterexample: Order that reduces stock before confirmation
    - _Requirements: 1.6, 2.6_
  
  - [ ] 1.7 Test stock not restored on delete bug
    - Create integration test for transaction deletion
    - Create and complete order (stock deducted)
    - Record stock quantity before deletion
    - Delete the completed order
    - Query inventory after deletion
    - Assert: Stock remains unchanged (NOT restored)
    - Document counterexample: Deleted order where 20 donats "disappear" from inventory
    - _Requirements: 1.7, 2.7_

  - [ ] 1.8 Run all exploration tests and document failures
    - Execute test suite: `npm test -- production-bugs.test.ts`
    - **EXPECTED OUTCOME**: All tests FAIL (this is correct - proves bugs exist)
    - Document all counterexamples found in test output
    - Verify each failure matches the bug description in bugfix.md
    - Mark task complete when all tests are written, run, and failures documented
    - _Requirements: All bug condition requirements 1.1-1.7_

### Preservation Phase

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-buggy Behavior Preservation
  - **IMPORTANT**: Follow observation-first methodology
  - **GOAL**: Observe behavior on UNFIXED code for non-buggy inputs and capture it in tests
  - Property-based testing generates many test cases for stronger preservation guarantees
  
  - [ ] 2.1 Observe and test offline mode behavior
    - Run production input in offline mode on UNFIXED code
    - Observe: Data queued locally, synced when online
    - Write property-based test: For all offline production inputs, behavior matches current implementation
    - Test framework: Use fast-check or similar PBT library
    - Generator: random production quantities (1-1000), random sizes (standar, mini, jumbo)
    - Property: offline queue created → data synced on reconnect → inventory updated correctly
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms baseline offline behavior)
    - _Requirements: 3.1_
  
  - [ ] 2.2 Observe and test non-donat product transactions
    - Create non-donat product orders on UNFIXED code
    - Observe: Stock management works differently (no production_daily/inventory_non_topping)
    - Write property-based test: For all non-donat transactions, behavior unchanged
    - Generator: random non-donat products, random quantities (1-50)
    - Property: order created → stock handled by existing logic → delete restores stock (if applicable)
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms non-donat transactions work)
    - _Requirements: 3.2, 3.5_

  - [ ] 2.3 Observe and test stock header badge updates
    - Render Kasir page and observe stock badge on UNFIXED code
    - Perform production input and observe realtime update
    - Write property-based test: For all stock changes, badge updates within 2 seconds
    - Generator: random production quantities, random stock changes
    - Property: stock change event → badge updates via existing Supabase subscription
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms realtime badge works)
    - _Requirements: 3.3_
  
  - [ ] 2.4 Observe and test HPP calculation
    - Create donat orders with various toppings on UNFIXED code
    - Observe: HPP = Harga Donat Polos + Harga Topping
    - Write property-based test: For all donat orders, HPP calculated correctly
    - Generator: random topping combinations, random donat sizes
    - Property: HPP equals base price + sum of topping prices
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms HPP formula unchanged)
    - _Requirements: 3.4_
  
  - [ ] 2.5 Observe and test multi-outlet independence
    - Create production in outlet A on UNFIXED code
    - Observe: Outlet B stock unchanged
    - Write property-based test: For all multi-outlet operations, stocks remain independent
    - Generator: random outlet pairs, random production quantities
    - Property: production in outlet A → stock A increases, stock B unchanged
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms outlet isolation)
    - _Requirements: 3.6_
  
  - [ ] 2.6 Observe and test channel pricing
    - Create orders with different channels on UNFIXED code
    - Observe: Prices vary by channel (toko, gofood, grabfood, shopee, tiktok)
    - Write property-based test: For all channels, pricing follows configuration
    - Generator: random channels, random products
    - Property: order price matches channel-specific pricing
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms channel pricing works)
    - _Requirements: 3.7_

  - [ ] 2.7 Run all preservation tests on unfixed code
    - Execute preservation test suite: `npm test -- preservation.test.ts`
    - **EXPECTED OUTCOME**: All tests PASS (confirms baseline behavior to preserve)
    - Document observed behaviors captured in test assertions
    - Mark task complete when all tests pass on unfixed code
    - _Requirements: All preservation requirements 3.1-3.7_

### Implementation Phase

- [ ] 3. Implement distributed lock mechanism for production input

  - [ ] 3.1 Create advisory lock utility functions
    - Create new file: `lib/utils/advisory-lock.ts`
    - Implement `acquireAdvisoryLock(lockKey: string, timeoutMs: number): Promise<boolean>`
    - Implement `releaseAdvisoryLock(lockKey: string): Promise<void>`
    - Use PostgreSQL pg_advisory_lock via Supabase RPC or Redis SETNX if available
    - Lock key format: `production_lock:{outlet_id}:{tanggal}:{ukuran}`
    - Add timeout logic: return false if lock not acquired within timeoutMs (default 5000ms)
    - Add error handling and logging
    - _Bug_Condition: isBugCondition(input) where input.eventType = 'input_production' AND input.concurrentInputsBlocked = FALSE_
    - _Expected_Behavior: Lock acquired before processing, released after completion_
    - _Preservation: Offline mode and non-donat products unaffected by lock mechanism_
    - _Requirements: 1.3, 2.3_

  - [ ] 3.2 Add lock acquisition to production API endpoint
    - File: `app/api/production/daily/route.ts`
    - In POST handler, after validation (around line 230)
    - Acquire lock using `acquireAdvisoryLock(lockKey, 5000)`
    - If lock not acquired, return 409 response with message: "Sedang memproses input lain. Mohon tunggu sebentar..."
    - Include retryAfter: 5 in response body
    - _Bug_Condition: isBugCondition(input) where multiple concurrent inputs to same outlet/date/size_
    - _Expected_Behavior: Only one request processes at a time, others receive clear wait message_
    - _Requirements: 1.3, 2.3_

  - [ ] 3.3 Wrap production logic in try-finally block
    - File: `app/api/production/daily/route.ts`
    - Wrap main production creation and sync logic in try block
    - Add finally block to ensure lock is always released
    - Call `releaseAdvisoryLock(lockKey)` in finally block
    - Test lock release on both success and error paths
    - _Expected_Behavior: Lock always released, preventing deadlocks_
    - _Requirements: 2.3_

  - [ ] 3.4 Add database migration for advisory lock function
    - Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_add_advisory_lock.sql`
    - Create PostgreSQL function for advisory lock if using pg_advisory_lock
    - Grant execute permissions to appropriate roles
    - Test migration on development database
    - _Requirements: 2.3_

- [ ] 4. Strengthen idempotency in syncInventoryAfterProduction

  - [ ] 4.1 Create atomic sync database function
    - Create migration: `supabase/migrations/YYYYMMDDHHMMSS_sync_production_atomic.sql`
    - Create PostgreSQL function `sync_production_atomic(p_production_id UUID, p_outlet_id UUID, p_ukuran TEXT, p_tanggal DATE, p_success_qty INTEGER)`
    - Function logic:
      - Check if production_daily_id exists in inventory_sync_log (within transaction)
      - If exists, RETURN early (already synced)
      - INSERT into inventory_non_topping (outlet_id, ukuran, qty_available, production_date, status='fresh')
      - INSERT into inventory_sync_log (production_daily_id, outlet_id, ukuran, qty_synced)
      - Use SERIALIZABLE isolation level or explicit row locks to prevent race conditions
    - _Bug_Condition: isBugCondition(input) where UNIQUE_CONSTRAINT_VIOLATION occurs due to race condition_
    - _Expected_Behavior: expectedBehavior(result) where result.hasError = FALSE AND no duplicate inserts_
    - _Preservation: Offline sync and non-donat inventory unaffected_
    - _Requirements: 1.1, 2.1_

  - [ ] 4.2 Replace syncInventoryAfterProduction implementation
    - File: `app/api/production/daily/route.ts` (lines 45-105)
    - Replace current logic with call to Supabase RPC: `adminSupabase.rpc('sync_production_atomic', {...})`
    - Pass parameters: production_id, outlet_id, ukuran, tanggal, success_qty
    - Remove existing error handler for UNIQUE_CONSTRAINT_VIOLATION (line 291)
    - Handle RPC errors with proper logging
    - _Expected_Behavior: Single atomic operation, idempotent by design_
    - _Requirements: 1.1, 2.1_

  - [ ] 4.3 Add retry logic with exponential backoff
    - File: `app/api/production/daily/route.ts`
    - Wrap RPC call in retry loop (max 3 attempts)
    - Implement exponential backoff: sleep(100 * (attempt + 1)) ms between retries
    - Only retry on transient errors (network issues), not validation errors
    - Log each retry attempt
    - _Expected_Behavior: Resilient to temporary network failures_
    - _Requirements: 2.1_

  - [ ] 4.4 Update inventory_sync_log schema if needed
    - Review current inventory_sync_log table structure
    - Ensure it has: production_daily_id (FK), outlet_id, ukuran, qty_synced, synced_at timestamp
    - Add unique constraint on production_daily_id if not exists
    - Create migration if schema changes needed
    - _Requirements: 2.1_

- [ ] 5. Add real-time subscription to Riwayat Produksi

  - [ ] 5.1 Identify Riwayat Produksi component file
    - Search codebase for "Riwayat Produksi" component
    - Likely location: `app/dashboard/input-produksi/page.tsx` or separate riwayat page
    - Document exact file path for implementation
    - _Requirements: 2.4_

  - [ ] 5.2 Add Supabase Realtime subscription hook
    - In Riwayat Produksi component, add useEffect for subscription
    - Create Supabase channel: `riwayat-production-${outletId}-${Date.now()}`
    - Subscribe to postgres_changes: event='*', table='production_daily', filter=`outlet_id=eq.${outletId}`
    - On payload received, invalidate React Query cache: `queryClient.invalidateQueries(['productions', { outlet_id: outletId }])`
    - Clean up subscription on unmount
    - _Bug_Condition: isBugCondition(input) where input.riwayatSyncDelayMs > 2000_
    - _Expected_Behavior: Data appears in Riwayat within 2 seconds of Input Produksi submission_
    - _Preservation: Existing realtime subscriptions (kasir stock badge) unaffected_
    - _Requirements: 1.4, 2.4_

  - [ ] 5.3 Add loading state during realtime update
    - Create state: `const [isRealtimeUpdating, setIsRealtimeUpdating] = useState(false)`
    - In subscription callback, set isRealtimeUpdating = true before invalidating queries
    - Use setTimeout to reset to false after 500ms
    - Display subtle loading indicator in UI during update
    - _Requirements: 2.4_

  - [ ] 5.4 Add realtime connection status indicator
    - Show badge "🟢 Live" when Supabase channel status is 'SUBSCRIBED'
    - Show badge "🔴 Offline" when disconnected
    - Use channel.on('system', ...) to listen for connection state changes
    - Position indicator near Riwayat Produksi title
    - _Requirements: 2.4_

  - [ ] 5.5 Add toast notification for new production entries
    - In subscription callback, check payload.eventType === 'INSERT'
    - Show toast: `toast.info('📦 Produksi baru ditambahkan', { duration: 3000 })`
    - Only show if user is not the one who created the entry (check user session)
    - _Requirements: 2.2, 2.4_

- [ ] 6. Move stock deduction to after receipt printing

  - [ ] 6.1 Create order completion API endpoint
    - Create new file: `app/api/orders/[id]/complete/route.ts`
    - Implement PUT handler
    - Fetch order by id, validate status is 'pending'
    - Call database function `complete_order_with_stock_deduction(order_id, outlet_id)`
    - Return success response with updated order data
    - _Bug_Condition: isBugCondition(input) where input.eventType = 'sale_transaction' AND input.receiptPrinted = FALSE AND input.stockDeducted = TRUE_
    - _Expected_Behavior: Stock deducted ONLY when order status='completed'_
    - _Preservation: Non-donat order flow unchanged_
    - _Requirements: 1.6, 2.6_

  - [ ] 6.2 Create complete_order_with_stock_deduction database function
    - Create migration: `supabase/migrations/YYYYMMDDHHMMSS_complete_order_with_stock.sql`
    - Create PostgreSQL function with parameters: p_order_id UUID, p_outlet_id UUID
    - Function logic:
      - BEGIN TRANSACTION
      - UPDATE orders SET status='completed', updated_at=NOW() WHERE id=p_order_id
      - FOR each order_item WHERE product.category='donat':
        - UPDATE inventory_non_topping SET qty_available = qty_available - item.quantity
        - WHERE outlet_id=p_outlet_id AND ukuran=item.ukuran
        - ORDER BY production_date ASC, created_at ASC LIMIT 1 (FIFO)
      - COMMIT TRANSACTION
    - Handle edge case: insufficient stock (should not happen if POS validates before order)
    - _Expected_Behavior: Atomic status update + stock deduction, FIFO consumption_
    - _Requirements: 2.6_

  - [ ] 6.3 Modify order creation API to NOT deduct stock
    - File: `app/api/orders/route.ts` (or similar)
    - In POST handler, ensure order is created with status='pending'
    - Remove any stock deduction logic from order creation
    - Stock should remain unchanged when order is pending
    - Add comment: "Stock will be deducted when order is completed (after receipt printed)"
    - _Expected_Behavior: Order creation does not touch inventory_non_topping_
    - _Requirements: 2.6_

  - [ ] 6.4 Update Kasir handleProsesBayar flow
    - File: `app/dashboard/kasir/page.tsx` (around line 70-80)
    - Modify payment processing flow:
      1. Create order with status='pending' (no stock deduction)
      2. Print receipt (await printReceipt(order))
      3. If print successful, call `/api/orders/${order.id}/complete` (deduct stock)
      4. If print fails, show error and leave order as 'pending' (stock unchanged)
    - Add loading states for each step
    - Add error handling with rollback messaging
    - _Expected_Behavior: Stock deducted only after receipt confirmation_
    - _Requirements: 2.6_

  - [ ] 6.5 Handle pending order cleanup
    - Create scheduled job or manual cleanup endpoint for pending orders
    - After configurable timeout (e.g., 1 hour), mark old pending orders as 'cancelled'
    - Do NOT deduct stock for cancelled orders
    - Add admin UI to view and manage pending orders
    - _Requirements: 2.6_

- [ ] 7. Add stock restoration logic for transaction deletion

  - [ ] 7.1 Create delete_order_with_stock_restoration database function
    - Create migration: `supabase/migrations/YYYYMMDDHHMMSS_delete_order_with_stock_restoration.sql`
    - Create PostgreSQL function with parameters: p_order_id UUID, p_outlet_id UUID
    - Function logic:
      - BEGIN TRANSACTION
      - FOR each order_item WHERE product.category='donat':
        - UPDATE inventory_non_topping SET qty_available = qty_available + item.quantity
        - WHERE outlet_id=p_outlet_id AND ukuran=item.ukuran
        - ORDER BY created_at DESC LIMIT 1 (add back to most recent batch)
        - IF NOT FOUND, INSERT new batch with status='restored'
      - DELETE FROM orders WHERE id=p_order_id (cascade deletes order_items)
      - COMMIT TRANSACTION
    - Return deleted order details for frontend notification
    - _Bug_Condition: isBugCondition(input) where input.eventType = 'delete_transaction' AND input.stockRestored = FALSE_
    - _Expected_Behavior: Stock restored to inventory when completed order deleted_
    - _Preservation: Non-donat order deletion unaffected_
    - _Requirements: 1.7, 2.7_

  - [ ] 7.2 Update order DELETE API endpoint
    - File: `app/api/orders/[id]/route.ts`
    - In DELETE handler, fetch order with join to order_items and products
    - Check order.status:
      - If 'completed': call `delete_order_with_stock_restoration(order_id, outlet_id)`
      - If 'pending' or 'cancelled': simple DELETE (no stock restoration needed)
    - Return response with stockRestored: boolean flag
    - Include restoration details: { productName, ukuran, qtyRestored }[]
    - _Expected_Behavior: Stock restored only for completed orders_
    - _Requirements: 2.7_

  - [ ] 7.3 Update Transaksi component delete handler
    - File: `app/dashboard/transaksi/page.tsx`
    - Modify handleDeleteTransaction function
    - Add confirmation dialog: "Yakin hapus transaksi ini? Stok akan dikembalikan jika transaksi sudah selesai."
    - Call DELETE `/api/orders/${transactionId}`
    - Parse response to check stockRestored flag
    - If stockRestored, invalidate inventory queries to refresh stock display
    - Show appropriate toast notification with restoration details
    - _Expected_Behavior: User sees stock restoration confirmation_
    - _Requirements: 2.7_

  - [ ] 7.4 Add stock restoration audit log
    - Create table: stock_restoration_log (id, order_id, outlet_id, ukuran, qty_restored, restored_at, restored_by)
    - Insert log entry in delete_order_with_stock_restoration function
    - Add admin UI to view restoration history
    - Useful for debugging and auditing stock adjustments
    - _Requirements: 2.7_

- [ ] 8. Implement edit/delete functionality in Riwayat Produksi

  - [ ] 8.1 Create EditProductionModal component
    - Create new file: `components/production/edit-production-modal.tsx`
    - Props: { production: ProductionDaily, onClose, onSuccess }
    - Form fields: success_qty (number input), waste_qty (number input)
    - Use useUpdateProduction hook from `lib/hooks/useProduction.ts`
    - Calculate target_qty = success_qty + waste_qty
    - Display current inventory impact: delta = new_success_qty - old_success_qty
    - Add loading state during mutation
    - _Bug_Condition: isBugCondition(input) where input.eventType = 'edit_riwayat' AND input.hasError = TRUE_
    - _Expected_Behavior: Edit updates production_daily AND adjusts inventory_non_topping_
    - _Requirements: 1.5, 2.5_

  - [ ] 8.2 Update production PUT API endpoint
    - File: `app/api/production/daily/[id]/route.ts`
    - Implement PUT handler (if not exists)
    - Fetch old production record to calculate delta
    - Update production_daily with new success_qty, waste_qty, target_qty
    - Calculate qtyDelta = new_success_qty - old_success_qty
    - If qtyDelta != 0, update inventory_non_topping: qty_available += qtyDelta
    - Use transaction to ensure atomic update
    - Return updated production record
    - _Expected_Behavior: Production and inventory updated atomically_
    - _Requirements: 2.5_

  - [ ] 8.3 Add edit button to Riwayat Produksi UI
    - File: Riwayat Produksi component
    - Add "Edit" button to each production record row/card
    - On click, open EditProductionModal with production data
    - Pass onSuccess handler to refresh data after edit
    - Add permission check: only allow edit for current day production
    - _Requirements: 2.5_

  - [ ] 8.4 Implement delete functionality in Riwayat Produksi
    - Add "Delete" button to each production record
    - On click, show confirmation: "Yakin hapus data produksi ini? Stok akan dikurangi sesuai jumlah yang dihapus."
    - Use useDeleteProduction hook
    - Call DELETE `/api/production/daily/${id}`
    - Show toast notification on success/failure
    - _Requirements: 2.5_

  - [ ] 8.5 Update production DELETE API endpoint
    - File: `app/api/production/daily/[id]/route.ts`
    - Implement DELETE handler (if not exists)
    - Fetch production record
    - Reduce inventory: qty_available -= production.success_qty
    - Delete production_daily record
    - Delete corresponding inventory_sync_log entry
    - Use transaction for atomicity
    - Return success response
    - _Expected_Behavior: Production deleted and inventory adjusted_
    - _Requirements: 2.5_

  - [ ] 8.6 Add production edit/delete audit log
    - Create table: production_audit_log (id, production_id, action, old_values, new_values, changed_by, changed_at)
    - Log all edit and delete operations
    - Store old and new values for audit trail
    - Add admin UI to view production change history
    - _Requirements: 2.5_

- [ ] 9. Add success/failure notifications across all operations

  - [ ] 9.1 Update Input Produksi form submission handler
    - File: Input Produksi component
    - Wrap createMutation in try-catch
    - Before submit: show loading toast: `const toastId = toast.loading('⏳ Menyimpan data produksi...')`
    - On success: update toast: `toast.success('✓ Berhasil disimpan: {qty} donat {ukuran}', { id: toastId })`
    - On error: update toast: `toast.error('❌ Gagal: {error.message}', { id: toastId })`
    - Include production details (qty, size) in success message
    - _Bug_Condition: isBugCondition(input) where input.successNotificationShown = FALSE_
    - _Expected_Behavior: Clear feedback on every submission attempt_
    - _Requirements: 1.2, 2.2_

  - [ ] 9.2 Add notifications for edit operations
    - In EditProductionModal submit handler
    - Loading toast: "⏳ Mengupdate data..."
    - Success toast: "✓ Data berhasil diupdate"
    - Error toast: "❌ Gagal update: {error.message}"
    - Auto-close success toast after 5 seconds
    - Keep error toast until user dismisses
    - _Requirements: 2.2, 2.5_

  - [ ] 9.3 Add notifications for delete operations
    - In Riwayat Produksi delete handler
    - Loading toast: "⏳ Menghapus data..."
    - Success toast: "✓ Data berhasil dihapus"
    - Error toast: "❌ Gagal hapus: {error.message}"
    - _Requirements: 2.2, 2.5_

  - [ ] 9.4 Add notifications for transaction deletion with stock restoration
    - In Transaksi handleDeleteTransaction
    - Loading toast: "⏳ Menghapus transaksi..."
    - If stockRestored: Success toast with details: "✓ Transaksi dihapus, stok dikembalikan: +{totalQty} donat"
    - If no restoration: Simple success toast: "✓ Transaksi dihapus"
    - Error toast: "❌ Gagal hapus transaksi: {error.message}"
    - Duration: 6 seconds for restoration notifications (more info to read)
    - _Requirements: 2.2, 2.7_

  - [ ] 9.5 Add notification for lock acquisition failures
    - In Input Produksi component
    - When API returns 409 (lock not acquired)
    - Show warning toast: "⏳ Sedang memproses input lain. Silakan coba lagi dalam beberapa detik."
    - Duration: 5 seconds
    - Optionally disable submit button temporarily with countdown timer
    - _Requirements: 2.2, 2.3_

  - [ ] 9.6 Add notification for order completion
    - In Kasir handleProsesBayar
    - After successful receipt print and stock deduction
    - Success toast: "✓ Transaksi berhasil, stok telah dikurangi"
    - If receipt print fails: Error toast: "❌ Gagal mencetak struk, stok tidak dikurangi"
    - Show order details (items, total) in notification
    - _Requirements: 2.2, 2.6_

  - [ ] 9.7 Configure toast notification library
    - Verify toast library is installed (react-hot-toast or similar)
    - Configure default toast settings: position='top-right', duration=4000ms
    - Style toasts to match application theme
    - Add icons for different toast types (success ✓, error ❌, warning ⏳, info 📦)
    - Test toast behavior on mobile devices (positioning, size)
    - _Requirements: 2.2_

- [ ] 10. Verify bug condition exploration tests now pass
  - **Property 1: Expected Behavior** - Bugs Fixed
  - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
  - The tests from task 1 encode the expected behavior
  - When these tests pass, it confirms the expected behavior is satisfied
  
  - [ ] 10.1 Re-run all exploration tests
    - Execute test suite: `npm test -- production-bugs.test.ts`
    - **EXPECTED OUTCOME**: All tests PASS (confirms bugs are fixed)
    - Tests that failed before should now pass with fixed implementation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [ ] 10.2 Verify UNIQUE_CONSTRAINT_VIOLATION is eliminated
    - Run test 1.1 (concurrent production inputs)
    - Assert: Both requests succeed OR one returns clear lock message (no UNIQUE_CONSTRAINT_VIOLATION)
    - Assert: Exactly one production record created in database
    - Assert: Inventory updated exactly once
    - _Requirements: 2.1_

  - [ ] 10.3 Verify notifications are shown
    - Run test 1.2 (notification check)
    - Assert: Success toast appears after production submission
    - Assert: Toast contains production details (qty, size)
    - _Requirements: 2.2_

  - [ ] 10.4 Verify lock mechanism works
    - Run test 1.3 (concurrent submissions)
    - Assert: Only one request processes at a time
    - Assert: Other requests receive 409 with wait message
    - Assert: Inventory count remains consistent
    - _Requirements: 2.3_

  - [ ] 10.5 Verify real-time sync works
    - Run test 1.4 (real-time sync delay)
    - Assert: Data appears in Riwayat Produksi within 2 seconds
    - Assert: No manual refresh required
    - _Requirements: 2.4_

  - [ ] 10.6 Verify edit/delete works
    - Run test 1.5 (edit/delete functionality)
    - Assert: Edit operation updates production and inventory
    - Assert: Delete operation removes production and adjusts inventory
    - _Requirements: 2.5_

  - [ ] 10.7 Verify stock deduction timing is correct
    - Run test 1.6 (stock deduction before receipt)
    - Assert: Stock unchanged after order creation (status='pending')
    - Assert: Stock deducted only after order completion
    - _Requirements: 2.6_

  - [ ] 10.8 Verify stock restoration works
    - Run test 1.7 (stock not restored on delete)
    - Assert: Stock is restored when completed order deleted
    - Assert: Restoration amount matches original deduction
    - _Requirements: 2.7_

- [ ] 11. Verify preservation tests still pass
  - **Property 2: Preservation** - Non-buggy Behavior Unchanged
  - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
  - Run preservation property tests from step 2
  - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)
  - Confirm all tests still pass after fix (no regressions introduced)
  
  - [ ] 11.1 Re-run all preservation tests
    - Execute test suite: `npm test -- preservation.test.ts`
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ] 11.2 Verify offline mode still works
    - Run test 2.1 (offline mode behavior)
    - Assert: Offline queue works identically to before
    - Assert: Sync on reconnect functions correctly
    - _Requirements: 3.1_

  - [ ] 11.3 Verify non-donat products unaffected
    - Run test 2.2 (non-donat transactions)
    - Assert: Non-donat orders process identically
    - Assert: Stock management unchanged for non-donat
    - _Requirements: 3.2, 3.5_

  - [ ] 11.4 Verify stock badge updates still work
    - Run test 2.3 (stock header badge)
    - Assert: Badge updates within 2 seconds of stock change
    - Assert: Realtime subscription still functional
    - _Requirements: 3.3_

  - [ ] 11.5 Verify HPP calculation unchanged
    - Run test 2.4 (HPP formula)
    - Assert: HPP = Harga Donat Polos + Harga Topping
    - Assert: All topping combinations calculated correctly
    - _Requirements: 3.4_

  - [ ] 11.6 Verify multi-outlet independence maintained
    - Run test 2.5 (outlet isolation)
    - Assert: Production in one outlet doesn't affect others
    - Assert: Stock remains independent per outlet
    - _Requirements: 3.6_

  - [ ] 11.7 Verify channel pricing unchanged
    - Run test 2.6 (channel pricing)
    - Assert: All channels (toko, gofood, grabfood, shopee, tiktok) price correctly
    - Assert: Pricing follows configuration
    - _Requirements: 3.7_

## Additional Testing & Validation

- [ ] 12. Unit tests for new utilities

  - [ ] 12.1 Test advisory lock utility
    - Test file: `__tests__/unit/advisory-lock.test.ts`
    - Test lock acquisition success
    - Test lock acquisition timeout
    - Test lock release
    - Test concurrent lock attempts (second should wait or fail)
    - Mock Supabase RPC or Redis calls
    - _Requirements: 2.3_

  - [ ] 12.2 Test syncInventoryAfterProduction idempotency
    - Test file: `__tests__/unit/sync-inventory.test.ts`
    - Test first sync creates inventory record
    - Test duplicate sync is skipped (idempotent)
    - Test sync with invalid data fails gracefully
    - Mock database calls
    - _Requirements: 2.1_

  - [ ] 12.3 Test stock deduction calculation
    - Test file: `__tests__/unit/stock-deduction.test.ts`
    - Test single-item order deduction
    - Test multi-item order deduction
    - Test mixed donat/non-donat order (only donat deducted)
    - Test insufficient stock handling
    - Test FIFO consumption order
    - _Requirements: 2.6_

  - [ ] 12.4 Test stock restoration calculation
    - Test file: `__tests__/unit/stock-restoration.test.ts`
    - Test single-item restoration
    - Test multi-item restoration
    - Test restoration with non-existent batch (creates new batch)
    - Test restoration to most recent batch
    - _Requirements: 2.7_

  - [ ] 12.5 Test production edit delta calculation
    - Test file: `__tests__/unit/production-edit.test.ts`
    - Test positive delta (increase qty)
    - Test negative delta (decrease qty)
    - Test zero delta (no change)
    - Test inventory update matches delta
    - _Requirements: 2.5_

- [ ] 13. Integration tests for complete flows

  - [ ] 13.1 Test full production input flow
    - Test file: `__tests__/integration/production-flow.test.ts`
    - Submit production via Input Produksi
    - Verify data in production_daily table
    - Verify inventory_non_topping updated
    - Verify inventory_sync_log created
    - Verify data appears in Riwayat Produksi (realtime)
    - Verify success notification shown
    - _Requirements: 2.1, 2.2, 2.4_

  - [ ] 13.2 Test full order completion flow
    - Test file: `__tests__/integration/order-flow.test.ts`
    - Create order (status='pending', stock unchanged)
    - Complete order (mock receipt print success)
    - Verify order status='completed'
    - Verify stock deducted
    - Verify FIFO consumption (oldest batch used first)
    - _Requirements: 2.6_

  - [ ] 13.3 Test full order deletion flow
    - Test file: `__tests__/integration/order-delete-flow.test.ts`
    - Create and complete order (stock deducted)
    - Delete order
    - Verify order removed from database
    - Verify stock restored to inventory
    - Verify restoration notification shown
    - _Requirements: 2.7_

  - [ ] 13.4 Test production edit flow
    - Test file: `__tests__/integration/production-edit-flow.test.ts`
    - Create production entry
    - Edit success_qty (increase and decrease scenarios)
    - Verify production_daily updated
    - Verify inventory adjusted by delta
    - Verify changes sync to all clients (realtime)
    - _Requirements: 2.5_

  - [ ] 13.5 Test concurrent production submissions
    - Test file: `__tests__/integration/concurrent-production.test.ts`
    - Submit 5 production requests simultaneously to same outlet/date/size
    - Verify all requests eventually succeed or receive clear messages
    - Verify exactly 5 production records created
    - Verify inventory increased by sum of all submissions
    - Verify no UNIQUE_CONSTRAINT_VIOLATION errors
    - _Requirements: 2.1, 2.3_

  - [ ] 13.6 Test multi-outlet independence
    - Test file: `__tests__/integration/multi-outlet.test.ts`
    - Create production in outlet A
    - Verify outlet A stock increased
    - Verify outlet B stock unchanged
    - Create order in outlet B
    - Verify outlet B stock decreased
    - Verify outlet A stock unchanged
    - _Requirements: 3.6_

  - [ ] 13.7 Test offline to online sync
    - Test file: `__tests__/integration/offline-sync.test.ts`
    - Mock offline state
    - Submit production (queued locally)
    - Mock online state
    - Trigger sync
    - Verify production created in database
    - Verify inventory updated
    - Verify sync behavior identical to before fix
    - _Requirements: 3.1_

- [ ] 14. End-to-end manual testing

  - [ ] 14.1 Test production input workflow (online)
    - As kasir, open Input Produksi menu
    - Submit production: 100 donat standar
    - Verify success notification appears within 3 seconds
    - Verify no console errors
    - Open Riwayat Produksi menu
    - Verify production appears immediately (no refresh needed)
    - Check stock badge in Kasir header
    - Verify stock increased by 100
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 14.2 Test concurrent production submissions
    - Open two browser windows (simulate two kasir)
    - Both submit production simultaneously to same outlet
    - Verify both succeed OR one receives clear wait message
    - Verify no UNIQUE_CONSTRAINT_VIOLATION in console
    - Verify inventory count is accurate (sum of both submissions)
    - _Requirements: 2.1, 2.3_

  - [ ] 14.3 Test edit production in Riwayat Produksi
    - Open Riwayat Produksi menu
    - Find recent production entry
    - Click Edit button
    - Change success_qty from 100 to 150
    - Submit edit
    - Verify success notification
    - Verify production record updated
    - Verify stock increased by 50 (delta)
    - Verify change syncs to Input Produksi menu (realtime)
    - _Requirements: 2.5_

  - [ ] 14.4 Test delete production in Riwayat Produksi
    - Open Riwayat Produksi menu
    - Find production entry
    - Click Delete button
    - Confirm deletion
    - Verify success notification
    - Verify production removed from list
    - Verify stock decreased accordingly
    - _Requirements: 2.5_

  - [ ] 14.5 Test order completion flow in Kasir
    - Open Kasir/POS menu
    - Note initial stock quantity
    - Add 20 donat standar to cart
    - Click "Bayar" (payment)
    - Verify stock still unchanged (order pending)
    - Complete payment and print receipt
    - Verify success notification
    - Verify stock now decreased by 20
    - Verify order status='completed' in database
    - _Requirements: 2.6_

  - [ ] 14.6 Test transaction deletion with stock restoration
    - Open Menu Transaksi
    - Find completed donat order
    - Note current stock quantity
    - Click Delete on transaction
    - Confirm deletion
    - Verify notification shows stock restoration: "+20 donat"
    - Verify stock increased by deleted quantity
    - Open Kasir to check stock badge updated
    - _Requirements: 2.7_

  - [ ] 14.7 Test offline mode preservation
    - Disconnect internet (simulate offline)
    - Submit production in Input Produksi
    - Verify data queued locally
    - Reconnect internet
    - Verify data syncs automatically
    - Verify behavior identical to before fix
    - _Requirements: 3.1_

  - [ ] 14.8 Test non-donat product operations
    - Open Kasir menu
    - Create order with non-donat products only
    - Complete order and print receipt
    - Verify stock management works as before
    - Delete the order
    - Verify stock restoration (if applicable)
    - Verify no behavior changes for non-donat
    - _Requirements: 3.2, 3.5_

  - [ ] 14.9 Test multi-outlet isolation
    - Login as kasir for Outlet A
    - Submit production: 100 donat standar
    - Verify Outlet A stock increased
    - Login as kasir for Outlet B (different browser/session)
    - Verify Outlet B stock unchanged
    - Submit production in Outlet B: 50 donat standar
    - Verify Outlet B stock increased by 50
    - Verify Outlet A stock still 100 (unchanged)
    - _Requirements: 3.6_

  - [ ] 14.10 Test all channel pricing still works
    - Create orders with different channels:
      - Toko (in-store)
      - GoFood
      - GrabFood
      - Shopee
      - TikTok
    - Verify each order uses correct channel pricing
    - Verify HPP calculation unchanged
    - Verify no pricing anomalies introduced
    - _Requirements: 3.4, 3.7_

- [ ] 15. Performance and stress testing

  - [ ] 15.1 Test production input latency
    - Measure time from submit button click to success notification
    - Target: < 3 seconds for production input
    - Test with various production quantities (10, 100, 1000)
    - Verify latency remains consistent
    - _Requirements: 2.1_

  - [ ] 15.2 Test realtime sync latency
    - Measure time from Input Produksi submission to Riwayat Produksi update
    - Target: < 2 seconds for realtime propagation
    - Test with multiple clients subscribed
    - Verify sync speed doesn't degrade with multiple subscribers
    - _Requirements: 2.4_

  - [ ] 15.3 Test concurrent user load
    - Simulate 10 concurrent kasir submitting production
    - Verify all submissions eventually succeed
    - Verify no deadlocks from advisory locks
    - Verify inventory accuracy maintained
    - Monitor database connection pool usage
    - _Requirements: 2.3_

  - [ ] 15.4 Test lock acquisition under high contention
    - Simulate 50 concurrent requests to same lock key
    - Verify locks are acquired and released properly
    - Verify no lock leaks (all locks eventually released)
    - Verify timeout mechanism works (requests fail after 5 seconds if lock unavailable)
    - _Requirements: 2.3_

  - [ ] 15.5 Test database query performance
    - Profile syncInventoryAfterProduction query time
    - Profile stock deduction query time (FIFO lookup)
    - Profile stock restoration query time
    - Ensure all queries use proper indexes
    - Target: All queries < 100ms
    - _Requirements: 2.1, 2.6, 2.7_

- [ ] 16. Database migrations and schema validation

  - [ ] 16.1 Create advisory lock migration
    - File: `supabase/migrations/YYYYMMDDHHMMSS_add_advisory_lock.sql`
    - Create helper function for pg_advisory_lock if needed
    - Test migration up and down
    - _Requirements: 2.3_

  - [ ] 16.2 Create sync_production_atomic migration
    - File: `supabase/migrations/YYYYMMDDHHMMSS_sync_production_atomic.sql`
    - Create function with proper transaction isolation
    - Grant execute permissions to appropriate roles
    - Test migration up and down
    - _Requirements: 2.1_

  - [ ] 16.3 Create complete_order_with_stock_deduction migration
    - File: `supabase/migrations/YYYYMMDDHHMMSS_complete_order_with_stock.sql`
    - Create function with FIFO logic
    - Handle edge cases (insufficient stock)
    - Test migration up and down
    - _Requirements: 2.6_

  - [ ] 16.4 Create delete_order_with_stock_restoration migration
    - File: `supabase/migrations/YYYYMMDDHHMMSS_delete_order_with_stock_restoration.sql`
    - Create function with restoration logic
    - Handle case where no batch exists (create new batch)
    - Test migration up and down
    - _Requirements: 2.7_

  - [ ] 16.5 Verify inventory_sync_log schema
    - Ensure unique constraint on production_daily_id exists
    - Add index on (outlet_id, ukuran) if not exists
    - Add timestamps (synced_at) if missing
    - Create migration if schema changes needed
    - _Requirements: 2.1_

  - [ ] 16.6 Create audit log tables
    - Create stock_restoration_log table
    - Create production_audit_log table
    - Add appropriate indexes and foreign keys
    - Grant permissions to appropriate roles
    - _Requirements: 2.5, 2.7_

  - [ ] 16.7 Run all migrations on staging environment
    - Apply all new migrations to staging database
    - Verify no errors during migration
    - Test rollback migrations (down)
    - Verify database functions work as expected
    - _Requirements: All implementation requirements_

- [ ] 17. Code review and documentation

  - [ ] 17.1 Add inline code comments
    - Document advisory lock mechanism and purpose
    - Document idempotency checks in syncInventoryAfterProduction
    - Document FIFO logic in stock deduction
    - Document stock restoration logic
    - Explain why stock deduction moved to completion phase
    - _Requirements: All implementation requirements_

  - [ ] 17.2 Update API documentation
    - Document new `/api/orders/[id]/complete` endpoint
    - Document updated `/api/orders/[id]` DELETE behavior (stock restoration)
    - Document updated `/api/production/daily` POST behavior (locking)
    - Document updated `/api/production/daily/[id]` PUT and DELETE endpoints
    - Include request/response examples
    - _Requirements: All implementation requirements_

  - [ ] 17.3 Update component documentation
    - Document EditProductionModal props and usage
    - Document realtime subscription setup in Riwayat Produksi
    - Document notification patterns used throughout
    - Document lock acquisition handling in UI
    - _Requirements: 2.2, 2.4, 2.5_

  - [ ] 17.4 Create deployment checklist
    - List all migrations that need to run
    - List environment variables that need to be set (if any)
    - List feature flags or configuration changes
    - List manual testing steps before going live
    - List rollback procedure if issues occur
    - _Requirements: All implementation requirements_

  - [ ] 17.5 Update README or development docs
    - Document the bug condition methodology used
    - Explain the exploration → preservation → implementation workflow
    - Document testing strategy (property-based tests for preservation)
    - Provide examples of how to run tests
    - Document new database functions and their purpose
    - _Requirements: All implementation requirements_

- [ ] 18. Final checkpoint - Ensure all tests pass

  - [ ] 18.1 Run full test suite
    - Execute: `npm test`
    - Verify all unit tests pass
    - Verify all integration tests pass
    - Verify all property-based tests pass
    - Fix any failing tests
    - _Requirements: All requirements_

  - [ ] 18.2 Run type checking
    - Execute: `npm run type-check` or `tsc --noEmit`
    - Fix any TypeScript errors
    - Verify all new code is properly typed
    - _Requirements: All implementation requirements_

  - [ ] 18.3 Run linting
    - Execute: `npm run lint`
    - Fix any linting errors
    - Ensure code style is consistent
    - _Requirements: All implementation requirements_

  - [ ] 18.4 Verify code coverage
    - Execute: `npm run test:coverage`
    - Verify coverage meets project standards (e.g., >80%)
    - Add tests for uncovered critical paths
    - _Requirements: All requirements_

  - [ ] 18.5 Manual smoke test on staging
    - Deploy to staging environment
    - Run through all manual test scenarios (task 14)
    - Verify no regressions in existing functionality
    - Verify all 7 bugs are fixed
    - Get sign-off from product owner or stakeholder
    - _Requirements: All requirements_

  - [ ] 18.6 Ask user if any questions arise
    - Review implementation for any unclear requirements
    - Clarify edge cases with user if needed
    - Confirm production deployment timeline
    - Document any outstanding concerns or risks
    - _Requirements: All requirements_

## Task Dependency Graph

The tasks have the following dependency structure:

```json
{
  "waves": [
    {
      "name": "Exploration Phase",
      "description": "Write bug condition exploration tests BEFORE implementing fix",
      "tasks": ["1", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", "1.8"]
    },
    {
      "name": "Preservation Phase",
      "description": "Write preservation property tests BEFORE implementing fix",
      "tasks": ["2", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7"],
      "dependsOn": ["Exploration Phase"]
    },
    {
      "name": "Implementation Phase",
      "description": "Apply fixes with understanding from exploration",
      "tasks": ["3", "3.1", "3.2", "3.3", "3.4", "4", "4.1", "4.2", "4.3", "4.4", "5", "5.1", "5.2", "5.3", "5.4", "5.5", "6", "6.1", "6.2", "6.3", "6.4", "6.5", "7", "7.1", "7.2", "7.3", "7.4", "8", "8.1", "8.2", "8.3", "8.4", "8.5", "8.6", "9", "9.1", "9.2", "9.3", "9.4", "9.5", "9.6", "9.7"],
      "dependsOn": ["Preservation Phase"]
    },
    {
      "name": "Verification Phase",
      "description": "Verify exploration and preservation tests pass",
      "tasks": ["10", "10.1", "10.2", "10.3", "10.4", "10.5", "10.6", "10.7", "10.8", "11", "11.1", "11.2", "11.3", "11.4", "11.5", "11.6", "11.7"],
      "dependsOn": ["Implementation Phase"]
    },
    {
      "name": "Testing Phase",
      "description": "Manual, performance, and integration testing",
      "tasks": ["12", "12.1", "12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "13", "13.1", "13.2", "13.3", "13.4", "13.5", "14", "14.1", "14.2", "14.3", "14.4", "14.5", "14.6", "14.7"],
      "dependsOn": ["Verification Phase"]
    },
    {
      "name": "UAT and Review",
      "description": "User acceptance testing and code review",
      "tasks": ["15", "15.1", "15.2", "15.3", "15.4", "15.5", "15.6", "15.7", "16", "16.1", "16.2", "16.3", "16.4", "16.5"],
      "dependsOn": ["Testing Phase"]
    },
    {
      "name": "Documentation and Finalization",
      "description": "Document changes and final checkpoint",
      "tasks": ["17", "17.1", "17.2", "17.3", "17.4", "17.5", "18", "18.1", "18.2", "18.3", "18.4", "18.5", "18.6"],
      "dependsOn": ["UAT and Review"]
    }
  ]
}
```

**Critical Path:**
1. Exploration tests → 2. Preservation tests → 3-9. Implementation → 10. Verify exploration tests → 11. Verify preservation tests → 18. Final checkpoint

**Parallel Work Opportunities:**
- Tasks 3-9 (all implementation tasks) can be worked on in parallel after exploration and preservation tests are complete
- Task 17 (documentation) can start as soon as implementation tasks complete, parallel with testing phases

## Notes

### Bug Condition Methodology

This implementation uses the bug condition methodology where:
- **C(X)**: Bug Condition - identifies inputs that trigger the bug (online donat stock operations)
- **P(result)**: Property - desired behavior for buggy inputs (idempotent sync, real-time updates, proper timing)
- **¬C(X)**: Non-buggy inputs that should be preserved (offline mode, non-donat products)
- **F**: Original (unfixed) function
- **F'**: Fixed function

### Testing Strategy

**Exploration Tests (Property 1):**
- MUST FAIL on unfixed code (confirms bugs exist)
- Written BEFORE implementation
- Encode expected behavior
- Will PASS after fix is applied

**Preservation Tests (Property 2):**
- MUST PASS on unfixed code (confirms baseline behavior)
- Use property-based testing for stronger guarantees
- Follow observation-first methodology
- Will continue to PASS after fix

### Key Technical Decisions

1. **Advisory Locks**: Using PostgreSQL pg_advisory_lock for distributed locking (outlet_id + date + size scope)
2. **Atomic Sync**: Database stored procedure for idempotent inventory sync
3. **Realtime Sync**: Supabase Realtime subscriptions for Input Produksi ↔ Riwayat Produksi
4. **Stock Timing**: Order status='completed' triggers stock deduction (after receipt printed)
5. **Stock Restoration**: Automatic restoration on completed transaction deletion
6. **Notifications**: Toast notifications with clear success/failure messages for all operations

### Database Migrations Required

1. `add_advisory_lock.sql` - Advisory lock helper function
2. `sync_production_atomic.sql` - Atomic sync function with idempotency
3. `complete_order_with_stock.sql` - Order completion with stock deduction (FIFO)
4. `delete_order_with_restoration.sql` - Transaction deletion with stock restoration
5. `production_audit_log.sql` - Audit table for production edits/deletes
6. `stock_restoration_log.sql` - Audit table for stock restorations

### Risk Mitigation

- **Lock Timeout**: 5-second timeout on advisory locks prevents indefinite blocking
- **Retry Logic**: 3-attempt retry with exponential backoff for transient failures
- **Rollback Plan**: All changes in database functions can be rolled back independently
- **Gradual Rollout**: Can enable lock mechanism per outlet for gradual deployment
- **Monitoring**: Add logging for lock acquisition failures and sync errors

### Performance Considerations

- Advisory locks scoped to specific outlet+date+size to minimize blocking
- Real-time subscriptions filtered by outlet_id to reduce network traffic
- Database functions reduce round-trip calls (single RPC vs multiple queries)
- Property-based tests may take longer to run (generate many test cases) - run separately from unit tests

### Offline Mode Preservation

All changes are scoped to online operations only. Offline mode continues to use existing queue mechanism without modifications. The `isOnline` check ensures fixes only apply when connected.
