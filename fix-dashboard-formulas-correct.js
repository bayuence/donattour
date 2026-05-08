// ============================================================================
// FIX DASHBOARD FORMULAS - CORRECT VERSION
// ============================================================================
// Script untuk memperbaiki formulas dengan kolom yang benar
// Transactions: Outlet di Column C
// Production: Outlet di Column D
// Run: node fix-dashboard-formulas-correct.js
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

console.log('🔧 Fixing dashboard formulas with correct columns...\n');

async function fixDashboardFormulas() {
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

    console.log('📐 Updating formulas...');
    console.log('');

    // ========================================================================
    // SUMMARY FORMULAS
    // ========================================================================
    
    console.log('📊 Fixing summary cards...');

    const summaryFormulas = [
      // B9: Total Penjualan (Transactions Column K = Total Amount)
      ['=IFERROR(IF(ISBLANK($B$4),"Pilih outlet",TEXT(SUMIFS(Transactions!$K:$K,Transactions!$C:$C,$B$4),"Rp #,##0")),"Rp 0")'],
      // D9: Total Produksi (Production Column G = Success Qty)
      ['=IFERROR(IF(ISBLANK($B$4),"Pilih outlet",SUMIFS(Production!$G:$G,Production!$D:$D,$B$4)&" pcs"),"0 pcs")'],
      // F9: Inventory Status
      ['=IFERROR(IF(ISBLANK($B$4),"Pilih outlet","N/A"),"N/A")'],
      // H9: Karyawan Hadir
      ['=IFERROR(IF(ISBLANK($B$4),"Pilih outlet","N/A"),"N/A")'],
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
    // TABLE FORMULAS
    // ========================================================================
    
    console.log('📊 Fixing table filters...');

    // Transactions table - Outlet di Column C
    const transactionsFormula = '=IFERROR(IF(ISBLANK($B$4),"Pilih outlet dari dropdown di atas",FILTER(Transactions!A:L,Transactions!$C:$C=$B$4)),"Tidak ada data transaksi untuk outlet ini")';

    // Production table - Outlet di Column D
    const productionFormula = '=IFERROR(IF(ISBLANK($B$4),"Pilih outlet dari dropdown di atas",FILTER(Production!A:L,Production!$D:$D=$B$4)),"Tidak ada data produksi untuk outlet ini")';

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

    console.log('✅ All formulas fixed successfully!\n');
    console.log('📊 Corrections applied:');
    console.log('   ✅ Transactions: Using Column C (Outlet)');
    console.log('   ✅ Production: Using Column D (Outlet) - FIXED!');
    console.log('   ✅ Summary: Using correct columns for totals');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Refresh spreadsheet');
    console.log('   2. Select "Donattour K3PG" from dropdown');
    console.log('   3. Data should appear without errors!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixDashboardFormulas();
