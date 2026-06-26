// ============================================================================
// PGLITE DATABASE CLIENT
// ============================================================================
// File: lib/db/pglite-client.ts
// Description: Client for PGlite (in-browser PostgreSQL database client)
// Version: 1.0
// Date: 2026-06-26
// ============================================================================

import { PGlite } from '@electric-sql/pglite';

let db: PGlite | null = null;

/**
 * Get or initialize the PGLite database client.
 * Safely handles SSR by returning null when executed on the server.
 */
export async function getPGLite(): Promise<PGlite | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (db) return db;
  
  try {
    db = new PGlite('idb://donattour-db');
    await initializeSchema(db);
    return db;
  } catch (error) {
    console.error('❌ [PGLITE] Initialization failed:', error);
    db = null;
    return null;
  }
}

/**
 * Initialize all standard database tables matching the Prisma schema.
 */
async function initializeSchema(db: PGlite) {
  console.log('🔄 [PGLITE] Initializing database schema...');
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      role TEXT NOT NULL,
      outlet_id TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS outlets (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      alamat TEXT,
      phone TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      nama TEXT NOT NULL,
      tipe_produk TEXT,
      ukuran TEXT,
      is_donat BOOLEAN DEFAULT false,
      ukuran_donat TEXT,
      hpp_base_donat DECIMAL(15, 2),
      hpp_topping DECIMAL(15, 2),
      hpp_total DECIMAL(15, 2),
      harga_jual DECIMAL(15, 2),
      margin_amount DECIMAL(15, 2),
      margin_percent DECIMAL(5, 2),
      harga INTEGER,
      hpp INTEGER,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      outlet_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(outlet_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      outlet_id TEXT NOT NULL,
      kasir_id TEXT,
      customer_name TEXT DEFAULT 'Umum',
      total_amount INTEGER NOT NULL,
      paid_amount INTEGER,
      change_amount INTEGER,
      payment_method TEXT NOT NULL,
      payment_status TEXT DEFAULT 'unpaid',
      status TEXT DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT,
      quantity INTEGER DEFAULT 1,
      unit_price INTEGER NOT NULL,
      subtotal INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS production (
      id TEXT PRIMARY KEY,
      outlet_id TEXT NOT NULL,
      tanggal TIMESTAMP NOT NULL,
      jam_mulai TEXT,
      jam_selesai TEXT,
      standar INTEGER,
      mini INTEGER,
      waste_standar INTEGER,
      waste_mini INTEGER,
      total_produksi INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      outlet_id TEXT NOT NULL,
      tanggal TIMESTAMP NOT NULL,
      kategori TEXT DEFAULT 'operasional',
      keterangan TEXT NOT NULL,
      jumlah INTEGER NOT NULL,
      bukti_url TEXT,
      receipt_url TEXT,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      account_number TEXT,
      account_name TEXT,
      logo_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS receipt_settings (
      id TEXT PRIMARY KEY,
      outlet_id TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      show_logo BOOLEAN DEFAULT false,
      header_text TEXT,
      address_text TEXT,
      footer_text TEXT,
      tax_info TEXT,
      social_media TEXT,
      wifi_password TEXT,
      paper_width TEXT DEFAULT '58mm',
      enable_auto_cut BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      outlet_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      old_values JSONB,
      new_values JSONB,
      details JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS channel_stock_deductions (
      id TEXT PRIMARY KEY,
      outlet_id TEXT NOT NULL,
      channel_key TEXT NOT NULL,
      ukuran TEXT NOT NULL,
      qty INTEGER NOT NULL,
      catatan TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Sync metadata table
    CREATE TABLE IF NOT EXISTS _sync_metadata (
      id SERIAL PRIMARY KEY,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      last_synced_at TIMESTAMP,
      sync_status TEXT DEFAULT 'pending',
      conflict_data JSONB,
      retry_count INTEGER DEFAULT 0,
      UNIQUE(table_name, record_id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_users_outlet_id ON users(outlet_id);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_inventory_outlet_id ON inventory(outlet_id);
    CREATE INDEX IF NOT EXISTS idx_orders_outlet_id ON orders(outlet_id);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_production_outlet_id ON production(outlet_id);
    CREATE INDEX IF NOT EXISTS idx_production_tanggal ON production(tanggal);
    CREATE INDEX IF NOT EXISTS idx_expenses_outlet_id ON expenses(outlet_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_tanggal ON expenses(tanggal);
    CREATE INDEX IF NOT EXISTS idx_channel_stock_deductions_outlet_id ON channel_stock_deductions(outlet_id);
  `);

  console.log('✅ [PGLITE] Schema initialized successfully');
}

/**
 * Close the PGLite database connection.
 */
export async function closePGLite() {
  if (db) {
    await db.close();
    db = null;
  }
}
