'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/auth-context';
import { useEffect } from 'react';

/**
 * Root Page
 * 
 * Smart redirect based on authentication:
 * - Authenticated users → /dashboard/kasir
 * - Unauthenticated users → /katalog (public catalog)
 */
export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        router.push('/dashboard/kasir');
      } else {
        router.push('/katalog');
      }
    }
  }, [isAuthenticated, user, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="text-center">
        <div className="mb-4 text-6xl">🍩</div>
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600">Loading Donattour...</p>
      </div>
    </div>
  );
}

