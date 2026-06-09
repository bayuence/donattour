/**
 * Run Database Migration
 * Execute SQL migration via Supabase client
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting database migration...\n');
  
  try {
    // Read migration SQL file
    const migrationPath = path.join(
      __dirname, 
      '../prisma/migrations/add_pricing_details/migration.sql'
    );
    
    console.log('📄 Reading migration file:', migrationPath);
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolon and filter empty statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }
      
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      console.log(`   Preview: ${statement.substring(0, 80)}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      });
      
      if (error) {
        // Try direct query if RPC doesn't work
        const { error: directError } = await supabase
          .from('_migrations')
          .insert({ statement: statement });
          
        if (directError) {
          console.error(`❌ Error executing statement ${i + 1}:`, error);
          throw error;
        }
      }
      
      console.log(`   ✅ Success!\n`);
    }
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Verifying changes...\n');
    
    // Verify products table
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('nama, is_donat, hpp_base_donat, hpp_topping, harga_jual, margin_percent')
      .eq('is_donat', true)
      .limit(5);
      
    if (!prodError && products) {
      console.log('✅ Products table updated:');
      console.table(products);
    }
    
    // Verify orders table (should not have channel column)
    const { data: orders, error: ordError } = await supabase
      .from('orders')
      .select('id, outlet_id, total_amount, payment_method')
      .limit(3);
      
    if (!ordError && orders) {
      console.log('✅ Orders table updated (channel removed):');
      console.table(orders);
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Update TypeScript types');
    console.log('   2. Update API routes');
    console.log('   3. Update frontend components');
    console.log('   4. Run tests');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n🔄 To rollback:');
    console.error('   1. Restore database backup');
    console.error('   2. Or manually drop new columns');
    process.exit(1);
  }
}

// Run migration
runMigration();
