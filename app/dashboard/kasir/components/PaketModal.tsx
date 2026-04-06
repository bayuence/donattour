'use client';

import * as Icons from 'lucide-react';
import type { ProductPackage, ProductWithCategory } from '@/lib/types';

interface Props {
  paket: ProductPackage;
  paketIsi: string[];
  setPaketIsi: (v: string[]) => void;
  products: ProductWithCategory[];
  onConfirm: () => void;
  onClose: () => void;
  formatRp: (n: number) => string;
}

export default function PaketModal({ paket, paketIsi, setPaketIsi, products, onConfirm, onClose, formatRp }: Props) {
  const donatVarian = products.filter(v => v.tipe_produk === 'donat_varian');
  const filled = paketIsi.filter(x => x).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 flex items-center justify-between">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-1">
              <Icons.Box size={20} />
              <h3 className="font-black text-lg">{paket.nama}</h3>
            </div>
            <p className="text-[10px] uppercase font-bold opacity-80">Pilih {paket.kapasitas} varian donat</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white font-black text-2xl">{formatRp(paket.harga_paket)}</span>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all">
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 flex gap-6">
          {/* Varian List */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pilih Varian</p>
              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">{filled}/{paket.kapasitas} dipilih</span>
            </div>
            <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[300px] pr-1">
              {donatVarian.map(v => (
                <button key={v.id} onClick={() => {
                  const next = paketIsi.findIndex(x => !x);
                  if (next !== -1) { const n = [...paketIsi]; n[next] = v.nama; setPaketIsi(n); }
                }}
                  disabled={filled >= paket.kapasitas}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-amber-400 hover:bg-amber-50 text-[10px] font-bold text-slate-800 transition-all text-center disabled:opacity-40 disabled:cursor-not-allowed">
                  {v.nama}
                </button>
              ))}
            </div>
          </div>

          {/* Isi Box Preview */}
          <div className="w-48 shrink-0">
            <p className="text-[10px] font-black uppercase text-slate-400 text-center mb-4">Preview Box</p>
            <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-2xl p-4 border">
              {paketIsi.map((v, i) => (
                <button key={i} onClick={() => { if (v) { const n = [...paketIsi]; n[i] = ''; setPaketIsi(n); } }}
                  className={`aspect-square rounded-xl border-2 flex items-center justify-center transition-all ${v ? 'bg-amber-400 border-amber-500 text-white hover:bg-rose-400 hover:border-rose-500' : 'bg-white border-slate-200'}`}
                  title={v || `Slot ${i + 1}`}>
                  {v ? <Icons.Check size={14} /> : <span className="text-[9px] text-slate-300 font-bold">{i + 1}</span>}
                </button>
              ))}
            </div>
            {filled > 0 && (
              <button onClick={() => setPaketIsi(Array(paket.kapasitas).fill(''))} className="w-full mt-2 text-[9px] font-bold text-slate-400 hover:text-rose-500 transition-colors">
                Reset Semua
              </button>
            )}
            <button
              disabled={filled < paket.kapasitas}
              onClick={onConfirm}
              className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-25">
              Tambah ke Keranjang
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
