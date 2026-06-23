"use client";

import { useState, useEffect } from "react";
import { Loader2, ShoppingCart, AlertTriangle } from "lucide-react";
const Icons = { Loader2, ShoppingCart, AlertTriangle };
import { useKasirWithOffline } from "./hooks/useKasirWithOffline";
import { OfflineIndicator } from "@/components/offline/offline-indicator";
import { clearOfflineDeductions } from "@/lib/offline/local-stock";
import OutletPicker from "./components/OutletPicker";
import KasirHeader from "./components/KasirHeader";
import MenuPanel from "./components/MenuPanel";
import CartPanel from "./components/CartPanel";
import PaymentMethodSelector from "./components/PaymentMethodSelector";
import CashPaymentModal from "./components/CashPaymentModal";
import ReceiptModal from "./components/ReceiptModal";
import PaketModal from "./components/PaketModal";
import CashierModal from "./components/CashierModal";
import PaymentProcessingOverlay from "./components/PaymentProcessingOverlay";
import { bluetoothPrinter } from "@/lib/bluetooth-printer";
import { useStockValidation } from "@/lib/hooks/useStockValidation";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { supabase } from "@/lib/supabase/client";
import { getTodayWIB } from "@/lib/utils/timezone";
import { toast } from "sonner";

export default function KasirPage() {
  const k = useKasirWithOffline(); // ✅ Use offline-enabled hook
  const queryClient = useQueryClient();

  // ═══ CLOSING & AUTO-CLOSE STATE ═══
  const [hasClosing, setHasClosing] = useState<boolean | null>(null);
  const [warningLevel, setWarningLevel] = useState<0 | 1 | 2>(0); // 0: none, 1: yellow, 2: red

  // ═══ PAYMENT PROCESSING STATE ═══
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // ═══ STOCK VALIDATION ═══
  // Validasi stok sebelum kasir bisa operasi
  const {
    data: stockValidation,
    isLoading: isLoadingValidation,
    isError: isErrorValidation,
    refetch: refetchValidation,
    isRefetching: isRefetchingValidation,
  } = useStockValidation(
    k.outlet?.id || "",
    undefined, // tanggal (default: today)
    !!k.outlet, // enabled only if outlet selected
  );

  // Bluetooth printer state
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState("");

  // ═══ CART COLLAPSE STATE ═══
  // true = collapsed (icon only), false = full panel
  const [cartCollapsed, setCartCollapsed] = useState(false);

  // ═══ PAYMENT METHOD SELECTION STATE ═══
  const [showOtherMethods, setShowOtherMethods] = useState(false);

  // ═══ INTERCEPT PROSES BAYAR UNTUK LOADING OVERLAY ═══
  const handleProsesBayar = async (methodId?: string) => {
    setIsProcessingPayment(true);
    try {
      await k.prosesBayar(methodId);
    } finally {
      // Hilangkan loading SEGERA tanpa delay
      setIsProcessingPayment(false);
    }
  };

  // Auto-collapse cart ketika viewport kecil (split-screen), expand saat layar penuh
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 640 && w < 1100) {
        // Layar tablet kecil / split-screen sempit → auto collapse
        setCartCollapsed(true);
      } else if (w >= 1100) {
        // Layar cukup lebar (setengah layar desktop 1920px = ~960px) → expand cart
        setCartCollapsed(false);
      }
      // di bawah 640px = mobile, cart menggunakan pop-up (diatur di bagian UI)
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ═══ REFETCH STOK OTOMATIS SETELAH TRANSAKSI SELESAI ═══
  // Saat struk muncul = transaksi baru saja berhasil → langsung perbarui stok
  useEffect(() => {
    if (k.showStruk) {
      // ✅ CRITICAL FIX: Hapus cache lama + refetch SEGERA setelah order berhasil
      const refreshStock = async () => {
        console.log("🔄 [REFETCH] Transaksi selesai, memperbarui stok...");
        
        // 1. REMOVE cache lama (bukan invalidate) agar paksa fetch fresh
        queryClient.removeQueries({
          queryKey: queryKeys.inventory.validation(k.outlet?.id || "", undefined),
        });
        queryClient.removeQueries({
          queryKey: queryKeys.inventory.all,
        });
        
        // 2. Tunggu 150ms agar database update selesai (safety buffer)
        await new Promise(resolve => setTimeout(resolve, 150));
        
        // 3. Paksa refetch data fresh dari server
        const result = await refetchValidation();
        console.log("✅ [REFETCH] Stok berhasil diperbarui:", result.data?.stock_summary);
        
        // 4. Fallback: Jadwalkan refetch kedua 1.5 detik kemudian (untuk multi-region sync)
        setTimeout(async () => {
          console.log("🔄 [REFETCH] Fallback refetch untuk sinkronisasi...");
          queryClient.removeQueries({
            queryKey: queryKeys.inventory.validation(k.outlet?.id || "", undefined),
          });
          await refetchValidation();
        }, 1500);
      };
      
      refreshStock();
    }
  }, [k.showStruk, k.outlet?.id, queryClient, refetchValidation]);

  // ═══ BLUETOOTH PRINTER CONNECTION ═══
  useEffect(() => {
    // Cleanup previous callback first (prevent multiple listeners)
    bluetoothPrinter.setConnectionChangeCallback(null);

    // Set new callback
    const handleConnectionChange = (connected: boolean) => {
      console.log("🔌 Bluetooth connection changed:", connected);
      setPrinterConnected(connected);
      if (!connected) {
        setPrinterName("");
      }
    };

    bluetoothPrinter.setConnectionChangeCallback(handleConnectionChange);

    // Initial state
    setPrinterConnected(bluetoothPrinter.isConnected());
    setPrinterName(bluetoothPrinter.getDeviceName() || "");

    // Cleanup on unmount
    return () => {
      console.log("🧹 Cleaning up bluetooth listener");
      bluetoothPrinter.setConnectionChangeCallback(null);
    };
  }, []); // Empty deps OK karena bluetoothPrinter adalah singleton

  // ═══ SUPABASE REALTIME: Pantau inventory_non_topping untuk update stok realtime ═══
  // Setiap kali ada penjualan, server mengurangi qty_available di inventory_non_topping
  // Subscription ini memastikan badge stok di header langsung update tanpa perlu refresh manual
  useEffect(() => {
    if (!k.outlet?.id) return;
    const outletId = k.outlet.id;

    console.log(`🔌 [REALTIME] Subscribing to inventory changes for outlet: ${outletId}`);

    const inventoryChannel = supabase
      .channel(`kasir-inventory-watch-${outletId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*", // ✅ FIX 3: Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "inventory_non_topping",
          filter: `outlet_id=eq.${outletId}`,
        },
        async (payload) => {
          console.log("🔄 [REALTIME] Stok berubah:", payload.new);
          
          // ✅ CRITICAL FIX: Strategi 3-lapis untuk pastikan UI update
          
          // LAYER 1: Hapus cache lama agar tidak ada stale data
          queryClient.removeQueries({
            queryKey: queryKeys.inventory.validation(outletId, undefined),
            exact: true,
          });
          
          // LAYER 2: Tunggu 150ms agar database replication selesai (multi-region safety)
          await new Promise(resolve => setTimeout(resolve, 150));
          
          // LAYER 3: Fetch ulang data fresh dan paksa re-render dengan await
          const freshData = await refetchValidation();
          console.log("✅ [REALTIME] Data fresh:", freshData.data?.stock_summary);
          
          // LAYER 4: Invalidate cache related untuk komponen lain
          queryClient.invalidateQueries({
            queryKey: queryKeys.inventory.all,
          });
          
          // ✅ Toast notifikasi visual agar kasir tahu stok update
          const newQty = (payload.new as any)?.qty_available;
          const ukuran = (payload.new as any)?.ukuran;
          if (newQty !== undefined && ukuran) {
            toast.success(`✅ Stok ${ukuran} update: ${newQty} pcs tersisa`, { 
              duration: 3000,
              position: "top-right"
            });
          }
        },
      )
      .subscribe((status) => {
        console.log(`📡 [REALTIME] Subscription status:`, status);
      });

    return () => {
      console.log(`🔌 [REALTIME] Unsubscribing from inventory changes`);
      supabase.removeChannel(inventoryChannel);
    };
  }, [k.outlet?.id, queryClient, refetchValidation]);

  // ═══ AUTO-SYNC NOTIFICATION SAAT KEMBALI ONLINE ═══
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = async () => {
      toast.info('🔄 Koneksi kembali, menyinkronkan data offline...', {
        id: 'sync-toast',
        duration: 3000,
      });

      // Import syncManager secara dinamis agar tidak error di SSR
      try {
        const { syncManager } = await import('@/lib/offline/sync');
        await syncManager.syncQueue();

        // Cek apakah ada item yang berhasil disync
        const status = await syncManager.getStatus();
        
        // Bersihkan local ledger setelah sync selesai (berhasil atau gagal sebagian)
        if (k.outlet?.id) {
          clearOfflineDeductions(k.outlet.id);
          if ((k as any).updateDeductions) {
            (k as any).updateDeductions(); // Paksa update state agar badge 📡 hilang
          }
        }

        if (status.pendingCount === 0 && status.failedCount === 0) {
          if (status.stockWarnings && status.stockWarnings.length > 0) {
            // Ada warning (misal stok kurang)
            toast.warning(`⚠️ Sync Selesai dengan Peringatan`, {
              id: 'sync-toast',
              description: status.stockWarnings.join('\n'),
              duration: 8000,
            });
          } else {
            // Sukses total
            const std = status.stockDeducted?.standar || 0;
            const mni = status.stockDeducted?.mini || 0;
            const dedText = std > 0 || mni > 0 
              ? ` (Standar: ${std}, Mini: ${mni} terjual)` 
              : '';

            toast.success(`✅ Data offline berhasil disinkronkan!${dedText}`, {
              id: 'sync-toast',
              duration: 5000,
            });
          }

          // Refresh stok setelah sync berhasil
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          refetchValidation();
        } else if (status.failedCount > 0) {
          toast.error(`⚠️ ${status.failedCount} transaksi gagal disinkronkan`, {
            id: 'sync-toast',
            duration: 6000,
          });
          // Refresh apa yang berhasil
          refetchValidation();
        }
      } catch (err) {
        console.error('Sync error:', err);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient, refetchValidation]);

  // ═══ SUPABASE REALTIME: Pantau perubahan daily_closing untuk outlet aktif ═══
  // Lebih reliable dari BroadcastChannel karena bekerja lintas tab DAN dalam tab yang sama
  useEffect(() => {
    if (!k.outlet?.id) return;
    const outletId = k.outlet.id;

    const realtimeChannel = supabase
      .channel(`kasir-closing-watch-${outletId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "daily_closing",
          filter: `outlet_id=eq.${outletId}`,
        },
        () => {
          setHasClosing(true);
          toast.error(
            "⛔ Akses kasir ditutup karena proses audit/closing harian sedang berjalan.",
            { duration: 8000 },
          );
          k.setShowOutletPicker(true);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "daily_closing",
          filter: `outlet_id=eq.${outletId}`,
        },
        () => {
          // Toko dibuka kembali dari Laporan Harian
          setHasClosing(false);
          toast.success("✅ Toko dibuka kembali. Silakan pilih outlet.", {
            duration: 5000,
          });
          k.setShowOutletPicker(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeChannel);
    };
  }, [k.outlet?.id]); // Re-run if outlet changes

  // ═══ AUTO-CLOSE TIMER & CLOSING STATUS ═══
  useEffect(() => {
    if (!k.outlet?.id) return;
    const outletId = k.outlet.id;
    const today = getTodayWIB();

    // 1. Cek status closing awal (dan juga subscribe ke perubahannya)
    const checkClosingStatus = async () => {
      // Saat offline, asumsikan toko BUKA (tidak perlu query Supabase)
      if (!navigator.onLine) {
        setHasClosing(false);
        return;
      }

      const { data } = await supabase
        .from("daily_closing")
        .select("id")
        .eq("outlet_id", outletId)
        .eq("tanggal", today)
        .single();

      if (data) {
        setHasClosing(true);
        // Jika status awal sudah tutup/locked, langsung paksa keluar
        toast.error(
          "⛔ Akses kasir tidak diizinkan! Toko sedang diaudit atau sudah Tutup Buku hari ini. Buka kembali melalui Laporan Harian jika diperlukan.",
          { duration: 8000 },
        );
        k.setShowOutletPicker(true);
      } else {
        setHasClosing(false);
      }
    };
    checkClosingStatus();

    // 2. Timer untuk jam malam (23:45, 23:50, 23:59)
    const timer = setInterval(() => {
      const now = new Date();
      // Gunakan waktu lokal browser (diasumsikan sama dengan WIB/zona waktu toko)
      const h = now.getHours();
      const m = now.getMinutes();

      if (h === 23) {
        if (m === 59) {
          // AUTO CLOSE
          clearInterval(timer);
          toast.error("WAKTU HABIS! Toko ditutup otomatis.", {
            duration: 10000,
          });
          // Insert dummy daily_closing

          const handleAutoClose = async () => {
            try {
              const res = await fetch("/api/closing/lock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ outlet_id: outletId }),
              });

              const result = await res.json();
              if (!result.success) throw new Error(result.error);
              k.setShowOutletPicker(true);
            } catch (e) {
              console.error("Auto close error:", e);
            }
          };

          handleAutoClose();
        } else if (m >= 50 && warningLevel !== 2) {
          setWarningLevel(2);
          toast.error(
            "WASPADA: Sisa 10 menit! Segera selesaikan transaksi dan tutup toko dari Laporan Harian.",
            { duration: 10000 },
          );
        } else if (m >= 45 && m < 50 && warningLevel !== 1) {
          setWarningLevel(1);
          toast.warning(
            "PERINGATAN: Jam 23:45. Harap bersiap untuk tutup buku agar data tidak bentrok.",
            { duration: 10000 },
          );
        }
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(timer);
  }, [k.outlet?.id]); // Re-run if outlet changes

  // ═══ OUTLET PICKER ═══
  if (!k.outlet || k.showOutletPicker) {
    return <OutletPicker outletList={k.outletList} onSelect={k.pilihOutlet} />;
  }

  // ═══ LOADING: Sedang mengecek status closing ═══
  // Jangan tampilkan kasir selama hasClosing masih null (proses async check belum selesai)
  if (hasClosing === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-semibold">
            Memeriksa status toko...
          </p>
          <p className="text-slate-400 text-sm mt-1">{k.outlet?.nama}</p>
        </div>
      </div>
    );
  }

  // ═══ TOKO DITUTUP: Paksa kembali ke OutletPicker ═══
  if (hasClosing === true) {
    return <OutletPicker outletList={k.outletList} onSelect={k.pilihOutlet} />;
  }

  // ═══ STOCK VALIDATION ═══
  // Determine if kasir can operate (non-blocking — renders inside layout)
  // UPDATED: Hanya block saat loading, tidak lagi block saat produksi belum tercatat
  const kasirBlocked =
    k.outlet &&
    isLoadingValidation &&
    navigator.onLine; // Jangan block UI saat offline — biarkan kasir tetap bisa beroperasi

  // ═══ ADJUST STOCK UNTUK OFFLINE DEDUCTION ═══
  const offlineDeds = (k as any).offlineDeductions || { standar: 0, mini: 0 };
  
  const computeStatus = (qty: number) => {
    if (qty <= 0) return 'out_of_stock';
    if (qty <= 20) return 'low'; // threshold sementara
    return 'sufficient';
  };

  const adjustedStockValidation = stockValidation ? {
    ...stockValidation,
    stock_summary: {
      standar: {
        ...stockValidation.stock_summary?.standar,
        qty_available: Math.max(0, (stockValidation.stock_summary?.standar?.qty_available || 0) - offlineDeds.standar),
        status: computeStatus((stockValidation.stock_summary?.standar?.qty_available || 0) - offlineDeds.standar),
      },
      mini: {
        ...stockValidation.stock_summary?.mini,
        qty_available: Math.max(0, (stockValidation.stock_summary?.mini?.qty_available || 0) - offlineDeds.mini),
        status: computeStatus((stockValidation.stock_summary?.mini?.qty_available || 0) - offlineDeds.mini),
      }
    }
  } : null;

  return (
    <div className="h-[calc(100vh-0px)] sm:h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* HEADER — always visible so user can navigate */}
      {!kasirBlocked && (
        <KasirHeader
          key={`header-${stockValidation?.stock_summary?.standar?.qty_available}-${stockValidation?.stock_summary?.mini?.qty_available}`}
          outlet={k.outlet}
          selectedChannel={k.selectedChannel}
          setSelectedChannel={k.setSelectedChannel}
          activeSection={k.activeSection}
          setActiveSection={k.setActiveSection}
          ukuranFilter={k.ukuranFilter}
          setUkuranFilter={k.setUkuranFilter}
          cartCount={k.cart.length}
          onChangeOutlet={() => k.setShowOutletPicker(true)}
          printerConnected={printerConnected}
          setPrinterConnected={setPrinterConnected}
          printerName={printerName}
          setPrinterName={setPrinterName}
          kasirMenus={[]}
          stockValidation={adjustedStockValidation}
          offlineDeductions={offlineDeds}
          realtimeConnected={k.realtimeConnected}
          cashier={k.cashier}
          onChangeCashier={() => k.setShowCashierModal(true)}
        />
      )}

      {/* MAIN BODY */}
      {kasirBlocked ? (
        /* ═══ BLOCKED STATE: Show loading ═══ */
        <div className="flex-1 overflow-auto bg-slate-50">
          <div className="h-full flex items-center justify-center flex-col gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Icons.Loader2
                size={24}
                className="text-slate-400 animate-spin"
              />
            </div>
            <p className="text-slate-500 font-medium text-sm">
              {isLoadingValidation ? 'Memeriksa stok produksi...' : 'Memuat kasir...'}
            </p>
          </div>
        </div>
      ) : (
        /* ═══ NORMAL STATE: Show kasir panels ═══ */
        <div className="flex-1 overflow-hidden flex w-full">
          {/* LEFT: Menu Browser */}
          <div className="flex-1 overflow-hidden h-full min-w-0">
            <MenuPanel
              activeSection={k.activeSection}
              isLoading={k.isLoading}
              jenisGroups={k.jenisGroups}
              paketList={k.paketList}
              bundlingList={k.bundlingList}
              customList={k.customList}
              tambahanList={k.tambahanList}
              products={k.products}
              boxList={k.boxList}
              stockValidation={stockValidation}
              getCartQty={k.getCartQty}
              getCartSatuanId={k.getCartSatuanId}
              getDisplayPrice={k.getDisplayPrice}
              formatRp={k.formatRp}
              tambahSatuan={k.tambahSatuan}
              updateQty={k.updateQty}
              bukaPaketModal={k.bukaPaketModal}
              bukaPaketInline={k.bukaPaketInline}
              konfirmasiPaketInline={k.konfirmasiPaketInline}
              selectedPaketForInline={k.selectedPaketForInline}
              setSelectedPaketForInline={k.setSelectedPaketForInline}
              paketInlineIsi={k.paketInlineIsi}
              setPaketInlineIsi={k.setPaketInlineIsi}
              tambahBundling={k.tambahBundling}
              tambahManualBox={k.tambahManualBox}
              customStep={k.customStep}
              setCustomStep={k.setCustomStep}
              selectedCustomPaket={k.selectedCustomPaket}
              setSelectedCustomPaket={k.setSelectedCustomPaket}
              customJenisMode={k.customJenisMode}
              setCustomJenisMode={k.setCustomJenisMode}
              customModeLabel={k.customModeLabel}
              setCustomModeLabel={k.setCustomModeLabel}
              customIsi={k.customIsi}
              setCustomIsi={k.setCustomIsi}
              customTambahan={k.customTambahan}
              setCustomTambahan={k.setCustomTambahan}
              customTulisan={k.customTulisan}
              setCustomTulisan={k.setCustomTulisan}
              customMintaTulisan={k.customMintaTulisan}
              setCustomMintaTulisan={k.setCustomMintaTulisan}
              customJumlahPapan={k.customJumlahPapan}
              setCustomJumlahPapan={k.setCustomJumlahPapan}
              konfirmasiCustom={k.konfirmasiCustom}
              activeColor="amber"
              ukuranFilter={k.ukuranFilter}
            />
          </div>

          {/* RIGHT: Cart Panel — selalu tampil di sm+, collapsible dengan w-0 */}
          <div
            className={`
            hidden sm:flex flex-col shrink-0 bg-white
            transition-all duration-300 ease-in-out overflow-hidden
            ${cartCollapsed ? "w-0 border-l-0 opacity-0" : "w-80 xl:w-96 border-l border-slate-200 opacity-100"}
          `}
          >
            {/* ── EXPANDED: Full cart panel ── */}
            <div className="flex flex-col h-full relative w-80 xl:w-96">
              <CartPanel
                cart={k.cart}
                grandTotal={k.grandTotal}
                totalBiayaEkstra={k.totalBiayaEkstra}
                finalTotal={k.finalTotal}
                cartDiscount={k.cartDiscount}
                maxCartDiscount={k.maxCartDiscount}
                setCartDiscount={k.setCartDiscount}
                biayaEkstraList={k.biayaEkstraList}
                selectedBiayaEkstra={k.selectedBiayaEkstra}
                setSelectedBiayaEkstra={k.setSelectedBiayaEkstra}
                namaPelanggan={k.namaPelanggan}
                setNamaPelanggan={k.setNamaPelanggan}
                hapusItem={k.hapusItem}
                updateQty={k.updateQty}
                onBayar={() => {
                  k.setShowBayar(true);
                }}
                formatRp={k.formatRp}
                automatedBoxes={k.automatedBoxes}
                automatedBoxTotal={k.automatedBoxTotal}
                onCollapse={() => setCartCollapsed(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* The rest of the UI only renders when not blocked */}
      {!kasirBlocked && (
        <>
          {/* ═══ FLOATING CART BUTTON ═══ */}
          {/* Muncul jika keranjang ada isinya, dan: sedang di mobile, ATAU sedang collapsed di desktop */}
          <div
            className={`fixed z-40 transition-all duration-500 ease-in-out ${
              cartCollapsed
                ? "bottom-20 right-4 sm:bottom-8 sm:right-8 opacity-100 translate-y-0"
                : "bottom-20 right-4 opacity-100 translate-y-0 sm:opacity-0 sm:pointer-events-none sm:translate-y-10"
            }`}
          >
            <button
              onClick={() => {
                if (window.innerWidth < 640) {
                  k.setShowCart(true);
                } else {
                  setCartCollapsed(false);
                }
              }}
              className="relative flex items-center justify-center w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all group"
            >
              <Icons.ShoppingCart
                size={24}
                className="group-hover:scale-110 transition-transform"
              />

              {k.cart.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[24px] h-[24px] px-1.5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                  {k.cart.length > 99 ? "99+" : k.cart.length}
                </span>
              )}
            </button>
          </div>

          {/* Mobile: Cart Slide Over */}
          {k.showCart && (
            <div className="sm:hidden fixed inset-0 z-50">
              <div
                className="absolute inset-0 bg-slate-900/50"
                onClick={() => k.setShowCart(false)}
              />
              <div className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-3xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b">
                  <h2 className="font-black text-slate-800">Keranjang</h2>
                  <button
                    onClick={() => k.setShowCart(false)}
                    className="p-2 rounded-xl hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <CartPanel
                    cart={k.cart}
                    grandTotal={k.grandTotal}
                    totalBiayaEkstra={k.totalBiayaEkstra}
                    finalTotal={k.finalTotal}
                    cartDiscount={k.cartDiscount}
                    maxCartDiscount={k.maxCartDiscount}
                    setCartDiscount={k.setCartDiscount}
                    biayaEkstraList={k.biayaEkstraList}
                    selectedBiayaEkstra={k.selectedBiayaEkstra}
                    setSelectedBiayaEkstra={k.setSelectedBiayaEkstra}
                    namaPelanggan={k.namaPelanggan}
                    setNamaPelanggan={k.setNamaPelanggan}
                    hapusItem={k.hapusItem}
                    updateQty={k.updateQty}
                    onBayar={() => {
                      k.setShowCart(false);
                      k.setShowBayar(true);
                    }}
                    formatRp={k.formatRp}
                    automatedBoxes={k.automatedBoxes}
                    automatedBoxTotal={k.automatedBoxTotal}
                  />
                </div>
              </div>
            </div>
          )}

          {/* MODAL: PAKET ISI */}
          {k.paketModal && (
            <PaketModal
              paket={k.paketModal}
              paketIsi={k.paketIsi}
              setPaketIsi={k.setPaketIsi}
              paketExtras={k.paketExtras}
              setPaketExtras={k.setPaketExtras}
              products={k.products}
              tambahanList={k.tambahanList}
              selectedChannel={k.selectedChannel}
              onConfirm={k.konfirmasiPaket}
              onClose={() => k.setPaketModal(null)}
              formatRp={k.formatRp}
              ukuranFilter={k.ukuranFilter}
            />
          )}

          {/* MODAL: INPUT NOMINAL TUNAI (DEFAULT SAAT BAYAR) */}
          {k.showBayar && !showOtherMethods && (
            <CashPaymentModal
              finalTotal={k.finalTotal}
              formatRp={k.formatRp}
              bayarNominal={k.bayarNominal}
              setBayarNominal={k.setBayarNominal}
              isLoading={k.isLoading}
              onConfirm={() => {
                k.setPaymentMethod("cash");
                handleProsesBayar();
                k.setShowBayar(false);
              }}
              onCancel={() => {
                k.setShowBayar(false);
                k.setBayarNominal("");
              }}
              onSwitchToOther={() => {
                setShowOtherMethods(true);
              }}
            />
          )}

          {/* MODAL: PAYMENT METHOD SELECTOR (JIKA MAU NON-TUNAI) */}
          {k.showBayar && showOtherMethods && (
            <PaymentMethodSelector
              finalTotal={k.finalTotal}
              formatRp={k.formatRp}
              paymentMethods={k.paymentMethodsList}
              onSelectMethod={(method) => {
                const isTunai =
                  method.type?.toLowerCase().includes("tunai") ||
                  method.type?.toLowerCase().includes("cash");
                if (isTunai) {
                  setShowOtherMethods(false);
                } else {
                  k.setPaymentMethod(method.id);
                  k.setShowBayar(false);
                  setShowOtherMethods(false);
                  handleProsesBayar(method.id);
                }
              }}
              onCancel={() => {
                setShowOtherMethods(false);
              }}
            />
          )}

          {/* MODAL: STRUK */}
          {k.showStruk && k.strukData && (
            <ReceiptModal
              data={k.strukData}
              outletNama={k.outlet.nama}
              outletAlamat={k.outlet.alamat}
              channel={k.selectedChannel}
              printerConnected={printerConnected}
              onClose={() => k.setShowStruk(false)}
              onConnectPrinter={async () => {
                const { bluetoothPrinter } =
                  await import("@/lib/bluetooth-printer");
                const result = await bluetoothPrinter.connect();
                if (result.success) {
                  setPrinterConnected(true);
                  setPrinterName(result.deviceName || "Printer BT");
                }
                return result;
              }}
            />
          )}

          {/* MODAL: PILIH KASIR */}
          {k.showCashierModal && (
            <CashierModal
              cashierList={k.cashierList}
              onSelect={k.pilihCashier}
              onClose={() => k.setShowCashierModal(false)}
            />
          )}

          {/* WARNING BANNER FOR LATE HOURS */}
          {warningLevel > 0 && (
            <div
              className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold text-sm ${
                warningLevel === 2
                  ? "bg-red-500 text-white animate-bounce"
                  : "bg-amber-400 text-amber-900"
              }`}
            >
              <AlertTriangle size={18} />
              {warningLevel === 2
                ? "SEGERA TUTUP TOKO! Waktu hampir habis (23:59)."
                : "PERINGATAN: Mendekati jam malam, bersiap Tutup Buku."}
            </div>
          )}

          {/* PAYMENT PROCESSING OVERLAY */}
          {isProcessingPayment && (
            <PaymentProcessingOverlay
              finalTotal={k.finalTotal}
              formatRp={k.formatRp}
            />
          )}
        </>
      )}
    </div>
  );
}
