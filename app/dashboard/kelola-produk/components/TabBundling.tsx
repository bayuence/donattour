'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { upsertBundling } from '@/lib/db';
import type { ProductBundling } from '@/lib/types';
import { inputClass, formatRp } from './shared';

interface TabBundlingProps {
  bundlingList: ProductBundling[];
  refreshData: () => Promise<void>;
}

export function TabBundling({ bundlingList, refreshData }: TabBundlingProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [bundlingForm, setBundlingForm] = useState({ 
    nama: '', deskripsi: '', piilhanItem: '', harga_normal: '0', harga_bundling: '0' 
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setBundlingForm({ nama: '', deskripsi: '', piilhanItem: '', harga_normal: '0', harga_bundling: '0' });
  };

  const handleAddBundling = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await upsertBundling({
        id: editingId || undefined,
        nama: bundlingForm.nama,
        deskripsi: bundlingForm.deskripsi,
        harga_bundling: Number(bundlingForm.harga_bundling),
        is_active: true
      });
      if (ok) { 
        toast.success(editingId ? 'Bundling diperbarui' : 'Bundling baru ditambahkan', {
          description: `"${bundlingForm.nama}" • Harga: Rp${Number(bundlingForm.harga_bundling).toLocaleString('id-ID')}`,
        }); 
        resetForm(); 
        await refreshData(); 
      } else {
        toast.error('Gagal menyimpan bundling', { description: 'Periksa data dan coba lagi.' });
      }
    } catch (error) {
      console.error('Error saving bundling:', error);
      toast.error('Terjadi kesalahan saat menyimpan bundling');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800">Promo Bundling</h3>
        <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">
          {showForm ? 'BATAL' : '+ TAMBAH'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAddBundling} className="mb-10 p-8 bg-white/50 backdrop-blur-xl rounded-[40px] border border-amber-200/50 space-y-6 animate-in fade-in slide-in-from-top-4 shadow-2xl shadow-amber-500/5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Promo</label>
                <input value={bundlingForm.nama} onChange={(e) => setBundlingForm({ ...bundlingForm, nama: e.target.value })} className={inputClass} placeholder="Nama Bundling" required />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Harga Promo</label>
                <CurrencyInput value={bundlingForm.harga_bundling} onChange={(e) => setBundlingForm({ ...bundlingForm, harga_bundling: e.target.value })} className={inputClass} placeholder="Harga Bundling" />
            </div>
          </div>
          <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Aturan / Deskripsi</label>
              <textarea value={bundlingForm.deskripsi} onChange={(e) => setBundlingForm({ ...bundlingForm, deskripsi: e.target.value })} className={inputClass + ' min-h-[100px] py-4'} placeholder="Misal: Pilih 2 Donat Varian + 1 Air Mineral" />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" onClick={resetForm} variant="ghost" className="rounded-2xl font-black text-[10px] tracking-widest uppercase px-8">Batal</Button>
            <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-[10px] tracking-widest uppercase rounded-2xl hover:bg-amber-600 transition-colors disabled:opacity-50 px-10 h-12 shadow-lg shadow-slate-900/10">
              {isSaving ? 'Menyimpan...' : 'SIMPAN PROMO'}
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bundlingList.map(b => (
          <div key={b.id} className="group relative p-8 bg-white border border-slate-100 rounded-[40px] shadow-sm hover:shadow-2xl hover:border-purple-300 transition-all overflow-hidden flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-purple-50 text-purple-500 group-hover:bg-purple-500 group-hover:text-white flex items-center justify-center shadow-inner transition-all duration-500 shrink-0">
                <Icons.Gift size={32} />
            </div>
            <div className="flex-1 min-w-0 z-10">
              <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-1 truncate">{b.nama}</h4>
              <p className="text-xs text-slate-500 font-medium mb-3 line-clamp-2 leading-relaxed">{b.deskripsi}</p>
              <p className="text-purple-600 font-black text-2xl">{formatRp(b.harga_bundling)}</p>
            </div>
            <div className="flex flex-col gap-2 z-10">
                <button onClick={() => { setEditingId(b.id); setBundlingForm({ nama: b.nama, deskripsi: b.deskripsi || '', piilhanItem: '', harga_normal: '0', harga_bundling: String(b.harga_bundling) }); setShowForm(true); }} className="p-3 bg-slate-50 hover:bg-purple-50 text-slate-300 hover:text-purple-600 rounded-2xl transition-all">
                  <Icons.Edit3 size={18} />
                </button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
          </div>
        ))}
        {bundlingList.length === 0 && <p className="col-span-full text-center text-slate-300 py-16 text-xs font-black uppercase tracking-[0.3em] border-2 border-dashed rounded-[40px]">Belum ada bundling</p>}
      </div>
    </div>
  );
}
