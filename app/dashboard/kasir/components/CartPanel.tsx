'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { CartItem, CartSatuanItem, CartBoxItem } from '../hooks/useKasir';
import type { Product, ProductBox } from '@/lib/types';

interface Props {
  cart: CartItem[];
  grandTotal: number;
  totalBiayaEkstra: number;
  finalTotal: number;
  biayaEkstraList: Product[];
  selectedBiayaEkstra: { id: string; nama: string; harga: number }[];
  setSelectedBiayaEkstra: (v: any) => void;
  namaPelanggan: string;
  setNamaPelanggan: (v: string) => void;
  hapusItem: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  onBayar: () => void;
  formatRp: (n: number) => string;
  automatedBoxes: { box: ProductBox; qty: number; target: string; used: number; totalCapacity: number }[];
  automatedBoxTotal: number;
}

export default function CartPanel({
  cart, grandTotal, totalBiayaEkstra, finalTotal,
  biayaEkstraList, selectedBiayaEkstra, setSelectedBiayaEkstra,
  namaPelanggan, setNamaPelanggan, hapusItem, updateQty, onBayar, formatRp,
  automatedBoxes, automatedBoxTotal
}: Props) {

  const getItemLabel = (item: CartItem) => {
    if (item.type === 'satuan') return item.nama;
    if (item.type === 'paket') return item.namaPaket;
    if (item.type === 'bundling') return item.nama;
    if (item.type === 'box') return item.nama;
    return item.namaPaket;
  };

  const getItemTotal = (item: CartItem) => {
    if (item.type === 'satuan') return item.harga * item.qty;
    if (item.type === 'paket') return item.hargaPaket;
    if (item.type === 'bundling') return item.harga;
    if (item.type === 'box') return item.harga * item.qty;
    return item.totalHarga;
  };

  const [promptEkstra, setPromptEkstra] = useState<Product | null>(null);
  const [promptNominal, setPromptNominal] = useState('');
  const [showBiayaModal, setShowBiayaModal] = useState(false);

  const toggleEkstra = (b: Product) => {
    const isSelected = selectedBiayaEkstra.some(s => s.id === b.id);
    if (isSelected) {
      setSelectedBiayaEkstra((prev: any[]) => prev.filter(s => s.id !== b.id));
    } else {
      if (b.harga_jual === 0) {
        setPromptEkstra(b);
        setPromptNominal('');
      } else {
        setSelectedBiayaEkstra((prev: any[]) => [...prev, { id: b.id, nama: b.nama, harga: b.harga_jual }]);
      }
    }
  };

  const handleConfirmEkstra = () => {
    if (promptEkstra) {
      const nominal = parseInt(promptNominal.replace(/[^0-9]/g, '')) || 0;
      if (nominal > 0) {
        setSelectedBiayaEkstra((prev: any[]) => [...prev, { id: promptEkstra.id, nama: promptEkstra.nama, harga: nominal }]);
      }
      setPromptEkstra(null);
      setPromptNominal('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-100">
      {/* Header Cart */}
      <div className="pl-10 pr-5 py-4 border-b bg-slate-50 shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <Icons.ShoppingBag size={18} className="text-slate-700" />
          <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm">Keranjang</h2>
          {cart.length > 0 && (
            <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{cart.length}</span>
          )}
        </div>
        {/* Nama Pelanggan */}
        <div className="relative">
          <Icons.User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={namaPelanggan}
            onChange={e => setNamaPelanggan(e.target.value)}
            placeholder="Nama pelanggan (opsional)"
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-amber-400 focus:outline-none transition-all placeholder:text-slate-300"
          />
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-200 py-16">
            <Icons.ShoppingBasket size={48} className="mb-3 opacity-30" />
            <p className="text-xs font-bold uppercase tracking-widest opacity-40">Keranjang Kosong</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {cart.map(item => (
              <div key={item.id} className="group relative bg-white border border-slate-100 hover:border-amber-200 hover:bg-slate-50 rounded-xl p-2 transition-all flex items-center justify-between gap-2 overflow-hidden">
                
                {/* Bagian Kiri: Qty Control & Nama */}
                <div className="flex flex-1 items-center gap-3 min-w-0">
                  
                  {/* QTY Control Khusus Satuan & Box */}
                  {(item.type === 'satuan' || item.type === 'box') ? (
                    <div className="flex items-center flex-col shrink-0 bg-slate-100 rounded-lg overflow-hidden">
                      <button onClick={() => updateQty(item.id, 1)} className="w-6 h-5 flex items-center justify-center text-slate-500 hover:bg-amber-100 hover:text-amber-600 transition-colors"><Icons.ChevronUp size={12} strokeWidth={3} /></button>
                      <span className="text-[10px] font-black w-6 text-center text-slate-800 leading-none py-0.5">{(item as CartSatuanItem | CartBoxItem).qty}</span>
                      <button onClick={() => updateQty(item.id, -1)} className="w-6 h-5 flex items-center justify-center text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"><Icons.ChevronDown size={12} strokeWidth={3} /></button>
                    </div>
                  ) : (
                    <div className="w-6 shrink-0 flex items-center justify-center">
                      <span className="text-[9px] font-black text-white bg-slate-300 w-5 h-5 rounded flex items-center justify-center leading-none">1</span>
                    </div>
                  )}

                  {/* Info Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight truncate">{getItemLabel(item)}</p>
                    
                    {/* Sub Info (Jenis / Isi Paket / Tambahan) */}
                    {(item.type === 'satuan' || item.type === 'paket' || item.type === 'custom') && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {item.type === 'satuan' && <span className="text-[8px] text-slate-400 uppercase tracking-widest">{item.jenis}</span>}
                        {item.type === 'paket' && item.isiDonat.filter(i => i).map((d: any, i: number) => (
                          <span key={i} className="text-[8px] px-1 bg-amber-50 text-amber-600 font-semibold rounded">{typeof d === 'object' ? d.nama : d}</span>
                        ))}
                        {item.type === 'custom' && item.tambahan.length > 0 && (
                          <span className="text-[8px] italic text-slate-400">+{item.tambahan.map(t => t.nama).join(', ')}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bagian Kanan: Harga & Hapus */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[11px] sm:text-xs font-black text-slate-800">{formatRp(getItemTotal(item))}</span>
                  </div>
                  <button onClick={() => hapusItem(item.id)} className="w-6 h-6 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-500 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                    <Icons.X size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kemasan Otomatis (Tulisan Kecil) */}
      {automatedBoxes.length > 0 && (
        <div className="px-5 pb-2 shrink-0">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {automatedBoxes.map((a, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[9px] font-bold text-blue-600 uppercase tracking-tight">
                <Icons.Package size={10} className="shrink-0" />
                <span>{a.qty}x {a.box.nama}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Biaya Ekstra Button */}
      {biayaEkstraList.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 shrink-0">
          <button 
            onClick={() => setShowBiayaModal(true)}
            className="w-full flex justify-between items-center px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-300 transition-all focus:outline-none"
          >
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
              <Icons.Plus size={12} /> Biaya Tambahan
            </span>
            {selectedBiayaEkstra.length > 0 && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {selectedBiayaEkstra.length} Terpilih
              </span>
            )}
          </button>
        </div>
      )}

      {/* Total & Bayar */}
      <div className="p-4 border-t bg-slate-50 shrink-0 space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500 font-semibold">
            <span>Subtotal</span><span>{formatRp(grandTotal)}</span>
          </div>
          {automatedBoxTotal > 0 && (
            <div className="flex justify-between text-xs text-blue-500 font-semibold">
              <span>Harga Kemasan</span><span>{formatRp(automatedBoxTotal)}</span>
            </div>
          )}
          {totalBiayaEkstra > 0 && (
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>Biaya Tambahan</span><span>{formatRp(totalBiayaEkstra)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200">
            <span>Total</span>
            <span className="text-amber-600">{formatRp(finalTotal + automatedBoxTotal)}</span>
          </div>
        </div>
        <button
          disabled={cart.length === 0}
          onClick={onBayar}
          className="w-full py-3.5 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Icons.CreditCard size={18} />
          Proses Pembayaran
        </button>
      </div>

      {/* Modal Input Nominal Biaya Ekstra */}
      {promptEkstra && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-6 animate-in zoom-in-95">
            <h3 className="font-black text-slate-800 text-lg mb-1">Input Biaya Tambahan</h3>
            <p className="text-xs text-slate-500 mb-5 font-bold">Tentukan nominal untuk <span className="text-amber-600">{promptEkstra.nama}</span></p>
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">Rp</span>
              <CurrencyInput
                autoFocus
                value={promptNominal}
                onChange={e => setPromptNominal(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black focus:border-amber-400 focus:outline-none transition-all"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPromptEkstra(null)} className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-200 transition-all">Batal</button>
              <button onClick={handleConfirmEkstra} className="flex-[2] py-3.5 bg-gradient-to-br from-amber-500 to-orange-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-600 transition-all">Terapkan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Daftar Biaya Ekstra */}
      {showBiayaModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setShowBiayaModal(false)}>
          <div className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5 border-b pb-4">
              <h3 className="font-black text-slate-800 text-lg">Biaya Tambahan</h3>
              <button onClick={() => setShowBiayaModal(false)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200">
                <Icons.X size={16} />
              </button>
            </div>
            <div className="grid gap-2 max-h-[50vh] overflow-y-auto no-scrollbar pb-4">
              {biayaEkstraList.map(b => {
                const isSelected = selectedBiayaEkstra.some(s => s.id === b.id);
                return (
                  <button key={b.id} onClick={() => toggleEkstra(b)}
                    className={`flex justify-between items-center w-full px-4 py-3 rounded-xl transition-all ${isSelected ? 'bg-amber-100 border border-amber-300' : 'bg-slate-50 border border-slate-200 hover:border-amber-200'}`}>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-amber-700' : 'text-slate-600'}`}>{b.nama}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black ${isSelected ? 'text-amber-800' : 'text-slate-400'}`}>
                        {isSelected 
                          ? formatRp(selectedBiayaEkstra.find(s => s.id === b.id)?.harga || 0)
                          : b.harga_jual === 0 ? 'Input Manual' : formatRp(b.harga_jual)}
                      </span>
                      {isSelected && <Icons.CheckCircle2 size={16} className="text-amber-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowBiayaModal(false)} className="w-full py-3.5 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-amber-600 transition-colors">TUTUP</button>
          </div>
        </div>
      )}
    </div>
  );
}
