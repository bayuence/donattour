
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key not found')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  const { data: orders, error: ordersError } = await supabase.from('orders').select('*').limit(1)
  console.log('Orders Columns:', orders ? Object.keys(orders[0] || {}) : 'No data')
  if (ordersError) console.error('Orders error:', ordersError)

  const { data: items, error: itemsError } = await supabase.from('order_items').select('*').limit(1)
  console.log('Order Items Columns:', items ? Object.keys(items[0] || {}) : 'No data')
  if (itemsError) console.error('Order Items error:', itemsError)
}

checkSchema()
