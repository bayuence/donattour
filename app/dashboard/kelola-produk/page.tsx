'use client';

import { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  getProductsWithCategory, getProductCategories, getBoxes, getPackages,
  getBundlings, getCustomTemplates, getOutletProductionCost,
  upsertProduct, upsertCategory, upsertBox, upsertPackage,
  upsertBundling, upsertCustomTemplate, upsertOutletProductionCost,
  deleteProduct, deleteCategory, deleteBox, getActiveOutlets,
  uploadProductImage, deleteProductImage
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

  // HPP (biaya produksi donat polos)
  const [hargaPolos, setHargaPolos] = useState(1500);
  const [hargaPolosMini, setHargaPolosMini] = useState(800);
  // Harga jual donat polos (tanpa topping)
  const [hargaJualPolos, setHargaJualPolos] = useState(0);
  const [hargaJualPolosMini, setHargaJualPolosMini] = useState(0);
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
          setHargaJualPolos(cost.harga_jual_polos_standar ?? 0);
          setHargaJualPolosMini(cost.harga_jual_polos_mini ?? 0);
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

  const inputClass = 'w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-amber-500 focus:bg-white focus:shadow-lg focus:shadow-amber-500/5 transition-all text-sm font-medium text-slate-700 placeholder:text-slate-300';
  const WARNA_OPTIONS = ['amber', 'blue', 'purple', 'green', 'rose', 'pink', 'indigo', 'emerald'] as const;

  const getColorClasses = (color: string) => {
    const map: Record<string, string> = {
      amber: 'bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-500',
      blue: 'bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-500',
      purple: 'bg-purple-50 text-purple-600 border-purple-100 group-hover:bg-purple-500',
      green: 'bg-green-50 text-green-600 border-green-100 group-hover:bg-green-500',
      rose: 'bg-rose-50 text-rose-600 border-rose-100 group-hover:bg-rose-500',
      pink: 'bg-pink-50 text-pink-600 border-pink-100 group-hover:bg-pink-500',
      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-500',
      emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-500',
    };
    return map[color] || map.amber;
  };

  const getTextHoverClasses = (color: string) => {
    const map: Record<string, string> = {
      amber: 'group-hover:text-amber-600',
      blue: 'group-hover:text-blue-600',
      purple: 'group-hover:text-purple-600',
      green: 'group-hover:text-green-600',
      rose: 'group-hover:text-rose-600',
      pink: 'group-hover:text-pink-600',
      indigo: 'group-hover:text-indigo-600',
      emerald: 'group-hover:text-emerald-600',
    };
    return map[color] || map.amber;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Removed auto-update harga_dasar effect for multi-size form

  const handleVarianImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVarianImageFile(file);
    const preview = URL.createObjectURL(file);
    setVarianImagePreview(preview);
  };

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
    setEditingVarianIdStandar(null);
    setEditingVarianIdMini(null);
    setJenisForm({ nama: '', deskripsi: '', icon: 'amber' });
    setVarianForm({ nama: '', category_id: '', image_url: '', biaya_topping_standar: '0', harga_jual_standar: '0', biaya_topping_mini: '0', harga_jual_mini: '0', aktif_standar: true, aktif_mini: true });
    setVarianImageFile(null);
    setVarianImagePreview('');
    setBoxForm({ nama: '', kapasitas: '', harga_box: '0' });
    setPaketForm({ nama: '', category_id: '', box_id: '', harga_paket: '0' });
    setBundlingForm({ nama: '', deskripsi: '', piilhanItem: '', harga_normal: '0', harga_bundling: '0' });
    setCustomPaketForm({ nama: '', kapasitas: '', ukuran_donat: 'standar', harga_satuan_default: '0', harga_klasik_full: '0', harga_reguler_full: '0', harga_premium_full: '0' });
    setTambahanForm({ nama: '', image_url: '', deskripsi: '', harga_jual: '0', harga_pokok_penjualan: '0', ukuran: 'buah' });
    setTambahanImageFile(null);
    setTambahanImagePreview('');
    if (varianImagePreview && varianImagePreview.startsWith('blob:')) URL.revokeObjectURL(varianImagePreview);
    if (tambahanImagePreview && tambahanImagePreview.startsWith('blob:')) URL.revokeObjectURL(tambahanImagePreview);
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
        cost_polos_mini: hargaPolosMini,
        harga_jual_polos_standar: hargaJualPolos,
        harga_jual_polos_mini: hargaJualPolosMini,
      });
      if (ok) toast.success('HPP & Harga Jual Polos disimpan', {
        description: `Outlet ${outlet.nama} • Standar: Rp${hargaPolos.toLocaleString('id-ID')} HPP / Rp${hargaJualPolos.toLocaleString('id-ID')} Jual • Mini: Rp${hargaPolosMini.toLocaleString('id-ID')} HPP / Rp${hargaJualPolosMini.toLocaleString('id-ID')} Jual`,
      });
      else toast.error('Gagal menyimpan harga dasar', { description: 'Periksa koneksi dan coba lagi.' });
    } catch (error) {
      console.error('Error saving base price:', error);
      toast.error('Terjadi kesalahan saat menyimpan harga dasar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddJenis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await upsertCategory({ id: editingId || undefined, nama: jenisForm.nama, icon: jenisForm.icon });
      if (ok) { toast.success(editingId ? 'Kategori diperbarui' : 'Kategori baru ditambahkan', {
        description: `"${jenisForm.nama}" berhasil ${editingId ? 'diubah' : 'disimpan'} di tab Kategori.`,
      }); resetForm(); await refreshData(); }
      else toast.error('Gagal menyimpan kategori', { description: 'Periksa koneksi dan coba lagi.' });
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
      let finalImageUrl = varianForm.image_url;
      
      // Jika ada file baru, unggah ke storage
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
      if (ok) { toast.success(editingId ? 'Box diperbarui' : 'Box baru ditambahkan', {
        description: `"${boxForm.nama}" • Kapasitas: ${boxForm.kapasitas} pcs • Harga: Rp${Number(boxForm.harga_box).toLocaleString('id-ID')}`,
      }); resetForm(); await refreshData(); }
      else toast.error('Gagal menyimpan box', { description: 'Periksa data dan coba lagi.' });
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
      if (ok) { toast.success(editingId ? 'Paket diperbarui' : 'Paket baru ditambahkan', {
        description: `"${paketForm.nama}" • Harga: Rp${Number(paketForm.harga_paket).toLocaleString('id-ID')}`,
      }); resetForm(); await refreshData(); }
      else toast.error('Gagal menyimpan paket', { description: 'Periksa data dan coba lagi.' });
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
      if (ok) { toast.success(editingId ? 'Bundling diperbarui' : 'Bundling baru ditambahkan', {
        description: `"${bundlingForm.nama}" • Harga: Rp${Number(bundlingForm.harga_bundling).toLocaleString('id-ID')}`,
      }); resetForm(); await refreshData(); }
      else toast.error('Gagal menyimpan bundling', { description: 'Periksa data dan coba lagi.' });
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
      if (ok) { toast.success(editingId ? 'Template Custom diperbarui' : 'Template Custom baru ditambahkan', {
        description: `"${customPaketForm.nama}" • ${customPaketForm.kapasitas} pcs • ${customPaketForm.ukuran_donat}`,
      }); resetForm(); await refreshData(); }
      else toast.error('Gagal menyimpan template custom', { description: 'Periksa data dan coba lagi.' });
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
      if (ok) { toast.success(editingId ? 'Item Tambahan diperbarui' : 'Item Tambahan baru ditambahkan', {
        description: `"${tambahanForm.nama}" • Jual: Rp${Number(tambahanForm.harga_jual).toLocaleString('id-ID')} • HPP: Rp${Number(tambahanForm.harga_pokok_penjualan).toLocaleString('id-ID')}`,
      }); resetForm(); await refreshData(); }
      else toast.error('Gagal menyimpan item tambahan', { description: 'Periksa data dan coba lagi.' });
    } catch (error) {
      console.error('Error saving tambahan:', error);
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setIsSaving(false);
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

  // --- Smart Paket Insights ---
  const paketInsight = useMemo(() => {
    const { category_id, box_id, harga_paket } = paketForm;
    if (!category_id || !box_id) return null;

    const selectedBox = boxList.find(b => b.id === box_id);
    if (!selectedBox) return null;

    const capacity = selectedBox.kapasitas || 0;
    const boxCost = selectedBox.harga_box || 0;

    // Ambil semua donat standar di kategori ini
    const variantsInCategory = groupedVarian.filter(v => v.category_id === category_id && v.standar);
    
    if (variantsInCategory.length === 0) return { empty: true };

    const avgJual = variantsInCategory.reduce((acc, v) => acc + (v.standar?.harga_jual || 0), 0) / variantsInCategory.length;
    const avgHpp = variantsInCategory.reduce((acc, v) => acc + (v.standar?.harga_pokok_penjualan || 0), 0) / variantsInCategory.length;

    const totalNormal = (avgJual * capacity) + boxCost;
    const totalHpp = (avgHpp * capacity) + boxCost;
    const sellingPrice = parseInt(harga_paket || '0');
    
    const profit = sellingPrice - totalHpp;
    const hemat = totalNormal - sellingPrice;
    const marginPercent = totalHpp > 0 ? (profit / totalHpp) * 100 : 0;

    return {
      avgJual,
      avgHpp,
      totalNormal,
      totalHpp,
      profit,
      hemat,
      marginPercent,
      capacity,
      categoryName: variantsInCategory[0].category_nama,
      count: variantsInCategory.length
    };
  }, [paketForm, groupedVarian, boxList]);

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

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Hapus produk ini?')) return;
    try {
      const ok = await deleteProduct(id);
      if (ok) { toast.success('Produk dihapus', { description: 'Data telah dihapus dari sistem.' }); await refreshData(); }
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
      if (ok) { toast.success('Kategori dihapus', { description: 'Kategori telah dihapus dari sistem.' }); await refreshData(); }
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
      if (ok) { toast.success('Box dihapus', { description: 'Box telah dihapus dari sistem.' }); await refreshData(); }
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
      <div className="bg-white/80 backdrop-blur-3xl border-b px-8 py-6 flex items-center justify-between shrink-0 shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 rotate-3 group hover:rotate-0 transition-transform cursor-pointer">
            <Icons.Settings size={28} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none tracking-tight uppercase">Manajemen Produk</h1>
            <div className="flex items-center gap-2 mt-1.5">
               <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
               <p className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">
                  <span className="text-amber-600">{outlet.nama}</span> • {activeTab.replace('-', ' ')}
               </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setShowOutletPicker(true)} 
            className="flex items-center gap-2 px-5 py-3 bg-slate-50 border border-slate-100 text-slate-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest">
            <Icons.MapPin size={14} /> GANTI OUTLET
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="px-6 py-2 bg-white flex gap-2 border-b overflow-x-auto shrink-0 no-scrollbar">
        {([
          { id: 'harga-dasar', label: 'Harga Dasar', icon: Icons.DollarSign },
          { id: 'jenis', label: 'Kategori', icon: Icons.Tags },
          { id: 'varian', label: 'Varian Donat', icon: Icons.CircleDot },
          { id: 'box', label: 'Box', icon: Icons.Package },
          { id: 'paket', label: 'Paket', icon: Icons.Box },
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
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
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
                <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm max-w-2xl mx-auto">

                  {/* Header + Save button inline */}
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

                  {/* Legend */}
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

                  {/* STANDAR row */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-amber-500 rounded-md flex items-center justify-center shrink-0">
                      <Icons.Maximize size={11} className="text-white" />
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Standar</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {/* HPP Standar */}
                    <div className="p-3 bg-red-50 rounded-2xl border border-red-100 hover:border-red-300 transition-all">
                      <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">HPP</p>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-red-300">Rp</span>
                        <CurrencyInput value={hargaPolos}
                          onChange={(e) => setHargaPolos(Number(e.target.value))}
                          className="w-full bg-transparent text-lg font-black text-red-600 focus:outline-none min-w-0" />
                      </div>
                    </div>
                    {/* Harga Jual Standar */}
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

                  {/* MINI row */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-slate-600 rounded-md flex items-center justify-center shrink-0">
                      <Icons.Minimize size={11} className="text-white" />
                    </div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mini</span>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {/* HPP Mini */}
                    <div className="p-3 bg-red-50 rounded-2xl border border-red-100 hover:border-red-300 transition-all">
                      <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-1">HPP</p>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-red-300">Rp</span>
                        <CurrencyInput value={hargaPolosMini}
                          onChange={(e) => setHargaPolosMini(Number(e.target.value))}
                          className="w-full bg-transparent text-lg font-black text-red-600 focus:outline-none min-w-0" />
                      </div>
                    </div>
                    {/* Harga Jual Mini */}
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

                  {/* Info note */}
                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <Icons.Info size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                      HPP menjadi <strong>harga dasar</strong> saat buat varian baru. Harga jual polos untuk donat dijual <strong>tanpa topping</strong>.
                    </p>
                  </div>
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
              )}

              {/* === TAB: VARIAN DONAT === */}
              {activeTab === 'varian' && (
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
                          <select value={varianForm.category_id} onChange={(e) => setVarianForm({ ...varianForm, category_id: e.target.value })} className={inputClass}>
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
                    <div className="grid grid-cols-[56px_1.5fr_1fr_1.5fr_1.5fr_80px] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
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
                        <div key={`${v.nama}_${idx}`} className={`grid grid-cols-[56px_1.5fr_1fr_1.5fr_1.5fr_80px] gap-3 items-center px-4 py-3 hover:bg-amber-50/40 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                          {/* Foto */}
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 shrink-0">
                            {v.image_url
                              ? <img src={v.image_url} alt={v.nama} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-slate-300"><Icons.Image size={20} /></div>
                            }
                          </div>
                          {/* Nama & Kategori */}
                          <div className="min-w-0">
                            <p className="font-black text-slate-800 text-sm leading-tight mb-1">{v.nama}</p>
                            <span className="text-[9px] font-bold text-slate-500 bg-white border px-1.5 py-0.5 rounded shadow-sm">
                              {v.category_nama || '—'}
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
                          <div className="flex items-center gap-1.5 justify-end">
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
                              className="w-8 h-8 bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white rounded-lg flex items-center justify-center transition-all"
                            >
                              <Icons.Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteVarianGroup(standar?.id, mini?.id)}
                              className="w-8 h-8 bg-red-50 hover:bg-red-500 text-red-400 hover:text-white rounded-lg flex items-center justify-center transition-all"
                            >
                              <Icons.Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {varianList.length === 0 && (
                    <div className="py-16 text-center text-slate-300">
                      <Icons.CircleDot size={40} className="mx-auto mb-3 opacity-30" />
                      <p className="text-xs font-black uppercase tracking-[0.3em]">Belum ada varian donat</p>
                    </div>
                  )}
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
              )}

              {/* === TAB: PAKET === */}
              {activeTab === 'paket' && (
                <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Paket</h3>
                    <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">{showForm ? 'BATAL' : '+ TAMBAH'}</Button>
                  </div>

                  {showForm && (
                    <form onSubmit={handleAddPaket} className="mb-6 p-6 bg-slate-50 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Paket Donat</label>
                           <input value={paketForm.nama} onChange={(e) => setPaketForm({ ...paketForm, nama: e.target.value })} className={inputClass} placeholder="Nama Paket" required />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Kategori Rasa</label>
                           <select value={paketForm.category_id} onChange={(e) => setPaketForm({ ...paketForm, category_id: e.target.value })} className={inputClass}>
                             <option value="">Pilih Kategori</option>
                             {jenisList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                           </select>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Gunakan Box Opsional</label>
                           <select value={paketForm.box_id} onChange={(e) => setPaketForm({ ...paketForm, box_id: e.target.value })} className={inputClass}>
                             <option value="">Pilih Box Opsional</option>
                             {boxList.map(b => <option key={b.id} value={b.id}>{b.nama}</option>)}
                           </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Harga Jual Paket (Rp)</label>
                           <CurrencyInput value={paketForm.harga_paket} onChange={(e) => setPaketForm({ ...paketForm, harga_paket: e.target.value })} className={inputClass} placeholder="Harga Paket" />
                        </div>
                      </div>

                      {/* SMART INSIGHT CARD */}
                      {paketInsight && !paketInsight.empty && (
                        <div className="p-5 bg-white border-2 border-slate-100 rounded-3xl animate-in zoom-in-95 duration-300">
                          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-50">
                             <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg">
                               <Icons.LineChart size={14} />
                             </div>
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Estimasi Bisnis Paket</p>
                          </div>
                          
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                             <div>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">HPP (Modal)</p>
                               <p className="text-sm font-black text-slate-800">{formatRp(paketInsight.totalHpp)}</p>
                               <p className="text-[8px] text-slate-400 mt-0.5 leading-tight">Incl. Box & {paketInsight.capacity} Donat</p>
                             </div>
                             <div>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">Harga Normal</p>
                               <p className="text-sm font-black text-slate-800">{formatRp(paketInsight.totalNormal)}</p>
                               <p className="text-[8px] text-slate-400 mt-0.5 leading-tight">Jika beli Satuan</p>
                             </div>
                             <div>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">Laba (Margin)</p>
                               <div className="flex items-baseline gap-1">
                                 <p className={`text-sm font-black ${paketInsight.profit >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{formatRp(paketInsight.profit)}</p>
                                 <p className={`text-[9px] font-bold ${paketInsight.profit >= 0 ? "text-emerald-500/70" : "text-rose-400"}`}>({paketInsight.marginPercent.toFixed(0)}%)</p>
                               </div>
                               <p className="text-[8px] text-slate-400 mt-0.5 leading-tight">Potensi keuntungan</p>
                             </div>
                             <div>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-1">Hemat Pelanggan</p>
                               <p className="text-sm font-black text-amber-600">{formatRp(paketInsight.hemat)}</p>
                               <p className="text-[8px] text-slate-400 mt-0.5 leading-tight">Nilai diskon paket</p>
                             </div>
                          </div>

                          {paketInsight.profit < 0 && (
                            <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3">
                               <Icons.AlertTriangle className="text-rose-500 shrink-0" size={16} />
                               <p className="text-[10px] font-bold text-rose-600 leading-tight">
                                 Peringatan: Harga jual lebih rendah dari modal produksi. Disarankan menaikkan harga di atas {formatRp(paketInsight.totalHpp)}.
                               </p>
                            </div>
                          )}
                        </div>
                      )}

                      {paketInsight?.empty && (
                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
                           <Icons.Info className="text-amber-500 shrink-0" size={16} />
                           <p className="text-[10px] font-bold text-amber-700">
                             Tidak ada varian "Standar" dalam kategori ini untuk dihitung. Pastikan varian dalam kategori ini sudah diaktifkan ukuran standarnya.
                           </p>
                        </div>
                      )}

                      <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50">
                        {isSaving ? 'Menyimpan...' : 'SIMPAN'}
                      </Button>
                    </form>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paketList.map(p => (
                      <div key={p.id} className="group relative p-8 bg-white border border-slate-100 rounded-[40px] shadow-sm hover:shadow-2xl hover:border-amber-300 transition-all overflow-hidden flex items-center gap-6">
                        <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center shadow-inner transition-all duration-500 shrink-0">
                           <Icons.Box size={32} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-1 truncate">{p.nama}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Isi {p.kapasitas} pcs • {p.box?.nama || 'Box'}</p>
                          <p className="text-amber-600 font-black text-xl">{formatRp(p.harga_paket)}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                           <button onClick={() => { setEditingId(p.id); setPaketForm({ nama: p.nama, category_id: p.category_id || '', box_id: p.box_id || '', harga_paket: String(p.harga_paket) }); setShowForm(true); }} className="p-3 bg-slate-50 hover:bg-amber-50 text-slate-300 hover:text-amber-600 rounded-2xl transition-all">
                              <Icons.Edit3 size={18} />
                           </button>
                        </div>
                      </div>
                    ))}
                    {paketList.length === 0 && <p className="col-span-full text-center text-slate-300 py-16 text-xs font-black uppercase tracking-[0.3em] border-2 border-dashed rounded-[40px]">Belum ada paket</p>}
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
                      <div key={b.id} className="group relative p-8 bg-white border border-slate-100 rounded-[40px] shadow-sm hover:shadow-2xl hover:border-amber-300 transition-all overflow-hidden">
                        <div className="relative z-10">
                           <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center mb-6 shadow-inner transition-all duration-500">
                             <Icons.Gift size={32} />
                           </div>
                           <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-2 truncate">{b.nama}</h4>
                           <p className="text-xs text-slate-400 font-medium mb-6 line-clamp-2">{b.deskripsi || 'Promo paket spesial.'}</p>
                           <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                              <p className="text-purple-600 font-black text-xl">{formatRp(b.harga_bundling)}</p>
                              <div className="flex gap-2">
                                <button onClick={() => { setEditingId(b.id); setBundlingForm({ nama: b.nama, deskripsi: b.deskripsi || '', piilhanItem: b.pilihan_item || '', harga_normal: String(b.harga_normal || 0), harga_bundling: String(b.harga_bundling) }); setShowForm(true); }} className="p-3 bg-slate-50 hover:bg-purple-50 text-slate-300 hover:text-purple-600 rounded-2xl transition-all">
                                   <Icons.Edit3 size={18} />
                                </button>
                              </div>
                           </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
                      </div>
                    ))}
                    {bundlingList.length === 0 && <p className="col-span-full text-center text-slate-300 py-16 text-xs font-black uppercase tracking-[0.3em] border-2 border-dashed rounded-[40px]">Belum ada bundling</p>}
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
                      <div key={c.id} className="group relative p-8 bg-white border border-slate-100 rounded-[40px] shadow-sm hover:shadow-2xl hover:border-amber-300 transition-all overflow-hidden flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-[32px] bg-pink-50 text-pink-500 group-hover:bg-pink-500 group-hover:text-white flex items-center justify-center mb-6 shadow-inner transition-all duration-500">
                           <Icons.Palette size={32} />
                        </div>
                        <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-2 truncate w-full">{c.nama}</h4>
                        <div className="flex items-center gap-2 mb-6">
                           <span className="px-3 py-1 bg-slate-50 rounded-full text-[9px] font-black text-slate-400 h-fit uppercase tracking-widest">{c.kapasitas} Pcs</span>
                           <span className="px-3 py-1 bg-slate-50 rounded-full text-[9px] font-black text-slate-400 h-fit uppercase tracking-widest">{c.ukuran_donat}</span>
                        </div>
                        <p className="text-amber-600 font-black text-xl mb-8">{formatRp(c.harga_satuan_default)} <span className="text-[10px] text-slate-400">/pcs</span></p>
                        
                        <div className="grid grid-cols-1 w-full pt-6 border-t border-slate-50 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                           <button onClick={() => { setEditingId(c.id); setCustomPaketForm({ nama: c.nama, kapasitas: String(c.kapasitas), ukuran_donat: c.ukuran_donat, harga_satuan_default: String(c.harga_satuan_default), harga_klasik_full: String(c.harga_klasik_full), harga_reguler_full: String(c.harga_reguler_full), harga_premium_full: String(c.harga_premium_full) }); setShowForm(true); }} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-pink-50 text-slate-400 hover:text-pink-600 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest">
                              <Icons.Edit3 size={14} /> Edit Template
                           </button>
                        </div>
                      </div>
                    ))}
                    {customPaketList.length === 0 && <p className="col-span-full text-center text-slate-300 py-16 text-xs font-black uppercase tracking-[0.3em] border-2 border-dashed rounded-[40px]">Belum ada template custom</p>}
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
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
