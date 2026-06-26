'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function PreloadButton() {
  const [isPreloading, setIsPreloading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'pages' | 'apis'>('pages');

  const handlePreload = async () => {
    if (isPreloading) return;

    if (!navigator.onLine) {
      toast.error('❌ Tidak ada koneksi internet');
      return;
    }

    setIsPreloading(true);
    setProgress(0);
    setStage('pages');
    const toastId = toast.loading('📥 Mempersiapkan offline...', {
      description: 'Jangan tutup halaman',
    });

    try {
      const registration = await navigator.serviceWorker.ready;

      if (!registration.active) {
        throw new Error('Service Worker tidak aktif');
      }

      // Start preload pages
      registration.active.postMessage({
        type: 'PRELOAD_ALL_PAGES',
      });

      // Wait for completion
      let completed = false;
      const timeout = setTimeout(() => {
        if (!completed) {
          toast.dismiss(toastId);
          toast.error('⏱️ Preload timeout');
          setIsPreloading(false);
          setProgress(0);
        }
      }, 300000); // 5 menit max

      const listener = (event: MessageEvent) => {
        // Handle progress updates
        if (event.data.type === 'PRELOAD_PROGRESS') {
          setProgress(event.data.percentage);
          setStage(event.data.stage);
          toast.dismiss(toastId);
          toast.loading(
            `📥 Mempersiapkan ${event.data.stage === 'pages' ? 'halaman' : 'data'}...`,
            {
              description: `${event.data.percentage}% (${event.data.current}/${event.data.total})`,
            }
          );
        }

        // Handle completion
        if (event.data.type === 'PRELOAD_APIS_COMPLETE') {
          clearTimeout(timeout);
          completed = true;

          localStorage.setItem('offline_preload_done', 'true');
          localStorage.setItem('offline_preload_time', new Date().toISOString());

          toast.dismiss(toastId);
          toast.success('✅ Offline siap!', {
            description: 'Semua data sudah di-cache',
            duration: 5000,
          });

          setIsComplete(true);
          setIsPreloading(false);
          setProgress(100);

          navigator.serviceWorker.removeEventListener('message', listener);

          // Reset button after 3 detik
          setTimeout(() => setIsComplete(false), 3000);
        }
      };

      navigator.serviceWorker.addEventListener('message', listener);

      // Trigger API preload setelah pages selesai
      setTimeout(() => {
        registration.active?.postMessage({
          type: 'PRELOAD_ALL_APIS',
        });
      }, 5000);

    } catch (error) {
      console.error('Preload error:', error);
      toast.error('❌ Preload gagal');
      setIsPreloading(false);
      setProgress(0);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <button
        onClick={handlePreload}
        disabled={isPreloading}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg font-medium
          transition-all text-sm
          ${isComplete
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-orange-500 hover:bg-orange-600 text-white'
          }
          ${isPreloading ? 'opacity-75 cursor-not-allowed' : ''}
        `}
        title={isComplete ? 'Offline siap!' : 'Siapkan offline'}
      >
        {isPreloading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Preload...</span>
          </>
        ) : isComplete ? (
          <>
            <CheckCircle className="h-4 w-4" />
            <span>Siap</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>Preload</span>
          </>
        )}
      </button>

      {/* Progress bar */}
      {isPreloading && (
        <div className="flex flex-col gap-1">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-500 to-orange-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 text-center">
            {progress}% - {stage === 'pages' ? 'Loading halaman...' : 'Loading data API...'}
          </p>
        </div>
      )}
    </div>
  );
}