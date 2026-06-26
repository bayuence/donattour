'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Download, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { preloadPublicData } from '@/lib/offline/auto-seed';

interface OfflineStatusBadgeProps {
  compact?: boolean;
  showAction?: boolean;
}

export function OfflineStatusBadge({ 
  compact = false, 
  showAction = true 
}: OfflineStatusBadgeProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloaded, setPreloaded] = useState(false);
  const [cachedData, setCachedData] = useState<Record<string, number>>({});

  // Monitor network status
  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('✅ Koneksi internet tersedia', {
        description: 'Aplikasi kembali online.',
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('📶 Sedang offline', {
        description: 'Aplikasi berjalan dalam mode offline.',
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cek data yang sudah di-cache
  useEffect(() => {
    async function checkCache() {
      try {
        const cache = await caches.open('donattour-public-data');
        const urls = [
          '/api/products?all=true',
          '/api/outlets?all=true',
          '/api/payment-methods',
        ];

        const cacheStats: Record<string, number> = {};

        await Promise.all(
          urls.map(async (url) => {
            const response = await cache.match(url);
            if (response) {
              try {
                const data = await response.json();
                const key = url.split('/')[2].split('?')[0]; // products, outlets, dll
                cacheStats[key] = data.data?.length || data.length || 0;
              } catch (e) {
                // Ignore parsing errors
              }
            }
          })
        );

        setCachedData(cacheStats);
        setPreloaded(Object.keys(cacheStats).length > 0);
      } catch (error) {
        console.error('[OfflineStatus] Error checking cache:', error);
      }
    }

    checkCache();
  }, []);

  // Manual preload data
  const handlePreload = async () => {
    if (!isOnline) {
      toast.error('❌ Tidak ada koneksi internet', {
        description: 'Sambungkan ke internet untuk preload data.',
      });
      return;
    }

    setIsPreloading(true);
    toast.loading('📥 Mengunduh data untuk mode offline...', {
      description: 'Tunggu sebentar.',
    });

    try {
      await preloadPublicData();
      
      // Update cache status
      const cache = await caches.open('donattour-public-data');
      const response = await cache.match('/api/products?all=true');
      if (response) {
        const data = await response.json();
        const count = data.data?.length || data.length || 0;
        
        setPreloaded(true);
        setCachedData(prev => ({ ...prev, products: count }));
        
        toast.success('✅ Data siap offline!', {
          description: `${count} produk tersedia offline.`,
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('[OfflineStatus] Preload failed:', error);
      toast.error('❌ Gagal mengunduh data offline');
    } finally {
      setIsPreloading(false);
    }
  };

  // Compact mode untuk navbar
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200">
        {isOnline ? (
          <>
            <Wifi className="h-3.5 w-3.5 text-green-600" />
            <span className="text-green-700">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-amber-700">Offline</span>
          </>
        )}
      </div>
    );
  }

  // Full status panel
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className={`p-4 flex items-center justify-between ${isOnline ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gradient-to-r from-amber-50 to-orange-50'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isOnline ? 'bg-green-100' : 'bg-amber-100'}`}>
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-amber-600" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">
              {isOnline ? 'Aplikasi Online' : 'Mode Offline'}
            </h3>
            <p className="text-sm text-gray-600">
              {isOnline 
                ? 'Semua fitur tersedia' 
                : 'Hanya data yang sudah di-cache yang tersedia'}
            </p>
          </div>
        </div>
        
        {showAction && isOnline && !preloaded && (
          <button
            onClick={handlePreload}
            disabled={isPreloading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPreloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Memuat...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Siapkan Offline</span>
              </>
            )}
          </button>
        )}
        
        {showAction && preloaded && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-lg">
            <CheckCircle className="h-4 w-4" />
            <span>Siap Offline</span>
          </div>
        )}
      </div>
      
      {Object.keys(cachedData).length > 0 && (
        <div className="p-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Data Tersimpan:</h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(cachedData).map(([key, count]) => (
              <div 
                key={key} 
                className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
              >
                <span className="text-sm text-gray-700 capitalize">{key}</span>
                <span className="text-sm font-medium text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!isOnline && Object.keys(cachedData).length === 0 && (
        <div className="p-4 border-t border-gray-100 bg-amber-50">
          <p className="text-sm text-amber-800">
            ⚠️ Tidak ada data offline yang tersedia. Sambungkan ke internet dan klik "Siapkan Offline" untuk cache data.
          </p>
        </div>
      )}
    </div>
  );
}