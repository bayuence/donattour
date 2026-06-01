'use client';

// ============================================================================
// EXECUTIVE DASHBOARD — CHANNEL BREAKDOWN
// ============================================================================
// Distribution of sales by channel (toko/gofood/grab/shopee/tiktok).
// Data comes pre-aggregated from /api/dashboard/multi-outlet so it respects
// the period + outlet filter automatically.
// ============================================================================

import { ShoppingBag, Bike, Utensils, Music, Store } from 'lucide-react';
import { formatRupiah, formatPercent } from '@/lib/utils/format';

const CHANNEL_META: Record<string, { label: string; icon: any; color: string; text: string }> = {
  toko: { label: 'Toko', icon: Store, color: 'bg-orange-500', text: 'text-orange-600' },
  gofood: { label: 'GoFood', icon: Bike, color: 'bg-emerald-500', text: 'text-emerald-600' },
  grabfood: { label: 'GrabFood', icon: Utensils, color: 'bg-green-600', text: 'text-green-700' },
  shopee: { label: 'ShopeeFood', icon: ShoppingBag, color: 'bg-rose-500', text: 'text-rose-600' },
  tiktok: { label: 'TikTok', icon: Music, color: 'bg-gray-900', text: 'text-gray-900' },
};

interface Props {
  channels: Record<string, { omzet: number; transactions: number }>;
  loading?: boolean;
}

export function ChannelBreakdown({ channels, loading }: Props) {
  const grand = Object.values(channels).reduce((a, b) => a + b.omzet, 0);
  const totalTrx = Object.values(channels).reduce((a, b) => a + b.transactions, 0);

  const entries = Object.entries(channels)
    .map(([ch, val]) => ({
      ch,
      omzet: val.omzet,
      transactions: val.transactions,
      pct: grand > 0 ? (val.omzet / grand) * 100 : 0,
      meta: CHANNEL_META[ch] || {
        label: ch,
        icon: Store,
        color: 'bg-gray-400',
        text: 'text-gray-600',
      },
    }))
    .sort((a, b) => b.omzet - a.omzet);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Penjualan per Channel</h3>
          <p className="text-[11px] text-gray-500">Distribusi omzet · {totalTrx} transaksi</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Total</p>
          <p className="text-sm font-black text-gray-900 tabular-nums">{formatRupiah(grand)}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-7 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-6">Belum ada penjualan.</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => {
            const Icon = e.meta.icon;
            return (
              <li key={e.ch}>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`w-7 h-7 rounded-md ${e.meta.color} text-white flex items-center justify-center shrink-0`}
                  >
                    <Icon size={12} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 flex-1">
                    {e.meta.label}
                    <span className="text-gray-400 font-normal ml-1.5">
                      · {e.transactions} trx
                    </span>
                  </span>
                  <span className="text-xs font-black text-gray-900 tabular-nums">
                    {formatRupiah(e.omzet)}
                  </span>
                  <span className="text-[10px] text-gray-500 tabular-nums w-10 text-right">
                    {formatPercent(e.pct)}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-9">
                  <div
                    className={`h-full ${e.meta.color} transition-all duration-500`}
                    style={{ width: `${Math.min(e.pct, 100)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
