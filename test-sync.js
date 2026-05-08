// ============================================================================
// TEST MANUAL SYNC
// ============================================================================
// Quick test to trigger manual sync
// Run: node test-sync.js
// ============================================================================

console.log('🔄 Triggering manual sync to Google Sheets...\n');

fetch('http://localhost:3000/api/cron/sync-google-sheets', {
  method: 'POST',
})
  .then(res => res.json())
  .then(data => {
    console.log('✅ Response:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n🎉 Sync completed successfully!');
      console.log(`   Processed: ${data.processed} records`);
      console.log(`   Success: ${data.success} records`);
      console.log(`   Failed: ${data.failed} records`);
      console.log('\n📊 Check your Google Sheets now!');
    } else {
      console.log('\n❌ Sync failed:', data.error);
    }
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Server is running (npm run dev)');
    console.log('   2. Server is ready at http://localhost:3000');
  });
