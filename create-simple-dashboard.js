// ============================================================================
// CREATE SIMPLE DASHBOARD - NO COMPLEX FORMULAS
// ============================================================================
// Script untuk membuat dashboard sederhana tanpa formula kompleks
// Data langsung dari database, ditulis ke sheet
// Run: node create-simple-dashboard.js "Donattour K3PG"
// ============================================================================

const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
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

const outletName = process.argv[2] || 'Donattour K3PG';

console.log(`📊 Creating dashboard for: ${outletName}\n`);

async function createSimpleDashboard() {
  try {
    // ========================================================================
    // STEP 1: Get data from database
    // ========================================================================
    
    console.log('📊 Fetching data from database...');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Get outlet
    const { data: outlet } = await supabase
      .from('outlets')
      .select('*')
      .eq('nama', outletName)
      .single();

    if (!outlet) {
      console.log('❌ Outlet not found:', outletName);
      process.exit(1);
    }

    console.log(`✅ Found outlet: ${outlet.nama}`);

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    // Get transactions
    const { data: transactions } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('outlet_id', outlet.id)
      .gte('created_at', `${today}T00:00:00`)
      .order('created_at', { ascending: false });

    console.log(`✅ Found ${transactions?.length || 0} transactions today`);

    // Get production
    const { data: production } = await supabase
      .from('production_daily')
      .select('*')
      .eq('outlet_id', outlet.id)
      .eq('tanggal', today)
      .order('created_at', { ascending: false });

    console.log(`✅ Found ${production?.length || 0} production records today`);
    console.log('');

    // Calculate totals
    const totalSales = transactions?.reduce((sum, t) => sum + parseFloat(t.total_amount || 0), 0) || 0;
    const totalProduction = production?.reduce((sum, p) => sum + parseInt(p.success_qty || 0), 0) || 0;

    console.log(`💰 Total Sales: Rp ${totalSales.toLocaleString('id-ID')}`);
    console.log(`📦 Total Production: ${totalProduction} pcs`);
    console.log('');

    // ========================================================================
    // STEP 2: Write to Google Sheets
    // ========================================================================
    
    console.log('📝 Writing to Google Sheets...');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // Update summary
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Live Dashboard!B9:H9',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          `Rp ${totalSales.toLocaleString('id-ID')}`,
          '',
          `${totalProduction} pcs`,
          '',
          'N/A',
          '',
          'N/A'
        ]]
      },
    });

    console.log('✅ Summary updated');

    // Update transactions table
    if (transactions && transactions.length > 0) {
      const transRows = transactions.map(t => [
        t.id,
        new Date(t.created_at).toLocaleString('id-ID'),
        t.kasir_name || '',
        t.customer_name || '',
        t.channel || '',
        t.total_amount || 0,
        t.payment_method || '',
        t.status || ''
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Live Dashboard!A14',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: transRows
        },
      });

      console.log(`✅ ${transRows.length} transactions written`);
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Live Dashboard!A14',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [['Tidak ada transaksi hari ini']]
        },
      });
      console.log('✅ No transactions message written');
    }

    // Update production table
    if (production && production.length > 0) {
      const prodRows = production.map(p => [
        new Date(p.created_at).toLocaleString('id-ID'),
        p.ukuran || '',
        p.target_qty || 0,
        p.success_qty || 0,
        p.waste_qty || 0,
        `${((p.success_qty / p.target_qty) * 100).toFixed(0)}%`,
        `${((p.waste_qty / p.target_qty) * 100).toFixed(0)}%`,
        p.total_hpp_loss || 0
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Live Dashboard!A19',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: prodRows
        },
      });

      console.log(`✅ ${prodRows.length} production records written`);
    } else {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Live Dashboard!A19',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [['Tidak ada produksi hari ini']]
        },
      });
      console.log('✅ No production message written');
    }

    console.log('');
    console.log('✅ Dashboard updated successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Outlet: ${outletName}`);
    console.log(`   Total Sales: Rp ${totalSales.toLocaleString('id-ID')}`);
    console.log(`   Total Production: ${totalProduction} pcs`);
    console.log(`   Transactions: ${transactions?.length || 0}`);
    console.log(`   Production Records: ${production?.length || 0}`);
    console.log('');
    console.log('📝 Refresh spreadsheet to see the data!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createSimpleDashboard();
