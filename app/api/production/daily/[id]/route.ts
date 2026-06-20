// ============================================================================
// PRODUCTION DAILY [ID] API ROUTE
// ============================================================================
// File: app/api/production/daily/[id]/route.ts
// Description: API endpoints for single production daily record
// Version: 2.1 — Fix auth: pakai adminClient.auth.getUser() seperti GET list
// Date: 2026-06-19
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { 
  getProductionDailyById, 
  updateProductionDaily,
  deleteProductionDaily 
} from '@/lib/db/production-tracking';
import { createAdminClient } from '@/lib/supabase/server';
import { getTodayWIB } from '@/lib/utils/timezone';

// ============================================================================
// HELPER: Ambil user dari request (sama persis dengan GET list handler)
// ============================================================================
async function getUserFromAdminClient(request: NextRequest) {
  // 1. Coba dari header (dikirim middleware)
  const headerUserId = request.headers.get('x-user-id');
  const headerUserRole = request.headers.get('x-user-role');

  if (headerUserId && headerUserRole) {
    return { id: headerUserId, role: headerUserRole };
  }

  // 2. Fallback: ambil dari Supabase session via admin client (pakai cookies)
  const adminSupabase = createAdminClient();
  const { data: { user: supabaseUser } } = await adminSupabase.auth.getUser();

  if (supabaseUser) {
    const { data: userRecord } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', supabaseUser.id)
      .single();
    return { id: supabaseUser.id, role: userRecord?.role || 'user' };
  }

  // 3. Fallback: coba dari localStorage via donutshop_user di body / cookie app
  // App ini menyimpan user di localStorage sebagai 'donutshop_user'
  // Karena localStorage tidak bisa diakses di server, kita cek cookie custom
  const appUserCookie = request.cookies.get('donutshop_user')?.value;
  if (appUserCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(appUserCookie));
      if (parsed?.id && parsed?.role) {
        return { id: parsed.id, role: parsed.role };
      }
    } catch {}
  }

  return null;
}

// ============================================================================
// GET /api/production/daily/[id]
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const production = await getProductionDailyById(id);
    if (!production) {
      return NextResponse.json({ success: false, message: 'Production not found' }, { status: 404 });
    }

    const productionWithRates = {
      ...production,
      success_rate: production.target_qty > 0
        ? Math.round((production.success_qty / production.target_qty) * 100 * 100) / 100 : 0,
      waste_rate: production.target_qty > 0
        ? Math.round((production.waste_qty / production.target_qty) * 100 * 100) / 100 : 0,
    };

    return NextResponse.json({ success: true, data: productionWithRates }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT /api/production/daily/[id]
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await getProductionDailyById(id);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Production not found' }, { status: 404 });
    }

    const today = getTodayWIB();
    const productionDate = (existing.tanggal as string).substring(0, 10);
    if (productionDate !== today) {
      return NextResponse.json({ success: false, message: 'Hanya bisa edit produksi hari ini' }, { status: 403 });
    }

    const body = await request.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
    }

    let finalUpdates: any = { ...body };

    const oldSuccessQty = (existing as any).success_qty || 0;
    let newSuccessQty = oldSuccessQty;

    if (body.success_qty !== undefined || body.waste_details !== undefined) {
      const wasteDetails = body.waste_details || (existing as any).waste_details || [];
      const totalWaste = wasteDetails.reduce((sum: number, detail: any) => sum + detail.qty, 0);
      const totalHppLoss = wasteDetails.reduce(
        (sum: number, detail: any) => sum + (detail.qty * detail.hpp_per_pcs), 0
      );
      finalUpdates.waste_qty = totalWaste;
      finalUpdates.total_hpp_loss = totalHppLoss;

      const targetQty = body.target_qty || existing.target_qty;
      newSuccessQty = body.success_qty !== undefined ? body.success_qty : existing.success_qty;
      if (newSuccessQty + totalWaste > targetQty) {
        return NextResponse.json(
          { success: false, message: 'Total success + waste tidak boleh melebihi target' },
          { status: 400 }
        );
      }
    }

    // ✅ FIX 2: Sinkronisasi inventory_non_topping saat success_qty berubah
    const delta = newSuccessQty - oldSuccessQty;
    const adminSupabase = createAdminClient();
    const outletId = (existing as any).outlet_id;
    const ukuran = (existing as any).ukuran;
    let inventorySyncMessage = '';

    if (delta !== 0) {
      console.log(`[PUT production] Delta success_qty: ${oldSuccessQty} → ${newSuccessQty} (delta=${delta}), outlet=${outletId}, ukuran=${ukuran}`);

      if (delta > 0) {
        // success_qty bertambah → tambah stok ke kasir
        // Update sync_log jika ada, lalu tambah batch inventory baru
        const { data: syncLog } = await adminSupabase
          .from('inventory_sync_log')
          .select('id, qty_synced')
          .eq('production_daily_id', id)
          .maybeSingle();

        if (syncLog) {
          // Update sync log qty
          await adminSupabase
            .from('inventory_sync_log')
            .update({ qty_synced: syncLog.qty_synced + delta, last_synced_at: new Date().toISOString() })
            .eq('id', syncLog.id);
        }

        // Insert batch baru untuk delta positif
        const { error: insertErr } = await adminSupabase
          .from('inventory_non_topping')
          .insert({
            outlet_id: outletId,
            ukuran,
            qty_available: delta,
            production_date: productionDate,
            status: 'fresh',
            last_updated: new Date().toISOString(),
          });

        if (insertErr) {
          console.error('[PUT production] Gagal tambah delta stok:', insertErr);
          inventorySyncMessage = `⚠️ Data produksi berhasil diedit, namun sinkronisasi stok (+${delta}) gagal: ${insertErr.message}`;
        } else {
          console.log(`[PUT production] ✅ Tambah ${delta} pcs ke stok kasir`);
          inventorySyncMessage = `+${delta} pcs stok dikurangkan ke kasir`;
        }

      } else {
        // delta < 0 → success_qty dikurangi → kurangi stok dari kasir
        const reduceQty = Math.abs(delta);

        // Ambil batch yang ada hari ini
        const { data: batches } = await adminSupabase
          .from('inventory_non_topping')
          .select('id, qty_available')
          .eq('outlet_id', outletId)
          .eq('ukuran', ukuran)
          .eq('status', 'fresh')
          .eq('production_date', productionDate)
          .gt('qty_available', 0)
          .order('created_at', { ascending: false }); // LIFO untuk pengurangan

        let remaining = reduceQty;
        for (const batch of (batches || [])) {
          if (remaining <= 0) break;
          const deduct = Math.min(batch.qty_available, remaining);
          await adminSupabase
            .from('inventory_non_topping')
            .update({
              qty_available: batch.qty_available - deduct,
              last_updated: new Date().toISOString(),
            })
            .eq('id', batch.id);
          remaining -= deduct;
        }

        // Update sync log
        const { data: syncLog } = await adminSupabase
          .from('inventory_sync_log')
          .select('id, qty_synced')
          .eq('production_daily_id', id)
          .maybeSingle();

        if (syncLog) {
          await adminSupabase
            .from('inventory_sync_log')
            .update({ qty_synced: Math.max(0, syncLog.qty_synced + delta), last_synced_at: new Date().toISOString() })
            .eq('id', syncLog.id);
        }

        if (remaining > 0) {
          // Stok tidak cukup dikurangi (sudah terjual) — buat record negatif
          await adminSupabase.from('inventory_non_topping').insert({
            outlet_id: outletId,
            ukuran,
            qty_available: -remaining,
            production_date: productionDate,
            status: 'fresh',
            last_updated: new Date().toISOString(),
          });
          inventorySyncMessage = `⚠️ ${reduceQty} pcs dikurangi, namun ${remaining} pcs sudah terjual (stok negatif tercatat).`;
        } else {
          inventorySyncMessage = `-${reduceQty} pcs stok dikurangi dari kasir`;
        }

        console.log(`[PUT production] ✅ Kurangi ${reduceQty} pcs dari stok kasir (sisa tidak bisa kurang: ${remaining})`);
      }
    }

    const updated = await updateProductionDaily(id, finalUpdates);

    return NextResponse.json({
      success: true,
      data: updated,
      message: inventorySyncMessage
        ? `Produksi berhasil diupdate. ${inventorySyncMessage}`
        : 'Produksi berhasil diupdate',
      inventory_delta: delta,
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/production/daily/[id]
// ============================================================================
//
// AMAN: Hapus entri produksi + reversal inventory_non_topping secara otomatis
//
// MATEMATIKA:
//   Input produksi 241 pcs → inventory_non_topping += 241
//   Kasir jual 100 pcs → inventory_non_topping = 141
//   Hapus entri → reversal 141 pcs (hapus dari stok kasir)
//   100 pcs yang sudah terjual → TETAP valid di orders, tidak ikut dihapus
//
// ATURAN:
//   - Hanya entri HARI INI yang bisa dihapus (tanggal WIB)
//   - Hanya admin, owner, manager yang bisa menghapus
//   - Transaksi yang sudah terjual TIDAK terpengaruh
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Auth — pakai pattern yang sama dengan GET list (admin client)
    const user = await getUserFromAdminClient(request);
    
    // Jika tidak ada user, coba lanjutkan dengan role 'admin' jika ada token di localStorage
    // (sistem ini menggunakan PIN auth, bukan JWT)
    // Untuk keamanan, kita tetap require user ada
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Sesi tidak ditemukan. Silakan login ulang.' },
        { status: 401 }
      );
    }

    // 2. Cek role
    const allowedRoles = ['admin', 'owner', 'manager'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Hanya admin, owner, atau manager yang bisa menghapus entri produksi' },
        { status: 403 }
      );
    }

    // 3. Cari production
    const existing = await getProductionDailyById(id);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Entri produksi tidak ditemukan' }, { status: 404 });
    }

    // 4. Cek tanggal — hanya boleh hapus hari ini (WIB)
    const today = getTodayWIB();
    const productionDate = (existing.tanggal as string).substring(0, 10);
    if (productionDate !== today) {
      return NextResponse.json(
        { success: false, message: `Tidak bisa menghapus entri dari ${productionDate}. Hanya entri hari ini (${today}) yang bisa dihapus.` },
        { status: 403 }
      );
    }

    const adminSupabase = createAdminClient();
    const outletId = (existing as any).outlet_id;
    const ukuran = (existing as any).ukuran;
    const successQty = (existing as any).success_qty || 0;

    // ══════════════════════════════════════════════════════════════
    // 5. REVERSAL INVENTORY
    //
    // Cari inventory_sync_log → tahu qty yang pernah di-sync
    // Cari baris inventory_non_topping terkait
    // Hapus baris inventory tersebut (reversal sisa stok)
    // Hapus sync log entry
    // ══════════════════════════════════════════════════════════════

    let qtyReversed = 0;
    let qtyAlreadySold = 0;
    let inventoryRowsDeleted = 0;

    const { data: syncLog } = await adminSupabase
      .from('inventory_sync_log')
      .select('id, qty_synced')
      .eq('production_daily_id', id)
      .maybeSingle();

    if (syncLog && syncLog.qty_synced > 0) {
      const qtyOriginallyAdded = syncLog.qty_synced;

      const { data: invRows } = await adminSupabase
        .from('inventory_non_topping')
        .select('id, qty_available')
        .eq('outlet_id', outletId)
        .eq('ukuran', ukuran)
        .eq('production_date', productionDate)
        .order('created_at', { ascending: true });

      // Cari batch yang cocok: qty_available <= qty_originally_added
      const targetRow = invRows?.find((r) => r.qty_available <= qtyOriginallyAdded);

      if (targetRow) {
        qtyReversed = targetRow.qty_available;
        qtyAlreadySold = qtyOriginallyAdded - qtyReversed;

        console.log(`[DELETE production] Reversal: originally=${qtyOriginallyAdded}, sisa=${qtyReversed}, terjual=${qtyAlreadySold}`);

        const { error: invDeleteError } = await adminSupabase
          .from('inventory_non_topping')
          .delete()
          .eq('id', targetRow.id);

        if (!invDeleteError) {
          inventoryRowsDeleted = 1;
          console.log(`[DELETE production] ✅ Inventory row ${targetRow.id} dihapus (${qtyReversed} pcs di-reversal)`);
        } else {
          console.error('[DELETE production] Gagal hapus inventory row:', invDeleteError);
        }
      } else {
        qtyAlreadySold = qtyOriginallyAdded;
        qtyReversed = 0;
        console.log(`[DELETE production] Semua ${qtyOriginallyAdded} pcs sudah terjual — skip reversal`);
      }

      // Hapus sync log
      await adminSupabase
        .from('inventory_sync_log')
        .delete()
        .eq('production_daily_id', id);
    }

    // 6. Audit log (opsional — tidak blokir jika tabel belum ada)
    try {
      await adminSupabase.from('production_deletion_log').insert({
        production_daily_id: id,
        deleted_by: user.id,
        deleted_by_role: user.role,
        outlet_id: outletId,
        ukuran,
        tanggal_produksi: productionDate,
        success_qty_original: successQty,
        qty_reversed: qtyReversed,
        qty_already_sold: qtyAlreadySold,
        deleted_at: new Date().toISOString(),
        notes: `Hapus manual oleh ${user.role} via Riwayat Produksi`,
      });
    } catch (logErr) {
      console.warn('[DELETE production] production_deletion_log belum ada, skip audit log');
    }

    // 7. Hapus production record
    await deleteProductionDaily(id);

    const message = qtyReversed > 0
      ? `✅ Entri dihapus. ${qtyReversed} pcs stok dikembalikan dari kasir.`
      : `✅ Entri dihapus. Semua ${qtyAlreadySold} pcs sudah terjual, tidak ada stok yang perlu dikembalikan.`;

    return NextResponse.json(
      {
        success: true,
        message,
        reversal: {
          qty_reversed: qtyReversed,
          qty_already_sold: qtyAlreadySold,
          inventory_rows_deleted: inventoryRowsDeleted,
        },
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error deleting production:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
