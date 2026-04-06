'use client';

import * as Icons from 'lucide-react';
import type { Outlet } from '@/lib/types';

interface Props {
  outletList: Outlet[];
  onSelect: (o: Outlet) => void;
}

export default function OutletPicker({ outletList, onSelect }: Props) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-500/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md bg-white/70 backdrop-blur-3xl rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-10 border border-white relative z-10">
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-[32px] flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-amber-500/20 rotate-3 transition-transform hover:rotate-0">
            <Icons.Store size={48} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Pilih Outlet</h1>
          <p className="text-slate-500 font-medium mt-3 text-sm">Selamat datang! Pilih tempat bertugas Anda hari ini.</p>
        </div>

        <div className="space-y-4">
          {outletList.map((o) => (
            <button key={o.id} onClick={() => onSelect(o)}
              className="w-full group flex items-center gap-5 p-5 rounded-[28px] bg-white/40 hover:bg-white border-2 border-transparent hover:border-amber-100 transition-all text-left shadow-sm hover:shadow-xl hover:shadow-slate-200/50 active:scale-[0.98]">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-amber-500 shadow-md group-hover:shadow-amber-200/50 transition-all shrink-0">
                <Icons.MapPin size={28} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 text-lg leading-none mb-1.5 group-hover:text-amber-600 transition-colors">{o.nama}</p>
                <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed opacity-70">{o.alamat}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-amber-100 group-hover:text-amber-600 transition-all">
                <Icons.ChevronRight size={18} strokeWidth={3} />
              </div>
            </button>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100/50 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">Donattour System v2.0</p>
        </div>
      </div>
    </div>
  );
}
