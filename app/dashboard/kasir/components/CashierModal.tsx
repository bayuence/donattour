'use client';

import * as Icons from 'lucide-react';
import type { User } from '@/lib/types';

interface Props {
  cashierList: User[];
  onSelect: (u: User) => void;
  onClose: () => void;
}

export default function CashierModal({ cashierList, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-8 relative overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full blur-3xl -mr-16 -mt-16" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black text-slate-800">Pilih Kasir</h2>
              <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">Siapa yang bertugas?</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
              <Icons.X size={20} />
            </button>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
            {cashierList.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                <Icons.UserX className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Tidak ada karyawan</p>
              </div>
            ) : (
              cashierList.map((u) => {
                const initial = u.name.charAt(0).toUpperCase();
                return (
                  <button
                    key={u.id}
                    onClick={() => onSelect(u)}
                    className="w-full group flex items-center gap-4 p-4 rounded-3xl bg-slate-50 hover:bg-amber-50 border-2 border-transparent hover:border-amber-100 transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-lg font-black text-slate-400 group-hover:text-amber-500 group-hover:shadow-amber-200/50 transition-all">
                      {initial}
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-slate-700 group-hover:text-amber-700 transition-colors">{u.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">@{u.username}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-200 group-hover:text-amber-400 transition-colors">
                      <Icons.ChevronRight size={16} strokeWidth={3} />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-8 text-center bg-amber-50/50 p-4 rounded-[28px] border border-amber-100/50">
            <p className="text-[10px] text-amber-600 font-bold leading-relaxed">
              Pastikan Anda menggunakan akun masing-masing untuk akurasi laporan transaksi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
