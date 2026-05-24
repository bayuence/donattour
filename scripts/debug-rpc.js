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

async function debug() {
  console.log('Testing exec_sql function...\n');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        column_name,
        data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'expenses'
      ORDER BY ordinal_position
      LIMIT 5;
    `
  });
  
  console.log('Raw response:');
  console.log('data:', JSON.stringify(data, null, 2));
  console.log('error:', error);
  console.log('\nType of data:', typeof data);
  console.log('Is array?:', Array.isArray(data));
}

debug();
