import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, customer_name, total_amount')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.error("Error fetching orders:", error);
    return;
  }
  
  console.log("Recent Orders:");
  console.log(JSON.stringify(data, null, 2));
}

checkOrders();
