// ============================================================================
// RESET AND RESYNC - Clear sheets and resync all data
// ============================================================================
// Script untuk clear sheets dan resync semua data dengan format bersih
// Run: node reset-and-resync.js
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

console.log('🔄 Resetting and resyncing Google Sheets...\n');

async function resetAndResync() {
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
    const transactionsSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Transactions');
    const productionSheet = spreadsheet.data.sheets.find(s => s.properties.title === 'Production');

    const transactionsSheetId = transactionsSheet.properties.sheetId;
    const productionSheetId = productionSheet.properties.sheetId;

    console.log('📋 Found sheets');
    console.log('');

    const requests = [];

    // ========================================================================
    // STEP 1: CLEAR ALL DATA (keep headers)
    // ========================================================================
    
    console.log('🗑️  Clearing all data rows...');
    
    // Clear Transactions data (row 2 onwards)
    requests.push({
      updateCells: {
        range: {
          sheetId: transactionsSheetId,
          startRowIndex: 1, // Start from row 2
        },
        fields: '*',
      },
    });
    
    // Clear Production data (row 2 onwards)
    requests.push({
      updateCells: {
        range: {
          sheetId: productionSheetId,
          startRowIndex: 1, // Start from row 2
        },
        fields: '*',
      },
    });

    // ========================================================================
    // STEP 2: FORMAT HEADERS (Simple & Professional)
    // ========================================================================
    
    console.log('🎨 Formatting headers...');
    
    // Transactions header - Navy Blue
    requests.push({
      repeatCell: {
        range: {
          sheetId: transactionsSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.18, green: 0.31, blue: 0.56 }, // Navy blue #2E4F8F
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              fontSize: 10,
              bold: true,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat',
      },
    });
    
    // Production header - Navy Blue
    requests.push({
      repeatCell: {
        range: {
          sheetId: productionSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.18, green: 0.31, blue: 0.56 }, // Navy blue
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              fontSize: 10,
              bold: true,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat',
      },
    });

    // Execute requests
    console.log('⚙️  Applying changes...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests },
    });

    console.log('✅ Sheets cleared and formatted!\n');
    console.log('📊 Next steps:');
    console.log('   1. Reset sync log in database (run SQL query)');
    console.log('   2. Run: node test-sync.js');
    console.log('');
    console.log('🎉 Ready to resync all data!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetAndResync();
