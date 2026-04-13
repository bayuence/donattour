'use client';

import { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import type { ProductPackage, ProductWithCategory } from '@/lib/types';

type DonatItem = { productId: string; nama: string; ukuran?: string };
type ExtraItem = { productId: string; nama: string; qty: number; harga: number };

interface Props {
  paket: ProductPackage;
  paketIsi: DonatItem[];
  setPaketIsi: (v: DonatItem[]) => void;
  paketExtras: ExtraItem[];
  setPaketExtras: (v: ExtraItem[]) => void;
  products: ProductWithCategory[];
  tambahanList: ProductWithCategory[];
  selectedChannel: string;
  onConfirm: () => void;
  onClose: () => void;
  formatRp: (n: number) => string;
}

export default function PaketModal({
  paket, paketIsi, setPaketIsi, paketExtras, setPaketExtras,
  products, tambahanList, selectedChannel, onConfirm, onClose, formatRp
}: Props) {
  const [tab, setTab] = useState<'donat' | 'ekstra'>('donat');

  // Channel-specific price
  const kanalHarga = (paket.channel_prices || {})[selectedChannel] ?? paket.harga_paket;
  const diskon = (paket.diskon_nominal || 0) > 0
    ? paket.diskon_nominal
    : (paket.diskon_persen || 0) > 0
      ? Math.round(kanalHarga * paket.diskon_persen / 100)
      : 0;
  const hargaFinal = kanalHarga - diskon;

  // Filter donat by package category
  const donatVarian = useMemo(() =>
    products.filter(v =>
      v.tipe_produk === 'donat_varian' &&
      (!paket.category_id || v.category_id === paket.category_id)
    ).sort((a, b) => a.nama.localeCompare(b.nama)),
  [products, paket.category_id]);

  // Extras available for this package
  const extrasAvailable = useMemo(() =>
    tambahanList.filter(t => (paket.allowed_extras || []).includes(t.id)),
  [tambahanList, paket.allowed_extras]);

  const filled = paketIsi.length;
  const isFull = filled >= paket.kapasitas;
  const isComplete = filled >= paket.kapasitas;

  const addDonat = (v: ProductWithCategory) => {
    if (isFull) return;
    setPaketIsi([...paketIsi, { productId: v.id, nama: v.nama, ukuran: v.ukuran }]);
  };

  const removeDonat = (idx: number) => {
    const n = [...paketIsi];
    n.splice(idx, 1);
    setPaketIsi(n);
  };

  const addExtra = (t: ProductWithCategory) => {
    const existing = paketExtras.find(e => e.productId === t.id);
    if (existing) {
      setPaketExtras(paketExtras.map(e => e.productId === t.id ? { ...e, qty: e.qty + 1, harga: (e.qty + 1) * t.harga_jual } : e));
    } else {
      setPaketExtras([...paketExtras, { productId: t.id, nama: t.nama, qty: 1, harga: t.harga_jual }]);
    }
  };

  const removeExtra = (productId: string) => {
    const existing = paketExtras.find(e => e.productId === productId);
    if (!existing) return;
    if (existing.qty <= 1) {
      setPaketExtras(paketExtras.filter(e => e.productId !== productId));
    } else {
      setPaketExtras(paketExtras.map(e => e.productId === productId ? { ...e, qty: e.qty - 1, harga: (e.qty - 1) * (e.harga / e.qty) } : e));
    }
  };

  const extrasTotal = paketExtras.reduce((s, e) => s + e.harga, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-5 flex items-center justify-between shrink-0">
          <div className="text-white">
            <div className="flex items-center gap-2 mb-0.5">
              <Icons.Box size={18} />
              <h3 className="font-black text-lg leading-none">{paket.kode ? `[${paket.kode}] ` : ''}{paket.nama}</h3>
            </div>
            <p className="text-[10px] uppercase font-bold opacity-80">
              {paket.category?.nama || 'Paket'} • Pilih {paket.kapasitas} donat • {paket.box?.nama}
            </p>
            {paket.deskripsi && (
              <p className="text-[10px] opacity-70 mt-1 italic">💬 {paket.deskripsi}</p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              {diskon > 0 && (
                <p className="text-[10px] line-through opacity-60 text-white font-bold">{formatRp(kanalHarga)}</p>
              )}
              <span className="text-white font-black text-2xl">{formatRp(hargaFinal)}</span>
              {diskon > 0 && (
                <p className="text-[9px] bg-white/20 rounded px-1.5 py-0.5 text-white font-bold mt-0.5 text-center">Hemat {formatRp(diskon)}</p>
              )}
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all">
              <Icons.X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs (only if there are extras) */}
        {extrasAvailable.length > 0 && (
          <div className="flex border-b bg-slate-50 shrink-0">
            <button onClick={() => setTab('donat')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${tab === 'donat' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-slate-400'}`}>
              <Icons.Circle size={12} /> Pilih Donat <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${isFull ? 'bg-green-500 text-white' : 'bg-amber-100 text-amber-700'}`}>{filled}/{paket.kapasitas}</span>
            </button>
            <button onClick={() => setTab('ekstra')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${tab === 'ekstra' ? 'text-amber-600 border-b-2 border-amber-500 bg-white' : 'text-slate-400'}`}>
              <Icons.Plus size={12} /> Ekstra {paketExtras.length > 0 && <span className="bg-amber-500 text-white px-1.5 py-0.5 rounded-md text-[9px]">{paketExtras.length}</span>}
            </button>
          </div>
        )}

        <div className="flex gap-5 p-5 flex-1 overflow-hidden min-h-0">

          {/* Content area */}
          {(tab === 'donat' || extrasAvailable.length === 0) && (
            <>
              {/* Varian List */}
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Varian {paket.category?.nama}
                  </p>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${isFull ? 'bg-green-100 text-green-700' : 'bg-amber-50 text-amber-600'}`}>
                    {filled}/{paket.kapasitas} dipilih
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 overflow-y-auto flex-1 pr-1 content-start">
                  {donatVarian.map(v => {
                    const countInIsi = paketIsi.filter(d => d.productId === v.id).length;
                    return (
                      <button key={v.id} onClick={() => addDonat(v)}
                        disabled={isFull}
                        className={`relative p-3 border-2 rounded-xl text-[10px] font-bold text-center transition-all ${
                          countInIsi > 0
                            ? 'bg-amber-50 border-amber-400 text-amber-800'
                            : 'bg-slate-50 border-slate-100 text-slate-800 hover:border-amber-300 hover:bg-amber-50'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}>
                        {countInIsi > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 text-white rounded-full text-[8px] font-black flex items-center justify-center">
                            {countInIsi}
                          </span>
                        )}
                        <span className="leading-tight block">{v.nama}</span>
                      </button>
                    );
                  })}
                  {donatVarian.length === 0 && (
                    <p className="col-span-3 text-center text-slate-400 py-8 text-xs">Tidak ada varian tersedia</p>
                  )}
                </div>
              </div>

              {/* Preview Box */}
              <div className="w-44 shrink-0 flex flex-col">
                <p className="text-[10px] font-black uppercase text-slate-400 text-center mb-3 shrink-0">Isi Pilihan</p>
                <div className={`grid gap-1.5 bg-slate-50 rounded-2xl p-3 border flex-1 content-start ${paket.kapasitas <= 6 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                  {Array(paket.kapasitas).fill(null).map((_, i) => {
                    const item = paketIsi[i];
                    return (
                      <button key={i} onClick={() => { if (item) removeDonat(i); }}
                        title={item ? `Hapus: ${item.nama}` : `Slot ${i + 1}`}
                        className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all text-[7px] font-bold leading-tight overflow-hidden p-0.5 ${
                          item
                            ? 'bg-gradient-to-br from-amber-400 to-orange-400 border-amber-500 text-white hover:from-rose-400 hover:to-red-500 hover:border-rose-500'
                            : 'bg-white border-dashed border-slate-200'
                        }`}>
                        {item
                          ? <span className="text-center leading-tight px-0.5">{item.nama.length > 8 ? item.nama.slice(0, 7) + '…' : item.nama}</span>
                          : <span className="text-[8px] text-slate-300 font-bold">{i + 1}</span>
                        }
                      </button>
                    );
                  })}
                </div>
                {filled > 0 && (
                  <button onClick={() => setPaketIsi([])} className="mt-2 text-[9px] font-bold text-slate-400 hover:text-rose-500 transition-colors">
                    Reset Semua
                  </button>
                )}

                {/* Summary donat yang dipilih */}
                {filled > 0 && (
                  <div className="mt-2 space-y-0.5 text-[9px] text-slate-500 max-h-[80px] overflow-y-auto">
                    {Array.from(new Map(paketIsi.map(d => [d.productId, { ...d, count: paketIsi.filter(x => x.productId === d.productId).length }]))).map(([pid, d]) => (
                      <div key={pid} className="flex justify-between"><span>{d.nama}</span><span className="font-black text-slate-700">×{d.count}</span></div>
                    ))}
                  </div>
                )}

                <button
                  disabled={!isComplete}
                  onClick={extrasAvailable.length > 0 ? () => setTab('ekstra') : onConfirm}
                  className="w-full mt-3 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-25">
                  {extrasAvailable.length > 0 ? 'Lanjut →' : 'Tambah ke Keranjang'}
                </button>
              </div>
            </>
          )}

          {/* Ekstra tab */}
          {tab === 'ekstra' && extrasAvailable.length > 0 && (
            <div className="flex-1 flex flex-col gap-3">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest shrink-0">Pilih Produk Ekstra (Opsional)</p>
              <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1">
                {extrasAvailable.map(t => {
                  const ext = paketExtras.find(e => e.productId === t.id);
                  return (
                    <div key={t.id} className={`p-3 rounded-xl border-2 transition-all ${ext ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-slate-50'}`}>
                      <p className="text-[10px] font-black text-slate-800 mb-1">{t.nama}</p>
                      <p className="text-[9px] text-amber-600 font-bold mb-2">{formatRp(t.harga_jual)}</p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => removeExtra(t.id)} disabled={!ext} className="w-6 h-6 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 flex items-center justify-center font-black text-sm transition-all">−</button>
                        <span className="flex-1 text-center font-black text-sm text-slate-800">{ext?.qty || 0}</span>
                        <button onClick={() => addExtra(t)} className="w-6 h-6 bg-amber-500 rounded-lg text-white hover:bg-amber-600 flex items-center justify-center font-black text-sm transition-all">+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-3 border-t shrink-0">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold">Total Ekstra</p>
                  <p className="font-black text-amber-600">{formatRp(extrasTotal)}</p>
                </div>
                <button onClick={onConfirm} disabled={!isComplete}
                  className="py-3 px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-25">
                  Tambah ke Keranjang
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
