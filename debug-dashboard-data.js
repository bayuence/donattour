// ============================================================================
// DEBUG DASHBOARD DATA
// ============================================================================
// Script untuk mengecek data di Transactions dan Production sheets
// Run: node debug-dashboard-data.js
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

console.log('🔍 Debugging dashboard data...\n');

async function debugDashboardData() {
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
    // Check Transactions sheet
    // ========================================================================
    
    console.log('📊 Checking Transactions sheet...');
    console.log('');
    
    const transactionsData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Transactions!A1:L10', // Get first 10 rows
    });

    if (transactionsData.data.values) {
      console.log('Headers:', transactionsData.data.values[0]);
      console.log('');
      console.log('Sample data (first 3 rows):');
      for (let i = 1; i < Math.min(4, transactionsData.data.values.length); i++) {
        console.log(`Row ${i}:`, transactionsData.data.values[i]);
      }
    } else {
      console.log('❌ No data in Transactions sheet');
    }
    console.log('');
    console.log('='.repeat(80));
    console.log('');

    // ========================================================================
    // Check Production sheet
    // ========================================================================
    
    console.log('📊 Checking Production sheet...');
    console.log('');
    
    const productionData = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Production!A1:L10', // Get first 10 rows
    });

    if (productionData.data.values) {
      console.log('Headers:', productionData.data.values[0]);
      console.log('');
      console.log('Sample data (first 3 rows):');
      for (let i = 1; i < Math.min(4, productionData.data.values.length); i++) {
        console.log(`Row ${i}:`, productionData.data.values[i]);
      }
    } else {
      console.log('❌ No data in Production sheet');
    }
    console.log('');
    console.log('='.repeat(80));
    console.log('');

    // ========================================================================
    // Check which column has outlet name
    // ========================================================================
    
    console.log('🔍 Analysis:');
    console.log('');
    
    if (transactionsData.data.values && transactionsData.data.values.length > 0) {
      const headers = transactionsData.data.values[0];
      const outletColumnIndex = headers.findIndex(h => 
        h && (h.toLowerCase().includes('outlet') || h.toLowerCase().includes('toko'))
      );
      
      if (outletColumnIndex >= 0) {
        console.log(`✅ Transactions: Outlet column found at index ${outletColumnIndex} (Column ${String.fromCharCode(65 + outletColumnIndex)})`);
        console.log(`   Header: "${headers[outletColumnIndex]}"`);
        
        // Get unique outlet names
        const outletNames = new Set();
        for (let i = 1; i < transactionsData.data.values.length; i++) {
          if (transactionsData.data.values[i][outletColumnIndex]) {
            outletNames.add(transactionsData.data.values[i][outletColumnIndex]);
          }
        }
        console.log(`   Unique outlets: ${Array.from(outletNames).join(', ')}`);
      } else {
        console.log('❌ Transactions: Outlet column not found');
      }
    }
    console.log('');

    if (productionData.data.values && productionData.data.values.length > 0) {
      const headers = productionData.data.values[0];
      const outletColumnIndex = headers.findIndex(h => 
        h && (h.toLowerCase().includes('outlet') || h.toLowerCase().includes('toko'))
      );
      
      if (outletColumnIndex >= 0) {
        console.log(`✅ Production: Outlet column found at index ${outletColumnIndex} (Column ${String.fromCharCode(65 + outletColumnIndex)})`);
        console.log(`   Header: "${headers[outletColumnIndex]}"`);
        
        // Get unique outlet names
        const outletNames = new Set();
        for (let i = 1; i < productionData.data.values.length; i++) {
          if (productionData.data.values[i][outletColumnIndex]) {
            outletNames.add(productionData.data.values[i][outletColumnIndex]);
          }
        }
        console.log(`   Unique outlets: ${Array.from(outletNames).join(', ')}`);
      } else {
        console.log('❌ Production: Outlet column not found');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugDashboardData();
