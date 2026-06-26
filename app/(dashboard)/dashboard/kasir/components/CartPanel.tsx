'use client';

import React, { useState } from 'react';
import {
  Box, Check, CreditCard, MessageSquare, Minus, Package, PanelRightClose, Plus, ShoppingCart, Tag, Trash2, User, X,
} from 'lucide-react';
const Icons = { Box, Check, CreditCard, MessageSquare, Minus, Package, PanelRightClose, Plus, ShoppingCart, Tag, Trash2, User, X };
import { CurrencyInput } from '@/components/ui/currency-input';
import type { CartItem, CartSatuanItem, CartBoxItem } from '../hooks/useKasir';
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
  onBayar: () => void;
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

export default function CartPanel({
  cart, grandTotal, totalBiayaEkstra, finalTotal,
  cartDiscount, maxCartDiscount, setCartDiscount,
  biayaEkstraList, selectedBiayaEkstra, setSelectedBiayaEkstra,
  namaPelanggan, setNamaPelanggan, hapusItem, updateQty, onBayar, formatRp,
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
  const [showTambahanMenu, setShowTambahanMenu] = useState(false);
  const [showBoxModal, setShowBoxModal] = useState(false);

  const handleSwitchToCustom = () => {
    if (customBoxes.length === 0) {
      const copied = automatedBoxes.map(a => ({
        box: a.box,
        qty: a.qty
      }));
      setCustomBoxes(copied);
    }
    setIsCustomBoxesActive(true);
  };

  const updateCustomBoxQty = (box: ProductBox, delta: number) => {
    setCustomBoxes(prev => {
      const existing = prev.find(cb => cb.box.id === box.id);
      if (existing) {
        const newQty = existing.qty + delta;
        if (newQty <= 0) {
          return prev.filter(cb => cb.box.id !== box.id);
        }
        return prev.map(cb => cb.box.id === box.id ? { ...cb, qty: newQty } : cb);
      } else {
        if (delta > 0) {
          return [...prev, { box, qty: delta }];
        }
        return prev;
      }
    });
  };

  const handleClearAllCustomBoxes = () => {
    setCustomBoxes([]);
  };

  const handleCartDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
    setCartDiscount(Math.min(Math.max(0, value), maxCartDiscount));
  };

  const addEkstra = (b: Product) => {
    const existing = selectedBiayaEkstra.find(s => s.id === b.id);
    if (existing) {
      if (b.harga_jual === 0) return; // if custom input, usually only 1 is enough or handled differently. Let's just do qty for fixed prices.
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
      {/* Header Cart */}
      <div className="px-5 py-5 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <Icons.ShoppingCart size={16} className="text-white" />
            </div>
            <h2 className="font-bold text-slate-900 text-base">Keranjang</h2>
          </div>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-md">{cart.length}</span>
            )}
            {onCollapse && (
              <button
                onClick={onCollapse}
                title="Sembunyikan Keranjang"
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center transition-all"
              >
                <Icons.PanelRightClose size={16} />
              </button>
            )}
          </div>
        </div>
        {/* Nama Pelanggan */}
        <div className="relative">
          <Icons.User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={namaPelanggan}
            onChange={e => setNamaPelanggan(e.target.value)}
            placeholder="Nama pelanggan"
            className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 py-16">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
              <Icons.ShoppingCart size={32} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-400">Keranjang masih kosong</p>
            <p className="text-xs text-slate-300 mt-1">Pilih produk untuk memulai</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map(item => (
              <div key={item.id} className="group relative bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg p-3 transition-all">
                
                {/* Header: Nama & Hapus */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 leading-tight">{getItemLabel(item)}</p>
                    {item.type === 'satuan' && (
                      <p className="text-xs text-slate-500 mt-0.5">{item.jenis}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => hapusItem(item.id)} 
                    className="w-7 h-7 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors shrink-0"
                  >
                    <Icons.Trash2 size={14} />
                  </button>
                </div>

                {/* Detail Isi Paket/Custom */}
                {item.type === 'paket' && item.isiDonat && item.isiDonat.length > 0 && (
                  <div className="mb-2 pb-2 border-b border-slate-200">
                    <p className="text-xs font-medium text-slate-600 mb-1.5">Isi paket:</p>
                    <div className="space-y-1">
                      {(() => {
                        const grouped = new Map<string, { nama: string; count: number }>();
                        item.isiDonat.forEach((d: any) => {
                          const key = d.productId || d.nama;
                          const existing = grouped.get(key);
                          if (existing) existing.count++;
                          else grouped.set(key, { nama: d.nama, count: 1 });
                        });
                        return Array.from(grouped.values()).map((d, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                            <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                            <span>{d.nama}</span>
                            {d.count > 1 && <span className="text-slate-400">x{d.count}</span>}
                          </div>
                        ));
                      })()}
                    </div>
                    {item.extras && item.extras.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="text-xs font-medium text-slate-600 mb-1">Tambahan:</p>
                        {item.extras.map((e: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs text-slate-600">
                            <span>+ {e.nama} x{e.qty}</span>
                            <span>{formatRp(e.harga)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Custom order breakdown */}
                {item.type === 'custom' && (
                  <div className="mb-2 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Icons.Box size={14} className="text-slate-500" />
                      <p className="text-xs font-medium text-slate-600">
                        {item.kode && <span className="font-bold">[{item.kode}] </span>}
                        {item.modeLabel || item.jenisMode} • {item.kapasitas} pcs
                      </p>
                    </div>
                    {item.isiDonat && item.isiDonat.length > 0 && (
                      <div className="space-y-1 mb-2">
                        <p className="text-xs font-medium text-slate-600">Isi:</p>
                        {(() => {
                          const grouped = new Map<string, { nama: string; count: number }>();
                          item.isiDonat.forEach((d: any) => {
                            const key = typeof d === 'object' ? (d.productId || d.nama) : d;
                            const nama = typeof d === 'object' ? d.nama : d;
                            const existing = grouped.get(key);
                            if (existing) existing.count++;
                            else grouped.set(key, { nama, count: 1 });
                          });
                          return Array.from(grouped.values()).map((d, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                              <div className="w-1 h-1 rounded-full bg-slate-400"></div>
                              <span>{d.nama}</span>
                              {d.count > 1 && <span className="text-slate-400">x{d.count}</span>}
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                    {item.tulisanCoklat && (
                      <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-white px-2 py-1.5 rounded border border-slate-200 mb-2">
                        <Icons.MessageSquare size={12} className="mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-700">Tulisan:</p>
                          <p className="italic">"{item.tulisanCoklat}"</p>
                          {item.jumlahPapanCoklat > 0 && (
                            <p className="text-amber-600 font-semibold mt-1">
                              📋 {item.jumlahPapanCoklat} papan coklat
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {item.tambahan && item.tambahan.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="text-xs font-medium text-slate-600 mb-1">Tambahan:</p>
                        {item.tambahan.map((t: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs text-slate-600">
                            <span>+ {t.nama} x{t.qty}</span>
                            <span>{formatRp(t.harga)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {(item.diskon || 0) > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
                          <Icons.Tag size={12} />
                          <span>Hemat {formatRp(item.diskon)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer: Qty & Price */}
                <div className="flex items-center justify-between">
                  {/* QTY Control untuk Satuan & Box */}
                  {(item.type === 'satuan' || item.type === 'box') ? (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => updateQty(item.id, -1)} 
                        className="w-7 h-7 rounded-md bg-white border border-slate-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <Icons.Minus size={14} />
                      </button>
                      <span className="text-sm font-bold text-slate-900 min-w-[24px] text-center">
                        {(item as CartSatuanItem | CartBoxItem).qty}
                      </span>
                      <button 
                        onClick={() => updateQty(item.id, 1)} 
                        className="w-7 h-7 rounded-md bg-white border border-slate-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white flex items-center justify-center transition-colors"
                      >
                        <Icons.Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-500">Qty:</span>
                      <span className="text-sm font-bold text-slate-900">1</span>
                    </div>
                  )}
                  
                  <div className="text-right">
                    <span className="text-base font-bold text-slate-900">{formatRp(getItemTotal(item))}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Kemasan Interaktif */}
      {cart.length > 0 && (
        <div className="px-4 pb-3 shrink-0 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-600 mb-1.5">Kemasan / Box:</p>
          <button
            type="button"
            onClick={() => setShowBoxModal(true)}
            className="w-full flex items-center justify-between text-xs bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/70 p-2.5 rounded-lg transition-all text-left"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Icons.Package size={15} className="text-slate-500 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-slate-800">
                  {isCustomBoxesActive ? "📦 Kemasan Kustom" : "🤖 Kemasan Otomatis"}
                </span>
                <span className="text-slate-500 block text-[10px] truncate mt-0.5">
                  {automatedBoxes.length > 0 
                    ? automatedBoxes.map(a => `${a.box.nama} (x${a.qty})`).join(", ") 
                    : "Tanpa Box / Otomatis"}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 ml-2">
              <span className="font-bold text-slate-900 block">{formatRp(automatedBoxTotal)}</span>
              <span className="text-[10px] text-amber-600 font-semibold underline block mt-0.5">Atur Box</span>
            </div>
          </button>
        </div>
      )}

      <div className="px-4 py-3 border-t border-slate-200 shrink-0">
        {!showTambahanMenu ? (
          <button
            onClick={() => setShowTambahanMenu(true)}
            className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-all focus:outline-none"
          >
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-2"><Icons.Plus size={14} /> Tambahan</span>
          </button>
        ) : (
          <div className="space-y-2">
            {biayaEkstraList.length > 0 && (
              <button
                onClick={() => setShowBiayaModal(true)}
                className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-all focus:outline-none"
              >
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-2"><Icons.Plus size={14} /> Biaya Tambahan</span>
                {selectedBiayaEkstra.length > 0 && (
                  <span className="text-xs font-bold text-slate-900 bg-slate-200 px-2.5 py-1 rounded-md">{selectedBiayaEkstra.length}</span>
                )}
              </button>
            )}

            {!showDiscountInput ? (
              <button
                onClick={() => setShowDiscountInput(true)}
                className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-all focus:outline-none"
              >
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-2"><Icons.Plus size={14} /> Diskon Kasir</span>
                {cartDiscount > 0 && (
                  <span className="text-xs font-bold text-slate-900 bg-slate-200 px-2.5 py-1 rounded-md">{formatRp(cartDiscount)}</span>
                )}
              </button>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">Rp</span>
                  <CurrencyInput
                    autoFocus
                    value={cartDiscount}
                    onChange={handleCartDiscountChange}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-lg font-bold text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    placeholder="0"
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">Maks diskon: {formatRp(maxCartDiscount)}</p>
                  <button onClick={() => setShowDiscountInput(false)} className="text-xs text-slate-600 underline">Batal</button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={() => { setShowTambahanMenu(false); setShowDiscountInput(false); }} className="text-xs text-slate-600 underline">Tutup</button>
            </div>
          </div>
        )}
      </div>

      {/* Total & Bayar */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 shrink-0 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold">{formatRp(grandTotal)}</span>
          </div>
          {automatedBoxTotal > 0 && (
            <div className="flex justify-between text-sm text-slate-600">
              <span>Kemasan</span>
              <span className="font-semibold">{formatRp(automatedBoxTotal)}</span>
            </div>
          )}
          {totalBiayaEkstra > 0 && (
            <div className="flex justify-between text-sm text-slate-600">
              <span>Biaya Tambahan</span>
              <span className="font-semibold">{formatRp(totalBiayaEkstra)}</span>
            </div>
          )}
          {cartDiscount > 0 && (
            <div className="flex justify-between text-sm text-rose-600">
              <span>Diskon Kasir</span>
              <span className="font-semibold">- {formatRp(cartDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-300">
            <span>Total</span>
            <span>{formatRp(finalTotal)}</span>
          </div>
        </div>
        <button
          disabled={cart.length === 0}
          onClick={onBayar}
          className="w-full py-3.5 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Icons.CreditCard size={18} />
          Proses Pembayaran
        </button>
      </div>

      {/* Modal Input Nominal Biaya Ekstra */}
      {promptEkstra && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Input Biaya Tambahan</h3>
            <p className="text-sm text-slate-600 mb-5">Tentukan nominal untuk <span className="font-semibold text-slate-900">{promptEkstra.nama}</span></p>
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-slate-500 text-base">Rp</span>
              <CurrencyInput
                autoFocus
                value={promptNominal}
                onChange={e => setPromptNominal(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-lg text-xl font-bold focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setPromptEkstra(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-200 transition-all">Batal</button>
              <button onClick={handleConfirmEkstra} className="flex-[2] py-3 bg-slate-900 text-white font-semibold text-sm rounded-lg hover:bg-slate-800 transition-all">Terapkan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Daftar Biaya Ekstra */}
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
                    className={`flex justify-between items-center w-full px-4 py-3 rounded-lg transition-all ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-50 border border-slate-200 hover:border-slate-300 cursor-pointer'}`}
                    onClick={() => { if (!isSelected) addEkstra(b); }}
                  >
                    <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-700'}`}>{b.nama}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-900'} mr-2`}>
                        {isSelected 
                          ? formatRp(item?.harga || 0)
                          : b.harga_jual === 0 ? 'Input' : formatRp(b.harga_jual)}
                      </span>
                      {isSelected ? (
                        <div className="flex items-center gap-2 bg-white/20 rounded-md p-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => removeEkstra(b)} className="w-6 h-6 rounded flex items-center justify-center bg-white/10 hover:bg-white/30 transition-colors">
                            <Icons.Minus size={14} />
                          </button>
                          <span 
                            onClick={() => {
                              const promptVal = window.prompt(`Masukkan jumlah untuk ${b.nama}:`, String(item?.qty || 1));
                              if (promptVal === null) return;
                              const newQty = parseInt(promptVal.replace(/\D/g, ''), 10);
                              if (isNaN(newQty) || newQty <= 0) {
                                setSelectedBiayaEkstra((prev: any[]) => prev.filter((s: any) => s.id !== b.id));
                              } else {
                                setSelectedBiayaEkstra((prev: any[]) => prev.map((s: any) =>
                                  s.id === b.id ? { ...s, qty: newQty, harga: newQty * b.harga_jual } : s
                                ));
                              }
                            }}
                            className="text-xs font-bold w-8 text-center cursor-pointer hover:bg-white/10 hover:text-orange-200 py-0.5 rounded transition-colors select-none"
                            title="Klik untuk input jumlah manual"
                          >
                            {item?.qty || 1}
                          </span>
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
            <button onClick={() => setShowBiayaModal(false)} className="w-full py-3 bg-slate-900 text-white font-semibold text-sm rounded-lg hover:bg-slate-800 transition-colors mt-4">Tutup</button>
          </div>
        </div>
      )}

      {/* Modal Kelola Kemasan (Box) */}
      {showBoxModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setShowBoxModal(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Atur Kemasan / Box</h3>
                <p className="text-xs text-slate-500 mt-0.5">Kelola tipe & jumlah box yang digunakan</p>
              </div>
              <button onClick={() => setShowBoxModal(false)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <Icons.X size={16} />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setIsCustomBoxesActive(false)}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${!isCustomBoxesActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                🤖 Otomatis (Sistem)
              </button>
              <button
                type="button"
                onClick={handleSwitchToCustom}
                className={`py-2 px-3 text-xs font-bold rounded-lg transition-all ${isCustomBoxesActive ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                📦 Kustom (Manual)
              </button>
            </div>

            {/* Content Area */}
            {!isCustomBoxesActive ? (
              /* Mode Otomatis (Sistem) */
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3.5 flex items-start gap-2.5">
                  <Icons.Package className="text-amber-600 shrink-0 mt-0.5" size={16} />
                  <div className="text-xs text-amber-800 leading-relaxed">
                    <p className="font-bold mb-0.5">Sistem Mengatur Kemasan Otomatis</p>
                    <p>Box dialokasikan otomatis berdasarkan kuantitas donat standar dan mini. Klik tombol di bawah jika ingin mengubah jumlah box secara manual.</p>
                  </div>
                </div>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 no-scrollbar">
                  {automatedBoxes.length === 0 ? (
                    <p className="text-center py-6 text-xs text-slate-400 font-medium">Tidak ada box yang dialokasikan sistem</p>
                  ) : (
                    automatedBoxes.map((a, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{a.box.nama}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Kapasitas: {a.box.kapasitas} donat</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500">Qty:</span>
                          <span className="text-sm font-black text-slate-900">{a.qty}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSwitchToCustom}
                  className="w-full mt-2 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5"
                >
                  ✏️ Ubah ke Kemasan Kustom
                </button>
              </div>
            ) : (
              /* Mode Kustom (Manual) */
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-600">Daftar Pilihan Box:</p>
                  {customBoxes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllCustomBoxes}
                      className="text-xs text-red-600 hover:text-red-700 font-bold underline transition-colors flex items-center gap-1"
                    >
                      <Icons.Trash2 size={12} /> Hapus Semua
                    </button>
                  )}
                </div>

                <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1 no-scrollbar">
                  {boxList.length === 0 ? (
                    <p className="text-center py-8 text-xs text-slate-400">Tidak ada daftar box tersedia</p>
                  ) : (
                    boxList.map(bx => {
                      const item = customBoxes.find(cb => cb.box.id === bx.id);
                      const qty = item?.qty || 0;
                      return (
                        <div key={bx.id} className={`flex justify-between items-center border p-3.5 rounded-xl transition-all ${qty > 0 ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                          <div>
                            <p className="text-sm font-bold">{bx.nama}</p>
                            <p className={`text-[10px] mt-0.5 ${qty > 0 ? 'text-slate-300' : 'text-slate-500'}`}>
                              Kapasitas: {bx.kapasitas} | Harga: {bx.harga_box > 0 ? formatRp(bx.harga_box) : 'Gratis'}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => updateCustomBoxQty(bx, -1)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors font-bold ${qty > 0 ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-600'}`}
                            >
                              <Icons.Minus size={13} />
                            </button>
                            <span className="text-sm font-black w-6 text-center select-none">{qty}</span>
                            <button
                              type="button"
                              onClick={() => updateCustomBoxQty(bx, 1)}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors font-bold ${qty > 0 ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white border border-slate-300 hover:bg-slate-100 text-slate-600'}`}
                            >
                              <Icons.Plus size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Footer Aksi */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex gap-3">
              {isCustomBoxesActive && (
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomBoxesActive(false);
                    setCustomBoxes([]);
                  }}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Kembali Otomatis
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowBoxModal(false)}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all text-center"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
