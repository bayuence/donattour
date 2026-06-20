// ============================================================================
// API /api/orders/[id]
// ============================================================================
// DELETE  → Hapus transaksi + reversal stok donat non-topping
// PATCH   → Update status transaksi (dengan reversal/deduction stok)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getTodayWIB } from '@/lib/utils/timezone';

// ============================================================================
// HELPER: Hitung qty donat standar & mini dari order items
// ============================================================================
async function calculateDonatQty(
  supabase: ReturnType<typeof createAdminClient>,
  orderId: string
): Promise<{ standar: number; mini: number }> {
  const qtyNeeded = { standar: 0, mini: 0 };

  // Ambil order items
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('product_id, quantity')
    .eq('order_id', orderId);

  if (itemsError || !items || items.length === 0) {
    return qtyNeeded;
  }

  const productIds = [...new Set(items.map((i: any) => i.product_id).filter(Boolean))];
  if (productIds.length === 0) return qtyNeeded;

  // Ambil info produk
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, ukuran, tipe_produk, nama')
    .in('id', productIds);

  if (prodError || !products) return qtyNeeded;

  const productMap = new Map(products.map((p: any) => [p.id, p]));

  for (const item of items) {
    const prod = productMap.get(item.product_id);
    if (!prod) continue;

    // Deteksi donat (sama persis seperti di orders/create/route.ts)
    const isDonat =
      prod.tipe_produk &&
      (prod.tipe_produk === 'donat_varian' ||
        prod.tipe_produk === 'donat_base' ||
        prod.tipe_produk.toLowerCase().includes('donat'));

    if (
      isDonat ||
      (prod.ukuran && (prod.ukuran === 'standar' || prod.ukuran === 'mini'))
    ) {
      const isMini =
        prod.ukuran === 'mini' ||
        (prod.nama && prod.nama.toLowerCase().includes('mini'));
      const key = isMini ? 'mini' : 'standar';
      qtyNeeded[key] += item.quantity || 1;
    }
  }

  return qtyNeeded;
}

// ============================================================================
// HELPER: Reversal stok ke inventory_non_topping
// ============================================================================
async function reversalStok(
  supabase: ReturnType<typeof createAdminClient>,
  outletId: string,
  ukuran: 'standar' | 'mini',
  qty: number,
  orderId: string
): Promise<{ success: boolean; error?: string; reversedQty: number }> {
  if (qty <= 0) return { success: true, reversedQty: 0 };

  const todayWIB = getTodayWIB();

  try {
    // Cari batch inventory hari ini untuk di-update (LIFO: update batch terbaru dulu)
    const { data: batches, error: fetchError } = await supabase
      .from('inventory_non_topping')
      .select('id, qty_available')
      .eq('outlet_id', outletId)
      .eq('ukuran', ukuran)
      .eq('production_date', todayWIB)
      .eq('status', 'fresh')
      .order('created_at', { ascending: false }); // LIFO — kembalikan ke batch terbaru

    if (fetchError) {
      console.error('[REVERSAL] Error fetch batches:', fetchError);
    }

    if (batches && batches.length > 0) {
      // Tambah ke batch yang ada
      const latestBatch = batches[0];
      const newQty = latestBatch.qty_available + qty;

      const { error: updateError } = await supabase
        .from('inventory_non_topping')
        .update({
          qty_available: newQty,
          last_updated: new Date().toISOString(),
        })
        .eq('id', latestBatch.id);

      if (updateError) {
        console.error('[REVERSAL] Error update batch:', updateError);
        // Fallback: insert batch reversal baru
      } else {
        console.log(
          `[REVERSAL] ✅ Berhasil kembalikan ${qty} pcs ${ukuran} ke batch ${latestBatch.id.substring(0, 8)}`
        );
        return { success: true, reversedQty: qty };
      }
    }

    // Fallback / Tidak ada batch: insert record reversal baru
    // (Bisa terjadi jika order hari kemarin di-hapus, atau semua batch habis terjual)
    const { error: insertError } = await supabase
      .from('inventory_non_topping')
      .insert({
        outlet_id: outletId,
        ukuran,
        qty_available: qty,
        production_date: todayWIB,
        status: 'fresh',
        last_updated: new Date().toISOString(),
      });

    if (insertError) {
      console.error('[REVERSAL] Error insert reversal batch:', insertError);
      return { success: false, error: insertError.message, reversedQty: 0 };
    }

    console.log(
      `[REVERSAL] ✅ Berhasil INSERT batch reversal ${qty} pcs ${ukuran} untuk outlet ${outletId}`
    );
    return { success: true, reversedQty: qty };
  } catch (err: any) {
    console.error('[REVERSAL] Exception:', err);
    return { success: false, error: err.message, reversedQty: 0 };
  }
}

// ============================================================================
// HELPER: Deduct stok kembali (untuk cancelled → completed)
// ============================================================================
async function deductStokKembali(
  supabase: ReturnType<typeof createAdminClient>,
  outletId: string,
  ukuran: 'standar' | 'mini',
  qty: number
): Promise<{ success: boolean; error?: string }> {
  if (qty <= 0) return { success: true };

  const todayWIB = getTodayWIB();

  const { data: stocks } = await supabase
    .from('inventory_non_topping')
    .select('id, qty_available')
    .eq('outlet_id', outletId)
    .eq('ukuran', ukuran)
    .eq('status', 'fresh')
    .eq('production_date', todayWIB)
    .gt('qty_available', 0)
    .order('production_date', { ascending: true });

  let remaining = qty;
  for (const stock of stocks || []) {
    if (remaining <= 0) break;
    const deductQty = Math.min(stock.qty_available, remaining);
    await supabase
      .from('inventory_non_topping')
      .update({
        qty_available: stock.qty_available - deductQty,
        last_updated: new Date().toISOString(),
      })
      .eq('id', stock.id);
    remaining -= deductQty;
  }

  // Jika masih sisa (oversell), buat record negatif
  if (remaining > 0) {
    await supabase.from('inventory_non_topping').insert({
      outlet_id: outletId,
      ukuran,
      qty_available: -remaining,
      production_date: todayWIB,
      status: 'fresh',
      last_updated: new Date().toISOString(),
    });
  }

  return { success: true };
}

// ============================================================================
// DELETE /api/orders/[id]
// Hapus transaksi + reversal stok donat non-topping
// ============================================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const supabase = createAdminClient();

    // 1. Ambil order untuk validasi
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('id, outlet_id, status, total_amount, created_at')
      .eq('id', orderId)
      .single();

    if (orderFetchError || !order) {
      return NextResponse.json(
        { success: false, message: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    // 2. Hitung qty donat yang perlu di-reversal (hanya jika order completed)
    let reversalStandar = 0;
    let reversalMini = 0;

    if (order.status === 'completed') {
      const donatQty = await calculateDonatQty(supabase, orderId);
      reversalStandar = donatQty.standar;
      reversalMini = donatQty.mini;

      console.log(
        `[DELETE ORDER] Reversal stok untuk order ${orderId}: standar=${reversalStandar}, mini=${reversalMini}`
      );

      // 3. Reversal stok ke inventory_non_topping
      if (reversalStandar > 0) {
        const result = await reversalStok(
          supabase,
          order.outlet_id,
          'standar',
          reversalStandar,
          orderId
        );
        if (!result.success) {
          console.warn(`[DELETE ORDER] Reversal standar gagal: ${result.error}`);
        }
      }

      if (reversalMini > 0) {
        const result = await reversalStok(
          supabase,
          order.outlet_id,
          'mini',
          reversalMini,
          orderId
        );
        if (!result.success) {
          console.warn(`[DELETE ORDER] Reversal mini gagal: ${result.error}`);
        }
      }
    }

    // 4. Hapus order (order_items akan cascade terhapus jika ada FK constraint)
    const { error: deleteItemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);

    if (deleteItemsError) {
      console.warn('[DELETE ORDER] Gagal hapus items:', deleteItemsError);
    }

    const { error: deleteOrderError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (deleteOrderError) {
      return NextResponse.json(
        { success: false, message: `Gagal hapus transaksi: ${deleteOrderError.message}` },
        { status: 500 }
      );
    }

    // 5. Audit log (opsional)
    try {
      await supabase.from('order_deletion_log').insert({
        order_id: orderId,
        outlet_id: order.outlet_id,
        order_status: order.status,
        total_amount: order.total_amount,
        reversal_standar: reversalStandar,
        reversal_mini: reversalMini,
        deleted_at: new Date().toISOString(),
      });
    } catch {
      // Tabel mungkin belum ada, tidak masalah
    }

    const message =
      reversalStandar > 0 || reversalMini > 0
        ? `✅ Transaksi dihapus. Stok dikembalikan: ${reversalStandar > 0 ? `${reversalStandar} pcs standar` : ''}${reversalStandar > 0 && reversalMini > 0 ? ', ' : ''}${reversalMini > 0 ? `${reversalMini} pcs mini` : ''}.`
        : '✅ Transaksi berhasil dihapus.';

    return NextResponse.json({
      success: true,
      message,
      reversal: {
        standar: reversalStandar,
        mini: reversalMini,
      },
    });
  } catch (error: any) {
    console.error('[DELETE ORDER] Exception:', error);
    return NextResponse.json(
      { success: false, message: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/orders/[id]
// Update status transaksi dengan reversal / deduction stok otomatis
// ============================================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus || !['completed', 'pending', 'cancelled'].includes(newStatus)) {
      return NextResponse.json(
        { success: false, message: 'Status tidak valid' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Ambil order sekarang
    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('id, outlet_id, status')
      .eq('id', orderId)
      .single();

    if (orderFetchError || !order) {
      return NextResponse.json(
        { success: false, message: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    const oldStatus = order.status;

    if (oldStatus === newStatus) {
      return NextResponse.json({ success: true, message: 'Status tidak berubah' });
    }

    // 2. Hitung qty donat yang terlibat
    const donatQty = await calculateDonatQty(supabase, orderId);
    let reversalInfo = { standar: 0, mini: 0 };

    // 3. Tentukan apa yang perlu dilakukan berdasarkan perubahan status
    if (oldStatus === 'completed' && newStatus === 'cancelled') {
      // completed → cancelled: REVERSAL stok (kembalikan donat)
      if (donatQty.standar > 0) {
        await reversalStok(supabase, order.outlet_id, 'standar', donatQty.standar, orderId);
        reversalInfo.standar = donatQty.standar;
      }
      if (donatQty.mini > 0) {
        await reversalStok(supabase, order.outlet_id, 'mini', donatQty.mini, orderId);
        reversalInfo.mini = donatQty.mini;
      }
      console.log(`[PATCH ORDER] ${orderId}: completed→cancelled, reversal standar=${donatQty.standar}, mini=${donatQty.mini}`);
    } else if (oldStatus === 'cancelled' && newStatus === 'completed') {
      // cancelled → completed: DEDUCT stok kembali
      if (donatQty.standar > 0) {
        await deductStokKembali(supabase, order.outlet_id, 'standar', donatQty.standar);
      }
      if (donatQty.mini > 0) {
        await deductStokKembali(supabase, order.outlet_id, 'mini', donatQty.mini);
      }
      console.log(`[PATCH ORDER] ${orderId}: cancelled→completed, deduct standar=${donatQty.standar}, mini=${donatQty.mini}`);
    }
    // pending → anything atau anything → pending: tidak ada efek stok

    // 4. Update status di database
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateError) {
      return NextResponse.json(
        { success: false, message: `Gagal update status: ${updateError.message}` },
        { status: 500 }
      );
    }

    let message = `Status diperbarui: ${oldStatus} → ${newStatus}`;
    if (reversalInfo.standar > 0 || reversalInfo.mini > 0) {
      message += `. Stok dikembalikan: ${reversalInfo.standar > 0 ? `${reversalInfo.standar} pcs standar` : ''}${reversalInfo.standar > 0 && reversalInfo.mini > 0 ? ', ' : ''}${reversalInfo.mini > 0 ? `${reversalInfo.mini} pcs mini` : ''}.`;
    }

    return NextResponse.json({
      success: true,
      message,
      oldStatus,
      newStatus,
      reversal: reversalInfo,
    });
  } catch (error: any) {
    console.error('[PATCH ORDER] Exception:', error);
    return NextResponse.json(
      { success: false, message: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}
