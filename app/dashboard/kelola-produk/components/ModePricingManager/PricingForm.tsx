'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { CustomModePricing, CustomModeConfig } from '@/lib/types';
import { calculateHPPForMode } from './helpers';
import { HPPBreakdown } from './HPPBreakdown';

interface PricingFormProps {
  mode: CustomModePricing;
  modeConfig: CustomModeConfig;
  kapasitas: number;
  ukuranDonat: 'standar' | 'mini';
  categories: { id: string; nama: string }[];
  onUpdate: (updates: Partial<CustomModePricing>) => void;
  formatRp: (n: number) => string;
  formatPercent: (n: number) => string;
}

export function PricingForm({
  mode,
  modeConfig,
  kapasitas,
  ukuranDonat,
  categories,
  onUpdate,
  formatRp,
  formatPercent,
}: PricingFormProps) {
  const [showHPPBreakdown, setShowHPPBreakdown] = useState(false);

  const handleAutoCalculateHPP = async () => {
    const { hpp: newHPP, info: hppInfo } = await calculateHPPForMode(
      modeConfig,
      kapasitas,
      ukuranDonat,
      categories
    );

    if (newHPP > 0) {
      onUpdate({
        hpp_estimated: Math.round(newHPP),
        keterangan: `HPP Info: ${hppInfo}`,
      });
    } else {
      alert(
        `Tidak ada produk ${ukuranDonat} dengan HPP yang valid di kategori yang dipilih.\n\nSilakan:\n1. Input HPP manual, atau\n2. Tambahkan produk ${ukuranDonat} dengan HPP di Manajemen Produk`
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Pricing Section */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Icons.DollarSign size={14} />
          Pricing & Margin
        </h5>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">
              HPP per Box
              <span className="text-[10px] text-slate-400 block font-normal">
                {mode.keterangan?.includes('HPP Info:')
                  ? mode.keterangan.replace('HPP Info: ', '')
                  : 'Input manual atau klik Auto untuk hitung dari database'}
              </span>
            </label>
            <div className="relative">
              <CurrencyInput
                value={String(mode.hpp_estimated)}
                onChange={(e) =>
                  onUpdate({
                    hpp_estimated: parseInt(e.target.value.replace(/\D/g, '')) || 0,
                  })
                }
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-semibold focus:border-slate-900 focus:outline-none"
                placeholder="Input HPP manual"
              />
              <button
                type="button"
                onClick={handleAutoCalculateHPP}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                title="Hitung otomatis dari database produk"
              >
                Auto
              </button>
            </div>

            {/* Real-time HPP Breakdown Display */}
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setShowHPPBreakdown(!showHPPBreakdown)}
                className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2 w-full hover:text-slate-900"
              >
                <Icons.Calculator size={14} />
                HPP Breakdown Realtime ({ukuranDonat})
                {showHPPBreakdown ? (
                  <Icons.ChevronUp size={12} className="ml-auto" />
                ) : (
                  <Icons.ChevronDown size={12} className="ml-auto" />
                )}
              </button>
              {showHPPBreakdown && (
                <HPPBreakdown
                  ukuranDonat={ukuranDonat}
                  kapasitas={kapasitas}
                  modeConfig={modeConfig}
                  categories={categories}
                />
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">
              Biaya Topping
              <span className="text-[10px] text-slate-400 block font-normal">
                Estimasi biaya topping per box
              </span>
            </label>
            <CurrencyInput
              value={String(mode.biaya_topping || 0)}
              onChange={(e) =>
                onUpdate({
                  biaya_topping: parseInt(e.target.value.replace(/\D/g, '')) || 0,
                })
              }
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-semibold focus:border-slate-900 focus:outline-none"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">
              Harga Jual
            </label>
            <CurrencyInput
              value={String(mode.harga_jual)}
              onChange={(e) =>
                onUpdate({
                  harga_jual: parseInt(e.target.value.replace(/\D/g, '')) || 0,
                })
              }
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-semibold focus:border-slate-900 focus:outline-none"
            />
          </div>
        </div>

        {/* Margin Display */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-600 font-medium mb-1">HPP per Box</p>
            <p className="text-lg font-bold text-red-700">{formatRp(mode.hpp_estimated || 0)}</p>
            <p className="text-[10px] text-red-500 mt-1">Base + Topping</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <p className="text-xs text-orange-600 font-medium mb-1">Biaya Topping</p>
            <p className="text-lg font-bold text-orange-700">{formatRp(mode.biaya_topping || 0)}</p>
            <p className="text-[10px] text-orange-500 mt-1">Ekstra topping</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium mb-1">Harga Jual</p>
            <p className="text-lg font-bold text-blue-700">{formatRp(mode.harga_jual)}</p>
            <p className="text-[10px] text-blue-500 mt-1">Harga ke customer</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-600 font-medium mb-1">Margin</p>
            <p className="text-lg font-bold text-green-700">{formatPercent(mode.margin_percent)}</p>
            <p className="text-[10px] text-green-500 mt-1">{formatRp(mode.margin_amount)}</p>
          </div>
        </div>
      </div>

      {/* Discount Section */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Icons.Tag size={14} />
          Diskon (Opsional)
        </h5>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">
              Diskon Nominal (Rp)
            </label>
            <CurrencyInput
              value={String(mode.diskon_nominal || 0)}
              onChange={(e) =>
                onUpdate({
                  diskon_nominal: parseInt(e.target.value.replace(/\D/g, '')) || undefined,
                })
              }
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-semibold focus:border-slate-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-2">
              Diskon Persen (%)
            </label>
            <input
              type="number"
              value={mode.diskon_persen || ''}
              onChange={(e) =>
                onUpdate({
                  diskon_persen: parseFloat(e.target.value) || undefined,
                })
              }
              className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm font-semibold focus:border-slate-900 focus:outline-none"
              placeholder="0"
            />
          </div>
        </div>
        {(mode.diskon_nominal || mode.diskon_persen) && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium mb-1">Harga Setelah Diskon</p>
            <p className="text-lg font-bold text-blue-700">{formatRp(mode.harga_setelah_diskon)}</p>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-semibold text-slate-600 block mb-2">
          Keterangan (Internal)
        </label>
        <textarea
          value={mode.keterangan || ''}
          onChange={(e) => onUpdate({ keterangan: e.target.value })}
          className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg text-sm focus:border-slate-900 focus:outline-none resize-none"
          rows={2}
          placeholder="Catatan internal untuk mode ini..."
        />
      </div>
    </div>
  );
}
