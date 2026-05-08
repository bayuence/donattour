// ============================================================================
// CHECK DATA TYPES
// ============================================================================
// Script untuk mengecek tipe data di kolom-kolom penting
// Run: node check-data-types.js
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

console.log('🔍 Checking data types...\n');

async function checkDataTypes() {
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

    // ========================================================================
    // Check Transactions Total Amount column
    // ========================================================================
    
    console.log('📊 Checking Transactions sheet - Total Amount column (K)...');
    console.log('');
    
    const transData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Transactions!K1:K5',
    });

    if (transData.data.values) {
      transData.data.values.forEach((row, index) => {
        const value = row[0];
        const type = typeof value;
        const isNumber = !isNaN(parseFloat(value)) && isFinite(value);
        console.log(`  Row ${index + 1}: "${value}" (type: ${type}, isNumber: ${isNumber})`);
      });
    }
    console.log('');

    // ========================================================================
    // Check Production Success Qty column
    // ========================================================================
    
    console.log('📊 Checking Production sheet - Success Qty column (G)...');
    console.log('');
    
    const prodData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Production!G1:G5',
    });

    if (prodData.data.values) {
      prodData.data.values.forEach((row, index) => {
        const value = row[0];
        const type = typeof value;
        const isNumber = !isNaN(parseFloat(value)) && isFinite(value);
        console.log(`  Row ${index + 1}: "${value}" (type: ${type}, isNumber: ${isNumber})`);
      });
    }
    console.log('');

    // ========================================================================
    // Try different formula approaches
    // ========================================================================
    
    console.log('🧪 Testing different formula approaches...');
    console.log('');

    // Test 1: Direct cell reference
    console.log('Test 1: Direct cell reference');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!P2',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['=Transactions!K2']] },
    });
    const test1 = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!P2',
    });
    console.log('  Result:', test1.data.values ? test1.data.values[0][0] : '(error)');
    console.log('');

    // Test 2: SUM with range
    console.log('Test 2: SUM with specific range');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!P3',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['=SUM(Transactions!K2:K2)']] },
    });
    const test2 = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!P3',
    });
    console.log('  Result:', test2.data.values ? test2.data.values[0][0] : '(error)');
    console.log('');

    // Test 3: SUMIF with specific range (not entire column)
    console.log('Test 3: SUMIF with specific range');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!P4',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['=SUMIF(Transactions!C2:C100,"Donattour K3PG",Transactions!K2:K100)']] },
    });
    const test3 = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!P4',
    });
    console.log('  Result:', test3.data.values ? test3.data.values[0][0] : '(error)');
    console.log('');

    // Test 4: Check if FILTER works
    console.log('Test 4: FILTER function');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!P5',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['=FILTER(Transactions!A2:C10,Transactions!C2:C10="Donattour K3PG")']] },
    });
    const test4 = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!P5',
    });
    console.log('  Result:', test4.data.values ? test4.data.values[0][0] : '(error)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDataTypes();
