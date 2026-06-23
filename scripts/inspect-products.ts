import { prisma } from '../lib/db/prisma-client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function run() {
  console.log('Querying order_items...');
  try {
    const orderItems = await prisma.$queryRawUnsafe(`
      SELECT * FROM order_items LIMIT 1;
    `);
    console.log('Order Items columns:', orderItems);
  } catch (err) {
    console.error('Failed to query order_items:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(console.error);
