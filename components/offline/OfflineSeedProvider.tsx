'use client';

import { useEffect, useState } from 'react';
import { autoSeedOfflineDatabase, getSeedStatus } from '@/lib/offline/auto-seed';
import { toast } from 'sonner';

/**
 * OfflineSeedProvider - Auto-seed offline database on mount
 * 
 * Automatically downloads and caches critical data (products, outlets, etc.)
 * when the app first loads while online.
 */
export function OfflineSeedProvider({ children }: { children: React.ReactNode }) {
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState<{
    seeded: boolean;
    productsCount: number;
    outletsCount: number;
  } | null>(null);

  useEffect(() => {
    async function initOfflineData() {
      // Check seed status
      const status = await getSeedStatus();
      setSeedStatus(status);

      // Auto-seed if not seeded and online
      if (!status.seeded && navigator.onLine) {
        console.log('🌱 [OfflineSeedProvider] Starting auto-seed...');
        setSeeding(true);
        
        // Show toast
        const toastId = toast.loading('📥 Mengunduh data untuk mode offline...', {
          description: 'Tunggu sebentar, ini hanya sekali.',
        });
        
        try {
          await autoSeedOfflineDatabase();
          
          // Re-check status
          const newStatus = await getSeedStatus();
          setSeedStatus(newStatus);
          
          // Success toast
          toast.success('✅ Siap mode offline!', {
            id: toastId,
            description: `${newStatus.productsCount} produk dan ${newStatus.outletsCount} outlet ter-cache.`,
            duration: 5000,
          });
        } catch (error) {
          console.error('❌ [OfflineSeedProvider] Auto-seed failed:', error);
          toast.error('❌ Gagal cache data offline', {
            id: toastId,
            description: 'Coba refresh halaman atau buka menu Kasir.',
          });
        } finally {
          setSeeding(false);
        }
      }
    }

    // Run on mount
    initOfflineData();

    // Re-run when online status changes
    const handleOnline = () => {
      console.log('📡 [OfflineSeedProvider] Device back online, checking seed...');
      initOfflineData();
    };

    // Refresh catalog saat user kembali ke tab (setelah update produk di tab lain)
    const handleVisibility = () => {
      if (!document.hidden && navigator.onLine) {
        import('@/lib/offline/auto-seed').then(({ refreshCatalogCache }) => {
          const lastRefresh = localStorage.getItem('offline_seeded_at');
          const ageMs = lastRefresh ? Date.now() - new Date(lastRefresh).getTime() : Infinity;
          // Refresh jika data lebih dari 2 menit
          if (ageMs > 2 * 60 * 1000) {
            console.log('[OfflineSeedProvider] Refreshing stale catalog on focus...');
            refreshCatalogCache().catch(console.error);
          }
        });
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // ✅ PERF FIX #2: Jangan block render children!
  // Tampilkan loading sebagai overlay non-blocking di pojok layar
  // sehingga semua halaman dashboard tetap bisa diakses saat seeding
  return (
    <>
      {children}
      {seeding && (
        <div className="fixed bottom-20 right-4 bg-white shadow-lg rounded-xl p-3 z-[9999] border border-orange-100 max-w-xs sm:bottom-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent flex-shrink-0" />
            <div>
              <p className="text-xs font-bold text-gray-900">Mempersiapkan Offline</p>
              <p className="text-[10px] text-gray-500">Cache data sedang berjalan...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
