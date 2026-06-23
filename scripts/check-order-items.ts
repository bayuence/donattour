import { prisma } from '../lib/db/prisma-client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function run() {
  const date = '2026-06-24';
  console.log('Querying orders for:', date);
  try {
    const sales = await prisma.$queryRawUnsafe(`
      SELECT id, total_amount, payment_method, status, created_at
      FROM orders
      WHERE created_at >= '${date}T00:00:00' AND created_at <= '${date}T23:59:59';
    `);
    console.log('\nOrders:', sales);

    const items = await prisma.$queryRawUnsafe(`
      SELECT oi.*, p.nama, p.ukuran, p.tipe_produk
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id IN (
        SELECT id FROM orders 
        WHERE created_at >= '${date}T00:00:00' AND created_at <= '${date}T23:59:59'
      );
    `);
    console.log('\nOrder Items:', items);
  } catch (err) {
    console.error('Failed to query:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
