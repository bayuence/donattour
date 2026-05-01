'use client';

import * as Icons from 'lucide-react';
import type { MenuPanelProps } from '../../types';

export default function Tambahan(props: MenuPanelProps) {
  const {
    selectedCustomPaket,
    customJenisMode,
    customModeLabel,
    customIsi,
    customTambahan,
    setCustomTambahan,
    customTulisan,
    customMintaTulisan,
    customJumlahPapan,
    setCustomStep,
    konfirmasiCustom,
    tambahanList,
    formatRp,
  } = props;

  if (!selectedCustomPaket) return null;

  const cp = selectedCustomPaket;

  // Calculate pricing
  const hargaBase =
    customJenisMode === 'campur'
      ? cp.harga_satuan_default * cp.kapasitas
      : customJenisMode === 'klasik'
      ? cp.harga_klasik_full
      : customJenisMode === 'reguler'
      ? cp.harga_reguler_full
      : customJenisMode === 'premium'
      ? cp.harga_premium_full
      : customJenisMode === 'mix'
      ? cp.harga_mix || cp.harga_satuan_default * cp.kapasitas
      : cp.harga_satuan_default * cp.kapasitas;

  const diskon =
    (cp.diskon_nominal || 0) > 0
      ? cp.diskon_nominal || 0
      : Math.round((hargaBase || 0) * (cp.diskon_persen || 0) / 100);

  const totalTambahan = customTambahan.reduce((s, t) => s + t.harga, 0);
  const grandTotalCustom = (hargaBase || 0) - diskon + totalTambahan;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() =>
            setCustomStep(
              cp.enable_tulisan
                ? 'tulisan'
                : customJenisMode === 'random' || customJenisMode === 'mix'
                ? 'pilih-jenis'
                : 'pilih-rasa'
            )
          }
          className="p-2.5 bg-slate-100 rounded-lg shrink-0 hover:bg-slate-200 transition-colors"
        >
          <Icons.ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h3 className="font-bold text-slate-900 text-lg">Finalisasi Order</h3>
          <p className="text-sm text-slate-600">
            {cp.kode && <span className="font-semibold mr-1">{cp.kode}</span>} {customModeLabel}
          </p>
        </div>
        <button
          onClick={konfirmasiCustom}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2"
        >
          <Icons.Check size={16} />
          Tambah ke Keranjang
        </button>
      </div>

      {/* Preview Isi Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
        <p className="text-xs font-semibold text-slate-700 mb-3">
          Isi Box ({customIsi.length} pcs)
        </p>
        <div className="flex flex-wrap gap-2">
          {customIsi.map((d, i) => (
            <span
              key={i}
              className="text-xs bg-white border border-slate-300 text-slate-700 font-medium px-2.5 py-1 rounded-md"
            >
              {d.nama}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Tambahan Topping */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Tambahan Topping</p>
          <div className="space-y-2">
            {tambahanList.length === 0 && (
              <p className="text-sm text-slate-400">Tidak ada topping tersedia</p>
            )}
            {tambahanList.map(t => {
              const qty = customTambahan.find(x => x.id === t.id)?.qty || 0;
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.nama}</p>
                    <p className="text-xs text-slate-600 font-medium">
                      {formatRp(t.harga_jual)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const next = [...customTambahan];
                        const idx = next.findIndex(x => x.id === t.id);
                        if (idx !== -1) {
                          if (next[idx].qty > 1) {
                            next[idx].qty--;
                            next[idx].harga = t.harga_jual * next[idx].qty;
                          } else next.splice(idx, 1);
                          setCustomTambahan(next);
                        }
                      }}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-colors"
                    >
                      <Icons.Minus size={14} />
                    </button>
                    <span className="text-sm font-bold w-6 text-center">{qty}</span>
                    <button
                      onClick={() => {
                        const next = [...customTambahan];
                        const idx = next.findIndex(x => x.id === t.id);
                        if (idx === -1)
                          next.push({ id: t.id, nama: t.nama, qty: 1, harga: t.harga_jual });
                        else {
                          next[idx].qty++;
                          next[idx].harga = t.harga_jual * next[idx].qty;
                        }
                        setCustomTambahan(next);
                      }}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
                    >
                      <Icons.Plus size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ringkasan Total */}
          <div className="mt-5 bg-slate-900 text-white rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Harga Donat</span>
              <span className="font-semibold">{formatRp(hargaBase || 0)}</span>
            </div>
            {diskon > 0 && (
              <div className="flex justify-between text-sm text-red-400">
                <span>Diskon</span>
                <span className="font-semibold">− {formatRp(diskon)}</span>
              </div>
            )}
            {totalTambahan > 0 && (
              <div className="flex justify-between text-sm text-slate-400">
                <span>Tambahan</span>
                <span className="font-semibold">+ {formatRp(totalTambahan)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-700 pt-2">
              <span className="text-sm font-bold">Total</span>
              <span className="text-lg font-bold">{formatRp(grandTotalCustom)}</span>
            </div>
          </div>
        </div>

        {/* Tulisan Coklat - Preview Saja (sudah diinput di Step Tulisan) */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">Tulisan di Papan Coklat</p>
          {customMintaTulisan && customTulisan ? (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-600 mb-2">Tulisan yang diminta:</p>
              <p className="text-sm font-semibold text-slate-900 italic">"{customTulisan}"</p>
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Jumlah papan coklat:</span>
                  <span className="text-lg font-black text-amber-600">{customJumlahPapan} papan</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  (Estimasi otomatis: ±{Math.ceil(customTulisan.length / 15)} papan)
                </p>
              </div>
              <button onClick={() => setCustomStep('tulisan')} className="text-xs text-slate-600 font-medium underline mt-2 block hover:text-slate-900">Ubah tulisan</button>
            </div>
          ) : cp?.enable_tulisan ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-400">Tidak ada tulisan coklat</p>
              <button onClick={() => setCustomStep('tulisan')} className="text-sm text-slate-600 font-medium underline mt-2 hover:text-slate-900">Tambah tulisan?</button>
            </div>
          ) : (
            <div className="h-32 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center">
              <p className="text-sm text-slate-400 font-medium">Fitur tulisan tidak aktif</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
