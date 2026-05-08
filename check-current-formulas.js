// ============================================================================
// CHECK CURRENT FORMULAS
// ============================================================================
// Script untuk mengecek formula yang sebenarnya ada di Live Dashboard
// Run: node check-current-formulas.js
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

console.log('🔍 Checking current formulas in Live Dashboard...\n');

async function checkCurrentFormulas() {
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

    // Get formulas (not values)
    console.log('📊 Reading formulas from Live Dashboard...');
    console.log('');

    // Check B4 (dropdown cell)
    const b4Data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!B4',
      valueRenderOption: 'FORMULA',
    });
    console.log('Cell B4 (Dropdown):');
    console.log('  Value:', b4Data.data.values ? b4Data.data.values[0][0] : '(empty)');
    console.log('');

    // Check B9 (Total Penjualan)
    const b9Data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!B9',
      valueRenderOption: 'FORMULA',
    });
    console.log('Cell B9 (Total Penjualan):');
    console.log('  Formula:', b9Data.data.values ? b9Data.data.values[0][0] : '(empty)');
    console.log('');

    // Check D9 (Total Produksi)
    const d9Data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!D9',
      valueRenderOption: 'FORMULA',
    });
    console.log('Cell D9 (Total Produksi):');
    console.log('  Formula:', d9Data.data.values ? d9Data.data.values[0][0] : '(empty)');
    console.log('');

    // Check A14 (Transactions table)
    const a14Data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!A14',
      valueRenderOption: 'FORMULA',
    });
    console.log('Cell A14 (Transactions table):');
    console.log('  Formula:', a14Data.data.values ? a14Data.data.values[0][0] : '(empty)');
    console.log('');

    // Check A19 (Production table)
    const a19Data = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!A19',
      valueRenderOption: 'FORMULA',
    });
    console.log('Cell A19 (Production table):');
    console.log('  Formula:', a19Data.data.values ? a19Data.data.values[0][0] : '(empty)');
    console.log('');

    // Now check actual values to see errors
    console.log('='.repeat(80));
    console.log('');
    console.log('📊 Checking actual values (to see errors)...');
    console.log('');

    const valuesData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!B9:H9',
      valueRenderOption: 'FORMATTED_VALUE',
    });
    console.log('Row 9 values:', valuesData.data.values ? valuesData.data.values[0] : '(empty)');
    console.log('');

    // Try to manually test the formula
    console.log('='.repeat(80));
    console.log('');
    console.log('🧪 Testing if FILTER function works...');
    console.log('');
    
    // Test simple SUMIFS
    const testFormula = '=SUMIFS(Transactions!K:K,Transactions!C:C,"Donattour K3PG")';
    console.log('Test formula:', testFormula);
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!P1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [[testFormula]] },
    });

    const testResult = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!P1',
    });
    console.log('Test result:', testResult.data.values ? testResult.data.values[0][0] : '(error)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCurrentFormulas();
