'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Minus, ShoppingBag, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { getTodayWIB } from '@/lib/utils/timezone';
import type { OutletChannel } from '@/lib/db/outlet-channels';

interface ChannelSalesInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  outletId: string;
  channel: OutletChannel;
  onSuccess: () => void;
}

export default function ChannelSalesInputModal({
  isOpen,
  onClose,
  outletId,
  channel,
  onSuccess,
}: ChannelSalesInputModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Data State
  const [sisaStokStandar, setSisaStokStandar] = useState<number>(0);
  const [sisaStokMini, setSisaStokMini] = useState<number>(0);
  const [categories, setCategories] = useState<{id: string, nama: string}[]>([]);
  
  // Form State
  const [ukuran, setUkuran] = useState<'standar' | 'mini'>('standar');
  const [kategori, setKategori] = useState<string>('');
  const [qty, setQty] = useState<number>(1);
  const [catatan, setCatatan] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadStok();
    } else {
      // Reset state on close
      setUkuran('standar');
      setKategori('');
      setQty(1);
      setCatatan('');
    }
  }, [isOpen, outletId]);

  // Pastikan Qty tidak melebihi sisa stok saat berganti ukuran
  useEffect(() => {
    const sisa = ukuran === 'standar' ? sisaStokStandar : sisaStokMini;
    if (qty > sisa && sisa > 0) {
      setQty(sisa);
    } else if (sisa === 0) {
      setQty(0);
    } else if (qty === 0 && sisa > 0) {
      setQty(1);
    }
  }, [ukuran, sisaStokStandar, sisaStokMini]);

  const loadStok = async () => {
    setLoading(true);
    try {
      const today = getTodayWIB();
      
      const [stockRes, catRes] = await Promise.all([
        supabase
          .from('inventory_non_topping')
          .select('ukuran, qty_available')
          .eq('outlet_id', outletId)
          .eq('production_date', today)
          .eq('status', 'fresh'),
        supabase
          .from('product_categories')
          .select('id, nama')
          .order('sort_order')
      ]);

      if (stockRes.error) throw stockRes.error;

      let stand = 0;
      let min = 0;
      if (stockRes.data) {
        stockRes.data.forEach((s: any) => {
          if (s.ukuran === 'standar') stand += s.qty_available;
          if (s.ukuran === 'mini') min += s.qty_available;
        });
      }
      
      setSisaStokStandar(stand);
      setSisaStokMini(min);
      
      if (catRes.data) {
        setCategories(catRes.data);
        if (catRes.data.length > 0 && !kategori) {
          setKategori(catRes.data[0].nama);
        }
      }
      
    } catch (err) {
      console.error('Failed to load stock data:', err);
      toast.error('Gagal memuat sisa stok donat');
    } finally {
      setLoading(false);
    }
  };

  const sisaStokAktif = ukuran === 'standar' ? sisaStokStandar : sisaStokMini;
  const isOutOfStock = sisaStokAktif === 0;

  const handleSubmit = async () => {
    if (qty < 1) {
      toast.error('Jumlah minimal 1');
      return;
    }
    if (qty > sisaStokAktif) {
      toast.error(`Sisa stok tidak mencukupi. Maksimal: ${sisaStokAktif}`);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/channel-sales/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId,
          channelKey: channel.channel_key,
          ukuran,
          kategori,
          qty,
          catatan
        })
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Gagal menyimpan transaksi');
      }

      toast.success('Stok berhasil dipotong!');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Gagal memotong stok', { description: error.message });
      console.error('Save channel sales error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
              {channel.icon_url ? (
                <img src={channel.icon_url} alt={channel.channel_name} className="w-full h-full object-cover" />
              ) : (
                <ShoppingBag className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Potong Stok: {channel.channel_name}</h3>
              <p className="text-[11px] text-slate-500">Mencatat penjualan untuk memotong stok fisik donat</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              <p className="text-xs text-slate-500">Mengecek sisa stok hari ini...</p>
            </div>
          ) : (
            <>
              {/* Alert Peringatan Stok */}
              <div className="p-3 bg-blue-50 text-blue-800 border border-blue-100 rounded-xl text-xs flex gap-2">
                <div className="mt-0.5">ℹ️</div>
                <p>Fitur ini <b>hanya memotong sisa stok donat non-topping</b>. Tidak memengaruhi nominal Omzet Kasir dan tidak membutuhkan input nama varian rasa.</p>
              </div>

              {/* Pilihan Kategori, Ukuran & Sisa Stok */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">
                    Kategori Donat <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.nama}>{c.nama}</option>
                    ))}
                    {categories.length === 0 && <option value="Donat Umum">Donat Umum</option>}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">
                    Ukuran Donat <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={ukuran}
                    onChange={(e) => setUkuran(e.target.value as 'standar' | 'mini')}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white"
                  >
                    <option value="standar">Donat Standar</option>
                    <option value="mini">Donat Mini</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider text-right">
                    Sisa Stok Hari Ini
                  </label>
                  <div className={`h-10 flex items-center justify-end px-3 border rounded-xl font-bold ${
                    isOutOfStock 
                      ? 'bg-red-50 border-red-200 text-red-600' 
                      : 'bg-green-50 border-green-200 text-green-700'
                  }`}>
                    {sisaStokAktif} pcs
                  </div>
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">
                  Jumlah Donat <span className="text-red-500">*</span>
                </label>
                <div className={`flex items-center gap-1 border rounded-xl bg-white p-1 ${isOutOfStock ? 'border-red-200 bg-slate-50' : 'border-slate-200'}`}>
                  <button
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={sisaStokAktif}
                    disabled={isOutOfStock}
                    value={qty}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (val > sisaStokAktif) {
                        setQty(sisaStokAktif);
                        toast.error(`Maksimal stok tersedia adalah ${sisaStokAktif}`);
                      } else {
                        setQty(val);
                      }
                    }}
                    className="w-full text-center text-lg font-bold bg-transparent focus:outline-none disabled:text-slate-400"
                  />
                  <button
                    type="button"
                    disabled={isOutOfStock || qty >= sisaStokAktif}
                    onClick={() => setQty(q => Math.min(sisaStokAktif, q + 1))}
                    className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {isOutOfStock && (
                  <p className="text-xs text-red-500 mt-2 font-medium">Stok donat {ukuran} sudah habis hari ini.</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2 uppercase tracking-wider">
                  Catatan / ID Pesanan
                </label>
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Misal: Pesanan ShopeeFood #1234"
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-white resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || saving || isOutOfStock || qty < 1}
            className="flex-[2] py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Potong Stok Sekarang
          </button>
        </div>

      </div>
    </div>
  );
}
