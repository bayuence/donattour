// ============================================================================
// TEST GOOGLE SHEETS CONNECTION
// ============================================================================
// Quick test script to verify Google Sheets setup
// Run: node test-google-sheets.js
// ============================================================================

// Load .env.local manually
const fs = require('fs');
const path = require('path');

console.log('=== TESTING GOOGLE SHEETS CONFIGURATION ===\n');

// Read .env.local file
console.log('1. Loading .env.local file...');
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ ERROR: .env.local file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');

envLines.forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
});

console.log('   ✅ .env.local loaded\n');

// Check environment variables
console.log('2. Checking environment variables...');
console.log('   GOOGLE_SHEETS_SPREADSHEET_ID:', process.env.GOOGLE_SHEETS_SPREADSHEET_ID ? '✅ Set' : '❌ Missing');
console.log('   GOOGLE_SHEETS_CLIENT_EMAIL:', process.env.GOOGLE_SHEETS_CLIENT_EMAIL ? '✅ Set' : '❌ Missing');
console.log('   GOOGLE_SHEETS_PRIVATE_KEY:', process.env.GOOGLE_SHEETS_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('');

if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID || 
    !process.env.GOOGLE_SHEETS_CLIENT_EMAIL || 
    !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
  console.log('❌ ERROR: Missing environment variables!');
  console.log('   Please check your .env.local file.');
  process.exit(1);
}

// Show values (masked)
console.log('2. Environment variable values:');
console.log('   Spreadsheet ID:', process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
console.log('   Client Email:', process.env.GOOGLE_SHEETS_CLIENT_EMAIL);
console.log('   Private Key:', process.env.GOOGLE_SHEETS_PRIVATE_KEY.substring(0, 50) + '...');
console.log('');

// Test Google Sheets API
console.log('3. Testing Google Sheets API connection...');

const { google } = require('googleapis');

async function testConnection() {
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

    // Try to get spreadsheet info
    console.log('   Connecting to spreadsheet...');
    const response = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    });

    console.log('   ✅ Connection successful!');
    console.log('   Spreadsheet title:', response.data.properties.title);
    console.log('   Sheets:', response.data.sheets.map(s => s.properties.title).join(', '));
    console.log('');
    console.log('🎉 All tests passed! Google Sheets is ready to use.');
  } catch (error) {
    console.log('   ❌ Connection failed!');
    console.log('   Error:', error.message);
    console.log('');
    
    if (error.message.includes('does not have permission') || 
        error.message.includes('Requested entity was not found')) {
      console.log('💡 SOLUTION: Service account belum punya akses ke spreadsheet!');
      console.log('');
      console.log('📧 Email yang harus di-share:');
      console.log('   ' + process.env.GOOGLE_SHEETS_CLIENT_EMAIL);
      console.log('');
      console.log('📝 Langkah-langkah:');
      console.log('   1. Buka spreadsheet: https://docs.google.com/spreadsheets/d/' + process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
      console.log('   2. Klik tombol "Share" (pojok kanan atas)');
      console.log('   3. Paste email di atas ke kolom "Add people and groups"');
      console.log('   4. Pilih role: "Editor"');
      console.log('   5. UNCHECK "Notify people" (jangan kirim email)');
      console.log('   6. Klik "Share" atau "Done"');
      console.log('');
      console.log('⚠️  PENTING: Copy email di atas dengan benar (termasuk @donattour-pos.iam.gserviceaccount.com)');
    } else if (error.message.includes('invalid_grant')) {
      console.log('💡 SOLUTION:');
      console.log('   The private key format is incorrect.');
      console.log('   Please check:');
      console.log('   1. Private key has quotes around it in .env.local');
      console.log('   2. Private key includes \\n for line breaks');
      console.log('   3. Private key starts with "-----BEGIN PRIVATE KEY-----"');
      console.log('   4. Private key ends with "-----END PRIVATE KEY-----"');
    } else {
      console.log('💡 SOLUTION:');
      console.log('   Please check the error message above and:');
      console.log('   1. Verify all environment variables are correct');
      console.log('   2. Make sure Google Sheets API is enabled');
      console.log('   3. Check service account has proper permissions');
    }
    
    process.exit(1);
  }
}

testConnection();
