'use client';

import { 
  Store, ChevronRight, RefreshCw, WifiOff, Lock, Unlock
} from 'lucide-react';
import type { Outlet } from '@/lib/types';
import type { DashboardData } from '../types';
import { formatTanggalHariIni, formatTime, formatTimeShort } from '../utils/helpers';

interface StickyHeaderProps {
  currentTime: Date;
  lastUpdated: Date | null;
  isLive: boolean;
  selectedOutlet: Outlet | null;
  dashboardData: DashboardData | null;
  loadingData: boolean;
  onSelectOutlet: () => void;
  onRefresh: () => void;
  onOpenKasir: () => void;
  onCloseKasir: () => void;
}

export function StickyHeader({
  currentTime,
  lastUpdated,
  isLive,
  selectedOutlet,
  dashboardData,
  loadingData,
  onSelectOutlet,
  onRefresh,
  onOpenKasir,
  onCloseKasir
}: StickyHeaderProps) {
  const tanggalHariIni = formatTanggalHariIni(currentTime);

  return (
    <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">

          {/* Title Area */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                Laporan Harian Outlet
              </h1>

              {/* LIVE Badge */}
              {isLive && selectedOutlet && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 border border-green-200 text-green-700 text-xs font-bold shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  LIVE
                </span>
              )}
              {!isLive && selectedOutlet && !loadingData && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs shadow-sm">
                  <WifiOff className="w-3 h-3" />
                  Offline
                </span>
              )}

              {/* Closing Status */}
              {dashboardData && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold shadow-sm ${
                  dashboardData.has_closing 
                    ? 'bg-red-50 border-red-200 text-red-700' 
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}>
                  {dashboardData.has_closing ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  {dashboardData.has_closing ? 'CLOSE' : 'OPEN'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                {tanggalHariIni}
              </p>
              <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-md">
                {formatTime(currentTime)}
              </span>
              {lastUpdated && (
                <span className="text-[10px] text-gray-400 ml-1">
                  (Update terakhir: {formatTimeShort(lastUpdated)})
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">

            {/* Buka/Tutup Kasir Actions */}
            {selectedOutlet && dashboardData && (
              <>
                {dashboardData.is_kasir_locked ? (
                  <button
                    onClick={onOpenKasir}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-green-500 text-white shadow-sm shadow-green-500/30 hover:bg-green-600"
                  >
                    <Unlock className="w-4 h-4" />
                    <span className="hidden md:inline">Buka Kasir</span>
                  </button>
                ) : (
                  <button
                    onClick={onCloseKasir}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-red-500 text-white shadow-sm shadow-red-500/30 hover:bg-red-600"
                  >
                    <Lock className="w-4 h-4" />
                    <span className="hidden md:inline">Tutup Kasir</span>
                  </button>
                )}
              </>
            )}

            {/* Outlet Selector */}
            <button
              onClick={onSelectOutlet}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border transition-all text-sm font-semibold ${
                selectedOutlet
                  ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                  : 'bg-orange-500 border-orange-500 text-white hover:bg-orange-600'
              }`}
            >
              <Store className="w-4 h-4 flex-shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-[180px]">
                {selectedOutlet ? selectedOutlet.nama : 'Pilih Outlet'}
              </span>
              <ChevronRight className="w-4 h-4 flex-shrink-0 rotate-90" />
            </button>

            {/* Refresh */}
            {selectedOutlet && (
              <button
                onClick={onRefresh}
                disabled={loadingData}
                title="Refresh data"
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 text-gray-600 ${loadingData ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
