'use client';

import type { MenuPanelProps } from '../../types';

export default function PilihPaket(props: MenuPanelProps) {
  const { customList, formatRp, setSelectedCustomPaket, setCustomStep } = props;

  return (
    <div>
      <p className="text-slate-600 text-sm font-semibold mb-6">
        Pilih paket custom yang diinginkan
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {customList.map(cp => {
          // Kumpulkan semua harga mode yang tersedia (> 0)
          const hargaList = [
            cp.harga_klasik_full,
            cp.harga_reguler_full,
            cp.harga_premium_full,
            cp.harga_mix,
            cp.harga_satuan_default * cp.kapasitas,
          ].filter(h => h && h > 0) as number[];
          const hargaMin = hargaList.length > 0 ? Math.min(...hargaList) : 0;
          const hargaMax = hargaList.length > 0 ? Math.max(...hargaList) : 0;
          const diskonAda = (cp.diskon_persen || 0) > 0 || (cp.diskon_nominal || 0) > 0;

          return (
            <button
              key={cp.id}
              onClick={() => {
                setSelectedCustomPaket(cp);
                setCustomStep('pilih-jenis');
              }}
              className="p-5 rounded-xl bg-slate-50 border-2 border-slate-200 hover:border-slate-900 hover:bg-white transition-all text-left group flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 py-1 px-2.5 bg-slate-200 rounded-md">
                  {cp.ukuran_donat}
                </span>
                {cp.allow_random && (
                  <span className="text-xs font-bold text-purple-700 py-1 px-2.5 bg-purple-100 rounded-md">
                    Random
                  </span>
                )}
                {diskonAda && (
                  <span className="text-xs font-bold text-red-600 py-1 px-2.5 bg-red-50 rounded-md">
                    Promo
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-slate-900">{cp.nama}</h4>
              <p className="text-slate-500 text-sm">Kapasitas {cp.kapasitas} pcs</p>
              {cp.deskripsi && (
                <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-200 pt-3">
                  {cp.deskripsi}
                </p>
              )}
              <div className="mt-auto pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500 font-medium mb-1">Mulai dari</p>
                <p className="text-lg font-bold text-slate-900">{formatRp(hargaMin)}</p>
                {hargaMax !== hargaMin && (
                  <p className="text-xs text-slate-500">s/d {formatRp(hargaMax)}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
