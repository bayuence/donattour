'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, Package, XCircle, AlertTriangle, Activity, BarChart2,
  Receipt, FileText, MapPin, Store, ChevronRight, RefreshCw,
  Wifi, WifiOff, CheckCircle2, DollarSign, PieChart, CreditCard, Users, Lock, Unlock
} from 'lucide-react';
import { getActiveOutlets } from '@/lib/db/outlets';
import { supabase } from '@/lib/supabase/client';
import { getTodayWIB } from '@/lib/utils/timezone';
import { toast } from 'sonner';
import type { Outlet, Product } from '@/lib/types';
import { FinishedProductsRecapForm } from '@/components/pos';
import { ClosingReviewModal } from '@/components/closing/ClosingReviewModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  financial_summary: {
    omzet: number;
    hpp_sold: number;
    total_loss: number;
    gross_profit: number;
    margin: number;
  };
  production_sales: {
    target: number;
    success: number;
    waste: number;
    sold: number;
    remaining: number;
    success_rate: number;
    waste_rate: number;
    sold_rate: number;
    remaining_rate: number;
  };
  sales_by_product: Array<{
    product_id: string;
    product_name: string;
    qty: number;
    revenue: number;
    percentage: number;
  }>;
  payment_methods: Array<{
    method: string;
    count: number;
    total: number;
  }>;
  transaction_count: number;
  average_order_value: number;
  loss_breakdown: {
    production_waste: { amount: number; percentage: number };
    topping_error: { amount: number; percentage: number };
    non_topping_expired: { amount: number; percentage: number };
    finished_product_reject: { amount: number; percentage: number };
  };
  has_closing: boolean;
}

interface ExpenseItem {
  id: string;
  kategori: string;
  keterangan: string;
  jumlah: number;
  created_at: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LaporanOutletPage() {
  // Outlet state
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [loadingOutlets, setLoadingOutlets] = useState(true);

  // Data state
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showFinishedProductsRecap, setShowFinishedProductsRecap] = useState(false);
  const [showTutupConfirm, setShowTutupConfirm] = useState(false);
  const [showClosingInline, setShowClosingInline] = useState(false);

  // Realtime state
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Ticking Clock state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Refs
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const today = getTodayWIB();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tanggalHariIni = currentTime.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta',
  });

  // ─── Fetch Data ─────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (outlet: Outlet) => {
    setLoadingData(true);
    setError(null);
    try {
      const today = getTodayWIB();
      
      // Fetch products if empty
      if (products.length === 0) {
        const { data: prodData } = await supabase.from('products').select('*').eq('is_active', true);
        if (prodData) setProducts(prodData as Product[]);
      }

      // 1. Fetch dashboard APIsummary (production + sales data)
      const dashRes = await fetch(
        `/api/dashboard/daily?outlet_id=${outlet.id}&date=${today}`,
        { cache: 'no-store' }
      );
      const dashJson = await dashRes.json();
      if (dashJson.success && dashJson.data) {
        const data = dashJson.data as DashboardData;
        
        // Cek status closing secara client-side untuk menghindari isu sinkronisasi cookies/RLS di Server API
        const { data: closingData } = await supabase
          .from('daily_closing')
          .select('id')
          .eq('outlet_id', outlet.id)
          .eq('tanggal', today)
          .limit(1)
          .single();
          
        data.has_closing = !!closingData;
        setDashboardData(data);
      }

      // 2. Fetch expenses directly via supabase client (realtime-ready)
      const { data: expData, error: expErr } = await (supabase as any)
        .from('expenses')
        .select('id, kategori, keterangan, jumlah, created_at')
        .eq('outlet_id', outlet.id)
        .eq('tanggal', today)
        .order('created_at', { ascending: false });

      if (!expErr && expData) {
        setExpenses(expData as ExpenseItem[]);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('[LaporanOutlet] fetchData error:', err);
      setError('Gagal memuat data. Periksa koneksi Anda.');
    } finally {
      setLoadingData(false);
    }
  }, [today]);

  // ─── Realtime Subscription ──────────────────────────────────────────────────

  const setupRealtime = useCallback((outlet: Outlet) => {
    // Remove previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`laporan-harian-${outlet.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'production_daily', filter: `outlet_id=eq.${outlet.id}` },
        () => { fetchData(outlet); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `outlet_id=eq.${outlet.id}` },
        () => { fetchData(outlet); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_closing', filter: `outlet_id=eq.${outlet.id}` },
        () => { fetchData(outlet); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `outlet_id=eq.${outlet.id}` },
        () => { fetchData(outlet); }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
  }, [fetchData]);

  // ─── Load Outlets on Mount ───────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      setLoadingOutlets(true);
      const data = await getActiveOutlets();
      setOutlets(data);
      setLoadingOutlets(false);

      if (data.length === 1) {
        // Auto-select if only 1 outlet
        setSelectedOutlet(data[0]);
      } else if (data.length > 1) {
        // Prompt user to choose
        setShowOutletModal(true);
      }
    })();
  }, []);

  // ─── When Outlet Changes, Fetch + Subscribe ─────────────────────────────────

  useEffect(() => {
    if (!selectedOutlet) return;

    fetchData(selectedOutlet);
    setupRealtime(selectedOutlet);

    // Auto-refresh every 30 seconds as fallback
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    refreshTimerRef.current = setInterval(() => {
      fetchData(selectedOutlet);
    }, 30_000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedOutlet]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectOutlet = (outlet: Outlet) => {
    setSelectedOutlet(outlet);
    setShowOutletModal(false);
    setDashboardData(null);
    setExpenses([]);
    setError(null);
  };

  // ─── Derived Values ──────────────────────────────────────────────────────────

  const totalPengeluaran = expenses.reduce((s, e) => s + (e.jumlah || 0), 0);
  const omzet = dashboardData?.financial_summary.omzet ?? 0;
  const labaBersih = omzet - totalPengeluaran;
  const labaKotor = dashboardData?.financial_summary.gross_profit ?? 0;
  const successRate = dashboardData?.production_sales.success_rate ?? 0;

  // Aggregate expenses by category
  const expenseCategories = expenses.reduce((acc, curr) => {
    const cat = curr.kategori || 'Lainnya';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += curr.jumlah;
    return acc;
  }, {} as Record<string, number>);
  const sortedExpenseCategories = Object.entries(expenseCategories).sort((a, b) => b[1] - a[1]);

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

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ══════════════════════════════════════════════════════════
          OUTLET SELECTION MODAL
      ══════════════════════════════════════════════════════════ */}
      {showOutletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold leading-tight">Pilih Outlet</h2>
                  <p className="text-orange-100 text-sm mt-0.5">
                    Laporan akan ditampilkan untuk outlet yang dipilih
                  </p>
                </div>
              </div>
            </div>

            {/* Outlet List */}
            <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
              {outlets.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Store className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-700 font-semibold">Belum ada outlet aktif</p>
                  <p className="text-gray-400 text-sm mt-1">Tambahkan outlet di menu Kelola Outlet</p>
                </div>
              ) : (
                outlets.map((outlet) => (
                  <button
                    key={outlet.id}
                    onClick={() => handleSelectOutlet(outlet)}
                    className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-orange-400 hover:bg-orange-50 transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className="w-10 h-10 bg-orange-100 group-hover:bg-orange-200 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                        <Store className="w-5 h-5 text-orange-600" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-900 group-hover:text-orange-700 transition-colors">
                            {outlet.nama}
                          </p>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${outlet.status === 'aktif' ? 'bg-green-500' : 'bg-red-400'}`} />
                        </div>
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {outlet.alamat}
                        </p>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="px-4 pb-4">
              <p className="text-center text-xs text-gray-400">
                {outlets.length > 0 ? `${outlets.length} outlet aktif tersedia` : 'Kelola outlet di menu Kelola Outlet'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          STICKY HEADER
      ══════════════════════════════════════════════════════════ */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">

            {/* Title Area */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                  Laporan Harian Outlet
                </h1>

                {/* LIVE Badge */}
                {isLive && selectedOutlet && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 border border-green-200 text-green-700 text-xs font-bold shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    LIVE
                  </span>
                )}
                {!isLive && selectedOutlet && !loadingData && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs shadow-sm">
                    <WifiOff className="w-3 h-3" />
                    Offline
                  </span>
                )}

                {/* Closing Status */}
                {dashboardData && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold shadow-sm ${
                    dashboardData.has_closing 
                      ? 'bg-red-50 border-red-200 text-red-700' 
                      : 'bg-green-50 border-green-200 text-green-700'
                  }`}>
                    {dashboardData.has_closing ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {dashboardData.has_closing ? 'CLOSE' : 'OPEN'}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <p className="text-xs sm:text-sm text-gray-500 font-medium">
                  {tanggalHariIni}
                </p>
                <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-md">
                  {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                {lastUpdated && (
                  <span className="text-[10px] text-gray-400 ml-1">
                    (Update terakhir: {lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">

              {/* Buka/Tutup Toko Actions */}
              {selectedOutlet && dashboardData && (
                <>
                  {dashboardData.has_closing ? (
                    <button
                      onClick={async () => {
                        if (confirm('Yakin ingin membuka kembali akses Kasir untuk outlet ini?')) {
                          try {
                            const today = getTodayWIB();
                            await supabase.from('daily_closing').delete()
                              .eq('outlet_id', selectedOutlet.id)
                              .eq('tanggal', today);
                            setDashboardData({ ...dashboardData, has_closing: false });
                            toast.success('Akses Kasir berhasil dibuka kembali!');
                          } catch (err: any) {
                            toast.error('Gagal membuka kasir: ' + err.message);
                          }
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-green-500 text-white shadow-sm shadow-green-500/30 hover:bg-green-600"
                    >
                      <Unlock className="w-4 h-4" />
                      <span className="hidden md:inline">Buka Kasir</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowTutupConfirm(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-red-500 text-white shadow-sm shadow-red-500/30 hover:bg-red-600"
                    >
                      <Lock className="w-4 h-4" />
                      <span className="hidden md:inline">Tutup Kasir</span>
                    </button>
                  )}
                </>
              )}

              {/* Outlet Selector */}
              <button
                onClick={() => setShowOutletModal(true)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border transition-all text-sm font-semibold ${
                  selectedOutlet
                    ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                    : 'bg-orange-500 border-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                <Store className="w-4 h-4 flex-shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">
                  {selectedOutlet ? selectedOutlet.nama : 'Pilih Outlet'}
                </span>
                <ChevronRight className="w-4 h-4 flex-shrink-0 rotate-90" />
              </button>

              {/* Refresh */}
              {selectedOutlet && (
                <button
                  onClick={() => fetchData(selectedOutlet)}
                  disabled={loadingData}
                  title="Refresh data"
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-600 ${loadingData ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

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
                onClick={() => fetchData(selectedOutlet)}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">

                {/* Pendapatan */}
                <div className="bg-white border rounded-xl p-4 sm:p-5 md:p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -translate-y-8 translate-x-8 opacity-60" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Receipt className="w-4 h-4 text-blue-700" />
                      </div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pendapatan</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{rp(omzet)}</p>
                    <div className="flex flex-col gap-1 mt-2">
                      <p className="text-xs text-gray-600 flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5" />
                        {dashboardData.transaction_count} Pelanggan
                      </p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Rata-rata: {rp(dashboardData.average_order_value)} / struk
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pengeluaran */}
                <div className="bg-white border rounded-xl p-4 sm:p-5 md:p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -translate-y-8 translate-x-8 opacity-60" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-red-700" />
                      </div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pengeluaran</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{rp(totalPengeluaran)}</p>
                    <p className="text-xs text-gray-500">{expenses.length} transaksi</p>
                  </div>
                </div>

                {/* Laba Kotor */}
                <div className="bg-white border rounded-xl p-4 sm:p-5 md:p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -translate-y-8 translate-x-8 opacity-60" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Activity className="w-4 h-4 text-amber-700" />
                        </div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Laba Kotor</span>
                      </div>
                      {/* Breakdown Loss tooltip/trigger could go here, but for now we list it below */}
                    </div>
                    <p className={`text-xl sm:text-2xl font-bold mb-1 ${labaKotor >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      {rp(labaKotor)}
                    </p>
                    <p className="text-xs text-gray-500 mb-2">Setelah HPP · margin {dashboardData.financial_summary.margin.toFixed(1)}%</p>
                    
                    {dashboardData.financial_summary.total_loss > 0 && (
                      <div className="pt-2 mt-2 border-t border-dashed border-gray-200">
                        <p className="text-[10px] text-red-500 font-bold mb-1">RUGI PRODUKSI (WASTE): {rp(dashboardData.financial_summary.total_loss)}</p>
                        <div className="flex gap-2 flex-wrap text-[9px] text-gray-500">
                          {dashboardData.loss_breakdown.production_waste.amount > 0 && <span>Gagal Goreng: {rp(dashboardData.loss_breakdown.production_waste.amount)}</span>}
                          {dashboardData.loss_breakdown.topping_error.amount > 0 && <span>Gagal Topping: {rp(dashboardData.loss_breakdown.topping_error.amount)}</span>}
                          {dashboardData.loss_breakdown.non_topping_expired.amount > 0 && <span>Basi: {rp(dashboardData.loss_breakdown.non_topping_expired.amount)}</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Laba Bersih */}
                <div className="bg-white border rounded-xl p-4 sm:p-5 md:p-6 relative overflow-hidden">
                  <div className={`absolute top-0 right-0 w-24 h-24 ${labaBersih >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-full -translate-y-8 translate-x-8 opacity-60`} />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-9 h-9 ${labaBersih >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <BarChart2 className={`w-4 h-4 ${labaBersih >= 0 ? 'text-green-700' : 'text-red-700'}`} />
                      </div>
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Laba Bersih</span>
                    </div>
                    <p className={`text-xl sm:text-2xl font-bold mb-1 ${labaBersih >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                      {rp(labaBersih)}
                    </p>
                    <p className="text-xs text-gray-500">Setelah semua biaya</p>
                  </div>
                </div>
              </div>

              {/* ── Production Metrics ── */}
              <div className="bg-white border rounded-xl">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b flex items-center justify-between">
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">Metrik Produksi &amp; Operasional</h2>
                  {loadingData && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Memperbarui...
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
                    {[
                      {
                        icon: <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />,
                        bg: 'bg-gray-100',
                        value: dashboardData.production_sales.target,
                        label: 'Diproduksi',
                      },
                      {
                        icon: <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />,
                        bg: 'bg-green-100',
                        value: dashboardData.production_sales.sold,
                        label: 'Terjual',
                      },
                      {
                        icon: <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />,
                        bg: 'bg-red-100',
                        value: dashboardData.production_sales.waste,
                        label: 'Gagal Produksi',
                      },
                      {
                        icon: <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />,
                        bg: 'bg-amber-100',
                        value: Math.max(0, dashboardData.production_sales.success - dashboardData.production_sales.sold),
                        label: 'Batal Beli',
                      },
                      {
                        icon: <Package className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />,
                        bg: 'bg-purple-100',
                        value: dashboardData.production_sales.remaining,
                        label: 'Sisa',
                      },
                      {
                        icon: <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />,
                        bg: 'bg-blue-100',
                        value: `${successRate.toFixed(1)}%`,
                        label: 'Success Rate',
                      },
                    ].map((item, i) => (
                      <div key={i} className="text-center">
                        <div className={`inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 ${item.bg} rounded-xl mb-2 sm:mb-3`}>
                          {item.icon}
                        </div>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900">{item.value}</p>
                        <p className="text-[10px] sm:text-xs text-gray-500 mt-1 uppercase tracking-wide leading-tight">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Success Rate Bar */}
                  <div className="mt-6 pt-5 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs sm:text-sm font-semibold text-gray-700">
                        Success Rate (Terjual / Diproduksi)
                      </span>
                      <span className={`text-xs sm:text-sm font-bold ${successRate >= 80 ? 'text-green-600' : successRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {successRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 sm:h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${successRate >= 80 ? 'bg-green-500' : successRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(successRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Sales & Payment Methods Grid ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                
                {/* ── Payment Methods ── */}
                <div className="bg-white border rounded-xl overflow-hidden lg:col-span-1 flex flex-col">
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
                    <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-500" />
                      Uang Masuk (Kasir)
                    </h2>
                  </div>
                  
                  <div className="p-4 sm:p-6 flex-1">
                    {dashboardData.payment_methods.length > 0 ? (
                      <div className="space-y-4">
                        {dashboardData.payment_methods.map((pm, idx) => {
                          const pct = omzet > 0 ? (pm.total / omzet) * 100 : 0;
                          return (
                            <div key={idx} className="relative">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                  {pm.method === 'Tunai' ? '💵 Tunai' : pm.method === 'QRIS' ? '📱 QRIS' : '💳 Transfer'}
                                  <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md font-normal">{pm.count}x</span>
                                </span>
                                <span className="text-sm font-bold text-gray-900">{rp(pm.total)}</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pm.method === 'Tunai' ? 'bg-green-500' : pm.method === 'QRIS' ? 'bg-blue-500' : 'bg-purple-500'}`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        
                        <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Uang fisik yang harus ada di Laci Kasir:</p>
                          <p className="text-xl font-black text-green-600">
                            {rp(dashboardData.payment_methods.find(p => p.method === 'Tunai')?.total || 0)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        Belum ada transaksi pembayaran
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Sales by Product ── */}
                <div className="bg-white border rounded-xl overflow-hidden lg:col-span-2">
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">Performa Produk (Terjual)</h2>
                  </div>

                  {dashboardData.sales_by_product.length > 0 ? (
                    <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                      <table className="w-full min-w-[480px]">
                        <thead className="bg-gray-50 border-b sticky top-0 z-10">
                          <tr>
                            <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Produk</th>
                            <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Terjual</th>
                            <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Revenue</th>
                            <th className="hidden sm:table-cell px-4 md:px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Kontribusi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {dashboardData.sales_by_product.map((p, idx) => (
                            <tr key={p.product_id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 md:px-6 py-3 sm:py-4">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="text-xs sm:text-sm font-medium text-gray-900">{p.product_name}</span>
                                </div>
                              </td>
                              <td className="px-4 md:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-medium text-gray-900">
                                {p.qty}
                              </td>
                              <td className="px-4 md:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-gray-900">
                                {rp(p.revenue)}
                              </td>
                              <td className="hidden sm:table-cell px-4 md:px-6 py-3 sm:py-4 text-right">
                                <span className={`text-xs sm:text-sm font-semibold ${p.percentage >= 30 ? 'text-green-600' : p.percentage >= 15 ? 'text-amber-600' : 'text-gray-500'}`}>
                                  {p.percentage.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-10 text-center">
                      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Package className="w-7 h-7 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-semibold">Belum ada penjualan hari ini</p>
                      <p className="text-gray-400 text-sm mt-1 flex items-center justify-center gap-1">
                        <Wifi className="w-3.5 h-3.5" />
                        Data akan muncul otomatis saat ada transaksi
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Expense Breakdown ── */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
                
                {/* ── Expense Categories ── */}
                <div className="bg-white border rounded-xl overflow-hidden lg:col-span-1">
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
                    <h2 className="text-sm sm:text-base font-bold text-gray-900 flex items-center gap-2">
                      <PieChart className="w-4 h-4 text-gray-500" />
                      Rekap Kategori
                    </h2>
                  </div>
                  <div className="p-4 sm:p-6 space-y-4">
                    {sortedExpenseCategories.length > 0 ? (
                      sortedExpenseCategories.map(([cat, total], idx) => {
                        const pct = (total / totalPengeluaran) * 100;
                        return (
                          <div key={idx}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-semibold text-gray-700 capitalize">{cat.replace(/_/g, ' ')}</span>
                              <span className="font-bold text-gray-900">{rp(total)}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-red-400 h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">Belum ada data</p>
                    )}
                  </div>
                </div>

                {/* ── Expense List ── */}
                <div className="bg-white border rounded-xl overflow-hidden lg:col-span-3">
                  <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">Rincian Transaksi Pengeluaran</h2>
                  </div>

                  {expenses.length > 0 ? (
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full min-w-[360px]">
                        <thead className="bg-gray-50 border-b sticky top-0 z-10">
                          <tr>
                            <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
                            <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Keterangan</th>
                            <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Jumlah</th>
                            <th className="hidden sm:table-cell px-4 md:px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">%</th>
                          </tr>
                        </thead>
                      <tbody className="divide-y divide-gray-100">
                        {expenses.map((item) => {
                          const pct = totalPengeluaran > 0 ? (item.jumlah / totalPengeluaran) * 100 : 0;
                          return (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap">
                                <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700 capitalize">
                                  {String(item.kategori || '').replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-700">
                                {item.keterangan}
                              </td>
                              <td className="px-4 md:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-gray-900 whitespace-nowrap">
                                {rp(item.jumlah)}
                              </td>
                              <td className="hidden sm:table-cell px-4 md:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                                {pct.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                        <tr>
                          <td colSpan={2} className="px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-gray-900">
                            Total Pengeluaran
                          </td>
                          <td className="px-4 md:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-bold text-gray-900 whitespace-nowrap">
                            {rp(totalPengeluaran)}
                          </td>
                          <td className="hidden sm:table-cell px-4 md:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-bold text-gray-900">
                            100%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="p-10 text-center">
                    <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Receipt className="w-7 h-7 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-semibold">Belum ada pengeluaran hari ini</p>
                    <p className="text-gray-400 text-sm mt-1 flex items-center justify-center gap-1">
                      <Wifi className="w-3.5 h-3.5" />
                      Data akan muncul otomatis setelah ada input pengeluaran
                    </p>
                  </div>
                )}
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════
                  OPERASIONAL PENUTUPAN — Rekap Sisa + Closing Inline
              ══════════════════════════════════════════════════════════ */}
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
                          onClosingSuccess={() => {
                            setShowClosingInline(false);
                            fetchData(selectedOutlet);
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className={`flex items-start gap-4 p-4 rounded-xl border ${
                      dashboardData.has_closing
                        ? 'bg-blue-50 border-blue-100'
                        : 'bg-gray-50 border-gray-100'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white ${
                        dashboardData.has_closing ? 'bg-blue-600' : 'bg-gray-300'
                      }`}>
                        {dashboardData.has_closing
                          ? <CheckCircle2 className="w-4 h-4" />
                          : <span className="text-sm font-black">2</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm">Laporan &amp; Konfirmasi Closing</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {dashboardData.has_closing
                            ? '✅ Toko sudah berhasil ditutup untuk hari ini.'
                            : 'Klik tombol "Tutup Toko" di header untuk memulai proses closing.'}
                        </p>
                      </div>
                    </div>
                  )}

                </div>
              </div>

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
      {showTutupConfirm && selectedOutlet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTutupConfirm(false)}
          />
          {/* Modal Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header gradient */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Tutup Kasir (Mulai Audit)</h3>
                  <p className="text-red-100 text-sm">Kunci transaksi untuk persiapan closing</p>
                </div>
              </div>
            </div>
            {/* Body */}
            <div className="p-6">
              <p className="text-gray-700 text-sm leading-relaxed mb-2">
                Yakin ingin menutup akses transaksi untuk{' '}
                <strong className="text-gray-900">{selectedOutlet.nama}</strong>?
              </p>
              <p className="text-gray-500 text-xs mb-6">
                💡 <strong className="text-gray-700">Kasir akan otomatis terkunci</strong> di semua perangkat untuk mencegah transaksi baru saat Anda sedang mengaudit laporan (Rekap Sisa & Closing).
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTutupConfirm(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    // Lock kasir in database first!
                    try {
                      const today = getTodayWIB();
                      const res = await fetch('/api/closing/lock', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ outlet_id: selectedOutlet.id })
                      });
                      
                      const result = await res.json();
                      if (!result.success) throw new Error(result.error);
                      
                      // Update local state so header button turns green
                      if (dashboardData) {
                        setDashboardData({ ...dashboardData, has_closing: true });
                      }
                      
                      // Lock kasir via BroadcastChannel cross-tab
                      const channel = new BroadcastChannel('kasir-channel');
                      channel.postMessage({ type: 'OUTLET_CLOSED', outlet_id: selectedOutlet.id });
                      channel.close();

                      setShowTutupConfirm(false);
                      setShowClosingInline(true);
                    } catch (error: any) {
                      toast.error('Gagal mengunci kasir: ' + error.message);
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 transition-colors shadow-sm"
                >
                  Ya, Kunci Kasir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
