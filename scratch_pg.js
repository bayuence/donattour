const { Client } = require('pg');

async function dropConstraint() {
  const client = new Client({
    connectionString: "postgresql://postgres.elduyooybiscdqwwzfwv:Donattour12345678@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
  });

  try {
    await client.connect();
    console.log("Connected to DB");
    await client.query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;');
    console.log("Successfully dropped constraint");
  } catch (err) {
    console.error("Error executing query", err);
  } finally {
    await client.end();
  }
}

dropConstraint();
