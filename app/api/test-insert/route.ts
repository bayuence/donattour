export const dynamic = 'force-dynamic';
import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createAdminClient();
  const { data: outlets } = await supabase.from('outlets').select('id').limit(1);
  const outletId = outlets?.[0]?.id;
  
  // Try to insert with null closed_by
  const { data, error } = await supabase.from('daily_closing').insert({
    outlet_id: outletId,
    tanggal: '2026-06-04',
    notes: 'TEST'
  });
  
  return NextResponse.json({ error });
}
