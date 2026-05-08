'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, DollarSign, Package, ShoppingBag, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface ClosingReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  outletId: string;
  outletName: string;
  cashierId?: string;
}

interface ReviewData {
  outlet_id: string;
  closing_date: string;
  sales: {
    total_transactions: number;
    total_revenue: number;
    cash_revenue: number;
    digital_revenue: number;
    by_channel: Array<{
      channel: string;
      transactions: number;
      cash: number;
      digital: number;
      total: number;
    }>;
  };
  production: {
    total: number;
    success: number;
    waste: number;
    by_size: Array<{
      size: string;
      total: number;
      success: number;
      waste: number;
    }>;
  };
  inventory: {
    total_sold: number;
    remaining_plain_standar: number;
    remaining_plain_mini: number;
    remaining_finished: number;
    remaining_finished_items: Array<{
      product_name: string;
      quantity: number;
    }>;
  };
  balance: {
    is_balanced: boolean;
    notes: string;
    left_side: number;
    right_side: number;
  };
}

// ============================================================================
// CHANNEL LABELS
// ============================================================================

const CHANNEL_LABELS: Record<string, string> = {
  dine_in: 'Dine In',
  take_away: 'Take Away',
  delivery: 'Delivery',
  shopee_food: 'Shopee Food',
  gojek_food: 'Gojek Food',
  grab_food: 'Grab Food',
  unknown: 'Lainnya',
};

// ============================================================================
// COMPONENT
// ============================================================================

export function ClosingReviewModal({
  isOpen,
  onClose,
  outletId,
  outletName,
  cashierId,
}: ClosingReviewModalProps) {
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyClosed, setAlreadyClosed] = useState(false);

  // Load review data when modal opens
  useEffect(() => {
    if (isOpen && outletId) {
      loadReviewData();
    }
  }, [isOpen, outletId]);

  // Load review data from API
  const loadReviewData = async () => {
    setIsLoading(true);
    setAlreadyClosed(false);
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/closing/review?outlet_id=${outletId}&date=${today}`);
      const result = await response.json();

      if (result.already_closed) {
        setAlreadyClosed(true);
        toast.error('Outlet sudah ditutup untuk hari ini');
        return;
      }

      if (!result.success) {
        throw new Error(result.error || 'Gagal memuat data review');
      }

      setReviewData(result.data);
    } catch (error: any) {
      console.error('Error loading review data:', error);
      toast.error(`Gagal memuat data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm closing
  const handleConfirmClosing = async () => {
    if (!reviewData) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/closing/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          closing_date: reviewData.closing_date,
          review_data: reviewData,
          closed_by: cashierId,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Gagal menyimpan closing report');
      }

      toast.success('Outlet berhasil ditutup untuk hari ini!');
      onClose();
      
      // Redirect to dashboard or closing success page
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);
    } catch (error: any) {
      console.error('Error confirming closing:', error);
      toast.error(`Gagal: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format currency
  const formatRp = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-6 w-6 text-blue-600" />
            Laporan Closing - {outletName}
          </DialogTitle>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString('id-ID', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <p className="text-sm text-slate-500">Memuat data closing...</p>
          </div>
        ) : alreadyClosed ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <AlertTriangle className="h-12 w-12 text-orange-500" />
            <p className="text-lg font-bold text-slate-700">Outlet Sudah Ditutup</p>
            <p className="text-sm text-slate-500">Outlet ini sudah ditutup untuk hari ini</p>
            <Button onClick={onClose} className="mt-4">
              Tutup
            </Button>
          </div>
        ) : reviewData ? (
          <div className="space-y-6 py-4">
            {/* Balance Check Alert */}
            {!reviewData.balance.is_balanced && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-900">Data Tidak Balance!</p>
                    <p className="text-sm text-red-700 mt-1">{reviewData.balance.notes}</p>
                    <p className="text-xs text-red-600 mt-2">
                      Produksi Berhasil: {reviewData.balance.left_side} pcs ≠ 
                      Terjual + Sisa: {reviewData.balance.right_side} pcs
                    </p>
                  </div>
                </div>
              </div>
            )}

            {reviewData.balance.is_balanced && (
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-bold text-green-900">Data Balance! Siap untuk closing.</p>
                </div>
              </div>
            )}

            {/* Sales Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h3 className="font-black text-slate-800">Penjualan Hari Ini</h3>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600">Total Transaksi</p>
                  <p className="text-xl font-black text-slate-800">{reviewData.sales.total_transactions}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700">Total Revenue</p>
                  <p className="text-lg font-black text-green-600">{formatRp(reviewData.sales.total_revenue)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-700">Tunai</p>
                  <p className="text-lg font-black text-blue-600">{formatRp(reviewData.sales.cash_revenue)}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-700">Non-Tunai</p>
                  <p className="text-lg font-black text-purple-600">{formatRp(reviewData.sales.digital_revenue)}</p>
                </div>
              </div>

              {/* By Channel */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase">Per Channel:</p>
                {reviewData.sales.by_channel.map((channel, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-700">
                        {CHANNEL_LABELS[channel.channel] || channel.channel}
                      </span>
                      <span className="text-xs text-slate-500">
                        {channel.transactions} order
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {channel.cash > 0 && (
                        <span className="text-blue-600">Tunai: {formatRp(channel.cash)}</span>
                      )}
                      {channel.digital > 0 && (
                        <span className="text-purple-600">Digital: {formatRp(channel.digital)}</span>
                      )}
                      <span className="font-bold text-slate-800">{formatRp(channel.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Production Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5 text-amber-600" />
                <h3 className="font-black text-slate-800">Produksi Hari Ini</h3>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-600">Target</p>
                  <p className="text-xl font-black text-slate-800">{reviewData.production.total} pcs</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700">Berhasil</p>
                  <p className="text-xl font-black text-green-600">{reviewData.production.success} pcs</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-xs text-red-700">Gagal</p>
                  <p className="text-xl font-black text-red-600">{reviewData.production.waste} pcs</p>
                </div>
              </div>

              {/* By Size */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-600 uppercase">Per Ukuran:</p>
                {reviewData.production.by_size.map((size, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="text-sm font-bold text-slate-700 capitalize">{size.size}</span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-600">Target: {size.total}</span>
                      <span className="text-green-600">Berhasil: {size.success}</span>
                      <span className="text-red-600">Gagal: {size.waste}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Inventory Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                <h3 className="font-black text-slate-800">Inventory & Sisa</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-700">Terjual</p>
                  <p className="text-xl font-black text-green-600">{reviewData.inventory.total_sold} pcs</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-700">Sisa Polos (Std)</p>
                  <p className="text-xl font-black text-amber-600">{reviewData.inventory.remaining_plain_standar} pcs</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-700">Sisa Polos (Mini)</p>
                  <p className="text-xl font-black text-amber-600">{reviewData.inventory.remaining_plain_mini} pcs</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-700">Sisa Jadi</p>
                  <p className="text-xl font-black text-blue-600">{reviewData.inventory.remaining_finished} pcs</p>
                </div>
              </div>

              {/* Finished Products Detail */}
              {reviewData.inventory.remaining_finished_items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase">Sisa Produk Jadi (Detail):</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {reviewData.inventory.remaining_finished_items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-lg">
                        <span className="text-sm text-blue-900">{item.product_name}</span>
                        <span className="text-sm font-bold text-blue-600">{item.quantity} pcs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Balance Summary */}
            <div className="bg-slate-100 border-2 border-slate-300 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-slate-700" />
                <h3 className="font-black text-slate-800">Ringkasan Balance</h3>
              </div>
              <div className="text-sm text-slate-700 space-y-1">
                <p>
                  <span className="font-bold">Produksi Berhasil:</span> {reviewData.production.success} pcs
                </p>
                <p>
                  <span className="font-bold">Terjual:</span> {reviewData.inventory.total_sold} pcs
                </p>
                <p>
                  <span className="font-bold">Sisa Polos:</span> {reviewData.inventory.remaining_plain_standar + reviewData.inventory.remaining_plain_mini} pcs
                </p>
                <p>
                  <span className="font-bold">Sisa Jadi:</span> {reviewData.inventory.remaining_finished} pcs
                </p>
                <p>
                  <span className="font-bold">Gagal:</span> {reviewData.production.waste} pcs
                </p>
                <div className="pt-2 mt-2 border-t-2 border-slate-400">
                  <p className="font-black text-base">
                    {reviewData.production.success} = {reviewData.inventory.total_sold} + {reviewData.inventory.remaining_plain_standar + reviewData.inventory.remaining_plain_mini} + {reviewData.inventory.remaining_finished}
                  </p>
                  <p className={`font-black text-lg ${reviewData.balance.is_balanced ? 'text-green-600' : 'text-red-600'}`}>
                    {reviewData.balance.is_balanced ? '✓ BALANCE!' : '✗ TIDAK BALANCE!'}
                  </p>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
              <p className="text-sm text-amber-900">
                <strong>⚠️ Perhatian:</strong> Pastikan semua data sudah benar sebelum konfirmasi. 
                Setelah closing, outlet tidak bisa melakukan transaksi lagi untuk hari ini.
              </p>
            </div>
          </div>
        ) : null}

        {/* Actions */}
        {!isLoading && !alreadyClosed && reviewData && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Batal
            </Button>
            <Button
              onClick={handleConfirmClosing}
              disabled={isSubmitting || !reviewData.balance.is_balanced}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Menutup Outlet...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Konfirmasi & Tutup Outlet
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
