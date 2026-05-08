// ============================================================================
// CLEAN DATA ROWS - Remove all colors from data
// ============================================================================
// Script untuk membersihkan semua warna di data rows
// Background putih, font hitam, clean & simple
// Run: node clean-data-rows.js
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

console.log('🧹 Cleaning data rows...\n');

async function cleanDataRows() {
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
    // Clean ALL data rows (from row 2 to row 1000)
    // Background: White, Font: Black, No borders, No alternating colors
    // ========================================================================
    
    console.log('🧹 Cleaning Transactions data rows...');
    
    // Transactions - Clean rows 2-1000
    requests.push({
      repeatCell: {
        range: {
          sheetId: transactionsSheetId,
          startRowIndex: 1,    // Row 2 (0-indexed)
          endRowIndex: 1000,   // Up to row 1000
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1, green: 1, blue: 1 }, // White
            textFormat: {
              foregroundColor: { red: 0, green: 0, blue: 0 }, // Black
              fontSize: 10,
              bold: false,
            },
            borders: {
              top: { style: 'NONE' },
              bottom: { style: 'NONE' },
              left: { style: 'NONE' },
              right: { style: 'NONE' },
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,borders)',
      },
    });
    
    console.log('🧹 Cleaning Production data rows...');
    
    // Production - Clean rows 2-1000
    requests.push({
      repeatCell: {
        range: {
          sheetId: productionSheetId,
          startRowIndex: 1,    // Row 2 (0-indexed)
          endRowIndex: 1000,   // Up to row 1000
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1, green: 1, blue: 1 }, // White
            textFormat: {
              foregroundColor: { red: 0, green: 0, blue: 0 }, // Black
              fontSize: 10,
              bold: false,
            },
            borders: {
              top: { style: 'NONE' },
              bottom: { style: 'NONE' },
              left: { style: 'NONE' },
              right: { style: 'NONE' },
            },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,borders)',
      },
    });

    // Execute requests
    console.log('⚙️  Applying changes...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests },
    });

    console.log('✅ Data rows cleaned!\n');
    console.log('📊 Changes applied:');
    console.log('   ✅ Background: White (clean)');
    console.log('   ✅ Font: Black (readable)');
    console.log('   ✅ No borders');
    console.log('   ✅ No alternating colors');
    console.log('   ✅ Simple & professional');
    console.log('');
    console.log('🎉 Refresh your spreadsheet to see the changes!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanDataRows();
