// ============================================================================
// FIX GOOGLE SHEETS FORMAT - Remove Conditional Formatting
// ============================================================================
// Script untuk menghapus conditional formatting yang bermasalah
// Run: node fix-google-sheets-format.js
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

console.log('🔧 Fixing Google Sheets formatting...\n');

async function fixGoogleSheets() {
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

    console.log('📋 Found sheets:');
    console.log('   - Transactions (ID:', transactionsSheetId, ')');
    console.log('   - Production (ID:', productionSheetId, ')');
    console.log('');

    const requests = [];

    // ========================================================================
    // STEP 1: DELETE ALL CONDITIONAL FORMAT RULES
    // ========================================================================
    
    console.log('🗑️  Removing all conditional formatting rules...');
    
    // Get all conditional format rules
    const transactionsRules = transactionsSheet.conditionalFormats || [];
    const productionRules = productionSheet.conditionalFormats || [];
    
    // Delete all rules for Transactions sheet
    for (let i = 0; i < transactionsRules.length; i++) {
      requests.push({
        deleteConditionalFormatRule: {
          sheetId: transactionsSheetId,
          index: 0, // Always delete first rule
        },
      });
    }
    
    // Delete all rules for Production sheet
    for (let i = 0; i < productionRules.length; i++) {
      requests.push({
        deleteConditionalFormatRule: {
          sheetId: productionSheetId,
          index: 0, // Always delete first rule
        },
      });
    }

    // ========================================================================
    // STEP 2: CLEAR ALL BACKGROUND COLORS (except header)
    // ========================================================================
    
    console.log('🎨 Clearing all background colors...');
    
    // Clear Transactions data rows
    requests.push({
      repeatCell: {
        range: {
          sheetId: transactionsSheetId,
          startRowIndex: 1, // Skip header
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1, green: 1, blue: 1 }, // White
          },
        },
        fields: 'userEnteredFormat.backgroundColor',
      },
    });
    
    // Clear Production data rows
    requests.push({
      repeatCell: {
        range: {
          sheetId: productionSheetId,
          startRowIndex: 1, // Skip header
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1, green: 1, blue: 1 }, // White
          },
        },
        fields: 'userEnteredFormat.backgroundColor',
      },
    });

    // ========================================================================
    // STEP 3: REAPPLY HEADER FORMATTING (Dark Gray)
    // ========================================================================
    
    console.log('📊 Reapplying header formatting...');
    
    // Transactions header
    requests.push({
      repeatCell: {
        range: {
          sheetId: transactionsSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.26, green: 0.26, blue: 0.26 }, // Dark gray
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              fontSize: 11,
              bold: true,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat',
      },
    });
    
    // Production header
    requests.push({
      repeatCell: {
        range: {
          sheetId: productionSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.26, green: 0.26, blue: 0.26 }, // Dark gray
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              fontSize: 11,
              bold: true,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat',
      },
    });

    // Execute all requests
    console.log('⚙️  Applying changes...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests },
    });

    console.log('✅ Formatting fixed successfully!\n');
    console.log('📊 Changes applied:');
    console.log('   ✅ Removed all conditional formatting rules');
    console.log('   ✅ Cleared all background colors (data rows)');
    console.log('   ✅ Reapplied dark gray header');
    console.log('   ✅ All data rows now visible with white background');
    console.log('');
    console.log('🎉 Google Sheets is now clean and professional!');
    console.log('📋 Refresh your spreadsheet to see the changes');

  } catch (error) {
    console.error('❌ Error fixing sheets:', error.message);
    process.exit(1);
  }
}

fixGoogleSheets();
