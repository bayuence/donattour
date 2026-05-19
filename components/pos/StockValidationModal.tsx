// ============================================================================
// STOCK VALIDATION BANNER COMPONENT
// ============================================================================
// File: components/pos/StockValidationModal.tsx
// Description: Non-blocking inline banner when production hasn't been inputted
// Version: 3.0 — No longer blocks the entire page; sidebar remains accessible
// Date: 2026-05-06
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Phone, ArrowLeftRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

interface StockValidationModalProps {
  /** Validation data dari useStockValidation hook */
  validation: {
    can_operate: boolean;
    has_production: boolean;
    stock_summary?: {
      standar: {
        qty_available: number;
        status: 'sufficient' | 'low' | 'out_of_stock';
      };
      mini: {
        qty_available: number;
        status: 'sufficient' | 'low' | 'out_of_stock';
      };
    };
  };
  /** Callback untuk refresh validation */
  onRefresh: () => void;
  /** Loading state saat refresh */
  isRefreshing?: boolean;
  /** Optional: Nomor telepon dapur untuk contact */
  dapurPhone?: string;
  /** Callback untuk ganti outlet */
  onChangeOutlet?: () => void;
  /** Nama outlet aktif */
  outletName?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StockValidationModal({
  validation,
  onRefresh,
  isRefreshing = false,
  dapurPhone,
  onChangeOutlet,
  outletName,
}: StockValidationModalProps) {
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Countdown timer for auto-refresh indicator
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 30 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Reset countdown when refresh happens
  useEffect(() => {
    if (isRefreshing) setCountdown(30);
  }, [isRefreshing]);

  // Handle contact dapur
  const handleContact = () => {
    if (dapurPhone) {
      window.location.href = `tel:${dapurPhone}`;
    } else {
      setShowContactInfo(true);
    }
  };

  // Jika kasir boleh beroperasi, tidak perlu tampilkan
  if (validation.can_operate) return null;

  return (
    <div className="w-full h-full flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-lg">

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">

          {/* Header Strip */}
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                <AlertTriangle size={16} className="text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-white font-bold text-sm tracking-tight">
                  Produksi Belum Tercatat
                </h2>
                <p className="text-slate-400 text-xs font-medium">
                  {outletName || 'Outlet ini'} — {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}
                </p>
              </div>
            </div>
            {isRefreshing && (
              <Loader2 size={16} className="text-slate-400 animate-spin" />
            )}
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">

            {/* Status Message */}
            <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                Data produksi donat hari ini belum dimasukkan ke sistem untuk outlet ini.
                Kasir tidak dapat beroperasi sampai stok tercatat.
              </p>
            </div>

            {/* Instruction Steps */}
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Langkah yang perlu dilakukan</p>
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                  <p className="text-sm text-slate-700">
                    Buka menu <strong className="text-slate-900">Input Produk</strong> di sidebar kiri untuk memasukkan data produksi.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                  <p className="text-sm text-slate-700">
                    Catat jumlah donat polos yang diproduksi hari ini (standar dan/atau mini).
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</span>
                  <p className="text-sm text-slate-700">
                    Kembali ke halaman ini — sistem akan otomatis memeriksa ulang.
                  </p>
                </div>
              </div>
            </div>

            {/* Stock Info (if available) */}
            {validation.stock_summary && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Stok Standar</p>
                  <p className="font-bold text-slate-800 text-lg">
                    {validation.stock_summary.standar.qty_available} <span className="text-xs font-medium text-slate-400">pcs</span>
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Stok Mini</p>
                  <p className="font-bold text-slate-800 text-lg">
                    {validation.stock_summary.mini.qty_available} <span className="text-xs font-medium text-slate-400">pcs</span>
                  </p>
                </div>
              </div>
            )}

            {/* Contact Info (if shown) */}
            {showContactInfo && !dapurPhone && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-800 font-medium">
                  Hubungi bagian dapur atau produksi untuk segera memasukkan data produksi ke sistem.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-1">
              <Button
                onClick={handleContact}
                variant="outline"
                className="flex-1 rounded-xl border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 h-11 text-sm"
              >
                <Phone className="mr-2 h-4 w-4 text-slate-400" />
                Hubungi Dapur
              </Button>

              <Button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex-[1.5] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-sm h-11 text-sm"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memeriksa...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Periksa Ulang
                  </>
                )}
              </Button>
            </div>

            {/* Change Outlet Button */}
            {onChangeOutlet && (
              <button
                onClick={onChangeOutlet}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <ArrowLeftRight size={14} />
                Ganti outlet lain
              </button>
            )}

            {/* Auto-refresh indicator */}
            <div className="flex items-center justify-center gap-2 pt-1">
              <div className="h-1 w-1 rounded-full bg-slate-300 animate-pulse" />
              <p className="text-[11px] font-medium text-slate-400">
                Pengecekan otomatis dalam {countdown} detik
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
