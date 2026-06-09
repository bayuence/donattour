const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Adding is_donat to product_categories...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "product_categories" ADD COLUMN IF NOT EXISTS "is_donat" BOOLEAN DEFAULT true;
    `);
    console.log('Column added successfully.');
  } catch (error) {
    console.error('Failed to add column:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
