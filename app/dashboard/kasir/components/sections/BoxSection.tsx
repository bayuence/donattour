'use client';

import * as Icons from 'lucide-react';
import type { MenuPanelProps } from '../types';

export default function BoxSection(props: MenuPanelProps) {
  const { boxList, formatRp, tambahManualBox } = props;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 zoom-in-95 duration-300">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
        {boxList.map(bx => (
          <button
            key={bx.id}
            onClick={() => tambahManualBox(bx)}
            className="group bg-white p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all text-left"
          >
            <div className="p-2 w-10 h-10 rounded-xl bg-blue-50 text-blue-600 mb-3 group-hover:bg-blue-500 group-hover:text-white transition-all flex items-center justify-center">
              <Icons.Box size={20} />
            </div>
            <h3 className="text-sm font-black text-slate-800 mb-1">{bx.nama}</h3>
            <p className="text-xs text-slate-500 mb-2">Kapasitas: {bx.kapasitas}</p>
            <p className="text-base font-black text-blue-600">{formatRp(bx.harga_box)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
