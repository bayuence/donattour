#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const lines = envContent.split('\n');

let url, key;
lines.forEach(line => {
  const match1 = line.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/);
  if (match1) url = match1[1].trim();
  
  const match2 = line.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/);
  if (match2) key = match2[1].trim();
});

const supabase = createClient(url, key);

async function upgrade() {
  console.log('🔧 Upgrading exec_sql function...\n');
  
  const sqlPath = path.join(__dirname, 'supabase-exec-FULL.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.log('❌ Failed:', error.message);
    console.log('\n📝 Manual solution:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy paste: scripts/supabase-exec-FULL.sql');
    console.log('   3. Click "Run"');
    return;
  }
  
  console.log('✅ exec_sql function upgraded!');
  console.log('\n🎉 Kiro AI now has full database access!');
  console.log('\nNext: npm run audit:db');
}

upgrade();
