'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTodayWIB } from '@/lib/utils/timezone';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useAuth } from '@/lib/context/auth-context';
import { ExpenseChart } from '@/components/expenses/ExpenseChart';
import { AdvancedFilters, type FilterValues } from '@/components/expenses/AdvancedFilters';
import { ExportButton } from '@/components/expenses/ExportButton';
import type { ExpenseWithDetails, ExpenseCategory, ExpenseSummary } from '@/lib/types/expenses';

// Types
type ViewMode = 'daily' | 'monthly' | 'custom' | 'all';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// Helper functions for date calculations (inline to avoid import issues)
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
  borderColor: string;
}> = {
  operasional: { 
    emoji: '⚙️', 
    bg: 'bg-blue-50', 
    text: 'text-blue-700', 
    label: 'Operasional', 
    color: 'blue',
    borderColor: 'border-blue-200'
  },
  bahan_baku: { 
    emoji: '🧂', 
    bg: 'bg-amber-50', 
    text: 'text-amber-700', 
    label: 'Bahan Baku', 
    color: 'amber',
    borderColor: 'border-amber-200'
  },
  gaji: { 
    emoji: '👤', 
    bg: 'bg-green-50', 
    text: 'text-green-700', 
    label: 'Gaji', 
    color: 'green',
    borderColor: 'border-green-200'
  },
  transportasi: { 
    emoji: '🚗', 
    bg: 'bg-purple-50', 
    text: 'text-purple-700', 
    label: 'Transportasi', 
    color: 'purple',
    borderColor: 'border-purple-200'
  },
  perawatan: { 
    emoji: '🔧', 
    bg: 'bg-orange-50', 
    text: 'text-orange-700', 
    label: 'Perawatan', 
    color: 'orange',
    borderColor: 'border-orange-200'
  },
  marketing: { 
    emoji: '📢', 
    bg: 'bg-pink-50', 
    text: 'text-pink-700', 
    label: 'Marketing', 
    color: 'pink',
    borderColor: 'border-pink-200'
  },
  lainnya: { 
    emoji: '📌', 
    bg: 'bg-gray-50', 
    text: 'text-gray-600', 
    label: 'Lainnya', 
    color: 'gray',
    borderColor: 'border-gray-200'
  },
};

export default function ExpenseManagementAdvanced({ outletId }: { outletId?: string }) {
  const { user, isLoading: authLoading } = useAuth();
  
  // Use outletId from props if provided, otherwise fall back to user.outlet_id
  const activeOutletId = outletId || user?.outlet_id;
  
  // Data states
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // UI states
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [chartType, setChartType] = useState<'category' | 'trend'>('category');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // View mode states - initialize with empty strings to avoid hydration mismatch
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Filter states
  const [activeFilters, setActiveFilters] = useState<FilterValues>({
    search: '',
    categories: [],
    minAmount: '',
    maxAmount: '',
    datePreset: 'today',
    startDate: '',
    endDate: '',
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  
  // Form state
  const [form, setForm] = useState({
    keterangan: '',
    jumlah: '',
    kategori: 'operasional' as ExpenseCategory,
  });

  // Initialize dates on client side only (FIX HYDRATION ERROR)
  useEffect(() => {
    setSelectedDate(getTodayWIB());
    setStartDate(getStartOfMonth());
    setEndDate(getEndOfMonth());
    setMounted(true);
  }, []);

  // Fetch expenses when dependencies change
  useEffect(() => {
    if (activeOutletId && selectedDate && mounted) {
      fetchExpenses();
    }
  }, [activeOutletId, viewMode, selectedDate, startDate, endDate, currentPage, mounted]);

  // Build headers with auth info from current user (custom PIN auth flow).
  const buildAuthHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
    const headers: Record<string, string> = { ...extra };
    if (user?.id) headers['x-user-id'] = String(user.id);
    if (user?.role) headers['x-user-role'] = String(user.role);
    return headers;
  };

  const fetchExpenses = async () => {
    if (!activeOutletId || !selectedDate) return;
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      let queryParams = `outlet_id=${activeOutletId}&limit=${itemsPerPage}&offset=${(currentPage - 1) * itemsPerPage}`;
      
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
      console.log('Fetching expenses from:', apiUrl);
      
      const response = await fetch(apiUrl, { headers: buildAuthHeaders() });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: `HTTP ${response.status}: ${response.statusText}` } };
        }
        
        // Handle unauthorized - show error message instead of redirect
        if (response.status === 401) {
          console.warn('User not authenticated');
          throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
        }
        
        throw new Error(errorData.error?.message || `Failed to fetch expenses: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.success) {
        const expenseData = result.data.expenses || result.data;
        setExpenses(Array.isArray(expenseData) ? expenseData : []);
        setSummary(result.data.summary || null);
        setTotalItems(result.meta?.total || (Array.isArray(expenseData) ? expenseData.length : 0));
      } else {
        throw new Error(result.error?.message || 'Failed to fetch expenses');
      }
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setExpenses([]);
      setSummary(null);
      setErrorMessage(err.message || 'Gagal memuat data pengeluaran');
      
      // Debug info in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('Fetch error details:', {
          activeOutletId,
          viewMode,
          selectedDate,
          startDate,
          endDate,
          error: err.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keterangan || !form.jumlah || !activeOutletId) return;
    
    setSubmitting(true);
    
    try {
      let tanggal = selectedDate;
      if (viewMode === 'monthly' || viewMode === 'custom' || viewMode === 'all') {
        tanggal = getTodayWIB();
      }
      
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          outlet_id: activeOutletId,
          tanggal,
          kategori: form.kategori,
          keterangan: form.keterangan,
          jumlah: parseInt(form.jumlah.replace(/\D/g, '')),
        }),
      });
      
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create expense');
      }
      
      setForm({ keterangan: '', jumlah: '', kategori: 'operasional' });
      setShowForm(false);
      fetchExpenses();
    } catch (err: any) {
      console.error('Error creating expense:', err);
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pengeluaran ini?')) return;
    
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to delete expense');
      }
      
      fetchExpenses();
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      alert(`Gagal menghapus: ${err.message}`);
    }
  };

  const handleApplyFilters = (filters: FilterValues) => {
    setActiveFilters(filters);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setActiveFilters({
      search: '',
      categories: [],
      minAmount: '',
      maxAmount: '',
      datePreset: 'today',
      startDate: '',
      endDate: '',
    });
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
    
    // Search filter
    if (activeFilters.search) {
      const searchLower = activeFilters.search.toLowerCase();
      result = result.filter(exp => 
        exp.keterangan.toLowerCase().includes(searchLower)
      );
    }
    
    // Category filter
    if (activeFilters.categories.length > 0) {
      result = result.filter(exp => 
        activeFilters.categories.includes(exp.kategori)
      );
    }
    
    // Amount range filter
    if (activeFilters.minAmount) {
      const min = parseFloat(activeFilters.minAmount);
      result = result.filter(exp => Number(exp.jumlah) >= min);
    }
    if (activeFilters.maxAmount) {
      const max = parseFloat(activeFilters.maxAmount);
      result = result.filter(exp => Number(exp.jumlah) <= max);
    }
    
    // Sort by date (newest first)
    result.sort((a, b) => {
      const dateCompare = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
      if (dateCompare !== 0) return dateCompare;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    return result;
  }, [expenses, activeFilters]);

  // Category breakdown calculation
  const categoryBreakdown = useMemo(() => {
    if (!summary?.breakdown_by_kategori) return [];
    
    const total = summary.total_pengeluaran;
    return summary.breakdown_by_kategori.map(item => ({
      ...item,
      percentage: total > 0 ? (item.total / total) * 100 : 0,
      config: KATEGORI_CONFIG[item.kategori]
    })).sort((a, b) => b.total - a.total);
  }, [summary]);

  // Don't render until mounted (FIX HYDRATION ERROR)
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
      {/* Header - Professional & Clean */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Input Pengeluaran</h1>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Manajemen pengeluaran outlet real-time
                  </p>
                </div>
              </div>
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
              <ExportButton expenses={filteredExpenses} filename="pengeluaran-outlet-advanced" />
              <button
                onClick={() => setShowForm(!showForm)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2
                  ${showForm 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg'}`}
              >
                {showForm ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Batal
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Pengeluaran
                  </>
                )}
              </button>
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
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => fetchExpenses()}
                    className="text-sm font-medium text-red-600 hover:text-red-700 underline"
                  >
                    Coba Lagi
                  </button>
                  {errorMessage.includes('Sesi') && (
                    <button
                      onClick={() => window.location.href = '/login'}
                      className="text-sm font-medium text-red-600 hover:text-red-700 underline"
                    >
                      Login Ulang
                    </button>
                  )}
                </div>
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

        {/* View Mode Selector - Professional Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <h3 className="text-sm font-semibold text-gray-700">Periode Tampilan</h3>
          </div>
          <div className="p-6">
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              {(['daily', 'monthly', 'custom', 'all'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
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
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              )}
              
              {viewMode === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Bulan</label>
                  <input
                    type="month"
                    value={selectedDate.substring(0, 7)}
                    onChange={(e) => setSelectedDate(e.target.value + '-01')}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sampai Tanggal</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </>
              )}
              
              {viewMode === 'all' && (
                <div className="col-span-full">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-semibold text-blue-900">Mode History Lengkap</h4>
                      <p className="text-xs text-blue-700 mt-1">Menampilkan semua pengeluaran dengan pagination. Gunakan filter untuk pencarian spesifik.</p>
                    </div>
                  </div>
                </div>
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
              <h3 className="text-lg font-semibold text-gray-900">📊 Analytics & Visualisasi</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setChartType('category')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition
                    ${chartType === 'category' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Per Kategori
                </button>
                <button
                  onClick={() => setChartType('trend')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition
                    ${chartType === 'trend' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  Trend Waktu
                </button>
              </div>
            </div>
            <ExpenseChart expenses={filteredExpenses} type={chartType} />
          </div>
        )}

        {/* Professional Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Pengeluaran */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Pengeluaran</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(summary?.total_pengeluaran || 0)}</p>
              </div>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {viewMode === 'daily' && `${formatDateID(selectedDate)}`}
              {viewMode === 'monthly' && `Bulan ${selectedDate.substring(0, 7)}`}
              {viewMode === 'custom' && `${formatDateID(startDate)} - ${formatDateID(endDate)}`}
              {viewMode === 'all' && 'Semua periode'}
            </p>
          </div>

          {/* Jumlah Transaksi */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Jumlah Transaksi</p>
                <p className="text-2xl font-bold text-gray-900">{summary?.jumlah_item || 0}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {filteredExpenses.length !== (summary?.jumlah_item || 0) && 
                `${filteredExpenses.length} ditampilkan`}
            </p>
          </div>

          {/* Rata-rata */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Rata-rata</p>
                <p className="text-2xl font-bold text-gray-900">
                  {fmt(summary?.jumlah_item ? (summary.total_pengeluaran / summary.jumlah_item) : 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500">Per transaksi</p>
          </div>

          {/* Kategori Terbanyak */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Kategori Terbanyak</p>
                <p className="text-xl font-bold text-gray-900">
                  {summary?.breakdown_by_kategori?.[0]?.kategori 
                    ? KATEGORI_CONFIG[summary.breakdown_by_kategori[0].kategori].label
                    : '-'
                  }
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {summary?.breakdown_by_kategori?.[0] && 
                `${Math.round((summary.breakdown_by_kategori[0].total / summary.total_pengeluaran) * 100)}% dari total`}
            </p>
          </div>
        </div>

        {/* Category Breakdown - Professional Table Style */}
        {categoryBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-700">Breakdown per Kategori</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {categoryBreakdown.map((item) => (
                  <div key={item.kategori} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className={`w-12 h-12 rounded-lg ${item.config.bg} flex items-center justify-center flex-shrink-0 border ${item.config.borderColor}`}>
                      <span className="text-xl">{item.config.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900">{item.config.label}</span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900">{fmt(item.total)}</span>
                          <span className="text-xs text-gray-500 ml-2">({item.count}x)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`bg-${item.config.color}-500 h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${Math.min(item.percentage, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1.5">
                        {item.percentage.toFixed(1)}% dari total pengeluaran
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Professional Add Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 overflow-hidden">
            <div className="border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-white px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">Tambah Pengeluaran Baru</h3>
                <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                  Form Input
                </span>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Keterangan Pengeluaran <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.keterangan}
                    onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                    placeholder="Contoh: Pembelian bahan baku untuk produksi"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1.5">Deskripsikan pengeluaran dengan jelas dan detail</p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Jumlah (Rupiah) <span className="text-red-500">*</span>
                  </label>
                  <CurrencyInput
                    value={form.jumlah}
                    onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                    placeholder="50000"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder-gray-400"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1.5">Masukkan nominal dalam rupiah</p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Kategori Pengeluaran <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  {Object.entries(KATEGORI_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, kategori: key as ExpenseCategory })}
                      className={`p-4 rounded-lg border-2 transition-all
                        ${form.kategori === key
                          ? `${config.bg} ${config.borderColor} ${config.text} shadow-md`
                          : 'border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                      <div className="text-2xl mb-2">{config.emoji}</div>
                      <div className="text-xs font-semibold">{config.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2
                    ${submitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg'}`}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Simpan Pengeluaran
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
        {/* Professional Expense List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Riwayat Pengeluaran
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {totalItems} total transaksi • {filteredExpenses.length} ditampilkan
                  {viewMode === 'daily' && ` • ${formatDateID(selectedDate)}`}
                  {viewMode === 'monthly' && ` • Bulan ${selectedDate.substring(0, 7)}`}
                  {viewMode === 'custom' && ` • ${formatDateID(startDate)} - ${formatDateID(endDate)}`}
                </p>
              </div>
              {activeFilterCount > 0 && (
                <div className="flex items-center gap-2 text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {activeFilterCount} filter aktif
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-emerald-500 mb-4"></div>
              <p className="text-sm font-medium text-gray-700">Memuat data pengeluaran...</p>
              <p className="text-xs text-gray-500 mt-1">Mohon tunggu sebentar</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-900 mb-2">
                {activeFilterCount > 0 ? 'Tidak ada pengeluaran yang sesuai filter' : 'Belum ada pengeluaran'}
              </p>
              <p className="text-sm text-gray-500">
                {activeFilterCount > 0 
                  ? 'Coba ubah atau reset filter untuk melihat data lainnya' 
                  : 'Klik tombol "Tambah Pengeluaran" untuk mulai mencatat'}
              </p>
            </div>
          ) : (
            <>
              {/* Professional List Items */}
              <div className="divide-y divide-gray-200">
                {filteredExpenses.map((expense, index) => {
                  const config = KATEGORI_CONFIG[expense.kategori];
                  return (
                    <div key={expense.id} className="p-5 hover:bg-gray-50 transition-colors group">
                      <div className="flex items-start gap-4">
                        {/* Category Icon */}
                        <div className={`w-12 h-12 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 border ${config.borderColor}`}>
                          <span className="text-xl">{config.emoji}</span>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 mb-2">{expense.keterangan}</h4>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md ${config.bg} ${config.text} font-medium`}>
                                  {config.label}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  {formatDateID(expense.tanggal)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {new Date(expense.created_at).toLocaleTimeString('id-ID', { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    timeZone: 'Asia/Jakarta'
                                  })} WIB
                                </span>
                                {expense.created_by_user && (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {expense.created_by_user.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Amount & Actions */}
                            <div className="flex items-start gap-3 flex-shrink-0">
                              <div className="text-right">
                                <span className="text-lg font-bold text-gray-900">
                                  {fmt(Number(expense.jumlah))}
                                </span>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  #{(currentPage - 1) * itemsPerPage + index + 1}
                                </div>
                              </div>
                              <button
                                onClick={() => handleDelete(expense.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Hapus pengeluaran"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Professional Pagination */}
              {totalItems > itemsPerPage && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-gray-600">
                        Menampilkan <span className="font-semibold text-gray-900">{((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="font-semibold text-gray-900">{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari <span className="font-semibold text-gray-900">{totalItems}</span>
                      </p>
                      <div className="text-xs text-gray-500 bg-white px-2.5 py-1 rounded-md border border-gray-200">
                        Hal {currentPage} dari {Math.ceil(totalItems / itemsPerPage)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 bg-white"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Sebelumnya
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, Math.ceil(totalItems / itemsPerPage)) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-9 h-9 text-sm font-medium rounded-lg transition-all
                                ${currentPage === pageNum 
                                  ? 'bg-emerald-500 text-white shadow-sm' 
                                  : 'hover:bg-white border border-gray-300 text-gray-700 bg-white'}`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 bg-white"
                      >
                        Selanjutnya
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}