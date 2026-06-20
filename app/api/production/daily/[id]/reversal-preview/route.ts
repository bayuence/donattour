// ============================================================================
// PRODUCTION REVERSAL PREVIEW API
// ============================================================================
// File: app/api/production/daily/[id]/reversal-preview/route.ts
// Description: Preview dampak penghapusan entri produksi pada stok kasir
// Version: 1.1 — Fix auth: pakai adminClient.auth.getUser()
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getProductionDailyById } from '@/lib/db/production-tracking';
import { createAdminClient } from '@/lib/supabase/server';
import { getTodayWIB } from '@/lib/utils/timezone';

// Helper auth — sama dengan [id]/route.ts
async function getUserFromAdminClient(request: NextRequest) {
  const headerUserId = request.headers.get('x-user-id');
  const headerUserRole = request.headers.get('x-user-role');
  if (headerUserId && headerUserRole) {
    return { id: headerUserId, role: headerUserRole };
  }

  const adminSupabase = createAdminClient();
  const { data: { user: supabaseUser } } = await adminSupabase.auth.getUser();
  if (supabaseUser) {
    const { data: userRecord } = await adminSupabase
      .from('users').select('role').eq('id', supabaseUser.id).single();
    return { id: supabaseUser.id, role: userRecord?.role || 'user' };
  }

  // Coba cookie app
  const appUserCookie = request.cookies.get('donutshop_user')?.value;
  if (appUserCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(appUserCookie));
      if (parsed?.id && parsed?.role) return { id: parsed.id, role: parsed.role };
    } catch {}
  }

  return null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adminSupabase = createAdminClient();

    // Cari produksi (tidak butuh auth ketat — ini hanya baca data)
    const production = await getProductionDailyById(id);
    if (!production) {
      return NextResponse.json({ success: false, message: 'Produksi tidak ditemukan' }, { status: 404 });
    }

    // Cek tanggal — hanya entri hari ini yang bisa dihapus
    const today = getTodayWIB();
    const prodDate = (production.tanggal as string).substring(0, 10);
    if (prodDate !== today) {
      return NextResponse.json({
        success: true,
        data: {
          production: {
            id: (production as any).id,
            outlet_name: (production as any).outlet?.nama || 'Unknown',
            tanggal: prodDate,
            ukuran: (production as any).ukuran,
            success_qty: (production as any).success_qty,
          },
          inventory_impact: {
            qty_originally_added: 0,
            qty_still_available: 0,
            qty_already_sold: 0,
            can_delete: false,
            reason: `Entri dari ${prodDate} tidak bisa dihapus (hanya hari ini)`,
          },
        },
      });
    }

    const outletId = (production as any).outlet_id;
    const ukuran = (production as any).ukuran;

    // Cari sync log
    const { data: syncLog } = await adminSupabase
      .from('inventory_sync_log')
      .select('id, qty_synced')
      .eq('production_daily_id', id)
      .maybeSingle();

    let qty_still_available = 0;
    let qty_already_sold = 0;
    const qty_originally_added = syncLog?.qty_synced || 0;

    if (syncLog && syncLog.qty_synced > 0) {
      // Cari baris inventory_non_topping terkait
      const { data: invRows } = await adminSupabase
        .from('inventory_non_topping')
        .select('id, qty_available')
        .eq('outlet_id', outletId)
        .eq('ukuran', ukuran)
        .eq('production_date', prodDate)
        .order('created_at', { ascending: true });

      const matchRow = invRows?.find((r) => r.qty_available <= syncLog.qty_synced);

      if (matchRow) {
        qty_still_available = matchRow.qty_available;
        qty_already_sold = syncLog.qty_synced - qty_still_available;
      } else {
        qty_still_available = 0;
        qty_already_sold = syncLog.qty_synced;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        production: {
          id: (production as any).id,
          outlet_id: outletId,
          outlet_name: (production as any).outlet?.nama || 'Unknown',
          tanggal: prodDate,
          ukuran,
          target_qty: (production as any).target_qty,
          success_qty: (production as any).success_qty,
          waste_qty: (production as any).waste_qty,
        },
        inventory_impact: {
          qty_originally_added,
          qty_still_available,
          qty_already_sold,
          can_delete: true,
        },
      },
    });

  } catch (error: any) {
    console.error('Error fetching reversal preview:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
