'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Save, Loader2, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ProductPricingForm, type ProductPricingData } from '@/components/products/ProductPricingForm';
import { upsertProduct, getProductCategories } from '@/lib/db';
import type { ProductCategory } from '@/lib/types';
import { toast } from 'sonner';

const Icons = { ArrowLeft, Save, Loader2, Package };

export default function TambahProdukPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // Form state
  const [nama, setNama] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [kode, setKode] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  
  // Pricing state
  const [pricing, setPricing] = useState<ProductPricingData>({
    is_donat: false,
    ukuran_donat: null,
    hpp_base_donat: null,
    hpp_topping: null,
    hpp_total: 0,
    harga_jual: 0,
    margin_amount: 0,
    margin_percent: 0,
  });

  // Load categories
  useEffect(() => {
    getProductCategories().then(setCategories).catch(() => {
      toast.error('Gagal memuat kategori');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nama.trim()) {
      toast.error('Nama produk wajib diisi');
      return;
    }
    
    if (!categoryId) {
      toast.error('Kategori wajib dipilih');
      return;
    }
    
    if (pricing.harga_jual <= 0) {
      toast.error('Harga jual harus lebih dari 0');
      return;
    }

    setIsSaving(true);
    
    try {
      const result = await upsertProduct({
        nama: nama.trim(),
        kode: kode.trim() || undefined,
        category_id: categoryId,
        deskripsi: deskripsi.trim() || undefined,
        tipe_produk: pricing.is_donat ? 'donat_varian' : 'minuman',
        ukuran: pricing.is_donat ? (pricing.ukuran_donat === 'regular' ? 'standar' : pricing.ukuran_donat || undefined) : undefined,
        
        // New pricing fields
        is_donat: pricing.is_donat,
        ukuran_donat: pricing.ukuran_donat,
        hpp_base_donat: pricing.hpp_base_donat,
        hpp_topping: pricing.hpp_topping,
        hpp_total: pricing.hpp_total,
        harga_jual: pricing.harga_jual,
        margin_amount: pricing.margin_amount,
        margin_percent: pricing.margin_percent,
        
        is_active: true,
      });

      if (result) {
        toast.success('✅ Produk berhasil ditambahkan!', {
          description: `${nama} dengan margin ${pricing.margin_percent?.toFixed(1)}%`,
        });
        
        // Reset form
        setNama('');
        setKode('');
        setCategoryId('');
        setDeskripsi('');
        setPricing({
          is_donat: false,
          ukuran_donat: null,
          hpp_base_donat: null,
          hpp_topping: null,
          hpp_total: 0,
          harga_jual: 0,
          margin_amount: 0,
          margin_percent: 0,
        });
        
        // Redirect ke kelola produk
        setTimeout(() => {
          router.push('/dashboard/kelola-produk');
        }, 1500);
      } else {
        toast.error('Gagal menyimpan produk');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Terjadi kesalahan saat menyimpan produk');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-amber-600 font-bold text-sm mb-4 transition-colors"
          >
            <Icons.ArrowLeft size={18} />
            Kembali
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Icons.Package size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tambah Produk Baru</h1>
              <p className="text-sm text-slate-500 mt-0.5">Form lengkap dengan perhitungan margin otomatis</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-black text-slate-700 uppercase tracking-widest">Informasi Produk</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Nama Produk */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  Nama Produk
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Donat Ceres, Es Teh Manis"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-all"
                  required
                />
              </div>

              {/* Kategori & Kode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                    Kategori
                    <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-none focus:border-amber-400 focus:bg-white transition-all"
                    required
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                    Kode Produk (Opsional)
                  </label>
                  <input
                    type="text"
                    value={kode}
                    onChange={(e) => setKode(e.target.value)}
                    placeholder="Contoh: CRS-REG"
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  placeholder="Deskripsi singkat produk..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Pricing Form */}
          <ProductPricingForm
            value={pricing}
            onChange={setPricing}
            showRecommendation={true}
            targetMarginPercent={35}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-white border-2 border-slate-200 text-slate-600 font-black text-sm rounded-xl hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Icons.Loader2 size={18} className="animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Icons.Save size={18} />
                  Simpan Produk
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
