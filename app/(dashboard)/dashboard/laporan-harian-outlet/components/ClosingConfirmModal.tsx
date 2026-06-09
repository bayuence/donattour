'use client';

import { Lock } from 'lucide-react';
import type { Outlet } from '@/lib/types';
import type { DashboardData } from '../types';
import { getTodayWIB } from '@/lib/utils/timezone';
import { toast } from 'sonner';

interface ClosingConfirmModalProps {
  showTutupConfirm: boolean;
  selectedOutlet: Outlet;
  dashboardData: DashboardData | null;
  onClose: () => void;
  onConfirm: () => void;
  setDashboardData: (data: DashboardData) => void;
}

export function ClosingConfirmModal({
  showTutupConfirm,
  selectedOutlet,
  dashboardData,
  onClose,
  setDashboardData
}: ClosingConfirmModalProps) {
  if (!showTutupConfirm) return null;

  const handleConfirm = async () => {
    try {
      const today = getTodayWIB();
      const res = await fetch('/api/closing/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outlet_id: selectedOutlet.id })
      });
      
      const result = await res.json();
      if (!result.success) throw new Error(result.error);
      
      // Update local state - kasir locked but NOT final closing yet
      if (dashboardData) {
        setDashboardData({ 
          ...dashboardData, 
          is_kasir_locked: true,
          has_closing: false  // Belum closing final, hanya lock kasir
        });
      }
      
      // Lock kasir via BroadcastChannel cross-tab
      const channel = new BroadcastChannel('kasir-channel');
      channel.postMessage({ type: 'OUTLET_CLOSED', outlet_id: selectedOutlet.id });
      channel.close();

      toast.success('Kasir berhasil dikunci! Silakan lakukan Rekap Sisa Produk dan Closing di bawah.');
      onClose();
      
      // TIDAK otomatis membuka form closing
      // User harus manual klik tombol di section closing
    } catch (error: any) {
      toast.error('Gagal mengunci kasir: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
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
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 transition-colors shadow-sm"
            >
              Ya, Kunci Kasir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
