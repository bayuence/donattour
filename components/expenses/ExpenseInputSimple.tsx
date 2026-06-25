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
import { uploadExpenseFile } from '@/lib/db/storage';
import { toast } from 'sonner';
const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

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

  const [buktiUrl, setBuktiUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);
  const [confirmDeleteExpense, setConfirmDeleteExpense] = useState<ExpenseWithDetails | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBuktiUrl(null);
    setErrorMessage(null);

    // Validasi tipe file: Hanya memperbolehkan format gambar (PNG, JPG, WEBP, dll)
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Format berkas tidak didukung! Anda hanya diperbolehkan mengunggah file foto/gambar (PNG, JPG, JPEG, WEBP) sebagai bukti pengeluaran.');
      e.target.value = '';
      return;
    }

    setUploadingFile(true);
    try {
      const url = await uploadExpenseFile(file);
      if (url) {
        setBuktiUrl(url);
      } else {
        throw new Error('Gagal mengunggah file bukti.');
      }
    } catch (err: any) {
      console.error('Error uploading file:', err);
      setErrorMessage(err.message || 'Gagal mengunggah bukti pengeluaran. Silakan coba lagi.');
      e.target.value = '';
    } finally {
      setUploadingFile(false);
    }
  };

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
      if (typeof window !== 'undefined') {
        const keys = ['donutshop_user', 'kasir_user', 'current_user'];
        for (const key of keys) {
          const stored = localStorage.getItem(key);
          if (stored) {
            const u = JSON.parse(stored);
            if (u?.id) {
              headers['x-user-id'] = String(u.id);
              if (u?.role) headers['x-user-role'] = String(u.role);
              if (u?.outlet_id) headers['x-outlet-id'] = String(u.outlet_id);
              break;
            }
          }
        }
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
        `/api/expenses?outlet_id=${outletId}&tanggal=${selectedDate}&limit=100&_t=${Date.now()}`,
        { 
          headers: buildAuthHeaders(),
          cache: 'no-store'
        }
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
    if (!form.keterangan || !form.jumlah || !outletId || uploadingFile) return;
    
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
          bukti_url: buktiUrl,
        }),
      });
      
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to create expense');
      }
      
      setForm({ keterangan: '', jumlah: '', kategori: 'operasional' });
      setBuktiUrl(null);
      setShowForm(false);
      fetchExpenses();
    } catch (err: any) {
      console.error('Error creating expense:', err);
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteExpense) return;
    const id = confirmDeleteExpense.id;
    setDeletingId(id);
    
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(),
      });
      
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to delete expense');
      }
      
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
      toast.success('Pengeluaran berhasil dihapus');
      setConfirmDeleteExpense(null);
    } catch (err: any) {
      console.error('Error deleting expense:', err);
      toast.error(`Gagal menghapus: ${err.message}`);
    } finally {
      setDeletingId(null);
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
                {/* Bukti Pengeluaran */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    Foto Bukti Pengeluaran
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full border border-gray-300 bg-white rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 file:mr-2 sm:file:mr-4 file:py-1 file:px-2 sm:file:px-3 file:rounded-md file:border-0 file:text-[10px] sm:file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                  {uploadingFile && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-blue-600">
                      <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Mengompresi dan mengunggah berkas...</span>
                    </div>
                  )}
                  {buktiUrl && (
                    <p className="text-xs text-emerald-600 mt-1.5 font-semibold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Bukti berhasil diunggah
                    </p>
                  )}
                </div>

                {/* Jumlah */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Jumlah</label>
                  <CurrencyInput
                    placeholder="0"
                    value={form.jumlah}
                    onChange={(e) => {
                      setForm({ ...form, jumlah: e.target.value });
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
                  disabled={!form.keterangan || !form.jumlah || submitting || uploadingFile}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2 sm:py-2.5 rounded-lg transition-colors text-sm"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan Pengeluaran'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm({ keterangan: '', jumlah: '', kategori: 'operasional' });
                    setBuktiUrl(null);
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
                const receiptUrl = expense.receipt_url || expense.bukti_url;
                return (
                  <div key={expense.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:w-auto">
                        {receiptUrl ? (
                          <div 
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50 flex items-center justify-center cursor-pointer hover:opacity-85 transition-opacity shadow-sm"
                            onClick={() => setActivePreviewUrl(receiptUrl)}
                            title="Klik untuk memperbesar gambar"
                          >
                            <img src={receiptUrl} alt="Bukti Pengeluaran" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center text-lg sm:text-xl font-bold text-gray-500 border border-gray-200 shadow-sm select-none">
                            🧾
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-xs">
                              {expense.keterangan}
                            </h4>
                            <span className="text-xs text-gray-500 bg-gray-100 px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap">
                              {new Date(expense.created_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              })}
                            </span>
                            {receiptUrl && (
                              <button
                                onClick={() => setActivePreviewUrl(receiptUrl)}
                                className="text-[10px] sm:text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded font-semibold flex items-center gap-1 transition-colors border border-emerald-100"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Lihat Bukti
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <p className="text-xs sm:text-sm font-semibold text-gray-900">{fmt(expense.jumlah)}</p>
                        </div>
                        <button
                          onClick={() => setConfirmDeleteExpense(expense)}
                          disabled={deletingId === expense.id}
                          className="p-1.5 sm:p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600 hover:text-red-700 flex-shrink-0 disabled:opacity-50"
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
      {/* Image Preview Modal */}
      {activePreviewUrl && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setActivePreviewUrl(null)}
        >
          <div 
            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden p-3 animate-in zoom-in-95 duration-200 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-3">
              <h3 className="text-sm font-bold text-gray-900">Bukti Pengeluaran</h3>
              <button 
                onClick={() => setActivePreviewUrl(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Image Container */}
            <div className="bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center min-h-[250px] max-h-[60vh]">
              <img 
                src={activePreviewUrl} 
                alt="Bukti Pengeluaran" 
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>
            
            {/* Actions */}
            <div className="mt-3 flex justify-between items-center text-xs">
              <a 
                href={activePreviewUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1 hover:underline"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Buka di tab baru
              </a>
              <button 
                onClick={() => setActivePreviewUrl(null)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteExpense && (
        <DeleteExpenseConfirmModal
          isOpen={!!confirmDeleteExpense}
          onClose={() => setConfirmDeleteExpense(null)}
          onConfirm={handleDeleteConfirm}
          keterangan={confirmDeleteExpense.keterangan}
          jumlah={Number(confirmDeleteExpense.jumlah)}
          loading={deletingId === confirmDeleteExpense.id}
        />
      )}
    </div>
  );
}

interface DeleteExpenseConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  keterangan: string;
  jumlah: number;
  loading: boolean;
}

function DeleteExpenseConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  keterangan,
  jumlah,
  loading
}: DeleteExpenseConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Hapus Pengeluaran</h3>
              <p className="text-red-100 text-sm">Hapus catatan pengeluaran ini</p>
            </div>
          </div>
        </div>
        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            Yakin ingin menghapus catatan pengeluaran ini?
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between">
              <span>Keterangan:</span>
              <span className="font-bold text-slate-800 truncate max-w-[150px]">{keterangan}</span>
            </div>
            <div className="flex justify-between">
              <span>Jumlah Uang:</span>
              <span className="font-bold text-slate-800">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(jumlah)}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Memproses...
                </>
              ) : (
                'Ya, Hapus'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
