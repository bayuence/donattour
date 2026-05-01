'use client';

import * as Icons from 'lucide-react';
import type { MenuPanelProps } from '../types';

export default function PaketSection(props: MenuPanelProps) {
  const {
    paketList,
    formatRp,
    bukaPaketInline,
    selectedPaketForInline,
    setSelectedPaketForInline,
    paketInlineIsi,
    setPaketInlineIsi,
    konfirmasiPaketInline,
    products,
    getDisplayPrice,
  } = props;

  // Show paket list
  if (!selectedPaketForInline) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6 gap-2 sm:gap-2.5 md:gap-3 animate-in fade-in">
        {paketList.map(pkt => (
          <button
            key={pkt.id}
            onClick={() => bukaPaketInline(pkt)}
            className="group relative bg-white p-2.5 sm:p-3 md:p-4 rounded-2xl sm:rounded-2xl md:rounded-3xl border border-slate-100 hover:border-amber-200 hover:shadow-lg transition-all text-left overflow-hidden"
          >
            <div className="relative z-10">
              <div className="p-1.5 sm:p-2 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 mb-1.5 sm:mb-2 group-hover:bg-amber-500 group-hover:text-white transition-all flex items-center justify-center">
                <Icons.Package size={18} className="sm:group-hover:scale-110" />
              </div>
              <h3 className="text-xs sm:text-sm md:text-base font-black text-slate-800 mb-0.5 line-clamp-1">
                {pkt.kode && (
                  <span className="text-[8px] sm:text-[9px] md:text-xs text-amber-600 mr-1 align-baseline">
                    [{pkt.kode}]
                  </span>
                )}
                {pkt.nama}
              </h3>
              <div className="flex items-center gap-1 mb-2 text-[8px] sm:text-[9px] md:text-[10px]">
                <span className="text-slate-400 uppercase tracking-wider font-bold">
                  Isi {pkt.kapasitas}
                </span>
                {((pkt.diskon_nominal || 0) > 0 || (pkt.diskon_persen || 0) > 0) && (
                  <span className="text-[7px] sm:text-[8px] font-black bg-rose-100 text-rose-600 px-1 py-0.5 rounded uppercase">
                    Diskon
                  </span>
                )}
              </div>
              <span className="text-sm sm:text-base md:text-lg font-black text-amber-600">
                {formatRp(pkt.harga_paket)}
              </span>
              <div className="w-full bg-slate-900 text-white py-1 sm:py-1.5 md:py-2 rounded-lg text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-widest group-hover:bg-amber-600 transition-colors text-center mt-1.5 sm:mt-2">
                Pilih
              </div>
            </div>
            <Icons.Package
              size={60}
              className="absolute -bottom-4 -right-4 sm:-bottom-5 sm:-right-5 text-slate-50 group-hover:text-amber-50 transition-all"
            />
          </button>
        ))}
      </div>
    );
  }

  // Show inline selection mode
  return (
    <div className="animate-in fade-in">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
        <div>
          <button
            onClick={() => {
              setSelectedPaketForInline(null);
              setPaketInlineIsi([]);
            }}
            className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-black tracking-widest mb-2 hover:text-slate-800"
          >
            <Icons.ArrowLeft size={14} /> Kembali
          </button>
          <h3 className="text-lg font-black text-slate-800">MEMILIH ISI PAKET</h3>
          <p className="text-sm text-slate-500 font-semibold mt-1">
            {selectedPaketForInline.nama}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 uppercase font-black">Pilih Produk</p>
          <p className="text-2xl font-black text-amber-600">
            {paketInlineIsi.length}/{selectedPaketForInline.kapasitas}
          </p>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-6 2xl:grid-cols-7 gap-1.5 sm:gap-2 md:gap-2.5">
        {products
          .filter(
            v =>
              v.tipe_produk === 'donat_varian' &&
              (!selectedPaketForInline.category_id ||
                v.category_id === selectedPaketForInline.category_id)
          )
          .sort((a, b) => a.nama.localeCompare(b.nama))
          .map(p => {
            const countInIsi = paketInlineIsi.filter(item => item.productId === p.id).length;
            const isSelected = countInIsi > 0;
            const isFull = paketInlineIsi.length >= selectedPaketForInline.kapasitas;
            return (
              <div
                key={p.id}
                onClick={() => {
                  if (!isFull) {
                    setPaketInlineIsi([
                      ...paketInlineIsi,
                      { productId: p.id, nama: p.nama, ukuran: p.ukuran },
                    ]);
                  }
                }}
                className={`group relative rounded-xl sm:rounded-2xl p-2 sm:p-2.5 md:p-3 border-2 transition-all overflow-hidden ${
                  isSelected
                    ? 'border-amber-400 bg-amber-50 shadow-md shadow-amber-500/20'
                    : isFull
                    ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                    : 'border-slate-100 bg-white hover:border-amber-200 hover:shadow-lg cursor-pointer'
                }`}
              >
                {/* Image Container */}
                <div className="relative aspect-square rounded-lg sm:rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center mb-1 sm:mb-1.5">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.nama}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                    />
                  ) : (
                    <Icons.Image size={20} className="text-slate-300" />
                  )}
                </div>

                {/* Content */}
                <div>
                  <h4
                    className={`text-[9px] sm:text-[10px] md:text-xs font-black line-clamp-2 leading-tight h-5 ${
                      isSelected ? 'text-amber-600' : 'text-slate-800'
                    }`}
                  >
                    {p.nama}
                  </h4>
                  <p className="text-[8px] sm:text-[8px] md:text-[9px] text-slate-400 mt-0.5">
                    {formatRp(getDisplayPrice(p))}
                  </p>
                </div>

                {/* Multiple Select Controls overlay */}
                {isSelected && (
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 p-0.5 bg-white/95 backdrop-blur rounded-full shadow-lg border">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const n = [...paketInlineIsi];
                        const idx = n.findIndex(x => x.productId === p.id);
                        if (idx !== -1) n.splice(idx, 1);
                        setPaketInlineIsi(n);
                      }}
                      className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 rounded-full bg-slate-50 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                    >
                      <Icons.Minus size={8} />
                    </button>
                    <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black w-3 text-center text-slate-800">
                      {countInIsi}
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (!isFull) {
                          setPaketInlineIsi([
                            ...paketInlineIsi,
                            { productId: p.id, nama: p.nama, ukuran: p.ukuran },
                          ]);
                        }
                      }}
                      className={`w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 rounded-full bg-slate-50 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-colors ${
                        isFull ? 'opacity-50 cursor-not-allowed' : ''
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

      {/* Confirmation Button */}
      <div className="mt-4 sm:mt-6 md:mt-8 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => {
            setSelectedPaketForInline(null);
            setPaketInlineIsi([]);
          }}
          className="flex-1 py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 bg-slate-100 text-slate-700 font-black uppercase text-xs sm:text-xs md:text-sm rounded-lg sm:rounded-xl hover:bg-slate-200 transition-all"
        >
          Batal
        </button>
        <div className="flex-1 flex flex-col gap-2">
          <button
            onClick={konfirmasiPaketInline}
            disabled={paketInlineIsi.length !== selectedPaketForInline.kapasitas}
            className={`w-full py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 font-black uppercase text-xs sm:text-xs md:text-sm rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-1 sm:gap-2 text-white ${
              paketInlineIsi.length === selectedPaketForInline.kapasitas
                ? 'bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20'
                : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            <Icons.Plus size={14} />
            Masukkan ke Keranjang
          </button>
          {paketInlineIsi.length < selectedPaketForInline.kapasitas && (
            <p className="text-[10px] text-rose-500 font-bold text-center animate-pulse">
              Pilih {selectedPaketForInline.kapasitas - paketInlineIsi.length} item lagi untuk
              melanjutkan
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
