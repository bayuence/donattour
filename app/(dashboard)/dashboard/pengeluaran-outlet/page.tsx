'use client';

/**
 * Pengeluaran Outlet Page
 * 
 * Two-step workflow:
 * 1. Select outlet (ExpenseOutletSelector)
 * 2. Manage expenses for selected outlet (ExpenseManagementAdvanced)
 */

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import ExpenseOutletSelector from '@/components/expenses/ExpenseOutletSelector';
import ExpenseManagementAdvanced from '@/components/expenses/ExpenseManagementAdvanced';
import type { Outlet } from '@/lib/types';

const STORAGE_KEY = 'expense_selected_outlet';

export default function PengeluaranOutletPage() {
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved outlet from localStorage
  useEffect(() => {
    const savedOutlet = localStorage.getItem(STORAGE_KEY);
    if (savedOutlet) {
      try {
        setSelectedOutlet(JSON.parse(savedOutlet));
      } catch (error) {
        console.error('Error parsing saved outlet:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const handleSelectOutlet = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(outlet));
  };

  const handleChangeOutlet = () => {
    setSelectedOutlet(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500 mb-4"></div>
          <p className="text-sm text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  // Step 1: Show outlet selector if no outlet selected
  if (!selectedOutlet) {
    return <ExpenseOutletSelector onSelectOutlet={handleSelectOutlet} />;
  }

  // Step 2: Show expense management for selected outlet
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Outlet Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleChangeOutlet}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Kembali ke pilihan outlet"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-base font-bold text-gray-900">{selectedOutlet.nama}</h1>
                  {selectedOutlet.alamat && (
                    <p className="text-xs text-gray-500">{selectedOutlet.alamat}</p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleChangeOutlet}
              className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Ganti Outlet
            </button>
          </div>
        </div>
      </div>

      {/* Expense Management Component */}
      <ExpenseManagementAdvanced outletId={selectedOutlet.id} />
    </div>
  );
}
