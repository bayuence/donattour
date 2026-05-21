'use client';

/**
 * Expense Outlet Selector Component
 * 
 * Komponen untuk memilih outlet sebelum masuk ke expense dashboard.
 * Mengikuti pola yang sama dengan outlet-context tapi khusus untuk expense module.
 */

import { useState, useEffect } from 'react';
import { Search, Star, AlertCircle } from 'lucide-react';
import type { Outlet } from '@/lib/types';
import * as db from '@/lib/db';

interface ExpenseOutletSelectorProps {
  onSelectOutlet: (outlet: Outlet) => void;
}

const STORAGE_KEY_FAVORITES = 'expense_favorite_outlets';

export default function ExpenseOutletSelector({ onSelectOutlet }: ExpenseOutletSelectorProps) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [filteredOutlets, setFilteredOutlets] = useState<Outlet[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load outlets and saved data
  useEffect(() => {
    loadData();
  }, []);

  // Filter outlets based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredOutlets(outlets);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = outlets.filter(
        (o) =>
          o.nama.toLowerCase().includes(query) ||
          o.alamat?.toLowerCase().includes(query) ||
          o.id.toLowerCase().includes(query)
      );
      setFilteredOutlets(filtered);
    }
  }, [searchQuery, outlets]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load all active outlets
      const allOutlets = await db.getActiveOutlets();
      setOutlets(allOutlets);
      setFilteredOutlets(allOutlets);

      // Load favorite outlets from localStorage
      const favStr = localStorage.getItem(STORAGE_KEY_FAVORITES);
      if (favStr) {
        const favIds: string[] = JSON.parse(favStr);
        setFavoriteIds(favIds);
      }
    } catch (error) {
      console.error('Error loading outlets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOutlet = (outlet: Outlet) => {
    // Call parent callback
    onSelectOutlet(outlet);
  };

  const toggleFavorite = (outletId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    let newFavorites = [...favoriteIds];
    if (newFavorites.includes(outletId)) {
      newFavorites = newFavorites.filter((id) => id !== outletId);
    } else {
      newFavorites.push(outletId);
    }
    
    setFavoriteIds(newFavorites);
    localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(newFavorites));
  };

  const favoriteOutlets = outlets.filter((o) => favoriteIds.includes(o.id));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500 mb-4"></div>
          <p className="text-sm text-gray-500">Memuat outlet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl mb-4 shadow-md">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Pengeluaran Outlet</h1>
            <p className="text-sm text-gray-500 mt-2">
              Pilih outlet untuk melanjutkan ke manajemen pengeluaran
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari outlet berdasarkan nama atau alamat..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Favorite Outlets */}
        {favoriteOutlets.length > 0 && searchQuery === '' && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              <h2 className="text-base font-semibold text-gray-900">Outlet Favorit</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {favoriteOutlets.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favoriteOutlets.map((outlet) => (
                <OutletCard
                  key={outlet.id}
                  outlet={outlet}
                  isFavorite={true}
                  onSelect={handleSelectOutlet}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Outlets / Search Results */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900">
                {searchQuery ? 'Hasil Pencarian' : 'Semua Outlet'}
              </h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {filteredOutlets.length}
              </span>
            </div>
          </div>

          {filteredOutlets.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                {searchQuery ? 'Tidak ada outlet yang sesuai' : 'Belum ada outlet aktif'}
              </p>
              <p className="text-xs text-gray-500">
                {searchQuery ? 'Coba gunakan kata kunci lain' : 'Hubungi administrator untuk menambahkan outlet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOutlets.map((outlet) => (
                <OutletCard
                  key={outlet.id}
                  outlet={outlet}
                  isFavorite={favoriteIds.includes(outlet.id)}
                  onSelect={handleSelectOutlet}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Outlet Card Component
// ============================================================================

interface OutletCardProps {
  outlet: Outlet;
  isFavorite: boolean;
  onSelect: (outlet: Outlet) => void;
  onToggleFavorite: (outletId: string, e: React.MouseEvent) => void;
}

function OutletCard({ outlet, isFavorite, onSelect, onToggleFavorite }: OutletCardProps) {
  return (
    <button
      onClick={() => onSelect(outlet)}
      className="w-full p-5 bg-white border border-gray-200 rounded-lg hover:border-emerald-500 hover:shadow-md transition-all text-left group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-emerald-200 group-hover:to-emerald-300 transition-all">
            <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors text-sm">
              {outlet.nama}
            </h3>
            {outlet.alamat && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{outlet.alamat}</p>
            )}
          </div>
        </div>
        <div
          onClick={(e) => onToggleFavorite(outlet.id, e)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer flex-shrink-0"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleFavorite(outlet.id, e as any);
            }
          }}
        >
          <Star
            className={`w-4 h-4 ${
              isFavorite ? 'text-amber-500 fill-amber-500' : 'text-gray-400'
            }`}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500">
          Status: <span className="text-emerald-600 font-medium">Aktif</span>
        </span>
        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
          Pilih
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </button>
  );
}

