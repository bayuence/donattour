'use client';

import { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { upsertProduct, deleteProduct, uploadProductImage, getOutletProductionCost, upsertOutletProductionCost } from '@/lib/db';
import type { ProductWithCategory, ProductCategory, Outlet } from '@/lib/types';
import { inputClass, formatRp } from './shared';

interface TabVarianProps {
  outlet: Outlet;
  varianList: ProductWithCategory[];
  jenisList: ProductCategory[];
  refreshData: () => Promise<void>;
}

export function TabVarian({ outlet, varianList, jenisList, refreshData }: TabVarianProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Harga Dasar States
  const [hargaPolos, setHargaPolos] = useState(0);
  const [hargaJualPolos, setHargaJualPolos] = useState(0);
  const [hargaPolosMini, setHargaPolosMini] = useState(0);
  const [hargaJualPolosMini, setHargaJualPolosMini] = useState(0);

  // Form States
  const [editingVarianIdStandar, setEditingVarianIdStandar] = useState<string | null>(null);
  const [editingVarianIdMini, setEditingVarianIdMini] = useState<string | null>(null);
  const [varianForm, setVarianForm] = useState({ 
    nama: '', category_id: '', image_url: '', 
    biaya_topping_standar: '0', harga_jual_standar: '0', 
    biaya_topping_mini: '0', harga_jual_mini: '0',
    aktif_standar: true, aktif_mini: true
  });
  const [varianImageFile, setVarianImageFile] = useState<File | null>(null);
  const [varianImagePreview, setVarianImagePreview] = useState<string>('');

  useEffect(() => {
    async function loadBasePrices() {
      const dataCost = await getOutletProductionCost(outlet.id);
      if (dataCost) {
        setHargaPolos(dataCost.cost_polos_standar || 0);
        setHargaJualPolos(dataCost.harga_jual_polos_standar || 0);
        setHargaPolosMini(dataCost.cost_polos_mini || 0);
        setHargaJualPolosMini(dataCost.harga_jual_polos_mini || 0);
      }
    }
    loadBasePrices();
  }, [outlet.id]);

  const resetForm = () => {
    setShowForm(false);
    setEditingVarianIdStandar(null);
    setEditingVarianIdMini(null);
    setVarianForm({ nama: '', category_id: '', image_url: '', biaya_topping_standar: '0', harga_jual_standar: '0', biaya_topping_mini: '0', harga_jual_mini: '0', aktif_standar: true, aktif_mini: true });
    setVarianImageFile(null);
    setVarianImagePreview('');
    if (varianImagePreview && varianImagePreview.startsWith('blob:')) URL.revokeObjectURL(varianImagePreview);
  };

  const handleVarianImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVarianImageFile(file);
    const preview = URL.createObjectURL(file);
    setVarianImagePreview(preview);
  };

  const handleUpdateBasePrice = async () => {
    setIsSaving(true);
    try {
      const ok = await upsertOutletProductionCost({
        outlet_id: outlet.id,
        cost_polos_standar: hargaPolos,
        harga_jual_polos_standar: hargaJualPolos,
        cost_polos_mini: hargaPolosMini,
        harga_jual_polos_mini: hargaJualPolosMini
      });
      if (ok) {
        toast.success('Harga Dasar Diperbarui', {
          description: `Base price untuk produksi otomatis varian donat telah disimpan untuk outlet ${outlet.nama}.`
        });
      } else {
        toast.error('Gagal memperbarui harga dasar. Periksa koneksi.');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan harga dasar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddVarian = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalImageUrl = varianForm.image_url;
      
      if (varianImageFile) {
        toast.info('Mengunggah gambar...');
        const uploadedUrl = await uploadProductImage(varianImageFile);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          toast.error('Gagal unggah gambar, menggunakan URL lama/kosong');
        }
      }

      let successStandar = true;
      let successMini = true;

      if (varianForm.aktif_standar) {
        successStandar = await upsertProduct({
          id: editingVarianIdStandar || undefined,
          nama: varianForm.nama,
          category_id: varianForm.category_id,
          image_url: finalImageUrl,
          harga_pokok_penjualan: Number(hargaPolos) + Number(varianForm.biaya_topping_standar),
          harga_jual: Number(varianForm.harga_jual_standar),
          ukuran: 'standar',
          tipe_produk: 'donat_varian',
          is_active: true
        });
      } else if (editingVarianIdStandar) {
        await deleteProduct(editingVarianIdStandar);
      }

      if (varianForm.aktif_mini) {
        successMini = await upsertProduct({
          id: editingVarianIdMini || undefined,
          nama: varianForm.nama,
          category_id: varianForm.category_id,
          image_url: finalImageUrl,
          harga_pokok_penjualan: Number(hargaPolosMini) + Number(varianForm.biaya_topping_mini),
          harga_jual: Number(varianForm.harga_jual_mini),
          ukuran: 'mini',
          tipe_produk: 'donat_varian',
          is_active: true
        });
      } else if (editingVarianIdMini) {
        await deleteProduct(editingVarianIdMini);
      }

      if (successStandar && successMini) { 
        toast.success(editingVarianIdStandar || editingVarianIdMini ? 'Varian Donat diperbarui' : 'Varian Donat baru ditambahkan', {
          description: `Rasa "${varianForm.nama}" telah berhasil disimpan.`,
        }); 
        resetForm(); 
        await refreshData(); 
      }
      else toast.error('Gagal menyimpan beberapa ukuran varian', { description: 'Periksa data dan coba lagi.' });
    } catch (error) {
      console.error('Error saving variant:', error);
      toast.error('Terjadi kesalahan saat menyimpan varian');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVarianGroup = async (standarId?: string, miniId?: string) => {
    if (!confirm('Hapus seluruh varian ukuran (Standar & Mini) untuk rasa ini?')) return;
    try {
      if (standarId) await deleteProduct(standarId);
      if (miniId) await deleteProduct(miniId);
      toast.success('Rasa Varian dihapus', { description: 'Semua ukuran untuk rasa ini telah dihapus.' });
      await refreshData();
    } catch (error) {
      console.error('Error deleting varian group:', error);
      toast.error('Gagal menghapus varian');
    }
  };

  const groupedVarian = useMemo(() => {
    const map = new Map<string, any>();
    varianList.forEach(v => {
      const key = `${v.nama}_${v.category_id}`;
      if (!map.has(key)) {
        map.set(key, { nama: v.nama, category_id: v.category_id || '', category: v.category, image_url: v.image_url || '' });
      }
      const entry = map.get(key)!;
      if (v.ukuran === 'standar') entry.standar = v;
      if (v.ukuran === 'mini') entry.mini = v;
    });
    return Array.from(map.values());
  }, [varianList]);

  return (
    <div className="space-y-6">
      {/* HARGA DASAR INTEGRATED */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-tight">HPP & Harga Jual Polos</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              <span className="text-amber-600 font-bold">{outlet.nama}</span> — acuan HPP semua varian
            </p>
          </div>
          <button onClick={handleUpdateBasePrice} disabled={isSaving}
            className="flex items-center gap-1.5 h-9 px-4 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all active:scale-95 disabled:opacity-30 shrink-0">
            {isSaving ? <Icons.Loader2 size={13} className="animate-spin" /> : <Icons.Save size={13} />}
            Simpan
          </button>
        </div>

        <div className="flex items-center gap-4 mb-3 px-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">HPP / Modal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Harga Jual (tanpa topping)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 bg-amber-500 rounded-md flex items-center justify-center shrink-0">
            <Icons.Maximize size={11} className="text-white" />
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Standar</span>
          <div className="h-px flex-1 bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-3 bg-red-50 rounded-2xl border border-red-100 hover:border-red-300 transition-all">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">HPP</p>
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-red-300">Rp</span>
              <CurrencyInput value={hargaPolos}
                onChange={(e) => setHargaPolos(Number(e.target.value))}
                className="w-full bg-transparent text-lg font-black text-red-600 focus:outline-none min-w-0" />
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-2xl border border-green-100 hover:border-green-300 transition-all">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-green-600">Harga Jual</p>
              {hargaJualPolos > 0 && hargaPolos > 0 && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${hargaJualPolos >= hargaPolos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {hargaJualPolos >= hargaPolos ? `+${(hargaJualPolos - hargaPolos).toLocaleString('id-ID')}` : `−${(hargaPolos - hargaJualPolos).toLocaleString('id-ID')}`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-green-300">Rp</span>
              <CurrencyInput value={hargaJualPolos}
                onChange={(e) => setHargaJualPolos(Number(e.target.value))}
                className="w-full bg-transparent text-lg font-black text-green-700 focus:outline-none min-w-0" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 bg-slate-600 rounded-md flex items-center justify-center shrink-0">
            <Icons.Minimize size={11} className="text-white" />
          </div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mini</span>
          <div className="h-px flex-1 bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-red-50 rounded-2xl border border-red-100 hover:border-red-300 transition-all">
            <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">HPP</p>
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-red-300">Rp</span>
              <CurrencyInput value={hargaPolosMini}
                onChange={(e) => setHargaPolosMini(Number(e.target.value))}
                className="w-full bg-transparent text-lg font-black text-red-600 focus:outline-none min-w-0" />
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-2xl border border-green-100 hover:border-green-300 transition-all">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-green-600">Harga Jual</p>
              {hargaJualPolosMini > 0 && hargaPolosMini > 0 && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${hargaJualPolosMini >= hargaPolosMini ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {hargaJualPolosMini >= hargaPolosMini ? `+${(hargaJualPolosMini - hargaPolosMini).toLocaleString('id-ID')}` : `−${(hargaPolosMini - hargaJualPolosMini).toLocaleString('id-ID')}`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-green-300">Rp</span>
              <CurrencyInput value={hargaJualPolosMini}
                onChange={(e) => setHargaJualPolosMini(Number(e.target.value))}
                className="w-full bg-transparent text-lg font-black text-green-700 focus:outline-none min-w-0" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Pilihan Rasa Donat</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{varianList.length} varian terdaftar</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(!showForm); }} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">
            {showForm ? 'BATAL' : '+ TAMBAH'}
          </Button>
        </div>

        {/* Form Tambah/Edit */}
        {showForm && (
          <form onSubmit={handleAddVarian} className="p-5 bg-amber-50/50 border-b border-amber-100 space-y-4 animate-in fade-in slide-in-from-top-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">{editingVarianIdStandar || editingVarianIdMini ? '✏ Edit Varian (Multi-Ukuran)' : '+ Tambah Varian Rasa'}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Nama Rasa</label>
                <input value={varianForm.nama} onChange={(e) => setVarianForm({ ...varianForm, nama: e.target.value })} className={inputClass} placeholder="Choco Crunchy" required />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Kategori</label>
                <select value={varianForm.category_id} onChange={(e) => setVarianForm({ ...varianForm, category_id: e.target.value })} className={inputClass} required>
                  <option value="">Pilih Kategori</option>
                  {jenisList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Foto Rasa</label>
                <div className="flex gap-2 items-center">
                  <input type="file" accept="image/*" onChange={handleVarianImageChange} className={`${inputClass} flex-1`} />
                  {varianImagePreview && <img src={varianImagePreview} className="w-10 h-10 rounded-lg object-cover border" alt="preview" />}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Box Standar */}
              <div className={`p-4 rounded-2xl border ${varianForm.aktif_standar ? 'bg-white border-amber-200' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-black text-amber-600 uppercase tracking-wider">Ukuran Standar</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={varianForm.aktif_standar} onChange={(e) => setVarianForm({...varianForm, aktif_standar: e.target.checked})} className="accent-amber-500 w-4 h-4" />
                    <span className="text-[10px] font-bold text-slate-500">Aktifkan</span>
                  </label>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">HPP Polos (Otomatis)</label>
                      <input value={formatRp(hargaPolos)} disabled className="w-full px-3 py-2 bg-slate-100 border border-slate-100 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-amber-500 block mb-1">+ Biaya Topping</label>
                      <CurrencyInput disabled={!varianForm.aktif_standar} value={varianForm.biaya_topping_standar} onChange={(e) => setVarianForm({...varianForm, biaya_topping_standar: e.target.value})} className="w-full px-3 py-2 bg-amber-50 focus:bg-white border border-amber-100 rounded-xl text-xs font-bold text-slate-700 outline-none" placeholder="0" />
                    </div>
                  </div>
                  <div>
                      <label className="text-[9px] font-black tracking-widest text-slate-400 block mb-1">HARGA JUAL KASIR</label>
                      <CurrencyInput disabled={!varianForm.aktif_standar} value={varianForm.harga_jual_standar} onChange={(e) => setVarianForm({...varianForm, harga_jual_standar: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-amber-500 rounded-xl text-sm font-black text-slate-800 outline-none placeholder:text-slate-300 placeholder:font-medium" placeholder="Harga Jual" />
                  </div>
                  <div className="text-[9px] flex justify-between font-bold">
                    <span className="text-slate-400">Total HPP: {formatRp(hargaPolos + Number(varianForm.biaya_topping_standar))}</span>
                    <span className={(Number(varianForm.harga_jual_standar) - (hargaPolos + Number(varianForm.biaya_topping_standar))) >= 0 ? "text-emerald-500" : "text-rose-500"}>
                      Laba: {formatRp(Number(varianForm.harga_jual_standar) - (hargaPolos + Number(varianForm.biaya_topping_standar)))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box Mini */}
              <div className={`p-4 rounded-2xl border ${varianForm.aktif_mini ? 'bg-white border-blue-200' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-black text-blue-600 uppercase tracking-wider">Ukuran Mini</h4>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={varianForm.aktif_mini} onChange={(e) => setVarianForm({...varianForm, aktif_mini: e.target.checked})} className="accent-blue-500 w-4 h-4" />
                    <span className="text-[10px] font-bold text-slate-500">Aktifkan</span>
                  </label>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">HPP Polos (Otomatis)</label>
                      <input value={formatRp(hargaPolosMini)} disabled className="w-full px-3 py-2 bg-slate-100 border border-slate-100 rounded-xl text-xs font-medium text-slate-500 cursor-not-allowed" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-blue-500 block mb-1">+ Biaya Topping</label>
                      <CurrencyInput disabled={!varianForm.aktif_mini} value={varianForm.biaya_topping_mini} onChange={(e) => setVarianForm({...varianForm, biaya_topping_mini: e.target.value})} className="w-full px-3 py-2 bg-blue-50 focus:bg-white border border-blue-100 rounded-xl text-xs font-bold text-slate-700 outline-none" placeholder="0" />
                    </div>
                  </div>
                  <div>
                      <label className="text-[9px] font-black tracking-widest text-slate-400 block mb-1">HARGA JUAL KASIR</label>
                      <CurrencyInput disabled={!varianForm.aktif_mini} value={varianForm.harga_jual_mini} onChange={(e) => setVarianForm({...varianForm, harga_jual_mini: e.target.value})} className="w-full px-4 py-3 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-xl text-sm font-black text-slate-800 outline-none placeholder:text-slate-300 placeholder:font-medium" placeholder="Harga Jual" />
                  </div>
                  <div className="text-[9px] flex justify-between font-bold">
                    <span className="text-slate-400">Total HPP: {formatRp(hargaPolosMini + Number(varianForm.biaya_topping_mini))}</span>
                    <span className={(Number(varianForm.harga_jual_mini) - (hargaPolosMini + Number(varianForm.biaya_topping_mini))) >= 0 ? "text-emerald-500" : "text-rose-500"}>
                      Laba: {formatRp(Number(varianForm.harga_jual_mini) - (hargaPolosMini + Number(varianForm.biaya_topping_mini)))}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs px-8 py-3 rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
              {isSaving ? 'Menyimpan...' : 'SIMPAN SEMUA UKURAN'}
            </Button>
          </form>
        )}

        {/* Column header */}
        {groupedVarian.length > 0 && (
          <div className="grid grid-cols-[56px_1.5fr_1fr_1.5fr_1.5fr_80px] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100 hidden md:grid">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Foto</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Rasa (Kategori)</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Ketersediaan</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">Harga Standar</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-blue-500">Harga Mini</span>
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 text-right">Aksi</span>
          </div>
        )}

        {/* List rows - Grouped Varian */}
        <div className="divide-y divide-slate-50">
          {groupedVarian.map((v, idx) => {
            const { standar, mini } = v;
            const hasStandar = !!standar;
            const hasMini = !!mini;
            
            const standarMargin = hasStandar ? standar.harga_jual - (standar.harga_pokok_penjualan || 0) : 0;
            const miniMargin = hasMini ? mini.harga_jual - (mini.harga_pokok_penjualan || 0) : 0;

            return (
              <div key={`${v.nama}_${idx}`} className={`grid grid-cols-1 md:grid-cols-[56px_1.5fr_1fr_1.5fr_1.5fr_80px] gap-3 md:items-center px-4 py-3 hover:bg-amber-50/40 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                {/* Foto */}
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 shrink-0 hidden md:block">
                  {v.image_url
                    ? <img src={v.image_url} alt={v.nama} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-slate-300"><Icons.Image size={20} /></div>
                  }
                </div>
                {/* Nama & Kategori */}
                <div className="min-w-0">
                  <p className="font-black text-slate-800 text-sm leading-tight mb-1">{v.nama}</p>
                  <span className="text-[9px] font-bold text-slate-500 bg-white border px-1.5 py-0.5 rounded shadow-sm">
                    {v.category?.nama || '—'}
                  </span>
                </div>
                {/* Ketersediaan */}
                <div className="flex gap-1">
                  {hasStandar ? <span className="w-2 h-2 rounded-full bg-amber-500" title="Standar Active"></span> : <span className="w-2 h-2 rounded-full bg-slate-200" title="Standar Inactive"></span>}
                  {hasMini ? <span className="w-2 h-2 rounded-full bg-blue-500" title="Mini Active"></span> : <span className="w-2 h-2 rounded-full bg-slate-200" title="Mini Inactive"></span>}
                </div>
                {/* Harga Standar */}
                <div>
                  {hasStandar ? (
                    <>
                      <p className="text-[11px] font-black text-slate-800">{formatRp(standar.harga_jual)}</p>
                      <p className="text-[9px] font-medium text-slate-400 line-clamp-1">HPP: {formatRp(standar.harga_pokok_penjualan)}</p>
                      <p className={`text-[9px] font-bold ${standarMargin >= 0 ? "text-emerald-500" : "text-rose-500"}`}>Laba: {formatRp(standarMargin)}</p>
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-300 font-bold italic">- Tidak Jual -</p>
                  )}
                </div>
                {/* Harga Mini */}
                <div>
                  {hasMini ? (
                    <>
                      <p className="text-[11px] font-black text-slate-800">{formatRp(mini.harga_jual)}</p>
                      <p className="text-[9px] font-medium text-slate-400 line-clamp-1">HPP: {formatRp(mini.harga_pokok_penjualan)}</p>
                      <p className={`text-[9px] font-bold ${miniMargin >= 0 ? "text-emerald-500" : "text-rose-500"}`}>Laba: {formatRp(miniMargin)}</p>
                    </>
                  ) : (
                    <p className="text-[10px] text-slate-300 font-bold italic">- Tidak Jual -</p>
                  )}
                </div>
                
                {/* Aksi */}
                <div className="flex items-center gap-1.5 md:justify-end mt-2 md:mt-0">
                  <button
                    onClick={() => {
                      setEditingVarianIdStandar(standar?.id || null);
                      setEditingVarianIdMini(mini?.id || null);
                      setVarianForm({
                        nama: v.nama,
                        category_id: v.category_id || '',
                        image_url: v.image_url || '',
                        biaya_topping_standar: String(standar ? ((standar.harga_pokok_penjualan || 0) - hargaPolos) : 0),
                        harga_jual_standar: String(standar ? standar.harga_jual : 0),
                        aktif_standar: hasStandar,
                        biaya_topping_mini: String(mini ? ((mini.harga_pokok_penjualan || 0) - hargaPolosMini) : 0),
                        harga_jual_mini: String(mini ? mini.harga_jual : 0),
                        aktif_mini: hasMini,
                      });
                      setVarianImagePreview(v.image_url || '');
                      setShowForm(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full flex-1 md:flex-none md:w-8 h-8 bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                  >
                    <Icons.Edit3 size={13} /> <span className="md:hidden ml-2 text-xs font-bold">Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteVarianGroup(standar?.id, mini?.id)}
                    className="w-full flex-1 md:flex-none md:w-8 h-8 bg-red-50 hover:bg-red-500 text-red-400 hover:text-white rounded-lg flex items-center justify-center transition-all"
                  >
                    <Icons.Trash2 size={13} /> <span className="md:hidden ml-2 text-xs font-bold">Hapus</span>
                  </button>
                </div>
              </div>
            );
          })}
          {groupedVarian.length === 0 && (
            <div className="text-center py-10">
              <p className="text-slate-400 font-bold text-sm">Belum ada varian rasa</p>
              <p className="text-slate-300 text-xs mt-1">Tambahkan varian donat pertama Anda</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
