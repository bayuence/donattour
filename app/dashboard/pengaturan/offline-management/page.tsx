'use client';

import { useState, useEffect } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  RefreshCw, 
  Database, 
  HardDrive,
  CheckCircle,
  AlertTriangle,
  Trash2,
  CloudOff,
  Shield
} from 'lucide-react';
import { toast } from 'sonner';
import { OfflineStatusBadge } from '@/components/offline/OfflineStatusBadge';
import { useServiceWorker } from '@/lib/hooks/useServiceWorker';

export default function OfflineManagementPage() {
  const [isOnline, setIsOnline] = useState(true);
  const [cacheStats, setCacheStats] = useState<{
    totalEntries: number;
    apiEndpoints: number;
    assets: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const sw = useServiceWorker();

  // Monitor network status
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load cache statistics
  useEffect(() => {
    async function loadStats() {
      const stats = await sw.getCacheStats();
      if (stats) {
        setCacheStats({
          totalEntries: stats.totalEntries,
          apiEndpoints: stats.apiEndpoints,
          assets: stats.assets,
        });
      }
    }
    
    if (sw.isActive) {
      loadStats();
    }
  }, [sw.isActive, sw.getCacheStats]);

  // Handle manual preload dengan timeout protection
  const handlePreload = async () => {
    if (!isOnline) {
      toast.error('❌ Tidak ada koneksi internet');
      return;
    }

    if (isLoading) {
      toast.warning('⏳ Preload sedang berjalan, tunggu sebentar...');
      return;
    }

    setIsLoading(true);
    const preloadToastId = toast.loading('📥 Mempersiapkan aplikasi offline...', {
      description: 'Mengunduh halaman dan data. Jangan tutup halaman.',
    });

    try {
      // Get service worker registration
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker tidak didukung');
      }

      const registration = await navigator.serviceWorker.ready;
      
      if (!registration.active) {
        throw new Error('Service Worker tidak aktif');
      }

      console.log('[OfflineManagement] Starting preload...');
      
      // Trigger preload pages
      registration.active.postMessage({
        type: 'PRELOAD_ALL_PAGES',
      });

      // Wait for pages to preload (timeout 60s)
      let pagesComplete = false;
      const pagesListener = (event: MessageEvent) => {
        if (event.data.type === 'PRELOAD_PAGES_COMPLETE') {
          console.log('[OfflineManagement] Pages preload done:', event.data);
          pagesComplete = true;
        }
      };
      
      navigator.serviceWorker.addEventListener('message', pagesListener);
      
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 35000); // 35 seconds max
        const checkInterval = setInterval(() => {
          if (pagesComplete) {
            clearTimeout(timer);
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });

      // Trigger preload APIs
      registration.active.postMessage({
        type: 'PRELOAD_ALL_APIS',
      });

      // Wait for APIs to preload (timeout 60s)
      let apisComplete = false;
      const apisListener = (event: MessageEvent) => {
        if (event.data.type === 'PRELOAD_APIS_COMPLETE') {
          console.log('[OfflineManagement] APIs preload done:', event.data);
          apisComplete = true;
          
          // Update cache stats
          setTimeout(async () => {
            const stats = await navigator.serviceWorker.controller?.postMessage({ type: 'GET_CACHE_STATS' });
            loadCacheStats();
          }, 1000);
        }
      };
      
      navigator.serviceWorker.addEventListener('message', apisListener);
      
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 35000); // 35 seconds max
        const checkInterval = setInterval(() => {
          if (apisComplete) {
            clearTimeout(timer);
            clearInterval(checkInterval);
            resolve(true);
          }
        }, 100);
      });

      // Remove listeners
      navigator.serviceWorker.removeEventListener('message', pagesListener);
      navigator.serviceWorker.removeEventListener('message', apisListener);

      // Mark as preloaded
      localStorage.setItem('offline_preload_done', 'true');
      localStorage.setItem('offline_preload_time', new Date().toISOString());

      toast.success('✅ Aplikasi siap offline!', {
        id: preloadToastId,
        description: 'Semua halaman dan data sudah di-cache.',
        duration: 5000,
      });
      
      // Refresh cache stats
      await new Promise(resolve => setTimeout(resolve, 2000));
      const stats = await sw.getCacheStats();
      if (stats) {
        setCacheStats({
          totalEntries: stats.totalEntries,
          apiEndpoints: stats.apiEndpoints,
          assets: stats.assets,
        });
      }
      
    } catch (error) {
      console.error('[OfflineManagement] Preload failed:', error);
      toast.error('❌ Gagal mempersiapkan offline', {
        id: preloadToastId,
        description: error instanceof Error ? error.message : 'Coba lagi nanti',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load cache stats
  const loadCacheStats = async () => {
    const stats = await sw.getCacheStats();
    if (stats) {
      setCacheStats({
        totalEntries: stats.totalEntries,
        apiEndpoints: stats.apiEndpoints,
        assets: stats.assets,
      });
    }
  };

  // Handle cache clear
  const handleClearCache = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus semua data offline? Data yang dihapus tidak dapat dikembalikan.')) {
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await sw.clearCache();
      
      if (success) {
        setCacheStats(null);
        toast.success('🗑️ Cache dibersihkan', {
          description: 'Semua data offline telah dihapus.',
          duration: 5000,
        });
      } else {
        toast.error('❌ Gagal membersihkan cache');
      }
    } catch (error) {
      console.error('Clear cache failed:', error);
      toast.error('❌ Gagal membersihkan cache');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual sync
  const handleManualSync = async () => {
    if (!isOnline) {
      toast.error('❌ Tidak ada koneksi internet');
      return;
    }

    setIsLoading(true);
    
    try {
      const success = await sw.triggerSync();
      
      if (success) {
        toast.success('🔄 Sinkronisasi dimulai', {
          description: 'Data sedang disinkronkan di background.',
          duration: 5000,
        });
      } else {
        toast.error('❌ Gagal memulai sinkronisasi');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('❌ Gagal memulai sinkronisasi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manajemen Mode Offline</h1>
        <p className="text-gray-600">
          Kelola data offline untuk penggunaan tanpa koneksi internet. Data akan otomatis disinkronkan saat online.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-green-100 to-emerald-100">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-green-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-amber-600" />
              )}
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <h3 className="font-bold text-gray-900">Status Jaringan</h3>
          <p className="text-sm text-gray-600 mt-1">
            {isOnline 
              ? 'Koneksi internet tersedia' 
              : 'Sedang berjalan dalam mode offline'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-blue-100 to-cyan-100">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              sw.isActive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {sw.isActive ? 'Aktif' : 'Tidak Aktif'}
            </span>
          </div>
          <h3 className="font-bold text-gray-900">Service Worker</h3>
          <p className="text-sm text-gray-600 mt-1">
            {sw.isActive 
              ? 'Siap untuk mode offline' 
              : 'Belum diaktifkan'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-purple-100 to-violet-100">
              <HardDrive className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-800">
              {cacheStats ? `${cacheStats.totalEntries} item` : '0 item'}
            </span>
          </div>
          <h3 className="font-bold text-gray-900">Cache Data</h3>
          <p className="text-sm text-gray-600 mt-1">
            {cacheStats 
              ? `${cacheStats.apiEndpoints} API, ${cacheStats.assets} aset` 
              : 'Belum ada data'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-orange-100 to-amber-100">
              <Shield className="h-5 w-5 text-orange-600" />
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">
              Aman
            </span>
          </div>
          <h3 className="font-bold text-gray-900">Keamanan Data</h3>
          <p className="text-sm text-gray-600 mt-1">
            Data disimpan secara lokal dan terenkripsi
          </p>
        </div>
      </div>

      {/* Offline Status Panel */}
      <div className="mb-8">
        <OfflineStatusBadge compact={false} showAction={false} />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={handlePreload}
          disabled={!isOnline || isLoading}
          className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Memuat...</span>
            </>
          ) : (
            <>
              <Download className="h-5 w-5" />
              <span>Preload Data Offline</span>
            </>
          )}
        </button>

        <button
          onClick={handleManualSync}
          disabled={!isOnline || isLoading || !sw.isActive}
          className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className="h-5 w-5" />
          <span>Sinkronisasi Sekarang</span>
        </button>

        <button
          onClick={handleClearCache}
          disabled={isLoading || !cacheStats || cacheStats.totalEntries === 0}
          className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-5 w-5" />
          <span>Bersihkan Cache</span>
        </button>
      </div>

      {/* Information Section */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📱 Tentang Mode Offline</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Keuntungan Mode Offline
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2"></div>
                <span>Bisa digunakan tanpa koneksi internet</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2"></div>
                <span>Loading lebih cepat untuk data yang sudah di-cache</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2"></div>
                <span>Otomatis sinkron saat kembali online</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2"></div>
                <span>Menghemat penggunaan data internet</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Yang Perlu Diperhatikan
            </h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2"></div>
                <span>Data mungkin tidak selalu terupdate</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2"></div>
                <span>Beberapa fitur butuh koneksi internet</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2"></div>
                <span>Cache memakan ruang penyimpanan</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2"></div>
                <span>Data sensitif tetap butuh autentikasi</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
          <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <CloudOff className="h-5 w-5 text-gray-600" />
            Tips Penggunaan
          </h4>
          <p className="text-sm text-gray-600">
            • Preload data saat wifi tersedia untuk persiapan offline<br/>
            • Biarkan sinkronisasi berjalan di background<br/>
            • Bersihkan cache jika aplikasi terasa lambat<br/>
            • Pastikan Service Worker aktif untuk pengalaman offline optimal
          </p>
        </div>
      </div>

      {/* Technical Info (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-900 text-gray-100 rounded-lg text-sm font-mono">
          <h4 className="font-bold mb-2">Debug Info:</h4>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify({
              serviceWorker: {
                supported: sw.isSupported,
                installed: sw.isInstalled,
                active: sw.isActive,
                canSync: sw.canSync,
              },
              network: {
                online: isOnline,
                connection: navigator.connection ? {
                  effectiveType: (navigator.connection as any).effectiveType,
                  saveData: (navigator.connection as any).saveData,
                } : 'Not available',
              },
              cache: cacheStats,
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}