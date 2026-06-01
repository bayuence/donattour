/**
 * Transaction Wrapper Utilities
 * 
 * Provides transaction management for complex database operations
 * 
 * Features:
 * - Atomic operations
 * - Rollback on error
 * - Type-safe transaction context
 * - Error handling and logging
 * 
 * Note: Supabase doesn't support traditional transactions in the client SDK.
 * This module provides a pattern for handling multi-step operations with
 * manual rollback logic.
 */

import { supabase as typedSupabase } from '@/lib/supabase/client';
const supabase = typedSupabase as any;

/**
 * Transaction context for tracking operations
 */
interface TransactionContext {
  operations: Array<{
    table: string;
    operation: 'insert' | 'update' | 'delete';
    id?: string;
    data?: any;
  }>;
  rollbackActions: Array<() => Promise<void>>;
}

/**
 * Transaction error class
 */
export class TransactionError extends Error {
  constructor(
    message: string,
    public readonly originalError?: any,
    public readonly failedOperation?: string
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

/**
 * Execute a transaction with automatic rollback on error
 * 
 * @param callback - Transaction callback function
 * @returns Transaction result
 * 
 * @example
 * ```typescript
 * const result = await executeTransaction(async (ctx) => {
 *   // Step 1: Create production record
 *   const production = await createProductionWithRollback(ctx, data);
 *   
 *   // Step 2: Create waste details
 *   const wasteDetails = await createWasteDetailsWithRollback(ctx, production.id, details);
 *   
 *   return { production, wasteDetails };
 * });
 * ```
 */
export async function executeTransaction<T>(
  callback: (ctx: TransactionContext) => Promise<T>
): Promise<T> {
  const ctx: TransactionContext = {
    operations: [],
    rollbackActions: [],
  };

  try {
    const result = await callback(ctx);
    return result;
  } catch (error) {
    console.error('Transaction failed, rolling back...', error);
    
    // Execute rollback actions in reverse order
    for (let i = ctx.rollbackActions.length - 1; i >= 0; i--) {
      try {
        await ctx.rollbackActions[i]();
      } catch (rollbackError) {
        console.error('Rollback action failed:', rollbackError);
      }
    }

    throw new TransactionError(
      'Transaction failed and was rolled back',
      error,
      ctx.operations[ctx.operations.length - 1]?.table
    );
  }
}

/**
 * Insert record with rollback support
 * 
 * @param ctx - Transaction context
 * @param table - Table name
 * @param data - Data to insert
 * @returns Inserted record
 */
export async function insertWithRollback<T = any>(
  ctx: TransactionContext,
  table: string,
  data: any
): Promise<T> {
  const { data: insertedData, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();

  if (error) {
    throw new TransactionError(
      `Failed to insert into ${table}`,
      error,
      table
    );
  }

  const insertedDataAny = insertedData as any;

  // Add rollback action
  ctx.rollbackActions.push(async () => {
    await supabase.from(table).delete().eq('id', insertedDataAny.id);
  });

  ctx.operations.push({
    table,
    operation: 'insert',
    id: insertedDataAny.id,
    data: insertedData,
  });

  return insertedData as T;
}

/**
 * Update record with rollback support
 * 
 * @param ctx - Transaction context
 * @param table - Table name
 * @param id - Record ID
 * @param updates - Updates to apply
 * @returns Updated record
 */
export async function updateWithRollback<T = any>(
  ctx: TransactionContext,
  table: string,
  id: string,
  updates: any
): Promise<T> {
  // Fetch original data for rollback
  const { data: originalData, error: fetchError } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    throw new TransactionError(
      `Failed to fetch original data from ${table}`,
      fetchError,
      table
    );
  }

  // Perform update
  const { data: updatedData, error: updateError } = await supabase
    .from(table)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    throw new TransactionError(
      `Failed to update ${table}`,
      updateError,
      table
    );
  }

  // Add rollback action
  ctx.rollbackActions.push(async () => {
    await supabase.from(table).update(originalData).eq('id', id);
  });

  ctx.operations.push({
    table,
    operation: 'update',
    id,
    data: updatedData,
  });

  return updatedData as T;
}

/**
 * Delete record with rollback support
 * 
 * @param ctx - Transaction context
 * @param table - Table name
 * @param id - Record ID
 */
export async function deleteWithRollback(
  ctx: TransactionContext,
  table: string,
  id: string
): Promise<void> {
  // Fetch original data for rollback
  const { data: originalData, error: fetchError } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) {
    throw new TransactionError(
      `Failed to fetch original data from ${table}`,
      fetchError,
      table
    );
  }

  // Perform delete
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq('id', id);

  if (deleteError) {
    throw new TransactionError(
      `Failed to delete from ${table}`,
      deleteError,
      table
    );
  }

  // Add rollback action
  ctx.rollbackActions.push(async () => {
    await supabase.from(table).insert(originalData);
  });

  ctx.operations.push({
    table,
    operation: 'delete',
    id,
  });
}

/**
 * Batch insert with rollback support
 * 
 * @param ctx - Transaction context
 * @param table - Table name
 * @param dataArray - Array of data to insert
 * @returns Inserted records
 */
export async function batchInsertWithRollback<T = any>(
  ctx: TransactionContext,
  table: string,
  dataArray: any[]
): Promise<T[]> {
  if (dataArray.length === 0) {
    return [];
  }

  const { data: insertedData, error } = await supabase
    .from(table)
    .insert(dataArray as any)
    .select();

  if (error) {
    throw new TransactionError(
      `Failed to batch insert into ${table}`,
      error,
      table
    );
  }

  // Add rollback action
  const ids = insertedData.map((item: any) => item.id);
  ctx.rollbackActions.push(async () => {
    await supabase.from(table).delete().in('id', ids);
  });

  ctx.operations.push({
    table,
    operation: 'insert',
    data: insertedData,
  });

  return insertedData as T[];
}

// ============================================================================
// PRODUCTION TRACKING SPECIFIC TRANSACTIONS
// ============================================================================

/**
 * Create production daily with waste details (atomic operation)
 * 
 * @param productionData - Production daily data
 * @param wasteDetails - Waste details array
 * @returns Created production with waste details
 */
export async function createProductionTransaction(
  productionData: any,
  wasteDetails: any[]
) {
  return executeTransaction(async (ctx) => {
    // Step 1: Insert production_daily
    const production = await insertWithRollback(
      ctx,
      'production_daily',
      productionData
    );

    // Step 2: Insert waste details if any
    let waste: any[] = [];
    if (wasteDetails.length > 0) {
      const wasteDetailsWithId = wasteDetails.map(detail => ({
        ...detail,
        production_daily_id: production.id,
      }));

      waste = await batchInsertWithRollback(
        ctx,
        'production_waste_details',
        wasteDetailsWithId
      );
    }

    return {
      production,
      waste_details: waste,
    };
  });
}

/**
 * Create daily closing with all related data (atomic operation)
 * 
 * @param closingData - Daily closing data
 * @param nonToppingStatus - Non-topping status array
 * @param finishedProducts - Finished products array
 * @returns Created closing with all related data
 */
export async function createClosingTransaction(
  closingData: any,
  nonToppingStatus: any[],
  finishedProducts: any[]
) {
  return executeTransaction(async (ctx) => {
    // Step 1: Insert daily_closing
    const closing = await insertWithRollback(
      ctx,
      'daily_closing',
      closingData
    );

    // Step 2: Insert non-topping status
    const nonToppingStatusWithId = nonToppingStatus.map(status => ({
      ...status,
      daily_closing_id: closing.id,
    }));

    const nonToppingData = await batchInsertWithRollback(
      ctx,
      'closing_non_topping_status',
      nonToppingStatusWithId
    );

    // Step 3: Insert finished products
    const finishedProductsWithId = finishedProducts.map(product => ({
      ...product,
      daily_closing_id: closing.id,
    }));

    const finishedProductsData = await batchInsertWithRollback(
      ctx,
      'closing_finished_products',
      finishedProductsWithId
    );

    // Step 4: Calculate and insert loss summary
    const lossSummary = calculateLossSummary(
      closing.outlet_id,
      closing.tanggal,
      nonToppingData,
      finishedProductsData
    );

    const lossSummaryData = await insertWithRollback(
      ctx,
      'daily_loss_summary',
      lossSummary
    );

    return {
      closing,
      non_topping_status: nonToppingData,
      finished_products: finishedProductsData,
      loss_summary: lossSummaryData,
    };
  });
}

/**
 * Calculate loss summary from closing data
 */
function calculateLossSummary(
  outlet_id: string,
  tanggal: string,
  nonToppingStatus: any[],
  finishedProducts: any[]
) {
  const non_topping_expired_loss = nonToppingStatus.reduce(
    (sum, item) => sum + (item.hpp_loss_expired || 0),
    0
  );

  const finished_product_reject_loss = finishedProducts.reduce(
    (sum, item) => sum + (item.hpp_topping_loss || 0),
    0
  );

  const total_waste_qty =
    nonToppingStatus.reduce((sum, item) => sum + (item.qty_expired || 0), 0) +
    finishedProducts.reduce((sum, item) => sum + (item.qty_reject || 0), 0);

  return {
    outlet_id,
    tanggal,
    production_waste_loss: 0, // Will be calculated from production_daily
    topping_error_loss: 0, // Will be calculated from topping_errors
    non_topping_expired_loss,
    finished_product_reject_loss,
    total_waste_qty,
  };
}

/**
 * Update inventory with transaction support
 * 
 * @param inventoryUpdates - Array of inventory updates
 * @returns Updated inventory records
 */
export async function updateInventoryTransaction(
  inventoryUpdates: Array<{
    id: string;
    qty_change: number;
  }>
) {
  return executeTransaction(async (ctx) => {
    const results = [];

    for (const update of inventoryUpdates) {
      // Fetch current inventory
      const { data: currentInventory, error: fetchError } = await supabase
        .from('inventory_non_topping')
        .select('*')
        .eq('id', update.id)
        .single();

      if (fetchError) {
        throw new TransactionError(
          'Failed to fetch inventory',
          fetchError,
          'inventory_non_topping'
        );
      }

      const currentInvAny = currentInventory as any;

      // Calculate new quantity
      const newQty = currentInvAny.qty_available + update.qty_change;

      if (newQty < 0) {
        throw new TransactionError(
          'Insufficient inventory',
          { currentQty: currentInvAny.qty_available, change: update.qty_change },
          'inventory_non_topping'
        );
      }

      // Update inventory
      const updatedInventory = await updateWithRollback(
        ctx,
        'inventory_non_topping',
        update.id,
        {
          qty_available: newQty,
          last_updated: new Date().toISOString(),
        }
      );

      results.push(updatedInventory);
    }

    return results;
  });
}
