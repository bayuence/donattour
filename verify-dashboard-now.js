// ============================================================================
// VERIFY DASHBOARD NOW
// ============================================================================
// Script untuk mengecek status dashboard saat ini
// Run: node verify-dashboard-now.js
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

console.log('🔍 Verifying dashboard status...\n');

async function verifyDashboard() {
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

    // Read current state
    console.log('📊 Reading current dashboard state...');
    console.log('');

    const dashboardData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!A1:L30',
    });

    const rows = dashboardData.data.values;

    console.log('Row 4 (Dropdown):', rows[3]);
    console.log('Row 9 (Summary):', rows[8]);
    console.log('Row 14 (Transactions):', rows[13]);
    console.log('Row 19 (Production):', rows[18]);
    console.log('');

    // Check formulas
    console.log('📐 Checking formulas...');
    console.log('');

    const b9Formula = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!B9',
      valueRenderOption: 'FORMULA',
    });
    console.log('B9 Formula:', b9Formula.data.values ? b9Formula.data.values[0][0] : '(empty)');

    const d9Formula = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!D9',
      valueRenderOption: 'FORMULA',
    });
    console.log('D9 Formula:', d9Formula.data.values ? d9Formula.data.values[0][0] : '(empty)');

    const a14Formula = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!A14',
      valueRenderOption: 'FORMULA',
    });
    console.log('A14 Formula:', a14Formula.data.values ? a14Formula.data.values[0][0] : '(empty)');
    console.log('');

    // Test QUERY directly
    console.log('🧪 Testing QUERY function directly...');
    console.log('');

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!Q1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['=QUERY(Transactions!A:L,"SELECT K WHERE C=\'Donattour K3PG\'",0)']] },
    });

    const queryTest = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!Q1',
    });
    console.log('QUERY test result:', queryTest.data.values ? queryTest.data.values[0][0] : '(error)');
    console.log('');

    // Test simpler approach
    console.log('🧪 Testing simpler QUERY...');
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!Q2',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [['=QUERY(Transactions!A2:L100,"SELECT K WHERE C=\'Donattour K3PG\'",0)']] },
    });

    const queryTest2 = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Live Dashboard!Q2',
    });
    console.log('QUERY test 2 result:', queryTest2.data.values ? queryTest2.data.values[0][0] : '(error)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyDashboard();
