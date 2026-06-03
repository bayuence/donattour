'use client';

/**
 * Simple Expense Input Component for Cashiers
 * 
 * Simplified UI focused on:
 * - Quick expense input form
 * - History/list of user's own expenses
 * 
 * No analytics, charts, or advanced filtering
 */

import { useState, useEffect } from 'react';
import { getTodayWIB } from '@/lib/utils/timezone';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { ExpenseWithDetails, ExpenseCategory } from '@/lib/types/expenses';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const KATEGORI_CONFIG: Record<ExpenseCategory, { 
  emoji: string; 
  label: string; 
  color: string;
}> = {
  operasional: { emoji: '⚙️', label: 'Operasional', color: 'blue' },
  bahan_baku: { emoji: '🧂', label: 'Bahan Baku', color: 'amber' },
  gaji: { emoji: '👤', label: 'Gaji', color: 'green' },
  transportasi: { emoji: '🚗', label: 'Transportasi', color: 'purple' },
  perawatan: { emoji: '🔧', label: 'Perawatan', color: 'orange' },
  marketing: { emoji: '📢', label: 'Marketing', color: 'pink' },
  lainnya: { emoji: '📌', label: 'Lainnya', color: 'gray' },
};

interface ExpenseInputSimpleProps {
  outletId: string;
}

export default function ExpenseInputSimple({ outletId }: ExpenseInputSimpleProps) {
  const [expenses, setExpenses] = useState<ExpenseWithDetails[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  const [form, setForm] = useState({
    keterangan: '',
    jumlah: '',
    kategori: 'operasional' as ExpenseCategory,
  });

  useEffect(() => {
    setSelectedDate(getTodayWIB());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (outletId && selectedDate && mounted) {
      fetchExpenses();
    }
  }, [outletId, selectedDate, mounted]);

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
    if (!outletId || !selectedDate) return;
    
    setLoading(true);
    setErrorMessage(null);
    
    try {
      const response = await fetch(
        `/api/expenses?outlet_id=${outletId}&tanggal=${selectedDate}&limit=100`,
        { headers: buildAuthHeaders() }
      );
      
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
      } else {
        throw new Error(result.error?.message || 'Failed to fetch expenses');
      }
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setErrorMessage(err.message || 'Gagal memuat data pengeluaran');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keterangan || !form.jumlah || !outletId) return;
    
    setSubmitting(true);
    
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          outlet_id: outletId,
          tanggal: selectedDate,
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

  const totalExpense = expenses.reduce((sum, exp) => sum + Number(exp.jumlah), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">Input Pengeluaran</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">Catat pengeluaran Anda hari ini</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap flex-shrink-0
                ${showForm 
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                  : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg'}`}
            >
              {showForm ? (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden sm:inline">Batal</span>
                  <span className="sm:hidden">Batal</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Input Pengeluaran</span>
                  <span className="sm:hidden">Input</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
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

        {/* Input Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-4">Tambah Pengeluaran Baru</h2>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Kategori */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Kategori</label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value as ExpenseCategory })}
                    className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(KATEGORI_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.emoji} {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Jumlah */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Jumlah</label>
                  <input
                    type="text"
                    placeholder="0"
                    value={form.jumlah}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setForm({ ...form, jumlah: val });
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Keterangan</label>
                <input
                  type="text"
                  placeholder="Deskripsi pengeluaran..."
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2 flex-col sm:flex-row">
                <button
                  type="submit"
                  disabled={!form.keterangan || !form.jumlah || submitting}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 sm:py-2.5 rounded-lg transition-colors text-sm"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm({ keterangan: '', jumlah: '', kategori: 'operasional' });
                  }}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Summary Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-lg p-4 sm:p-5 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-emerald-700">Total Pengeluaran Hari Ini</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-900 mt-1">{fmt(totalExpense)}</p>
              <p className="text-xs text-emerald-600 mt-1 sm:mt-2">{expenses.length} transaksi</p>
            </div>
            <div className="w-12 h-12 bg-emerald-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Expense List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-3 sm:px-6 py-2.5 sm:py-3">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Riwayat Pengeluaran</h3>
          </div>
          
          {loading ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-emerald-500 mb-3"></div>
              <p className="text-xs sm:text-sm text-gray-500">Memuat riwayat...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="p-6 sm:p-8 text-center">
              <svg className="w-10 sm:w-12 h-10 sm:h-12 text-gray-300 mx-auto mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-xs sm:text-sm text-gray-500">Belum ada pengeluaran hari ini</p>
              <p className="text-xs text-gray-400 mt-1">Mulai dengan klik tombol "Input Pengeluaran"</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {expenses.map((expense) => {
                const config = KATEGORI_CONFIG[expense.kategori];
                return (
                  <div key={expense.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:w-auto">
                        <div className="text-lg sm:text-2xl mt-0.5 flex-shrink-0">{config.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900">{config.label}</h4>
                            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap">
                              {new Date(expense.created_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              })}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 truncate">{expense.keterangan}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <p className="text-xs sm:text-sm font-semibold text-gray-900">{fmt(expense.jumlah)}</p>
                        </div>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 hover:text-red-700 flex-shrink-0"
                          title="Hapus pengeluaran ini"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
