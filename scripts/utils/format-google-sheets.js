// ============================================================================
// FORMAT GOOGLE SHEETS - RAPIKAN TAMPILAN
// ============================================================================
// Script untuk merapikan tampilan Google Sheets
// Run: node format-google-sheets.js
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

console.log('🎨 Formatting Google Sheets...\n');

async function formatGoogleSheets() {
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

    if (!transactionsSheet || !productionSheet) {
      console.log('❌ Sheets not found!');
      return;
    }

    const transactionsSheetId = transactionsSheet.properties.sheetId;
    const productionSheetId = productionSheet.properties.sheetId;

    console.log('📋 Found sheets:');
    console.log('   - Transactions (ID:', transactionsSheetId, ')');
    console.log('   - Production (ID:', productionSheetId, ')');
    console.log('');

    // Batch update requests
    const requests = [];

    // ========================================================================
    // FORMAT TRANSACTIONS SHEET
    // ========================================================================

    // 1. Freeze header row
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: transactionsSheetId,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        fields: 'gridProperties.frozenRowCount',
      },
    });

    // 2. Format header row (bold, background color, center align)
    requests.push({
      repeatCell: {
        range: {
          sheetId: transactionsSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.26, green: 0.26, blue: 0.26 }, // Dark gray #424242
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              fontSize: 11,
              bold: true,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    // 3. Auto-resize columns
    for (let i = 0; i < 12; i++) {
      requests.push({
        autoResizeDimensions: {
          dimensions: {
            sheetId: transactionsSheetId,
            dimension: 'COLUMNS',
            startIndex: i,
            endIndex: i + 1,
          },
        },
      });
    }

    // 4. Set specific column widths for better display
    // Column A (Order ID): 150px
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: transactionsSheetId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 1,
        },
        properties: { pixelSize: 150 },
        fields: 'pixelSize',
      },
    });

    // Column B (Tanggal & Waktu): 180px
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: transactionsSheetId,
          dimension: 'COLUMNS',
          startIndex: 1,
          endIndex: 2,
        },
        properties: { pixelSize: 180 },
        fields: 'pixelSize',
      },
    });

    // Column C (Outlet): 150px
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: transactionsSheetId,
          dimension: 'COLUMNS',
          startIndex: 2,
          endIndex: 3,
        },
        properties: { pixelSize: 150 },
        fields: 'pixelSize',
      },
    });

    // Column K (Total Amount): 120px
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: transactionsSheetId,
          dimension: 'COLUMNS',
          startIndex: 10,
          endIndex: 11,
        },
        properties: { pixelSize: 120 },
        fields: 'pixelSize',
      },
    });

    // Column L (Items Detail): 300px
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: transactionsSheetId,
          dimension: 'COLUMNS',
          startIndex: 11,
          endIndex: 12,
        },
        properties: { pixelSize: 300 },
        fields: 'pixelSize',
      },
    });

    // 5. Format Total Amount column as currency (Rupiah)
    requests.push({
      repeatCell: {
        range: {
          sheetId: transactionsSheetId,
          startRowIndex: 1, // Skip header
          startColumnIndex: 10, // Column K (Total Amount)
          endColumnIndex: 11,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: 'NUMBER',
              pattern: 'Rp #,##0',
            },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    });

    // 6. Wrap text for Items Detail column
    requests.push({
      repeatCell: {
        range: {
          sheetId: transactionsSheetId,
          startRowIndex: 1,
          startColumnIndex: 11, // Column L (Items Detail)
          endColumnIndex: 12,
        },
        cell: {
          userEnteredFormat: {
            wrapStrategy: 'WRAP',
            verticalAlignment: 'TOP',
          },
        },
        fields: 'userEnteredFormat(wrapStrategy,verticalAlignment)',
      },
    });

    // 7. Add alternating row colors (zebra striping) for better readability
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId: transactionsSheetId,
            startRowIndex: 1, // Skip header
          }],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: '=ISEVEN(ROW())' }],
            },
            format: {
              backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 }, // Light gray #F2F2F2
            },
          },
        },
        index: 0,
      },
    });

    // ========================================================================
    // FORMAT PRODUCTION SHEET
    // ========================================================================

    // 1. Freeze header row
    requests.push({
      updateSheetProperties: {
        properties: {
          sheetId: productionSheetId,
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        fields: 'gridProperties.frozenRowCount',
      },
    });

    // 2. Format header row
    requests.push({
      repeatCell: {
        range: {
          sheetId: productionSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.26, green: 0.26, blue: 0.26 }, // Dark gray #424242
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              fontSize: 11,
              bold: true,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    // 3. Auto-resize columns
    for (let i = 0; i < 12; i++) {
      requests.push({
        autoResizeDimensions: {
          dimensions: {
            sheetId: productionSheetId,
            dimension: 'COLUMNS',
            startIndex: i,
            endIndex: i + 1,
          },
        },
      });
    }

    // 4. Format percentage columns (Success Rate, Waste Rate)
    requests.push({
      repeatCell: {
        range: {
          sheetId: productionSheetId,
          startRowIndex: 1,
          startColumnIndex: 8, // Column I (Success Rate)
          endColumnIndex: 10, // Column J (Waste Rate)
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: 'NUMBER',
              pattern: '0.00"%"',
            },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    });

    // 5. Format HPP Loss as currency
    requests.push({
      repeatCell: {
        range: {
          sheetId: productionSheetId,
          startRowIndex: 1,
          startColumnIndex: 10, // Column K (Total HPP Loss)
          endColumnIndex: 11,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: 'NUMBER',
              pattern: 'Rp #,##0',
            },
          },
        },
        fields: 'userEnteredFormat.numberFormat',
      },
    });

    // 6. Add alternating row colors (zebra striping) for better readability
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId: productionSheetId,
            startRowIndex: 1, // Skip header
          }],
          booleanRule: {
            condition: {
              type: 'CUSTOM_FORMULA',
              values: [{ userEnteredValue: '=ISEVEN(ROW())' }],
            },
            format: {
              backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 }, // Light gray #F2F2F2
            },
          },
        },
        index: 0,
      },
    });

    // Execute all formatting requests
    console.log('🎨 Applying formatting...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests },
    });

    console.log('✅ Formatting completed successfully!\n');
    console.log('📊 Changes applied:');
    console.log('   ✅ Headers: Bold, colored background, centered');
    console.log('   ✅ Columns: Auto-resized for better readability');
    console.log('   ✅ Numbers: Formatted as Rupiah (Rp #,##0)');
    console.log('   ✅ Percentages: Formatted with % symbol');
    console.log('   ✅ Text wrapping: Enabled for long text');
    console.log('   ✅ Frozen rows: Header row stays visible when scrolling');
    console.log('');
    console.log('🎉 Google Sheets is now beautifully formatted!');
    console.log('📋 Open your spreadsheet to see the changes:');
    console.log('   https://docs.google.com/spreadsheets/d/' + spreadsheetId);

  } catch (error) {
    console.error('❌ Error formatting sheets:', error.message);
    process.exit(1);
  }
}

formatGoogleSheets();
