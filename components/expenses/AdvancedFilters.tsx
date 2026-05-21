'use client';

import { useState } from 'react';
import type { ExpenseCategory } from '@/lib/types/expenses';

interface AdvancedFiltersProps {
  onApply: (filters: FilterValues) => void;
  onReset: () => void;
}

export interface FilterValues {
  search: string;
  categories: ExpenseCategory[];
  minAmount: string;
  maxAmount: string;
  datePreset: string;
  startDate: string;
  endDate: string;
}

const KATEGORI_OPTIONS: { value: ExpenseCategory; label: string; emoji: string }[] = [
  { value: 'operasional', label: 'Operasional', emoji: '⚙️' },
  { value: 'bahan_baku', label: 'Bahan Baku', emoji: '🧂' },
  { value: 'gaji', label: 'Gaji', emoji: '👤' },
  { value: 'transportasi', label: 'Transportasi', emoji: '🚗' },
  { value: 'perawatan', label: 'Perawatan', emoji: '🔧' },
  { value: 'marketing', label: 'Marketing', emoji: '📢' },
  { value: 'lainnya', label: 'Lainnya', emoji: '📌' },
];

const DATE_PRESETS = [
  { value: 'today', label: 'Hari Ini' },
  { value: 'yesterday', label: 'Kemarin' },
  { value: 'last7days', label: '7 Hari Terakhir' },
  { value: 'last30days', label: '30 Hari Terakhir' },
  { value: 'thisMonth', label: 'Bulan Ini' },
  { value: 'lastMonth', label: 'Bulan Lalu' },
  { value: 'custom', label: 'Custom' },
];

export function AdvancedFilters({ onApply, onReset }: AdvancedFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({
    search: '',
    categories: [],
    minAmount: '',
    maxAmount: '',
    datePreset: 'today',
    startDate: '',
    endDate: '',
  });

  const toggleCategory = (category: ExpenseCategory) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleApply = () => {
    onApply(filters);
  };

  const handleReset = () => {
    setFilters({
      search: '',
      categories: [],
      minAmount: '',
      maxAmount: '',
      datePreset: 'today',
      startDate: '',
      endDate: '',
    });
    onReset();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">🔍 Filter Lanjutan</h3>
        <button
          onClick={handleReset}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Reset Semua
        </button>
      </div>

      {/* Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cari Keterangan
        </label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          placeholder="Cari berdasarkan keterangan..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Kategori ({filters.categories.length} dipilih)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {KATEGORI_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleCategory(option.value)}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all
                ${filters.categories.includes(option.value)
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
            >
              <div className="text-lg mb-1">{option.emoji}</div>
              <div className="text-xs">{option.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Amount Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jumlah Min (Rp)
          </label>
          <input
            type="number"
            value={filters.minAmount}
            onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
            placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jumlah Max (Rp)
          </label>
          <input
            type="number"
            value={filters.maxAmount}
            onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
            placeholder="Tidak terbatas"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Date Preset */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Periode Tanggal
        </label>
        <select
          value={filters.datePreset}
          onChange={(e) => setFilters({ ...filters, datePreset: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {DATE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom Date Range */}
      {filters.datePreset === 'custom' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={handleReset}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600"
        >
          Terapkan Filter
        </button>
      </div>
    </div>
  );
}
