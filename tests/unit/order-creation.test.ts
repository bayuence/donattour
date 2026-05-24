/**
 * Order Creation Tests
 *
 * Critical business logic:
 * - Order must be created with valid data
 * - Order items must be linked
 * - Payment status must be tracked
 * - Cannot create order without outlet
 */

import { prisma } from '@/lib/db/prisma-client'

describe('Order Creation', () => {
  beforeAll(async () => {
    // Setup test data
    await prisma.outlets.create({
      data: {
        id: 'order-test-outlet',
        nama: 'Order Test Outlet',
      },
    })

    await prisma.products.create({
      data: {
        id: 'order-test-product',
        nama: 'Test Donat',
        harga: 5000,
      },
    })
  })

  afterAll(async () => {
    await prisma.order_items.deleteMany({})
    await prisma.orders.deleteMany({})
    await prisma.products.deleteMany({})
    await prisma.outlets.deleteMany({})
    await prisma.$disconnect()
  })

  test('should create order with valid data', async () => {
    const order = await prisma.orders.create({
      data: {
        id: 'test-order-001',
        outlet_id: 'order-test-outlet',
        kasir_id: 'test-kasir',
        customer_name: 'John Doe',
        total_amount: 50000,
        paid_amount: 50000,
        change_amount: 0,
        payment_method: 'cash',
        payment_status: 'paid',
        status: 'completed',
      },
    })

    expect(order.id).toBe('test-order-001')
    expect(order.outlet_id).toBe('order-test-outlet')
    expect(order.total_amount).toBe(50000)
    expect(order.payment_status).toBe('paid')
  })

  test('should create order items with order', async () => {
    const order = await prisma.orders.create({
      data: {
        id: 'test-order-002',
        outlet_id: 'order-test-outlet',
        total_amount: 100000,
        payment_method: 'card',
        payment_status: 'paid',
        status: 'completed',
        order_items: {
          create: [
            {
              id: 'item-001',
              product_id: 'order-test-product',
              product_name: 'Test Donat',
              quantity: 10,
              unit_price: 5000,
              subtotal: 50000,
            },
            {
              id: 'item-002',
              product_id: 'order-test-product',
              product_name: 'Test Donat',
              quantity: 10,
              unit_price: 5000,
              subtotal: 50000,
            },
          ],
        },
      },
      include: {
        order_items: true,
      },
    })

    expect(order.order_items).toHaveLength(2)
    expect(order.order_items[0].quantity).toBe(10)
    expect(order.total_amount).toBe(100000)
  })

  test('should track order status changes', async () => {
    const created = await prisma.orders.create({
      data: {
        id: 'test-order-003',
        outlet_id: 'order-test-outlet',
        total_amount: 25000,
        payment_method: 'cash',
        payment_status: 'unpaid',
        status: 'completed',
      },
    })

    expect(created.payment_status).toBe('unpaid')

    // Update to paid
    const updated = await prisma.orders.update({
      where: { id: 'test-order-003' },
      data: {
        payment_status: 'paid',
      },
    })

    expect(updated.payment_status).toBe('paid')
  })

  test('should require outlet for order', async () => {
    // Try to create order without outlet
    expect(async () => {
      await prisma.orders.create({
        data: {
          id: 'test-order-invalid',
          outlet_id: 'nonexistent-outlet',
          total_amount: 10000,
          payment_method: 'cash',
          payment_status: 'unpaid',
          status: 'completed',
        },
      })
    }).rejects.toThrow()
  })

  test('should calculate order totals correctly', async () => {
    const unitPrice = 5000
    const quantity = 20
    const expectedTotal = unitPrice * quantity

    const order = await prisma.orders.create({
      data: {
        id: 'test-order-004',
        outlet_id: 'order-test-outlet',
        total_amount: expectedTotal,
        payment_method: 'cash',
        payment_status: 'paid',
        status: 'completed',
        order_items: {
          create: {
            id: 'calc-item-001',
            product_id: 'order-test-product',
            quantity,
            unit_price: unitPrice,
            subtotal: expectedTotal,
          },
        },
      },
      include: {
        order_items: true,
      },
    })

    const itemTotal = order.order_items.reduce((sum: number, item: any) => sum + item.subtotal, 0)
    expect(itemTotal).toBe(expectedTotal)
    expect(order.total_amount).toBe(expectedTotal)
  })
})
