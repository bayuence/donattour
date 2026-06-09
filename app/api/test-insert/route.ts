export const dynamic = 'force-dynamic';
import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function GET() {
  try {
    // Jalankan via RPC atau raw query
    const { error } = await supabase.rpc('execute_sql', {
      query: 'ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;'
    });
    
    // Karena kita mungkin belum punya fungsi execute_sql di supabase,
    // Kita bisa menambahkan data sementara ke database atau menggunakan Prisma.
    // Tapi karena Supabase tidak bisa DROP CONSTRAINT via client-side supabase-js, 
    // cara terbaik adalah menggunakan PrismaClient di server-side.
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$executeRawUnsafe(`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;`);
    
    return NextResponse.json({ success: true, message: 'Constraint dropped!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
