// ============================================================================
// UPDATE OUTLET LIST FROM DATABASE
// ============================================================================
// Script untuk mengambil semua outlet dari database dan update dropdown
// Run: node update-outlet-list-from-db.js
// ============================================================================

const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
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

console.log('🔄 Updating outlet list from database...\n');

async function updateOutletListFromDB() {
  try {
    // ========================================================================
    // STEP 1: Get all outlets from database
    // ========================================================================
    
    console.log('📊 Connecting to database...');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: outlets, error } = await supabase
      .from('outlets')
      .select('id, nama, kode, status')
      .eq('status', 'aktif')
      .order('nama', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`✅ Found ${outlets.length} active outlets:`);
    outlets.forEach(outlet => {
      console.log(`   - ${outlet.nama} (${outlet.kode})`);
    });
    console.log('');

    // ========================================================================
    // STEP 2: Update Google Sheets dropdown
    // ========================================================================
    
    console.log('📝 Updating Google Sheets...');

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

    // Prepare outlet list data
    const outletListData = [
      ['Outlet List'],
      ...outlets.map(o => [o.nama])
    ];

    // Update column M with outlet list
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!M1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: outletListData },
    });

    console.log('✅ Outlet list updated in column M');
    console.log('');

    // Update dropdown validation
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

    console.log('✅ Outlet list updated successfully!\n');
    console.log('📊 Available outlets in dropdown:');
    outlets.forEach(outlet => {
      console.log(`   ✅ ${outlet.nama}`);
    });
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Refresh spreadsheet');
    console.log('   2. Click cell B4');
    console.log('   3. You will see all outlets in dropdown!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('Cannot find module')) {
      console.log('');
      console.log('💡 Installing required package...');
      console.log('   Run: npm install @supabase/supabase-js');
    }
    process.exit(1);
  }
}

updateOutletListFromDB();
