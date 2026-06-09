const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://elduyooybiscdqwwzfwv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZHV5b295YmlzY2Rxd3d6Znd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2NjU1NiwiZXhwIjoyMDkwODQyNTU2fQ.gk-uf-wNIZ7cEC1r6lkMBYt6mHDpyNWZSgag1JwobMg'
);
const ids = [
  '9b67d484-e198-46c3-a646-cb8b08da8050',
  '073e5f6a-b957-4faf-b006-0b6684f9051a',
];
async function main() {
  // Tanpa is_donat
  const { data, error } = await supabase.from('products').select('id, nama, tipe_produk, ukuran').in('id', ids);
  if (error) { console.error(error); return; }
  console.log('Kolom yang tersedia (sample):');
  if (data?.length) console.log('Keys:', Object.keys(data[0]).join(', '));
  console.log('\nData produk:');
  data?.forEach(p => {
    const isDonat = p.tipe_produk?.toLowerCase().includes('donat');
    const willDeduct = isDonat || p.ukuran;
    console.log(`  "${p.nama}" | tipe: "${p.tipe_produk}" | ukuran: "${p.ukuran}" | → deduct: ${willDeduct ? '✅ YA' : '❌ TIDAK'}`);
  });
}
main().catch(console.error);
