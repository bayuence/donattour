// ============================================================================
// ADD DASHBOARD FORMULAS
// ============================================================================
// Script untuk menambahkan formulas ke Live Dashboard
// Formulas akan auto-filter data berdasarkan outlet yang dipilih
// Run: node add-dashboard-formulas.js
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

console.log('📐 Adding formulas to Live Dashboard...\n');

async function addDashboardFormulas() {
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

    console.log('📝 Preparing formulas...');
    console.log('');

    // ========================================================================
    // FORMULAS SETUP
    // ========================================================================
    
    const formulas = [
      // Row 9: Summary Cards (values)
      // B9: Total Penjualan
      ['=IF(ISBLANK($B$4),"Pilih outlet dulu",TEXT(SUMIF(Transactions!$C:$C,$B$4,Transactions!$J:$J),"Rp #,##0"))'],
      // D9: Total Produksi
      ['=IF(ISBLANK($B$4),"Pilih outlet dulu",SUMIF(Production!$C:$C,$B$4,Production!$G:$G)&" pcs")'],
      // F9: Inventory Status (placeholder - need inventory sheet)
      ['=IF(ISBLANK($B$4),"Pilih outlet dulu","N/A")'],
      // H9: Karyawan Hadir (placeholder - need attendance sheet)
      ['=IF(ISBLANK($B$4),"Pilih outlet dulu","N/A")'],
    ];

    // Update summary cards
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!B9',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[formulas[0][0]]] },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!D9',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[formulas[1][0]]] },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!F9',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[formulas[2][0]]] },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!H9',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[formulas[3][0]]] },
    });

    console.log('✅ Summary formulas added');
    console.log('');

    // ========================================================================
    // TRANSACTIONS TABLE - Use FILTER formula
    // ========================================================================
    
    console.log('📊 Adding transactions filter...');

    const transactionsFormula = '=IF(ISBLANK($B$4),"Pilih outlet dulu",IF(COUNTIF(Transactions!$C:$C,$B$4)=0,"Tidak ada transaksi",FILTER(Transactions!A:H,Transactions!$C:$C=$B$4)))';

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!A14',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[transactionsFormula]] },
    });

    console.log('✅ Transactions filter added');
    console.log('');

    // ========================================================================
    // PRODUCTION TABLE - Use FILTER formula
    // ========================================================================
    
    console.log('📊 Adding production filter...');

    const productionFormula = '=IF(ISBLANK($B$4),"Pilih outlet dulu",IF(COUNTIF(Production!$C:$C,$B$4)=0,"Tidak ada produksi",FILTER(Production!B:I,Production!$C:$C=$B$4)))';

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!A19',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[productionFormula]] },
    });

    console.log('✅ Production filter added');
    console.log('');

    console.log('✅ All formulas added successfully!\n');
    console.log('📊 Dashboard is now functional:');
    console.log('   ✅ Pilih outlet dari dropdown (cell B4)');
    console.log('   ✅ Summary cards akan update otomatis');
    console.log('   ✅ Transaksi akan difilter otomatis');
    console.log('   ✅ Produksi akan difilter otomatis');
    console.log('');
    console.log('📝 Refresh spreadsheet dan coba pilih outlet!');
    console.log('');
    console.log('⚠️  Note: Inventory dan Presensi perlu sheet tambahan');
    console.log('   Akan ditambahkan setelah data tersedia');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addDashboardFormulas();
