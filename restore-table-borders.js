// ============================================================================
// RESTORE TABLE BORDERS - Add back table lines
// ============================================================================
// Script untuk mengembalikan garis tabel
// Background putih, font hitam, dengan garis tabel yang rapi
// Run: node restore-table-borders.js
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

console.log('📐 Restoring table borders...\n');

async function restoreTableBorders() {
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
    // Apply table borders to all cells (header + data)
    // Background: White, Font: Black, WITH borders
    // ========================================================================
    
    console.log('📐 Adding borders to Transactions sheet...');
    
    // Transactions - Add borders to all cells (rows 1-1000, columns A-L)
    requests.push({
      updateBorders: {
        range: {
          sheetId: transactionsSheetId,
          startRowIndex: 0,
          endRowIndex: 1000,
          startColumnIndex: 0,
          endColumnIndex: 12, // Column A-L
        },
        top: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 }, // Light gray
        },
        bottom: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 },
        },
        left: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 },
        },
        right: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 },
        },
        innerHorizontal: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 },
        },
        innerVertical: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 },
        },
      },
    });
    
    console.log('📐 Adding borders to Production sheet...');
    
    // Production - Add borders to all cells (rows 1-1000, columns A-L)
    requests.push({
      updateBorders: {
        range: {
          sheetId: productionSheetId,
          startRowIndex: 0,
          endRowIndex: 1000,
          startColumnIndex: 0,
          endColumnIndex: 12, // Column A-L
        },
        top: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 },
        },
        bottom: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 },
        },
        left: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 },
        },
        right: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 },
        },
        innerHorizontal: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 },
        },
        innerVertical: {
          style: 'SOLID',
          width: 1,
          color: { red: 0.8, green: 0.8, blue: 0.8 },
        },
      },
    });

    // Execute requests
    console.log('⚙️  Applying changes...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests },
    });

    console.log('✅ Table borders restored!\n');
    console.log('📊 Final result:');
    console.log('   ✅ Header: Navy blue dengan teks putih');
    console.log('   ✅ Data: Background putih, font hitam');
    console.log('   ✅ Borders: Garis tabel abu-abu (rapi)');
    console.log('   ✅ Clean & professional');
    console.log('');
    console.log('🎉 Refresh your spreadsheet to see the changes!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

restoreTableBorders();
