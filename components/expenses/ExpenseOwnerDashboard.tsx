'use client';

/**
 * Owner Dashboard - Expense Analytics & Reporting
 * 
 * Complete expense analysis for business owners:
 * - Advanced filtering & date range selection
 * - Charts & visualizations
 * - Multi-outlet comparison
 * - Category breakdown
 * - Trends & analytics
 * - Export capabilities
 */

import { useState, useEffect, useMemo } from 'react';
import { getTodayWIB } from '@/lib/utils/timezone';
import { ExpenseChart } from '@/components/expenses/ExpenseChart';
import { AdvancedFilters, type FilterValues } from '@/components/expenses/AdvancedFilters';
import { ExportButton } from '@/components/expenses/ExportButton';
import type { ExpenseWithDetails, ExpenseCategory, ExpenseSummary } from '@/lib/types/expenses';

type ViewMode = 'daily' | 'monthly' | 'custom' | 'all';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const getStartOfMonth = (date?: string): string => {
  const d = date ? new Date(date) : new Date();
  const wibDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const year = wibDate.getFullYear();
  const month = String(wibDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
};

const getEndOfMonth = (date?: string): string => {
  const d = date ? new Date(date) : new Date();
  const wibDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const year = wibDate.getFullYear();
  const month = wibDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(lastDay).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
};

const formatDateID = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
};

const KATEGORI_CONFIG: Record<ExpenseCategory, { 
  emoji: string; 
  bg: string; 
  text: string; 
  label: string; 
  color: string;
}> = {
  operasional: { emoji: '⚙️', bg: 'bg-blue-50', text: 'text-blue-700', label: 'Operasional', color: 'blue' },
  bahan_baku: { emoji: '🧂', bg: 'bg-amber-50', text: 'text-amber-700', label: 'Bahan Baku', color: 'amber' },
  gaji: { emoji: '👤', bg: 'bg-green-50', text: 'text-green-700', label: 'Gaji', color: 'green' },
  transportasi: { emoji: '🚗', bg: 'bg-purple-50', text: 'text-purple-700', label: 'Transportasi', color: 'purple' },
  perawatan: { emoji: '🔧', bg: 'bg-orange-50', text: 'text-orange-700', label: 'Perawatan', color: 'orange' },
  marketing: { emoji: '📢', bg: 'bg-pink-50', text: 'text-pink-700', label: 'Marketing', color: 'pink' },
  lainnya: { emoji: '📌', bg: 'bg-gray-50', text: 'text-gray-600', label: 'Lainnya', color: 'gray' },
};

interface ExpenseOwnerDashboardProps {
  outletIds?: string[];
}

export default function ExpenseOwnerDashboard({ outletIds = [] }: ExpenseOwnerDashboardProps) {
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCharts, setShowCharts] = useState(true);
  const [chartType, setChartType] = useState<'category' | 'trend'>('category');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);

  const [activeFilters, setActiveFilters] = useState<FilterValues>({
    search: '',
    categories: [],
    minAmount: '',
    maxAmount: '',
    datePreset: 'month',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    setSelectedDate(getTodayWIB());
    setStartDate(getStartOfMonth());
    setEndDate(getEndOfMonth());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedDate && mounted) {
      fetchExpenses();
    }
  }, [viewMode, selectedDate, startDate, endDate, currentPage, mounted]);

  const buildAuthHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
    const headers: Record<string, string> = { ...extra };
    try {
      const stored = typeof window !== 'undefined'
        ? localStorage.getItem('donutshop_user')
        : null;
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.id) headers['x-user-id'] = String(u.id);
        if (u?.role) headers['x-user-role'] = String(u.role);
        if (u?.outlet_id) headers['x-outlet-id'] = String(u.outlet_id);
      }
    } catch {
      // ignore
    }
    return headers;
  };

  const fetchExpenses = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      let queryParams = `limit=${itemsPerPage}&offset=${(currentPage - 1) * itemsPerPage}`;
      
      // If outletIds specified, filter by those outlets
      if (outletIds.length > 0) {
        queryParams += `&outlet_ids=${outletIds.join(',')}`;
      }
      
      if (viewMode === 'daily') {
        queryParams += `&tanggal=${selectedDate}`;
      } else if (viewMode === 'monthly') {
        const monthStart = getStartOfMonth(selectedDate);
        const monthEnd = getEndOfMonth(selectedDate);
        queryParams += `&start_date=${monthStart}&end_date=${monthEnd}`;
      } else if (viewMode === 'custom') {
        queryParams += `&start_date=${startDate}&end_date=${endDate}`;
      }
      
      const apiUrl = `/api/expenses?${queryParams}&summary=category`;
      const response = await fetch(apiUrl, { headers: buildAuthHeaders() });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: `HTTP ${response.status}` } };
        }
        throw new Error(errorData.error?.message || 'Failed to fetch expenses');
      }
      
      const result = await response.json();
      if (result.success) {
        const expenseData = result.data.expenses || result.data;
        setExpenses(Array.isArray(expenseData) ? expenseData : []);
        setSummary(result.data.summary || null);
        setTotalItems(result.meta?.total || 0);
      } else {
        throw new Error(result.error?.message || 'Failed to fetch expenses');
      }
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setExpenses([]);
      setSummary(null);
      setErrorMessage(err.message || 'Gagal memuat data pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = (filters: FilterValues) => {
    setActiveFilters(filters);
    setShowFilters(false);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setActiveFilters({
      search: '',
      categories: [],
      minAmount: '',
      maxAmount: '',
      datePreset: 'month',
      startDate: '',
      endDate: '',
    });
    setCurrentPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.search) count++;
    if (activeFilters.categories.length > 0) count++;
    if (activeFilters.minAmount || activeFilters.maxAmount) count++;
    return count;
  }, [activeFilters]);

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    
    if (activeFilters.search) {
      const searchLower = activeFilters.search.toLowerCase();
      result = result.filter(exp => 
        exp.keterangan.toLowerCase().includes(searchLower)
      );
    }
    
    if (activeFilters.categories.length > 0) {
      result = result.filter(exp => 
        activeFilters.categories.includes(exp.kategori)
      );
    }
    
    if (activeFilters.minAmount) {
      const min = parseFloat(activeFilters.minAmount);
      result = result.filter(exp => Number(exp.jumlah) >= min);
    }
    if (activeFilters.maxAmount) {
      const max = parseFloat(activeFilters.maxAmount);
      result = result.filter(exp => Number(exp.jumlah) <= max);
    }
    
    result.sort((a, b) => {
      const dateCompare = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return result;
  }, [expenses, activeFilters]);

  const categoryBreakdown = useMemo(() => {
    if (!summary?.breakdown_by_kategori) return [];
    
    const total = summary.total_pengeluaran;
    return summary.breakdown_by_kategori
      .map(item => ({
        ...item,
        percentage: total > 0 ? (item.total / total) * 100 : 0,
        config: KATEGORI_CONFIG[item.kategori]
      }))
      .sort((a, b) => b.total - a.total);
  }, [summary]);

  if (!mounted || !selectedDate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-emerald-500 mb-4"></div>
          <p className="text-sm text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Analisis Pengeluaran</h1>
              <p className="text-xs text-gray-500 mt-0.5">Dashboard pengeluaran komprehensif untuk pengelola</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCharts(!showCharts)}
                className={`px-4 py-2.5 border rounded-lg text-sm font-medium transition-all flex items-center gap-2
                  ${showCharts 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2.5 border rounded-lg text-sm font-medium transition-all flex items-center gap-2 relative
                  ${showFilters 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filter
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <ExportButton expenses={filteredExpenses} filename="analisis-pengeluaran" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 mb-1">Gagal Memuat Data</h3>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="p-1 hover:bg-red-100 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* View Mode Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h3 className="text-sm font-semibold text-gray-700">Periode Tampilan</h3>
          </div>
          <div className="p-6">
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              {(['daily', 'monthly', 'custom', 'all'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setViewMode(mode);
                    setCurrentPage(1);
                  }}
                  className={`px-6 py-3 text-sm font-medium transition-all relative
                    ${viewMode === mode 
                      ? 'text-emerald-600 border-b-2 border-emerald-600' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
                >
                  {mode === 'daily' && 'Harian'}
                  {mode === 'monthly' && 'Bulanan'}
                  {mode === 'custom' && 'Custom Range'}
                  {mode === 'all' && 'Semua History'}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {viewMode === 'daily' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Tanggal</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
              
              {viewMode === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Bulan</label>
                  <input
                    type="month"
                    value={selectedDate.substring(0, 7)}
                    onChange={(e) => {
                      setSelectedDate(e.target.value + '-01');
                      setCurrentPage(1);
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
              
              {viewMode === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dari Tanggal</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <AdvancedFilters
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
          />
        )}

        {/* Charts Section */}
        {showCharts && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">📊 Visualisasi & Analisis</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType('category')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition
                    ${chartType === 'category' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Per Kategori
                </button>
                <button
                  onClick={() => setChartType('trend')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition
                    ${chartType === 'trend' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Trend Waktu
                </button>
              </div>
            </div>
            <ExpenseChart expenses={filteredExpenses} type={chartType} />
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Total Pengeluaran</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(summary?.total_pengeluaran || 0)}</p>
            <p className="text-xs text-gray-500 mt-2">{summary?.jumlah_item || 0} transaksi</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Rata-rata Per Transaksi</p>
            <p className="text-2xl font-bold text-gray-900">
              {fmt(summary?.jumlah_item ? (summary.total_pengeluaran / summary.jumlah_item) : 0)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Kategori Terbesar</p>
            {categoryBreakdown[0] ? (
              <>
                <p className="text-2xl font-bold text-gray-900">{fmt(categoryBreakdown[0].total)}</p>
                <p className="text-xs text-gray-500 mt-2">{categoryBreakdown[0].config.label} ({categoryBreakdown[0].percentage.toFixed(0)}%)</p>
              </>
            ) : (
              <p className="text-gray-400">-</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Pengeluaran Terbesar</p>
            {filteredExpenses.length > 0 ? (
              <>
                <p className="text-2xl font-bold text-gray-900">{fmt(Math.max(...filteredExpenses.map(e => Number(e.jumlah))))}</p>
                <p className="text-xs text-gray-500 mt-2">Transaksi individual</p>
              </>
            ) : (
              <p className="text-gray-400">-</p>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Breakdown Kategori</h3>
          <div className="space-y-3">
            {categoryBreakdown.map((item) => (
              <div key={item.kategori} className="flex items-center gap-4">
                <div className="flex items-center gap-2 w-24">
                  <span className="text-2xl">{item.config.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{item.config.label}</span>
                </div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-full rounded-full transition-all bg-${item.config.color}-500`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-right w-32">
                  <p className="text-sm font-semibold text-gray-900">{fmt(item.total)}</p>
                  <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Expense List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Daftar Pengeluaran</h3>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-emerald-500 mb-3"></div>
              <p className="text-sm text-gray-500">Memuat data...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">Tidak ada data pengeluaran</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Tanggal</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Kategori</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Keterangan</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Jumlah</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Kasir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredExpenses.map((expense) => {
                    const config = KATEGORI_CONFIG[expense.kategori];
                    return (
                      <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-sm text-gray-600">{formatDateID(expense.tanggal)}</td>
                        <td className="px-6 py-3 text-sm">
                          <span className={`${config.bg} ${config.text} px-2 py-1 rounded text-xs font-medium`}>
                            {config.emoji} {config.label}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-900">{expense.keterangan}</td>
                        <td className="px-6 py-3 text-sm font-semibold text-gray-900">{fmt(expense.jumlah)}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{expense.user_name || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
