'use client';

import React, { useState } from 'react';
import {
  Box, Check, ClipboardList, MessageSquare, Minus, Package, Plus, ShoppingCart, Tag, Trash2, User, X,
} from 'lucide-react';
const Icons = { Box, Check, ClipboardList, MessageSquare, Minus, Package, Plus, ShoppingCart, Tag, Trash2, User, X };
import { CurrencyInput } from '@/components/ui/currency-input';
import type { CartItem, CartSatuanItem, CartBoxItem } from '@/app/(dashboard)/dashboard/kasir/hooks/useKasir';
import type { Product, ProductBox } from '@/lib/types';

interface Props {
  cart: CartItem[];
  grandTotal: number;
  totalBiayaEkstra: number;
  finalTotal: number;
  cartDiscount: number;
  maxCartDiscount: number;
  setCartDiscount: (value: number) => void;
  biayaEkstraList: Product[];
  selectedBiayaEkstra: { id: string; nama: string; harga: number; qty?: number }[];
  setSelectedBiayaEkstra: (v: any) => void;
  namaPelanggan: string;
  setNamaPelanggan: (v: string) => void;
  hapusItem: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  onBuatTagihan: () => void;
  formatRp: (n: number) => string;
  automatedBoxes: { box: ProductBox; qty: number; target: string; used: number; totalCapacity: number }[];
  automatedBoxTotal: number;
  boxList: ProductBox[];
  customBoxes: { box: ProductBox; qty: number }[];
  setCustomBoxes: React.Dispatch<React.SetStateAction<{ box: ProductBox; qty: number }[]>>;
  isCustomBoxesActive: boolean;
  setIsCustomBoxesActive: (v: boolean) => void;
  onCollapse?: () => void;
}

export default function TagihanCartPanel({
  cart, grandTotal, totalBiayaEkstra, finalTotal,
  cartDiscount, maxCartDiscount, setCartDiscount,
  biayaEkstraList, selectedBiayaEkstra, setSelectedBiayaEkstra,
  namaPelanggan, setNamaPelanggan, hapusItem, updateQty, onBuatTagihan, formatRp,
  automatedBoxes, automatedBoxTotal, boxList, customBoxes, setCustomBoxes,
  isCustomBoxesActive, setIsCustomBoxesActive, onCollapse
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
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [showBoxModal, setShowBoxModal] = useState(false);

  const handleSwitchToCustom = () => {
    if (customBoxes.length === 0) {
      setCustomBoxes(automatedBoxes.map(a => ({ box: a.box, qty: a.qty })));
    }
    setIsCustomBoxesActive(true);
  };

  const updateCustomBoxQty = (box: ProductBox, delta: number) => {
    setCustomBoxes(prev => {
      const existing = prev.find(cb => cb.box.id === box.id);
      if (existing) {
        const newQty = existing.qty + delta;
        if (newQty <= 0) return prev.filter(cb => cb.box.id !== box.id);
        return prev.map(cb => cb.box.id === box.id ? { ...cb, qty: newQty } : cb);
      } else {
        if (delta > 0) return [...prev, { box, qty: delta }];
        return prev;
      }
    });
  };

  const handleCartDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
    setCartDiscount(Math.min(Math.max(0, value), maxCartDiscount));
  };

  const addEkstra = (b: Product) => {
    const existing = selectedBiayaEkstra.find(s => s.id === b.id);
    if (existing) {
      if (b.harga_jual === 0) return;
      setSelectedBiayaEkstra((prev: any[]) => prev.map(s =>
        s.id === b.id ? { ...s, qty: (s.qty || 1) + 1, harga: ((s.qty || 1) + 1) * b.harga_jual } : s
      ));
    } else {
      if (b.harga_jual === 0) {
        setPromptEkstra(b);
        setPromptNominal('');
      } else {
        setSelectedBiayaEkstra((prev: any[]) => [...prev, { id: b.id, nama: b.nama, harga: b.harga_jual, qty: 1 }]);
      }
    }
  };

  const removeEkstra = (b: Product) => {
    const existing = selectedBiayaEkstra.find(s => s.id === b.id);
    if (!existing) return;
    if ((existing.qty || 1) <= 1) {
      setSelectedBiayaEkstra((prev: any[]) => prev.filter(s => s.id !== b.id));
    } else {
      const unitPrice = b.harga_jual;
      setSelectedBiayaEkstra((prev: any[]) => prev.map(s =>
        s.id === b.id ? { ...s, qty: (s.qty || 1) - 1, harga: ((s.qty || 1) - 1) * unitPrice } : s
      ));
    }
  };

  const handleConfirmEkstra = () => {
    if (promptEkstra) {
      const nominal = parseInt(promptNominal.replace(/[^0-9]/g, '')) || 0;
      if (nominal > 0) {
        setSelectedBiayaEkstra((prev: any[]) => [...prev, { id: promptEkstra.id, nama: promptEkstra.nama, harga: nominal, qty: 1 }]);
      }
      setPromptEkstra(null);
      setPromptNominal('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-blue-100 bg-blue-50 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Icons.User size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={namaPelanggan}
              onChange={e => setNamaPelanggan(e.target.value)}
              placeholder="Nama pelanggan / keterangan"
              className="w-full pl-7 pr-2 py-1 bg-white border border-blue-200 rounded text-[11px] focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400"
            />
          </div>
          {cart.length > 0 && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">{cart.length}</span>
          )}
          {onCollapse && (
            <button
              onClick={onCollapse}
              title="Tutup"
              className="w-5 h-5 rounded bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center transition-all shrink-0"
            >
              <Icons.X size={10} />
            </button>
          )}
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1 no-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 py-8">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-2">
              <Icons.ClipboardList size={20} className="text-blue-300" />
            </div>
            <p className="text-xs font-medium text-slate-400">Keranjang masih kosong</p>
            <p className="text-[10px] text-slate-300 mt-0.5">Pilih produk untuk membuat tagihan</p>
          </div>
        ) : (
          <div className="space-y-1">
            {cart.map(item => {
              return (
                <div key={item.id} className="group relative bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-lg transition-all">
                  <div className="flex items-center gap-1.5 px-2 py-1.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-900 leading-tight">{getItemLabel(item)}</p>
                      {item.type === 'satuan' && (
                        <p className="text-[9px] text-slate-500 leading-none mt-0.5">{item.jenis}</p>
                      )}
                    </div>
                    {(item.type === 'satuan' || item.type === 'box') ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-center transition-colors">
                          <Icons.Minus size={12} />
                        </button>
                        <span className="text-xs font-bold text-slate-900 min-w-[20px] text-center">
                          {(item as CartSatuanItem | CartBoxItem).qty}
                        </span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-center transition-colors">
                          <Icons.Plus size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 shrink-0">x1</span>
                    )}
                    <span className="text-xs font-bold text-slate-900 shrink-0">{formatRp(getItemTotal(item))}</span>
                    <button onClick={() => hapusItem(item.id)} className="w-6 h-6 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors shrink-0">
                      <Icons.Trash2 size={12} />
                    </button>
                  </div>
                  {item.type === 'paket' && item.isiDonat && item.isiDonat.length > 0 && (
                    <div className="px-2.5 pb-1.5 pt-1 border-t border-slate-200/50">
                      <div className="text-[10px] text-slate-500">
                        {(() => {
                          const grouped = new Map<string, { nama: string; count: number }>();
                          item.isiDonat.forEach((d: any) => {
                            const key = d.productId || d.nama;
                            const existing = grouped.get(key);
                            if (existing) existing.count++;
                            else grouped.set(key, { nama: d.nama, count: 1 });
                          });
                          return Array.from(grouped.values()).slice(0, 2).map((d, i) => (
                            <span key={i} className="inline-block mr-2">• {d.nama}{d.count > 1 ? ` x${d.count}` : ''}</span>
                          ));
                        })()}
                        {item.isiDonat.length > 2 && <span className="text-slate-400">+{item.isiDonat.length - 2}</span>}
                      </div>
                    </div>
                  )}
                  {item.type === 'custom' && (
                    <div className="px-2.5 pb-1.5 pt-1 border-t border-slate-200/50 text-[10px] text-slate-500 flex flex-wrap gap-x-2">
                      {item.kode && <span className="font-bold">[{item.kode}]</span>}
                      <span>{item.modeLabel || item.jenisMode} • {item.kapasitas} pcs</span>
                      {item.tulisanCoklat && <span className="text-amber-600">✏️ "{item.tulisanCoklat.substring(0, 18)}"</span>}
                      {(item.diskon || 0) > 0 && <span className="text-green-600 font-semibold">-{formatRp(item.diskon)}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="px-2 py-1.5 border-t border-slate-200 shrink-0">
        <div className="grid grid-cols-3 gap-1">
          <button type="button" onClick={() => setShowBoxModal(true)}
            className="flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded transition-all">
            <Icons.Package size={16} className="text-amber-700" />
            <span className="text-[8px] font-bold text-amber-800 leading-none">Box</span>
            {automatedBoxTotal > 0 && <span className="text-[7px] font-semibold text-amber-600 leading-none">{formatRp(automatedBoxTotal)}</span>}
          </button>

          <button type="button" onClick={() => setShowDiscountInput(v => !v)}
            className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 border rounded transition-all ${cartDiscount > 0 ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
            <Icons.Tag size={16} className={cartDiscount > 0 ? 'text-green-700' : 'text-slate-600'} />
            <span className={`text-[8px] font-bold leading-none ${cartDiscount > 0 ? 'text-green-800' : 'text-slate-700'}`}>Diskon</span>
            {cartDiscount > 0 && <span className="text-[7px] font-semibold text-green-600 leading-none">{formatRp(cartDiscount)}</span>}
          </button>

          {biayaEkstraList.length > 0 && (
            <button type="button" onClick={() => setShowBiayaModal(true)}
              className={`flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 border rounded transition-all relative ${selectedBiayaEkstra.length > 0 ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
              {selectedBiayaEkstra.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {selectedBiayaEkstra.length}
                </span>
              )}
              <Icons.Plus size={16} className={selectedBiayaEkstra.length > 0 ? 'text-blue-700' : 'text-slate-600'} />
              <span className={`text-[8px] font-bold leading-none ${selectedBiayaEkstra.length > 0 ? 'text-blue-800' : 'text-slate-700'}`}>Ekstra</span>
            </button>
          )}
        </div>

        {showDiscountInput && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg animate-in slide-in-from-bottom-2 fade-in duration-200">
            <p className="text-xs font-bold text-green-800 mb-2 flex items-center gap-1.5">
              <Icons.Tag size={12} /> Diskon
            </p>
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-sm font-semibold">Rp</span>
              <CurrencyInput
                autoFocus
                value={cartDiscount}
                onChange={handleCartDiscountChange}
                className="flex-1 rounded-lg border border-green-300 bg-white px-3 py-2 text-base font-bold text-slate-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                placeholder="0"
              />
              <button onClick={() => setShowDiscountInput(false)} className="w-8 h-8 rounded-lg bg-green-200 hover:bg-green-300 flex items-center justify-center transition-colors">
                <Icons.Check size={14} className="text-green-800" />
              </button>
            </div>
            <p className="text-[10px] text-green-700 mt-1.5">Maks: {formatRp(maxCartDiscount)}</p>
          </div>
        )}
      </div>

      {/* Summary & Action Button */}
      <div className="px-2 py-1.5 border-t border-slate-200 bg-blue-50 shrink-0">
        <div className="space-y-0.5 mb-2">
          <div className="flex justify-between text-[10px] text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold">{formatRp(grandTotal)}</span>
          </div>
          {automatedBoxTotal > 0 && (
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>Kemasan</span>
              <span className="font-semibold">{formatRp(automatedBoxTotal)}</span>
            </div>
          )}
          {totalBiayaEkstra > 0 && (
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>Biaya Tambahan</span>
              <span className="font-semibold">{formatRp(totalBiayaEkstra)}</span>
            </div>
          )}
          {cartDiscount > 0 && (
            <div className="flex justify-between text-[10px] text-rose-600">
              <span>Diskon</span>
              <span className="font-semibold">- {formatRp(cartDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold text-blue-900 pt-1 border-t border-blue-200">
            <span>Total Tagihan</span>
            <span>{formatRp(grandTotal + automatedBoxTotal + totalBiayaEkstra - cartDiscount)}</span>
          </div>
        </div>
        <button
          disabled={cart.length === 0}
          onClick={onBuatTagihan}
          className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <Icons.ClipboardList size={14} />
          Buat Tagihan
        </button>
      </div>

      {/* Modal Biaya Ekstra */}
      {showBiayaModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowBiayaModal(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-lg">Biaya Tambahan</h3>
              <button onClick={() => setShowBiayaModal(false)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <Icons.X size={16} />
              </button>
            </div>
            <div className="grid gap-2 max-h-[50vh] overflow-y-auto no-scrollbar pb-4">
              {biayaEkstraList.map(b => {
                const isSelected = selectedBiayaEkstra.some(s => s.id === b.id);
                const item = selectedBiayaEkstra.find(s => s.id === b.id);
                return (
                  <div key={b.id}
                    className={`flex justify-between items-center w-full px-4 py-3 rounded-lg transition-all ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 border border-slate-200 hover:border-slate-300 cursor-pointer'}`}
                    onClick={() => { if (!isSelected) addEkstra(b); }}>
                    <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-700'}`}>{b.nama}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-900'} mr-2`}>
                        {isSelected ? formatRp(item?.harga || 0) : b.harga_jual === 0 ? 'Input' : formatRp(b.harga_jual)}
                      </span>
                      {isSelected ? (
                        <div className="flex items-center gap-2 bg-white/20 rounded-md p-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => removeEkstra(b)} className="w-6 h-6 rounded flex items-center justify-center bg-white/10 hover:bg-white/30 transition-colors">
                            <Icons.Minus size={14} />
                          </button>
                          <span className="text-xs font-bold w-8 text-center">{item?.qty || 1}</span>
                          <button onClick={() => addEkstra(b)} className="w-6 h-6 rounded flex items-center justify-center bg-white/10 hover:bg-white/30 transition-colors">
                            <Icons.Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <Icons.Plus size={16} className="text-slate-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowBiayaModal(false)} className="w-full py-3 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-colors mt-4">Tutup</button>
          </div>
        </div>
      )}

      {/* Modal Box */}
      {showBoxModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowBoxModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Atur Kemasan / Box</h3>
                <p className="text-xs text-slate-500 mt-0.5">Kelola tipe & jumlah box</p>
              </div>
              <button onClick={() => setShowBoxModal(false)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <Icons.X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl mb-6">
              <button type="button" onClick={() => setIsCustomBoxesActive(false)} className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${!isCustomBoxesActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>🤖 Otomatis</button>
              <button type="button" onClick={handleSwitchToCustom} className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${isCustomBoxesActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>📦 Manual</button>
            </div>
            {!isCustomBoxesActive ? (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar">
                {automatedBoxes.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">Tidak ada box yang dialokasikan sistem</p>
                ) : (
                  automatedBoxes.map((a, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{a.box.nama}</p>
                        <p className="text-[10px] text-slate-500">Kapasitas: {a.box.kapasitas} donat</p>
                      </div>
                      <span className="text-sm font-black text-slate-900">x{a.qty}</span>
                    </div>
                  ))
                )}
                <button type="button" onClick={handleSwitchToCustom} className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all mt-2">✏️ Ubah ke Manual</button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[45vh] overflow-y-auto no-scrollbar">
                {boxList.map(bx => {
                  const cb = customBoxes.find(c => c.box.id === bx.id);
                  const qty = cb?.qty || 0;
                  return (
                    <div key={bx.id} className={`flex justify-between items-center border p-3.5 rounded-xl transition-all ${qty > 0 ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                      <div>
                        <p className="text-sm font-bold">{bx.nama}</p>
                        <p className={`text-[10px] mt-0.5 ${qty > 0 ? 'text-blue-200' : 'text-slate-500'}`}>
                          Kapasitas: {bx.kapasitas} | Harga: {bx.harga_box > 0 ? formatRp(bx.harga_box) : 'Gratis'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => updateCustomBoxQty(bx, -1)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${qty > 0 ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-600'}`}>
                          <Icons.Minus size={13} />
                        </button>
                        <span className="text-sm font-black w-6 text-center select-none">{qty}</span>
                        <button type="button" onClick={() => updateCustomBoxQty(bx, 1)} className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${qty > 0 ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-600'}`}>
                          <Icons.Plus size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-6 pt-4 border-t border-slate-200 flex gap-3">
              {isCustomBoxesActive && (
                <button type="button" onClick={() => { setIsCustomBoxesActive(false); setCustomBoxes([]); }} className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all">
                  Kembali Otomatis
                </button>
              )}
              <button type="button" onClick={() => setShowBoxModal(false)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all">
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Nominal Ekstra */}
      {promptEkstra && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Input Biaya Tambahan</h3>
            <p className="text-sm text-slate-600 mb-5">Nominal untuk <span className="font-semibold text-slate-900">{promptEkstra.nama}</span></p>
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500 text-base">Rp</span>
              <CurrencyInput
                autoFocus
                value={promptNominal}
                onChange={e => setPromptNominal(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-lg text-xl font-bold focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPromptEkstra(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-200 transition-all">Batal</button>
              <button onClick={handleConfirmEkstra} className="flex-[2] py-3 bg-blue-600 text-white font-semibold text-sm rounded-lg hover:bg-blue-700 transition-all">Terapkan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
