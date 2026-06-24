'use client';

// ============================================================================
// EXECUTIVE DASHBOARD — OUTLET PERFORMANCE GRID
// ============================================================================
// Per-outlet card showing realtime KPI for the selected period.
// Includes quick comparison bar (% of best performer).
// ============================================================================

import { MapPin, Users, AlertTriangle, ArrowUpRight, Wallet } from 'lucide-react';
import { formatRupiah, formatNumber, formatPercent, formatCompact } from '@/lib/utils/format';
import type { OutletRow } from './useMultiOutletData';

interface Props {
  outlets: OutletRow[];
  loading?: boolean;
  onSelectOutlet?: (outletId: string) => void;
  scopedOutletId?: string | null;
}

const STATUS_LABELS: Record<OutletRow['status'], { label: string; cls: string }> = {
  top: { label: '🔥 Top', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  aktif: { label: 'Aktif', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  perhatian: { label: 'Perhatian', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
  tidur: { label: 'Belum aktif', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export function OutletPerformanceGrid({
  outlets,
  loading,
  onSelectOutlet,
  scopedOutletId,
}: Props) {
  if (loading && outlets.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 bg-white p-4 h-44 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (outlets.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-sm text-gray-500">Belum ada outlet aktif.</p>
      </div>
    );
  }

  const maxOmzet = Math.max(...outlets.map((o) => o.omzet), 1);
  const decorated = outlets.map((o, idx) => ({
    ...o,
    status: idx === 0 && o.omzet > 0 && !scopedOutletId ? 'top' : o.status,
  })) as OutletRow[];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {decorated.map((o) => (
        <button
          key={o.outlet_id}
          onClick={() => onSelectOutlet?.(o.outlet_id)}
          className="group text-left rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white shrink-0">
                <MapPin size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{o.nama}</p>
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Users size={10} />
                  {o.active_kasir_count} kasir
                  {o.last_order_at && ` · last ${timeAgo(o.last_order_at)}`}
                </p>
              </div>
            </div>
            <span
              className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_LABELS[o.status].cls}`}
            >
              {STATUS_LABELS[o.status].label}
            </span>
          </div>

          {/* Big numbers */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
                Omzet
              </p>
              <p className="text-lg sm:text-xl font-black text-gray-900 tabular-nums">
                {formatCompact(o.omzet)}
              </p>
              {/* comparison bar (vs best) */}
              <div className="h-1 bg-gray-100 rounded mt-1 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-rose-500"
                  style={{ width: `${(o.omzet / maxOmzet) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">
                Transaksi
              </p>
              <p className="text-lg sm:text-xl font-black text-gray-900 tabular-nums">
                {formatNumber(o.transactions)}
              </p>
              <p className="text-[10px] text-gray-500">
                Avg {formatCompact(o.avg_trx)}
              </p>
            </div>
          </div>

          {/* Mini production bars */}
          <div className="space-y-1.5 mb-3">
            <Bar
              label="Berhasil"
              value={o.success}
              total={o.target}
              percent={o.success_rate}
              color="emerald"
            />
            <Bar
              label="Terjual"
              value={o.sold}
              total={o.success}
              percent={o.success > 0 ? Math.min((o.sold / o.success) * 100, 100) : 0}
              color="sky"
            />
            <Bar
              label="Waste"
              value={o.waste}
              total={o.target}
              percent={o.waste_rate}
              color="rose"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-[11px]">
            <div className="flex items-center gap-3">
              <span
                className={`font-bold ${
                  o.margin >= 25
                    ? 'text-emerald-600'
                    : o.margin >= 10
                      ? 'text-amber-600'
                      : 'text-rose-600'
                }`}
              >
                Margin {formatPercent(o.margin)}
              </span>
              {o.expenses > 0 && (
                <span className="text-gray-500 inline-flex items-center gap-1">
                  <Wallet size={10} />
                  {formatCompact(o.expenses)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {o.low_stock_count > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                  <AlertTriangle size={10} />
                  {o.low_stock_count}
                </span>
              )}
              <ArrowUpRight
                size={14}
                className="text-gray-300 group-hover:text-orange-500 transition-colors"
              />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function Bar({
  label,
  value,
  total,
  percent,
  color,
}: {
  label: string;
  value: number;
  total: number;
  percent: number;
  color: 'emerald' | 'sky' | 'rose';
}) {
  const colorMap = {
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    rose: 'bg-rose-500',
  };
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-0.5">
        <span className="text-gray-500 font-semibold">{label}</span>
        <span className="text-gray-700 tabular-nums">
          {formatNumber(value)}/{formatNumber(total)} · {formatPercent(percent)}
        </span>
      </div>
      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorMap[color]} transition-all duration-500`}
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.round((now - then) / 1000));
  if (diff < 60) return `${diff}d`;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}j`;
  return `${Math.round(diff / 86400)}h`;
}
