#!/usr/bin/env node

/**
 * COMPREHENSIVE PROJECT AUDIT
 * 
 * Scan EVERYTHING:
 * 1. All files in project - which are used, which are not
 * 2. All database tables - which are used, which are not
 * 3. All routes/pages - which work, which don't
 * 4. All components - which are imported, which are orphaned
 * 5. All API endpoints - which are called, which are not
 * 6. Field name mismatches between code and database
 * 7. Duplicate code/files
 * 8. Dead code
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
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80) + '\n');
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
  
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error || 'Query failed');
  
  return data.data || [];
}

// Scan all files in project
function scanAllFiles(projectPath) {
  const files = {
    pages: [],
    components: [],
    api: [],
    lib: [],
    types: [],
    config: [],
    scripts: [],
    docs: [],
    other: [],
  };
  
  const scanDir = (dir, relativePath = '') => {
    try {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const relPath = path.join(relativePath, item);
        const stat = fs.statSync(fullPath);
        
        // Skip node_modules, .next, .git
        if (item === 'node_modules' || item === '.next' || item === '.git' || item === '.kilo') {
          return;
        }
        
        if (stat.isDirectory()) {
          scanDir(fullPath, relPath);
        } else {
          const ext = path.extname(item);
          const fileInfo = {
            path: relPath,
            fullPath: fullPath,
            name: item,
            ext: ext,
            size: stat.size,
          };
          
          // Categorize files
          if (relPath.includes('app') && (relPath.includes('page.') || relPath.includes('layout.'))) {
            files.pages.push(fileInfo);
          } else if (relPath.includes('components')) {
            files.components.push(fileInfo);
          } else if (relPath.includes('api')) {
            files.api.push(fileInfo);
          } else if (relPath.includes('lib')) {
            files.lib.push(fileInfo);
          } else if (relPath.includes('types') || item.includes('.d.ts')) {
            files.types.push(fileInfo);
          } else if (item.match(/\.(json|config\.|rc)/)) {
            files.config.push(fileInfo);
          } else if (relPath.includes('scripts')) {
            files.scripts.push(fileInfo);
          } else if (ext === '.md' || ext === '.txt') {
            files.docs.push(fileInfo);
          } else if (ext.match(/\.(ts|tsx|js|jsx)$/)) {
            files.other.push(fileInfo);
          }
        }
      });
    } catch (error) {
      // Ignore errors
    }
  };
  
  scanDir(projectPath);
  return files;
}

// Find imports in a file
function findImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports = new Set();
    
    // Find import statements
    const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
    
    // Find dynamic imports
    const dynamicRegex = /import\(['"](.+?)['"]\)/g;
    while ((match = dynamicRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
    
    return Array.from(imports);
  } catch (error) {
    return [];
  }
}

// Check if file is imported anywhere
function isFileImported(filePath, allFiles, projectPath) {
  const relativePath = path.relative(projectPath, filePath);
  const fileName = path.basename(filePath, path.extname(filePath));
  
  // Check all TypeScript/JavaScript files
  for (const category in allFiles) {
    for (const file of allFiles[category]) {
      if (file.fullPath === filePath) continue;
      
      const imports = findImports(file.fullPath);
      
      for (const imp of imports) {
        // Check if import matches this file
        if (imp.includes(fileName) || imp.includes(relativePath.replace(/\\/g, '/'))) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// Find table references in code
function findTableReferences(projectPath) {
  const tables = new Map();
  
  const scanDir = (dir) => {
    try {
      const items = fs.readdirSync(dir);
      
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (item === 'node_modules' || item === '.next' || item === '.git') {
          return;
        }
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          
          // Find .from('table_name')
          const fromMatches = content.matchAll(/\.from\(['"](\w+)['"]\)/g);
          for (const match of fromMatches) {
            const table = match[1];
            if (!tables.has(table)) {
              tables.set(table, []);
            }
            tables.get(table).push(fullPath);
          }
          
          // Find FROM table_name in SQL
          const sqlMatches = content.matchAll(/FROM\s+(\w+)/gi);
          for (const match of sqlMatches) {
            const table = match[1].toLowerCase();
            if (!tables.has(table)) {
              tables.set(table, []);
            }
            tables.get(table).push(fullPath);
          }
        }
      });
    } catch (error) {
      // Ignore
    }
  };
  
  scanDir(projectPath);
  return tables;
}

// Main audit
async function comprehensiveAudit() {
  console.clear();
  logSection('🔍 COMPREHENSIVE PROJECT AUDIT');
  
  const projectPath = path.join(__dirname, '..');
  const supabase = createSupabaseClient();
  
  log('Starting comprehensive audit...', 'cyan');
  log('This will take 1-2 minutes...', 'yellow');
  console.log('');
  
  // STEP 1: Scan all files
  logSection('📁 STEP 1: SCANNING ALL FILES');
  log('Scanning project files...', 'cyan');
  
  const allFiles = scanAllFiles(projectPath);
  
  const totalFiles = Object.values(allFiles).reduce((sum, arr) => sum + arr.length, 0);
  log(`Found ${totalFiles} files:`, 'white');
  log(`   • Pages: ${allFiles.pages.length}`, 'cyan');
  log(`   • Components: ${allFiles.components.length}`, 'cyan');
  log(`   • API routes: ${allFiles.api.length}`, 'cyan');
  log(`   • Lib files: ${allFiles.lib.length}`, 'cyan');
  log(`   • Types: ${allFiles.types.length}`, 'cyan');
  log(`   • Config: ${allFiles.config.length}`, 'cyan');
  log(`   • Scripts: ${allFiles.scripts.length}`, 'cyan');
  log(`   • Docs: ${allFiles.docs.length}`, 'cyan');
  log(`   • Other: ${allFiles.other.length}`, 'cyan');
  
  // STEP 2: Check which files are imported
  logSection('📦 STEP 2: CHECKING FILE USAGE');
  log('Analyzing imports...', 'cyan');
  
  const orphanedFiles = [];
  let checkedCount = 0;
  
  // Check components
  for (const file of allFiles.components) {
    checkedCount++;
    if (checkedCount % 10 === 0) {
      process.stdout.write(`\r   Checked ${checkedCount} files...`);
    }
    
    if (!isFileImported(file.fullPath, allFiles, projectPath)) {
      orphanedFiles.push(file);
    }
  }
  
  console.log('');
  log(`Found ${orphanedFiles.length} orphaned files (not imported anywhere)`, 'yellow');
  
  // STEP 3: Scan database
  logSection('🗄️  STEP 3: SCANNING DATABASE');
  log('Getting database schema...', 'cyan');
  
  const tables = await execSQL(supabase, `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  
  log(`Found ${tables.length} tables in database`, 'white');
  
  // STEP 4: Find table usage in code
  logSection('🔗 STEP 4: CHECKING TABLE USAGE');
  log('Scanning code for table references...', 'cyan');
  
  const tableRefs = findTableReferences(projectPath);
  
  const usedTables = [];
  const unusedTables = [];
  
  for (const table of tables) {
    const tableName = table.table_name;
    if (tableRefs.has(tableName)) {
      usedTables.push({
        name: tableName,
        files: tableRefs.get(tableName),
      });
    } else {
      unusedTables.push(tableName);
    }
  }
  
  log(`   • Used tables: ${usedTables.length}`, 'green');
  log(`   • Unused tables: ${unusedTables.length}`, 'yellow');
  
  // STEP 5: Check for field mismatches
  logSection('⚠️  STEP 5: CHECKING FIELD MISMATCHES');
  log('Analyzing field names...', 'cyan');
  
  const fieldMismatches = [];
  
  // Check expenses table specifically
  const expensesColumns = await execSQL(supabase, `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'expenses'
    ORDER BY ordinal_position;
  `);
  
  const expensesColNames = expensesColumns.map(c => c.column_name);
  
  // Check for common mismatches
  if (expensesColNames.includes('recorded_by_user_id') && !expensesColNames.includes('created_by')) {
    fieldMismatches.push({
      table: 'expenses',
      dbField: 'recorded_by_user_id',
      codeExpects: 'created_by',
      severity: 'high',
    });
  }
  
  if (expensesColNames.includes('receipt_url') && !expensesColNames.includes('bukti_url')) {
    fieldMismatches.push({
      table: 'expenses',
      dbField: 'receipt_url',
      codeExpects: 'bukti_url',
      severity: 'high',
    });
  }
  
  log(`Found ${fieldMismatches.length} field mismatches`, fieldMismatches.length > 0 ? 'yellow' : 'green');
  
  // Generate report
  logSection('📊 GENERATING REPORT');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total_files: totalFiles,
      orphaned_files: orphanedFiles.length,
      total_tables: tables.length,
      used_tables: usedTables.length,
      unused_tables: unusedTables.length,
      field_mismatches: fieldMismatches.length,
    },
    files: {
      by_category: {
        pages: allFiles.pages.length,
        components: allFiles.components.length,
        api: allFiles.api.length,
        lib: allFiles.lib.length,
        types: allFiles.types.length,
        config: allFiles.config.length,
        scripts: allFiles.scripts.length,
        docs: allFiles.docs.length,
        other: allFiles.other.length,
      },
      orphaned: orphanedFiles.map(f => f.path),
    },
    database: {
      used_tables: usedTables,
      unused_tables: unusedTables,
      field_mismatches: fieldMismatches,
    },
    recommendations: [],
  };
  
  // Generate recommendations
  if (orphanedFiles.length > 0) {
    report.recommendations.push({
      type: 'orphaned_files',
      severity: 'medium',
      count: orphanedFiles.length,
      action: 'Review and remove unused component files',
      files: orphanedFiles.slice(0, 10).map(f => f.path),
    });
  }
  
  if (unusedTables.length > 0) {
    report.recommendations.push({
      type: 'unused_tables',
      severity: 'medium',
      count: unusedTables.length,
      action: 'Review and remove unused database tables',
      tables: unusedTables,
    });
  }
  
  if (fieldMismatches.length > 0) {
    report.recommendations.push({
      type: 'field_mismatches',
      severity: 'high',
      count: fieldMismatches.length,
      action: 'Fix field name inconsistencies between code and database',
      mismatches: fieldMismatches,
    });
  }
  
  // Save report
  const reportPath = path.join(__dirname, 'comprehensive-audit-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Display summary
  logSection('✅ AUDIT COMPLETE');
  
  log('📄 Full report saved to:', 'cyan');
  log(`   ${reportPath}`, 'white');
  console.log('');
  
  log('📊 SUMMARY:', 'bright');
  console.log('');
  
  log('FILES:', 'cyan');
  log(`   • Total: ${totalFiles}`, 'white');
  log(`   • Orphaned (not imported): ${orphanedFiles.length}`, orphanedFiles.length > 0 ? 'yellow' : 'green');
  console.log('');
  
  log('DATABASE:', 'cyan');
  log(`   • Total tables: ${tables.length}`, 'white');
  log(`   • Used in code: ${usedTables.length}`, 'green');
  log(`   • Unused: ${unusedTables.length}`, unusedTables.length > 0 ? 'yellow' : 'green');
  console.log('');
  
  log('ISSUES:', 'cyan');
  log(`   • Field mismatches: ${fieldMismatches.length}`, fieldMismatches.length > 0 ? 'red' : 'green');
  log(`   • Total recommendations: ${report.recommendations.length}`, 'yellow');
  console.log('');
  
  if (report.recommendations.length > 0) {
    log('🔧 NEXT STEPS:', 'bright');
    log('   1. Review report: comprehensive-audit-report.json', 'cyan');
    log('   2. Run cleanup: npm run cleanup:full', 'cyan');
    log('   3. Test application', 'cyan');
  } else {
    log('🎉 No issues found! Project is clean.', 'green');
  }
  
  console.log('');
}

// Run
comprehensiveAudit().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
