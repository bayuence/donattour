'use client';

import { Lock, Package, CheckCircle2 } from 'lucide-react';
import type { Outlet, Product } from '@/lib/types';
import type { DashboardData } from '../types';
import { ClosingReviewModal } from '@/components/closing/ClosingReviewModal';

interface ClosingOperationalSectionProps {
  dashboardData: DashboardData;
  selectedOutlet: Outlet;
  products: Product[];
  showFinishedProductsRecap: boolean;
  showClosingInline: boolean;
  setShowFinishedProductsRecap: (show: boolean) => void;
  setShowClosingInline: (show: boolean) => void;
  onClosingSuccess: () => void;
}

export function ClosingOperationalSection({
  dashboardData,
  selectedOutlet,
  showClosingInline,
  setShowClosingInline,
  setShowFinishedProductsRecap,
  onClosingSuccess
}: ClosingOperationalSectionProps) {
  return (
    <div id="closing-section" className="bg-white border rounded-xl overflow-hidden">

      {/* Card Header */}
      <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Operasional Penutupan</h2>
            <p className="text-xs text-gray-500">Rekap sisa produk jadi &amp; closing harian outlet</p>
          </div>
        </div>
        {dashboardData.has_closing && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
            <Lock className="w-3 h-3" /> TOKO SUDAH DITUTUP
          </span>
        )}
      </div>

      <div className="p-4 sm:p-6 space-y-4">

        {/* ── STEP 1: Rekap Sisa Produk Jadi ── */}
        <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
          dashboardData.has_closing
            ? 'bg-gray-50 border-gray-100 opacity-60'
            : 'bg-blue-50 border-blue-100 hover:border-blue-200'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 mt-0.5 text-white ${
            dashboardData.has_closing ? 'bg-gray-400' : 'bg-blue-600'
          }`}>
            1
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-gray-900 text-sm">Rekap Sisa Produk Jadi</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Input sisa produk yang sudah di-topping untuk laporan closing
                </p>
              </div>
              <button
                onClick={() => setShowFinishedProductsRecap(true)}
                disabled={dashboardData.has_closing}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shrink-0"
              >
                <Package className="w-3.5 h-3.5" />
                Buka Form Rekap
              </button>
            </div>
          </div>
        </div>

        {/* ── STEP 2: Laporan Closing ── */}
        {showClosingInline ? (
          <div className="rounded-xl border border-red-100 overflow-hidden">
            {/* Step 2 header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-b border-red-100">
              <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-black shrink-0">
                2
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 text-sm">Laporan &amp; Konfirmasi Closing</p>
                <p className="text-xs text-gray-500 mt-0.5">Review data hari ini sebelum menutup toko</p>
              </div>
              <button
                onClick={() => setShowClosingInline(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg transition-colors shrink-0"
                title="Tutup section"
              >
                ✕
              </button>
            </div>
            {/* Inline closing content */}
            <div className="p-4 sm:p-6 bg-white">
              <ClosingReviewModal
                isOpen={true}
                onClose={() => setShowClosingInline(false)}
                outletId={selectedOutlet.id}
                outletName={selectedOutlet.nama}
                inlineMode={true}
                onClosingSuccess={onClosingSuccess}
              />
            </div>
          </div>
        ) : (
          <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
            dashboardData.has_closing
              ? 'bg-blue-50 border-blue-100'
              : dashboardData.is_kasir_locked 
                ? 'bg-amber-50 border-amber-100 hover:border-amber-200'
                : 'bg-gray-50 border-gray-100'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white ${
              dashboardData.has_closing 
                ? 'bg-blue-600' 
                : dashboardData.is_kasir_locked
                  ? 'bg-amber-600'
                  : 'bg-gray-300'
            }`}>
              {dashboardData.has_closing
                ? <CheckCircle2 className="w-4 h-4" />
                : <span className="text-sm font-black">2</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900 text-sm">Laporan &amp; Konfirmasi Closing</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {dashboardData.has_closing
                      ? '✅ Toko sudah berhasil ditutup untuk hari ini.'
                      : dashboardData.is_kasir_locked
                        ? '⚠️ Kasir sudah dikunci. Silakan lakukan rekap sisa produk (Step 1) lalu klik tombol di samping untuk memulai closing.'
                        : '💡 Klik tombol "Tutup Kasir" di header untuk mengunci kasir terlebih dahulu sebelum melakukan closing.'}
                  </p>
                </div>
                {/* Tombol Buka Form Closing - hanya muncul jika kasir sudah dikunci tapi belum closing */}
                {dashboardData.is_kasir_locked && !dashboardData.has_closing && (
                  <button
                    onClick={() => setShowClosingInline(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all shadow-sm shrink-0"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Buka Form Closing
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
