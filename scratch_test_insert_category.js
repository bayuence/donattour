const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://elduyooybiscdqwwzfwv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHV5b295YmlzY2Rxd3d6Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2NjU1NiwiZXhwIjoyMDkwODQyNTU2fQ.gk-uf-wNIZ7cEC1r6lkMBYt6mHDpyNWZSgag1JwobMg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase.from('product_categories').insert({
    nama: 'MINUMAN TEST',
    sort_order: 10,
    is_donat: false
  });
  console.log('Error:', error);
  console.log('Data:', data);
}

testInsert();
