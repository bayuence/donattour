'use client';

import * as Icons from 'lucide-react';
import type { CustomModePricing } from '@/lib/types';

interface Props {
  mode: CustomModePricing;
  isExpanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onDelete: () => void;
  formatRp: (n: number) => string;
  formatPercent: (n: number) => string;
}

export function ModeCard({
  mode,
  isExpanded,
  onToggle,
  onExpand,
  onDelete,
  formatRp,
  formatPercent,
}: Props) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
          <Icons.Package size={18} className="text-slate-700" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-slate-900">{mode.mode_label}</h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-slate-500">
              Harga: <span className="font-semibold text-slate-700">{formatRp(mode.harga_jual)}</span>
            </span>
            {mode.margin_percent > 0 && (
              <span className="text-xs text-green-600 font-semibold">
                Margin: {formatPercent(mode.margin_percent)}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            mode.is_enabled ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
          }`}
        >
          {mode.is_enabled ? 'Aktif' : 'Nonaktif'}
        </button>
        <button
          type="button"
          onClick={onExpand}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          {isExpanded ? <Icons.ChevronUp size={18} /> : <Icons.ChevronDown size={18} />}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
        >
          <Icons.Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
