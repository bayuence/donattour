const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres.elduyooybiscdqwwzfwv:Donattour12345678@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true' });
Promise.all([
  pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position"),
  pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'order_items' ORDER BY ordinal_position"),
  pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position")
]).then(([o, oi, p]) => {
  console.log('ORDERS:', JSON.stringify(o.rows.map(r => r.column_name)));
  console.log('ORDER_ITEMS:', JSON.stringify(oi.rows.map(r => r.column_name)));
  console.log('PRODUCTS:', JSON.stringify(p.rows.map(r => r.column_name)));
  pool.end();
}).catch(e => { console.error(e.message); pool.end(); });
