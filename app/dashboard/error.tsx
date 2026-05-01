'use client';

import { useEffect } from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard Error:', error);
    // TODO: Send to error tracking service
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
          <AlertTriangle size={32} className="text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
          Error di Dashboard
        </h2>
        
        <p className="text-slate-600 text-center mb-6">
          {error.message || 'Terjadi kesalahan saat memuat dashboard. Silakan coba lagi.'}
        </p>
        
        {error.digest && (
          <p className="text-xs text-slate-400 text-center mb-6">
            Error ID: {error.digest}
          </p>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
          >
            <Home size={18} />
            Dashboard
          </button>
          <button
            onClick={reset}
            className="flex-1 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Coba Lagi
          </button>
        </div>
      </div>
    </div>
  );
}
