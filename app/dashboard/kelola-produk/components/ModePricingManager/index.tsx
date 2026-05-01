'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import type { CustomModePricing, ToppingPricing, Product, CustomModeConfig } from '@/lib/types';
import { ModeCard } from './ModeCard';
import { PricingForm } from './PricingForm';
import { ToppingManager } from './ToppingManager';

interface Props {
  modes: CustomModePricing[];
  kapasitas: number;
  ukuranDonat: 'standar' | 'mini';
  categories: { id: string; nama: string }[];
  toppingProducts: Product[];
  availableModeTypes: CustomModeConfig[];
  onChange: (modes: CustomModePricing[]) => void;
}

const formatRp = (n: number): string => {
  if (isNaN(n) || n === null || n === undefined) return 'Rp 0';
  return 'Rp ' + n.toLocaleString('id-ID');
};

const formatPercent = (n: number): string => {
  if (isNaN(n) || n === null || n === undefined) return '0%';
  return n.toFixed(1) + '%';
};

export default function ModePricingManager({
  modes,
  kapasitas,
  ukuranDonat,
  categories,
  toppingProducts,
  availableModeTypes,
  onChange,
}: Props) {
  const [expandedMode, setExpandedMode] = useState<string | null>(null);
  const [expandedTopping, setExpandedTopping] = useState<string | null>(null);

  const addMode = async (modeConfigId: string) => {
    const modeConfig = availableModeTypes.find((m) => m.id === modeConfigId);
    if (!modeConfig) return;

    // Import calculateHPPForMode from helpers
    const { calculateHPPForMode } = await import('./helpers');
    const { hpp: estimatedHPP, info: hppInfo } = await calculateHPPForMode(
      modeConfig,
      kapasitas,
      ukuranDonat,
      categories
    );

    // Initialize topping pricing for this mode
    const initialToppingPricing: ToppingPricing[] = toppingProducts.map((t) => ({
      id: `topping_${t.id}`,
      product_id: t.id,
      nama: t.nama,
      hpp_per_unit: t.harga_pokok_penjualan || 0,
      harga_jual: t.harga_jual || 0,
      margin_amount: (t.harga_jual || 0) - (t.harga_pokok_penjualan || 0),
      margin_percent:
        t.harga_jual > 0
          ? (((t.harga_jual || 0) - (t.harga_pokok_penjualan || 0)) / t.harga_jual) * 100
          : 0,
      is_active: true,
    }));

    const newMode: CustomModePricing = {
      id: `mode_${Date.now()}`,
      mode_config_id: modeConfig.id,
      mode_label: modeConfig.nama,
      is_enabled: true,
      harga_jual: 0,
      hpp_estimated: Math.round(estimatedHPP) || 0,
      biaya_topping: 0,
      margin_amount: 0,
      margin_percent: 0,
      harga_setelah_diskon: 0,
      topping_pricing: initialToppingPricing,
      keterangan:
        estimatedHPP > 0
          ? `HPP Info: ${hppInfo}`
          : `HPP belum dihitung - tidak ada produk ${ukuranDonat} dengan HPP valid`,
    };

    onChange([...modes, newMode]);
    setExpandedMode(newMode.id);

    // Show info if no HPP data found
    if (estimatedHPP === 0) {
      setTimeout(() => {
        alert(
          `Mode "${modeConfig.nama}" ditambahkan, tapi HPP belum dihitung karena tidak ada produk ${ukuranDonat} dengan HPP yang valid.\n\nSilakan:\n1. Input HPP manual di field HPP, atau\n2. Tambahkan produk ${ukuranDonat} dengan HPP di Manajemen Produk`
        );
      }, 100);
    }
  };

  const updateMode = (id: string, updates: Partial<CustomModePricing>) => {
    const updated = modes.map((m) => {
      if (m.id !== id) return m;

      const newMode = { ...m, ...updates };

      // Auto-calculate margins
      if ('harga_jual' in updates || 'hpp_estimated' in updates || 'biaya_topping' in updates) {
        const hargaJual = newMode.harga_jual || 0;
        const hppEstimated = newMode.hpp_estimated || 0;
        const biayaTopping = newMode.biaya_topping || 0;
        const totalCost = hppEstimated + biayaTopping;

        newMode.margin_amount = hargaJual - totalCost;
        newMode.margin_percent = hargaJual > 0 ? (newMode.margin_amount / hargaJual) * 100 : 0;

        // Ensure no NaN values
        if (isNaN(newMode.margin_amount)) newMode.margin_amount = 0;
        if (isNaN(newMode.margin_percent)) newMode.margin_percent = 0;
      }

      // Auto-calculate final price after discount
      if ('harga_jual' in updates || 'diskon_nominal' in updates || 'diskon_persen' in updates) {
        const diskon =
          newMode.diskon_nominal ||
          (newMode.diskon_persen
            ? Math.round(newMode.harga_jual * (newMode.diskon_persen / 100))
            : 0);
        newMode.harga_setelah_diskon = newMode.harga_jual - diskon;
      }

      return newMode;
    });

    onChange(updated);
  };

  const deleteMode = (id: string) => {
    if (confirm('Hapus mode pricing ini?')) {
      onChange(modes.filter((m) => m.id !== id));
    }
  };

  const toggleMode = (id: string) => {
    updateMode(id, { is_enabled: !modes.find((m) => m.id === id)?.is_enabled });
  };

  const updateTopping = (
    modeId: string,
    toppingProductId: string,
    updates: Partial<ToppingPricing>
  ) => {
    const mode = modes.find((m) => m.id === modeId);
    if (!mode || !mode.topping_pricing) return;

    const updatedToppings = mode.topping_pricing.map((t) => {
      if (t.product_id !== toppingProductId) return t;

      const newTopping = { ...t, ...updates };

      // Auto-calculate margins
      if ('harga_jual' in updates || 'hpp_per_unit' in updates) {
        newTopping.margin_amount = newTopping.harga_jual - newTopping.hpp_per_unit;
        newTopping.margin_percent =
          newTopping.harga_jual > 0
            ? (newTopping.margin_amount / newTopping.harga_jual) * 100
            : 0;
      }

      return newTopping;
    });

    updateMode(modeId, { topping_pricing: updatedToppings });
  };

  const toggleTopping = (modeId: string, toppingProductId: string) => {
    const mode = modes.find((m) => m.id === modeId);
    if (!mode || !mode.topping_pricing) return;

    const topping = mode.topping_pricing.find((t) => t.product_id === toppingProductId);
    if (topping) {
      updateTopping(modeId, toppingProductId, { is_active: !topping.is_active });
    }
  };

  // Filter available mode configs (exclude already added modes)
  const availableModesToAdd = availableModeTypes.filter(
    (mt) => !modes.some((m) => m.mode_config_id === mt.id) && mt.is_active
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Mode Pricing Configuration</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Atur harga, HPP, dan margin untuk setiap mode penjualan
          </p>
        </div>
        {availableModesToAdd.length > 0 && (
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              <Icons.Plus size={16} />
              Tambah Mode
            </button>
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {availableModesToAdd.map((modeConfig) => {
                return (
                  <button
                    key={modeConfig.id}
                    type="button"
                    onClick={() => addMode(modeConfig.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-100 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Icons.Package size={16} className="text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-700 block">{modeConfig.nama}</span>
                      <span className="text-xs text-slate-400">
                        {modeConfig.category_limits?.length || 0} kategori tersedia
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mode List */}
      {modes.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Icons.Package size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-medium text-slate-400">Belum ada mode pricing</p>
          <p className="text-xs text-slate-400 mt-1">Klik "Tambah Mode" untuk mulai</p>
        </div>
      ) : (
        <div className="space-y-3">
          {modes.map((mode) => {
            const modeConfig = availableModeTypes.find((mt) => mt.id === mode.mode_config_id);
            const isExpanded = expandedMode === mode.id;

            return (
              <div
                key={mode.id}
                className={`border-2 rounded-xl overflow-hidden transition-all ${
                  mode.is_enabled
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-100 bg-slate-50 opacity-60'
                }`}
              >
                {/* Mode Card Header */}
                <ModeCard
                  mode={mode}
                  isExpanded={isExpanded}
                  onToggle={() => toggleMode(mode.id)}
                  onExpand={() => setExpandedMode(isExpanded ? null : mode.id)}
                  onDelete={() => deleteMode(mode.id)}
                  formatRp={formatRp}
                  formatPercent={formatPercent}
                />

                {/* Expanded Content */}
                {isExpanded && modeConfig && (
                  <div className="p-5 space-y-5 border-t border-slate-200">
                    {/* Pricing Form */}
                    <PricingForm
                      mode={mode}
                      modeConfig={modeConfig}
                      kapasitas={kapasitas}
                      ukuranDonat={ukuranDonat}
                      categories={categories}
                      onUpdate={(updates) => updateMode(mode.id, updates)}
                      formatRp={formatRp}
                      formatPercent={formatPercent}
                    />

                    {/* Topping & Printilan Pricing */}
                    <div className="border-t-2 border-purple-200 pt-5">
                      <h5 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                        <Icons.Sparkles size={14} className="text-purple-500" />
                        Topping & Printilan untuk Mode Ini
                      </h5>

                      <ToppingManager
                        mode={mode}
                        expandedTopping={expandedTopping}
                        onExpandedToppingChange={setExpandedTopping}
                        onUpdateTopping={updateTopping}
                        onToggleTopping={toggleTopping}
                        formatRp={formatRp}
                      />
                    </div>
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
