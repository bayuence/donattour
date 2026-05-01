'use client';

import * as Icons from 'lucide-react';
import type { MenuPanelProps } from '../../types';

export default function Tulisan(props: MenuPanelProps) {
  const {
    selectedCustomPaket,
    customJenisMode,
    customModeLabel,
    customIsi,
    customTulisan,
    setCustomTulisan,
    customMintaTulisan,
    setCustomMintaTulisan,
    customJumlahPapan,
    setCustomJumlahPapan,
    setCustomStep,
    setCustomIsi,
  } = props;

  if (!selectedCustomPaket) return null;

  const cp = selectedCustomPaket;

  return (
    <div className="animate-in fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() =>
            setCustomStep(
              customJenisMode === 'random' || customJenisMode === 'mix'
                ? 'pilih-jenis'
                : 'pilih-rasa'
            )
          }
          className="p-2.5 bg-slate-100 rounded-lg shrink-0 hover:bg-slate-200 transition-colors"
        >
          <Icons.ArrowLeft size={18} />
        </button>
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Tulisan di Box</h3>
          <p className="text-sm text-slate-600">
            {cp.kode || cp.nama} • {customModeLabel}
          </p>
        </div>
      </div>

      {/* Review isi (untuk mode auto) */}
      {(customJenisMode === 'random' || customJenisMode === 'mix') && customIsi.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5">
          <p className="text-xs font-semibold text-slate-700 mb-2">
            Isi Donat ({customIsi.length} pcs) — {customModeLabel}
          </p>
          <div className="flex flex-wrap gap-2 mb-2">
            {customIsi.map((d, i) => (
              <span
                key={i}
                className="text-xs bg-white border border-slate-300 text-slate-700 font-medium px-2.5 py-1 rounded-md"
              >
                {d.nama}
              </span>
            ))}
          </div>
          <button
            onClick={() => setCustomStep('pilih-jenis')}
            className="text-xs text-slate-500 hover:text-slate-900 font-medium underline"
          >
            Ganti mode isian
          </button>
        </div>
      )}

      {/* Toggle Yes/No */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => {
            setCustomMintaTulisan(false);
            setCustomTulisan('');
            setCustomStep('tambahan');
          }}
          className={`p-6 rounded-xl border-2 text-center transition-all ${
            !customMintaTulisan
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Icons.X size={24} />
          </div>
          <p className="font-bold text-sm">Tidak Perlu</p>
          <p className="text-xs opacity-70 mt-1">Tanpa tulisan coklat</p>
        </button>
        <button
          onClick={() => setCustomMintaTulisan(true)}
          className={`p-6 rounded-xl border-2 text-center transition-all ${
            customMintaTulisan
              ? 'border-slate-900 bg-slate-50'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Icons.MessageSquare size={24} className="text-slate-700" />
          </div>
          <p className="font-bold text-sm text-slate-900">Ya, Ada Tulisan</p>
          <p className="text-xs text-slate-500 mt-1">Papan coklat bertulisan</p>
        </button>
      </div>

      {/* Input tulisan jika ya */}
      {customMintaTulisan && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <label className="text-sm font-semibold text-slate-700">Tulisan yang diminta:</label>
          <textarea
            autoFocus
            value={customTulisan}
            onChange={e => setCustomTulisan(e.target.value)}
            placeholder="Contoh: Happy Birthday Kak Sari 🎂"
            className="w-full h-24 p-4 bg-slate-50 border-2 border-slate-200 rounded-lg text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400 resize-none"
          />
          
          {/* Input Manual Jumlah Papan Coklat */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
            <label className="text-sm font-semibold text-slate-700 mb-2 block">
              Jumlah Papan Coklat yang Digunakan:
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCustomJumlahPapan(Math.max(0, customJumlahPapan - 1))}
                className="w-10 h-10 rounded-lg bg-white border-2 border-amber-300 flex items-center justify-center font-bold hover:bg-amber-100 hover:border-amber-400 transition-colors"
              >
                <Icons.Minus size={18} />
              </button>
              <input
                type="number"
                min="0"
                value={customJumlahPapan}
                onChange={e => setCustomJumlahPapan(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 text-center text-2xl font-black text-slate-900 bg-white border-2 border-amber-300 rounded-lg py-2 px-4 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                onClick={() => setCustomJumlahPapan(customJumlahPapan + 1)}
                className="w-10 h-10 rounded-lg bg-white border-2 border-amber-300 flex items-center justify-center font-bold hover:bg-amber-100 hover:border-amber-400 transition-colors"
              >
                <Icons.Plus size={18} />
              </button>
            </div>
            <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
              <Icons.Info size={14} />
              Kasir input manual berapa papan coklat yang dipakai
            </p>
          </div>

          {customTulisan && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-start gap-3">
              <Icons.Info size={18} className="text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-700">Info Tulisan</p>
                <p className="text-xs text-slate-500">{customTulisan.length} karakter</p>
                <p className="text-xs text-slate-400 mt-1">
                  Estimasi otomatis: ±{Math.ceil(customTulisan.length / 15)} papan
                </p>
              </div>
            </div>
          )}
          <button
            disabled={!customTulisan.trim()}
            onClick={() => setCustomStep('tambahan')}
            className="w-full py-3 bg-slate-900 text-white rounded-lg font-semibold text-sm disabled:opacity-30 hover:bg-slate-800 transition-all"
          >
            Lanjutkan
          </button>
        </div>
      )}
    </div>
  );
}
