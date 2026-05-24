/**
 * Saga Pattern Implementation
 *
 * Handles distributed transactions with automatic rollback
 * Example: Order creation → Stock deduction → Payment
 * If any step fails, previous steps are rolled back
 */

import { prisma } from '@/lib/db/prisma-client'
import { dbLogger } from '@/lib/utils/logger'
import crypto from 'crypto'

export interface SagaStep {
  name: string
  action: () => Promise<any>
  compensation: () => Promise<void>
}

export class Saga {
  private steps: SagaStep[] = []
  private completed: SagaStep[] = []
  private sagaId: string

  constructor(sagaId?: string) {
    this.sagaId = sagaId || crypto.randomUUID()
  }

  /**
   * Add a step to the saga
   */
  addStep(step: SagaStep): this {
    this.steps.push(step)
    return this
  }

  /**
   * Execute all saga steps with automatic rollback on failure
   */
  async execute(): Promise<{ success: boolean; error?: string; result?: any }> {
    try {
      // Log saga start
      await prisma.saga_logs.create({
        data: {
          id: crypto.randomUUID(),
          saga_id: this.sagaId,
          status: 'started',
          timestamp: new Date(),
        },
      })

      dbLogger.info({
        event: 'saga_start',
        sagaId: this.sagaId,
        stepsCount: this.steps.length,
      })

      let result: any = null

      // Execute all steps
      for (const step of this.steps) {
        dbLogger.info({
          event: 'saga_step_execute',
          sagaId: this.sagaId,
          step: step.name,
        })

        try {
          result = await step.action()
          this.completed.push(step)

          // Log step completion
          await prisma.saga_logs.create({
            data: {
              id: crypto.randomUUID(),
              saga_id: this.sagaId,
              status: 'step_completed',
              step_name: step.name,
              result: JSON.stringify(result),
              timestamp: new Date(),
            },
          })

          dbLogger.info({
            event: 'saga_step_success',
            sagaId: this.sagaId,
            step: step.name,
          })
        } catch (stepError: any) {
          dbLogger.error({
            event: 'saga_step_failed',
            sagaId: this.sagaId,
            step: step.name,
            error: stepError.message,
          })

          throw stepError
        }
      }

      // All steps succeeded
      await prisma.saga_logs.create({
        data: {
          id: crypto.randomUUID(),
          saga_id: this.sagaId,
          status: 'completed',
          result: JSON.stringify(result),
          timestamp: new Date(),
        },
      })

      dbLogger.info({
        event: 'saga_completed',
        sagaId: this.sagaId,
        completedSteps: this.completed.length,
      })

      return { success: true, result }
    } catch (error: any) {
      dbLogger.error({
        event: 'saga_error',
        sagaId: this.sagaId,
        error: error.message,
        completedSteps: this.completed.length,
      })

      // Rollback in reverse order
      for (let i = this.completed.length - 1; i >= 0; i--) {
        const step = this.completed[i]
        try {
          dbLogger.warn({
            event: 'saga_compensating',
            sagaId: this.sagaId,
            step: step.name,
          })

          await step.compensation()

          // Log compensation success
          await prisma.saga_logs.create({
            data: {
              id: crypto.randomUUID(),
              saga_id: this.sagaId,
              status: 'compensation_completed',
              step_name: step.name,
              timestamp: new Date(),
            },
          })

          dbLogger.info({
            event: 'saga_compensation_success',
            sagaId: this.sagaId,
            step: step.name,
          })
        } catch (compError: any) {
          dbLogger.error({
            event: 'saga_compensation_failed',
            sagaId: this.sagaId,
            step: step.name,
            error: compError.message,
          })

          // Log compensation failure but don't re-throw
          await prisma.saga_logs.create({
            data: {
              id: crypto.randomUUID(),
              saga_id: this.sagaId,
              status: 'compensation_failed',
              step_name: step.name,
              error: compError.message,
              timestamp: new Date(),
            },
          })

          // This requires manual intervention
        }
      }

      // Log saga failure
      await prisma.saga_logs.create({
        data: {
          id: crypto.randomUUID(),
          saga_id: this.sagaId,
          status: 'failed',
          error: error.message,
          timestamp: new Date(),
        },
      })

      return { success: false, error: error.message }
    }
  }
}

/**
 * Example: Order Creation Saga
 *
 * Steps:
 * 1. Create order in database
 * 2. Deduct inventory stock
 * 3. Process payment
 *
 * If any fails, rollback previous steps
 */
export async function createOrderWithSaga(orderData: {
  outlet_id: string
  kasir_id: string
  items: Array<{ product_id: string; quantity: number; unit_price: number }>
  total_amount: number
  payment_method: string
}): Promise<{ success: boolean; order?: any; error?: string }> {
  const saga = new Saga()
  let createdOrderId: string | null = null
  const deductedItems: Array<{ product_id: string; quantity: number }> = []

  // Step 1: Create order
  saga.addStep({
    name: 'create_order',
    action: async () => {
      const order = await prisma.orders.create({
        data: {
          outlet_id: orderData.outlet_id,
          kasir_id: orderData.kasir_id,
          total_amount: orderData.total_amount,
          payment_method: orderData.payment_method,
          payment_status: 'unpaid',
          status: 'pending',
          order_items: {
            create: orderData.items.map((item) => ({
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.quantity * item.unit_price,
            })),
          },
        },
        include: { order_items: true },
      })
      createdOrderId = order.id
      return order
    },
    compensation: async () => {
      // Delete order if created
      if (createdOrderId) {
        await prisma.orders.delete({
          where: { id: createdOrderId },
        })
      }
    },
  })

  // Step 2: Deduct inventory
  saga.addStep({
    name: 'deduct_inventory',
    action: async () => {
      for (const item of orderData.items) {
        // Check stock available
        const inventory = await prisma.inventory.findUnique({
          where: {
            outlet_id_product_id: {
              outlet_id: orderData.outlet_id,
              product_id: item.product_id,
            },
          },
        })

        if (!inventory || inventory.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for product ${item.product_id}. ` +
            `Available: ${inventory?.quantity || 0}, Requested: ${item.quantity}`
          )
        }

        // Deduct stock
        await prisma.inventory.update({
          where: {
            outlet_id_product_id: {
              outlet_id: orderData.outlet_id,
              product_id: item.product_id,
            },
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        })

        deductedItems.push(item)
      }
    },
    compensation: async () => {
      // Return inventory
      for (const item of deductedItems) {
        await prisma.inventory.update({
          where: {
            outlet_id_product_id: {
              outlet_id: orderData.outlet_id,
              product_id: item.product_id,
            },
          },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        })
      }
    },
  })

  // Step 3: Update order status to completed
  saga.addStep({
    name: 'complete_order',
    action: async () => {
      if (!createdOrderId) throw new Error('Order ID not set')

      const updated = await prisma.orders.update({
        where: { id: createdOrderId },
        data: {
          status: 'completed',
          payment_status: 'paid',
        },
      })
      return updated
    },
    compensation: async () => {
      if (createdOrderId) {
        await prisma.orders.update({
          where: { id: createdOrderId },
          data: { status: 'pending', payment_status: 'unpaid' },
        })
      }
    },
  })

  // Execute saga
  const result = await saga.execute()

  if (result.success && createdOrderId) {
    // Get final order
    const order = await prisma.orders.findUnique({
      where: { id: createdOrderId },
      include: { order_items: true },
    })

    return { success: true, order }
  }

  return { success: false, error: result.error }
}
