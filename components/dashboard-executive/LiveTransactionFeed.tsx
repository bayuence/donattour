'use client';

// ============================================================================
// EXECUTIVE DASHBOARD — LIVE TRANSACTION FEED
// ============================================================================
// Streams the most recent orders. Auto-refreshes via Supabase Realtime so the
// owner sees orders the moment a kasir closes them.
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { Receipt, Activity, Store, Bike, Utensils, ShoppingBag, Music } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { formatRupiah } from '@/lib/utils/format';

interface LiveOrder {
  id: string;
  outlet_id: string;
  outlet_nama: string | null;
  kasir_name: string | null;
  customer_name: string | null;
  channel: string;
  total_amount: number;
  payment_method: string | null;
  payment_status: string | null;
  status: string;
  created_at: string;
  items_count: number;
}

interface Props {
  outletId?: string | null;
  limit?: number;
}

const CHANNEL_META: Record<string, { label: string; icon: any; cls: string }> = {
  toko: { label: 'Toko', icon: Store, cls: 'bg-orange-100 text-orange-700' },
  gofood: { label: 'GoFood', icon: Bike, cls: 'bg-emerald-100 text-emerald-700' },
  grabfood: { label: 'GrabFood', icon: Utensils, cls: 'bg-green-100 text-green-700' },
  shopee: { label: 'ShopeeFood', icon: ShoppingBag, cls: 'bg-rose-100 text-rose-700' },
  tiktok: { label: 'TikTok', icon: Music, cls: 'bg-gray-200 text-gray-800' },
};

export function LiveTransactionFeed({ outletId, limit = 15 }: Props) {
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ limit: String(limit) });
      if (outletId) qs.set('outlet_id', outletId);
      const res = await fetch(`/api/dashboard/live-transactions?${qs.toString()}`);
      const json = await res.json();
      if (json?.success) {
        setOrders(json.data as LiveOrder[]);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [outletId, limit]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Realtime: refetch on order changes; briefly highlight new rows.
  useEffect(() => {
    const channel = (supabase as any)
      .channel(`live-tx-${outletId ?? 'all'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: outletId ? `outlet_id=eq.${outletId}` : undefined,
        },
        (payload: any) => {
          const newId = payload?.new?.id;
          if (newId) {
            setHighlightedId(newId);
            setTimeout(() => setHighlightedId((cur) => (cur === newId ? null : cur)), 4000);
          }
          fetchOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: outletId ? `outlet_id=eq.${outletId}` : undefined,
        },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      try {
        (supabase as any).removeChannel(channel);
      } catch {
        /* noop */
      }
    };
  }, [outletId, fetchOrders]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Receipt size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              Transaksi Live
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                </span>
                LIVE
              </span>
            </h3>
            <p className="text-[11px] text-gray-500">
              {orders.length > 0
                ? `${orders.length} transaksi terakhir`
                : 'Menunggu transaksi…'}
            </p>
          </div>
        </div>
        <Activity size={14} className="text-gray-300" />
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {loading && orders.length === 0 ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-gray-700">Belum ada transaksi</p>
            <p className="text-[11px] text-gray-500">
              Transaksi akan muncul otomatis di sini.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {orders.map((o) => {
              const meta = CHANNEL_META[o.channel] || CHANNEL_META.toko;
              const Icon = meta.icon;
              const isNew = highlightedId === o.id;
              return (
                <li
                  key={o.id}
                  className={`px-4 py-3 transition-colors ${
                    isNew ? 'bg-emerald-50 animate-pulse' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${meta.cls}`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span
                          className={`px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-gray-500 truncate">
                          {o.outlet_nama || 'Outlet'}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {formatRupiah(o.total_amount)}
                        <span className="text-[11px] font-normal text-gray-500 ml-2">
                          · {o.items_count} item
                        </span>
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {o.kasir_name ? `oleh ${o.kasir_name}` : 'Kasir'}
                        {o.customer_name ? ` · ${o.customer_name}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                          o.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : o.status === 'pending'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {o.status}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(o.created_at)}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.round((now - then) / 1000));
  if (diffSec < 60) return `${diffSec} dtk lalu`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH} jam lalu`;
  const diffD = Math.round(diffH / 24);
  return `${diffD} hari lalu`;
}
