/**
 * Backup Critical Tables Before Migration
 * Creates JSON backup of products and orders tables
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backupDatabase() {
  console.log('💾 Starting database backup...\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../backups', timestamp);
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  try {
    // Backup products table
    console.log('📦 Backing up products table...');
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('*');
      
    if (prodError) throw prodError;
    
    fs.writeFileSync(
      path.join(backupDir, 'products.json'),
      JSON.stringify(products, null, 2)
    );
    console.log(`   ✅ Backed up ${products?.length || 0} products\n`);
    
    // Backup orders table
    console.log('📦 Backing up orders table...');
    const { data: orders, error: ordError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000); // Last 1000 orders
      
    if (ordError) throw ordError;
    
    fs.writeFileSync(
      path.join(backupDir, 'orders.json'),
      JSON.stringify(orders, null, 2)
    );
    console.log(`   ✅ Backed up ${orders?.length || 0} orders\n`);
    
    // Backup kasir menus (if exists)
    console.log('📦 Backing up kasir menus (if exists)...');
    try {
      const { data: kasirMenus } = await supabase
        .from('outlet_kasir_menus')
        .select('*');
        
      if (kasirMenus) {
        fs.writeFileSync(
          path.join(backupDir, 'kasir_menus.json'),
          JSON.stringify(kasirMenus, null, 2)
        );
        console.log(`   ✅ Backed up ${kasirMenus.length} kasir menus\n`);
      }
    } catch (e) {
      console.log('   ⚠️  Table does not exist (OK)\n');
    }
    
    // Create restore script
    const restoreScript = `
-- Restore Script
-- Generated: ${new Date().toISOString()}
-- Backup Location: ${backupDir}

-- To restore, copy data from JSON files back to database
-- Or use Supabase Dashboard -> Database -> Backups -> Restore
    `.trim();
    
    fs.writeFileSync(
      path.join(backupDir, 'RESTORE_INSTRUCTIONS.txt'),
      restoreScript
    );
    
    console.log('✅ Backup completed successfully!');
    console.log(`📁 Backup location: ${backupDir}\n`);
    console.log('🔐 Backup contents:');
    console.log(`   - products.json (${products?.length || 0} records)`);
    console.log(`   - orders.json (${orders?.length || 0} records)`);
    console.log(`   - RESTORE_INSTRUCTIONS.txt\n`);
    
    return backupDir;
    
  } catch (error) {
    console.error('\n❌ Backup failed:', error);
    process.exit(1);
  }
}

// Run backup
backupDatabase()
  .then((dir) => {
    console.log('✅ Ready for migration!');
    console.log('\n📝 Next steps:');
    console.log('   1. Copy SQL from prisma/migrations/add_pricing_details/migration.sql');
    console.log('   2. Go to Supabase Dashboard -> SQL Editor');
    console.log('   3. Paste and execute the SQL');
    console.log('   4. Verify changes');
    process.exit(0);
  })
  .catch(console.error);
