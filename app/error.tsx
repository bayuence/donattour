'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
    // TODO: Send to error tracking service (Sentry, LogRocket, etc)
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
          <AlertTriangle size={32} className="text-red-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
          Terjadi Kesalahan
        </h2>
        
        <p className="text-slate-600 text-center mb-6">
          {error.message || 'Aplikasi mengalami error. Silakan coba lagi atau hubungi support.'}
        </p>
        
        {error.digest && (
          <p className="text-xs text-slate-400 text-center mb-6">
            Error ID: {error.digest}
          </p>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex-1 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
          >
            Ke Dashboard
          </button>
          <button
            onClick={reset}
            className="flex-1 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    </div>
  );
}
