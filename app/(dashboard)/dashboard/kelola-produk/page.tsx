'use client';
// Force HMR recompile
import { useState, useEffect } from 'react';
import {
  Boxes, ChevronRight, CircleDot, Gift, LayoutGrid, Loader2, MapPin, Package, Palette, PlusSquare, Receipt, RefreshCw, Settings, Tags, Wallet
} from 'lucide-react';
const Icons = { Boxes, ChevronRight, CircleDot, Gift, LayoutGrid, Loader2, MapPin, Package, Palette, PlusSquare, Receipt, RefreshCw, Settings, Tags, Wallet };
import {
  getProductsWithCategory, getProductCategories, getBoxes, getPackages,
  getBundlings, getCustomTemplates, getActiveOutlets, getPaymentMethods
} from '@/lib/db';
import type {
  ProductWithCategory, ProductCategory, ProductBox, ProductPackage,
  ProductBundling, ProductCustomTemplate, Outlet, PaymentMethodConfig
} from '@/lib/types';
import { toast } from 'sonner';

import { TabKategori } from './components/TabKategori';
import { TabVarian } from './components/TabVarian';
import { TabBox } from './components/TabBox';
import { TabPaket } from './components/TabPaket';
import { TabBundling } from './components/TabBundling';
import { TabCustom } from './components/TabCustom';
import { TabTambahan } from './components/TabTambahan';
import { TabBiayaLainnya } from './components/TabBiayaLainnya';
import { TabMetodePembayaran } from './components/TabMetodePembayaran';

type TabType = 'jenis' | 'varian' | 'box' | 'paket' | 'bundling' | 'custom' | 'tambahan' | 'biaya-lainnya' | 'pembayaran';

export default function KelolaProdukPage() {
  const [activeTab, setActiveTab] = useState<TabType>('jenis');
  const [isLoading, setIsLoading] = useState(true);

  // Outlet state
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [outletList, setOutletList] = useState<Outlet[]>([]);
  const [showOutletPicker, setShowOutletPicker] = useState(false);

  const [jenisList, setJenisList] = useState<ProductCategory[]>([]);
  const [varianList, setVarianList] = useState<ProductWithCategory[]>([]);
  const [boxList, setBoxList] = useState<ProductBox[]>([]);
  const [paketList, setPaketList] = useState<ProductPackage[]>([]);
  const [bundlingList, setBundlingList] = useState<ProductBundling[]>([]);
  const [customPaketList, setCustomPaketList] = useState<ProductCustomTemplate[]>([]);
  const [tambahanList, setVarianTambahanList] = useState<ProductWithCategory[]>([]);
  const [biayaEkstraList, setBiayaEkstraList] = useState<ProductWithCategory[]>([]);
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethodConfig[]>([]);

  // Outlet load
  useEffect(() => {
    getActiveOutlets().then(setOutletList).catch(() => setOutletList([]));
    try {
      const saved = localStorage.getItem('kelola_produk_outlet');
      if (saved) {
        setOutlet(JSON.parse(saved));
      } else {
        setShowOutletPicker(true);
      }
    } catch {
      setShowOutletPicker(true);
    }
  }, []);

  const pilihOutlet = (o: Outlet) => {
    setOutlet(o);
    localStorage.setItem('kelola_produk_outlet', JSON.stringify(o));
    setShowOutletPicker(false);
  };

  useEffect(() => {
    if (!outlet) return;
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet]);

  async function loadData() {
    if (!outlet) return;
    setIsLoading(true);
    try {
      const [cats, prods, boxes, pkgs, bunds, custs, payments] = await Promise.all([
        getProductCategories(),
        getProductsWithCategory(),
        getBoxes(),
        getPackages(),
        getBundlings(),
        getCustomTemplates(),
        getPaymentMethods(),
      ]);

      setJenisList(cats);
      setVarianList(prods.filter((p: ProductWithCategory) => p.tipe_produk === 'donat_varian'));
      setBoxList(boxes);
      setPaketList(pkgs);
      setBundlingList(bunds);
      setCustomPaketList(custs);
      setVarianTambahanList(prods.filter((p: ProductWithCategory) => p.tipe_produk === 'tambahan'));
      setBiayaEkstraList(prods.filter((p: ProductWithCategory) => p.tipe_produk === 'biaya_ekstra'));
      setPaymentMethodsList(payments);
    } catch (error) {
      console.error('Gagal memuat data produk:', error);
      toast.error('Gagal memuat data produk');
    } finally {
      setIsLoading(false);
    }
  }

  // ═══ RENDER: OUTLET PICKER ═══
  if (!outlet || showOutletPicker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-8 border-b border-amber-100">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Icons.MapPin size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Pilih Outlet</h1>
                <p className="text-sm text-slate-600 mt-0.5">Pilih outlet untuk mengelola produk</p>
              </div>
            </div>
          </div>

          {/* Outlet List */}
          <div className="p-6">
            {outletList.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icons.MapPin size={28} className="text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium">Belum ada outlet tersedia</p>
              </div>
            ) : (
              <div className="space-y-2">
                {outletList.map((o) => (
                  <button 
                    key={o.id} 
                    onClick={() => pilihOutlet(o)}
                    className="w-full group flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-left">
                    <div className="w-10 h-10 bg-slate-100 group-hover:bg-amber-100 rounded-lg flex items-center justify-center transition-colors">
                      <Icons.MapPin size={20} className="text-slate-400 group-hover:text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{o.nama}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{o.alamat}</p>
                    </div>
                    <Icons.ChevronRight className="text-slate-300 group-hover:text-amber-500 transition-colors" size={20} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══ RENDER: MAIN ═══
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">

      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-sm">
                <Icons.Settings size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Manajemen Produk</h1>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  <span className="font-medium text-amber-600">{outlet?.nama}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={loadData}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all text-sm font-medium">
                <Icons.RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <button 
                onClick={() => setShowOutletPicker(true)} 
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all text-sm font-medium">
                <Icons.MapPin size={16} />
                Ganti Outlet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="bg-white border-b border-slate-200 sticky top-[73px] z-40">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto no-scrollbar py-2">
            {([
              { id: 'jenis', label: 'Kategori', icon: Icons.Tags },
              { id: 'varian', label: 'Produk & Varian', icon: Icons.CircleDot },
              { id: 'box', label: 'Box & Kemasan', icon: Icons.Package },
              { id: 'paket', label: 'Paket', icon: Icons.Boxes },
              { id: 'bundling', label: 'Bundling', icon: Icons.Gift },
              { id: 'custom', label: 'Custom', icon: Icons.Palette },
              { id: 'tambahan', label: 'Tambahan', icon: Icons.PlusSquare },
              { id: 'biaya-lainnya', label: 'Biaya Lainnya', icon: Icons.Receipt },
              { id: 'pembayaran', label: 'Metode Pembayaran', icon: Icons.Wallet },
            ] as const).map((tab) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap relative ${
                  activeTab === tab.id 
                    ? 'text-amber-600 bg-amber-50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}>
                <tab.icon size={16} />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32">
            <Icons.Loader2 className="animate-spin text-amber-500 mb-3" size={32} />
            <p className="text-sm text-slate-500 font-medium">Memuat data produk...</p>
          </div>
        )}

        {!isLoading && outlet && (
          <>
            {activeTab === 'jenis' && <TabKategori jenisList={jenisList} refreshData={loadData} />}
            {activeTab === 'varian' && <TabVarian outlet={outlet} varianList={varianList} jenisList={jenisList} kasirMenus={[]} refreshData={loadData} />}
            {activeTab === 'box' && <TabBox boxList={boxList} refreshData={loadData} />}
            {activeTab === 'paket' && <TabPaket paketList={paketList} boxList={boxList} jenisList={jenisList} varianList={varianList} tambahanList={tambahanList} kasirMenus={[]} refreshData={loadData} />}
            {activeTab === 'bundling' && <TabBundling bundlingList={bundlingList} refreshData={loadData} />}
            { activeTab === 'custom' && <TabCustom customPaketList={customPaketList} refreshData={loadData} /> }
            { activeTab === 'tambahan' && <TabTambahan tambahanList={tambahanList} refreshData={loadData} /> }
            { activeTab === 'biaya-lainnya' && <TabBiayaLainnya biayaEkstraList={biayaEkstraList} refreshData={loadData} /> }
            { activeTab === 'pembayaran' && <TabMetodePembayaran paymentMethods={paymentMethodsList} refreshData={loadData} /> }
          </>
        )}
      </div>
    </div>
  );
}
