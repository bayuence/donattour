const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres.elduyooybiscdqwwzfwv:Donattour12345678@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});

pool.query(
  "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'receipt_settings' ORDER BY ordinal_position"
).then(r => {
  console.log('Columns in receipt_settings:');
  console.log(JSON.stringify(r.rows, null, 2));
  pool.end();
}).catch(e => {
  console.error('Error:', e.message);
  pool.end();
});
