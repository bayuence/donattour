'use client';

import * as Icons from 'lucide-react';
import type { MenuPanelProps } from '../../types';
import PilihPaket from './PilihPaket';
import PilihJenis from './PilihJenis';
import PilihRasa from './PilihRasa';
import Tulisan from './Tulisan';
import Tambahan from './Tambahan';

export default function CustomSection(props: MenuPanelProps) {
  const { customStep } = props;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden animate-in fade-in">
      {/* Progress Header */}
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
            <Icons.Box size={20} className="text-white" />
          </div>
          <h2 className="text-white font-bold text-lg">Custom Order</h2>
        </div>
        <div className="flex gap-1.5">
          {['pilih-paket', 'pilih-jenis', 'pilih-rasa', 'tulisan', 'tambahan'].map((s, idx) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full transition-all ${
                  customStep === s ? 'bg-white scale-125' : 'bg-slate-700'
                }`}
              />
              {idx < 4 && <div className="w-3 h-px bg-slate-700"></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 lg:p-8">
        {customStep === 'pilih-paket' && <PilihPaket {...props} />}
        {customStep === 'pilih-jenis' && <PilihJenis {...props} />}
        {customStep === 'pilih-rasa' && <PilihRasa {...props} />}
        {customStep === 'tulisan' && <Tulisan {...props} />}
        {customStep === 'tambahan' && <Tambahan {...props} />}
      </div>
    </div>
  );
}
