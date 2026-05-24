#!/usr/bin/env node

/**
 * Run SAFE migration directly
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

async function runMigration() {
  console.log('🚀 Running SAFE migration...\n');
  
  // Read SQL file
  const sqlPath = path.join(__dirname, '..', 'QueryDATABASE', '11-schema-expenses-v2-SAFE.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');
  
  console.log('📄 Migration SQL loaded');
  console.log(`   File: 11-schema-expenses-v2-SAFE.sql`);
  console.log(`   Size: ${(sql.length / 1024).toFixed(2)} KB\n`);
  
  console.log('⏳ Executing migration...');
  console.log('   This may take 10-30 seconds...\n');
  
  // Execute SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.log('❌ Migration failed!');
    console.log('   Error:', error.message);
    console.log('\n📝 What to do:');
    console.log('   1. Copy the SQL file: QueryDATABASE/11-schema-expenses-v2-SAFE.sql');
    console.log('   2. Open Supabase Dashboard → SQL Editor');
    console.log('   3. Paste and run manually');
    return;
  }
  
  console.log('✅ Migration executed successfully!');
  console.log('\n🎉 Database upgraded to v2.0!');
  console.log('\n📋 Next steps:');
  console.log('   1. Test at: /dashboard/pengeluaran-outlet');
  console.log('   2. Check changelog: CHANGELOG_EXPENSE_V2.md');
}

runMigration().catch(console.error);
