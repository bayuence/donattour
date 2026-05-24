#!/usr/bin/env node

/**
 * DATABASE CLEANUP TOOL
 * 
 * Safe cleanup based on audit report:
 * - Remove unused tables (with confirmation)
 * - Fix field name mismatches
 * - Add missing indexes
 * - Clean orphaned records
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

// Execute SQL
async function execSQL(supabase, sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    throw new Error(error.message);
  }
  
  if (!data.success) {
    throw new Error(data.error || 'Query failed');
  }
  
  return data;
}

// Ask for confirmation
async function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Main cleanup function
async function cleanupDatabase() {
  console.clear();
  logSection('🧹 DATABASE CLEANUP TOOL');
  
  // Load audit report
  const reportPath = path.join(__dirname, 'database-audit-report.json');
  
  if (!fs.existsSync(reportPath)) {
    log('❌ Audit report not found!', 'red');
    log('   Please run: npm run audit:db first', 'yellow');
    return;
  }
  
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  
  log('Loaded audit report:', 'cyan');
  log(`   • ${report.recommendations.length} recommendations found`, 'white');
  console.log('');
  
  if (report.recommendations.length === 0) {
    log('✅ No cleanup needed! Database is clean.', 'green');
    return;
  }
  
  const supabase = createSupabaseClient();
  
  // Group recommendations by severity
  const high = report.recommendations.filter(r => r.severity === 'high');
  const medium = report.recommendations.filter(r => r.severity === 'medium');
  const low = report.recommendations.filter(r => r.severity === 'low');
  
  // Fix high severity issues first
  if (high.length > 0) {
    logSection('🔴 HIGH PRIORITY FIXES');
    
    for (const rec of high) {
      if (rec.type === 'field_mismatch') {
        log(`⚠️  Field mismatch in table: ${rec.table}`, 'yellow');
        log(`   Issue: ${rec.issue}`, 'white');
        log(`   Action: ${rec.action}`, 'cyan');
        console.log('');
        
        // Auto-fix: Add column alias view
        const confirmed = await askConfirmation(
          colors.yellow + '   Fix this automatically? (y/n): ' + colors.reset
        );
        
        if (confirmed) {
          try {
            // Create view with proper column names
            if (rec.issue.includes('recorded_by_user_id vs created_by')) {
              const sql = `
                -- Add created_by as alias for recorded_by_user_id
                ALTER TABLE expenses 
                ADD COLUMN IF NOT EXISTS created_by UUID 
                GENERATED ALWAYS AS (recorded_by_user_id) STORED;
              `;
              
              await execSQL(supabase, sql);
              log('   ✅ Fixed! Added created_by alias', 'green');
            }
            
            if (rec.issue.includes('receipt_url vs bukti_url')) {
              const sql = `
                -- Add bukti_url as alias for receipt_url
                ALTER TABLE expenses 
                ADD COLUMN IF NOT EXISTS bukti_url TEXT 
                GENERATED ALWAYS AS (receipt_url) STORED;
              `;
              
              await execSQL(supabase, sql);
              log('   ✅ Fixed! Added bukti_url alias', 'green');
            }
          } catch (error) {
            log(`   ❌ Failed: ${error.message}`, 'red');
          }
        }
        console.log('');
      }
    }
  }
  
  // Handle medium severity (unused tables)
  if (medium.length > 0) {
    logSection('🟡 MEDIUM PRIORITY - UNUSED TABLES');
    
    log('The following tables are not used in your code:', 'yellow');
    medium.forEach(rec => {
      if (rec.type === 'unused_table') {
        log(`   • ${rec.table}`, 'white');
      }
    });
    console.log('');
    
    log('⚠️  WARNING: Removing tables is PERMANENT!', 'red');
    log('   Make sure you have a backup before proceeding.', 'yellow');
    console.log('');
    
    const confirmed = await askConfirmation(
      colors.yellow + 'Do you want to remove unused tables? (y/n): ' + colors.reset
    );
    
    if (confirmed) {
      for (const rec of medium) {
        if (rec.type === 'unused_table') {
          log(`\n🗑️  Removing table: ${rec.table}`, 'cyan');
          
          try {
            await execSQL(supabase, rec.sql);
            log(`   ✅ Removed successfully`, 'green');
          } catch (error) {
            log(`   ❌ Failed: ${error.message}`, 'red');
          }
        }
      }
    } else {
      log('\n⏭️  Skipped unused table removal', 'cyan');
    }
  }
  
  logSection('✅ CLEANUP COMPLETE');
  log('Database cleanup finished!', 'green');
  console.log('');
  log('Next steps:', 'bright');
  log('   1. Run audit again: npm run audit:db', 'cyan');
  log('   2. Test your application', 'cyan');
  log('   3. Check for any errors', 'cyan');
  console.log('');
}

// Run
cleanupDatabase().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
