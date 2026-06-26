'use client';

// ============================================================================
// OFFLINE FALLBACK PAGE
// ============================================================================
// File: app/offline/page.tsx
// Description: Beautiful, offline fallback page displaying connection warnings
//              and auto-redirecting when connection is restored.
// Version: 1.0
// Date: 2026-06-26
// ============================================================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WifiOff, RefreshCw, AlertCircle, Home } from 'lucide-react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Initial check
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => {
      setIsOnline(true);
      // Beautiful auto-redirect back after connection is restored
      setTimeout(() => {
        router.back();
      }, 1500);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [router]);

  const handleReload = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        if (navigator.onLine) {
          router.push('/dashboard/kasir');
        } else {
          setIsRefreshing(false);
        }
      }
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-radial from-orange-50 to-orange-100 p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white/70 backdrop-blur-md border border-orange-200/80 p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 text-center relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-400 to-amber-500" />
        
        {/* Animated Icon Container */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute inset-0 rounded-full bg-orange-100/50 animate-ping opacity-75 duration-1000" />
          <div className="relative p-5 rounded-full bg-orange-100 border border-orange-200">
            <WifiOff className="w-12 h-12 text-orange-600 animate-pulse" />
          </div>
        </div>

        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Koneksi Terputus
        </h1>
        <p className="text-gray-600 text-sm mb-8 max-w-xs mx-auto">
          Ups! Anda sedang offline. Namun jangan khawatir, Donattour POS siap beroperasi offline dan data transaksi Anda akan tetap tersimpan aman secara lokal.
        </p>

        {/* Connection status card */}
        <div className="mb-8 p-4 rounded-xl bg-orange-50/50 border border-orange-100 flex items-center justify-center gap-3">
          {isOnline ? (
            <div className="flex items-center gap-2 text-emerald-600 font-semibold animate-bounce text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Koneksi Terhubung! Mengalihkan...
            </div>
          ) : (
            <div className="flex items-center gap-2 text-orange-600 font-medium text-sm">
              <AlertCircle className="w-4 h-4" />
              Menunggu koneksi internet aktif kembali...
            </div>
          )}
        </div>

        {/* Buttons Grid */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleReload}
            disabled={isRefreshing || isOnline}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 shadow-md hover:shadow-lg disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Memuat...' : 'Coba Lagi'}
          </button>
          
          <button
            onClick={() => router.push('/dashboard/kasir')}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 shadow-sm transition-all active:scale-[0.98]"
          >
            <Home className="w-4 h-4" />
            Ke Kasir
          </button>
        </div>

        {/* Brand Footer */}
        <div className="mt-8 text-[11px] text-gray-400">
          Donattour POS System &bull; Offline Mode Enabled
        </div>
      </div>
    </div>
  );
}
