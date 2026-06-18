'use client';

import { useState, useEffect, useCallback } from 'react';
import * as db from '@/lib/db';
import type { ProductWithCategory } from '@/lib/types';
import { Power, Search, Loader2, ShoppingBag, PackageX, Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
interface ProductStatus {
  productId: string;
  isActive: boolean;
  isSaving: boolean;
}

type StatusMap = Record<string, ProductStatus>;

// ─── Helper ───────────────────────────────────────────────────
const formatRp = (n: number | null | undefined) =>
  'Rp ' + (n || 0).toLocaleString('id-ID');

// ─── Component ────────────────────────────────────────────────
export default function MenuManagementTab({ outletId }: { outletId: string }) {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [statusMap, setStatusMap] = useState<StatusMap>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      // Load semua produk donat varian dari master
      const [prods, channelPrices] = await Promise.all([
        db.getProductsWithCategory(),
        db.getOutletChannelPrices(outletId),
      ]);

      // Hanya tampilkan donat varian (bukan base, tambahan, biaya ekstra, dsb)
      const varianProds = prods.filter(
        (p: ProductWithCategory) =>
          p.tipe_produk === 'donat_varian' || (!p.tipe_produk && p.is_donat)
      );

      setProducts(varianProds);

      // Bangun status map: apakah produk aktif di outlet ini (channel 'toko')
      const newMap: StatusMap = {};
      varianProds.forEach((p: ProductWithCategory) => {
        // Cari override di outlet_channel_prices untuk channel 'toko'
        const override = channelPrices.find(
          (cp) => cp.product_id === p.id && cp.channel === 'toko'
        );
        newMap[p.id] = {
          productId: p.id,
          // Jika ada override → pakai nilainya. Jika tidak → default aktif (ikut master)
          isActive: override ? override.is_active : p.is_active,
          isSaving: false,
        };
      });

      setStatusMap(newMap);
    } catch (err) {
      console.error('Error loading menu management data:', err);
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggle = async (productId: string, currentActive: boolean) => {
    const newActive = !currentActive;

    // Optimistic update
    setStatusMap(prev => ({
      ...prev,
      [productId]: { ...prev[productId], isActive: newActive, isSaving: true },
    }));

    try {
      // Simpan ke outlet_channel_prices dengan channel 'toko'
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error('Product not found');

      await db.upsertOutletChannelPrice({
        outlet_id: outletId,
        product_id: productId,
        channel: 'toko',
        harga_jual: product.harga_jual, // Tetap pakai harga master
        is_active: newActive,
      });

      setStatusMap(prev => ({
        ...prev,
        [productId]: { ...prev[productId], isSaving: false },
      }));
    } catch (err) {
      console.error('Error toggling product:', err);
      // Rollback on error
      setStatusMap(prev => ({
        ...prev,
        [productId]: { ...prev[productId], isActive: currentActive, isSaving: false },
      }));
    }
  };

  // Group by category
  const grouped = products.reduce((acc, p) => {
    const catName = p.category?.nama || 'Tanpa Kategori';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(p);
    return acc;
  }, {} as Record<string, ProductWithCategory[]>);

  // Filter by search
  const filteredGrouped = Object.entries(grouped).reduce((acc, [cat, prods]) => {
    const q = searchQuery.toLowerCase();
    const filtered = prods.filter(
      p => p.nama.toLowerCase().includes(q) || cat.toLowerCase().includes(q)
    );
    if (filtered.length > 0) acc[cat] = filtered;
    return acc;
  }, {} as Record<string, ProductWithCategory[]>);

  const activeCount = Object.values(statusMap).filter(s => s.isActive).length;
  const totalCount = products.length;

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 text-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Memuat data menu...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Manajemen Menu Toko</h3>
        <p className="text-gray-500 text-sm">
          Aktifkan atau nonaktifkan menu yang tersedia di kasir toko ini. Harga diatur di{' '}
          <span className="text-orange-600 font-semibold">Kelola Produk</span>.
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
          <span className="text-sm font-bold text-emerald-700">
            {activeCount} Menu Aktif
          </span>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
          <span className="w-2.5 h-2.5 bg-gray-400 rounded-full" />
          <span className="text-sm font-bold text-gray-600">
            {totalCount - activeCount} Nonaktif
          </span>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <Info className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-medium text-blue-700">
            Toggle akan langsung tersimpan & terlihat di kasir
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Cari nama produk atau kategori..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
        />
      </div>

      {/* Empty */}
      {totalCount === 0 && (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-500 text-sm">Belum ada produk di database</p>
          <p className="text-xs text-gray-400 mt-1">
            Tambahkan produk terlebih dahulu di menu <strong>Kelola Produk → Produk & Varian</strong>
          </p>
        </div>
      )}

      {/* Product Groups */}
      <div className="space-y-10">
        {Object.entries(filteredGrouped).map(([catName, prods]) => (
          <div key={catName}>
            {/* Category header */}
            <div className="flex items-center gap-3 mb-4">
              <h4 className="font-extrabold text-base text-gray-800 uppercase tracking-widest">
                {catName}
              </h4>
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400 font-medium">
                {prods.filter(p => statusMap[p.id]?.isActive).length}/{prods.length} aktif
              </span>
            </div>

            {/* Product cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {prods.map(product => {
                const status = statusMap[product.id];
                const isActive = status?.isActive ?? true;
                const isSaving = status?.isSaving ?? false;

                const hppBase = product.hpp_base_donat ?? 0;
                const hppTopping = product.hpp_topping ?? 0;
                const hppTotal = hppBase + hppTopping;
                const hargaJual = product.harga_jual;
                const margin = hargaJual - hppTotal;
                const marginPct = hargaJual > 0 ? Math.round((margin / hargaJual) * 100) : 0;
                const isProfit = margin >= 0;

                return (
                  <div
                    key={product.id}
                    className={`group rounded-2xl border-2 overflow-hidden transition-all duration-200 ${
                      isActive
                        ? 'border-orange-200 bg-white shadow-sm hover:shadow-md hover:border-orange-300'
                        : 'border-gray-200 bg-gray-50 opacity-70'
                    }`}
                  >
                    {/* Card header */}
                    <div
                      className={`flex items-center justify-between px-4 py-3 border-b ${
                        isActive
                          ? 'bg-orange-50 border-orange-100'
                          : 'bg-gray-100 border-gray-200'
                      }`}
                    >
                      {/* Nama */}
                      <div className="flex items-center gap-2 min-w-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.nama}
                            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isActive ? 'bg-orange-200 text-orange-700' : 'bg-gray-300 text-gray-600'}`}>
                            {product.nama.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className={`font-bold text-sm truncate ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
                          {product.ukuran === 'mini' ? `${product.nama} (Mini)` : product.nama}
                        </span>
                      </div>

                      {/* Toggle switch */}
                      <button
                        onClick={() => !isSaving && handleToggle(product.id, isActive)}
                        disabled={isSaving}
                        title={isActive ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isSaving
                            ? 'opacity-50 cursor-wait'
                            : isActive
                            ? 'bg-orange-500 text-white hover:bg-orange-600'
                            : 'bg-white border border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700'
                        }`}
                      >
                        {isSaving ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isActive ? (
                          <Power className="w-3 h-3" />
                        ) : (
                          <PackageX className="w-3 h-3" />
                        )}
                        {isSaving ? 'Menyimpan...' : isActive ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </div>

                    {/* Pricing info (READ-ONLY, dari master Kelola Produk) */}
                    <div className="px-4 py-3 space-y-2.5">
                      {/* HPP Breakdown */}
                      {product.is_donat ? (
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-slate-50 rounded-lg p-2 text-center">
                            <p className="text-slate-400 font-semibold uppercase tracking-wide">HPP Polos</p>
                            <p className="font-black text-slate-700 mt-0.5">{formatRp(hppBase)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-lg p-2 text-center">
                            <p className="text-slate-400 font-semibold uppercase tracking-wide">Biaya Topping</p>
                            <p className="font-black text-slate-700 mt-0.5">{formatRp(hppTopping)}</p>
                          </div>
                        </div>
                      ) : null}

                      {/* Harga Jual */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Harga Jual</span>
                        <span className="font-black text-base text-gray-900">{formatRp(hargaJual)}</span>
                      </div>

                      {/* Margin */}
                      {hargaJual > 0 && (
                        <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold ${
                          isProfit ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                        }`}>
                          <span className="uppercase tracking-wide">Margin</span>
                          <span>
                            {isProfit ? '+' : ''}{formatRp(margin)} ({isProfit ? '+' : ''}{marginPct}%)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
