// ============================================================================
// OFFLINE DATA ACCESS LAYER (DAL)
// ============================================================================
// File: lib/offline/offline-dal.ts
// Description: Data access layer for local PGLite operations, caching
//              catalog, and processing local transactions.
// Version: 1.0
// Date: 2026-06-26
// ============================================================================

import { getPGLite } from '@/lib/db/pglite-client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Cache all active products client-side.
 */
export async function cacheProductsOffline(products: any[]): Promise<void> {
  const db = await getPGLite();
  if (!db) return;

  try {
    await db.transaction(async (tx) => {
      // Clear existing cached products
      await tx.query('DELETE FROM products');

      for (const p of products) {
        await tx.query(`
          INSERT INTO products (
            id, nama, tipe_produk, ukuran, is_donat, ukuran_donat,
            hpp_base_donat, hpp_topping, hpp_total, harga_jual,
            margin_amount, margin_percent, harga, hpp, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        `, [
          p.id,
          p.nama,
          p.tipe_produk,
          p.ukuran,
          p.is_donat || false,
          p.ukuran_donat,
          p.hpp_base_donat,
          p.hpp_topping,
          p.hpp_total,
          p.harga_jual,
          p.margin_amount,
          p.margin_percent,
          p.harga,
          p.hpp,
          p.is_active,
        ]);
      }
    });
    console.log(`📦 [OFFLINE DAL] Successfully cached ${products.length} products locally.`);
  } catch (error) {
    console.error('❌ [OFFLINE DAL] Failed to cache products:', error);
  }
}

/**
 * Cache active payment methods client-side.
 */
export async function cachePaymentMethodsOffline(methods: any[]): Promise<void> {
  const db = await getPGLite();
  if (!db) return;

  try {
    await db.transaction(async (tx) => {
      await tx.query('DELETE FROM payment_methods');

      for (const m of methods) {
        if (!m.is_active) continue;
        await tx.query(`
          INSERT INTO payment_methods (
            id, name, type, account_number, account_name, logo_url, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          m.id,
          m.name,
          m.type,
          m.account_number,
          m.account_name,
          m.logo_url,
          m.is_active,
        ]);
      }
    });
    console.log(`📦 [OFFLINE DAL] Successfully cached ${methods.length} payment methods locally.`);
  } catch (error) {
    console.error('❌ [OFFLINE DAL] Failed to cache payment methods:', error);
  }
}

/**
 * Cache receipts settings client-side.
 */
export async function cacheReceiptSettingsOffline(settings: any): Promise<void> {
  if (!settings) return;
  const db = await getPGLite();
  if (!db) return;

  try {
    await db.transaction(async (tx) => {
      await tx.query('DELETE FROM receipt_settings WHERE outlet_id = $1', [settings.outlet_id]);
      await tx.query(`
        INSERT INTO receipt_settings (
          id, outlet_id, logo_url, show_logo, header_text, address_text,
          footer_text, tax_info, social_media, wifi_password, paper_width, enable_auto_cut
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        settings.id || uuidv4(),
        settings.outlet_id,
        settings.logo_url,
        settings.show_logo || false,
        settings.header_text,
        settings.address_text,
        settings.footer_text,
        settings.tax_info,
        settings.social_media,
        settings.wifi_password,
        settings.paper_width || '58mm',
        settings.enable_auto_cut || false,
      ]);
    });
    console.log('📦 [OFFLINE DAL] Cached receipt settings');
  } catch (error) {
    console.error('❌ [OFFLINE DAL] Failed to cache receipt settings:', error);
  }
}

/**
 * Save an order locally in the PGLite database.
 */
export async function createOfflineOrder(orderData: any, items: any[]): Promise<{ success: boolean; orderId: string }> {
  const db = await getPGLite();
  const orderId = orderData.id || uuidv4();

  if (!db) {
    throw new Error('PGLite database is not initialized');
  }

  try {
    await db.transaction(async (tx) => {
      // Insert local order record
      await tx.query(`
        INSERT INTO orders (
          id, outlet_id, kasir_id, customer_name, 
          total_amount, paid_amount, change_amount,
          payment_method, payment_status, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        orderId,
        orderData.outlet_id,
        orderData.kasir_id,
        orderData.customer_name || 'Umum',
        orderData.total_amount,
        orderData.paid_amount,
        orderData.change_amount,
        orderData.payment_method,
        'paid',
        'completed',
      ]);

      // Insert line items
      for (const item of items) {
        const itemId = item.id || uuidv4();
        await tx.query(`
          INSERT INTO order_items (
            id, order_id, product_id, product_name,
            quantity, unit_price, subtotal
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          itemId,
          orderId,
          item.product_id,
          item.product_name,
          item.quantity,
          item.unit_price,
          item.subtotal,
        ]);

        // Deduct inventory stock locally
        if (item.product_id) {
          await tx.query(`
            UPDATE inventory 
            SET quantity = quantity - $1
            WHERE outlet_id = $2 AND product_id = $3
          `, [item.quantity, orderData.outlet_id, item.product_id]);
        }
      }

      // Add to local sync metadata tracking
      await tx.query(`
        INSERT INTO _sync_metadata (table_name, record_id, sync_status)
        VALUES ('orders', $1, 'pending')
        ON CONFLICT (table_name, record_id) DO UPDATE SET sync_status = 'pending'
      `, [orderId]);
    });

    console.log(`✅ [OFFLINE DAL] Saved order locally: ${orderId}`);
    return { success: true, orderId };
  } catch (error) {
    console.error('❌ [OFFLINE DAL] Failed to save local order:', error);
    throw error;
  }
}

/**
 * Fetch cached products.
 */
export async function getOfflineProducts(): Promise<any[]> {
  const db = await getPGLite();
  if (!db) return [];
  
  const result = await db.query('SELECT * FROM products WHERE is_active = true ORDER BY nama ASC');
  return result.rows;
}

/**
 * Fetch cached payment methods.
 */
export async function getOfflinePaymentMethods(): Promise<any[]> {
  const db = await getPGLite();
  if (!db) return [];

  const result = await db.query('SELECT * FROM payment_methods WHERE is_active = true ORDER BY name ASC');
  return result.rows;
}

/**
 * Fetch local inventory quantities.
 */
export async function getOfflineInventory(outletId: string): Promise<any[]> {
  const db = await getPGLite();
  if (!db) return [];

  const result = await db.query(`
    SELECT i.*, p.nama as product_name
    FROM inventory i
    LEFT JOIN products p ON i.product_id = p.id
    WHERE i.outlet_id = $1
  `, [outletId]);
  return result.rows;
}

/**
 * Fetch receipt settings offline.
 */
export async function getOfflineReceiptSettings(outletId: string): Promise<any | null> {
  const db = await getPGLite();
  if (!db) return null;

  const result = await db.query('SELECT * FROM receipt_settings WHERE outlet_id = $1', [outletId]);
  return result.rows[0] || null;
}

/**
 * Cache all active outlets client-side.
 */
export async function cacheOutletsOffline(outlets: any[]): Promise<void> {
  const db = await getPGLite();
  if (!db) return;

  try {
    await db.transaction(async (tx) => {
      // Clear existing cached outlets
      await tx.query('DELETE FROM outlets');

      for (const o of outlets) {
        // Handle mapped status/is_active boolean from Supabase
        const is_active = o.status === 'aktif' || o.is_active === true;
        await tx.query(`
          INSERT INTO outlets (
            id, nama, alamat, phone, is_active
          ) VALUES ($1, $2, $3, $4, $5)
        `, [
          o.id,
          o.nama,
          o.alamat,
          o.phone,
          is_active
        ]);
      }
    });
    console.log(`📦 [OFFLINE DAL] Successfully cached ${outlets.length} outlets locally.`);
  } catch (error) {
    console.error('❌ [OFFLINE DAL] Failed to cache outlets:', error);
  }
}

/**
 * Fetch cached active outlets.
 */
export async function getOfflineOutlets(): Promise<any[]> {
  const db = await getPGLite();
  if (!db) return [];

  const result = await db.query('SELECT * FROM outlets WHERE is_active = true ORDER BY nama ASC');
  return result.rows;
}

/**
 * Save a production batch locally in the PGLite database.
 */
export async function createOfflineProduction(prodData: any): Promise<{ success: boolean; prodId: string }> {
  const db = await getPGLite();
  const prodId = prodData.id || uuidv4();

  if (!db) {
    throw new Error('PGLite database is not initialized');
  }

  try {
    await db.transaction(async (tx) => {
      await tx.query(`
        INSERT INTO production (
          id, outlet_id, tanggal, jam_mulai, jam_selesai,
          standar, mini, waste_standar, waste_mini, total_produksi
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        prodId,
        prodData.outlet_id,
        prodData.tanggal,
        prodData.jam_mulai || null,
        prodData.jam_selesai || null,
        prodData.standar || 0,
        prodData.mini || 0,
        prodData.waste_standar || 0,
        prodData.waste_mini || 0,
        prodData.total_produksi || 0,
      ]);

      // Add to local sync metadata tracking
      await tx.query(`
        INSERT INTO _sync_metadata (table_name, record_id, sync_status)
        VALUES ('production', $1, 'pending')
        ON CONFLICT (table_name, record_id) DO UPDATE SET sync_status = 'pending'
      `, [prodId]);
    });

    console.log(`✅ [OFFLINE DAL] Saved production locally: ${prodId}`);
    return { success: true, prodId };
  } catch (error) {
    console.error('❌ [OFFLINE DAL] Failed to save local production:', error);
    throw error;
  }
}

/**
 * Reconcile local database status: Mark local PGLite records as synced.
 */
export async function markLocalRecordSynced(tableName: string, recordId: string): Promise<void> {
  const db = await getPGLite();
  if (!db) return;

  try {
    await db.query(`
      UPDATE _sync_metadata
      SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP
      WHERE table_name = $1 AND record_id = $2
    `, [tableName, recordId]);
    console.log(`⚙️ [OFFLINE DAL] Reconciled PGLite record: ${tableName} (${recordId}) -> synced`);
  } catch (error) {
    console.error(`❌ [OFFLINE DAL] Failed to mark local record ${tableName}:${recordId} as synced:`, error);
  }
}

/**
 * Validate stock locally from PGLite database for offline operation.
 */
export async function getOfflineStockValidation(
  outletId: string,
  tanggal?: string
): Promise<any> {
  const db = await getPGLite();
  // Format checkDate: YYYY-MM-DD
  const checkDate = tanggal || new Date().toISOString().split('T')[0];

  if (!db) {
    return {
      can_operate: false,
      has_production: false,
      stock_summary: {
        standar: { qty_available: 0, status: 'out_of_stock', percentage: 0 },
        mini: { qty_available: 0, status: 'out_of_stock', percentage: 0 }
      },
      production_data: { standar: null, mini: null }
    };
  }

  try {
    // 1. Ambil produksi hari ini dari database lokal
    const prodResult = await db.query(`
      SELECT * FROM production 
      WHERE outlet_id = $1 AND (tanggal LIKE $2 || '%' OR CAST(tanggal AS TEXT) LIKE $2 || '%')
    `, [outletId, checkDate]);

    let totalStandarProd = 0;
    let totalMiniProd = 0;
    const hasProduction = prodResult.rows.length > 0;

    prodResult.rows.forEach((prod: any) => {
      totalStandarProd += prod.standar || 0;
      totalMiniProd += prod.mini || 0;
    });

    const canOperate = (totalStandarProd + totalMiniProd) > 0;

    // 2. Ambil total terjual hari ini dari order_items & orders lokal
    const ordersResult = await db.query(`
      SELECT id FROM orders 
      WHERE outlet_id = $1 AND (created_at LIKE $2 || '%' OR CAST(created_at AS TEXT) LIKE $2 || '%')
    `, [outletId, checkDate]);

    let soldStandar = 0;
    let soldMini = 0;

    if (ordersResult.rows.length > 0) {
      const orderIds = ordersResult.rows.map((o: any) => o.id);
      const placeholders = orderIds.map((_, idx) => `$${idx + 1}`).join(', ');
      
      const itemsResult = await db.query(`
        SELECT oi.quantity, p.ukuran 
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id IN (${placeholders})
      `, orderIds);

      itemsResult.rows.forEach((item: any) => {
        const qty = item.quantity || 0;
        if (item.ukuran === 'mini') {
          soldMini += qty;
        } else if (item.ukuran === 'standar') {
          soldStandar += qty;
        }
      });
    }

    // 3. Hitung stok tersedia
    const qtyAvailStandar = Math.max(0, totalStandarProd - soldStandar);
    const qtyAvailMini = Math.max(0, totalMiniProd - soldMini);

    const computeStatus = (avail: number, total: number) => {
      if (total === 0 || avail <= 0) return 'out_of_stock';
      const pct = (avail / total) * 100;
      if (pct < 20) return 'low';
      return 'sufficient';
    };

    const computePct = (avail: number, total: number) => {
      if (total === 0) return 0;
      return Math.round((avail / total) * 100 * 100) / 100;
    };

    const result = {
      can_operate: canOperate,
      has_production: hasProduction,
      total_success_qty: totalStandarProd + totalMiniProd,
      stock_summary: {
        standar: {
          qty_available: qtyAvailStandar,
          status: computeStatus(qtyAvailStandar, totalStandarProd),
          percentage: computePct(qtyAvailStandar, totalStandarProd)
        },
        mini: {
          qty_available: qtyAvailMini,
          status: computeStatus(qtyAvailMini, totalMiniProd),
          percentage: computePct(qtyAvailMini, totalMiniProd)
        }
      },
      production_data: {
        standar: totalStandarProd > 0 ? { target_qty: totalStandarProd, success_qty: totalStandarProd } : null,
        mini: totalMiniProd > 0 ? { target_qty: totalMiniProd, success_qty: totalMiniProd } : null
      }
    };

    console.log('📡 [OFFLINE Stock Validation] calculated local stock:', result);
    return result;
  } catch (error) {
    console.error('❌ [OFFLINE DAL] Failed to validate offline stock:', error);
    throw error;
  }
}

