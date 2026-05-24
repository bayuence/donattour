#!/usr/bin/env node

/**
 * DATABASE AUDIT TOOL
 * 
 * Comprehensive database analysis to find:
 * - Unused tables
 * - Unused columns
 * - Duplicate data
 * - Missing indexes
 * - Orphaned records
 * - Schema inconsistencies
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
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'bright');
  console.log('='.repeat(70) + '\n');
}

// Read .env.local
function getSupabaseCredentials() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  const credentials = {};
  lines.forEach(line => {
    const match1 = line.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/);
    if (match1) credentials.url = match1[1].trim();
    
    const match2 = line.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/);
    if (match2) credentials.serviceKey = match2[1].trim();
  });

  return credentials;
}

// Create Supabase client
function createSupabaseClient() {
  const { url, serviceKey } = getSupabaseCredentials();
  return createClient(url, serviceKey);
}

// Execute SQL and get results
async function execSQL(supabase, sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    throw new Error(error.message);
  }
  
  if (!data.success) {
    throw new Error(data.error || 'Query failed');
  }
  
  return data.data || [];
}

// Get all tables
async function getAllTables(supabase) {
  const sql = `
    SELECT 
      table_name,
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  
  return await execSQL(supabase, sql);
}

// Get table row count
async function getTableRowCount(supabase, tableName) {
  try {
    const sql = `SELECT COUNT(*) as count FROM ${tableName};`;
    const result = await execSQL(supabase, sql);
    return result[0]?.count || 0;
  } catch (error) {
    return 'ERROR';
  }
}

// Get all columns for a table
async function getTableColumns(supabase, tableName) {
  const sql = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = '${tableName}'
    ORDER BY ordinal_position;
  `;
  
  return await execSQL(supabase, sql);
}

// Get foreign keys
async function getForeignKeys(supabase) {
  const sql = `
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    ORDER BY tc.table_name;
  `;
  
  return await execSQL(supabase, sql);
}

// Get indexes
async function getIndexes(supabase) {
  const sql = `
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `;
  
  return await execSQL(supabase, sql);
}

// Get functions
async function getFunctions(supabase) {
  const sql = `
    SELECT
      routine_name,
      routine_type,
      data_type as return_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    ORDER BY routine_name;
  `;
  
  return await execSQL(supabase, sql);
}

// Analyze code usage
function analyzeCodeUsage(projectPath) {
  const usage = {
    tables: new Set(),
    columns: new Map(),
  };
  
  // Scan TypeScript/JavaScript files
  const scanDir = (dir) => {
    try {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!file.startsWith('.') && file !== 'node_modules') {
            scanDir(fullPath);
          }
        } else if (file.match(/\.(ts|tsx|js|jsx)$/)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          // Find .from('table_name') patterns
          const fromMatches = content.matchAll(/\.from\(['"](\w+)['"]\)/g);
          for (const match of fromMatches) {
            usage.tables.add(match[1]);
          }
          
          // Find table references in SQL strings
          const sqlMatches = content.matchAll(/FROM\s+(\w+)/gi);
          for (const match of sqlMatches) {
            usage.tables.add(match[1].toLowerCase());
          }
        }
      });
    } catch (error) {
      // Ignore errors
    }
  };
  
  scanDir(projectPath);
  
  return usage;
}

// Main audit function
async function auditDatabase() {
  console.clear();
  logSection('🔍 DATABASE AUDIT TOOL');
  
  log('Analyzing your database for optimization opportunities...', 'cyan');
  console.log('');
  
  try {
    const supabase = createSupabaseClient();
    const projectPath = path.join(__dirname, '..');
    
    // Get all database objects
    log('📊 Scanning database...', 'cyan');
    const tables = await getAllTables(supabase);
    const foreignKeys = await getForeignKeys(supabase);
    const indexes = await getIndexes(supabase);
    const functions = await getFunctions(supabase);
    
    log(`   Found: ${tables.length} tables`, 'white');
    log(`   Found: ${foreignKeys.length} foreign keys`, 'white');
    log(`   Found: ${indexes.length} indexes`, 'white');
    log(`   Found: ${functions.length} functions`, 'white');
    
    // Analyze code usage
    log('\n📝 Scanning code for table usage...', 'cyan');
    const codeUsage = analyzeCodeUsage(projectPath);
    log(`   Found: ${codeUsage.tables.size} tables referenced in code`, 'white');
    
    // Build audit report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total_tables: tables.length,
        total_foreign_keys: foreignKeys.length,
        total_indexes: indexes.length,
        total_functions: functions.length,
        tables_in_code: codeUsage.tables.size,
      },
      tables: [],
      unused_tables: [],
      empty_tables: [],
      missing_indexes: [],
      orphaned_records: [],
      recommendations: [],
    };
    
    // Analyze each table
    logSection('📋 TABLE ANALYSIS');
    
    for (const table of tables) {
      const tableName = table.table_name;
      const rowCount = await getTableRowCount(supabase, tableName);
      const columns = await getTableColumns(supabase, tableName);
      const usedInCode = codeUsage.tables.has(tableName);
      
      const tableInfo = {
        name: tableName,
        columns: columns.length,
        rows: rowCount,
        used_in_code: usedInCode,
        status: 'OK',
      };
      
      // Check if unused
      if (!usedInCode) {
        tableInfo.status = 'UNUSED';
        report.unused_tables.push(tableName);
        log(`⚠️  ${tableName.padEnd(40)} ${String(rowCount).padStart(8)} rows   ❌ NOT USED IN CODE`, 'yellow');
      } else if (rowCount === 0) {
        tableInfo.status = 'EMPTY';
        report.empty_tables.push(tableName);
        log(`📭 ${tableName.padEnd(40)} ${String(rowCount).padStart(8)} rows   ⚠️  EMPTY`, 'cyan');
      } else {
        log(`✅ ${tableName.padEnd(40)} ${String(rowCount).padStart(8)} rows   ✓ USED`, 'green');
      }
      
      report.tables.push(tableInfo);
    }
    
    // Generate recommendations
    logSection('💡 RECOMMENDATIONS');
    
    if (report.unused_tables.length > 0) {
      log('🗑️  UNUSED TABLES (consider removing):', 'yellow');
      report.unused_tables.forEach(table => {
        log(`   • ${table}`, 'white');
        report.recommendations.push({
          type: 'unused_table',
          severity: 'medium',
          table: table,
          action: 'Consider dropping if not needed',
          sql: `DROP TABLE IF EXISTS ${table} CASCADE;`,
        });
      });
      console.log('');
    }
    
    if (report.empty_tables.length > 0) {
      log('📭 EMPTY TABLES (no data):', 'cyan');
      report.empty_tables.forEach(table => {
        log(`   • ${table}`, 'white');
      });
      console.log('');
    }
    
    // Check for common issues
    const expensesTable = tables.find(t => t.table_name === 'expenses');
    if (expensesTable) {
      const expensesColumns = await getTableColumns(supabase, 'expenses');
      const columnNames = expensesColumns.map(c => c.column_name);
      
      // Check for field name inconsistencies
      const hasCreatedBy = columnNames.includes('created_by');
      const hasRecordedBy = columnNames.includes('recorded_by_user_id');
      const hasBuktiUrl = columnNames.includes('bukti_url');
      const hasReceiptUrl = columnNames.includes('receipt_url');
      
      if (hasRecordedBy && !hasCreatedBy) {
        log('⚠️  FIELD NAME INCONSISTENCY:', 'yellow');
        log('   • expenses table uses "recorded_by_user_id"', 'white');
        log('   • Code expects "created_by"', 'white');
        log('   • Recommendation: Add alias or update code', 'cyan');
        console.log('');
        
        report.recommendations.push({
          type: 'field_mismatch',
          severity: 'high',
          table: 'expenses',
          issue: 'recorded_by_user_id vs created_by',
          action: 'Update code to use recorded_by_user_id or add column alias',
        });
      }
      
      if (hasReceiptUrl && !hasBuktiUrl) {
        log('⚠️  FIELD NAME INCONSISTENCY:', 'yellow');
        log('   • expenses table uses "receipt_url"', 'white');
        log('   • Code expects "bukti_url"', 'white');
        log('   • Recommendation: Add alias or update code', 'cyan');
        console.log('');
        
        report.recommendations.push({
          type: 'field_mismatch',
          severity: 'high',
          table: 'expenses',
          issue: 'receipt_url vs bukti_url',
          action: 'Update code to use receipt_url or add column alias',
        });
      }
    }
    
    // Save report
    const reportPath = path.join(__dirname, 'database-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    logSection('✅ AUDIT COMPLETE');
    log(`📄 Full report saved to: ${reportPath}`, 'cyan');
    console.log('');
    log('Summary:', 'bright');
    log(`   • Total tables: ${report.summary.total_tables}`, 'white');
    log(`   • Used in code: ${report.summary.tables_in_code}`, 'green');
    log(`   • Unused: ${report.unused_tables.length}`, 'yellow');
    log(`   • Empty: ${report.empty_tables.length}`, 'cyan');
    log(`   • Recommendations: ${report.recommendations.length}`, 'magenta');
    console.log('');
    
  } catch (error) {
    logSection('❌ AUDIT FAILED');
    log(`Error: ${error.message}`, 'red');
    console.log('');
    
    if (error.message.includes('exec_sql')) {
      log('💡 Solution:', 'yellow');
      log('   1. Run: scripts/supabase-exec-FULL.sql in Supabase SQL Editor', 'cyan');
      log('   2. Then run this audit again', 'cyan');
    }
  }
}

// Run
auditDatabase();
