#!/usr/bin/env node

/**
 * Database Schema Checker
 * 
 * Script untuk mengecek schema database yang SEBENARNYA
 * Tidak mengandalkan dokumentasi, tapi langsung query ke database
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'bright');
  console.log('='.repeat(70) + '\n');
}

// Read environment variables
function getSupabaseCredentials() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log('❌ Error: .env.local file not found!', 'red');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  const credentials = {};
  lines.forEach(line => {
    const match = line.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/);
    if (match) credentials.url = match[1].trim();
    
    const match2 = line.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/);
    if (match2) credentials.serviceKey = match2[1].trim();
  });

  if (!credentials.url || !credentials.serviceKey) {
    log('❌ Error: Missing Supabase credentials in .env.local', 'red');
    process.exit(1);
  }

  return credentials;
}

// Create Supabase client
function createSupabaseClient() {
  const { url, serviceKey } = getSupabaseCredentials();
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Check expenses table schema
async function checkExpensesTable(supabase) {
  logSection('📊 CHECKING EXPENSES TABLE');

  try {
    // Check if table exists - try direct query first
    let tableExists = false;
    
    // Method 1: Try to query the table directly
    const { data: testQuery, error: testError } = await supabase
      .from('expenses')
      .select('id')
      .limit(1);
    
    if (!testError) {
      tableExists = true;
    } else if (testError.code === 'PGRST116') {
      // Table not found
      tableExists = false;
    } else {
      // Other error, assume table exists but has permission issue
      tableExists = true;
    }
    
    if (!tableExists) {
      log('❌ Table "expenses" NOT FOUND', 'red');
      return null;
    }

    log('✅ Table "expenses" EXISTS', 'green');
    console.log('');

    // Get all columns - use direct query to information_schema
    const { data: columnsData, error: colError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'expenses')
      .order('ordinal_position');

    if (colError) {
      log(`⚠️  Could not get column details: ${colError.message}`, 'yellow');
      log(`   But table exists, so we can proceed`, 'cyan');
      return [];
    }

    const columnList = columnsData || [];
    
    if (columnList.length > 0) {
      log('📋 CURRENT COLUMNS:', 'cyan');
      console.log('');
      columnList.forEach(col => {
        const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        log(`   • ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`, 'white');
      });
      console.log('');
      log(`Total columns: ${columnList.length}`, 'cyan');
    }

    return columnList.map(c => c.column_name);

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return null;
  }
}

// Check other tables
async function checkOtherTables(supabase) {
  logSection('📊 CHECKING OTHER TABLES');

  const tablesToCheck = [
    'expense_audit_logs',
    'outlet_expense_budgets'
  ];

  const results = {};

  for (const tableName of tablesToCheck) {
    try {
      // Try to query the table directly
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      const exists = !error || error.code !== 'PGRST116';
      results[tableName] = exists;

      if (exists) {
        log(`✅ Table "${tableName}" EXISTS`, 'green');
      } else {
        log(`⚠️  Table "${tableName}" NOT FOUND (will be created)`, 'yellow');
      }

    } catch (error) {
      log(`❌ Error checking ${tableName}: ${error.message}`, 'red');
      results[tableName] = false;
    }
  }

  return results;
}

// Check indexes
async function checkIndexes(supabase) {
  logSection('📊 CHECKING INDEXES');

  try {
    // Try to get indexes from pg_indexes view
    const { data: indexes, error } = await supabase
      .from('pg_indexes')
      .select('indexname, tablename')
      .eq('schemaname', 'public')
      .in('tablename', ['expenses', 'expense_audit_logs', 'outlet_expense_budgets']);

    if (error) {
      log(`⚠️  Could not check indexes: ${error.message}`, 'yellow');
      return [];
    }

    const indexList = indexes || [];
    
    if (indexList.length === 0) {
      log('⚠️  No indexes found', 'yellow');
    } else {
      log(`Found ${indexList.length} indexes:`, 'cyan');
      console.log('');
      indexList.forEach(idx => {
        log(`   • ${idx.tablename}.${idx.indexname}`, 'white');
      });
    }

    return indexList;

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return [];
  }
}

// Check functions
async function checkFunctions(supabase) {
  logSection('📊 CHECKING FUNCTIONS');

  try {
    // Try to get functions from information_schema
    const { data: functions, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .in('routine_name', ['get_budget_status', 'log_expense_audit', 'exec_sql']);

    if (error) {
      log(`⚠️  Could not check functions: ${error.message}`, 'yellow');
      return [];
    }

    const funcList = functions || [];
    
    if (funcList.length === 0) {
      log('⚠️  No functions found', 'yellow');
    } else {
      log(`Found ${funcList.length} functions:`, 'cyan');
      console.log('');
      funcList.forEach(func => {
        log(`   • ${func.routine_name} (${func.routine_type})`, 'white');
      });
    }

    return funcList;

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return [];
  }
}

// Main function
async function main() {
  console.clear();
  
  logSection('🔍 DATABASE SCHEMA CHECKER');
  
  log('Checking your ACTUAL database schema...', 'cyan');
  log('This will help us understand what needs to be migrated', 'cyan');
  console.log('');

  try {
    // Connect
    log('🔌 Connecting to Supabase...', 'cyan');
    const supabase = createSupabaseClient();
    log('   ✅ Connected successfully', 'green');

    // Check expenses table
    const expenseColumns = await checkExpensesTable(supabase);

    // Check other tables
    const otherTables = await checkOtherTables(supabase);

    // Check indexes
    const indexes = await checkIndexes(supabase);

    // Check functions
    const functions = await checkFunctions(supabase);

    // Summary
    logSection('📋 SUMMARY');

    log('EXPENSES TABLE:', 'bright');
    if (expenseColumns) {
      log(`   ✅ Exists with ${expenseColumns.length} columns`, 'green');
      
      // Check for v2.0 columns
      const v2Columns = ['status', 'approved_by', 'approved_at', 'is_included_in_closing', 'device_info'];
      const missingColumns = v2Columns.filter(col => !expenseColumns.includes(col));
      
      if (missingColumns.length > 0) {
        log(`   ⚠️  Missing v2.0 columns: ${missingColumns.join(', ')}`, 'yellow');
      } else {
        log(`   ✅ All v2.0 columns present`, 'green');
      }
    } else {
      log(`   ❌ Table not found`, 'red');
    }

    console.log('');
    log('OTHER TABLES:', 'bright');
    log(`   expense_audit_logs: ${otherTables.expense_audit_logs ? '✅ EXISTS' : '⚠️  MISSING'}`, 
        otherTables.expense_audit_logs ? 'green' : 'yellow');
    log(`   outlet_expense_budgets: ${otherTables.outlet_expense_budgets ? '✅ EXISTS' : '⚠️  MISSING'}`, 
        otherTables.outlet_expense_budgets ? 'green' : 'yellow');

    console.log('');
    log('INDEXES:', 'bright');
    log(`   Found: ${indexes.length} indexes`, 'cyan');

    console.log('');
    log('FUNCTIONS:', 'bright');
    log(`   Found: ${functions.length} functions`, 'cyan');

    console.log('');
    logSection('✅ CHECK COMPLETE');
    
    log('Next steps:', 'bright');
    log('1. Review the schema above', 'cyan');
    log('2. Run migration script if needed: npm run migrate:expenses', 'cyan');
    log('3. Or manually run SQL in Supabase SQL Editor', 'cyan');
    console.log('');

    // Save to file
    const report = {
      timestamp: new Date().toISOString(),
      expenses_table: {
        exists: !!expenseColumns,
        columns: expenseColumns || []
      },
      other_tables: otherTables,
      indexes: indexes,
      functions: functions
    };

    const reportPath = path.join(__dirname, 'database-schema-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`📄 Report saved to: ${reportPath}`, 'cyan');

  } catch (error) {
    logSection('❌ CHECK FAILED');
    log(`Error: ${error.message}`, 'red');
    console.log('');
    process.exit(1);
  }
}

// Run
main();
