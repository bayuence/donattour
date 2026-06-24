'use client';

import { useState, useEffect, useRef } from 'react';
import { XCircle, Store } from 'lucide-react';
import { getActiveOutlets } from '@/lib/db/outlets';
import { supabase } from '@/lib/supabase/client';
import { getTodayWIB } from '@/lib/utils/timezone';
import { toast } from 'sonner';
import { useAuth } from '@/lib/context/auth-context';
import type { Outlet } from '@/lib/types';
import { FinishedProductsRecapForm } from '@/components/pos';

// Import komponen yang sudah dipecah
import {
  StickyHeader,
  OutletSelectionModal,
  FinancialSummaryCards,
  ProductionMetrics,
  PaymentMethodsCard,
  SalesByProductTable,
  TopCategoriesCard,
  ExpenseList,
  ClosingConfirmModal,
  ClosingOperationalSection,
  ChannelSalesEntrySection
} from './components';

// Import hooks dan utils
import { useLaporanData, useRealtime } from './utils/hooks';

/**
 * Halaman Laporan Harian Outlet
 * - Menampilkan ringkasan keuangan, produksi, penjualan, dan pengeluaran
 * - Realtime updates via Supabase subscriptions
 * - Proses closing dan rekap sisa produk
 */
export default function LaporanOutletPage() {
  // ─── Auth State ──────────────────────────────────────────────────────────────
  const { user } = useAuth();
  
  // ─── Outlet State ────────────────────────────────────────────────────────────
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [loadingOutlets, setLoadingOutlets] = useState(true);

  // ─── Data State (via custom hook) ────────────────────────────────────────────
  const {
    dashboardData,
    expenses,
    products,
    loadingData,
    error,
    lastUpdated,
    fetchData,
    setDashboardData,
    setError
  } = useLaporanData(selectedOutlet);

  // ─── Modals State ────────────────────────────────────────────────────────────
  const [showFinishedProductsRecap, setShowFinishedProductsRecap] = useState(false);
  const [showTutupConfirm, setShowTutupConfirm] = useState(false);
  const [showClosingInline, setShowClosingInline] = useState(false);

  // ─── Realtime State (via custom hook) ────────────────────────────────────────
  const { isLive } = useRealtime(selectedOutlet, fetchData);

  // ─── Ticking Clock State ─────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // ─── Refs ────────────────────────────────────────────────────────────────────
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Clock Effect ────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ─── Load Outlets on Mount ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingOutlets(true);
      const data = await getActiveOutlets();
      setOutlets(data);
      setLoadingOutlets(false);

      if (data.length === 1) {
        setSelectedOutlet(data[0]);
      } else if (data.length > 1) {
        setShowOutletModal(true);
      }
    })();
  }, []);

  // ─── When Outlet Changes, Fetch + Auto-refresh ───────────────────────────────
  useEffect(() => {
    if (!selectedOutlet) return;

    fetchData(selectedOutlet);

    // Auto-refresh every 30 seconds as fallback
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(() => {
      fetchData(selectedOutlet);
    }, 30_000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [selectedOutlet, fetchData]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleSelectOutlet = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setShowOutletModal(false);
  };

  const handleOpenKasir = async () => {
    if (!selectedOutlet || !dashboardData) return;
    
    if (confirm('Yakin ingin membuka kembali akses Kasir untuk outlet ini?')) {
      try {
        const today = getTodayWIB();
        await supabase.from('daily_closing').delete()
          .eq('outlet_id', selectedOutlet.id)
          .eq('tanggal', today);
        setDashboardData({ ...dashboardData, is_kasir_locked: false, has_closing: false });
        toast.success('Akses Kasir berhasil dibuka kembali!');
      } catch (err: any) {
        toast.error('Gagal membuka kasir: ' + err.message);
      }
    }
  };

  const handleCloseKasir = () => {
    setShowTutupConfirm(true);
  };

  const handleRefresh = () => {
    if (selectedOutlet) {
      fetchData(selectedOutlet);
    }
  };

  const handleClosingSuccess = () => {
    setShowClosingInline(false);
    if (selectedOutlet) {
      fetchData(selectedOutlet);
    }
  };

  // ─── Derived Values ──────────────────────────────────────────────────────────
  const totalPengeluaran = expenses.reduce((s, e) => s + (e.jumlah || 0), 0);
  const omzet = dashboardData?.financial_summary.omzet ?? 0;

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════

  // ─── Loading Outlets ─────────────────────────────────────────────────────────
  if (loadingOutlets) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Memuat daftar outlet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ══════════════════════════════════════════════════════════
          OUTLET SELECTION MODAL
      ══════════════════════════════════════════════════════════ */}
      {showOutletModal && (
        <OutletSelectionModal
          outlets={outlets}
          onSelectOutlet={handleSelectOutlet}
          onClose={() => setShowOutletModal(false)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          STICKY HEADER
      ══════════════════════════════════════════════════════════ */}
      <StickyHeader
        currentTime={currentTime}
        lastUpdated={lastUpdated}
        isLive={isLive}
        selectedOutlet={selectedOutlet}
        dashboardData={dashboardData}
        loadingData={loadingData}
        onSelectOutlet={() => setShowOutletModal(true)}
        onRefresh={handleRefresh}
        onOpenKasir={handleOpenKasir}
        onCloseKasir={handleCloseKasir}
      />

      {/* ══════════════════════════════════════════════════════════
          NO OUTLET — EMPTY STATE
      ══════════════════════════════════════════════════════════ */}
      {!selectedOutlet && !showOutletModal && (
        <div className="flex items-center justify-center min-h-[65vh]">
          <div className="text-center px-6">
            <div className="w-24 h-24 bg-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
              <Store className="w-12 h-12 text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">Pilih Outlet Dulu</h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
              Laporan harian harus difilter berdasarkan outlet agar data yang ditampilkan akurat dan relevan.
            </p>
            <button
              onClick={() => setShowOutletModal(true)}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors shadow-sm"
            >
              Pilih Outlet Sekarang
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MAIN CONTENT (shown only when outlet selected)
      ══════════════════════════════════════════════════════════ */}
      {selectedOutlet && (
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6">

          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button
                onClick={handleRefresh}
                className="text-xs font-bold text-red-600 hover:text-red-800 whitespace-nowrap"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* ── Loading Skeleton ── */}
          {loadingData && !dashboardData && (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Memuat laporan...</p>
                <p className="text-gray-400 text-sm mt-1">{selectedOutlet.nama}</p>
              </div>
            </div>
          )}

          {/* ══ DATA LOADED ══ */}
          {dashboardData && (
            <>
              {/* ── Financial Summary Cards ── */}
              <FinancialSummaryCards 
                dashboardData={dashboardData} 
                expenses={expenses}
                userRole={user?.role}
              />

              <ProductionMetrics 
                dashboardData={dashboardData} 
                loadingData={loadingData} 
              />

              {/* ── Channel Sales Input ── */}
              <ChannelSalesEntrySection
                outletId={selectedOutlet.id}
                onTransactionSuccess={handleRefresh}
              />

              {/* ── Sales & Payment Methods Grid ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <PaymentMethodsCard 
                  dashboardData={dashboardData} 
                  omzet={omzet} 
                />
                <SalesByProductTable 
                  dashboardData={dashboardData} 
                />
              </div>

              {/* ── Expense Breakdown ── */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                <TopCategoriesCard 
                  dashboardData={dashboardData}
                />
                <ExpenseList 
                  expenses={expenses} 
                  totalPengeluaran={totalPengeluaran} 
                />
              </div>

              {/* ══════════════════════════════════════════════════════════
                  OPERASIONAL PENUTUPAN — Rekap Sisa + Closing Inline
              ══════════════════════════════════════════════════════════ */}
              <ClosingOperationalSection
                dashboardData={dashboardData}
                selectedOutlet={selectedOutlet}
                products={products}
                showFinishedProductsRecap={showFinishedProductsRecap}
                showClosingInline={showClosingInline}
                setShowFinishedProductsRecap={setShowFinishedProductsRecap}
                setShowClosingInline={setShowClosingInline}
                onClosingSuccess={handleClosingSuccess}
              />
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════ */}
      
      {/* FINISHED PRODUCTS RECAP FORM */}
      {selectedOutlet && (
        <FinishedProductsRecapForm
          isOpen={showFinishedProductsRecap}
          onClose={() => setShowFinishedProductsRecap(false)}
          outletId={selectedOutlet.id}
          products={products}
        />
      )}

      {/* ══ KONFIRMASI TUTUP TOKO ══ */}
      {selectedOutlet && dashboardData && (
        <ClosingConfirmModal
          showTutupConfirm={showTutupConfirm}
          selectedOutlet={selectedOutlet}
          dashboardData={dashboardData}
          onClose={() => setShowTutupConfirm(false)}
          onConfirm={() => {}}
          setDashboardData={setDashboardData}
        />
      )}
      
    </div>
  );
}
