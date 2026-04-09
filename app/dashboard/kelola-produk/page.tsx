'use client';

import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import {
  getProductsWithCategory, getProductCategories, getBoxes, getPackages,
  getBundlings, getCustomTemplates, getActiveOutlets
} from '@/lib/db';
import type {
  ProductWithCategory, ProductCategory, ProductBox, ProductPackage,
  ProductBundling, ProductCustomTemplate, Outlet
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

type TabType = 'jenis' | 'varian' | 'box' | 'paket' | 'bundling' | 'custom' | 'tambahan' | 'biaya-lainnya';

export default function KelolaProdukPage() {
  const [activeTab, setActiveTab] = useState<TabType>('varian');
  const [isLoading, setIsLoading] = useState(true);

  // Outlet state
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
  const [biayaEkstraList, setBiayaEkstraList] = useState<ProductWithCategory[]>([]);

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
      setBiayaEkstraList(prods.filter((p: ProductWithCategory) => p.tipe_produk === 'biaya_ekstra'));
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
              <p className="text-center text-slate-400 py-6 text-sm font-bold uppercase tracking-widest bg-slate-50 rounded-2xl border-2 border-dashed">Belum ada outlet</p>
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
                  <span className="text-amber-600">{outlet?.nama}</span> • {activeTab.replace('-', ' ')}
               </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <Icons.RefreshCw size={14} className={isLoading ? 'animate-spin text-amber-500' : ''} />
            REFRESH
          </button>
          <button onClick={() => setShowOutletPicker(true)} 
            className="flex items-center gap-2 px-5 py-3 bg-slate-50 border border-slate-100 text-slate-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest">
            <Icons.MapPin size={14} /> GANTI OUTLET
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="px-6 py-2 bg-white flex gap-2 border-b overflow-x-auto shrink-0 no-scrollbar">
        {([
          { id: 'varian', label: 'Varian Donat', icon: Icons.CircleDot },
          { id: 'jenis', label: 'Kategori', icon: Icons.Tags },
          { id: 'box', label: 'Box & Kemasan', icon: Icons.Package },
          { id: 'paket', label: 'Paket', icon: Icons.Boxes },
          { id: 'bundling', label: 'Bundling', icon: Icons.Gift },
          { id: 'custom', label: 'Custom', icon: Icons.Palette },
          { id: 'tambahan', label: 'Tambahan', icon: Icons.PlusSquare },
          { id: 'biaya-lainnya', label: 'Biaya Lainnya', icon: Icons.Receipt },
        ] as const).map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
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
              <Icons.Loader2 className="animate-spin mb-4 text-amber-500" size={40} />
              <p className="font-bold text-sm tracking-widest uppercase">Memuat Data Produk...</p>
            </div>
          )}

          {!isLoading && outlet && (
            <>
              {activeTab === 'jenis' && <TabKategori jenisList={jenisList} refreshData={loadData} />}
              {activeTab === 'varian' && <TabVarian outlet={outlet} varianList={varianList} jenisList={jenisList} refreshData={loadData} />}
              {activeTab === 'box' && <TabBox boxList={boxList} refreshData={loadData} />}
              {activeTab === 'paket' && <TabPaket paketList={paketList} boxList={boxList} jenisList={jenisList} varianList={varianList} refreshData={loadData} />}
              {activeTab === 'bundling' && <TabBundling bundlingList={bundlingList} refreshData={loadData} />}
              {activeTab === 'custom' && <TabCustom customPaketList={customPaketList} refreshData={loadData} />}
              {activeTab === 'tambahan' && <TabTambahan tambahanList={tambahanList} refreshData={loadData} />}
              {activeTab === 'biaya-lainnya' && <TabBiayaLainnya biayaEkstraList={biayaEkstraList} refreshData={loadData} />}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
