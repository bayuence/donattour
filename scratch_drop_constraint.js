const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;`);
    console.log('Successfully dropped check constraint on orders table');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
