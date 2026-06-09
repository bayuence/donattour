import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating payment_types table...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.payment_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  
  await prisma.$executeRawUnsafe(`
    INSERT INTO public.payment_types (name) VALUES 
    ('Transfer Bank'), 
    ('QRIS'), 
    ('E-Wallet'), 
    ('Tunai') 
    ON CONFLICT DO NOTHING;
  `);
  
  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
