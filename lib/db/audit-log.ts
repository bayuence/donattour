/**
 * Audit Logging System
 *
 * Track all state changes for compliance and debugging
 * Who did what, when, and why
 */

import { prisma } from '@/lib/db/prisma-client'
import { dbLogger } from '@/lib/utils/logger'

export interface AuditEntry {
  outlet_id: string
  user_id: string
  action: string // order_created, payment_received, inventory_adjusted, etc
  entity_type: 'order' | 'inventory' | 'payment' | 'outlet' | 'product' | 'user'
  entity_id: string
  old_values?: any
  new_values?: any
  details?: any
}

/**
 * Log an audit entry
 * Non-blocking - failures don't affect business logic
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.audit_logs.create({
      data: {
        id: crypto.randomUUID(),
        outlet_id: entry.outlet_id,
        user_id: entry.user_id,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        old_values: entry.old_values ? JSON.stringify(entry.old_values) : null,
        new_values: entry.new_values ? JSON.stringify(entry.new_values) : null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        created_at: new Date(),
      },
    })

    dbLogger.info({
      event: 'audit_logged',
      action: entry.action,
      entityType: entry.entity_type,
      userId: entry.user_id,
    })
  } catch (error: any) {
    dbLogger.error({
      event: 'audit_log_failed',
      error: error.message,
      action: entry.action,
    })
    // Don't throw - audit logging failure shouldn't break business logic
  }
}

/**
 * Get audit trail for an entity
 */
export async function getAuditTrail(
  outletId: string,
  entityId: string,
  limit: number = 100
) {
  try {
    const logs = await prisma.audit_logs.findMany({
      where: {
        outlet_id: outletId,
        entity_id: entityId,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    })

    return logs
  } catch (error: any) {
    dbLogger.error({
      event: 'audit_trail_query_failed',
      error: error.message,
      entityId,
    })
    return []
  }
}

/**
 * Get audit logs for user
 */
export async function getUserAuditLog(userId: string, limit: number = 50) {
  try {
    const logs = await prisma.audit_logs.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    })

    return logs
  } catch (error: any) {
    dbLogger.error({
      event: 'user_audit_log_query_failed',
      error: error.message,
      userId,
    })
    return []
  }
}

/**
 * Get actions in time range
 */
export async function getAuditLogsByTimeRange(
  outletId: string,
  startDate: Date,
  endDate: Date,
  action?: string
) {
  try {
    const logs = await prisma.audit_logs.findMany({
      where: {
        outlet_id: outletId,
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        ...(action && { action }),
      },
      orderBy: {
        created_at: 'desc',
      },
    })

    return logs
  } catch (error: any) {
    dbLogger.error({
      event: 'audit_log_time_range_query_failed',
      error: error.message,
      outletId,
    })
    return []
  }
}

/**
 * Generate audit report
 */
export async function generateAuditReport(
  outletId: string,
  startDate: Date,
  endDate: Date
) {
  try {
    const logs = await getAuditLogsByTimeRange(outletId, startDate, endDate)

    // Group by action
    const groupedByAction = logs.reduce(
      (acc, log) => {
        if (!acc[log.action]) {
          acc[log.action] = []
        }
        acc[log.action].push(log)
        return acc
      },
      {} as Record<string, typeof logs>
    )

    // Group by user
    const groupedByUser = logs.reduce(
      (acc, log) => {
        if (!acc[log.user_id]) {
          acc[log.user_id] = []
        }
        acc[log.user_id].push(log)
        return acc
      },
      {} as Record<string, typeof logs>
    )

    return {
      period: { startDate, endDate },
      totalActions: logs.length,
      byAction: Object.entries(groupedByAction).map(([action, items]) => ({
        action,
        count: items.length,
      })),
      byUser: Object.entries(groupedByUser).map(([userId, items]) => ({
        userId,
        count: items.length,
      })),
      logs,
    }
  } catch (error: any) {
    dbLogger.error({
      event: 'audit_report_generation_failed',
      error: error.message,
    })
    return null
  }
}

// ============================================================================
// COMMON AUDIT LOG PATTERNS
// ============================================================================

/**
 * Log order creation
 */
export async function auditOrderCreated(
  outletId: string,
  userId: string,
  orderId: string,
  orderData: any
) {
  await logAudit({
    outlet_id: outletId,
    user_id: userId,
    action: 'order_created',
    entity_type: 'order',
    entity_id: orderId,
    new_values: {
      total: orderData.total_amount,
      items: orderData.items?.length,
      paymentMethod: orderData.payment_method,
    },
  })
}

/**
 * Log payment received
 */
export async function auditPaymentReceived(
  outletId: string,
  userId: string,
  orderId: string,
  amount: number,
  method: string
) {
  await logAudit({
    outlet_id: outletId,
    user_id: userId,
    action: 'payment_received',
    entity_type: 'payment',
    entity_id: orderId,
    details: {
      amount,
      method,
    },
  })
}

/**
 * Log inventory adjustment
 */
export async function auditInventoryAdjusted(
  outletId: string,
  userId: string,
  productId: string,
  oldQty: number,
  newQty: number,
  reason?: string
) {
  await logAudit({
    outlet_id: outletId,
    user_id: userId,
    action: 'inventory_adjusted',
    entity_type: 'inventory',
    entity_id: productId,
    old_values: { quantity: oldQty },
    new_values: { quantity: newQty },
    details: { reason, change: newQty - oldQty },
  })
}
