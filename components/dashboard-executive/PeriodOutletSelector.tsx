'use client';

// ============================================================================
// PERIOD + OUTLET SELECTOR
// ============================================================================
// - Quick presets: Hari ini, Kemarin, 7 hari, 30 hari, Bulan ini, Custom
// - Outlet picker: All outlets + each individual outlet
// ============================================================================

import { useEffect, useState } from 'react';
import { Calendar, Check, ChevronDown, Store, Layers } from 'lucide-react';
import { getTodayWIB, getStartOfMonth, getEndOfMonth } from '@/lib/utils/timezone';

export type PeriodPreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'month' | 'custom';

export interface PeriodValue {
  preset: PeriodPreset;
  startDate: string;
  endDate: string;
}

export interface OutletOption {
  id: string;
  nama: string;
}

interface Props {
  value: PeriodValue;
  onChange: (v: PeriodValue) => void;
  outlets: OutletOption[];
  outletId: string | null;
  onOutletChange: (outletId: string | null) => void;
  loadingOutlets?: boolean;
}

const PRESET_LABELS: Record<PeriodPreset, string> = {
  today: 'Hari ini',
  yesterday: 'Kemarin',
  last7: '7 hari',
  last30: '30 hari',
  month: 'Bulan ini',
  custom: 'Custom',
};

export function buildPeriodFromPreset(preset: PeriodPreset): PeriodValue {
  const today = getTodayWIB();
  const d = new Date(today + 'T00:00:00');

  switch (preset) {
    case 'today':
      return { preset, startDate: today, endDate: today };
    case 'yesterday': {
      d.setDate(d.getDate() - 1);
      const y = d.toISOString().slice(0, 10);
      return { preset, startDate: y, endDate: y };
    }
    case 'last7': {
      const start = new Date(d);
      start.setDate(d.getDate() - 6);
      return {
        preset,
        startDate: start.toISOString().slice(0, 10),
        endDate: today,
      };
    }
    case 'last30': {
      const start = new Date(d);
      start.setDate(d.getDate() - 29);
      return {
        preset,
        startDate: start.toISOString().slice(0, 10),
        endDate: today,
      };
    }
    case 'month':
      return {
        preset,
        startDate: getStartOfMonth(),
        endDate: getEndOfMonth(),
      };
    case 'custom':
    default:
      return { preset: 'custom', startDate: today, endDate: today };
  }
}

export function PeriodOutletSelector({
  value,
  onChange,
  outlets,
  outletId,
  onOutletChange,
  loadingOutlets,
}: Props) {
  const [openCustom, setOpenCustom] = useState(value.preset === 'custom');
  const [openOutlet, setOpenOutlet] = useState(false);

  useEffect(() => {
    if (value.preset === 'custom') setOpenCustom(true);
  }, [value.preset]);

  const handlePreset = (preset: PeriodPreset) => {
    setOpenCustom(preset === 'custom');
    if (preset === 'custom') {
      onChange({ ...value, preset });
    } else {
      onChange(buildPeriodFromPreset(preset));
    }
  };

  const selectedOutlet = outlets.find((o) => o.id === outletId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Period preset pills */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-gray-200 bg-white shadow-sm">
          {(Object.keys(PRESET_LABELS) as PeriodPreset[]).map((preset) => {
            const active = value.preset === preset;
            return (
              <button
                key={preset}
                onClick={() => handlePreset(preset)}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  active
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {PRESET_LABELS[preset]}
              </button>
            );
          })}
        </div>

        {/* Outlet picker */}
        <div className="relative">
          <button
            onClick={() => setOpenOutlet((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            {outletId ? <Store size={14} /> : <Layers size={14} />}
            <span className="max-w-[160px] truncate">
              {outletId ? selectedOutlet?.nama || 'Outlet' : 'Semua Outlet'}
            </span>
            <ChevronDown size={12} className={`transition-transform ${openOutlet ? 'rotate-180' : ''}`} />
          </button>
          {openOutlet && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setOpenOutlet(false)} />
              <div className="absolute left-0 mt-1 z-40 w-64 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                <button
                  onClick={() => {
                    onOutletChange(null);
                    setOpenOutlet(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 ${
                    !outletId ? 'bg-orange-50 text-orange-700 font-bold' : 'text-gray-700'
                  }`}
                >
                  <Layers size={14} />
                  <span className="flex-1 text-left">Semua Outlet</span>
                  {!outletId && <Check size={14} />}
                </button>
                <div className="max-h-64 overflow-y-auto border-t border-gray-100">
                  {loadingOutlets ? (
                    <div className="p-3 text-xs text-gray-500">Memuat outlet…</div>
                  ) : outlets.length === 0 ? (
                    <div className="p-3 text-xs text-gray-500">Tidak ada outlet</div>
                  ) : (
                    outlets.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => {
                          onOutletChange(o.id);
                          setOpenOutlet(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-gray-50 ${
                          outletId === o.id
                            ? 'bg-orange-50 text-orange-700 font-bold'
                            : 'text-gray-700'
                        }`}
                      >
                        <Store size={14} />
                        <span className="flex-1 text-left truncate">{o.nama}</span>
                        {outletId === o.id && <Check size={14} />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Custom date inputs */}
      {openCustom && (
        <div className="inline-flex flex-wrap items-center gap-2 p-2 rounded-xl border border-gray-200 bg-white shadow-sm">
          <Calendar size={14} className="text-gray-400 ml-1" />
          <input
            type="date"
            value={value.startDate}
            onChange={(e) =>
              onChange({ ...value, preset: 'custom', startDate: e.target.value })
            }
            className="text-sm font-medium text-gray-700 bg-transparent outline-none tabular-nums"
          />
          <span className="text-gray-400 text-xs">s.d.</span>
          <input
            type="date"
            value={value.endDate}
            max={getTodayWIB()}
            onChange={(e) =>
              onChange({ ...value, preset: 'custom', endDate: e.target.value })
            }
            className="text-sm font-medium text-gray-700 bg-transparent outline-none tabular-nums"
          />
        </div>
      )}
    </div>
  );
}
