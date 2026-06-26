'use client';

import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface PreloadProgress {
  pagesProgress: number;
  pagesTotal: number;
  apisProgress: number;
  apisTotal: number;
  isPreloading: boolean;
  isComplete: boolean;
}

export function OfflinePreloader() {
  const [progress, setProgress] = useState<PreloadProgress>({
    pagesProgress: 0,
    pagesTotal: 25,
    apisProgress: 0,
    apisTotal: 15,
    isPreloading: false,
    isComplete: false,
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [showPreloader, setShowPreloader] = useState(false);
  const setupDoneRef = useRef(false);
  const preloadInProgressRef = useRef(false);

  // Register service worker dan setup preloading - HANYA SEKALI!
  useEffect(() => {
    // Prevent duplicate setup
    if (setupDoneRef.current) {
      console.log('[OfflinePreloader] Setup already done, skipping');
      return;
    }
    setupDoneRef.current = true;

    async function setupSW() {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('[OfflinePreloader] Service Worker not supported');
        return;
      }

      try {
        // Register new service worker (service-worker.js)
        const reg = await navigator.serviceWorker.register('/service-worker.js', {
          updateViaCache: 'none',
        });

        setRegistration(reg);
        console.log('[OfflinePreloader] Service Worker registered');

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('[OfflinePreloader] Message from SW:', event.data);

          switch (event.data.type) {
            case 'PRELOAD_PAGES_COMPLETE':
              setProgress(prev => ({
                ...prev,
                pagesProgress: event.data.successCount,
                pagesTotal: event.data.totalPages,
              }));
              break;

            case 'PRELOAD_APIS_COMPLETE':
              setProgress(prev => ({
                ...prev,
                apisProgress: event.data.successCount,
                apisTotal: event.data.totalAPIs,
                isPreloading: false,
                isComplete: true,
              }));
              
              // Mark as done AFTER successful preload
              localStorage.setItem('offline_preload_done', 'true');
              localStorage.setItem('offline_preload_time', new Date().toISOString());
              preloadInProgressRef.current = false;
              break;

            case 'SYNC_COMPLETE':
              console.log(`[OfflinePreloader] Sync complete: ${event.data.successful}/${event.data.total}`);
              break;
          }
        });

        // Check if preload already done
        const isFirstTime = !localStorage.getItem('offline_preload_done');
        if (isFirstTime && navigator.onLine && !preloadInProgressRef.current) {
          console.log('[OfflinePreloader] First time and online, showing preload dialog');
          setShowPreloader(true);
        } else if (!isFirstTime) {
          console.log('[OfflinePreloader] Already preloaded, skipping dialog');
        }

      } catch (error) {
        console.error('[OfflinePreloader] Failed to register SW:', error);
      }
    }

    setupSW();
  }, []);

  // Start preloading
  const startPreload = async () => {
    // Prevent multiple simultaneous preloads
    if (preloadInProgressRef.current) {
      console.log('[OfflinePreloader] Preload already in progress');
      return;
    }

    if (!registration || !registration.active) {
      toast.error('❌ Service Worker tidak aktif');
      return;
    }

    if (!navigator.onLine) {
      toast.error('❌ Tidak ada koneksi internet');
      return;
    }

    console.log('[OfflinePreloader] Starting comprehensive preload...');
    preloadInProgressRef.current = true;
    setProgress(prev => ({ ...prev, isPreloading: true }));

    const preloadToastId = toast.loading('📥 Mempersiapkan aplikasi untuk mode offline...', {
      description: 'Ini bisa memakan waktu beberapa menit. Jangan tutup aplikasi.',
    });

    try {
      // Preload semua halaman terlebih dahulu
      console.log('[OfflinePreloader] Preloading all pages...');
      registration.active.postMessage({
        type: 'PRELOAD_ALL_PAGES',
      });

      // Wait untuk pages selesai (max 60 detik)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Preload semua APIs
      console.log('[OfflinePreloader] Preloading all APIs...');
      registration.active.postMessage({
        type: 'PRELOAD_ALL_APIS',
      });

      // Wait untuk apis selesai (max 60 detik)
      await new Promise(resolve => setTimeout(resolve, 5000));

      toast.success('✅ Aplikasi siap offline!', {
        id: preloadToastId,
        description: `${progress.pagesProgress} halaman dan ${progress.apisProgress} data berhasil di-cache.`,
        duration: 5000,
      });

      setShowPreloader(false);

    } catch (error) {
      console.error('[OfflinePreloader] Preload failed:', error);
      toast.error('❌ Gagal mempersiapkan offline', {
        id: preloadToastId,
        description: 'Coba lagi atau hubungi admin.',
      });
      preloadInProgressRef.current = false;
    }
  };

  // Dialog untuk preload pertama kali
  // DISABLED untuk mencegah infinite loop - user bisa manual preload dari settings
  if (false && showPreloader && navigator.onLine) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md mx-4">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 mb-4">
              <Download className="h-8 w-8 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Siapkan Mode Offline</h2>
            <p className="text-gray-600">
              Biarkan aplikasi cache semua data sehingga bisa digunakan tanpa internet
            </p>
          </div>

          {/* Progress Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-lg">📄</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Halaman Menu</p>
                  <p className="text-gray-600 text-xs">Kasir, Inventory, Laporan, Input Data, dll</p>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                      style={{ width: `${(progress.pagesProgress / progress.pagesTotal) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {progress.pagesProgress}/{progress.pagesTotal} halaman
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-lg">🗄️</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Data & API</p>
                  <p className="text-gray-600 text-xs">Produk, outlet, karyawan, transaksi, dll</p>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                      style={{ width: `${(progress.apisProgress / progress.apisTotal) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {progress.apisProgress}/{progress.apisTotal} data
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm text-blue-900">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Perlu koneksi internet</strong> untuk preload. Proses akan memakan waktu 2-3 menit. Jangan tutup aplikasi.
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            {progress.isPreloading ? (
              <button
                disabled
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Mempersiapkan... {Math.round((progress.pagesProgress / progress.pagesTotal) * 50 + (progress.apisProgress / progress.apisTotal) * 50)}%</span>
              </button>
            ) : (
              <button
                onClick={startPreload}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 active:scale-95"
              >
                Mulai Preload Sekarang
              </button>
            )}

            <button
              onClick={() => setShowPreloader(false)}
              disabled={progress.isPreloading}
              className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Nanti Saja
            </button>
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-500 text-center mt-4">
            Anda bisa preload kapan saja dari pengaturan → Offline Management
          </p>
        </div>
      </div>
    );
  }

  return null;
}