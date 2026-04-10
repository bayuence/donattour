'use client';

import { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import {
  upsertProduct, deleteProduct, uploadProductImage,
  getOutletProductionCost, upsertOutletProductionCost,
} from '@/lib/db';
import { getAllChannelPricesForOutlet, upsertManyChannelPrices } from '@/lib/db/inventory';
import type {
  ProductWithCategory, ProductCategory, Outlet, KasirMenu, OutletChannelPrice
} from '@/lib/types';
import { inputClass, formatRp } from './shared';

// ─── Peta warna ───────────────────────────────────────────────
const COLOR_MAP: Record<string, { pill: string; input: string; dot: string }> = {
  amber:   { pill: 'bg-amber-100 text-amber-700 border-amber-200',   input: 'bg-amber-50 border-amber-200 focus-within:border-amber-400',   dot: 'bg-amber-500' },
  green:   { pill: 'bg-green-100 text-green-700 border-green-200',   input: 'bg-green-50 border-green-200 focus-within:border-green-400',   dot: 'bg-green-500' },
  orange:  { pill: 'bg-orange-100 text-orange-700 border-orange-200',input: 'bg-orange-50 border-orange-200 focus-within:border-orange-400',dot: 'bg-orange-500' },
  emerald: { pill: 'bg-emerald-100 text-emerald-700 border-emerald-200', input: 'bg-emerald-50 border-emerald-200 focus-within:border-emerald-400', dot: 'bg-emerald-500' },
  blue:    { pill: 'bg-blue-100 text-blue-700 border-blue-200',     input: 'bg-blue-50 border-blue-200 focus-within:border-blue-400',     dot: 'bg-blue-500' },
  violet:  { pill: 'bg-violet-100 text-violet-700 border-violet-200',input: 'bg-violet-50 border-violet-200 focus-within:border-violet-400',dot: 'bg-violet-500' },
  rose:    { pill: 'bg-rose-100 text-rose-700 border-rose-200',     input: 'bg-rose-50 border-rose-200 focus-within:border-rose-400',     dot: 'bg-rose-500' },
  slate:   { pill: 'bg-slate-100 text-slate-600 border-slate-200',  input: 'bg-slate-50 border-slate-200 focus-within:border-slate-400',  dot: 'bg-slate-500' },
};
const cm = (color: string) => COLOR_MAP[color] ?? COLOR_MAP.amber;

// ─── Types ────────────────────────────────────────────────────
interface TabVarianProps {
  outlet: Outlet;
  varianList: ProductWithCategory[];
  jenisList: ProductCategory[];
  kasirMenus: KasirMenu[];
  refreshData: () => Promise<void>;
}

interface VarianForm {
  nama: string;
  category_id: string;
  image_url: string;
  biaya_topping_standar: string;
  harga_jual_standar: string;
  biaya_topping_mini: string;
  harga_jual_mini: string;
  aktif_standar: boolean;
  aktif_mini: boolean;
  channelPrices: Record<string, { standar: string; mini: string }>;
}

const blankForm = (menus: KasirMenu[]): VarianForm => ({
  nama: '', category_id: '', image_url: '',
  biaya_topping_standar: '0', harga_jual_standar: '0',
  biaya_topping_mini: '0', harga_jual_mini: '0',
  aktif_standar: true, aktif_mini: true,
  channelPrices: Object.fromEntries(menus.map(m => [m.slug, { standar: '0', mini: '0' }])),
});

// ─── Main Component ───────────────────────────────────────────
export function TabVarian({ outlet, varianList, jenisList, kasirMenus, refreshData }: TabVarianProps) {
  const [showForm, setShowForm]   = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const [hpp, setHpp]             = useState(0);
  const [jualPolos, setJualPolos] = useState(0);
  const [hppMini, setHppMini]     = useState(0);
  const [jualMini, setJualMini]   = useState(0);
  const [editStandarId, setEditStandarId] = useState<string | null>(null);
  const [editMiniId, setEditMiniId]       = useState<string | null>(null);
  const [form, setForm]           = useState<VarianForm>(() => blankForm(kasirMenus));
  const [imgFile, setImgFile]     = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState('');
  const [channelPrices, setChannelPrices] = useState<OutletChannelPrice[]>([]);

  useEffect(() => {
    (async () => {
      const [cost, prices] = await Promise.all([
        getOutletProductionCost(outlet.id),
        getAllChannelPricesForOutlet(outlet.id),
      ]);
      if (cost) { setHpp(cost.cost_polos_standar || 0); setJualPolos(cost.harga_jual_polos_standar || 0); setHppMini(cost.cost_polos_mini || 0); setJualMini(cost.harga_jual_polos_mini || 0); }
      setChannelPrices(prices);
    })();
  }, [outlet.id]);

  const resetForm = () => {
    setShowForm(false); setEditStandarId(null); setEditMiniId(null);
    setForm(blankForm(kasirMenus));
    setImgFile(null);
    if (imgPreview?.startsWith('blob:')) URL.revokeObjectURL(imgPreview);
    setImgPreview('');
  };

  const cpOf = (pid: string, slug: string) =>
    channelPrices.find(p => p.product_id === pid && p.channel === slug)?.harga_jual ?? 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let imgUrl = form.image_url;
      if (imgFile) {
        toast.info('Mengompres & mengunggah foto...', { duration: 3000 });
        const up = await uploadProductImage(imgFile);
        if (up) imgUrl = up; else toast.error('Gagal unggah gambar');
      }

      // 1. Bantu parse angka yang mungkin ada titik ribuan "9.000" -> 9000
      const parseN = (v: string) => Number(String(v).replace(/\./g, ''));

      let sResult = null;
      let mResult = null;

      if (form.aktif_standar) {
        sResult = await upsertProduct({ 
          id: editStandarId || undefined, 
          nama: form.nama, 
          category_id: form.category_id, 
          image_url: imgUrl, 
          harga_pokok_penjualan: hpp + parseN(form.biaya_topping_standar), 
          harga_jual: parseN(form.harga_jual_standar), 
          ukuran: 'standar', 
          tipe_produk: 'donat_varian', 
          is_active: true 
        });
        if (!sResult) { toast.error('Gagal simpan standar'); setIsSaving(false); return; }
      } else if (editStandarId) await deleteProduct(editStandarId);

      if (form.aktif_mini) {
        mResult = await upsertProduct({ 
          id: editMiniId || undefined, 
          nama: form.nama, 
          category_id: form.category_id, 
          image_url: imgUrl, 
          harga_pokok_penjualan: hppMini + parseN(form.biaya_topping_mini), 
          harga_jual: parseN(form.harga_jual_mini), 
          ukuran: 'mini', 
          tipe_produk: 'donat_varian', 
          is_active: true 
        });
        if (!mResult) { toast.error('Gagal simpan mini'); setIsSaving(false); return; }
      } else if (editMiniId) await deleteProduct(editMiniId);

      // Simpan channel prices menggunakan ID asli dari hasil simpan di atas (Pencegahan ID Bayangan)
      const sId = sResult?.id;
      const mId = mResult?.id;
      
      const payload: Omit<OutletChannelPrice, 'id' | 'created_at' | 'updated_at'>[] = [];
      kasirMenus.forEach(menu => {
        const cp = form.channelPrices[menu.slug] ?? { standar: '0', mini: '0' };
        if (sId && form.aktif_standar && parseN(cp.standar) > 0) {
          payload.push({ outlet_id: outlet.id, product_id: sId, channel: menu.slug, harga_jual: parseN(cp.standar), is_active: true });
        }
        if (mId && form.aktif_mini && parseN(cp.mini) > 0) {
          payload.push({ outlet_id: outlet.id, product_id: mId, channel: menu.slug, harga_jual: parseN(cp.mini), is_active: true });
        }
      });

      if (payload.length > 0) {
        console.log(`[A-Z Fix] Menyelaraskan harga untuk produk: ${form.nama} (UUID: ${sId || mId})`);
        const okPrices = await upsertManyChannelPrices(payload);
        if (!okPrices) toast.warning('Varian tersimpan, namun gagal sinkron harga kanal. Coba simpan ulang.');
      }

      // Refresh state lokal segera agar label 'def' hilang seketika
      const freshPrices = await getAllChannelPricesForOutlet(outlet.id);
      setChannelPrices(freshPrices);

      toast.success(editStandarId || editMiniId ? 'Identitas Varian Disinkronkan ✓' : 'Varian Baru Ditambahkan ✓', {
        description: `"${form.nama}" kini terhubung dengan ID yang benar di Kasir.`
      });
      resetForm();
      await refreshData();
    } catch (err) { console.error(err); toast.error('Terjadi kesalahan'); } finally { setIsSaving(false); }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, any>();
    varianList.forEach(v => {
      const k = `${v.nama}_${v.category_id}`;
      if (!map.has(k)) map.set(k, { nama: v.nama, category_id: v.category_id || '', category: v.category, image_url: v.image_url || '' });
      const e = map.get(k)!;
      if (v.ukuran === 'standar') e.standar = v;
      if (v.ukuran === 'mini')    e.mini    = v;
    });
    return Array.from(map.values());
  }, [varianList]);

  const setCP = (slug: string, field: 'standar' | 'mini', val: string) =>
    setForm(p => ({ ...p, channelPrices: { ...p.channelPrices, [slug]: { ...p.channelPrices[slug], [field]: val } } }));

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── HPP & HARGA DASAR ──────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">HPP & Harga Jual Polos</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Acuan HPP semua varian · <span className="text-amber-600 font-bold">{outlet.nama}</span>
            </p>
          </div>
          <button onClick={async () => {
            setIsSaving(true);
            const ok = await upsertOutletProductionCost({ outlet_id: outlet.id, cost_polos_standar: hpp, harga_jual_polos_standar: jualPolos, cost_polos_mini: hppMini, harga_jual_polos_mini: jualMini });
            setIsSaving(false);
            ok ? toast.success('Harga dasar disimpan') : toast.error('Gagal menyimpan');
          }} disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-500 transition-all active:scale-95 disabled:opacity-30">
            {isSaving ? <Icons.Loader2 size={13} className="animate-spin" /> : <Icons.Save size={13} />}
            Simpan
          </button>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-100">
          {[
            { label: 'Standar', icon: Icons.Maximize, colorDot: 'bg-amber-500', hpp, setHpp, jual: jualPolos, setJual: setJualPolos },
            { label: 'Mini',    icon: Icons.Minimize, colorDot: 'bg-slate-500', hpp: hppMini, setHpp: setHppMini, jual: jualMini, setJual: setJualMini },
          ].map(row => (
            <div key={row.label} className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 ${row.colorDot} rounded-lg flex items-center justify-center`}>
                  <row.icon size={12} className="text-white" />
                </div>
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{row.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-red-400">HPP Modal</p>
                  <div className="flex items-center gap-1 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
                    <span className="text-xs text-red-300 font-black">Rp</span>
                    <CurrencyInput value={row.hpp} onChange={e => row.setHpp(Number(e.target.value))}
                      className="w-full bg-transparent text-base font-black text-red-600 focus:outline-none min-w-0" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Harga Jual</p>
                    {row.jual > 0 && row.hpp > 0 && (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${row.jual >= row.hpp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {row.jual >= row.hpp ? `+${(row.jual - row.hpp).toLocaleString('id-ID')}` : `−${(row.hpp - row.jual).toLocaleString('id-ID')}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 px-3 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <span className="text-xs text-emerald-300 font-black">Rp</span>
                    <CurrencyInput value={row.jual} onChange={e => row.setJual(Number(e.target.value))}
                      className="w-full bg-transparent text-base font-black text-emerald-700 focus:outline-none min-w-0" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PILIHAN RASA DONAT ─────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Pilihan Rasa Donat</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{grouped.length} rasa terdaftar</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(p => !p); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 ${showForm ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20'}`}>
            {showForm ? <><Icons.X size={14} /> Batal</> : <><Icons.Plus size={14} /> Tambah Rasa</>}
          </button>
        </div>

        {/* Form Tambah/Edit */}
        {showForm && (
          <form onSubmit={handleSave} className="border-b border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Form header */}
            <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
              <p className="text-xs font-black text-amber-700 uppercase tracking-widest">
                {editStandarId || editMiniId ? '✏ Edit Varian Rasa' : '+ Tambah Varian Rasa Baru'}
              </p>
              <p className="text-[11px] text-amber-600/70 mt-0.5">Isi informasi rasa dan atur harga untuk setiap kanal kasir</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Identitas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Nama Rasa *</label>
                  <input value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} className={inputClass} placeholder="Contoh: Ceres, Tiramisu" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Kategori *</label>
                  <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className={inputClass} required>
                    <option value="">Pilih Kategori</option>
                    {jenisList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Foto</label>
                  <div className="flex items-center gap-2">
                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (!f) return; setImgFile(f); setImgPreview(URL.createObjectURL(f)); }} className={`${inputClass} flex-1`} />
                    {imgPreview && <img src={imgPreview} className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow shrink-0" alt="preview" />}
                  </div>
                </div>
              </div>

              {/* Ukuran Standar & Mini */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'standar' as const, label: 'Ukuran Standar', aktif: form.aktif_standar, setAktif: (v: boolean) => setForm({ ...form, aktif_standar: v }), color: 'amber', baseHpp: hpp, biaya: form.biaya_topping_standar, setBiaya: (v: string) => setForm({ ...form, biaya_topping_standar: v }), jual: form.harga_jual_standar, setJual: (v: string) => setForm({ ...form, harga_jual_standar: v }) },
                  { key: 'mini'    as const, label: 'Ukuran Mini',    aktif: form.aktif_mini,    setAktif: (v: boolean) => setForm({ ...form, aktif_mini: v }),    color: 'blue',  baseHpp: hppMini, biaya: form.biaya_topping_mini, setBiaya: (v: string) => setForm({ ...form, biaya_topping_mini: v }), jual: form.harga_jual_mini, setJual: (v: string) => setForm({ ...form, harga_jual_mini: v }) },
                ].map(u => (
                  <div key={u.key} className={`rounded-2xl border-2 overflow-hidden transition-all ${u.aktif ? (u.color === 'amber' ? 'border-amber-200 bg-amber-50/30' : 'border-blue-200 bg-blue-50/30') : 'border-slate-100 bg-slate-50 opacity-55'}`}>
                    <div className={`flex justify-between items-center px-4 py-3 ${u.color === 'amber' ? 'bg-amber-100/60' : 'bg-blue-100/60'}`}>
                      <span className={`text-xs font-black uppercase tracking-wider ${u.color === 'amber' ? 'text-amber-700' : 'text-blue-700'}`}>{u.label}</span>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-[10px] font-bold text-slate-500">Aktif</span>
                        <div className={`w-10 h-5 rounded-full transition-all relative cursor-pointer ${u.aktif ? (u.color === 'amber' ? 'bg-amber-500' : 'bg-blue-500') : 'bg-slate-200'}`}
                          onClick={() => u.setAktif(!u.aktif)}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${u.aktif ? 'left-5' : 'left-0.5'}`} />
                        </div>
                      </label>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">HPP Polos</p>
                          <input value={formatRp(u.baseHpp)} disabled className="w-full px-3 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed" />
                        </div>
                        <div className="space-y-1">
                          <p className={`text-[9px] font-black uppercase tracking-wider ${u.color === 'amber' ? 'text-amber-600' : 'text-blue-600'}`}>+ Biaya Topping</p>
                          <CurrencyInput disabled={!u.aktif} value={u.biaya} onChange={e => u.setBiaya(e.target.value)}
                            className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-bold outline-none ${u.color === 'amber' ? 'border-amber-200 focus:border-amber-400' : 'border-blue-200 focus:border-blue-400'}`} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Harga Jual Default</p>
                        <CurrencyInput disabled={!u.aktif} value={u.jual} onChange={e => u.setJual(e.target.value)}
                          className={`w-full px-4 py-3 bg-white border-2 rounded-xl text-sm font-black text-slate-800 outline-none ${u.aktif ? (u.color === 'amber' ? 'border-amber-200 focus:border-amber-500' : 'border-blue-200 focus:border-blue-500') : 'border-slate-100 text-slate-400'}`}
                          placeholder="Harga jual kasir..." />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold pt-1 border-t border-white">
                        <span className="text-slate-400">HPP Total: {formatRp(u.baseHpp + Number(u.biaya))}</span>
                        <span className={(Number(u.jual) - (u.baseHpp + Number(u.biaya))) >= 0 ? 'text-emerald-600' : 'text-rose-500'}>
                          Laba: {formatRp(Number(u.jual) - (u.baseHpp + Number(u.biaya)))}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Harga Per Kasir Menu */}
              {kasirMenus.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-slate-900 rounded-xl flex items-center justify-center shrink-0">
                      <Icons.LayoutGrid size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Harga Per Kasir Menu</p>
                      <p className="text-[10px] text-slate-400">Kosongkan jika sama dengan harga default di atas</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {kasirMenus.map(menu => {
                      const c = cm(menu.color);
                      const cp = form.channelPrices[menu.slug] ?? { standar: '0', mini: '0' };
                      return (
                        <div key={menu.slug} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                          {/* Header kanal */}
                          <div className={`flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-50`}>
                            <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                            <span className={`text-[11px] font-black uppercase tracking-widest ${c.pill.split(' ')[1]}`}>{menu.nama}</span>
                          </div>
                          {/* Input harga + laba otomatis */}
                          <div className="grid grid-cols-2 divide-x divide-slate-50">
                            {(form.aktif_standar ? [{ field: 'standar' as 'standar' | 'mini', label: 'Standar', val: cp.standar, totalHpp: hpp + Number(form.biaya_topping_standar) }] : [] as { field: 'standar' | 'mini'; label: string; val: string; totalHpp: number }[])
                              .concat(form.aktif_mini ? [{ field: 'mini' as 'standar' | 'mini', label: 'Mini', val: cp.mini, totalHpp: hppMini + Number(form.biaya_topping_mini) }] : [])
                              .map(({ field, label, val, totalHpp }) => {
                                const hargaJual = Number(val);
                                const laba      = hargaJual - totalHpp;
                                const isPositif = laba >= 0;
                                const showLaba  = hargaJual > 0;
                                return (
                                  <div key={field} className="p-3 space-y-1.5">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                                    <div className={`flex items-center gap-1 px-2.5 py-2 rounded-xl border ${c.input} transition-all`}>
                                      <span className="text-[10px] font-black text-slate-400">Rp</span>
                                      <CurrencyInput value={val} onChange={e => setCP(menu.slug, field, e.target.value)}
                                        className="w-full bg-transparent text-sm font-black text-slate-800 focus:outline-none min-w-0" placeholder="0" />
                                    </div>
                                    {/* Laba otomatis */}
                                    {showLaba ? (
                                      <div className={`flex items-center justify-between text-[9px] font-black px-1`}>
                                        <span className="text-slate-400">HPP: {formatRp(totalHpp)}</span>
                                        <span className={isPositif ? 'text-emerald-600' : 'text-rose-500'}>
                                          {isPositif ? '+' : '−'}{formatRp(Math.abs(laba))}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="h-3.5" />
                                    )}
                                  </div>
                                );
                              })}
                            {!form.aktif_standar && !form.aktif_mini && (
                              <div className="col-span-2 p-3 flex items-center justify-center text-[11px] text-slate-300">Aktifkan ukuran di atas</div>
                            )}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tombol Simpan */}
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={resetForm}
                  className="px-6 py-3 rounded-2xl border-2 border-slate-100 text-slate-500 font-black text-sm hover:bg-slate-50 transition-all">
                  Batal
                </button>
                <button type="submit" disabled={isSaving}
                  className="flex-1 py-3 rounded-2xl bg-amber-500 text-white font-black text-sm hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-60 flex items-center justify-center gap-2">
                  {isSaving && <Icons.Loader2 size={16} className="animate-spin" />}
                  {isSaving ? 'Menyimpan...' : (editStandarId || editMiniId ? 'Simpan Perubahan' : 'Tambah Varian Rasa')}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* ── Daftar Varian (Card Grid) ─────────────────────── */}
        {grouped.length === 0 ? (
          <div className="text-center py-16">
            <Icons.CircleDot size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="font-black text-slate-400 text-sm uppercase tracking-widest">Belum Ada Varian Rasa</p>
            <p className="text-slate-300 text-xs mt-2">Klik "Tambah Rasa" untuk mulai</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {grouped.map((v, idx) => {
              const { standar, mini } = v;
              const hasS = !!standar, hasM = !!mini;

              const openEdit = () => {
                setEditStandarId(standar?.id || null);
                setEditMiniId(mini?.id || null);
                const cp: Record<string, { standar: string; mini: string }> = {};
                kasirMenus.forEach(m => { cp[m.slug] = { standar: String(hasS ? cpOf(standar.id, m.slug) || standar.harga_jual : 0), mini: String(hasM ? cpOf(mini.id, m.slug) || mini.harga_jual : 0) }; });
                setForm({ nama: v.nama, category_id: v.category_id || '', image_url: v.image_url || '', biaya_topping_standar: String(hasS ? (standar.harga_pokok_penjualan || 0) - hpp : 0), harga_jual_standar: String(hasS ? standar.harga_jual : 0), aktif_standar: hasS, biaya_topping_mini: String(hasM ? (mini.harga_pokok_penjualan || 0) - hppMini : 0), harga_jual_mini: String(hasM ? mini.harga_jual : 0), aktif_mini: hasM, channelPrices: cp });
                setImgPreview(v.image_url || '');
                setShowForm(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              };

              return (
                <div key={`${v.nama}_${idx}`} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors group">
                  {/* Foto */}
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shrink-0">
                    {v.image_url ? <img src={v.image_url} alt={v.nama} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Icons.Image size={22} className="text-slate-300" /></div>}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    {/* Nama + Kategori */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-slate-800 text-sm">{v.nama}</p>
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">{v.category?.nama || '—'}</span>
                    </div>

                    {/* Harga per ukuran → per kanal */}
                    <div className="space-y-2">
                      {[
                        hasS && { key: 'standar', label: 'Standar', product: standar, baseColor: 'amber' },
                        hasM && { key: 'mini',    label: 'Mini',    product: mini,    baseColor: 'slate' },
                      ].filter(Boolean).map((row: any) => (
                        <div key={row.key} className="flex items-center gap-2 flex-wrap">
                          {/* Badge ukuran */}
                          <span className={`shrink-0 text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${row.baseColor === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {row.label}
                          </span>
                          <Icons.ChevronRight size={12} className="text-slate-300 shrink-0" />
                          {/* Chip per kanal */}
                          {kasirMenus.length > 0 ? (
                            kasirMenus.map(menu => {
                              const c = cm(menu.color);
                              const customHarga = cpOf(row.product.id, menu.slug);
                              const harga       = customHarga || row.product.harga_jual;
                              const isCustom    = customHarga > 0;
                              return (
                                <div key={menu.slug}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all ${c.pill}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                                  <span className="font-black">{menu.nama}</span>
                                  <span className="opacity-40 text-[9px]">:</span>
                                  <span className={isCustom ? 'font-black' : 'opacity-70'}>{formatRp(harga)}</span>
                                  {!isCustom && <span className="opacity-40 text-[8px] font-normal">def</span>}
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-[11px] font-black text-slate-700">{formatRp(row.product.harga_jual)}</span>
                          )}
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* Aksi */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={openEdit} title="Edit" className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-500 text-amber-500 hover:text-white transition-all flex items-center justify-center">
                      <Icons.Pencil size={14} />
                    </button>
                    <button onClick={async () => {
                      if (!confirm(`Hapus rasa "${v.nama}"?`)) return;
                      if (standar?.id) await deleteProduct(standar.id);
                      if (mini?.id)    await deleteProduct(mini.id);
                      toast.success(`Rasa "${v.nama}" dihapus`);
                      await refreshData();
                    }} title="Hapus" className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-500 text-red-400 hover:text-white transition-all flex items-center justify-center">
                      <Icons.Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
