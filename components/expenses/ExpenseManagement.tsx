'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTodayWIB, getStartOfMonth, getEndOfMonth, formatDateID } from '@/lib/utils/timezone';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useAuth } from '@/lib/context/auth-context';
import type { ExpenseWithDetails, ExpenseCategory, ExpenseSummary } from '@/lib/types/expenses';

// Types
type ViewMode = 'daily' | 'monthly' | 'custom' | 'all';
type SortBy = 'date' | 'amount' | 'category' | 'keterangan';

interface ExpenseFilters {
  kategori: ExpenseCategory | 'all';
  search: string;
  sortBy: SortBy;
  sortOrder: 'asc' | 'desc';
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

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

export default function ExpenseManagement() {
  const { user } = useAuth();
  
  // Data states
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  
  // UI states
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // View mode states - initialize with empty strings to avoid hydration mismatch
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [selectedDate, setSelectedDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState<ExpenseFilters>({
    kategori: 'all',
    search: '',
    sortBy: 'date',
    sortOrder: 'desc',
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

  // Initialize dates on client side only
  useEffect(() => {
    setSelectedDate(getTodayWIB());
    setStartDate(getStartOfMonth());
    setEndDate(getEndOfMonth());
  }, []);

  // Fetch expenses when dependencies change
  useEffect(() => {
    if (user?.outlet_id && selectedDate) {
      fetchExpenses();
    }
  }, [user?.outlet_id, viewMode, selectedDate, startDate, endDate, currentPage]);

  const fetchExpenses = async () => {
    if (!user?.outlet_id || !selectedDate) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let queryParams = `outlet_id=${user.outlet_id}&limit=${itemsPerPage}&offset=${(currentPage - 1) * itemsPerPage}`;
      
      if (viewMode === 'daily') {
        queryParams += `&tanggal=${selectedDate}`;
      } else if (viewMode === 'monthly') {
        const monthStart = getStartOfMonth(selectedDate);
        const monthEnd = getEndOfMonth(selectedDate);
        queryParams += `&start_date=${monthStart}&end_date=${monthEnd}`;
      } else if (viewMode === 'custom') {
        queryParams += `&start_date=${startDate}&end_date=${endDate}`;
      }
      
      if (filters.kategori !== 'all') {
        queryParams += `&kategori=${filters.kategori}`;
      }
      
      const response = await fetch(`/api/expenses?${queryParams}&summary=category`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch expenses');
      }
      
      const result = await response.json();
      
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
      setError(err.message);
      setExpenses([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keterangan || !form.jumlah || !user?.outlet_id) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      let tanggal = selectedDate;
      if (viewMode === 'monthly' || viewMode === 'custom' || viewMode === 'all') {
        tanggal = getTodayWIB();
      }
      
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: user.outlet_id,
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
      setError(err.message);
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

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(exp => 
        exp.keterangan.toLowerCase().includes(searchLower)
      );
    }
    
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'date':
          comparison = new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
          break;
        case 'amount':
          comparison = Number(a.jumlah) - Number(b.jumlah);
          break;
        case 'category':
          comparison = a.kategori.localeCompare(b.kategori);
          break;
        case 'keterangan':
          comparison = a.keterangan.localeCompare(b.keterangan);
          break;
      }
      
      return filters.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [expenses, filters]);

  // Don't render until dates are initialized
  if (!selectedDate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500 mb-4"></div>
          <p className="text-sm text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                💸 Pengeluaran Outlet
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Kelola dan monitor pengeluaran outlet secara real-time
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                🔍 Filter
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition
                  ${showForm ? 'bg-gray-100 text-gray-700' : 'bg-red-500 text-white hover:bg-red-600'}`}
              >
                {showForm ? '✕ Batal' : '+ Tambah'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* View Mode Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium text-gray-700">Tampilan:</span>
            <div className="flex gap-2 flex-wrap">
              {(['daily', 'monthly', 'custom', 'all'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition
                    ${viewMode === mode ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {mode === 'daily' && '📅 Harian'}
                  {mode === 'monthly' && '📊 Bulanan'}
                  {mode === 'custom' && '🗓️ Custom'}
                  {mode === 'all' && '📋 Semua'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {viewMode === 'daily' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            {viewMode === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bulan</label>
                <input
                  type="month"
                  value={selectedDate.substring(0, 7)}
                  onChange={(e) => setSelectedDate(e.target.value + '-01')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-90">Total Pengeluaran</span>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold">{fmt(summary?.total_pengeluaran || 0)}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-90">Jumlah Transaksi</span>
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-3xl font-bold">{summary?.jumlah_item || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-90">Rata-rata</span>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-3xl font-bold">
              {fmt(summary?.jumlah_item ? (summary.total_pengeluaran / summary.jumlah_item) : 0)}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium opacity-90">Kategori Terbanyak</span>
              <span className="text-2xl">🏆</span>
            </div>
            <p className="text-2xl font-bold">
              {summary?.breakdown_by_kategori?.[0]?.kategori 
                ? KATEGORI_CONFIG[summary.breakdown_by_kategori[0].kategori].label
                : '-'
              }
            </p>
          </div>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg border p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Tambah Pengeluaran Baru</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Keterangan *</label>
                  <input
                    type="text"
                    value={form.keterangan}
                    onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                    placeholder="Contoh: Beli minyak goreng 5L"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Jumlah (Rp) *</label>
                  <CurrencyInput
                    value={form.jumlah}
                    onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                    placeholder="50000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Kategori *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(KATEGORI_CONFIG).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, kategori: key as ExpenseCategory })}
                      className={`p-4 rounded-lg border-2 transition-all
                        ${form.kategori === key
                          ? `${config.bg} ${config.borderColor} ${config.text} shadow-md`
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                    >
                      <div className="text-2xl mb-1">{config.emoji}</div>
                      <div className="text-xs font-semibold">{config.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 px-4 py-3 rounded-lg text-sm font-semibold text-white
                    ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
                >
                  {submitting ? 'Menyimpan...' : '💾 Simpan'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Expense List */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">
              Riwayat Pengeluaran
              <span className="ml-2 text-sm font-normal text-gray-500">({totalItems} total)</span>
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500 mb-4"></div>
              <p className="text-sm text-gray-500">Memuat data...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-lg font-medium text-gray-900 mb-2">Belum ada pengeluaran</p>
            </div>
          ) : (
            <>
              <div className="divide-y">
                {filteredExpenses.map((expense) => {
                  const config = KATEGORI_CONFIG[expense.kategori];
                  return (
                    <div key={expense.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start gap-4">
                        <div className={`w-14 h-14 rounded-xl ${config.bg} flex items-center justify-center text-2xl flex-shrink-0`}>
                          {config.emoji}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-1">
                            <h4 className="text-base font-semibold text-gray-900">{expense.keterangan}</h4>
                            <span className="text-lg font-bold text-red-600 whitespace-nowrap">
                              {fmt(Number(expense.jumlah))}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${config.bg} ${config.text} font-medium`}>
                              {config.emoji} {config.label}
                            </span>
                            <span>📅 {formatDateID(expense.tanggal)}</span>
                            <span>
                              🕐 {new Date(expense.created_at).toLocaleTimeString('id-ID', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                timeZone: 'Asia/Jakarta'
                              })}
                            </span>
                            {expense.created_by_user && (
                              <span>👤 {expense.created_by_user.name}</span>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          title="Hapus"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalItems > itemsPerPage && (
                <div className="p-4 border-t flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} dari {totalItems}
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Sebelumnya
                    </button>
                    <span className="px-3 py-1.5 text-sm">
                      Hal {currentPage} dari {Math.ceil(totalItems / itemsPerPage)}
                    </span>
                    <button
                      disabled={currentPage >= Math.ceil(totalItems / itemsPerPage)}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Selanjutnya →
                    </button>
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
