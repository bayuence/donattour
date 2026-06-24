'use client';

// ============================================================================
// EXECUTIVE DASHBOARD (OWNER VIEW)
// ============================================================================
// Multi-outlet realtime command center.
//
// Top-level controls:
// - Period selector (today / yesterday / 7d / 30d / month / custom)
// - Outlet selector (All outlets / per outlet)
//
// Sections:
// - KPI strip (omzet, transactions, avg trx, gross profit, expenses, margin)
// - Trend chart (omzet / transactions / expenses across the period)
// - Performance grid per outlet (with comparison bars)
// - Live transaction feed (Supabase Realtime)
// - Alerts panel
// - Channel breakdown (toko / gofood / grab / shopee / tiktok)
// - Production / sales summary
// - Top selling products (legacy widget)
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Sparkles, Activity, BarChart3 } from 'lucide-react';
import { useAuth } from '@/lib/context/auth-context';
import { supabase } from '@/lib/supabase/client';
import { getTodayWIB } from '@/lib/utils/timezone';
import { formatDateLong, formatNumber, formatPercent } from '@/lib/utils/format';

import { KpiStrip } from '@/components/dashboard-executive/KpiStrip';
import { OutletPerformanceGrid } from '@/components/dashboard-executive/OutletPerformanceGrid';
import { AlertsPanel } from '@/components/dashboard-executive/AlertsPanel';
import { ChannelBreakdown } from '@/components/dashboard-executive/ChannelBreakdown';
import { LiveTransactionFeed } from '@/components/dashboard-executive/LiveTransactionFeed';
import { TrendChart } from '@/components/dashboard-executive/TrendChart';
import {
  PeriodOutletSelector,
  buildPeriodFromPreset,
  type PeriodValue,
  type OutletOption,
} from '@/components/dashboard-executive/PeriodOutletSelector';
import { useMultiOutletData } from '@/components/dashboard-executive/useMultiOutletData';
import { ProductSalesTable } from '@/components/dashboard-executive/ProductSalesTable';

const ROLE_REDIRECT: Record<string, string> = {
  kasir: '/dashboard/kasir',
  bagian_dapur: '/dashboard/input-produksi',
  closing_staff: '/dashboard/closing',
};

export default function ExecutiveDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Period state — default: today
  const [period, setPeriod] = useState<PeriodValue>(() =>
    buildPeriodFromPreset('today')
  );
  const [outletId, setOutletId] = useState<string | null>(null);
  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [loadingOutlets, setLoadingOutlets] = useState(false);

  // Role guard
  useEffect(() => {
    const redirect = user?.role && ROLE_REDIRECT[user.role];
    if (redirect) router.replace(redirect);
  }, [user?.role, router]);

  // Fetch outlet list once
  useEffect(() => {
    let cancelled = false;
    setLoadingOutlets(true);
    (supabase as any)
      .from('outlets')
      .select('id, nama')
      .eq('is_active', true)
      .order('nama')
      .then(({ data, error }: any) => {
        if (cancelled) return;
        if (!error && Array.isArray(data)) {
          setOutlets(data as OutletOption[]);
        }
        setLoadingOutlets(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch dashboard data
  const { data, loading, error, isLive, refresh, lastRefreshedAt } = useMultiOutletData({
    startDate: period.startDate,
    endDate: period.endDate,
    outletId,
  });

  const isToday = period.startDate === getTodayWIB() && period.endDate === getTodayWIB();
  const rangeLabel = useMemo(() => {
    if (period.preset === 'today') return 'Hari ini';
    if (period.preset === 'yesterday') return 'Kemarin';
    if (period.preset === 'last7') return '7 hari terakhir';
    if (period.preset === 'last30') return '30 hari terakhir';
    if (period.preset === 'month') return 'Bulan ini';
    return `${period.startDate} s.d. ${period.endDate}`;
  }, [period]);

  const selectedOutletName = outletId
    ? outlets.find((o) => o.id === outletId)?.nama || 'Outlet'
    : 'Semua Outlet';

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* ───── Header ───── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 mb-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-100 to-rose-100 text-orange-700 text-[11px] font-bold uppercase tracking-wide">
              <Sparkles size={12} />
              Executive Suite
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Dashboard Owner</h1>
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-700">{selectedOutletName}</span>
              {' · '}
              {rangeLabel}
              {' · '}
              {formatDateLong(period.startDate)}
              {period.startDate !== period.endDate && ` — ${formatDateLong(period.endDate)}`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:flex items-center gap-1 text-[11px] text-gray-500">
              {isLive ? (
                <>
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                  </span>
                  Real-time aktif
                </>
              ) : lastRefreshedAt ? (
                <>Update {lastRefreshedAt.toLocaleTimeString('id-ID')}</>
              ) : (
                'Memuat…'
              )}
            </span>
            <button
              onClick={refresh}
              disabled={loading}
              className="px-3 py-2 rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw
                size={14}
                className={`text-gray-600 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>

        {/* Period + Outlet selector row */}
        <PeriodOutletSelector
          value={period}
          onChange={setPeriod}
          outlets={outlets}
          outletId={outletId}
          onOutletChange={setOutletId}
          loadingOutlets={loadingOutlets}
        />
      </div>

      {/* ───── Error banner ───── */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* ───── KPI strip (6 metrics) ───── */}
      <KpiStrip
        totals={
          data?.totals ?? {
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
            gross_profit: 0,
            margin: 0,
            avg_trx: 0,
            active_outlets: 0,
          }
        }
        outletCount={data?.outlet_count ?? 0}
        isLive={isLive}
        loading={loading && !data}
        rangeLabel={rangeLabel}
      />

      {/* ───── Trend Chart ───── */}
      {(period.preset !== 'today' && period.preset !== 'yesterday') && (
        <TrendChart data={data?.trend ?? []} loading={loading && !data} />
      )}

      {/* ───── Three-column main area ───── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left column: Outlet Performance Grid */}
        <div className="xl:col-span-8 space-y-4">
          <SectionHeader
            icon={<BarChart3 size={14} />}
            title={outletId ? 'Performa Outlet' : 'Performa per Outlet'}
            sub={
              outletId
                ? selectedOutletName
                : `${data?.outlet_count ?? 0} outlet · diurutkan dari omzet tertinggi`
            }
            right={
              isLive && (
                <span className="text-[10px] font-bold text-emerald-600 inline-flex items-center gap-1">
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                  </span>
                  AUTO REFRESH
                </span>
              )
            }
          />
          <OutletPerformanceGrid
            outlets={data?.outlets ?? []}
            loading={loading && !data}
            scopedOutletId={outletId}
            onSelectOutlet={(id) => {
              setOutletId(id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          {/* Production summary */}
          {data && data.totals.target > 0 && (
            <ProductionSummary
              target={data.totals.target}
              success={data.totals.success}
              sold={data.totals.sold}
              waste={data.totals.waste}
            />
          )}
        </div>

        {/* Right column: Live Feed + Alerts + Channels */}
        <div className="xl:col-span-4 space-y-4">
          <LiveTransactionFeed 
            outletId={outletId} 
            limit={isToday ? 15 : 10} 
            startDate={period.startDate}
            endDate={period.endDate}
          />
          <AlertsPanel />
          <ChannelBreakdown
            channels={data?.channels ?? {}}
            loading={loading && !data}
          />
        </div>
      </div>

      {/* ───── Secondary widgets ───── */}
      <ProductSalesTable
        data={data?.sales_by_product ?? []}
        loading={loading}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  sub,
  right,
}: {
  icon?: React.ReactNode;
  title: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between">
      <div className="flex items-center gap-2">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          {sub && <p className="text-[11px] text-gray-500">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

function ProductionSummary({
  target,
  success,
  sold,
  waste,
}: {
  target: number;
  success: number;
  sold: number;
  waste: number;
}) {
  const remaining = Math.max(success - sold - waste, 0);
  const successRate = target > 0 ? (success / target) * 100 : 0;
  const wasteRate = target > 0 ? (waste / target) * 100 : 0;
  const soldRate = success > 0 ? (sold / success) * 100 : 0;
  const remainingRate = success > 0 ? (remaining / success) * 100 : 0;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Produksi &amp; Penjualan</h3>
          <p className="text-[11px] text-gray-500">Ringkasan input dapur vs penjualan</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Target" value={formatNumber(target)} hint="pcs" tone="gray" />
        <Stat
          label="Berhasil"
          value={formatNumber(success)}
          hint={formatPercent(successRate)}
          tone="emerald"
        />
        <Stat
          label="Terjual"
          value={formatNumber(sold)}
          hint={formatPercent(soldRate)}
          tone="sky"
        />
        <Stat
          label="Sisa"
          value={formatNumber(remaining)}
          hint={formatPercent(remainingRate)}
          tone="amber"
        />
        <Stat
          label="Waste"
          value={formatNumber(waste)}
          hint={formatPercent(wasteRate)}
          tone="rose"
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: 'gray' | 'emerald' | 'sky' | 'amber' | 'rose';
}) {
  const cls: Record<typeof tone, string> = {
    gray: 'text-gray-900',
    emerald: 'text-emerald-600',
    sky: 'text-sky-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
  } as any;
  return (
    <div className="rounded-xl bg-gray-50 p-3 text-center">
      <p className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">{label}</p>
      <p className={`text-2xl font-black tabular-nums ${cls[tone]}`}>{value}</p>
      {hint && <p className={`text-[10px] font-semibold ${cls[tone]}`}>{hint}</p>}
    </div>
  );
}


