'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { CartItem, CartSatuanItem } from '../hooks/useKasir';
import type { Product } from '@/lib/types';

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
}

export default function CartPanel({
  cart, grandTotal, totalBiayaEkstra, finalTotal,
  biayaEkstraList, selectedBiayaEkstra, setSelectedBiayaEkstra,
  namaPelanggan, setNamaPelanggan, hapusItem, updateQty, onBayar, formatRp
}: Props) {

  const getItemLabel = (item: CartItem) => {
    if (item.type === 'satuan') return item.nama;
    if (item.type === 'paket') return item.namaPaket;
    if (item.type === 'bundling') return item.nama;
    return item.namaPaket;
  };

  const getItemTotal = (item: CartItem) => {
    if (item.type === 'satuan') return item.harga * item.qty;
    if (item.type === 'paket') return item.hargaPaket;
    if (item.type === 'bundling') return item.harga;
    return item.totalHarga;
  };

  const [promptEkstra, setPromptEkstra] = useState<Product | null>(null);
  const [promptNominal, setPromptNominal] = useState('');

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
      <div className="px-5 py-4 border-b bg-slate-50 shrink-0">
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
          cart.map(item => (
            <div key={item.id} className="group bg-slate-50 rounded-2xl p-3 border border-slate-100 hover:border-amber-100 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-800 leading-tight truncate">{getItemLabel(item)}</p>
                  {item.type === 'satuan' && <p className="text-[10px] text-slate-400 font-medium">{item.jenis}</p>}
                  {item.type === 'paket' && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.isiDonat.filter(i => i).map((d, i) => (
                        <span key={i} className="text-[8px] px-1.5 py-0.5 bg-amber-50 border border-amber-100 rounded text-amber-600 font-bold">{d}</span>
                      ))}
                    </div>
                  )}
                  {item.type === 'custom' && item.tambahan.length > 0 && (
                    <div className="text-[10px] text-slate-400 mt-1 italic">+{item.tambahan.map(t => t.nama).join(', ')}</div>
                  )}
                </div>
                <button onClick={() => hapusItem(item.id)} className="p-1 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all shrink-0">
                  <Icons.Trash2 size={13} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                {item.type === 'satuan' ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-lg bg-white border flex items-center justify-center text-slate-500 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all text-sm font-bold">−</button>
                    <span className="text-xs font-black w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-lg bg-white border flex items-center justify-center text-slate-500 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all text-sm font-bold">+</button>
                  </div>
                ) : (
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">{item.type}</span>
                )}
                <span className="text-sm font-black text-slate-800">{formatRp(getItemTotal(item))}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Biaya Ekstra */}
      {biayaEkstraList.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 shrink-0">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Biaya Tambahan</p>
          <div className="flex flex-wrap gap-1.5">
            {biayaEkstraList.map(b => {
              const isSelected = selectedBiayaEkstra.some(s => s.id === b.id);
              return (
                <button key={b.id} onClick={() => toggleEkstra(b)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all ${isSelected ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-amber-200'}`}>
                  {b.nama}
                  {isSelected
                    ? <span className="ml-1 bg-amber-500 text-white px-1 py-0.5 rounded text-[8px]">{formatRp(selectedBiayaEkstra.find(s => s.id === b.id)?.harga || 0)}</span>
                    : <span className="ml-1 text-slate-400 text-[8px]">{b.harga_jual === 0 ? '?' : formatRp(b.harga_jual)}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Total & Bayar */}
      <div className="p-4 border-t bg-slate-50 shrink-0 space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500 font-semibold">
            <span>Subtotal</span><span>{formatRp(grandTotal)}</span>
          </div>
          {totalBiayaEkstra > 0 && (
            <div className="flex justify-between text-xs text-slate-500 font-semibold">
              <span>Biaya Tambahan</span><span>{formatRp(totalBiayaEkstra)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200">
            <span>Total</span>
            <span className="text-amber-600">{formatRp(finalTotal)}</span>
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
    </div>
  );
}
