'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { upsertProduct, uploadProductImage, deleteProduct } from '@/lib/db';
import type { ProductWithCategory } from '@/lib/types';
import { inputClass, formatRp } from './shared';

interface TabTambahanProps {
  tambahanList: ProductWithCategory[];
  refreshData: () => Promise<void>;
}

export function TabTambahan({ tambahanList, refreshData }: TabTambahanProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tambahanForm, setTambahanForm] = useState({ 
    nama: '', image_url: '', deskripsi: '', harga_jual: '0', harga_pokok_penjualan: '0', ukuran: 'buah' 
  });
  const [tambahanImageFile, setTambahanImageFile] = useState<File | null>(null);
  const [tambahanImagePreview, setTambahanImagePreview] = useState<string>('');

  const handleTambahanImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTambahanImageFile(file);
    const preview = URL.createObjectURL(file);
    setTambahanImagePreview(preview);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setTambahanForm({ nama: '', image_url: '', deskripsi: '', harga_jual: '0', harga_pokok_penjualan: '0', ukuran: 'buah' });
    setTambahanImageFile(null);
    setTambahanImagePreview('');
    if (tambahanImagePreview && tambahanImagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(tambahanImagePreview);
    }
  };

  const handleAddTambahan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalImageUrl = tambahanForm.image_url;

      if (tambahanImageFile) {
        toast.info('Mengunggah gambar...');
        const uploadedUrl = await uploadProductImage(tambahanImageFile);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }

      const ok = await upsertProduct({
        id: editingId || undefined,
        nama: tambahanForm.nama,
        image_url: finalImageUrl,
        deskripsi: tambahanForm.deskripsi,
        harga_jual: Number(tambahanForm.harga_jual),
        harga_pokok_penjualan: Number(tambahanForm.harga_pokok_penjualan),
        ukuran: tambahanForm.ukuran,
        tipe_produk: 'tambahan',
        is_active: true
      });
      
      if (ok) { 
        toast.success(editingId ? 'Item Tambahan diperbarui' : 'Item Tambahan baru ditambahkan', {
          description: `"${tambahanForm.nama}" • Jual: Rp${Number(tambahanForm.harga_jual).toLocaleString('id-ID')} • HPP: Rp${Number(tambahanForm.harga_pokok_penjualan).toLocaleString('id-ID')}`,
        }); 
        resetForm(); 
        await refreshData(); 
      } else {
        toast.error('Gagal menyimpan item tambahan', { description: 'Periksa data dan coba lagi.' });
      }
    } catch (error) {
      console.error('Error saving tambahan:', error);
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
        <h3 className="text-lg font-bold text-slate-800">Produk Tambahan / Topping</h3>
        <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">
          {showForm ? 'BATAL' : '+ TAMBAH'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAddTambahan} className="mb-6 p-6 bg-slate-50 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Barang / Titipan</label>
                <input value={tambahanForm.nama} onChange={(e) => setTambahanForm({ ...tambahanForm, nama: e.target.value })} className={inputClass} placeholder="Nama Tambahan" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Upload Gambar/Ikon Foto Barang</label>
              <input type="file" accept="image/*" onChange={handleTambahanImageChange} className={inputClass} />
              {tambahanImagePreview && (
                <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-amber-200">
                  <img src={tambahanImagePreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Harga Jual (Kasir)</label>
                <CurrencyInput value={tambahanForm.harga_jual} onChange={(e) => setTambahanForm({ ...tambahanForm, harga_jual: e.target.value })} className={inputClass} placeholder="Harga Jual" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Harga Pokok (HPP Modal)</label>
                <CurrencyInput value={tambahanForm.harga_pokok_penjualan} onChange={(e) => setTambahanForm({ ...tambahanForm, harga_pokok_penjualan: e.target.value })} className={inputClass} placeholder="HPP" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Satuan Produk</label>
                <input value={tambahanForm.ukuran} onChange={(e) => setTambahanForm({ ...tambahanForm, ukuran: e.target.value })} className={inputClass} placeholder="Satuan (biji/botol/pcs/box)" />
            </div>
          </div>
          <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
            {isSaving ? 'Menyimpan...' : 'SIMPAN'}
          </Button>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {tambahanList.map(v => (
          <div key={v.id} className="group relative bg-white border border-slate-100 rounded-[40px] p-5 hover:shadow-2xl hover:border-amber-300 transition-all flex flex-col items-center text-center overflow-hidden">
            <div className="relative w-full aspect-square bg-slate-50 rounded-[32px] mb-5 flex items-center justify-center overflow-hidden border border-slate-50 shadow-inner group-hover:scale-95 transition-transform duration-500">
              {v.image_url ? (
                <img src={v.image_url} className="w-full h-full object-cover" alt={v.nama} />
              ) : (
                <Icons.Plus size={40} className="text-slate-200" />
              )}
              <div className="absolute bottom-3 right-3 px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border border-slate-100">
                  {v.ukuran}
              </div>
            </div>
            <h4 className="font-black text-slate-900 text-base uppercase tracking-tight truncate w-full mb-2">{v.nama}</h4>
            <p className="text-amber-600 font-black text-lg mb-6">{formatRp(v.harga_jual)}</p>
            
            <div className="grid grid-cols-2 gap-3 w-full opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
              <button onClick={() => { setEditingId(v.id); setTambahanForm({ nama: v.nama, image_url: v.image_url || '', deskripsi: v.deskripsi || '', harga_jual: String(v.harga_jual), harga_pokok_penjualan: String(v.harga_pokok_penjualan || 0), ukuran: v.ukuran || 'buah' }); setTambahanImagePreview(v.image_url || ''); setShowForm(true); }} className="bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 p-3 rounded-2xl transition-all border border-slate-100 flex items-center justify-center">
                <Icons.Edit3 size={18} />
              </button>
              <button onClick={() => handleDeleteProduct(v.id)} className="bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 p-3 rounded-2xl transition-all border border-slate-100 flex items-center justify-center">
                <Icons.Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {tambahanList.length === 0 && <p className="col-span-full text-center text-slate-300 py-16 text-xs font-black uppercase tracking-[0.3em] border-2 border-dashed rounded-[40px]">Belum ada item tambahan</p>}
      </div>
    </div>
  );
}
