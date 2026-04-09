'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { upsertProduct, deleteProduct } from '@/lib/db';
import type { ProductWithCategory } from '@/lib/types';
import { inputClass, formatRp } from './shared';

interface TabBiayaLainnyaProps {
  biayaEkstraList: ProductWithCategory[];
  refreshData: () => Promise<void>;
}

export function TabBiayaLainnya({ biayaEkstraList, refreshData }: TabBiayaLainnyaProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [biayaEkstraForm, setBiayaEkstraForm] = useState({ nama: '', harga_jual: '0', is_active: true });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setBiayaEkstraForm({ nama: '', harga_jual: '0', is_active: true });
  };

  const handleAddBiayaEkstra = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await upsertProduct({
        id: editingId || undefined,
        nama: biayaEkstraForm.nama,
        harga_jual: Number(biayaEkstraForm.harga_jual),
        tipe_produk: 'biaya_ekstra',
        is_active: biayaEkstraForm.is_active
      });
      if (ok) {
        toast.success(editingId ? 'Biaya Extra diperbarui' : 'Biaya Extra ditambahkan');
        resetForm();
        await refreshData();
      } else toast.error('Gagal menyimpan biaya ekstra');
    } catch (error) {
      console.error('Error saving biaya ekstra:', error);
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Hapus produk ini?')) return;
    try {
      const ok = await deleteProduct(id);
      if (ok) { 
        toast.success('Produk dihapus', { description: 'Data telah dihapus dari sistem.' }); 
        await refreshData(); 
      } else {
        toast.error('Gagal menghapus produk');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Terjadi kesalahan saat menghapus');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Biaya Extra (Info Tambahan)</h3>
          <p className="text-[10px] text-slate-400">Biaya ongkir, PPN, Kemasan Tambahan, dll.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">
          {showForm ? 'BATAL' : '+ TAMBAH'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAddBiayaEkstra} className="mb-6 p-6 bg-slate-50 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Biaya</label>
                <input value={biayaEkstraForm.nama} onChange={(e) => setBiayaEkstraForm({ ...biayaEkstraForm, nama: e.target.value })} className={inputClass} placeholder="Beban Ongkir / Plastik / PPN" required />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Harga Default (Isi 0 Jika Fleksibel/Dapat Diubah Kasir)</label>
                <CurrencyInput value={biayaEkstraForm.harga_jual} onChange={(e) => setBiayaEkstraForm({ ...biayaEkstraForm, harga_jual: e.target.value })} className={inputClass} placeholder="Harga Default" />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <input type="checkbox" id="aktifBiaya" checked={biayaEkstraForm.is_active} onChange={(e) => setBiayaEkstraForm({...biayaEkstraForm, is_active: e.target.checked})} className="accent-amber-500 w-4 h-4 cursor-pointer" />
            <label htmlFor="aktifBiaya" className="text-xs font-bold text-slate-600 cursor-pointer">Aktifkan Biaya Ini</label>
          </div>
          <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
            {isSaving ? 'Menyimpan...' : 'SIMPAN'}
          </Button>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {biayaEkstraList.map(v => (
          <div key={v.id} className={`group relative bg-white border border-slate-100 rounded-[40px] p-5 hover:shadow-2xl hover:border-amber-300 transition-all flex flex-col items-center text-center overflow-hidden ${!v.is_active ? 'opacity-50 grayscale' : ''}`}>
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center mx-auto mb-6 shadow-inner transition-all duration-500">
              <Icons.Receipt size={32} />
            </div>
            <h4 className="font-black text-slate-900 text-[13px] uppercase tracking-tight truncate w-full mb-1">{v.nama}</h4>
            <p className="text-[10px] font-bold text-slate-400 mb-4">{!v.is_active ? '(Tidak Aktif)' : 'Aktif'}</p>
            <p className="text-amber-600 font-black text-base lg:text-lg lg:mb-6">{Number(v.harga_jual) === 0 ? 'Fleksibel' : formatRp(v.harga_jual)}</p>
            
            <div className="grid grid-cols-2 gap-3 w-full opacity-0 group-hover:opacity-100 mt-2 lg:mt-0 lg:translate-y-4 group-hover:translate-y-0 transition-all duration-300">
              <button onClick={() => { setEditingId(v.id); setBiayaEkstraForm({ nama: v.nama, harga_jual: String(v.harga_jual), is_active: v.is_active }); setShowForm(true); }} className="bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 p-3 rounded-2xl transition-all border border-slate-100 flex items-center justify-center">
                <Icons.Edit3 size={18} />
              </button>
              <button onClick={() => handleDeleteProduct(v.id)} className="bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 p-3 rounded-2xl transition-all border border-slate-100 flex items-center justify-center">
                <Icons.Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {biayaEkstraList.length === 0 && <p className="col-span-full text-center text-slate-300 py-16 text-xs font-black uppercase tracking-[0.3em] border-2 border-dashed rounded-[40px]">Belum ada biaya terdaftar</p>}
      </div>
    </div>
  );
}
