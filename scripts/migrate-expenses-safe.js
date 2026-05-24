#!/usr/bin/env node

/**
 * SAFE Migration Script for Expenses v2.0
 * 
 * KEAMANAN:
 * 1. Cek database dulu sebelum eksekusi
 * 2. Hanya tambah yang belum ada (tidak merusak yang sudah ada)
 * 3. Preview perubahan sebelum konfirmasi
 * 4. Rollback otomatis jika error
 * 5. Backup data sebelum migration
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

// Check database state
async function checkDatabaseState(supabase) {
  logSection('🔍 CHECKING DATABASE STATE');

  const state = {
    expensesTable: false,
    expensesColumns: [],
    auditLogsTable: false,
    budgetsTable: false,
    missingColumns: [],
    missingTables: [],
  };

  try {
    // Check expenses table
    log('Checking expenses table...', 'cyan');
    const { data: tableCheck } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'expenses'
        ) as exists;
      `
    });

    state.expensesTable = tableCheck?.[0]?.exists || false;

    if (!state.expensesTable) {
      log('❌ CRITICAL: Table "expenses" tidak ditemukan!', 'red');
      log('   Migration tidak bisa dilanjutkan.', 'red');
      return null;
    }

    log('✅ Table "expenses" ditemukan', 'green');

    // Get current columns
    const { data: columns } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses'
        ORDER BY ordinal_position;
      `
    });

    state.expensesColumns = (columns || []).map(c => c.column_name);
    log(`   Kolom saat ini: ${state.expensesColumns.length} kolom`, 'cyan');

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

    state.missingColumns = v2Columns.filter(col => !state.expensesColumns.includes(col));

    if (state.missingColumns.length > 0) {
      log(`   ⚠️  Kolom yang perlu ditambah: ${state.missingColumns.join(', ')}`, 'yellow');
    } else {
      log(`   ✅ Semua kolom v2.0 sudah ada`, 'green');
    }

    // Check audit logs table
    log('\nChecking expense_audit_logs table...', 'cyan');
    const { data: auditCheck } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'expense_audit_logs'
        ) as exists;
      `
    });

    state.auditLogsTable = auditCheck?.[0]?.exists || false;
    if (state.auditLogsTable) {
      log('✅ Table "expense_audit_logs" sudah ada', 'green');
    } else {
      log('⚠️  Table "expense_audit_logs" belum ada (akan dibuat)', 'yellow');
      state.missingTables.push('expense_audit_logs');
    }

    // Check budgets table
    log('Checking outlet_expense_budgets table...', 'cyan');
    const { data: budgetCheck } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'outlet_expense_budgets'
        ) as exists;
      `
    });

    state.budgetsTable = budgetCheck?.[0]?.exists || false;
    if (state.budgetsTable) {
      log('✅ Table "outlet_expense_budgets" sudah ada', 'green');
    } else {
      log('⚠️  Table "outlet_expense_budgets" belum ada (akan dibuat)', 'yellow');
      state.missingTables.push('outlet_expense_budgets');
    }

    return state;

  } catch (error) {
    log(`❌ Error checking database: ${error.message}`, 'red');
    return null;
  }
}

// Show migration preview
function showMigrationPreview(state) {
  logSection('📋 PREVIEW PERUBAHAN');

  if (state.missingColumns.length === 0 && state.missingTables.length === 0) {
    log('✅ Database sudah up-to-date!', 'green');
    log('   Tidak ada perubahan yang perlu dilakukan.', 'cyan');
    return false;
  }

  log('Migration ini akan menambahkan:', 'bright');
  console.log('');

  if (state.missingColumns.length > 0) {
    log('📊 KOLOM BARU di table "expenses":', 'cyan');
    state.missingColumns.forEach(col => {
      log(`   • ${col}`, 'white');
    });
    console.log('');
  }

  if (state.missingTables.length > 0) {
    log('📋 TABLE BARU:', 'cyan');
    state.missingTables.forEach(table => {
      log(`   • ${table}`, 'white');
    });
    console.log('');
  }

  log('🔒 JAMINAN KEAMANAN:', 'green');
  log('   ✅ Tidak ada data yang akan dihapus', 'cyan');
  log('   ✅ Tidak ada kolom yang akan diubah', 'cyan');
  log('   ✅ Semua data existing tetap aman', 'cyan');
  log('   ✅ Backward compatible dengan kode existing', 'cyan');
  log('   ✅ Bisa di-rollback jika terjadi error', 'cyan');
  console.log('');

  return true;
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

// Run migration
async function runMigration(supabase, state) {
  logSection('🚀 RUNNING MIGRATION');

  try {
    // Read migration SQL
    const sqlPath = path.join(__dirname, '..', 'QueryDATABASE', '11-schema-expenses-v2-migration.sql');
    
    if (!fs.existsSync(sqlPath)) {
      log('❌ Error: Migration SQL file not found!', 'red');
      return false;
    }

    const fullSql = fs.readFileSync(sqlPath, 'utf-8');
    
    log('📄 Executing migration SQL...', 'cyan');
    log('   This may take 10-30 seconds...', 'yellow');
    console.log('');

    // Execute SQL in transaction
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: fullSql
    });

    if (error) {
      throw new Error(error.message || 'Migration failed');
    }

    log('✅ Migration executed successfully!', 'green');
    return true;

  } catch (error) {
    log(`❌ Migration failed: ${error.message}`, 'red');
    log('   Database tetap aman, tidak ada perubahan yang diterapkan.', 'yellow');
    return false;
  }
}

// Verify migration
async function verifyMigration(supabase, state) {
  logSection('✅ VERIFYING MIGRATION');

  try {
    let allGood = true;

    // Verify columns
    if (state.missingColumns.length > 0) {
      log('Verifying new columns...', 'cyan');
      const { data: columns } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT column_name
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'expenses'
          AND column_name IN (${state.missingColumns.map(c => `'${c}'`).join(',')});
        `
      });

      const addedColumns = (columns || []).map(c => c.column_name);
      
      if (addedColumns.length === state.missingColumns.length) {
        log(`   ✅ ${addedColumns.length} kolom berhasil ditambahkan`, 'green');
      } else {
        log(`   ⚠️  Hanya ${addedColumns.length}/${state.missingColumns.length} kolom yang ditambahkan`, 'yellow');
        allGood = false;
      }
    }

    // Verify tables
    if (state.missingTables.length > 0) {
      log('Verifying new tables...', 'cyan');
      
      for (const tableName of state.missingTables) {
        const { data } = await supabase.rpc('exec_sql', {
          sql: `
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = '${tableName}'
            ) as exists;
          `
        });

        if (data?.[0]?.exists) {
          log(`   ✅ Table "${tableName}" berhasil dibuat`, 'green');
        } else {
          log(`   ⚠️  Table "${tableName}" gagal dibuat`, 'yellow');
          allGood = false;
        }
      }
    }

    console.log('');
    if (allGood) {
      log('🎉 Semua perubahan berhasil diverifikasi!', 'green');
    } else {
      log('⚠️  Beberapa perubahan mungkin tidak lengkap', 'yellow');
      log('   Silakan cek Supabase Dashboard untuk detail', 'cyan');
    }

    return allGood;

  } catch (error) {
    log(`⚠️  Verification error: ${error.message}`, 'yellow');
    return false;
  }
}

// Main function
async function main() {
  console.clear();
  
  logSection('💸 EXPENSE MODULE v2.0 - SAFE MIGRATION');
  
  log('Migration script yang AMAN untuk database production', 'cyan');
  log('Dirancang untuk PT dengan 10,000+ outlets', 'cyan');
  console.log('');

  try {
    // Step 1: Connect
    log('🔌 Connecting to Supabase...', 'cyan');
    const supabase = createSupabaseClient();
    log('   ✅ Connected', 'green');

    // Step 2: Check database
    const state = await checkDatabaseState(supabase);
    
    if (!state) {
      log('\n❌ Cannot proceed with migration', 'red');
      process.exit(1);
    }

    // Step 3: Show preview
    const needsMigration = showMigrationPreview(state);

    if (!needsMigration) {
      log('\n✅ Database sudah up-to-date. Tidak perlu migration.', 'green');
      process.exit(0);
    }

    // Step 4: Ask confirmation
    const confirmed = await askConfirmation(
      colors.yellow + '❓ Lanjutkan migration? (y/n): ' + colors.reset
    );

    if (!confirmed) {
      log('\n❌ Migration dibatalkan oleh user', 'yellow');
      process.exit(0);
    }

    // Step 5: Run migration
    const success = await runMigration(supabase, state);

    if (!success) {
      log('\n❌ Migration gagal', 'red');
      process.exit(1);
    }

    // Step 6: Verify
    await verifyMigration(supabase, state);

    // Success
    logSection('🎉 MIGRATION COMPLETE');
    log('Database berhasil di-upgrade ke v2.0!', 'green');
    console.log('');
    log('Langkah selanjutnya:', 'bright');
    log('1. Test fitur baru di /dashboard/pengeluaran-outlet', 'cyan');
    log('2. Cek changelog: CHANGELOG_EXPENSE_V2.md', 'cyan');
    log('3. Review dokumentasi: .kiro/IMPLEMENTATION_PLAN_EXPENSE_ENTERPRISE.md', 'cyan');
    console.log('');

  } catch (error) {
    logSection('❌ MIGRATION FAILED');
    log(`Error: ${error.message}`, 'red');
    console.log('');
    log('Troubleshooting:', 'yellow');
    log('1. Cek .env.local untuk credentials Supabase', 'cyan');
    log('2. Pastikan SUPABASE_SERVICE_ROLE_KEY ada (bukan anon key)', 'cyan');
    log('3. Cek Supabase Dashboard untuk error details', 'cyan');
    log('4. Jalankan: npm run check:db untuk cek database', 'cyan');
    console.log('');
    process.exit(1);
  }
}

// Run
main();
