'use client';

import { Circle, Minus, Plus } from 'lucide-react';
const Icons = { Circle, Minus, Plus };
import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import type { MenuPanelProps } from '../types';
import { getActiveColorValues } from '../types';

export default function DonatSection(props: MenuPanelProps) {
  const {
    isLoading,
    jenisGroups,
    getCartQty,
    getCartSatuanId,
    getDisplayPrice,
    formatRp,
    tambahSatuan,
    updateQty,
    activeColor,
    stockValidation,
  } = props;

  const [activeKategori, setActiveKategori] = useState<string>('all');

  const colStyle = getActiveColorValues(activeColor);

  // ─── Logika Pengurutan & Flattening ──────────────────────────
  const displayVarian = useMemo(() => {
    if (activeKategori === 'all') {
      // Satukan semua dari tiap kategori
      const flattened = jenisGroups.flatMap(g => g.varian);
      // Urutkan: Termahal ke Termurah (High to Low)
      return flattened.sort((a, b) => getDisplayPrice(b) - getDisplayPrice(a));
    } else {
      // Hanya ambil varian dari kategori yang dipilih
      const targetGroup = jenisGroups.find(g => g.id === activeKategori);
      return targetGroup?.varian || [];
    }
  }, [activeKategori, jenisGroups, getDisplayPrice]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-600">Memuat Menu...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Filter Kategori */}
      {jenisGroups.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
          <button
            onClick={() => setActiveKategori('all')}
            className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
              activeKategori === 'all'
                ? `${colStyle.bg} text-white ${colStyle.shadow}`
                : `bg-white border-2 border-slate-100 text-slate-500 ${colStyle.hoverBorder} ${colStyle.hoverText}`
            }`}
          >
            All Kategori
          </button>
          {jenisGroups.map((group) => (
            <button
              key={group.id}
              onClick={() => setActiveKategori(group.id)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                activeKategori === group.id
                  ? `${colStyle.bg} text-white ${colStyle.shadow}`
                  : `bg-white border-2 border-slate-100 text-slate-500 ${colStyle.hoverBorder} ${colStyle.hoverText}`
              }`}
            >
              {group.nama}
            </button>
          ))}
        </div>
      )}

      {/* Grid Produk Tunggal - Responsive & Compact */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-7 gap-1.5 sm:gap-2 md:gap-2.5">
        {displayVarian.map(v => {
          const qty = getCartQty(v.id);
          const price = getDisplayPrice(v);
          
          // ✅ CRITICAL: Hanya produk DONAT yang perlu validasi stok
          // Non-donat (minuman, cemilan, box, tambahan) tidak perlu cek stok
          const isDonat = v.category?.is_donat === true;
          
          let isOutOfStock = false;
          if (isDonat && stockValidation) {
            // Cek stok berdasarkan ukuran produk (standar/mini)
            const ukuran = (v.ukuran || 'standar') as 'standar' | 'mini';
            const stockAvailable = stockValidation.stock_summary?.[ukuran]?.qty_available || 0;
            isOutOfStock = stockAvailable === 0;
          }
          
          return (
            <div
              key={v.id}
              onClick={() => {
                if (isOutOfStock) {
                  const ukuran = v.ukuran || 'standar';
                  toast.error(`❌ ${v.nama} habis! Stok ${ukuran}: 0 pcs`, {
                    position: 'top-center',
                    duration: 3000,
                  });
                } else {
                  tambahSatuan(v);
                }
              }}
              className={`group relative flex flex-col bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-1.5 sm:p-2 md:p-2.5 border transition-all text-left overflow-hidden ${
                isOutOfStock 
                  ? 'border-slate-200 opacity-60 cursor-not-allowed' 
                  : `border-slate-100 ${colStyle.hoverBorder} hover:shadow-lg cursor-pointer active:scale-[0.97]`
              }`}
            >
              {/* Out of Stock Overlay - Hanya untuk produk DONAT */}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg sm:rounded-xl md:rounded-2xl">
                  <div className="bg-red-500 text-white px-3 py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-lg">
                    Habis
                  </div>
                </div>
              )}
              
              <div className="aspect-square rounded-lg sm:rounded-xl bg-slate-50 mb-1 sm:mb-1.5 overflow-hidden flex items-center justify-center">
                {v.image_url ? (
                  <img
                    src={v.image_url}
                    alt={v.nama}
                    className={`w-full h-full object-cover transition-transform duration-700 ${
                      isOutOfStock ? 'grayscale' : 'group-hover:scale-110'
                    }`}
                  />
                ) : (
                  <Icons.Circle size={20} className="text-slate-200" />
                )}
              </div>
              <h3 className="font-bold text-slate-800 text-[9px] sm:text-[10px] md:text-xs line-clamp-2 leading-tight min-h-[2rem] md:min-h-[2.25rem] mb-0.5">
                {v.nama}
              </h3>
              <p className={`${colStyle.text} font-black text-[9px] sm:text-xs md:text-sm`}>
                {formatRp(price)}
              </p>
              {qty > 0 && !isOutOfStock && (
                <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex items-center gap-0.5 p-0.5 bg-white/95 backdrop-blur rounded-full shadow-lg border">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateQty(getCartSatuanId(v.id)!, -1);
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
                      tambahSatuan(v);
                    }}
                    className={`w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 rounded-full bg-slate-50 flex items-center justify-center ${colStyle.hoverBg} hover:text-white transition-colors`}
                  >
                    <Icons.Plus size={8} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
