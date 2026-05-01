'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { CustomModePricing, ToppingPricing } from '@/lib/types';

interface ToppingManagerProps {
  mode: CustomModePricing;
  expandedTopping: string | null;
  onExpandedToppingChange: (key: string | null) => void;
  onUpdateTopping: (modeId: string, toppingProductId: string, updates: Partial<ToppingPricing>) => void;
  onToggleTopping: (modeId: string, toppingProductId: string) => void;
  formatRp: (n: number) => string;
}

export function ToppingManager({
  mode,
  expandedTopping,
  onExpandedToppingChange,
  onUpdateTopping,
  onToggleTopping,
  formatRp,
}: ToppingManagerProps) {
  if (!mode.topping_pricing || mode.topping_pricing.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <Icons.Sparkles size={32} className="mx-auto text-slate-300 mb-2" />
        <p className="text-xs font-medium text-slate-400">Belum ada topping/printilan</p>
        <p className="text-xs text-slate-400 mt-1">Tambahkan produk tipe "Tambahan" terlebih dahulu</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {mode.topping_pricing.map((topping) => {
        const toppingKey = `${mode.id}_${topping.product_id}`;
        const isToppingExpanded = expandedTopping === toppingKey;

        return (
          <div
            key={topping.product_id}
            className={`border rounded-lg overflow-hidden transition-all ${
              topping.is_active
                ? 'border-purple-200 bg-purple-50'
                : 'border-slate-200 bg-slate-50 opacity-60'
            }`}
          >
            {/* Topping Header */}
            <div className="flex items-center justify-between p-2.5 hover:bg-white/50 transition-colors">
              <div className="flex items-center gap-2 flex-1">
                <div className="w-6 h-6 rounded bg-white border border-purple-200 flex items-center justify-center">
                  <Icons.Sparkles size={12} className="text-purple-500" />
                </div>
                <div className="flex-1">
                  <h6 className="text-xs font-semibold text-slate-900">{topping.nama}</h6>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500">
                      Jual: <span className="font-semibold text-slate-700">{formatRp(topping.harga_jual)}</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      HPP: <span className="font-semibold text-slate-700">{formatRp(topping.hpp_per_unit)}</span>
                    </span>
                    {topping.margin_percent > 0 && (
                      <span className="text-[10px] text-green-600 font-semibold">
                        {topping.margin_percent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onToggleTopping(mode.id, topping.product_id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    topping.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {topping.is_active ? 'Aktif' : 'Off'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onExpandedToppingChange(isToppingExpanded ? null : toppingKey)
                  }
                  className="p-1 hover:bg-white rounded transition-colors"
                >
                  {isToppingExpanded ? (
                    <Icons.ChevronUp size={14} />
                  ) : (
                    <Icons.ChevronDown size={14} />
                  )}
                </button>
              </div>
            </div>

            {/* Topping Expanded Content */}
            {isToppingExpanded && (
              <div className="p-3 border-t border-purple-200 bg-white space-y-3">
                {/* Pricing Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1.5">
                      Harga Jual per Unit
                    </label>
                    <CurrencyInput
                      value={String(topping.harga_jual)}
                      onChange={(e) =>
                        onUpdateTopping(mode.id, topping.product_id, {
                          harga_jual: parseInt(e.target.value.replace(/\D/g, '')) || 0,
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-1.5">
                      HPP per Unit
                    </label>
                    <CurrencyInput
                      value={String(topping.hpp_per_unit)}
                      onChange={(e) =>
                        onUpdateTopping(mode.id, topping.product_id, {
                          hpp_per_unit: parseInt(e.target.value.replace(/\D/g, '')) || 0,
                        })
                      }
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Margin Display */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                    <p className="text-[10px] text-green-600 font-medium mb-0.5">Margin (Rp)</p>
                    <p className="text-sm font-bold text-green-700">{formatRp(topping.margin_amount)}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                    <p className="text-[10px] text-green-600 font-medium mb-0.5">Margin (%)</p>
                    <p className="text-sm font-bold text-green-700">{topping.margin_percent.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
