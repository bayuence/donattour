'use client';

import * as Icons from 'lucide-react';
import { useState, useEffect } from 'react';
import type { MenuPanelProps } from '../../types';
import type { ProductWithCategory } from '@/lib/types';

export default function PilihRasa(props: MenuPanelProps) {
  const {
    selectedCustomPaket,
    customJenisMode,
    customIsi,
    setCustomIsi,
    setCustomStep,
    formatRp,
    products,
  } = props;

  const [filteredProducts, setFilteredProducts] = useState<ProductWithCategory[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  if (!selectedCustomPaket) return null;

  const cp = selectedCustomPaket;

  // Function to get filtered products by mode
  const getFilteredByMode = async (modeId: string): Promise<ProductWithCategory[]> => {
    console.log('🔍 getFilteredByMode called with:', modeId);

    // Untuk mode "campur" (Pilih Sendiri), tampilkan semua produk
    if (modeId === 'campur') {
      const allVariants = products.filter(
        v => v.tipe_produk === 'donat_varian' && v.ukuran === cp.ukuran_donat
      );
      console.log('📦 Mode Campur - showing all variants:', allVariants.length);
      return allVariants;
    }

    // Cari mode config dari mode_pricing
    const selectedMode = cp.mode_pricing?.find(
      (m: any) => (m.mode_config_id === modeId || m.id === modeId) && m.is_enabled
    );

    console.log('📦 Selected mode:', selectedMode);

    if (selectedMode && selectedMode.mode_config_id) {
      // Ambil mode config untuk mendapatkan category_limits
      try {
        const { getCustomModeConfigs } = await import('@/lib/db/products');
        const modeConfigs = await getCustomModeConfigs();
        const modeConfig = modeConfigs.find(mc => mc.id === selectedMode.mode_config_id);

        console.log('📦 Mode config:', modeConfig);

        if (modeConfig && modeConfig.category_limits) {
          // Ambil semua category IDs dari mode config
          const categoryIds = modeConfig.category_limits.map((cl: any) => cl.category_id);
          console.log('📦 Category IDs from mode config:', categoryIds);

          // Filter produk berdasarkan kategori yang diizinkan
          const filtered = products.filter(
            v =>
              v.tipe_produk === 'donat_varian' &&
              v.ukuran === cp.ukuran_donat &&
              categoryIds.includes(v.category_id || '')
          );

          console.log(`📦 Filtered products for mode ${modeId}:`, filtered.length);
          return filtered;
        }
      } catch (error) {
        console.error('Error loading mode config:', error);
      }
    }

    // Fallback ke sistem lama untuk backward compatibility
    const catIdKey = `category_id_${modeId}` as keyof typeof cp;
    const catId = cp[catIdKey] as string | null | undefined;

    const filtered = products.filter(v => {
      if (v.tipe_produk !== 'donat_varian') return false;
      if (v.ukuran !== cp.ukuran_donat) return false;
      if (modeId === 'random' || modeId === 'mix') return true;
      if (catId) return v.category_id === catId;
      return v.category?.nama?.toLowerCase().includes(modeId.toLowerCase()) ?? false;
    });

    console.log(`📦 Fallback filtered products for mode ${modeId}:`, filtered.length);
    return filtered;
  };

  // Load filtered products berdasarkan mode yang dipilih
  useEffect(() => {
    const loadProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const products = await getFilteredByMode(customJenisMode);
        console.log('📦 Loaded products for mode:', customJenisMode, products.length);
        setFilteredProducts(products);
      } catch (error) {
        console.error('Error loading products:', error);
        setFilteredProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    loadProducts();
  }, [customJenisMode]);

  const isFull = customIsi.length >= cp.kapasitas;

  const handleRandom = async () => {
    if (filteredProducts.length === 0) return;
    
    // Cek apakah mode ini punya category limits
    const selectedMode = cp.mode_pricing?.find(
      (m: any) => (m.mode_config_id === customJenisMode || m.id === customJenisMode) && m.is_enabled
    );
    
    let categoryLimits: Array<{ category_id: string; max_reguler: number; max_mini: number }> = [];
    
    if (selectedMode && selectedMode.mode_config_id) {
      try {
        const { getCustomModeConfigs } = await import('@/lib/db/products');
        const modeConfigs = await getCustomModeConfigs();
        const modeConfig = modeConfigs.find(mc => mc.id === selectedMode.mode_config_id);
        
        if (modeConfig && modeConfig.category_limits) {
          categoryLimits = modeConfig.category_limits;
          console.log('📋 Category limits for random:', categoryLimits);
        }
      } catch (error) {
        console.error('Error loading mode config for random:', error);
      }
    }
    
    const hasil: { productId: string; nama: string }[] = [];
    
    // Jika ada category limits, gunakan algoritma yang memperhatikan limit per kategori
    if (categoryLimits.length > 0) {
      const categoryCounters: Record<string, number> = {};
      const ukuranKey = cp.ukuran_donat === 'standar' ? 'max_reguler' : 'max_mini';
      
      // Inisialisasi counter untuk setiap kategori
      categoryLimits.forEach(cl => {
        categoryCounters[cl.category_id] = 0;
      });
      
      // Group products by category
      const productsByCategory: Record<string, ProductWithCategory[]> = {};
      filteredProducts.forEach(p => {
        const catId = p.category_id || '';
        if (!productsByCategory[catId]) {
          productsByCategory[catId] = [];
        }
        productsByCategory[catId].push(p);
      });
      
      // Pilih random dengan memperhatikan limit per kategori
      for (let i = 0; i < cp.kapasitas; i++) {
        // Cari kategori yang masih bisa dipilih
        const availableCategories = categoryLimits.filter(cl => {
          const maxLimit = ukuranKey === 'max_reguler' ? cl.max_reguler : cl.max_mini;
          return categoryCounters[cl.category_id] < maxLimit;
        });
        
        if (availableCategories.length === 0) break; // Tidak ada kategori yang bisa dipilih lagi
        
        // Pilih random kategori dari yang tersedia
        const randomCat = availableCategories[Math.floor(Math.random() * availableCategories.length)];
        const categoryProducts = productsByCategory[randomCat.category_id] || [];
        
        if (categoryProducts.length === 0) continue;
        
        // Pilih random produk dari kategori tersebut (yang belum dipilih)
        const usedProductIds = hasil.map(h => h.productId);
        const availableInCategory = categoryProducts.filter(p => !usedProductIds.includes(p.id));
        
        if (availableInCategory.length > 0) {
          const randomProduct = availableInCategory[Math.floor(Math.random() * availableInCategory.length)];
          hasil.push({ productId: randomProduct.id, nama: randomProduct.nama });
          categoryCounters[randomCat.category_id]++;
        } else {
          // Jika semua produk di kategori ini sudah dipilih, pilih yang sudah ada (allow duplicate)
          const randomProduct = categoryProducts[Math.floor(Math.random() * categoryProducts.length)];
          hasil.push({ productId: randomProduct.id, nama: randomProduct.nama });
          categoryCounters[randomCat.category_id]++;
        }
      }
    } else {
      // Jika tidak ada category limits, gunakan algoritma simple (unique)
      const availableProducts = [...filteredProducts];
      
      for (let i = 0; i < cp.kapasitas; i++) {
        if (availableProducts.length === 0) {
          availableProducts.push(...filteredProducts);
        }
        
        const randomIndex = Math.floor(Math.random() * availableProducts.length);
        const pick = availableProducts[randomIndex];
        
        hasil.push({ productId: pick.id, nama: pick.nama });
        availableProducts.splice(randomIndex, 1);
      }
    }
    
    setCustomIsi(hasil);
  };

  if (isLoadingProducts) {
    return (
      <div className="flex items-center justify-center py-20">
        <Icons.Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() =>
            setCustomStep(
              customJenisMode === 'random' || customJenisMode === 'mix'
                ? 'pilih-jenis'
                : 'pilih-jenis'
            )
          }
          className="p-2.5 bg-slate-100 rounded-lg shrink-0 hover:bg-slate-200 transition-colors"
        >
          <Icons.ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h3 className="text-lg font-black text-slate-900">Pilih Isi Donat</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {customIsi.length} / {cp.kapasitas} donat dipilih
          </p>
        </div>
        <button
          onClick={handleRandom}
          disabled={isFull}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg text-xs font-black hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Icons.Shuffle size={14} />
          Acak
        </button>
        <button
          onClick={() => setCustomStep(cp.enable_tulisan ? 'tulisan' : 'tambahan')}
          disabled={!isFull}
          className="px-6 py-2 bg-slate-900 text-white rounded-lg text-xs font-black hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Lanjutkan →
        </button>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Icons.AlertCircle size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-bold text-slate-400">Tidak ada produk tersedia</p>
          <p className="text-xs text-slate-400 mt-1">
            Silakan pilih mode lain atau hubungi admin
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-7 gap-1.5 sm:gap-2 md:gap-2.5">
          {filteredProducts.map(v => {
            const qty = customIsi.filter(x => x.productId === v.id).length;
            const canAdd = customIsi.length < cp.kapasitas; // Bisa tambah jika belum penuh
            
            return (
              <div
                key={v.id}
                onClick={() => {
                  if (canAdd) {
                    // Jika belum penuh, tambah produk ini
                    setCustomIsi([...customIsi, { productId: v.id, nama: v.nama }]);
                  }
                }}
                className={`group relative flex flex-col bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-1.5 sm:p-2 md:p-2.5 border border-slate-100 hover:border-slate-900 hover:shadow-lg transition-all text-left overflow-hidden ${
                  canAdd ? 'cursor-pointer active:scale-[0.97]' : 'cursor-default'
                }`}
              >
                <div className="aspect-square rounded-lg sm:rounded-xl bg-slate-50 mb-1 sm:mb-1.5 overflow-hidden flex items-center justify-center">
                  {v.image_url ? (
                    <img
                      src={v.image_url}
                      alt={v.nama}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  ) : (
                    <Icons.Circle size={20} className="text-slate-200" />
                  )}
                </div>
                <h3 className="font-bold text-slate-800 text-[9px] sm:text-[10px] md:text-xs line-clamp-2 leading-tight h-6 mb-0.5">
                  {v.nama}
                </h3>
                <p className="text-[8px] sm:text-[9px] text-slate-400">{v.category?.nama || 'Donat'}</p>
                {qty > 0 && (
                  <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex items-center gap-0.5 p-0.5 bg-white/95 backdrop-blur rounded-full shadow-lg border">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newIsi = [...customIsi];
                        const idx = newIsi.findIndex(x => x.productId === v.id);
                        if (idx !== -1) newIsi.splice(idx, 1);
                        setCustomIsi(newIsi);
                      }}
                      className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 rounded-full bg-slate-50 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                    >
                      <Icons.Minus size={8} />
                    </button>
                    <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black w-2 text-center">
                      {qty}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (canAdd) {
                          setCustomIsi([...customIsi, { productId: v.id, nama: v.nama }]);
                        }
                      }}
                      className={`w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 rounded-full bg-slate-50 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-colors ${
                        !canAdd ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <Icons.Plus size={8} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
