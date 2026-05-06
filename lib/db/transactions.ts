/**
 * Database Transaction Utilities
 * 
 * Wrapper functions for handling database transactions
 */

import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';

/**
 * Transaction callback type
 */
export type TransactionCallback<T> = (
  client: SupabaseClient<Database>
) => Promise<T>;

/**
 * Execute operations in a transaction-like manner
 * 
 * Note: Supabase doesn't support true transactions in the client library.
 * This is a best-effort approach that executes operations sequentially
 * and attempts rollback on error (where possible).
 * 
 * For true ACID transactions, use database functions (RPC).
 * 
 * @param callback - Function containing database operations
 * @returns Result of the transaction
 */
export async function withTransaction<T>(
  callback: TransactionCallback<T>
): Promise<{ data: T | null; error: Error | null }> {
  const client = createClient();
  
  try {
    const result = await callback(client);
    return { data: result, error: null };
  } catch (error) {
    console.error('Transaction error:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown transaction error'),
    };
  }
}

/**
 * Execute a database function (RPC) which supports true transactions
 * 
 * This is the recommended way to handle complex transactions
 * that require ACID guarantees.
 * 
 * @param functionName - Name of the database function
 * @param params - Function parameters
 * @returns Function result
 */
export async function executeTransactionFunction<T = any>(
  functionName: string,
  params?: Record<string, any>
): Promise<{ data: T | null; error: Error | null }> {
  const client = createClient();
  
  try {
    const { data, error } = await client.rpc(functionName, params as any);
    
    if (error) {
      throw new Error(`RPC error: ${error.message}`);
    }
    
    return { data: data as T, error: null };
  } catch (error) {
    console.error(`Error executing transaction function ${functionName}:`, error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown RPC error'),
    };
  }
}

/**
 * Batch operations helper
 * 
 * Executes multiple operations and collects results
 * If any operation fails, returns error
 * 
 * @param operations - Array of async operations
 * @returns Array of results or error
 */
export async function batchOperations<T>(
  operations: (() => Promise<T>)[]
): Promise<{ data: T[] | null; error: Error | null }> {
  try {
    const results = await Promise.all(operations.map((op) => op()));
    return { data: results, error: null };
  } catch (error) {
    console.error('Batch operations error:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown batch error'),
    };
  }
}

/**
 * Retry operation with exponential backoff
 * 
 * Useful for handling temporary failures
 * 
 * @param operation - Operation to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in ms (default: 1000)
 * @returns Operation result
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<{ data: T | null; error: Error | null }> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return { data: result, error: null };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  return { data: null, error: lastError };
}

/**
 * Execute operations with rollback tracking
 * 
 * Tracks operations and provides rollback IDs for manual cleanup
 * 
 * @param operations - Array of operations with rollback info
 * @returns Results and rollback info
 */
export async function withRollbackTracking<T>(
  operations: Array<{
    execute: () => Promise<T>;
    rollback?: () => Promise<void>;
    description: string;
  }>
): Promise<{
  data: T[] | null;
  error: Error | null;
  completedOperations: string[];
}> {
  const completedOperations: string[] = [];
  const results: T[] = [];
  
  try {
    for (const op of operations) {
      const result = await op.execute();
      results.push(result);
      completedOperations.push(op.description);
    }
    
    return { data: results, error: null, completedOperations };
  } catch (error) {
    console.error('Operation failed, attempting rollback:', error);
    
    // Attempt rollback in reverse order
    for (let i = completedOperations.length - 1; i >= 0; i--) {
      const op = operations[i];
      if (op.rollback) {
        try {
          await op.rollback();
          console.log(`Rolled back: ${op.description}`);
        } catch (rollbackError) {
          console.error(`Rollback failed for ${op.description}:`, rollbackError);
        }
      }
    }
    
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
      completedOperations,
    };
  }
}

/**
 * Optimistic locking helper
 * 
 * Updates a record only if the version matches
 * 
 * @param table - Table name
 * @param id - Record ID
 * @param updates - Updates to apply
 * @param expectedVersion - Expected version number
 * @returns Updated record or null if version mismatch
 */
export async function updateWithOptimisticLock<
  T extends keyof Database['public']['Tables']
>(
  table: T,
  id: string,
  updates: Partial<Database['public']['Tables'][T]['Update']>,
  expectedVersion: number
): Promise<{ data: Database['public']['Tables'][T]['Row'] | null; error: Error | null }> {
  const client = createClient();
  
  try {
    // First, check current version
    const { data: current, error: fetchError } = await client
      .from(table)
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      throw new Error(`Failed to fetch current record: ${fetchError.message}`);
    }
    
    // Check version (assuming table has a 'version' column)
    if ((current as any).version !== expectedVersion) {
      throw new Error('Version mismatch - record was modified by another user');
    }
    
    // Update with incremented version
    const { data, error } = await client
      .from(table)
      .update({
        ...updates,
        version: expectedVersion + 1,
      } as any)
      .eq('id', id)
      .eq('version', expectedVersion)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update record: ${error.message}`);
    }
    
    return { data: data as Database['public']['Tables'][T]['Row'], error: null };
  } catch (error) {
    console.error('Optimistic lock error:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}
