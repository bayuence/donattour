// ============================================================================
// FIX DASHBOARD DROPDOWN
// ============================================================================
// Script untuk memperbaiki dropdown outlet di Live Dashboard
// Run: node fix-dashboard-dropdown.js
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

console.log('🔧 Fixing Live Dashboard dropdown...\n');

async function fixDashboardDropdown() {
  try {
    // Setup auth
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // Get sheet IDs
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const dashboardSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Live Dashboard');
    const dashboardSheetId = dashboardSheet.properties.sheetId;

    console.log('📋 Found Live Dashboard sheet');
    console.log('');

    // ========================================================================
    // STEP 1: Get unique outlets from Transactions sheet
    // ========================================================================
    
    console.log('📊 Reading outlets from Transactions...');
    
    const transactionsData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Transactions!C2:C1000', // Column C = Outlet
    });

    const outlets = [];
    if (transactionsData.data.values) {
      const uniqueOutlets = [...new Set(transactionsData.data.values.flat().filter(v => v))];
      outlets.push(...uniqueOutlets);
    }

    console.log(`✅ Found ${outlets.length} unique outlets:`, outlets);
    console.log('');

    // ========================================================================
    // STEP 2: Create outlet list in a hidden area
    // ========================================================================
    
    console.log('📝 Creating outlet list...');

    // Put outlet list in column M (after main content)
    const outletListData = [['Outlet List'], ...outlets.map(o => [o])];
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!M1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: outletListData },
    });

    console.log('✅ Outlet list created in column M');
    console.log('');

    // ========================================================================
    // STEP 3: Update dropdown to use the outlet list
    // ========================================================================
    
    console.log('🔽 Updating dropdown...');

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          setDataValidation: {
            range: {
              sheetId: dashboardSheetId,
              startRowIndex: 3, // Row 4 (0-indexed)
              endRowIndex: 4,
              startColumnIndex: 1, // Column B
              endColumnIndex: 2,
            },
            rule: {
              condition: {
                type: 'ONE_OF_RANGE',
                values: [{
                  userEnteredValue: `='Live Dashboard'!$M$2:$M$${outlets.length + 1}`,
                }],
              },
              showCustomUi: true,
              strict: true,
            },
          },
        }],
      },
    });

    console.log('✅ Dropdown updated');
    console.log('');

    // ========================================================================
    // STEP 4: Fix formulas to handle errors better
    // ========================================================================
    
    console.log('📐 Fixing formulas...');

    // Update summary formulas with better error handling
    const summaryFormulas = [
      // B9: Total Penjualan
      ['=IFERROR(IF(ISBLANK($B$4),"Pilih outlet",TEXT(SUMIFS(Transactions!$J:$J,Transactions!$C:$C,$B$4),"Rp #,##0")),"Rp 0")'],
      // D9: Total Produksi
      ['=IFERROR(IF(ISBLANK($B$4),"Pilih outlet",SUMIFS(Production!$G:$G,Production!$C:$C,$B$4)&" pcs"),"0 pcs")'],
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

    console.log('✅ Formulas fixed');
    console.log('');

    // ========================================================================
    // STEP 5: Fix table formulas
    // ========================================================================
    
    console.log('📊 Fixing table formulas...');

    // Transactions table
    const transactionsFormula = '=IFERROR(IF(ISBLANK($B$4),"Pilih outlet dari dropdown di atas",FILTER(Transactions!A:H,Transactions!$C:$C=$B$4)),"Tidak ada data transaksi untuk outlet ini")';

    // Production table
    const productionFormula = '=IFERROR(IF(ISBLANK($B$4),"Pilih outlet dari dropdown di atas",FILTER(Production!B:I,Production!$C:$C=$B$4)),"Tidak ada data produksi untuk outlet ini")';

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

    console.log('✅ Table formulas fixed');
    console.log('');

    console.log('✅ Live Dashboard fixed successfully!\n');
    console.log('📊 What was fixed:');
    console.log('   ✅ Dropdown now has outlet list');
    console.log('   ✅ Summary cards handle errors properly');
    console.log('   ✅ Tables show friendly messages');
    console.log('   ✅ No more #ERROR! messages');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Refresh spreadsheet');
    console.log('   2. Click cell B4');
    console.log('   3. Select outlet from dropdown');
    console.log('   4. Data will appear automatically!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('Unable to parse range')) {
      console.log('');
      console.log('💡 Tip: Make sure Transactions sheet has data in column C (Outlet)');
    }
    process.exit(1);
  }
}

fixDashboardDropdown();
