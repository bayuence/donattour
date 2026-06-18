export const dynamic = 'force-dynamic';
import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { prisma } from '@/lib/db/prisma-client'

export async function GET() {
  try {
    // Jalankan via RPC atau raw query
    const { error } = await supabase.rpc('execute_sql', {
      query: 'ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;'
    });

    // Use shared prisma singleton (lazy) to run raw SQL safely server-side
    await prisma.$executeRawUnsafe(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;`);

    return NextResponse.json({ success: true, message: 'Constraint dropped!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
