const { Pool } = require('pg');

// Gunakan DIRECT_URL (port 5432) untuk DDL, bukan pooler (port 6543)
const pool = new Pool({
  connectionString: 'postgresql://postgres.elduyooybiscdqwwzfwv:Donattour12345678@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'
});

async function migrate() {
  const client = await pool.connect();
  try {
    // 1. Cek apakah kolom 'id' sudah ada
    const checkId = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'receipt_settings' AND column_name = 'id'"
    );

    if (checkId.rows.length === 0) {
      console.log('Adding column: id (text, primary key)...');
      await client.query(`
        ALTER TABLE receipt_settings 
        ADD COLUMN id text DEFAULT gen_random_uuid()::text;
      `);
      // Update existing rows yang belum punya id
      await client.query(`
        UPDATE receipt_settings SET id = gen_random_uuid()::text WHERE id IS NULL;
      `);
      // Set NOT NULL dan primary key
      await client.query(`
        ALTER TABLE receipt_settings ALTER COLUMN id SET NOT NULL;
      `);
      // Cek apakah sudah punya primary key
      const hasPK = await client.query(`
        SELECT constraint_name FROM information_schema.table_constraints 
        WHERE table_name = 'receipt_settings' AND constraint_type = 'PRIMARY KEY'
      `);
      if (hasPK.rows.length === 0) {
        await client.query(`
          ALTER TABLE receipt_settings ADD PRIMARY KEY (id);
        `);
      }
      console.log('  ✅ id column added with primary key');
    } else {
      console.log('  ℹ️ id column already exists');
    }

    // 2. Cek apakah kolom 'paper_width' sudah ada
    const checkPW = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'receipt_settings' AND column_name = 'paper_width'"
    );
    if (checkPW.rows.length === 0) {
      console.log('Adding column: paper_width...');
      await client.query(`
        ALTER TABLE receipt_settings ADD COLUMN paper_width text NOT NULL DEFAULT '58mm';
      `);
      console.log('  ✅ paper_width column added');
    } else {
      console.log('  ℹ️ paper_width column already exists');
    }

    // 3. Cek apakah kolom 'enable_auto_cut' sudah ada
    const checkEAC = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'receipt_settings' AND column_name = 'enable_auto_cut'"
    );
    if (checkEAC.rows.length === 0) {
      console.log('Adding column: enable_auto_cut...');
      await client.query(`
        ALTER TABLE receipt_settings ADD COLUMN enable_auto_cut boolean NOT NULL DEFAULT false;
      `);
      console.log('  ✅ enable_auto_cut column added');
    } else {
      console.log('  ℹ️ enable_auto_cut column already exists');
    }

    // 4. Verifikasi hasil
    const verify = await client.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'receipt_settings' ORDER BY ordinal_position"
    );
    console.log('\n📋 Final receipt_settings columns:');
    verify.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`);
    });

    console.log('\n✅ Migration selesai!');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
