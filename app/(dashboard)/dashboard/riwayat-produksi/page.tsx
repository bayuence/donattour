// ============================================================================
// RIWAYAT PRODUKSI PAGE (MANAGEMENT)
// ============================================================================
// File: app/dashboard/riwayat-produksi/page.tsx
// Description: Halaman riwayat produksi untuk Owner/Management — menampilkan
//              analytics produksi seluruh outlet tanpa fitur input
// ============================================================================

'use client';

import { ProductionAnalytics } from '../input-produksi/components/ProductionAnalytics';

export default function RiwayatProduksiPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
              Riwayat Produksi
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Analitik dan riwayat produksi per outlet — khusus manajemen
            </p>
          </div>
        </div>
      </div>

      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        <ProductionAnalytics />
      </div>
    </div>
  );
}
