'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { upsertCategory, deleteCategory } from '@/lib/db';
import type { ProductCategory } from '@/lib/types';
import { inputClass, WARNA_OPTIONS, getColorClasses, getTextHoverClasses } from './shared';

interface TabKategoriProps {
  jenisList: ProductCategory[];
  refreshData: () => Promise<void>;
}

export function TabKategori({ jenisList, refreshData }: TabKategoriProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [jenisForm, setJenisForm] = useState({ nama: '', deskripsi: '', icon: 'amber' });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setJenisForm({ nama: '', deskripsi: '', icon: 'amber' });
  };

  const handleAddJenis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await upsertCategory({ id: editingId || undefined, nama: jenisForm.nama, icon: jenisForm.icon });
      if (ok) { 
        toast.success(editingId ? 'Kategori diperbarui' : 'Kategori baru ditambahkan', {
          description: `"${jenisForm.nama}" berhasil ${editingId ? 'diubah' : 'disimpan'} di tab Kategori.`,
        }); 
        resetForm(); 
        await refreshData(); 
      } else {
        toast.error('Gagal menyimpan kategori', { description: 'Periksa koneksi dan coba lagi.' });
      }
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Terjadi kesalahan saat menyimpan kategori');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return;
    try {
      const ok = await deleteCategory(id);
      if (ok) { 
        toast.success('Kategori dihapus', { description: 'Kategori telah dihapus dari sistem.' }); 
        await refreshData(); 
      } else {
        toast.error('Gagal menghapus kategori');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Terjadi kesalahan saat menghapus');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800">Kategori Donat</h3>
        <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">
          {showForm ? 'BATAL' : '+ TAMBAH'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAddJenis} className="mb-6 p-6 bg-slate-50 rounded-2xl border animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Kategori</label>
                <input value={jenisForm.nama} onChange={(e) => setJenisForm({ ...jenisForm, nama: e.target.value })} placeholder="Nama Kategori (misal: Klasik)" className={inputClass} required />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Warna Label</label>
                <select value={jenisForm.icon} onChange={(e) => setJenisForm({ ...jenisForm, icon: e.target.value })} className={inputClass}>
                  {WARNA_OPTIONS.map(w => <option key={w} value={w}>{w.toUpperCase()}</option>)}
                </select>
            </div>
          </div>
          <Button type="submit" disabled={isSaving} className="mt-4 bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
            {isSaving ? 'Menyimpan...' : 'SIMPAN'}
          </Button>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {jenisList.map(cat => {
          const colorClass = getColorClasses(cat.icon || 'amber');
          const textHover = getTextHoverClasses(cat.icon || 'amber');
          return (
            <div key={cat.id} className="group relative p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:shadow-xl hover:border-slate-200 transition-all overflow-hidden">
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:text-white transition-all ${colorClass}`}>
                  <Icons.Tags size={20} />
                </div>
                <h4 className={`font-black text-slate-800 text-sm transition-colors uppercase tracking-tight ${textHover}`}>{cat.nama}</h4>
                <div className="flex gap-4 mt-6 pt-4 border-t border-slate-50">
                  <button onClick={() => { setEditingId(cat.id); setJenisForm({ nama: cat.nama, deskripsi: '', icon: cat.icon || 'amber' }); setShowForm(true); }} className="text-[10px] font-black uppercase text-blue-500 hover:text-blue-700 tracking-widest">Edit</button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 tracking-widest">Hapus</button>
                </div>
              </div>
              <Icons.Tags size={80} className="absolute -bottom-4 -right-4 text-slate-50 group-hover:text-amber-50 group-hover:rotate-12 transition-all opacity-50" />
            </div>
          );
        })}
        {jenisList.length === 0 && <p className="col-span-full text-center text-slate-400 py-12 text-sm font-bold uppercase tracking-widest bg-slate-50 rounded-3xl border-2 border-dashed">Belum ada kategori</p>}
      </div>
    </div>
  );
}
