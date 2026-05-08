// ============================================================================
// CHECK ITEMS DATA
// ============================================================================
// Script untuk mengecek data items yang ada
// Run: node check-items-data.js
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

console.log('🔍 Checking items data...\n');

async function checkItemsData() {
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

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Transactions!A2:L2',
    });

    const row = response.data.values ? response.data.values[0] : null;
    
    if (!row) {
      console.log('No data found');
      return;
    }

    console.log('Full row data:');
    row.forEach((cell, index) => {
      console.log(`  Column ${String.fromCharCode(65 + index)}: ${cell}`);
    });
    console.log('');

    // Parse items JSON
    const itemsJson = row[11]; // Column L (index 11)
    console.log('Items JSON (raw):');
    console.log(itemsJson);
    console.log('');

    try {
      const items = JSON.parse(itemsJson);
      console.log('Items (parsed):');
      console.log(JSON.stringify(items, null, 2));
    } catch (error) {
      console.log('Failed to parse JSON:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkItemsData();
