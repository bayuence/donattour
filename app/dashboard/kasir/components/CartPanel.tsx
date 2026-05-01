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
  onCollapse?: () => void;
}

export default function CartPanel({
  cart, grandTotal, totalBiayaEkstra, finalTotal,
  biayaEkstraList, selectedBiayaEkstra, setSelectedBiayaEkstra,
  namaPelanggan, setNamaPelanggan, hapusItem, updateQty, onBayar, formatRp,
  automatedBoxes, automatedBoxTotal, onCollapse
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

      {/* Kemasan Otomatis */}
      {automatedBoxes.length > 0 && (
        <div className="px-4 pb-3 shrink-0 border-b border-slate-200">
          <p className="text-xs font-medium text-slate-600 mb-2">Kemasan:</p>
          <div className="space-y-1.5">
            {automatedBoxes.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <Icons.Package size={14} className="text-slate-400" />
                  <span className="font-medium text-slate-700">{a.box.nama}</span>
                  <span className="text-slate-400">x{a.qty}</span>
                </div>
                <span className="font-semibold text-slate-900">{formatRp(a.box.harga_box * a.qty)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Biaya Ekstra Button */}
      {biayaEkstraList.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-200 shrink-0">
          <button 
            onClick={() => setShowBiayaModal(true)}
            className="w-full flex justify-between items-center px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-all focus:outline-none"
          >
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
              <Icons.Plus size={14} /> Biaya Tambahan
            </span>
            {selectedBiayaEkstra.length > 0 && (
              <span className="text-xs font-bold text-slate-900 bg-slate-200 px-2.5 py-1 rounded-md">
                {selectedBiayaEkstra.length}
              </span>
            )}
          </button>
        </div>
      )}

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
          <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-300">
            <span>Total</span>
            <span>{formatRp(finalTotal + automatedBoxTotal)}</span>
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
                return (
                  <button key={b.id} onClick={() => toggleEkstra(b)}
                    className={`flex justify-between items-center w-full px-4 py-3 rounded-lg transition-all ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-50 border border-slate-200 hover:border-slate-300'}`}>
                    <span className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-700'}`}>{b.nama}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {isSelected 
                          ? formatRp(selectedBiayaEkstra.find(s => s.id === b.id)?.harga || 0)
                          : b.harga_jual === 0 ? 'Input' : formatRp(b.harga_jual)}
                      </span>
                      {isSelected && <Icons.Check size={16} />}
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowBiayaModal(false)} className="w-full py-3 bg-slate-900 text-white font-semibold text-sm rounded-lg hover:bg-slate-800 transition-colors mt-4">Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}
