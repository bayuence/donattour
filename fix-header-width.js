// ============================================================================
// FIX HEADER WIDTH - Only color used columns
// ============================================================================
// Script untuk memperbaiki lebar header agar hanya di kolom yang terpakai
// Run: node fix-header-width.js
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

console.log('🔧 Fixing header width...\n');

async function fixHeaderWidth() {
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
    // STEP 1: Clear all header formatting first
    // ========================================================================
    
    console.log('🗑️  Clearing old header formatting...');
    
    // Clear Transactions header (entire row 1)
    requests.push({
      repeatCell: {
        range: {
          sheetId: transactionsSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1, green: 1, blue: 1 }, // White
            textFormat: {
              foregroundColor: { red: 0, green: 0, blue: 0 }, // Black
              fontSize: 10,
              bold: false,
            },
          },
        },
        fields: 'userEnteredFormat',
      },
    });
    
    // Clear Production header (entire row 1)
    requests.push({
      repeatCell: {
        range: {
          sheetId: productionSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1, green: 1, blue: 1 }, // White
            textFormat: {
              foregroundColor: { red: 0, green: 0, blue: 0 }, // Black
              fontSize: 10,
              bold: false,
            },
          },
        },
        fields: 'userEnteredFormat',
      },
    });

    // ========================================================================
    // STEP 2: Apply header formatting ONLY to used columns
    // ========================================================================
    
    console.log('🎨 Applying header formatting to used columns only...');
    
    // Transactions header - Column A to L (12 columns)
    requests.push({
      repeatCell: {
        range: {
          sheetId: transactionsSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0, // Column A
          endColumnIndex: 12,  // Column L (0-indexed, so 12 = column L)
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.18, green: 0.31, blue: 0.56 }, // Navy blue
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 }, // White
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
    
    // Production header - Column A to L (12 columns)
    requests.push({
      repeatCell: {
        range: {
          sheetId: productionSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0, // Column A
          endColumnIndex: 12,  // Column L
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.18, green: 0.31, blue: 0.56 }, // Navy blue
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 }, // White
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

    console.log('✅ Header width fixed!\n');
    console.log('📊 Changes applied:');
    console.log('   ✅ Header color only on used columns (A-L)');
    console.log('   ✅ Unused columns remain white');
    console.log('   ✅ Clean & professional look');
    console.log('');
    console.log('🎉 Refresh your spreadsheet to see the changes!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixHeaderWidth();
