// ============================================================================
// MULTI-OUTLET DASHBOARD API
// ============================================================================
// File: app/api/dashboard/multi-outlet/route.ts
//
// Returns a per-outlet performance row + portfolio totals for a date RANGE.
// Default range = today (WIB). Optional outlet filter scopes the result to
// a single outlet, otherwise the response covers every active outlet.
//
// Query params:
//   - start_date: YYYY-MM-DD (default: today WIB)
//   - end_date:   YYYY-MM-DD (default: today WIB)
//   - outlet_id:  optional, scope to single outlet
//
// Response:
//   { totals, outlets[], trend[], channels{}, expenses }
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getTodayWIB } from '@/lib/utils/timezone';

const LOW_STOCK_THRESHOLD = 20;

interface OutletRow {
  outlet_id: string;
  nama: string;
  omzet: number;
  transactions: number;
  avg_trx: number;
  target: number;
  success: number;
  sold: number;
  waste: number;
  success_rate: number;
  waste_rate: number;
  hpp_sold: number;
  total_loss: number;
  expenses: number;
  margin: number;
  low_stock_count: number;
  last_order_at: string | null;
  active_kasir_count: number;
  status: 'top' | 'aktif' | 'perhatian' | 'tidur';
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;

    const today = getTodayWIB();
    const startDate = searchParams.get('start_date') || today;
    const endDate = searchParams.get('end_date') || startDate;
    const outletFilter = searchParams.get('outlet_id') || null;

    if (!isDate(startDate) || !isDate(endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_DATE', message: 'Format tanggal harus YYYY-MM-DD' },
        },
        { status: 400 }
      );
    }
    if (startDate > endDate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_RANGE',
            message: 'start_date harus lebih kecil atau sama dengan end_date',
          },
        },
        { status: 400 }
      );
    }

    const startTs = `${startDate}T00:00:00`;
    const endTs = `${endDate}T23:59:59`;

    // ---- Fetch in parallel -------------------------------------------------
    const outletQuery = (() => {
      let q = (supabase as any).from('outlets').select('id, nama').eq('is_active', true);
      if (outletFilter) q = q.eq('id', outletFilter);
      return q.order('nama');
    })();

    const ordersQuery = (() => {
      let q = (supabase as any)
        .from('orders')
        .select('id, outlet_id, kasir_id, channel, total_amount, created_at, status')
        .gte('created_at', startTs)
        .lte('created_at', endTs)
        .eq('status', 'completed');
      if (outletFilter) q = q.eq('outlet_id', outletFilter);
      return q;
    })();

    const orderItemsQuery = (() => {
      let q = (supabase as any)
        .from('order_items')
        .select(`
          product_id,
          product_name,
          quantity,
          subtotal,
          orders!inner(outlet_id, status, created_at),
          products(nama, harga_pokok_penjualan, ukuran, category_id, category:product_categories(nama))
        `)
        .eq('orders.status', 'completed')
        .gte('orders.created_at', startTs)
        .lte('orders.created_at', endTs);
      if (outletFilter) q = q.eq('orders.outlet_id', outletFilter);
      return q;
    })();

    const productionQuery = (() => {
      let q = (supabase as any)
        .from('production_daily')
        .select('outlet_id, target_qty, success_qty, waste_qty, tanggal')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);
      if (outletFilter) q = q.eq('outlet_id', outletFilter);
      return q;
    })();

    const lossQuery = (() => {
      let q = (supabase as any)
        .from('daily_loss_summary')
        .select('outlet_id, tanggal, total_loss')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);
      if (outletFilter) q = q.eq('outlet_id', outletFilter);
      return q;
    })();

    const inventoryQuery = (() => {
      // Low stock based on TODAY only (most relevant signal).
      let q = (supabase as any)
        .from('inventory_non_topping')
        .select('outlet_id, qty_available, status')
        .eq('production_date', today);
      if (outletFilter) q = q.eq('outlet_id', outletFilter);
      return q;
    })();

    const expensesQuery = (() => {
      let q = (supabase as any)
        .from('expenses')
        .select('outlet_id, jumlah, tanggal')
        .gte('tanggal', startDate)
        .lte('tanggal', endDate);
      if (outletFilter) q = q.eq('outlet_id', outletFilter);
      return q;
    })();

    const [
      outletsRes,
      ordersRes,
      orderItemsRes,
      productionRes,
      lossRes,
      inventoryRes,
      expensesRes,
    ] = await Promise.all([
      outletQuery,
      ordersQuery,
      orderItemsQuery,
      productionQuery,
      lossQuery,
      inventoryQuery,
      expensesQuery,
    ]);

    if (outletsRes.error) throw outletsRes.error;

    const outlets = (outletsRes.data ?? []) as Array<{ id: string; nama: string }>;
    const orders = (ordersRes.data ?? []) as Array<any>;
    const orderItems = (orderItemsRes.data ?? []) as Array<any>;
    const production = (productionRes.data ?? []) as Array<any>;
    const losses = (lossRes.data ?? []) as Array<any>;
    const inventory = (inventoryRes.data ?? []) as Array<any>;
    const expensesData = (expensesRes.data ?? []) as Array<any>;

    // ---- Build per-outlet rows --------------------------------------------
    const rowsMap = new Map<string, OutletRow>();
    for (const o of outlets) {
      rowsMap.set(o.id, {
        outlet_id: o.id,
        nama: o.nama,
        omzet: 0,
        transactions: 0,
        avg_trx: 0,
        target: 0,
        success: 0,
        sold: 0,
        waste: 0,
        success_rate: 0,
        waste_rate: 0,
        hpp_sold: 0,
        total_loss: 0,
        expenses: 0,
        margin: 0,
        low_stock_count: 0,
        last_order_at: null,
        active_kasir_count: 0,
        status: 'tidur',
      });
    }

    const kasirByOutlet = new Map<string, Set<string>>();
    const channelTotals: Record<string, { omzet: number; transactions: number }> = {};

    for (const order of orders) {
      const row = rowsMap.get(order.outlet_id);
      if (!row) continue;
      const amount = Number(order.total_amount) || 0;
      row.omzet += amount;
      row.transactions += 1;

      if (order.kasir_id) {
        if (!kasirByOutlet.has(order.outlet_id)) {
          kasirByOutlet.set(order.outlet_id, new Set());
        }
        kasirByOutlet.get(order.outlet_id)!.add(order.kasir_id);
      }
      if (!row.last_order_at || order.created_at > row.last_order_at) {
        row.last_order_at = order.created_at;
      }

      const ch = (order.channel || 'toko') as string;
      if (!channelTotals[ch]) channelTotals[ch] = { omzet: 0, transactions: 0 };
      channelTotals[ch].omzet += amount;
      channelTotals[ch].transactions += 1;
    }

    for (const [outletId, set] of kasirByOutlet) {
      const row = rowsMap.get(outletId);
      if (row) row.active_kasir_count = set.size;
    }

    const salesByProduct: Record<string, { qty: number; revenue: number; product_name: string; hpp_unit: number; category_id: string | null; category_name: string | null }> = {};

    for (const item of orderItems) {
      const order = item.orders;
      if (!order) continue;
      const row = rowsMap.get(order.outlet_id);
      if (!row) continue;
      const qty = Number(item.quantity) || 0;
      const hpp = Number(item.products?.harga_pokok_penjualan) || 0;
      
      // HANYA hitung donat (yang memiliki ukuran) ke dalam metrik Terjual
      if (item.products?.ukuran) {
        row.sold += qty;
      }
      
      row.hpp_sold += qty * hpp;

      // Agregasi Penjualan Produk
      const productId = item.product_id;
      const productName = item.product_name || item.products?.nama || '';
      const subtotal = Number(item.subtotal) || 0;
      const categoryId = item.products?.category_id || null;
      const categoryName = item.products?.category?.nama || null;

      if (productId && subtotal > 0 && productName) {
        if (!salesByProduct[productId]) {
          salesByProduct[productId] = {
            product_name: productName,
            category_id: categoryId,
            category_name: categoryName,
            qty: 0,
            revenue: 0,
            hpp_unit: hpp,
          };
        }
        salesByProduct[productId].qty += qty;
        salesByProduct[productId].revenue += subtotal;
      }
    }

    const salesByProductArray = Object.entries(salesByProduct)
      .map(([productId, data]) => {
        const totalHpp = data.qty * data.hpp_unit;
        const totalMargin = data.revenue - totalHpp;
        const marginPercent = data.revenue > 0 ? (totalMargin / data.revenue) * 100 : 0;
        return {
          product_id: productId,
          product_name: data.product_name,
          category_id: data.category_id,
          category_name: data.category_name,
          qty: data.qty,
          revenue: data.revenue,
          hpp_unit: data.hpp_unit,
          total_hpp: totalHpp,
          total_margin: totalMargin,
          margin_percent: marginPercent,
        };
      })
      .sort((a, b) => b.qty - a.qty);

    for (const p of production) {
      const row = rowsMap.get(p.outlet_id);
      if (!row) continue;
      row.target += Number(p.target_qty) || 0;
      row.success += Number(p.success_qty) || 0;
      row.waste += Number(p.waste_qty) || 0;
    }

    for (const l of losses) {
      const row = rowsMap.get(l.outlet_id);
      if (!row) continue;
      row.total_loss += Number(l.total_loss) || 0;
    }

    for (const inv of inventory) {
      const row = rowsMap.get(inv.outlet_id);
      if (!row) continue;
      if (inv.status !== 'expired' && Number(inv.qty_available) < LOW_STOCK_THRESHOLD) {
        row.low_stock_count += 1;
      }
    }

    for (const ex of expensesData) {
      const row = rowsMap.get(ex.outlet_id);
      if (!row) continue;
      row.expenses += Number(ex.jumlah) || 0;
    }

    // Derived per-row metrics
    const rows = Array.from(rowsMap.values()).map((row) => {
      row.avg_trx = row.transactions > 0 ? Math.round(row.omzet / row.transactions) : 0;
      row.success_rate = row.target > 0 ? round2((row.success / row.target) * 100) : 0;
      row.waste_rate = row.target > 0 ? round2((row.waste / row.target) * 100) : 0;
      const grossProfit = row.omzet - row.hpp_sold;
      row.margin = row.omzet > 0 ? round2((grossProfit / row.omzet) * 100) : 0;
      row.status = classifyStatus(row);
      return row;
    });

    rows.sort((a, b) => b.omzet - a.omzet);

    // ---- Totals ------------------------------------------------------------
    const totals = rows.reduce(
      (acc, r) => {
        acc.omzet += r.omzet;
        acc.transactions += r.transactions;
        acc.target += r.target;
        acc.success += r.success;
        acc.sold += r.sold;
        acc.waste += r.waste;
        acc.hpp_sold += r.hpp_sold;
        acc.total_loss += r.total_loss;
        acc.expenses += r.expenses;
        acc.low_stock_count += r.low_stock_count;
        return acc;
      },
      {
        omzet: 0,
        transactions: 0,
        target: 0,
        success: 0,
        sold: 0,
        waste: 0,
        hpp_sold: 0,
        total_loss: 0,
        expenses: 0,
        low_stock_count: 0,
      }
    );

    const totalGrossProfit = totals.omzet - totals.hpp_sold;
    const totalMargin = totals.omzet > 0 ? round2((totalGrossProfit / totals.omzet) * 100) : 0;
    const totalAvgTrx =
      totals.transactions > 0 ? Math.round(totals.omzet / totals.transactions) : 0;

    // ---- Daily trend series -----------------------------------------------
    // Build a map keyed by YYYY-MM-DD covering the full range.
    const days = enumerateDays(startDate, endDate);
    const trendMap: Record<string, { date: string; omzet: number; transactions: number; expenses: number }> = {};
    for (const d of days) {
      trendMap[d] = { date: d, omzet: 0, transactions: 0, expenses: 0 };
    }
    for (const order of orders) {
      const day = (order.created_at as string).slice(0, 10);
      if (trendMap[day]) {
        trendMap[day].omzet += Number(order.total_amount) || 0;
        trendMap[day].transactions += 1;
      }
    }
    for (const ex of expensesData) {
      const day = ex.tanggal as string;
      if (trendMap[day]) {
        trendMap[day].expenses += Number(ex.jumlah) || 0;
      }
    }
    const trend = days.map((d) => trendMap[d]);

    return NextResponse.json({
      success: true,
      data: {
        range: {
          start_date: startDate,
          end_date: endDate,
          days: days.length,
        },
        outlet_filter: outletFilter,
        outlet_count: rows.length,
        totals: {
          ...totals,
          gross_profit: totalGrossProfit,
          margin: totalMargin,
          avg_trx: totalAvgTrx,
          active_outlets: rows.filter((r) => r.transactions > 0).length,
        },
        outlets: rows,
        trend,
        channels: channelTotals,
        sales_by_product: salesByProductArray,
      },
    });
  } catch (error: any) {
    console.error('[GET /api/dashboard/multi-outlet] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error?.message || 'Failed to fetch multi-outlet dashboard',
        },
      },
      { status: 500 }
    );
  }
}

// ---- helpers ---------------------------------------------------------------

function isDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function enumerateDays(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  for (let d = s; d <= e; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function classifyStatus(row: OutletRow): 'top' | 'aktif' | 'perhatian' | 'tidur' {
  if (row.transactions === 0 && row.target === 0) return 'tidur';
  if (row.waste_rate > 20 || (row.omzet > 0 && row.margin < 10)) return 'perhatian';
  if (row.transactions === 0) return 'perhatian';
  return 'aktif';
}
