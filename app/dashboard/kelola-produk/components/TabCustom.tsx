'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { upsertCustomTemplate } from '@/lib/db';
import type { ProductCustomTemplate } from '@/lib/types';
import { inputClass, formatRp } from './shared';

interface TabCustomProps {
  customPaketList: ProductCustomTemplate[];
  refreshData: () => Promise<void>;
}

export function TabCustom({ customPaketList, refreshData }: TabCustomProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [customPaketForm, setCustomPaketForm] = useState({ 
    nama: '', kapasitas: '', ukuran_donat: 'standar' as 'standar' | 'mini', 
    harga_satuan_default: '0', harga_klasik_full: '0', harga_reguler_full: '0', harga_premium_full: '0' 
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setCustomPaketForm({ 
      nama: '', kapasitas: '', ukuran_donat: 'standar', 
      harga_satuan_default: '0', harga_klasik_full: '0', harga_reguler_full: '0', harga_premium_full: '0' 
    });
  };

  const handleAddCustomPaket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await upsertCustomTemplate({
        id: editingId || undefined,
        nama: customPaketForm.nama,
        kapasitas: Number(customPaketForm.kapasitas),
        ukuran_donat: customPaketForm.ukuran_donat,
        harga_satuan_default: Number(customPaketForm.harga_satuan_default),
        harga_klasik_full: Number(customPaketForm.harga_klasik_full),
        harga_reguler_full: Number(customPaketForm.harga_reguler_full),
        harga_premium_full: Number(customPaketForm.harga_premium_full),
        is_active: true
      });
      if (ok) { 
        toast.success(editingId ? 'Template Custom diperbarui' : 'Template Custom baru ditambahkan'); 
        resetForm(); 
        await refreshData(); 
      } else {
        toast.error('Gagal menyimpan template custom', { description: 'Periksa data dan coba lagi.' });
      }
    } catch (error) {
      console.error('Error saving custom template:', error);
      toast.error('Terjadi kesalahan saat menyimpan template custom');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800">Custom Order Template</h3>
        <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">
          {showForm ? 'BATAL' : '+ TAMBAH'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAddCustomPaket} className="mb-6 p-6 bg-slate-50 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Template Cust.</label>
                <input value={customPaketForm.nama} onChange={(e) => setCustomPaketForm({ ...customPaketForm, nama: e.target.value })} className={inputClass} placeholder="Nama Template" required />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Kapasitas Maksimal Box</label>
                <input type="number" value={customPaketForm.kapasitas} onChange={(e) => setCustomPaketForm({ ...customPaketForm, kapasitas: e.target.value })} className={inputClass} placeholder="Kapasitas" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Pilihan Ukuran Donat</label>
                <select value={customPaketForm.ukuran_donat} onChange={(e) => setCustomPaketForm({ ...customPaketForm, ukuran_donat: e.target.value as 'standar' | 'mini' })} className={inputClass}>
                  <option value="standar">Standar</option>
                  <option value="mini">Mini</option>
                </select>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Harga Default (Satuan)</label>
                <CurrencyInput value={customPaketForm.harga_satuan_default} onChange={(e) => setCustomPaketForm({ ...customPaketForm, harga_satuan_default: e.target.value })} className={inputClass} placeholder="Harga Satuan" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Harga 1 Box Klasik</label>
                <CurrencyInput value={customPaketForm.harga_klasik_full} onChange={(e) => setCustomPaketForm({ ...customPaketForm, harga_klasik_full: e.target.value })} className={inputClass} placeholder="Harga Klasik" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Harga 1 Box Reguler</label>
                <CurrencyInput value={customPaketForm.harga_reguler_full} onChange={(e) => setCustomPaketForm({ ...customPaketForm, harga_reguler_full: e.target.value })} className={inputClass} placeholder="Harga Reguler" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Harga 1 Box Premium</label>
                <CurrencyInput value={customPaketForm.harga_premium_full} onChange={(e) => setCustomPaketForm({ ...customPaketForm, harga_premium_full: e.target.value })} className={inputClass} placeholder="Harga Premium" />
            </div>
          </div>
          <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
            {isSaving ? 'Menyimpan...' : 'SIMPAN'}
          </Button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customPaketList.map(c => (
          <div key={c.id} className="group relative p-8 bg-white border border-slate-100 rounded-[40px] shadow-sm hover:shadow-2xl hover:border-pink-300 transition-all overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-3xl bg-pink-50 text-pink-500 group-hover:bg-pink-500 group-hover:text-white flex items-center justify-center shadow-inner transition-all duration-500 shrink-0">
                  <Icons.Palette size={28} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">{c.nama}</h4>
                  <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-slate-50 rounded text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {c.ukuran_donat} • Max {c.kapasitas} pcs
                  </div>
                </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">Default (Satuan)</span>
                  <span className="font-black text-slate-700">{formatRp(c.harga_satuan_default)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">Full Klasik</span>
                  <span className="font-black text-slate-700">{formatRp(c.harga_klasik_full)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">Full Reguler</span>
                  <span className="font-black text-slate-700">{formatRp(c.harga_reguler_full)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-400">Full Premium</span>
                  <span className="font-black text-slate-700">{formatRp(c.harga_premium_full)}</span>
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => { setEditingId(c.id); setCustomPaketForm({ nama: c.nama, kapasitas: String(c.kapasitas), ukuran_donat: c.ukuran_donat as 'standar' | 'mini', harga_satuan_default: String(c.harga_satuan_default), harga_klasik_full: String(c.harga_klasik_full), harga_reguler_full: String(c.harga_reguler_full), harga_premium_full: String(c.harga_premium_full) }); setShowForm(true); }} className="flex-1 py-3 bg-slate-50 hover:bg-pink-50 text-slate-400 hover:text-pink-600 rounded-xl transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                  <Icons.Edit3 size={14} /> Edit
                </button>
            </div>
          </div>
        ))}
        {customPaketList.length === 0 && <p className="col-span-full text-center text-slate-300 py-16 text-xs font-black uppercase tracking-[0.3em] border-2 border-dashed rounded-[40px]">Belum ada template custom</p>}
      </div>
    </div>
  );
}
