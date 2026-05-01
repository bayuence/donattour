'use client';

import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { upsertCustomTemplate, deleteCustomTemplate, getProductCategories, getAllProducts, getCustomModeConfigs } from '@/lib/db';
import type { ProductCustomTemplate, CustomModePricing, ProductCategory, Product, CustomModeConfig } from '@/lib/types';
import { inputClass, formatRp } from './shared';
import ModePricingManager from './ModePricingManager';
import { TabModeTypes } from './TabModeTypes';

interface TabCustomProps {
  customPaketList: ProductCustomTemplate[];
  refreshData: () => Promise<void>;
}

const emptyForm = {
  kode: '',
  nama: '',
  kapasitas: '',
  ukuran_donat: 'standar' as 'standar' | 'mini',
  // New flexible pricing structure
  mode_pricing: [] as CustomModePricing[],
  // Legacy fields removed - will be deleted from database eventually
  deskripsi: '',
};

export function TabCustom({ customPaketList, refreshData }: TabCustomProps) {
  const [subTab, setSubTab] = useState<'template' | 'mode'>('template');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  
  // Data for pricing managers
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [toppingProducts, setToppingProducts] = useState<Product[]>([]);
  const [modeConfigs, setModeConfigs] = useState<CustomModeConfig[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Load categories, topping products, and mode configs
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingData(true);
      try {
        const [cats, products, configs] = await Promise.all([
          getProductCategories(),
          getAllProducts(),
          getCustomModeConfigs()
        ]);
        setCategories(cats);
        // Filter products with tipe_produk = 'tambahan'
        setToppingProducts(products.filter(p => p.tipe_produk === 'tambahan'));
        setModeConfigs(configs);
      } catch (err) {
        console.error('Error loading data:', err);
        toast.error('Gagal memuat data kategori dan topping');
      } finally {
        setIsLoadingData(false);
      }
    };
    loadData();
  }, []);

  const refreshModeConfigs = async () => {
    try {
      const configs = await getCustomModeConfigs();
      setModeConfigs(configs);
    } catch (err) {
      console.error('Error refreshing mode configs:', err);
    }
  };

  const F = (key: keyof typeof emptyForm, val: any) => setForm(f => ({ ...f, [key]: val }));

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama || !form.kapasitas) {
      toast.error('Nama dan kapasitas wajib diisi');
      return;
    }
    if (!form.mode_pricing || form.mode_pricing.length === 0) {
      toast.error('Minimal tambahkan 1 mode pricing');
      return;
    }
    setIsSaving(true);
    try {
      const ok = await upsertCustomTemplate({
        id: editingId || undefined,
        kode: form.kode.trim() || undefined,
        nama: form.nama.trim(),
        kapasitas: Number(form.kapasitas),
        ukuran_donat: form.ukuran_donat,
        
        // New flexible pricing structure
        mode_pricing: form.mode_pricing,
        
        // Legacy fields set to 0 (will be removed in future)
        harga_satuan_default: 0,
        harga_klasik_full: 0,
        harga_reguler_full: 0,
        harga_premium_full: 0,
        
        deskripsi: form.deskripsi.trim() || undefined,
        is_active: true,
      });

      if (ok) {
        toast.success(editingId ? 'Template diperbarui ✓' : 'Template baru ditambahkan ✓');
        resetForm();
        await refreshData();
      } else {
        toast.error('Gagal menyimpan, coba lagi');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const ok = await deleteCustomTemplate(id);
      if (ok) {
        toast.success('Template dihapus');
        setConfirmDeleteId(null);
        await refreshData();
      } else {
        toast.error('Gagal menghapus template');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghapus');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (c: ProductCustomTemplate) => {
    setEditingId(c.id);
    setForm({
      kode: c.kode || '',
      nama: c.nama,
      kapasitas: String(c.kapasitas),
      ukuran_donat: c.ukuran_donat as 'standar' | 'mini',
      
      // New flexible pricing structure
      mode_pricing: c.mode_pricing || [],
      
      deskripsi: c.deskripsi || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs */}
      <div className="flex gap-2 bg-white rounded-2xl p-2 border border-slate-100 shadow-sm">
        <button
          onClick={() => setSubTab('template')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${
            subTab === 'template'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Icons.FileText size={18} />
          Template Custom
        </button>
        <button
          onClick={() => setSubTab('mode')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all ${
            subTab === 'mode'
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Icons.Settings size={18} />
          Kelola Mode Custom
        </button>
      </div>

      {/* Content */}
      {subTab === 'mode' ? (
        <TabModeTypes
          modeConfigs={modeConfigs}
          categories={categories}
          refreshData={refreshModeConfigs}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Custom Order Template</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Atur paket custom yang bisa dipesan oleh pelanggan</p>
        </div>
        <Button
          onClick={() => { if (showForm && editingId) resetForm(); else setShowForm(v => !v); }}
          className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors"
        >
          {showForm ? 'BATAL' : '+ TAMBAH TEMPLATE'}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-amber-200 space-y-4 animate-in fade-in slide-in-from-top-4">
          <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">
            {editingId ? '✏️ Edit Template' : '➕ Template Baru'}
          </p>

          {/* Identitas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Kode Struk</label>
              <input
                value={form.kode}
                onChange={e => F('kode', e.target.value.toUpperCase())}
                className={inputClass} placeholder="CSTM6" maxLength={8}
              />
              <p className="text-[8px] text-slate-300 ml-1">Misal: CSTM3, CSTM6, MINI12</p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nama Template *</label>
              <input
                value={form.nama}
                onChange={e => F('nama', e.target.value)}
                className={inputClass} placeholder="Custom Box Isi 6" required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Kapasitas (pcs) *</label>
              <input
                type="number" min="1" value={form.kapasitas}
                onChange={e => F('kapasitas', e.target.value)}
                className={inputClass} placeholder="6" required
              />
            </div>
          </div>

          {/* Ukuran */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ukuran Donat</label>
              <select
                value={form.ukuran_donat}
                onChange={e => F('ukuran_donat', e.target.value)}
                className={inputClass}
              >
                <option value="standar">🍩 Standar</option>
                <option value="mini">🤏 Mini</option>
              </select>
              <p className="text-[8px] text-slate-300 ml-1">
                {form.ukuran_donat === 'mini'
                  ? 'Mini: 1 box standar muat 2× lipat'
                  : 'Standar: 1 box sesuai kapasitas'}
              </p>
            </div>
          </div>

          {/* Harga per Mode */}
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3">💰 Harga Jual per Mode</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Icons.AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-700">
                  <p className="font-semibold mb-1">Sistem Baru</p>
                  <p>Gunakan "Mode Pricing Configuration" di bawah untuk mengatur harga, HPP, margin, diskon, dan topping untuk setiap mode penjualan.</p>
                </div>
              </div>
            </div>
          </div>

          {/* NEW: Mode Pricing Manager (with integrated topping) */}
          <div className="border-2 border-slate-900 rounded-2xl p-6 bg-slate-50">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Icons.Sparkles size={18} className="text-amber-500" />
                Mode Pricing Configuration
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Atur harga, HPP, margin, diskon, dan topping untuk setiap mode penjualan
              </p>
            </div>
            {isLoadingData ? (
              <div className="text-center py-8">
                <Icons.Loader2 size={32} className="animate-spin mx-auto text-slate-400" />
                <p className="text-xs text-slate-400 mt-2">Memuat data...</p>
              </div>
            ) : (
              <ModePricingManager
                modes={form.mode_pricing}
                kapasitas={Number(form.kapasitas) || 6}
                ukuranDonat={form.ukuran_donat}
                categories={categories}
                toppingProducts={toppingProducts}
                availableModeTypes={modeConfigs}
                onChange={(modes) => F('mode_pricing', modes)}
              />
            )}
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Panduan Kasir (opsional)</label>
            <textarea
              value={form.deskripsi}
              onChange={e => F('deskripsi', e.target.value)}
              className={`${inputClass} h-20 resize-none`}
              placeholder="Misal: Box standar isi 6. Tanya pelanggan mode apa yang diinginkan."
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit" disabled={isSaving}
              className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 px-8"
            >
              {isSaving ? 'Menyimpan...' : (editingId ? '💾 Simpan Perubahan' : '✓ Tambah Template')}
            </Button>
            <Button type="button" onClick={resetForm} className="bg-slate-100 text-slate-500 font-black text-xs rounded-xl hover:bg-slate-200 transition-colors">
              Batal
            </Button>
          </div>
        </form>
      )}

      {/* Daftar Kartu Template */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {customPaketList.map(c => (
          <div
            key={c.id}
            className="group relative bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-amber-200 transition-all overflow-hidden flex flex-col"
          >
            {/* Header Kartu */}
            <div className="p-5 pb-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <Icons.Palette size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {c.kode && (
                      <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">{c.kode}</span>
                    )}
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg uppercase">
                      {c.ukuran_donat} • {c.kapasitas} pcs
                    </span>
                  </div>
                  <h4 className="font-black text-slate-900 text-sm leading-tight">{c.nama}</h4>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {c.allow_mix && <span className="text-[8px] bg-orange-50 text-orange-600 font-black px-1.5 py-0.5 rounded">🎨 Mix</span>}
                    {c.allow_random && <span className="text-[8px] bg-purple-50 text-purple-600 font-black px-1.5 py-0.5 rounded">🎲 Acak</span>}
                    {c.enable_tulisan && <span className="text-[8px] bg-slate-100 text-slate-500 font-black px-1.5 py-0.5 rounded">✍️ Tulisan</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabel Harga - NEW: Mode Pricing */}
            <div className="mx-4 mb-3 bg-slate-50 rounded-xl p-3 space-y-1.5">
              {c.mode_pricing && c.mode_pricing.length > 0 ? (
                // Display new mode pricing
                c.mode_pricing.map((mode: any, idx: number) => (
                  mode.is_enabled && (
                    <div key={idx} className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-semibold">📦 {mode.mode_label}</span>
                      <span className="font-black text-slate-700">{formatRp(mode.harga_jual)}</span>
                    </div>
                  )
                ))
              ) : (
                // Fallback to legacy pricing if mode_pricing is empty
                <>
                  {c.harga_klasik_full > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-semibold">⭐ Full Klasik</span>
                      <span className="font-black text-slate-700">{formatRp(c.harga_klasik_full)}</span>
                    </div>
                  )}
                  {c.harga_reguler_full > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-semibold">🍩 Full Reguler</span>
                      <span className="font-black text-slate-700">{formatRp(c.harga_reguler_full)}</span>
                    </div>
                  )}
                  {c.harga_premium_full > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-semibold">👑 Full Premium</span>
                      <span className="font-black text-slate-700">{formatRp(c.harga_premium_full)}</span>
                    </div>
                  )}
                  {c.allow_mix && c.harga_mix && c.harga_mix > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-semibold">🎨 Mix {c.mix_rasio_reguler}+{c.mix_rasio_premium}</span>
                      <span className="font-black text-slate-700">{formatRp(c.harga_mix)}</span>
                    </div>
                  )}
                  {c.biaya_paket_custom !== undefined && c.biaya_paket_custom >= 0 && (
                    <div className="flex justify-between text-[10px] border-t border-slate-200 pt-1.5 mt-1">
                      <span className="text-slate-400 font-semibold">🖐️ Bebas Pilih (Biaya)</span>
                      <span className="font-black text-slate-700">+{formatRp(c.biaya_paket_custom)}</span>
                    </div>
                  )}
                </>
              )}
              
              {/* Discount section (applies to both new and legacy) */}
              {((c.diskon_persen || 0) > 0 || (c.diskon_nominal || 0) > 0) && (
                <div className="flex justify-between text-[10px] border-t border-rose-100 pt-1.5">
                  <span className="text-rose-400 font-bold">🏷️ Diskon</span>
                  <span className="font-black text-rose-500">
                    {(c.diskon_persen || 0) > 0 ? `${c.diskon_persen}%` : formatRp(c.diskon_nominal || 0)}
                  </span>
                </div>
              )}
              
              {/* Show message if no pricing configured */}
              {(!c.mode_pricing || c.mode_pricing.length === 0) && 
               c.harga_klasik_full === 0 && c.harga_reguler_full === 0 && c.harga_premium_full === 0 && (
                <div className="text-center py-2">
                  <span className="text-[9px] text-slate-400 italic">Belum ada harga dikonfigurasi</span>
                </div>
              )}
            </div>

            {/* Deskripsi */}
            {c.deskripsi && (
              <p className="px-4 pb-3 text-[9px] text-slate-400 italic leading-relaxed">{c.deskripsi}</p>
            )}

            {/* Tombol Aksi */}
            <div className="flex gap-2 p-4 pt-0 mt-auto">
              <button
                onClick={() => startEdit(c)}
                className="flex-1 py-2.5 bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5"
              >
                <Icons.Edit3 size={12} /> Edit
              </button>
              {confirmDeleteId === c.id ? (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-2.5 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px]"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="px-3 py-2.5 bg-red-500 text-white rounded-xl font-black text-[10px] hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {deletingId === c.id ? '...' : 'Hapus!'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(c.id)}
                  className="w-10 py-2.5 bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-all flex items-center justify-center"
                >
                  <Icons.Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}

        {customPaketList.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-200">
            <Icons.Palette size={48} className="mb-3 opacity-30" />
            <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40">Belum ada template custom</p>
            <p className="text-[10px] opacity-30 mt-1">Klik tombol Tambah Template di atas</p>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}
