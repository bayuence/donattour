import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createAdminClient();
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const { data: publicUsers } = await supabase.from('users').select('*');
  
  return NextResponse.json({ 
    authUsers: authUsers.users.map(u => u.id), 
    publicUsers: publicUsers?.map(u => u.id) 
  });
}
