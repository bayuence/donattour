// ============================================================================
// FIX ITEMS FORMAT IN GOOGLE SHEETS
// ============================================================================
// Script untuk memperbaiki format items dari JSON ke readable format
// Run: node fix-items-format.js
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

console.log('🔧 Fixing items format in Google Sheets...\n');

function formatItems(itemsJson) {
  try {
    const items = JSON.parse(itemsJson);
    if (!items || items.length === 0) return '-';
    
    return items
      .filter(item => item.product_name && item.quantity > 0)
      .map(item => {
        const price = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
        }).format(item.subtotal);
        return `${item.quantity}x ${item.product_name} (${price})`;
      })
      .join(', ');
  } catch (error) {
    return itemsJson; // Return as-is if can't parse
  }
}

async function fixItemsFormat() {
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
    // STEP 1: Update header
    // ========================================================================
    
    console.log('📝 Updating header...');
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Transactions!L1',
      valueInputOption: 'RAW',
      resource: {
        values: [['Items Detail']]
      },
    });

    console.log('✅ Header updated');
    console.log('');

    // ========================================================================
    // STEP 2: Read existing data
    // ========================================================================
    
    console.log('📊 Reading existing data...');
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Transactions!L2:L1000', // Column L (Items Detail)
    });

    const rows = response.data.values || [];
    console.log(`✅ Found ${rows.length} rows`);
    console.log('');

    if (rows.length === 0) {
      console.log('No data to fix');
      return;
    }

    // ========================================================================
    // STEP 3: Format items
    // ========================================================================
    
    console.log('🔄 Formatting items...');
    
    const formattedRows = rows.map((row, index) => {
      const itemsJson = row[0];
      if (!itemsJson || itemsJson === '-') {
        return ['-'];
      }
      
      const formatted = formatItems(itemsJson);
      if (index < 3) {
        console.log(`  Row ${index + 2}:`);
        console.log(`    Before: ${itemsJson.substring(0, 50)}...`);
        console.log(`    After: ${formatted}`);
      }
      return [formatted];
    });

    console.log('');

    // ========================================================================
    // STEP 4: Write back formatted data
    // ========================================================================
    
    console.log('📝 Writing formatted data...');
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Transactions!L2',
      valueInputOption: 'RAW',
      resource: {
        values: formattedRows
      },
    });

    console.log('✅ Data formatted successfully!');
    console.log('');
    console.log(`📊 Summary:`);
    console.log(`   Total rows formatted: ${formattedRows.length}`);
    console.log('');
    console.log('📝 Refresh spreadsheet to see the changes!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixItemsFormat();
