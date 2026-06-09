'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { calculateProductPricing, validateProductPricing, calculateRecommendedPrice } from '@/lib/utils/pricing';
import type { Product } from '@/lib/types';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface ProductPricingFormProps {
  value: ProductPricingData;
  onChange: (data: ProductPricingData) => void;
  showRecommendation?: boolean;
  targetMarginPercent?: number;
}

export interface ProductPricingData {
  is_donat: boolean;
  ukuran_donat?: 'mini' | 'regular' | 'jumbo' | 'dozen' | null;
  hpp_base_donat?: number | null;
  hpp_topping?: number | null;
  hpp_total?: number | null;
  harga_jual: number;
  margin_amount?: number | null;
  margin_percent?: number | null;
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const UKURAN_OPTIONS = [
  { value: 'mini', label: 'Mini', desc: 'Donat ukuran kecil' },
  { value: 'regular', label: 'Regular', desc: 'Donat ukuran standar' },
  { value: 'jumbo', label: 'Jumbo', desc: 'Donat ukuran besar' },
  { value: 'dozen', label: 'Dozen', desc: 'Paket 12 pcs' },
] as const;

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

const formatRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const getMarginColor = (percent: number) => {
  if (percent < 20) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: TrendingDown };
  if (percent < 35) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: TrendingUp };
  return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2 };
};

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function ProductPricingForm({ 
  value, 
  onChange, 
  showRecommendation = true,
  targetMarginPercent = 35 
}: ProductPricingFormProps) {
  const [errors, setErrors] = useState<string[]>([]);

  // Auto-calculate pricing whenever inputs change
  useEffect(() => {
    if (value.harga_jual > 0) {
      const pricing = calculateProductPricing(value as Partial<Product>);
      onChange({
        ...value,
        hpp_total: pricing.hpp_total,
        margin_amount: pricing.margin_amount,
        margin_percent: pricing.margin_percent,
      });
    }
  }, [value.is_donat, value.hpp_base_donat, value.hpp_topping, value.harga_jual]);

  // Validate on change
  useEffect(() => {
    const validation = validateProductPricing(value as Partial<Product>);
    setErrors(validation.errors);
  }, [value]);

  // ═══════════════════════════════════════════════════════════
  // EVENT HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleIsDonatChange = (isDonat: boolean) => {
    if (!isDonat) {
      // Reset donat-specific fields
      onChange({
        ...value,
        is_donat: false,
        ukuran_donat: null,
        hpp_base_donat: null,
        hpp_topping: null,
      });
    } else {
      onChange({
        ...value,
        is_donat: true,
        ukuran_donat: 'regular',
        hpp_base_donat: 0,
        hpp_topping: 0,
      });
    }
  };

  const handleUkuranChange = (ukuran: ProductPricingData['ukuran_donat']) => {
    onChange({ ...value, ukuran_donat: ukuran });
  };

  const handleHppBaseChange = (val: string) => {
    onChange({ ...value, hpp_base_donat: Number(val) || 0 });
  };

  const handleHppToppingChange = (val: string) => {
    onChange({ ...value, hpp_topping: Number(val) || 0 });
  };

  const handleHppTotalChange = (val: string) => {
    onChange({ ...value, hpp_total: Number(val) || 0 });
  };

  const handleHargaJualChange = (val: string) => {
    onChange({ ...value, harga_jual: Number(val) || 0 });
  };

  const applyRecommendedPrice = () => {
    const hppTotal = value.hpp_total || 0;
    const recommended = calculateRecommendedPrice(hppTotal, targetMarginPercent);
    onChange({ ...value, harga_jual: recommended });
  };

  // ═══════════════════════════════════════════════════════════
  // CALCULATED VALUES
  // ═══════════════════════════════════════════════════════════

  const marginColor = value.margin_percent ? getMarginColor(value.margin_percent) : null;
  const recommendedPrice = value.hpp_total ? calculateRecommendedPrice(value.hpp_total, targetMarginPercent) : 0;

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      
      {/* ── SECTION 1: Apakah Donat? ──────────────────────── */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-amber-100 bg-white/50">
          <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Tipe Produk</p>
        </div>
        
        <div className="p-5">
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-slate-700">Apakah ini produk donat?</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleIsDonatChange(true)}
                className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                  value.is_donat
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-white text-slate-400 border-2 border-slate-200 hover:border-amber-300'
                }`}
              >
                ✓ Ya
              </button>
              <button
                type="button"
                onClick={() => handleIsDonatChange(false)}
                className={`px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                  !value.is_donat
                    ? 'bg-slate-600 text-white shadow-lg shadow-slate-500/30'
                    : 'bg-white text-slate-400 border-2 border-slate-200 hover:border-slate-300'
                }`}
              >
                ✗ Bukan
              </button>
            </div>
          </div>

          {/* Ukuran Donat (if is_donat) */}
          {value.is_donat && (
            <div className="mt-4 pt-4 border-t border-amber-100">
              <p className="text-xs font-bold text-slate-600 mb-3">Pilih Ukuran:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {UKURAN_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleUkuranChange(opt.value)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      value.ukuran_donat === opt.value
                        ? 'border-amber-400 bg-amber-50 shadow-md'
                        : 'border-slate-200 bg-white hover:border-amber-200'
                    }`}
                  >
                    <p className={`text-sm font-black ${
                      value.ukuran_donat === opt.value ? 'text-amber-700' : 'text-slate-700'
                    }`}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 2: HPP Input ───────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-red-50 to-pink-50">
          <p className="text-xs font-black text-red-700 uppercase tracking-widest">
            {value.is_donat ? 'HPP Breakdown' : 'HPP Total'}
          </p>
          <p className="text-[10px] text-red-500 mt-0.5">Harga Pokok Penjualan (Modal)</p>
        </div>

        <div className="p-5 space-y-4">
          {value.is_donat ? (
            // HPP Breakdown untuk Donat
            <>
              <div className="grid grid-cols-2 gap-4">
                {/* HPP Donat Polos */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    HPP Donat Polos
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl focus-within:border-red-400 transition-all">
                    <span className="text-xs font-black text-red-400">Rp</span>
                    <CurrencyInput
                      value={value.hpp_base_donat || 0}
                      onChange={(e) => handleHppBaseChange(e.target.value)}
                      className="w-full bg-transparent text-base font-black text-red-700 focus:outline-none"
                      placeholder="0"
                      required
                    />
                  </div>
                  <p className="text-[9px] text-slate-400">Biaya donat tanpa topping</p>
                </div>

                {/* HPP Topping */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    HPP Topping
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl focus-within:border-red-400 transition-all">
                    <span className="text-xs font-black text-red-400">Rp</span>
                    <CurrencyInput
                      value={value.hpp_topping || 0}
                      onChange={(e) => handleHppToppingChange(e.target.value)}
                      className="w-full bg-transparent text-base font-black text-red-700 focus:outline-none"
                      placeholder="0"
                      required
                    />
                  </div>
                  <p className="text-[9px] text-slate-400">Biaya topping/isian</p>
                </div>
              </div>

              {/* Total HPP (Calculated) */}
              <div className="pt-3 border-t-2 border-dashed border-red-100">
                <div className="flex items-center justify-between px-4 py-3 bg-red-100 rounded-xl">
                  <span className="text-xs font-black text-red-800 uppercase tracking-wider">Total HPP:</span>
                  <span className="text-lg font-black text-red-700">
                    {formatRp(value.hpp_total || 0)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            // HPP Total untuk Non-Donat
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                HPP Total (Modal)
                <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-2 border-red-200 rounded-xl focus-within:border-red-400 transition-all">
                <span className="text-xs font-black text-red-400">Rp</span>
                <CurrencyInput
                  value={value.hpp_total || 0}
                  onChange={(e) => handleHppTotalChange(e.target.value)}
                  className="w-full bg-transparent text-lg font-black text-red-700 focus:outline-none"
                  placeholder="0"
                  required
                />
              </div>
              <p className="text-[9px] text-slate-400">Total biaya produksi per unit</p>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 3: Harga Jual ──────────────────────────── */}
      <div className="bg-white rounded-2xl border-2 border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Harga Jual</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Harga untuk customer</p>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
              Harga Jual ke Customer
              <span className="text-emerald-500">*</span>
            </label>
            <div className="flex items-center gap-2 px-4 py-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl focus-within:border-emerald-400 transition-all">
              <span className="text-sm font-black text-emerald-400">Rp</span>
              <CurrencyInput
                value={value.harga_jual}
                onChange={(e) => handleHargaJualChange(e.target.value)}
                className="w-full bg-transparent text-xl font-black text-emerald-700 focus:outline-none"
                placeholder="0"
                required
              />
            </div>
          </div>

          {/* Recommended Price */}
          {showRecommendation && value.hpp_total > 0 && recommendedPrice !== value.harga_jual && (
            <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Rekomendasi (Margin {targetMarginPercent}%)</p>
                <p className="text-sm font-black text-blue-700 mt-0.5">{formatRp(recommendedPrice)}</p>
              </div>
              <button
                type="button"
                onClick={applyRecommendedPrice}
                className="px-4 py-2 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-all"
              >
                Pakai
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 4: Margin Display ──────────────────────── */}
      {value.harga_jual > 0 && value.hpp_total > 0 && marginColor && (
        <div className={`${marginColor.bg} rounded-2xl border-2 ${marginColor.border} overflow-hidden shadow-lg`}>
          <div className="px-5 py-4 border-b border-white/50 bg-white/30">
            <p className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <marginColor.icon size={16} className={marginColor.text} />
              Keuntungan (Margin)
            </p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Margin Rupiah */}
              <div className="text-center p-4 bg-white/60 rounded-xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Margin (Rp)</p>
                <p className={`text-2xl font-black ${marginColor.text}`}>
                  {formatRp(value.margin_amount || 0)}
                </p>
              </div>

              {/* Margin Persen */}
              <div className="text-center p-4 bg-white/60 rounded-xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Margin (%)</p>
                <p className={`text-2xl font-black ${marginColor.text}`}>
                  {value.margin_percent?.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Margin Status */}
            <div className="mt-4 p-3 bg-white/40 rounded-xl">
              <p className={`text-xs font-bold ${marginColor.text} text-center`}>
                {value.margin_percent < 20 && '⚠️ Margin terlalu kecil'}
                {value.margin_percent >= 20 && value.margin_percent < 35 && '✓ Margin cukup baik'}
                {value.margin_percent >= 35 && '✓✓ Margin sangat baik!'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 5: Validation Errors ───────────────────── */}
      {errors.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-black text-red-700 uppercase tracking-wider mb-2">Perlu Diperbaiki:</p>
              <ul className="space-y-1">
                {errors.map((err, idx) => (
                  <li key={idx} className="text-xs text-red-600 font-medium">• {err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
