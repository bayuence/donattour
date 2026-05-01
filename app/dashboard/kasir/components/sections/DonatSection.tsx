'use client';

import * as Icons from 'lucide-react';
import { useState, useMemo } from 'react';
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
      <div className="flex flex-col items-center justify-center py-20 text-slate-300">
        <Icons.Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-bold">Memuat Menu...</p>
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
          return (
            <div
              key={v.id}
              onClick={() => tambahSatuan(v)}
              className={`group relative flex flex-col bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-1.5 sm:p-2 md:p-2.5 border border-slate-100 ${colStyle.hoverBorder} hover:shadow-lg transition-all text-left overflow-hidden cursor-pointer active:scale-[0.97]`}
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
              <p className={`${colStyle.text} font-black text-[9px] sm:text-xs md:text-sm`}>
                {formatRp(price)}
              </p>
              {qty > 0 && (
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
