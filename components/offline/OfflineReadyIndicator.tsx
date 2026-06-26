'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Download, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { getSeedStatus } from '@/lib/offline/auto-seed';

interface OfflineStatus {
  ready: boolean;
  progress: number; // 0-100
  productsCount: number;
  outletsCount: number;
  usersCount: number;
  seededAt?: string;
}

/**
 * OfflineReadyIndicator - Shows offline readiness status
 * 
 * Displays:
 * - Green badge when 100% ready offline
 * - Yellow badge with progress when caching
 * - Red badge when not ready
 */
export function OfflineReadyIndicator() {
  const [status, setStatus] = useState<OfflineStatus>({
    ready: false,
    progress: 0,
    productsCount: 0,
    outletsCount: 0,
    usersCount: 0,
  });
  const [isOnline, setIsOnline] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      // Check online status
      setIsOnline(navigator.onLine);

      // Check offline cache status
      const seedStatus = await getSeedStatus();
      
      // Check cached users
      let usersCount = 0;
      try {
        const cachedUsers = localStorage.getItem('donattour_cached_users');
        if (cachedUsers) {
          usersCount = Object.keys(JSON.parse(cachedUsers)).length;
        }
      } catch {}

      // Calculate progress
      // 100% = has products + has outlets + has user cached
      const hasProducts = seedStatus.productsCount > 0;
      const hasOutlets = seedStatus.outletsCount > 0;
      const hasUser = usersCount > 0;

      let progress = 0;
      if (hasProducts) progress += 40;
      if (hasOutlets) progress += 30;
      if (hasUser) progress += 30;

      const ready = progress === 100;

      setStatus({
        ready,
        progress,
        productsCount: seedStatus.productsCount,
        outletsCount: seedStatus.outletsCount,
        usersCount,
        seededAt: seedStatus.seededAt,
      });
    }

    checkStatus();

    // Update every 5 seconds
    const interval = setInterval(checkStatus, 5000);

    // Update on online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      checkStatus();
    };
    const handleOffline = () => {
      setIsOnline(false);
      checkStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Badge colors based on status
  const getBadgeColor = () => {
    if (!isOnline) return 'bg-orange-500 text-white';
    if (status.ready) return 'bg-green-500 text-white';
    if (status.progress > 0) return 'bg-yellow-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getIcon = () => {
    if (!isOnline) return <WifiOff size={12} />;
    if (status.ready) return <CheckCircle size={12} />;
    if (status.progress > 0) return <Download size={12} className="animate-pulse" />;
    return <AlertCircle size={12} />;
  };

  const getLabel = () => {
    if (!isOnline) return 'Offline';
    if (status.ready) return 'Ready';
    if (status.progress > 0) return `${status.progress}%`;
    return 'Not Ready';
  };

  return (
    <div className="relative">
      {/* Badge Button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider
          ${getBadgeColor()}
          hover:opacity-90 transition-all shadow-sm
        `}
      >
        {getIcon()}
        <span>{getLabel()}</span>
      </button>

      {/* Details Dropdown */}
      {showDetails && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDetails(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900">Status Offline</h3>
              <div className="flex items-center gap-1.5 text-xs font-bold">
                {isOnline ? (
                  <>
                    <Wifi size={14} className="text-green-500" />
                    <span className="text-green-600">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={14} className="text-orange-500" />
                    <span className="text-orange-600">Offline</span>
                  </>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Kesiapan Offline</span>
                <span className="text-xs font-black text-gray-900">{status.progress}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    status.ready ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${status.progress}%` }}
                />
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 pt-2">
              <DetailRow 
                label="Produk" 
                value={status.productsCount} 
                ready={status.productsCount > 0}
              />
              <DetailRow 
                label="Outlet" 
                value={status.outletsCount} 
                ready={status.outletsCount > 0}
              />
              <DetailRow 
                label="User Login" 
                value={status.usersCount} 
                ready={status.usersCount > 0}
              />
            </div>

            {/* Status Message */}
            <div className={`
              p-3 rounded-lg text-xs font-bold
              ${status.ready 
                ? 'bg-green-50 text-green-700 border border-green-100' 
                : 'bg-yellow-50 text-yellow-700 border border-yellow-100'
              }
            `}>
              {status.ready ? (
                <div className="flex items-start gap-2">
                  <CheckCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black">✅ Siap Mode Offline!</p>
                    <p className="text-[10px] opacity-80 mt-1">Semua menu bisa digunakan tanpa internet.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black">⚠️ Belum Siap Offline</p>
                    <p className="text-[10px] opacity-80 mt-1">
                      {status.progress === 0 
                        ? 'Login dan buka menu Kasir untuk cache data.'
                        : 'Tunggu proses caching selesai...'
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Clear Cache Button */}
            <button
              onClick={async () => {
                if (confirm('Clear semua cache dan reload? Data offline akan dihapus.')) {
                  const { clearAllCache, reloadAfterCacheClear } = await import('@/lib/utils/cache-manager');
                  await clearAllCache();
                  reloadAfterCacheClear();
                }
              }}
              className="w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
            >
              🧹 Clear Cache & Reload
            </button>

            {/* Last Updated */}
            {status.seededAt && (
              <p className="text-[9px] text-gray-400 text-center pt-2 border-t border-gray-50">
                Terakhir diperbarui: {new Date(status.seededAt).toLocaleString('id-ID')}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function DetailRow({ label, value, ready }: { label: string; value: number; ready: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-600 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-bold text-gray-900">{value}</span>
        {ready ? (
          <CheckCircle size={14} className="text-green-500" />
        ) : (
          <AlertCircle size={14} className="text-gray-300" />
        )}
      </div>
    </div>
  );
}
