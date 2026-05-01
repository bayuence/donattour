'use client';

import * as Icons from 'lucide-react';
import type { MenuPanelProps } from '../types';

export default function BundlingSection(props: MenuPanelProps) {
  const { bundlingList, formatRp, tambahBundling } = props;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in">
      {bundlingList.map(b => (
        <button
          key={b.id}
          onClick={() => tambahBundling(b)}
          className="group bg-white p-5 rounded-3xl border border-slate-100 hover:border-emerald-200 hover:shadow-2xl transition-all text-left"
        >
          <div className="p-2 w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 mb-3 group-hover:bg-emerald-500 group-hover:text-white transition-all flex items-center justify-center">
            <Icons.Gift size={20} />
          </div>
          <h3 className="text-sm font-black text-slate-800 mb-1">{b.nama}</h3>
          {b.harga_normal && (
            <p className="text-xs text-slate-400 line-through">{formatRp(b.harga_normal)}</p>
          )}
          <p className="text-lg font-black text-emerald-600">{formatRp(b.harga_bundling)}</p>
        </button>
      ))}
    </div>
  );
}
