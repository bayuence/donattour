import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://elduyooybiscdqwwzfwv.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHV5b295YmlzY2Rxd3d6Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2NjU1NiwiZXhwIjoyMDkwODQyNTU2fQ.gk-uf-wNIZ7cEC1r6lkMBYt6mHDpyNWZSgag1JwobMg'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

console.log('═══════════════════════════════════════════════════')
console.log(' AUDIT & MIGRATE: outlet_channel_prices')
console.log('═══════════════════════════════════════════════════\n')

// ── Step 1: Cek kolom via SELECT * LIMIT 0 ──────────────────────
// Ini cara paling portable tanpa butuh DDL permission awal
async function getExistingColumns() {
  const { data, error } = await supabase
    .from('outlet_channel_prices')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Tidak bisa akses tabel outlet_channel_prices:', error.message)
    return null
  }

  // Jika ada data, ambil key dari row pertama
  if (data && data.length > 0) {
    return Object.keys(data[0])
  }

  // Tabel kosong — coba insert dummy untuk lihat kolom yang diterima/ditolak
  return null
}

async function checkIsActiveColumnExists() {
  console.log('📋 [1] Cek apakah kolom is_active sudah ada...')

  // Cara paling direct: query dengan kolom is_active
  const { data, error } = await supabase
    .from('outlet_channel_prices')
    .select('id, channel, is_active')
    .limit(1)

  if (error) {
    const msg = error.message || ''
    if (msg.includes('is_active') || msg.includes('column') || error.code === '42703') {
      console.log('   → Kolom is_active BELUM ADA di database')
      return false
    }
    // Error lain (tabel kosong bukan masalah)
    console.log('   → Error cek:', msg)
    // Anggap perlu dicek lebih lanjut
    return null
  }

  console.log('   → Kolom is_active SUDAH ADA ✅')
  return true
}

async function addIsActiveColumn() {
  console.log('\n🔧 [2] Menambahkan kolom is_active...')

  // Supabase service_role bisa jalankan SQL via .rpc() jika ada fungsi exec
  // Tapi cara paling reliable: gunakan Prisma $executeRawUnsafe
  // Kita pakai pg langsung via DATABASE_URL

  const { default: pg } = await import('pg')
  const { Client } = pg

  const client = new Client({
    connectionString: 'postgresql://postgres.elduyooybiscdqwwzfwv:Donattour12345678@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'
  })

  try {
    await client.connect()
    console.log('   → Terhubung ke PostgreSQL ✅')

    // Cek dulu via information_schema
    const colResult = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'outlet_channel_prices'
      ORDER BY ordinal_position
    `)

    console.log('\n📊 Struktur tabel outlet_channel_prices saat ini:')
    console.log('─────────────────────────────────────────────────')
    colResult.rows.forEach(col => {
      const marker = col.column_name === 'is_active' ? ' ✅' : ''
      console.log(`   ${col.column_name.padEnd(20)} ${col.data_type.padEnd(20)} default=${col.column_default || 'none'}${marker}`)
    })
    console.log('─────────────────────────────────────────────────')

    const existingCols = colResult.rows.map(r => r.column_name)
    const hasIsActive = existingCols.includes('is_active')

    if (hasIsActive) {
      console.log('\n✅ Kolom is_active sudah ada — tidak perlu migration')
      await client.end()
      return true
    }

    // Tambahkan kolom
    console.log('\n⚡ Menjalankan ALTER TABLE...')
    await client.query(`
      ALTER TABLE outlet_channel_prices
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true
    `)
    console.log('   → ALTER TABLE berhasil ✅')

    // Verifikasi
    const verifyResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'outlet_channel_prices'
        AND column_name = 'is_active'
    `)

    if (verifyResult.rows.length > 0) {
      const col = verifyResult.rows[0]
      console.log(`   → Kolom ditambahkan: ${col.column_name} [${col.data_type}] default=${col.column_default}`)
    }

    await client.end()
    return true
  } catch (err) {
    console.error('❌ Error koneksi PostgreSQL:', err.message)
    await client.end().catch(() => {})
    return false
  }
}

async function verifyUpsert() {
  console.log('\n🧪 [3] Test upsert dengan is_active...')

  // Ambil outlet + product pertama
  const { data: outlets } = await supabase.from('outlets').select('id').limit(1)
  const { data: products } = await supabase.from('products').select('id').limit(1)

  if (!outlets?.length || !products?.length) {
    console.log('   ⚠️  Tidak ada data outlet/product untuk test — skip')
    return true
  }

  const payload = {
    outlet_id: outlets[0].id,
    product_id: products[0].id,
    channel: '__MIGRATION_TEST__',
    harga_jual: 0,
    is_active: false
  }

  // Test upsert native Supabase
  const { error: upsertErr } = await supabase
    .from('outlet_channel_prices')
    .upsert(payload, { onConflict: 'outlet_id,product_id,channel' })

  if (upsertErr) {
    console.error('   ❌ Upsert gagal:', upsertErr.message)
    return false
  }

  // Bersihkan test row
  await supabase
    .from('outlet_channel_prices')
    .delete()
    .eq('channel', '__MIGRATION_TEST__')
    .eq('outlet_id', outlets[0].id)

  console.log('   ✅ Upsert dengan is_active berhasil')
  return true
}

async function verifyFullSelect() {
  console.log('\n🔍 [4] Verifikasi SELECT semua kolom...')

  const { data, error } = await supabase
    .from('outlet_channel_prices')
    .select('id, outlet_id, product_id, channel, harga_jual, is_active, created_at, updated_at')
    .limit(3)

  if (error) {
    console.error('   ❌ SELECT gagal:', error.message)
    return false
  }

  console.log(`   ✅ SELECT berhasil. Rows: ${data?.length ?? 0}`)
  if (data?.length > 0) {
    console.log('   Sample row:', JSON.stringify(data[0], null, 2).split('\n').map(l => '     ' + l).join('\n'))
  } else {
    console.log('   (tabel masih kosong — normal)')
  }
  return true
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  // Step 1: Cek kolom via Supabase client
  const isActiveExists = await checkIsActiveColumnExists()

  if (isActiveExists === false) {
    // Perlu migration — pakai pg langsung
    const migrated = await addIsActiveColumn()
    if (!migrated) {
      console.log('\n❌ Migration gagal. Coba jalankan SQL ini di Supabase Dashboard:')
      console.log('   ALTER TABLE outlet_channel_prices')
      console.log('   ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;')
      process.exit(1)
    }
  } else if (isActiveExists === null) {
    // Tidak bisa cek dari Supabase client — pakai pg untuk cek + migrate
    await addIsActiveColumn()
  }

  // Step 3: Test upsert
  const upsertOk = await verifyUpsert()

  // Step 4: Verifikasi full select
  const selectOk = await verifyFullSelect()

  // Summary
  console.log('\n═══════════════════════════════════════════════════')
  if (upsertOk && selectOk) {
    console.log(' ✅ DATABASE AMAN — outlet_channel_prices siap')
    console.log('    Kolom: id, outlet_id, product_id, channel,')
    console.log('           harga_jual, is_active, created_at, updated_at')
  } else {
    console.log(' ⚠️  Ada masalah — cek log di atas')
  }
  console.log('═══════════════════════════════════════════════════')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
