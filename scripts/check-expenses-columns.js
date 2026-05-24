#!/usr/bin/env node

/**
 * Quick check: Get actual columns from expenses table
 */

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

async function checkColumns() {
  console.log('🔍 Checking expenses table columns...\n');
  
  // Get one row to see structure
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .limit(1);
  
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️  Table is empty, trying to get columns from schema...');
    
    // Try empty insert to get column names from error
    const { error: insertError } = await supabase
      .from('expenses')
      .insert({});
    
    console.log('Error message:', insertError?.message);
    return;
  }
  
  const columns = Object.keys(data[0]);
  
  console.log('✅ Found columns:\n');
  columns.forEach((col, i) => {
    console.log(`   ${(i + 1).toString().padStart(2)}. ${col}`);
  });
  
  console.log(`\n📊 Total: ${columns.length} columns`);
  
  // Check for v2.0 columns
  const v2Columns = [
    'status',
    'approved_by',
    'approved_at',
    'rejection_reason',
    'is_included_in_closing',
    'closing_id',
    'device_info',
    'ip_address'
  ];
  
  console.log('\n🔍 Checking v2.0 columns:');
  v2Columns.forEach(col => {
    const exists = columns.includes(col);
    console.log(`   ${exists ? '✅' : '❌'} ${col}`);
  });
  
  const missing = v2Columns.filter(col => !columns.includes(col));
  
  if (missing.length === 0) {
    console.log('\n🎉 All v2.0 columns already exist!');
    console.log('   No migration needed.');
  } else {
    console.log(`\n⚠️  Missing ${missing.length} columns:`);
    missing.forEach(col => console.log(`   • ${col}`));
    console.log('\n✅ Migration needed to add these columns.');
  }
}

checkColumns().catch(console.error);
