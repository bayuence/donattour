#!/usr/bin/env node

/**
 * Check database using RPC exec_sql function
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

async function checkDatabase() {
  console.log('🔍 Checking database with RPC...\n');
  
  // Check if exec_sql exists
  console.log('1. Checking exec_sql function...');
  const { data: funcCheck, error: funcError } = await supabase.rpc('exec_sql', {
    sql: `SELECT 1 as test;`
  });
  
  if (funcError) {
    console.log('❌ exec_sql function not found!');
    console.log('   Error:', funcError.message);
    console.log('\n📝 Solution:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy paste: scripts/supabase-exec.sql');
    console.log('   3. Click "Run"');
    return;
  }
  
  console.log('✅ exec_sql function exists\n');
  
  // Get expenses columns
  console.log('2. Getting expenses table columns...');
  const { data: columns, error: colError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'expenses'
      ORDER BY ordinal_position;
    `
  });
  
  if (colError) {
    console.log('❌ Error:', colError.message);
    return;
  }
  
  console.log(`✅ Found ${columns.length} columns:\n`);
  columns.forEach((col, i) => {
    const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
    console.log(`   ${(i + 1).toString().padStart(2)}. ${col.column_name.padEnd(30)} ${col.data_type.padEnd(25)} ${nullable}`);
  });
  
  // Check v2.0 columns
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
  
  const existingColumns = columns.map(c => c.column_name);
  const missing = v2Columns.filter(col => !existingColumns.includes(col));
  
  console.log('\n3. Checking v2.0 columns:');
  v2Columns.forEach(col => {
    const exists = existingColumns.includes(col);
    console.log(`   ${exists ? '✅' : '❌'} ${col}`);
  });
  
  if (missing.length === 0) {
    console.log('\n🎉 All v2.0 columns already exist!');
    console.log('   Database is already up-to-date.');
  } else {
    console.log(`\n⚠️  Missing ${missing.length} columns:`);
    missing.forEach(col => console.log(`   • ${col}`));
    console.log('\n✅ Migration needed.');
  }
  
  // Check other tables
  console.log('\n4. Checking other tables...');
  const { data: tables, error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('expense_audit_logs', 'outlet_expense_budgets')
      ORDER BY table_name;
    `
  });
  
  if (!tableError && tables) {
    const tableNames = tables.map(t => t.table_name);
    console.log(`   expense_audit_logs: ${tableNames.includes('expense_audit_logs') ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`   outlet_expense_budgets: ${tableNames.includes('outlet_expense_budgets') ? '✅ EXISTS' : '❌ MISSING'}`);
  }
  
  console.log('\n✅ Check complete!');
}

checkDatabase().catch(console.error);
