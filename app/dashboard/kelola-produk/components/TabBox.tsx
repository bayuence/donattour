'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { upsertBox, deleteBox } from '@/lib/db';
import type { ProductBox } from '@/lib/types';
import { inputClass, formatRp } from './shared';

interface TabBoxProps {
  boxList: ProductBox[];
  refreshData: () => Promise<void>;
}

export function TabBox({ boxList, refreshData }: TabBoxProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [boxForm, setBoxForm] = useState({ nama: '', kapasitas: '', harga_box: '0' });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setBoxForm({ nama: '', kapasitas: '', harga_box: '0' });
  };

  const handleAddBox = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await upsertBox({
        id: editingId || undefined,
        nama: boxForm.nama,
        kapasitas: Number(boxForm.kapasitas),
        harga_box: Number(boxForm.harga_box)
      });
      if (ok) {
        toast.success(editingId ? 'Box diperbarui' : 'Box baru ditambahkan', {
          description: `"${boxForm.nama}" • Kapasitas: ${boxForm.kapasitas} pcs • Harga: Rp${Number(boxForm.harga_box).toLocaleString('id-ID')}`,
        });
        resetForm();
        await refreshData();
      } else {
        toast.error('Gagal menyimpan box', { description: 'Periksa data dan coba lagi.' });
      }
    } catch (error) {
      console.error('Error saving box:', error);
      toast.error('Terjadi kesalahan saat menyimpan box');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBox = async (id: string) => {
    if (!confirm('Hapus box ini?')) return;
    try {
      const ok = await deleteBox(id);
      if (ok) {
        toast.success('Box dihapus', { description: 'Box telah dihapus dari sistem.' });
        await refreshData();
      } else {
        toast.error('Gagal menghapus box');
      }
    } catch (error) {
      console.error('Error deleting box:', error);
      toast.error('Terjadi kesalahan saat menghapus');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800">Master Box / Kemasan</h3>
        <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">
          {showForm ? 'BATAL' : '+ TAMBAH'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAddBox} className="mb-6 p-6 bg-slate-50 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Kemasan / Box</label>
                <input value={boxForm.nama} onChange={(e) => setBoxForm({ ...boxForm, nama: e.target.value })} className={inputClass} placeholder="Nama Box (misal: Box 6pcs)" required />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Kapasitas Box (Banyak Donat)</label>
                <input type="number" value={boxForm.kapasitas} onChange={(e) => setBoxForm({ ...boxForm, kapasitas: e.target.value })} className={inputClass} placeholder="Kapasitas (pcs)" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Harga Tambahan Box</label>
                <CurrencyInput value={boxForm.harga_box} onChange={(e) => setBoxForm({ ...boxForm, harga_box: e.target.value })} className={inputClass} placeholder="Harga Box" />
            </div>
          </div>
          <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
            {isSaving ? 'Menyimpan...' : 'SIMPAN'}
          </Button>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {boxList.map(b => (
          <div key={b.id} className="group relative p-8 bg-white border border-slate-100 rounded-[40px] shadow-sm hover:shadow-2xl hover:border-amber-300 transition-all overflow-hidden text-center">
            <div className="relative z-10">
                <div className="w-16 h-16 rounded-3xl bg-slate-50 text-slate-400 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center mx-auto mb-6 shadow-inner transition-all duration-500">
                  <Icons.Package size={32} />
                </div>
                <h4 className="font-black text-slate-900 text-base uppercase tracking-tight mb-2">{b.nama}</h4>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">
                  <Icons.ChevronRight size={10} /> {b.kapasitas} Donat
                </div>
                <p className="text-amber-600 font-black text-xl mb-8">{formatRp(b.harga_box)}</p>
                <div className="flex gap-3 justify-center pt-6 border-t border-slate-50">
                  <button onClick={() => { setEditingId(b.id); setBoxForm({ nama: b.nama, kapasitas: String(b.kapasitas), harga_box: String(b.harga_box) }); setShowForm(true); }} className="px-4 py-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
                    <Icons.Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDeleteBox(b.id)} className="px-4 py-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                    <Icons.Trash2 size={16} />
                  </button>
                </div>
            </div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
          </div>
        ))}
        {boxList.length === 0 && <p className="col-span-full text-center text-slate-300 py-16 text-xs font-black uppercase tracking-[0.3em] border-2 border-dashed rounded-[40px]">Belum ada box</p>}
      </div>
    </div>
  );
}
