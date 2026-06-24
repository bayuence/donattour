'use client';

// ============================================================================
// EXECUTIVE DASHBOARD — KPI STRIP
// ============================================================================
// Six hero metrics for the selected period and outlet scope.
// ============================================================================

import {
  Coins,
  Receipt,
  TrendingUp,
  Wallet,
  PieChart,
  Hash,
} from 'lucide-react';
import { formatRupiah, formatNumber, formatPercent } from '@/lib/utils/format';
import type { Totals } from './useMultiOutletData';

interface Props {
  totals: Totals;
  outletCount: number;
  isLive: boolean;
  loading?: boolean;
  rangeLabel?: string;
}

type Accent = 'emerald' | 'indigo' | 'sky' | 'amber' | 'rose' | 'violet';

const ACCENT: Record<Accent, { dot: string; bg: string; icon: string }> = {
  emerald: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    icon: 'bg-emerald-500/10 text-emerald-700',
  },
  indigo: {
    dot: 'bg-indigo-500',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    icon: 'bg-indigo-500/10 text-indigo-700',
  },
  sky: {
    dot: 'bg-sky-500',
    bg: 'bg-sky-50 text-sky-700 border-sky-100',
    icon: 'bg-sky-500/10 text-sky-700',
  },
  amber: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 text-amber-700 border-amber-100',
    icon: 'bg-amber-500/10 text-amber-700',
  },
  rose: {
    dot: 'bg-rose-500',
    bg: 'bg-rose-50 text-rose-700 border-rose-100',
    icon: 'bg-rose-500/10 text-rose-700',
  },
  violet: {
    dot: 'bg-violet-500',
    bg: 'bg-violet-50 text-violet-700 border-violet-100',
    icon: 'bg-violet-500/10 text-violet-700',
  },
};

export function KpiStrip({ totals, outletCount, isLive, loading, rangeLabel }: Props) {
  const marginAccent: Accent =
    totals.margin >= 25 ? 'emerald' : totals.margin >= 10 ? 'amber' : 'rose';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
      <KpiCard
        label="Omzet"
        value={formatRupiah(totals.omzet)}
        sub={`${totals.active_outlets} dari ${outletCount} outlet aktif`}
        icon={Coins}
        accent="emerald"
        loading={loading}
        live={isLive}
      />
      <KpiCard
        label="Transaksi"
        value={formatNumber(totals.transactions)}
        sub={rangeLabel || 'periode ini'}
        icon={Receipt}
        accent="indigo"
        loading={loading}
      />
      <KpiCard
        label="Avg / Trx"
        value={formatRupiah(totals.avg_trx)}
        sub="rata-rata per transaksi"
        icon={Hash}
        accent="sky"
        loading={loading}
      />
      <KpiCard
        label="Gross Profit"
        value={formatRupiah(totals.gross_profit)}
        sub="omzet − HPP"
        icon={TrendingUp}
        accent="violet"
        loading={loading}
      />
      <KpiCard
        label="Pengeluaran"
        value={formatRupiah(totals.expenses)}
        sub="biaya operasional outlet"
        icon={Wallet}
        accent="amber"
        loading={loading}
      />
      <KpiCard
        label="Margin"
        value={formatPercent(totals.margin)}
        sub={
          totals.margin >= 25
            ? 'Sehat'
            : totals.margin >= 10
              ? 'Cukup'
              : 'Perlu perhatian'
        }
        icon={PieChart}
        accent={marginAccent}
        loading={loading}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  loading,
  live,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: any;
  accent: Accent;
  loading?: boolean;
  live?: boolean;
}) {
  const A = ACCENT[accent];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${A.icon}`}>
            <Icon size={14} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 truncate">
            {label}
          </span>
        </div>
        {live && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </span>
            LIVE
          </span>
        )}
      </div>
      <div className="text-xl sm:text-2xl font-black text-gray-900 tabular-nums leading-none">
        {loading ? (
          <span className="inline-block w-20 h-6 bg-gray-100 rounded animate-pulse" />
        ) : (
          value
        )}
      </div>
      {sub && <p className="text-[10px] text-gray-500 mt-1.5 truncate">{sub}</p>}
    </div>
  );
}
