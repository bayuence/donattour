'use client';

import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getProductsWithCategory, getProductCategories, getBoxes, getPackages,
  getBundlings, getCustomTemplates, getOutletProductionCost,
  upsertProduct, upsertCategory, upsertBox, upsertPackage,
  upsertBundling, upsertCustomTemplate, upsertOutletProductionCost,
  deleteProduct, deleteCategory, deleteBox, getActiveOutlets
} from '@/lib/db';
import type {
  ProductWithCategory, ProductCategory, ProductBox, ProductPackage,
  ProductBundling, ProductCustomTemplate, Outlet
} from '@/lib/types';
import { toast } from 'sonner';

type TabType = 'harga-dasar' | 'jenis' | 'varian' | 'box' | 'paket' | 'bundling' | 'custom' | 'tambahan';

// === COMPONENT ===

export default function KelolaProdukPage() {
  const [activeTab, setActiveTab] = useState<TabType>('harga-dasar');
  const [isLoading, setIsLoading] = useState(true);

  // Outlet state (same pattern as kasir)
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [outletList, setOutletList] = useState<Outlet[]>([]);
  const [showOutletPicker, setShowOutletPicker] = useState(false);

  // Data states
  const [jenisList, setJenisList] = useState<ProductCategory[]>([]);
  const [varianList, setVarianList] = useState<ProductWithCategory[]>([]);
  const [boxList, setBoxList] = useState<ProductBox[]>([]);
  const [paketList, setPaketList] = useState<ProductPackage[]>([]);
  const [bundlingList, setBundlingList] = useState<ProductBundling[]>([]);
  const [customPaketList, setCustomPaketList] = useState<ProductCustomTemplate[]>([]);
  const [tambahanList, setVarianTambahanList] = useState<ProductWithCategory[]>([]);

  const [hargaPolos, setHargaPolos] = useState(1500);
  const [hargaPolosMini, setHargaPolosMini] = useState(800);
  const [isSaving, setIsSaving] = useState(false);

  // Outlet load (same as kasir)
  useEffect(() => {
    getActiveOutlets().then(setOutletList).catch(() => setOutletList([]));
    try {
      const saved = localStorage.getItem('kelola_produk_outlet');
      if (saved) setOutlet(JSON.parse(saved));
      else setShowOutletPicker(true);
    } catch {
      setShowOutletPicker(true);
    }
  }, []);

  const pilihOutlet = (o: Outlet) => {
    setOutlet(o);
    localStorage.setItem('kelola_produk_outlet', JSON.stringify(o));
    setShowOutletPicker(false);
  };

  // Fetch product data when outlet changes
  useEffect(() => {
    if (!outlet) return;
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet]);

  async function loadData() {
    if (!outlet) return;
    setIsLoading(true);
    try {
      const [cats, prods, boxes, pkgs, bunds, custs] = await Promise.all([
        getProductCategories(),
        getProductsWithCategory(),
        getBoxes(),
        getPackages(),
        getBundlings(),
        getCustomTemplates()
      ]);

      setJenisList(cats);
      setVarianList(prods.filter((p: ProductWithCategory) => p.tipe_produk === 'donat_varian'));
      setBoxList(boxes);
      setPaketList(pkgs);
      setBundlingList(bunds);
      setCustomPaketList(custs);
      setVarianTambahanList(prods.filter((p: ProductWithCategory) => p.tipe_produk === 'tambahan'));

      // Load production cost for this outlet
      try {
        const cost = await getOutletProductionCost(outlet.id);
        if (cost) {
          setHargaPolos(cost.cost_polos_standar);
          setHargaPolosMini(cost.cost_polos_mini);
        }
      } catch {
        // Production cost may not exist yet, use defaults
      }
    } catch (error) {
      console.error('Gagal memuat data produk:', error);
      toast.error('Gagal memuat data produk');
    } finally {
      setIsLoading(false);
    }
  }

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [jenisForm, setJenisForm] = useState({ nama: '', deskripsi: '', icon: 'amber' });
  const [varianForm, setVarianForm] = useState({ nama: '', category_id: '', image_url: '', harga_dasar: '0', biaya_topping: '0', harga_jual: '0', ukuran: 'standar' as 'standar' | 'mini' });
  const [varianImageFile, setVarianImageFile] = useState<File | null>(null);
  const [varianImagePreview, setVarianImagePreview] = useState<string>('');
  const [boxForm, setBoxForm] = useState({ nama: '', kapasitas: '', harga_box: '0' });
  const [paketForm, setPaketForm] = useState({ nama: '', category_id: '', box_id: '', harga_paket: '0' });
  const [bundlingForm, setBundlingForm] = useState({ nama: '', deskripsi: '', piilhanItem: '', harga_normal: '0', harga_bundling: '0' });
  const [customPaketForm, setCustomPaketForm] = useState({ nama: '', kapasitas: '', ukuran_donat: 'standar' as 'standar' | 'mini', harga_satuan_default: '0', harga_klasik_full: '0', harga_reguler_full: '0', harga_premium_full: '0' });
  const [tambahanForm, setTambahanForm] = useState({ nama: '', image_url: '', deskripsi: '', harga_jual: '0', harga_pokok_penjualan: '0', ukuran: 'buah' });
  const [tambahanImageFile, setTambahanImageFile] = useState<File | null>(null);
  const [tambahanImagePreview, setTambahanImagePreview] = useState<string>('');

  const formatRp = (n: number | undefined | null) => {
    if (typeof n !== 'number') return 'Rp 0';
    return 'Rp ' + n.toLocaleString('id-ID');
  };

  const inputClass = 'w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-amber-500 text-sm';
  const WARNA_OPTIONS = ['amber', 'blue', 'purple', 'green', 'red', 'pink'];

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleVarianImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVarianImageFile(file);
    try {
      const base64 = await fileToBase64(file);
      setVarianImagePreview(base64);
      setVarianForm({ ...varianForm, image_url: base64 });
    } catch {
      toast.error('Gagal membaca gambar');
    }
  };

  const handleTambahanImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTambahanImageFile(file);
    try {
      const base64 = await fileToBase64(file);
      setTambahanImagePreview(base64);
      setTambahanForm({ ...tambahanForm, image_url: base64 });
    } catch {
      toast.error('Gagal membaca gambar');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setJenisForm({ nama: '', deskripsi: '', icon: 'amber' });
    setVarianForm({ nama: '', category_id: '', image_url: '', harga_dasar: '0', biaya_topping: '0', harga_jual: '0', ukuran: 'standar' });
    setVarianImageFile(null);
    setVarianImagePreview('');
    setBoxForm({ nama: '', kapasitas: '', harga_box: '0' });
    setPaketForm({ nama: '', category_id: '', box_id: '', harga_paket: '0' });
    setBundlingForm({ nama: '', deskripsi: '', piilhanItem: '', harga_normal: '0', harga_bundling: '0' });
    setCustomPaketForm({ nama: '', kapasitas: '', ukuran_donat: 'standar', harga_satuan_default: '0', harga_klasik_full: '0', harga_reguler_full: '0', harga_premium_full: '0' });
    setTambahanForm({ nama: '', image_url: '', deskripsi: '', harga_jual: '0', harga_pokok_penjualan: '0', ukuran: 'buah' });
    setTambahanImageFile(null);
    setTambahanImagePreview('');
  };


  const refreshData = async () => {
    try {
      const [cats, prods, boxes, pkgs, bunds, custs] = await Promise.all([
        getProductCategories(),
        getProductsWithCategory(),
        getBoxes(),
        getPackages(),
        getBundlings(),
        getCustomTemplates()
      ]);
      setJenisList(cats);
      setVarianList(prods.filter((p: ProductWithCategory) => p.tipe_produk === 'donat_varian'));
      setBoxList(boxes);
      setPaketList(pkgs);
      setBundlingList(bunds);
      setCustomPaketList(custs);
      setVarianTambahanList(prods.filter((p: ProductWithCategory) => p.tipe_produk === 'tambahan'));
    } catch (error) {
      console.error('Gagal refresh data:', error);
      toast.error('Gagal refresh data');
    }
  };

  // ═══ HANDLERS (all with try/catch) ═══

  const handleUpdateBasePrice = async () => {
    if (!outlet) { toast.error('Pilih outlet terlebih dahulu'); return; }
    setIsSaving(true);
    try {
      const ok = await upsertOutletProductionCost({
        outlet_id: outlet.id,
        cost_polos_standar: hargaPolos,
        cost_polos_mini: hargaPolosMini
      });
      if (ok) toast.success('Harga dasar berhasil disimpan');
      else toast.error('Gagal menyimpan harga dasar');
    } catch (error) {
      console.error('Error saving base price:', error);
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddJenis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await upsertCategory({ id: editingId || undefined, nama: jenisForm.nama, icon: jenisForm.icon });
      if (ok) { toast.success('Kategori berhasil disimpan'); resetForm(); await refreshData(); }
      else toast.error('Gagal menyimpan kategori');
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Terjadi kesalahan saat menyimpan kategori');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddVarian = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await upsertProduct({
        id: editingId || undefined,
        nama: varianForm.nama,
        category_id: varianForm.category_id,
        image_url: varianForm.image_url,
        harga_pokok_penjualan: Number(varianForm.harga_dasar) + Number(varianForm.biaya_topping),
        harga_jual: Number(varianForm.harga_jual),
        ukuran: varianForm.ukuran,
        tipe_produk: 'donat_varian',
        is_active: true
      });
      if (ok) { toast.success('Varian berhasil disimpan'); resetForm(); await refreshData(); }
      else toast.error('Gagal menyimpan varian');
    } catch (error) {
      console.error('Error saving variant:', error);
      toast.error('Terjadi kesalahan saat menyimpan varian');
    } finally {
      setIsSaving(false);
    }
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
      if (ok) { toast.success('Box berhasil disimpan'); resetForm(); await refreshData(); }
      else toast.error('Gagal menyimpan box');
    } catch (error) {
      console.error('Error saving box:', error);
      toast.error('Terjadi kesalahan saat menyimpan box');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPaket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await upsertPackage({
        id: editingId || undefined,
        nama: paketForm.nama,
        category_id: paketForm.category_id,
        box_id: paketForm.box_id,
        harga_paket: Number(paketForm.harga_paket),
        is_active: true
      });
      if (ok) { toast.success('Paket berhasil disimpan'); resetForm(); await refreshData(); }
      else toast.error('Gagal menyimpan paket');
    } catch (error) {
      console.error('Error saving package:', error);
      toast.error('Terjadi kesalahan saat menyimpan paket');
    } finally {
      setIsSaving(false);
    }
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
      if (ok) { toast.success('Bundling berhasil disimpan'); resetForm(); await refreshData(); }
      else toast.error('Gagal menyimpan bundling');
    } catch (error) {
      console.error('Error saving bundling:', error);
      toast.error('Terjadi kesalahan saat menyimpan bundling');
    } finally {
      setIsSaving(false);
    }
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
      if (ok) { toast.success('Template custom berhasil disimpan'); resetForm(); await refreshData(); }
      else toast.error('Gagal menyimpan template custom');
    } catch (error) {
      console.error('Error saving custom template:', error);
      toast.error('Terjadi kesalahan saat menyimpan template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTambahan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await upsertProduct({
        id: editingId || undefined,
        nama: tambahanForm.nama,
        image_url: tambahanForm.image_url,
        deskripsi: tambahanForm.deskripsi,
        harga_jual: Number(tambahanForm.harga_jual),
        harga_pokok_penjualan: Number(tambahanForm.harga_pokok_penjualan),
        ukuran: tambahanForm.ukuran,
        tipe_produk: 'tambahan',
        is_active: true
      });
      if (ok) { toast.success('Item tambahan berhasil disimpan'); resetForm(); await refreshData(); }
      else toast.error('Gagal menyimpan item tambahan');
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
      if (ok) { toast.success('Berhasil dihapus'); await refreshData(); }
      else toast.error('Gagal menghapus produk');
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Terjadi kesalahan saat menghapus');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return;
    try {
      const ok = await deleteCategory(id);
      if (ok) { toast.success('Kategori dihapus'); await refreshData(); }
      else toast.error('Gagal menghapus kategori');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Terjadi kesalahan saat menghapus');
    }
  };

  const handleDeleteBox = async (id: string) => {
    if (!confirm('Hapus box ini?')) return;
    try {
      const ok = await deleteBox(id);
      if (ok) { toast.success('Box dihapus'); await refreshData(); }
      else toast.error('Gagal menghapus box');
    } catch (error) {
      console.error('Error deleting box:', error);
      toast.error('Terjadi kesalahan saat menghapus');
    }
  };

  // ═══ RENDER: OUTLET PICKER ═══
  if (!outlet || showOutletPicker) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 border border-white">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-4">
              <Icons.Settings size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-800">Pilih Outlet</h1>
            <p className="text-slate-400 mt-2">Pilih outlet untuk mengelola produk.</p>
          </div>
          <div className="space-y-3">
            {outletList.map((o) => (
              <button key={o.id} onClick={() => pilihOutlet(o)}
                className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-amber-400 hover:bg-amber-50 transition-all text-left">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-amber-500 shadow-sm">
                  <Icons.MapPin size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">{o.nama}</p>
                  <p className="text-xs text-slate-400 truncate">{o.alamat}</p>
                </div>
                <Icons.ChevronRight className="text-slate-300 group-hover:text-amber-500" />
              </button>
            ))}
            {outletList.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Icons.AlertCircle size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Belum ada outlet aktif</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══ RENDER: MAIN ═══
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-50 overflow-hidden">

      {/* HEADER */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <Icons.Settings size={24} />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 leading-tight">Manajemen Produk</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{outlet.nama} • Kelola kategori, varian & harga</p>
          </div>
        </div>
        <button onClick={() => setShowOutletPicker(true)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg" title="Ganti Outlet">
          <Icons.RefreshCw size={20} />
        </button>
      </div>

      {/* TABS */}
      <div className="px-6 py-2 bg-white flex gap-2 border-b overflow-x-auto shrink-0 no-scrollbar">
        {([
          { id: 'harga-dasar', label: 'Harga Dasar', icon: Icons.DollarSign },
          { id: 'jenis', label: 'Kategori', icon: Icons.Tags },
          { id: 'varian', label: 'Varian Donat', icon: Icons.CircleDot },
          { id: 'box', label: 'Box', icon: Icons.Package },
          { id: 'paket', label: 'Paket Hemat', icon: Icons.Box },
          { id: 'bundling', label: 'Bundling', icon: Icons.Gift },
          { id: 'custom', label: 'Custom', icon: Icons.Palette },
          { id: 'tambahan', label: 'Tambahan', icon: Icons.Plus },
        ] as const).map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); resetForm(); }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-black transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:bg-slate-50'}`}>
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
              <Icons.Loader2 className="animate-spin mb-4" size={40} />
              <p className="font-bold">Memuat Data Produk...</p>
            </div>
          )}

          {!isLoading && (
            <>
              {/* === TAB: HARGA DASAR === */}
              {activeTab === 'harga-dasar' && (
                <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Harga Dasar Produksi</h3>
                  <p className="text-xs text-slate-400 mb-6">Biaya produksi donat polos (sebelum topping) untuk outlet <strong>{outlet.nama}</strong></p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="p-6 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-amber-200 transition-colors">
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Donat Polos Standar / pcs</label>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-slate-400">Rp</span>
                        <input type="number" value={hargaPolos} onChange={(e) => setHargaPolos(Number(e.target.value))}
                          className="w-full bg-transparent text-3xl font-black text-slate-800 focus:outline-none" />
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-amber-200 transition-colors">
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Donat Polos Mini / pcs</label>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-black text-slate-400">Rp</span>
                        <input type="number" value={hargaPolosMini} onChange={(e) => setHargaPolosMini(Number(e.target.value))}
                          className="w-full bg-transparent text-3xl font-black text-slate-800 focus:outline-none" />
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleUpdateBasePrice} disabled={isSaving}
                    className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black hover:bg-amber-600 transition-colors disabled:opacity-50">
                    {isSaving ? 'Menyimpan...' : 'SIMPAN PERUBAHAN'}
                  </Button>
                </div>
              )}

              {/* === TAB: JENIS / KATEGORI === */}
              {activeTab === 'jenis' && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Kategori Donat</h3>
                    <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">{showForm ? 'BATAL' : '+ TAMBAH'}</Button>
                  </div>

                  {showForm && (
                    <form onSubmit={handleAddJenis} className="mb-6 p-6 bg-slate-50 rounded-2xl border animate-in fade-in slide-in-from-top-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input value={jenisForm.nama} onChange={(e) => setJenisForm({ ...jenisForm, nama: e.target.value })} placeholder="Nama Kategori (misal: Klasik)" className={inputClass} required />
                        <select value={jenisForm.icon} onChange={(e) => setJenisForm({ ...jenisForm, icon: e.target.value })} className={inputClass}>
                          {WARNA_OPTIONS.map(w => <option key={w} value={w}>{w.toUpperCase()}</option>)}
                        </select>
                      </div>
                      <Button type="submit" disabled={isSaving} className="mt-4 bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Menyimpan...' : 'SIMPAN'}
                      </Button>
                    </form>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {jenisList.map(cat => (
                      <div key={cat.id} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        <div className={`w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3`}>
                          <Icons.Tags size={20} />
                        </div>
                        <h4 className="font-black text-slate-800 text-sm">{cat.nama}</h4>
                        <div className="flex gap-3 mt-3 pt-3 border-t border-slate-50">
                          <button onClick={() => { setEditingId(cat.id); setJenisForm({ nama: cat.nama, deskripsi: '', icon: cat.icon || 'amber' }); setShowForm(true); }} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700">Edit</button>
                          <button onClick={() => handleDeleteCategory(cat.id)} className="text-[10px] font-black uppercase text-red-600 hover:text-red-700">Hapus</button>
                        </div>
                      </div>
                    ))}
                    {jenisList.length === 0 && <p className="col-span-full text-center text-slate-400 py-8 text-sm">Belum ada kategori</p>}
                  </div>
                </div>
              )}

              {/* === TAB: VARIAN DONAT === */}
              {activeTab === 'varian' && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Pilihan Rasa Donat</h3>
                    <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">{showForm ? 'BATAL' : '+ TAMBAH'}</Button>
                  </div>

                  {showForm && (
                    <form onSubmit={handleAddVarian} className="mb-6 p-6 bg-slate-50 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Nama Varian</label>
                          <input value={varianForm.nama} onChange={(e) => setVarianForm({ ...varianForm, nama: e.target.value })} className={inputClass} placeholder="Contoh: Choco Crunchy" required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Kategori Rasa</label>
                          <select value={varianForm.category_id} onChange={(e) => setVarianForm({ ...varianForm, category_id: e.target.value })} className={inputClass}>
                            <option value="">Pilih Kategori</option>
                            {jenisList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Ukuran / Tipe</label>
                          <select value={varianForm.ukuran} onChange={(e) => setVarianForm({ ...varianForm, ukuran: e.target.value as 'standar' | 'mini' })} className={inputClass}>
                            <option value="standar">Ukuran Standar</option>
                            <option value="mini">Ukuran Mini</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Harga Dasar / Polos</label>
                          <input type="number" value={varianForm.harga_dasar} onChange={(e) => setVarianForm({ ...varianForm, harga_dasar: e.target.value })} className={inputClass} placeholder="Modal Donat Polos" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Biaya Topping</label>
                          <input type="number" value={varianForm.biaya_topping} onChange={(e) => setVarianForm({ ...varianForm, biaya_topping: e.target.value })} className={inputClass} placeholder="Modal Topping" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Harga Jual Akhir</label>
                          <input type="number" value={varianForm.harga_jual} onChange={(e) => setVarianForm({ ...varianForm, harga_jual: e.target.value })} className={inputClass} placeholder="Harga ke Pelanggan" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">Foto Produk</label>
                          <div className="space-y-2">
                            <input type="file" accept="image/*" onChange={handleVarianImageChange} className={inputClass} />
                            {varianImagePreview && (
                              <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-amber-200">
                                <img src={varianImagePreview} alt="Preview" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 border border-slate-100 rounded-xl space-y-2 !mt-6">
                         <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Harga Dasar</span>
                            <span className="text-slate-600">{formatRp(Number(varianForm.harga_dasar))}</span>
                         </div>
                         <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Biaya Topping</span>
                            <span className="text-slate-600">+ {formatRp(Number(varianForm.biaya_topping))}</span>
                         </div>
                         <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-100 mt-2">
                            <span>Harga Pokok Penjualan (HPP)</span>
                            <span className="text-red-500">{formatRp(Number(varianForm.harga_dasar) + Number(varianForm.biaya_topping))}</span>
                         </div>
                         <div className="flex justify-between text-xs font-black text-slate-800 pt-2">
                            <span>Taksiran Keuntungan /Pcs</span>
                            <span className={Number(varianForm.harga_jual) - (Number(varianForm.harga_dasar) + Number(varianForm.biaya_topping)) > 0 ? 'text-green-600 text-sm' : 'text-red-500 text-sm'}>
                              {formatRp(Number(varianForm.harga_jual) - (Number(varianForm.harga_dasar) + Number(varianForm.biaya_topping)))}
                            </span>
                         </div>
                      </div>
                      <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Menyimpan...' : 'SIMPAN'}
                      </Button>
                    </form>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {varianList.map(v => (
                      <div key={v.id} className="bg-white border border-slate-100 rounded-2xl p-3 hover:shadow-md transition-all">
                        <div className="aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center text-2xl overflow-hidden">
                          {v.image_url ? (v.image_url.startsWith('http') ? <img src={v.image_url} className="w-full h-full object-cover" alt={v.nama} /> : v.image_url) : <Icons.Circle size={24} className="text-slate-200" />}
                        </div>
                        <h4 className="font-bold text-slate-800 text-xs truncate">{v.nama}</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{v.category?.nama || '-'}</p>
                        <div className="flex justify-between items-end mt-2">
                          <p className="text-amber-600 font-black text-xs">{formatRp(v.harga_jual)}</p>
                        </div>
                        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-50">
                          <button onClick={() => { setEditingId(v.id); setVarianForm({ nama: v.nama, category_id: v.category_id || '', image_url: v.image_url || '', harga_dasar: String((v.ukuran === 'standar' ? hargaPolos : hargaPolosMini) || 0), biaya_topping: String((v.harga_pokok_penjualan || 0) - ((v.ukuran === 'standar' ? hargaPolos : hargaPolosMini) || 0)), harga_jual: String(v.harga_jual), ukuran: (v.ukuran as 'standar' | 'mini') || 'standar' }); if (v.image_url && v.image_url.startsWith('data:')) { setVarianImagePreview(v.image_url); } else { setVarianImagePreview(''); } setShowForm(true); }} className="flex-1 text-[9px] uppercase font-black text-blue-600 hover:text-blue-700 py-1">Edit</button>
                          <button onClick={() => handleDeleteProduct(v.id)} className="flex-1 text-[9px] uppercase font-black text-red-600 hover:text-red-700 py-1">Hapus</button>
                        </div>
                      </div>
                    ))}
                    {varianList.length === 0 && <p className="col-span-full text-center text-slate-400 py-8 text-sm">Belum ada varian donat</p>}
                  </div>
                </div>
              )}

              {/* === TAB: BOX === */}
              {activeTab === 'box' && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Master Box / Kemasan</h3>
                    <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">{showForm ? 'BATAL' : '+ TAMBAH'}</Button>
                  </div>

                  {showForm && (
                    <form onSubmit={handleAddBox} className="mb-6 p-6 bg-slate-50 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input value={boxForm.nama} onChange={(e) => setBoxForm({ ...boxForm, nama: e.target.value })} className={inputClass} placeholder="Nama Box (misal: Box 6pcs)" required />
                        <input type="number" value={boxForm.kapasitas} onChange={(e) => setBoxForm({ ...boxForm, kapasitas: e.target.value })} className={inputClass} placeholder="Kapasitas (pcs)" />
                        <input type="number" value={boxForm.harga_box} onChange={(e) => setBoxForm({ ...boxForm, harga_box: e.target.value })} className={inputClass} placeholder="Harga Box" />
                      </div>
                      <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Menyimpan...' : 'SIMPAN'}
                      </Button>
                    </form>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {boxList.map(b => (
                      <div key={b.id} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                          <Icons.Package size={24} />
                        </div>
                        <h4 className="font-black text-slate-800 text-sm">{b.nama}</h4>
                        <p className="text-xs text-slate-400 font-bold mt-1">Kapasitas: {b.kapasitas} pcs</p>
                        <p className="text-amber-600 font-black text-sm mt-2">{formatRp(b.harga_box)}</p>
                        <div className="flex gap-3 mt-3 pt-3 border-t border-slate-50">
                          <button onClick={() => { setEditingId(b.id); setBoxForm({ nama: b.nama, kapasitas: String(b.kapasitas), harga_box: String(b.harga_box) }); setShowForm(true); }} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700">Edit</button>
                          <button onClick={() => handleDeleteBox(b.id)} className="text-[10px] font-black uppercase text-red-600 hover:text-red-700">Hapus</button>
                        </div>
                      </div>
                    ))}
                    {boxList.length === 0 && <p className="col-span-full text-center text-slate-400 py-8 text-sm">Belum ada box</p>}
                  </div>
                </div>
              )}

              {/* === TAB: PAKET HEMAT === */}
              {activeTab === 'paket' && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Paket Hemat</h3>
                    <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">{showForm ? 'BATAL' : '+ TAMBAH'}</Button>
                  </div>

                  {showForm && (
                    <form onSubmit={handleAddPaket} className="mb-6 p-6 bg-slate-50 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input value={paketForm.nama} onChange={(e) => setPaketForm({ ...paketForm, nama: e.target.value })} className={inputClass} placeholder="Nama Paket" required />
                        <select value={paketForm.category_id} onChange={(e) => setPaketForm({ ...paketForm, category_id: e.target.value })} className={inputClass}>
                          <option value="">Pilih Kategori</option>
                          {jenisList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                        </select>
                        <select value={paketForm.box_id} onChange={(e) => setPaketForm({ ...paketForm, box_id: e.target.value })} className={inputClass}>
                          <option value="">Pilih Box</option>
                          {boxList.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-1">
                        <input type="number" value={paketForm.harga_paket} onChange={(e) => setPaketForm({ ...paketForm, harga_paket: e.target.value })} className={inputClass} placeholder="Harga Paket" />
                      </div>
                      <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Menyimpan...' : 'SIMPAN'}
                      </Button>
                    </form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paketList.map(p => (
                      <div key={p.id} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-3 text-amber-600">
                          <Icons.Box size={24} />
                        </div>
                        <h4 className="font-black text-slate-800 text-sm">{p.nama}</h4>
                        <p className="text-xs text-slate-400 font-bold mt-1">Kapasitas: {p.kapasitas} pcs</p>
                        <p className="text-amber-600 font-black text-sm mt-2">{formatRp(p.harga_paket)}</p>
                        <div className="flex gap-3 mt-3 pt-3 border-t border-slate-50">
                          <button onClick={() => { setEditingId(p.id); setPaketForm({ nama: p.nama, category_id: p.category_id || '', box_id: p.box_id || '', harga_paket: String(p.harga_paket) }); setShowForm(true); }} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700">Edit</button>
                        </div>
                      </div>
                    ))}
                    {paketList.length === 0 && <p className="col-span-full text-center text-slate-400 py-8 text-sm">Belum ada paket</p>}
                  </div>
                </div>
              )}

              {/* === TAB: BUNDLING === */}
              {activeTab === 'bundling' && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Promo Bundling</h3>
                    <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">{showForm ? 'BATAL' : '+ TAMBAH'}</Button>
                  </div>

                  {showForm && (
                    <form onSubmit={handleAddTambahan} className="mb-6 p-6 bg-slate-50 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input value={tambahanForm.nama} onChange={(e) => setTambahanForm({ ...tambahanForm, nama: e.target.value })} className={inputClass} placeholder="Nama Tambahan" required />
                        <div className="space-y-2">
                          <input type="file" accept="image/*" onChange={handleTambahanImageChange} className={inputClass} />
                          {tambahanImagePreview && (
                            <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-amber-200">
                              <img src={tambahanImagePreview} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="number" value={bundlingForm.harga_bundling} onChange={(e) => setBundlingForm({ ...bundlingForm, harga_bundling: e.target.value })} className={inputClass} placeholder="Harga Bundling" />
                      </div>
                      <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Menyimpan...' : 'SIMPAN'}
                      </Button>
                    </form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bundlingList.map(b => (
                      <div key={b.id} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center mb-3 text-purple-600">
                          <Icons.Gift size={24} />
                        </div>
                        <h4 className="font-black text-slate-800 text-sm">{b.nama}</h4>
                        <p className="text-xs text-slate-400 font-bold mt-1">{b.deskripsi || '-'}</p>
                        <p className="text-amber-600 font-black text-sm mt-2">{formatRp(b.harga_bundling)}</p>
                        <div className="flex gap-3 mt-3 pt-3 border-t border-slate-50">
                          <button onClick={() => { setEditingId(b.id); setBundlingForm({ nama: b.nama, deskripsi: b.deskripsi || '', piilhanItem: '', harga_normal: '0', harga_bundling: String(b.harga_bundling) }); setShowForm(true); }} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700">Edit</button>
                        </div>
                      </div>
                    ))}
                    {bundlingList.length === 0 && <p className="col-span-full text-center text-slate-400 py-8 text-sm">Belum ada bundling</p>}
                  </div>
                </div>
              )}

              {/* === TAB: CUSTOM === */}
              {activeTab === 'custom' && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Custom Order Template</h3>
                    <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">{showForm ? 'BATAL' : '+ TAMBAH'}</Button>
                  </div>

                  {showForm && (
                    <form onSubmit={handleAddCustomPaket} className="mb-6 p-6 bg-slate-50 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input value={customPaketForm.nama} onChange={(e) => setCustomPaketForm({ ...customPaketForm, nama: e.target.value })} className={inputClass} placeholder="Nama Template" required />
                        <input type="number" value={customPaketForm.kapasitas} onChange={(e) => setCustomPaketForm({ ...customPaketForm, kapasitas: e.target.value })} className={inputClass} placeholder="Kapasitas" />
                        <select value={customPaketForm.ukuran_donat} onChange={(e) => setCustomPaketForm({ ...customPaketForm, ukuran_donat: e.target.value as 'standar' | 'mini' })} className={inputClass}>
                          <option value="standar">Standar</option>
                          <option value="mini">Mini</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <input type="number" value={customPaketForm.harga_satuan_default} onChange={(e) => setCustomPaketForm({ ...customPaketForm, harga_satuan_default: e.target.value })} className={inputClass} placeholder="Harga Satuan" />
                        <input type="number" value={customPaketForm.harga_klasik_full} onChange={(e) => setCustomPaketForm({ ...customPaketForm, harga_klasik_full: e.target.value })} className={inputClass} placeholder="Harga Klasik" />
                        <input type="number" value={customPaketForm.harga_reguler_full} onChange={(e) => setCustomPaketForm({ ...customPaketForm, harga_reguler_full: e.target.value })} className={inputClass} placeholder="Harga Reguler" />
                        <input type="number" value={customPaketForm.harga_premium_full} onChange={(e) => setCustomPaketForm({ ...customPaketForm, harga_premium_full: e.target.value })} className={inputClass} placeholder="Harga Premium" />
                      </div>
                      <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Menyimpan...' : 'SIMPAN'}
                      </Button>
                    </form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customPaketList.map(c => (
                      <div key={c.id} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                        <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center mb-3 text-pink-600">
                          <Icons.Palette size={24} />
                        </div>
                        <h4 className="font-black text-slate-800 text-sm">{c.nama}</h4>
                        <p className="text-xs text-slate-400 font-bold mt-1">Kapasitas: {c.kapasitas} pcs • {c.ukuran_donat}</p>
                        <p className="text-amber-600 font-black text-xs mt-2">{formatRp(c.harga_satuan_default)} /pcs</p>
                        <div className="flex gap-3 mt-3 pt-3 border-t border-slate-50">
                          <button onClick={() => { setEditingId(c.id); setCustomPaketForm({ nama: c.nama, kapasitas: String(c.kapasitas), ukuran_donat: c.ukuran_donat, harga_satuan_default: String(c.harga_satuan_default), harga_klasik_full: String(c.harga_klasik_full), harga_reguler_full: String(c.harga_reguler_full), harga_premium_full: String(c.harga_premium_full) }); setShowForm(true); }} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700">Edit</button>
                        </div>
                      </div>
                    ))}
                    {customPaketList.length === 0 && <p className="col-span-full text-center text-slate-400 py-8 text-sm">Belum ada template custom</p>}
                  </div>
                </div>
              )}

              {/* === TAB: TAMBAHAN === */}
              {activeTab === 'tambahan' && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Produk Tambahan / Topping</h3>
                    <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">{showForm ? 'BATAL' : '+ TAMBAH'}</Button>
                  </div>

                  {showForm && (
                    <form onSubmit={handleAddTambahan} className="mb-6 p-6 bg-slate-50 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input value={tambahanForm.nama} onChange={(e) => setTambahanForm({ ...tambahanForm, nama: e.target.value })} className={inputClass} placeholder="Nama Tambahan" required />
                        <div className="space-y-2">
                          <input type="file" accept="image/*" onChange={handleTambahanImageChange} className={inputClass} />
                          {tambahanImagePreview && (
                            <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-amber-200">
                              <img src={tambahanImagePreview} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input type="number" value={tambahanForm.harga_jual} onChange={(e) => setTambahanForm({ ...tambahanForm, harga_jual: e.target.value })} className={inputClass} placeholder="Harga Jual" />
                        <input type="number" value={tambahanForm.harga_pokok_penjualan} onChange={(e) => setTambahanForm({ ...tambahanForm, harga_pokok_penjualan: e.target.value })} className={inputClass} placeholder="HPP" />
                        <input value={tambahanForm.ukuran} onChange={(e) => setTambahanForm({ ...tambahanForm, ukuran: e.target.value })} className={inputClass} placeholder="Satuan (buah/sendok)" />
                      </div>
                      <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Menyimpan...' : 'SIMPAN'}
                      </Button>
                    </form>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {tambahanList.map(t => (
                      <div key={t.id} className="bg-white border border-slate-100 rounded-2xl p-3 hover:shadow-md transition-all">
                        <div className="aspect-square bg-slate-50 rounded-xl mb-3 flex items-center justify-center text-2xl overflow-hidden">
                          {t.image_url ? (t.image_url.startsWith('http') ? <img src={t.image_url} className="w-full h-full object-cover" alt={t.nama} /> : t.image_url) : <Icons.Plus size={24} className="text-slate-200" />}
                        </div>
                        <h4 className="font-bold text-slate-800 text-xs truncate">{t.nama}</h4>
                        <p className="text-amber-600 font-black text-xs mt-2">{formatRp(t.harga_jual)}</p>
                        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-50">
                          <button onClick={() => { setEditingId(t.id); setTambahanForm({ nama: t.nama, image_url: t.image_url || '', deskripsi: t.deskripsi || '', harga_jual: String(t.harga_jual), harga_pokok_penjualan: String(t.harga_pokok_penjualan), ukuran: t.ukuran || 'buah' }); if (t.image_url && (t.image_url.startsWith('data:') || t.image_url.startsWith('http'))) { setTambahanImagePreview(t.image_url); } else { setTambahanImagePreview(''); } setShowForm(true); }} className="flex-1 text-[9px] uppercase font-black text-blue-600 hover:text-blue-700 py-1">Edit</button>
                          <button onClick={() => handleDeleteProduct(t.id)} className="flex-1 text-[9px] uppercase font-black text-red-600 hover:text-red-700 py-1">Hapus</button>
                        </div>
                      </div>
                    ))}
                    {tambahanList.length === 0 && <p className="col-span-full text-center text-slate-400 py-8 text-sm">Belum ada produk tambahan</p>}
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
