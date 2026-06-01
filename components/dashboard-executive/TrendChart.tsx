'use client';

// ============================================================================
// EXECUTIVE DASHBOARD — TREND CHART
// ============================================================================
// Lightweight SVG line chart (no recharts dependency to keep bundle small).
// Displays omzet, transactions, expenses across the selected period.
// ============================================================================

import { useMemo, useState } from 'react';
import { formatRupiah, formatNumber, formatCompact } from '@/lib/utils/format';

export interface TrendPoint {
  date: string;
  omzet: number;
  transactions: number;
  expenses: number;
}

interface Props {
  data: TrendPoint[];
  loading?: boolean;
}

type Series = 'omzet' | 'transactions' | 'expenses';

const SERIES_META: Record<Series, { label: string; color: string; stroke: string }> = {
  omzet: { label: 'Omzet', color: 'bg-emerald-500', stroke: '#10b981' },
  transactions: { label: 'Transaksi', color: 'bg-indigo-500', stroke: '#6366f1' },
  expenses: { label: 'Pengeluaran', color: 'bg-rose-500', stroke: '#f43f5e' },
};

export function TrendChart({ data, loading }: Props) {
  const [active, setActive] = useState<Series>('omzet');
  const [hovered, setHovered] = useState<number | null>(null);

  const { points, max, min } = useMemo(() => {
    if (data.length === 0) return { points: [] as number[], max: 0, min: 0 };
    const series = data.map((p) => p[active]);
    const max = Math.max(...series, 1);
    const min = 0;
    return { points: series, max, min };
  }, [data, active]);

  const W = 700;
  const H = 180;
  const PAD_X = 24;
  const PAD_Y = 16;

  const xStep = data.length > 1 ? (W - 2 * PAD_X) / (data.length - 1) : 0;
  const scaleY = (v: number) =>
    H - PAD_Y - ((v - min) / Math.max(max - min, 1)) * (H - 2 * PAD_Y);

  const path = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${PAD_X + i * xStep} ${scaleY(v)}`)
    .join(' ');

  const areaPath =
    points.length > 1
      ? `${path} L ${PAD_X + (points.length - 1) * xStep} ${H - PAD_Y} L ${PAD_X} ${H - PAD_Y} Z`
      : '';

  const total = data.reduce((sum, p) => sum + p[active], 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Tren Performa</h3>
          <p className="text-[11px] text-gray-500">
            {data.length === 0
              ? 'Tidak ada data'
              : `${data.length} hari · Total ${active === 'transactions' ? formatNumber(total) : formatRupiah(total)}`}
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-lg border border-gray-200 bg-gray-50">
          {(Object.keys(SERIES_META) as Series[]).map((s) => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                active === s ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className={`inline-block w-2 h-2 rounded-full mr-1 ${SERIES_META[s].color}`} />
              {SERIES_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {loading && data.length === 0 ? (
        <div className="h-[180px] bg-gray-50 rounded-lg animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">
          Belum ada data pada periode ini
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-[180px]"
            onMouseLeave={() => setHovered(null)}
          >
            {/* gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((p) => (
              <line
                key={p}
                x1={PAD_X}
                x2={W - PAD_X}
                y1={PAD_Y + (H - 2 * PAD_Y) * p}
                y2={PAD_Y + (H - 2 * PAD_Y) * p}
                stroke="#e5e7eb"
                strokeDasharray="2 4"
              />
            ))}

            {/* area */}
            {areaPath && (
              <path
                d={areaPath}
                fill={SERIES_META[active].stroke}
                opacity={0.08}
              />
            )}

            {/* line */}
            <path
              d={path}
              fill="none"
              stroke={SERIES_META[active].stroke}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* points + hover targets */}
            {points.map((v, i) => {
              const cx = PAD_X + i * xStep;
              const cy = scaleY(v);
              const isHover = hovered === i;
              return (
                <g key={i}>
                  {/* invisible hit area */}
                  <rect
                    x={cx - xStep / 2}
                    y={0}
                    width={xStep}
                    height={H}
                    fill="transparent"
                    onMouseEnter={() => setHovered(i)}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHover ? 4 : 2.5}
                    fill="white"
                    stroke={SERIES_META[active].stroke}
                    strokeWidth={2}
                  />
                </g>
              );
            })}
          </svg>

          {/* tooltip */}
          {hovered !== null && data[hovered] && (
            <div
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-semibold whitespace-nowrap shadow-lg"
              style={{
                left: `${((PAD_X + hovered * xStep) / W) * 100}%`,
                top: `${(scaleY(points[hovered]) / H) * 100}%`,
              }}
            >
              <div className="text-gray-300 text-[10px]">
                {formatDayLabel(data[hovered].date)}
              </div>
              <div>
                {SERIES_META[active].label}:{' '}
                {active === 'transactions'
                  ? formatNumber(data[hovered][active])
                  : formatRupiah(data[hovered][active])}
              </div>
            </div>
          )}

          {/* x-axis labels */}
          <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
            <span>{formatDayLabel(data[0].date)}</span>
            {data.length > 2 && (
              <span>{formatDayLabel(data[Math.floor(data.length / 2)].date)}</span>
            )}
            <span>{formatDayLabel(data[data.length - 1].date)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}
