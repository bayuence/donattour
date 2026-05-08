// ============================================================================
// FIX DASHBOARD WITH QUERY FUNCTION
// ============================================================================
// Script untuk memperbaiki dashboard menggunakan QUERY function
// QUERY lebih reliable daripada FILTER/SUMIFS
// Run: node fix-dashboard-with-query.js
// ============================================================================

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

envLines.forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
});

console.log('🔧 Fixing dashboard with QUERY function...\n');

async function fixDashboardWithQuery() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    console.log('📐 Updating formulas with QUERY...');
    console.log('');

    // ========================================================================
    // SUMMARY FORMULAS - Using QUERY
    // ========================================================================
    
    console.log('📊 Fixing summary cards...');

    const summaryFormulas = [
      // B9: Total Penjualan - Using QUERY to SUM
      ['=IFERROR(IF(ISBLANK($B$4),"Pilih outlet",TEXT(SUM(QUERY(Transactions!A:L,"SELECT K WHERE C=\'"&$B$4&"\' AND K IS NOT NULL",0)),"Rp #,##0")),"Rp 0")'],
      // D9: Total Produksi - Using QUERY to SUM
      ['=IFERROR(IF(ISBLANK($B$4),"Pilih outlet",SUM(QUERY(Production!A:L,"SELECT G WHERE D=\'"&$B$4&"\' AND G IS NOT NULL",0))&" pcs"),"0 pcs")'],
      // F9: Inventory Status
      ['N/A'],
      // H9: Karyawan Hadir
      ['N/A'],
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Live Dashboard!B9', values: [[summaryFormulas[0][0]]] },
          { range: 'Live Dashboard!D9', values: [[summaryFormulas[1][0]]] },
          { range: 'Live Dashboard!F9', values: [[summaryFormulas[2][0]]] },
          { range: 'Live Dashboard!H9', values: [[summaryFormulas[3][0]]] },
        ],
      },
    });

    console.log('✅ Summary cards fixed');
    console.log('');

    // ========================================================================
    // TABLE FORMULAS - Using QUERY
    // ========================================================================
    
    console.log('📊 Fixing table filters...');

    // Transactions table - Using QUERY
    const transactionsFormula = '=IFERROR(IF(ISBLANK($B$4),"Pilih outlet dari dropdown di atas",QUERY(Transactions!A:L,"SELECT * WHERE C=\'"&$B$4&"\' AND A IS NOT NULL",1)),"Tidak ada data transaksi untuk outlet ini")';

    // Production table - Using QUERY
    const productionFormula = '=IFERROR(IF(ISBLANK($B$4),"Pilih outlet dari dropdown di atas",QUERY(Production!A:L,"SELECT * WHERE D=\'"&$B$4&"\' AND A IS NOT NULL",1)),"Tidak ada data produksi untuk outlet ini")';

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Live Dashboard!A14', values: [[transactionsFormula]] },
          { range: 'Live Dashboard!A19', values: [[productionFormula]] },
        ],
      },
    });

    console.log('✅ Table filters fixed');
    console.log('');

    console.log('✅ All formulas fixed with QUERY function!\n');
    console.log('📊 Changes applied:');
    console.log('   ✅ Using QUERY instead of SUMIFS (more reliable)');
    console.log('   ✅ Using QUERY instead of FILTER (more reliable)');
    console.log('   ✅ Should work now!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Refresh spreadsheet');
    console.log('   2. Select "Donattour K3PG" from dropdown');
    console.log('   3. Data should appear!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixDashboardWithQuery();
