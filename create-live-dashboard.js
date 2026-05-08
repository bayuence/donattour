// ============================================================================
// CREATE LIVE DASHBOARD SHEET
// ============================================================================
// Script untuk membuat sheet Live Dashboard dengan dropdown outlet
// Menampilkan semua data live dari outlet yang dipilih
// Run: node create-live-dashboard.js
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

console.log('📊 Creating Live Dashboard sheet...\n');

async function createLiveDashboard() {
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

    // ========================================================================
    // STEP 1: Create new sheet "Live Dashboard"
    // ========================================================================
    
    console.log('📄 Creating Live Dashboard sheet...');
    
    const addSheetResponse = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          addSheet: {
            properties: {
              title: 'Live Dashboard',
              gridProperties: {
                rowCount: 1000,
                columnCount: 20,
                frozenRowCount: 1,
              },
            },
          },
        }],
      },
    });

    const newSheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId;
    console.log('✅ Sheet created');
    console.log('');

    // ========================================================================
    // STEP 2: Setup structure and formulas
    // ========================================================================
    
    console.log('📝 Setting up dashboard structure...');

    // Prepare data for the dashboard
    const dashboardData = [
      // Row 1: Title
      ['LIVE DASHBOARD - DONATTOUR SYSTEM', '', '', '', '', '', '', '', '', ''],
      [],
      // Row 3: Outlet selector
      ['Pilih Outlet:', '', '', '', '', '', '', '', '', ''],
      ['(Dropdown akan muncul di cell B4)', '', '', '', '', '', '', '', '', ''],
      [],
      // Row 6: Summary Section Header
      ['=== RINGKASAN HARI INI ===', '', '', '', '', '', '', '', '', ''],
      [],
      // Row 8: Summary Cards
      ['Total Penjualan:', '', 'Total Produksi:', '', 'Inventory Status:', '', 'Karyawan Hadir:', '', '', ''],
      ['Rp 0', '', '0 pcs', '', '0 pcs', '', '0 orang', '', '', ''],
      [],
      // Row 11: Transactions Section
      ['=== TRANSAKSI HARI INI ===', '', '', '', '', '', '', '', '', ''],
      [],
      ['Order ID', 'Waktu', 'Kasir', 'Customer', 'Channel', 'Total', 'Payment', 'Status', '', ''],
      ['(Data akan muncul otomatis)', '', '', '', '', '', '', '', '', ''],
      [],
      // Row 16: Production Section
      ['=== PRODUKSI HARI INI ===', '', '', '', '', '', '', '', '', ''],
      [],
      ['Waktu Input', 'Ukuran', 'Target', 'Success', 'Waste', 'Success Rate', 'Waste Rate', 'HPP Loss', '', ''],
      ['(Data akan muncul otomatis)', '', '', '', '', '', '', '', '', ''],
      [],
      // Row 21: Inventory Section
      ['=== STATUS INVENTORY ===', '', '', '', '', '', '', '', '', ''],
      [],
      ['Produk', 'Ukuran', 'Stock Saat Ini', 'Status', 'Last Update', '', '', '', '', ''],
      ['(Data akan muncul otomatis)', '', '', '', '', '', '', '', '', ''],
      [],
      // Row 26: Attendance Section
      ['=== PRESENSI KARYAWAN ===', '', '', '', '', '', '', '', '', ''],
      [],
      ['Nama Karyawan', 'Jabatan', 'Check In', 'Check Out', 'Status', '', '', '', '', ''],
      ['(Data akan muncul otomatis)', '', '', '', '', '', '', '', '', ''],
      [],
      // Row 31: Expenses Section
      ['=== PENGELUARAN OUTLET ===', '', '', '', '', '', '', '', '', ''],
      [],
      ['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah', 'Dibuat Oleh', '', '', '', '', ''],
      ['(Data akan muncul otomatis)', '', '', '', '', '', '', '', '', ''],
    ];

    // Write data to sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!A1:J35',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: dashboardData,
      },
    });

    console.log('✅ Structure created');
    console.log('');

    // ========================================================================
    // STEP 3: Apply formatting
    // ========================================================================
    
    console.log('🎨 Applying formatting...');

    const requests = [];

    // Title formatting (Row 1)
    requests.push({
      repeatCell: {
        range: {
          sheetId: newSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 10,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.18, green: 0.31, blue: 0.56 }, // Navy blue
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              fontSize: 14,
              bold: true,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat',
      },
    });

    // Merge title cells
    requests.push({
      mergeCells: {
        range: {
          sheetId: newSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 10,
        },
        mergeType: 'MERGE_ALL',
      },
    });

    // Outlet selector label (Row 3)
    requests.push({
      repeatCell: {
        range: {
          sheetId: newSheetId,
          startRowIndex: 2,
          endRowIndex: 3,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            textFormat: {
              fontSize: 12,
              bold: true,
            },
          },
        },
        fields: 'userEnteredFormat',
      },
    });

    // Section headers formatting (navy blue background)
    const sectionHeaderRows = [5, 10, 15, 20, 25, 30]; // Row indices (0-indexed)
    sectionHeaderRows.forEach(rowIndex => {
      requests.push({
        repeatCell: {
          range: {
            sheetId: newSheetId,
            startRowIndex: rowIndex,
            endRowIndex: rowIndex + 1,
            startColumnIndex: 0,
            endColumnIndex: 10,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.18, green: 0.31, blue: 0.56 },
              textFormat: {
                foregroundColor: { red: 1, green: 1, blue: 1 },
                fontSize: 11,
                bold: true,
              },
            },
          },
          fields: 'userEnteredFormat',
        },
      });
    });

    // Table headers formatting (light blue background)
    const tableHeaderRows = [7, 12, 17, 22, 27, 32]; // Row indices
    tableHeaderRows.forEach(rowIndex => {
      requests.push({
        repeatCell: {
          range: {
            sheetId: newSheetId,
            startRowIndex: rowIndex,
            endRowIndex: rowIndex + 1,
            startColumnIndex: 0,
            endColumnIndex: 10,
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.85, green: 0.92, blue: 0.97 }, // Light blue
              textFormat: {
                foregroundColor: { red: 0, green: 0, blue: 0 },
                fontSize: 10,
                bold: true,
              },
              horizontalAlignment: 'CENTER',
            },
          },
          fields: 'userEnteredFormat',
        },
      });
    });

    // Summary cards formatting (Row 8-9)
    requests.push({
      repeatCell: {
        range: {
          sheetId: newSheetId,
          startRowIndex: 7,
          endRowIndex: 9,
          startColumnIndex: 0,
          endColumnIndex: 10,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 }, // Light gray
            textFormat: {
              fontSize: 11,
              bold: true,
            },
          },
        },
        fields: 'userEnteredFormat',
      },
    });

    // Add borders to all used cells
    requests.push({
      updateBorders: {
        range: {
          sheetId: newSheetId,
          startRowIndex: 0,
          endRowIndex: 35,
          startColumnIndex: 0,
          endColumnIndex: 10,
        },
        top: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
        bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
        left: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
        right: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
        innerHorizontal: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
        innerVertical: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } },
      },
    });

    // Set column widths
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: newSheetId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 1,
        },
        properties: { pixelSize: 200 },
        fields: 'pixelSize',
      },
    });

    // Execute all formatting requests
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests },
    });

    console.log('✅ Formatting applied');
    console.log('');

    // ========================================================================
    // STEP 4: Add data validation (dropdown) for outlet selector
    // ========================================================================
    
    console.log('📋 Adding outlet dropdown...');

    // Note: We'll use Transactions sheet to get outlet names
    // Formula: =UNIQUE(Transactions!C:C) to get unique outlet names
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{
          setDataValidation: {
            range: {
              sheetId: newSheetId,
              startRowIndex: 3, // Row 4 (0-indexed)
              endRowIndex: 4,
              startColumnIndex: 1, // Column B
              endColumnIndex: 2,
            },
            rule: {
              condition: {
                type: 'ONE_OF_RANGE',
                values: [{
                  userEnteredValue: '=Transactions!$C$2:$C$1000', // Outlet column from Transactions
                }],
              },
              showCustomUi: true,
              strict: true,
            },
          },
        }],
      },
    });

    console.log('✅ Dropdown added');
    console.log('');

    console.log('✅ Live Dashboard created successfully!\n');
    console.log('📊 Dashboard features:');
    console.log('   ✅ Dropdown untuk pilih outlet (cell B4)');
    console.log('   ✅ Ringkasan hari ini (penjualan, produksi, inventory, presensi)');
    console.log('   ✅ Transaksi hari ini');
    console.log('   ✅ Produksi hari ini');
    console.log('   ✅ Status inventory');
    console.log('   ✅ Presensi karyawan');
    console.log('   ✅ Pengeluaran outlet');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Refresh spreadsheet');
    console.log('   2. Pilih outlet dari dropdown di cell B4');
    console.log('   3. Data akan difilter otomatis (perlu setup formulas)');
    console.log('');
    console.log('⚠️  Note: Formulas untuk auto-filter data akan ditambahkan di step berikutnya');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  Sheet "Live Dashboard" sudah ada!');
      console.log('💡 Hapus sheet tersebut dulu atau gunakan nama lain');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

createLiveDashboard();
