import { supabase } from '../supabase'
import type { ProductionBatchWithDetails, BatchStatus } from '../types'

// ─── Production Batches ──────────────────────────────────────

export async function getProductionBatches(
  status?: BatchStatus
): Promise<ProductionBatchWithDetails[]> {
  let query = supabase
    .from('production_batches')
    .select('*, product:products(id, nama)')
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching batches:', error)
    return []
  }
  return data ?? []
}

export async function createProductionBatch(
  productId: string,
  quantity: number,
  userId: string,
  notes?: string
) {
  const batchNumber = `BATCH-${Date.now()}`

  const { data, error } = await supabase
    .from('production_batches')
    .insert({
      batch_number: batchNumber,
      product_id: productId,
      quantity_planned: quantity,
      quantity_produced: 0,
      status: 'planned' as BatchStatus,
      created_by: userId,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating batch:', error)
    return null
  }
  return data
}

export async function updateBatchStatus(
  batchId: string,
  newStatus: BatchStatus
): Promise<boolean> {
  const updates: Record<string, unknown> = { status: newStatus }

  if (newStatus === 'in_progress') {
    updates.started_at = new Date().toISOString()
  } else if (newStatus === 'completed') {
    updates.completed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('production_batches')
    .update(updates)
    .eq('id', batchId)

  if (error) {
    console.error('Error updating batch status:', error)
    return false
  }
  return true
}

export async function updateBatchProduction(
  batchId: string,
  newQuantity: number
): Promise<boolean> {
  const { error } = await supabase
    .from('production_batches')
    .update({ quantity_produced: newQuantity })
    .eq('id', batchId)

  if (error) {
    console.error('Error updating batch production:', error)
    return false
  }
  return true
}
