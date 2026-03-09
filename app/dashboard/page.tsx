'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/kasir');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-gray-400">Mengalihkan ke Kasir...</p>
    </div>
  );
}
