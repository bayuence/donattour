'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Offline status indicator - FIXED POSITION at top of sidebar
 * ALWAYS VISIBLE, NEVER CUT OFF
 */
export function OfflineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check initial status
    setIsOnline(navigator.onLine);
    const isPreloaded = localStorage.getItem('offline_preload_done') === 'true';
    setIsPreloaded(isPreloaded);

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('✅ Online', {
        description: 'Koneksi internet tersedia',
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('📡 Offline', {
        description: 'Anda sedang offline - menggunakan data cache',
        duration: 3000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-2 px-3 py-3 bg-white rounded-lg border-2 border-gray-300 shadow-md sticky top-0 z-10">
      {/* Big Status Indicator - VERY VISIBLE */}
      <div className="flex items-center justify-between gap-3">
        {isOnline ? (
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 flex-shrink-0">
              <Wifi className="h-5 w-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-green-700">🟢 ONLINE</p>
              <p className="text-xs text-green-600 truncate">Koneksi aktif</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 flex-shrink-0 animate-pulse">
              <WifiOff className="h-5 w-5 text-orange-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-orange-700">🔴 OFFLINE</p>
              <p className="text-xs text-orange-600 truncate">Data cache lokal</p>
            </div>
          </div>
        )}
      </div>

      {/* Preload Status - CLEAR - Only show when ready */}
      {isPreloaded && (
        <div className="flex items-center gap-2 pt-2 border-t-2 border-gray-300">
          <div className="flex items-center gap-2 flex-1">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-green-700">✅ Siap Offline</p>
              <p className="text-[10px] text-gray-600 truncate">Data sudah di-cache</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}