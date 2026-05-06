'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Info, TrendingDown, AlertCircle } from 'lucide-react';

interface ClosingSummaryTabProps {
  outletId: string;
  tanggal: string;
  nonToppingData: any;
  finishedProductsData: any[];
  notes: string;
  onNotesChange: (notes: string) => void;
}

interface LossSummary {
  production_waste_loss: number;
  topping_error_loss: number;
  non_topping_expired_loss: number;
  finished_product_reject_loss: number;
  total_loss: number;
  total_waste_qty: number;
}

export function ClosingSummaryTab({
  outletId,
  tanggal,
  nonToppingData,
  finishedProductsData,
  notes,
  onNotesChange,
}: ClosingSummaryTabProps) {
  const [lossSummary, setLossSummary] = useState<LossSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing loss data (production waste & topping errors)
  const fetchExistingLoss = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch production waste loss
      const productionResponse = await fetch(
        `/api/production/daily?outlet_id=${outletId}&tanggal=${tanggal}`
      );
      
      let productionWasteLoss = 0;
      if (productionResponse.ok) {
        const productionData = await productionResponse.json();
        if (productionData.success && productionData.data?.items) {
          productionWasteLoss = productionData.data.items.reduce(
            (sum: number, item: any) => sum + (item.total_hpp_loss || 0),
            0
          );
        }
      }

      // Fetch topping error loss
      const toppingResponse = await fetch(
        `/api/topping-errors?outlet_id=${outletId}&start_date=${tanggal}&end_date=${tanggal}`
      );
      
      let toppingErrorLoss = 0;
      if (toppingResponse.ok) {
        const toppingData = await toppingResponse.json();
        if (toppingData.success && toppingData.data?.items) {
          toppingErrorLoss = toppingData.data.items.reduce(
            (sum: number, item: any) => sum + (item.total_hpp_loss || 0),
            0
          );
        }
      }

      // Calculate non-topping expired loss from Tab 1
      const nonToppingExpiredLoss =
        (nonToppingData?.standar?.hpp_loss_expired || 0) +
        (nonToppingData?.mini?.hpp_loss_expired || 0);

      // Calculate finished product reject loss from Tab 2
      const finishedProductRejectLoss = finishedProductsData.reduce(
        (sum, product) => sum + (product.hpp_topping_loss || 0),
        0
      );

      // Calculate total
      const totalLoss =
        productionWasteLoss +
        toppingErrorLoss +
        nonToppingExpiredLoss +
        finishedProductRejectLoss;

      // Calculate total waste qty
      const totalWasteQty =
        (nonToppingData?.standar?.qty_expired || 0) +
        (nonToppingData?.mini?.qty_expired || 0) +
        finishedProductsData.reduce(
          (sum, product) => sum + (product.qty_reject || 0),
          0
        );

      setLossSummary({
        production_waste_loss: productionWasteLoss,
        topping_error_loss: toppingErrorLoss,
        non_topping_expired_loss: nonToppingExpiredLoss,
        finished_product_reject_loss: finishedProductRejectLoss,
        total_loss: totalLoss,
        total_waste_qty: totalWasteQty,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal mengambil data rugi'
      );
      console.error('Error fetching loss data:', err);
    } finally {
      setLoading(false);
    }
  }, [outletId, tanggal, nonToppingData, finishedProductsData]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchExistingLoss();
  }, [fetchExistingLoss]);

  // Calculate percentage
  const calculatePercentage = (value: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Summary & Catatan Closing</h3>
        <p className="text-sm text-gray-600 mt-1">
          Review total rugi harian dan tambahkan catatan closing
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Menghitung total rugi...
          </AlertDescription>
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Loss Summary */}
      {lossSummary && (
        <>
          {/* 4 Loss Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Production Waste Loss */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  1. Gagal Produksi
                </CardTitle>
                <CardDescription>
                  Donat gagal saat produksi (gosong, bentuk jelek, dll)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold text-red-700">
                      Rp {lossSummary.production_waste_loss.toLocaleString('id-ID')}
                    </span>
                    <span className="text-sm font-medium text-red-600">
                      {calculatePercentage(
                        lossSummary.production_waste_loss,
                        lossSummary.total_loss
                      )}%
                    </span>
                  </div>
                  <p className="text-xs text-red-600">
                    Dari input produksi pagi hari
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 2. Topping Error Loss */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                  2. Salah Topping
                </CardTitle>
                <CardDescription>
                  Kasir buat produk salah (tidak dijual)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold text-orange-700">
                      Rp {lossSummary.topping_error_loss.toLocaleString('id-ID')}
                    </span>
                    <span className="text-sm font-medium text-orange-600">
                      {calculatePercentage(
                        lossSummary.topping_error_loss,
                        lossSummary.total_loss
                      )}%
                    </span>
                  </div>
                  <p className="text-xs text-orange-600">
                    Dari laporan error kasir
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 3. Non-Topping Expired Loss */}
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-amber-600" />
                  3. Donat Polos Expired
                </CardTitle>
                <CardDescription>
                  Donat polos sisa yang tidak terpakai
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold text-amber-700">
                      Rp {lossSummary.non_topping_expired_loss.toLocaleString('id-ID')}
                    </span>
                    <span className="text-sm font-medium text-amber-600">
                      {calculatePercentage(
                        lossSummary.non_topping_expired_loss,
                        lossSummary.total_loss
                      )}%
                    </span>
                  </div>
                  <p className="text-xs text-amber-600">
                    Dari Tab 1: Sisa Polos (
                    {(nonToppingData?.standar?.qty_expired || 0) +
                      (nonToppingData?.mini?.qty_expired || 0)}{' '}
                    pcs)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 4. Finished Product Reject Loss */}
            <Card className="border-rose-200 bg-rose-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                  4. Donat Jadi Reject
                </CardTitle>
                <CardDescription>
                  Donat jadi yang tidak bisa dijual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-bold text-rose-700">
                      Rp {lossSummary.finished_product_reject_loss.toLocaleString('id-ID')}
                    </span>
                    <span className="text-sm font-medium text-rose-600">
                      {calculatePercentage(
                        lossSummary.finished_product_reject_loss,
                        lossSummary.total_loss
                      )}%
                    </span>
                  </div>
                  <p className="text-xs text-rose-600">
                    Dari Tab 2: Sisa Jadi (
                    {finishedProductsData.reduce(
                      (sum, p) => sum + (p.qty_reject || 0),
                      0
                    )}{' '}
                    pcs)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Total Loss Card */}
          <Card className="bg-gradient-to-r from-red-100 to-orange-100 border-red-300">
            <CardHeader>
              <CardTitle className="text-xl">📊 Total Rugi Hari Ini</CardTitle>
              <CardDescription>
                Akumulasi semua kategori rugi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-3xl font-bold text-red-700">
                    Rp {lossSummary.total_loss.toLocaleString('id-ID')}
                  </span>
                  <span className="text-sm font-medium text-red-600">
                    {lossSummary.total_waste_qty} pcs total waste
                  </span>
                </div>

                {/* Breakdown List */}
                <div className="bg-white/50 p-3 rounded space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Gagal Produksi:</span>
                    <span className="font-semibold">
                      Rp {lossSummary.production_waste_loss.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salah Topping:</span>
                    <span className="font-semibold">
                      Rp {lossSummary.topping_error_loss.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Polos Expired:</span>
                    <span className="font-semibold">
                      Rp {lossSummary.non_topping_expired_loss.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jadi Reject:</span>
                    <span className="font-semibold">
                      Rp {lossSummary.finished_product_reject_loss.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Waste Rate Alert */}
                {lossSummary.total_loss > 100000 && (
                  <Alert className="bg-red-50 border-red-300">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700">
                      ⚠️ Total rugi hari ini cukup tinggi (&gt; Rp 100,000). Perlu
                      perhatian khusus untuk mengurangi waste.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Loss Breakdown by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                📈 Analisis Rugi per Kategori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Visual Bar Chart */}
                <div className="space-y-2">
                  {[
                    {
                      label: 'Gagal Produksi',
                      value: lossSummary.production_waste_loss,
                      color: 'bg-red-500',
                    },
                    {
                      label: 'Salah Topping',
                      value: lossSummary.topping_error_loss,
                      color: 'bg-orange-500',
                    },
                    {
                      label: 'Polos Expired',
                      value: lossSummary.non_topping_expired_loss,
                      color: 'bg-amber-500',
                    },
                    {
                      label: 'Jadi Reject',
                      value: lossSummary.finished_product_reject_loss,
                      color: 'bg-rose-500',
                    },
                  ].map((item) => {
                    const percentage = calculatePercentage(
                      item.value,
                      lossSummary.total_loss
                    );
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.label}</span>
                          <span className="font-semibold">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`${item.color} h-2 rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Recommendation */}
                <Alert className="bg-blue-50 border-blue-200 mt-4">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-700">
                    <strong>💡 Rekomendasi:</strong>{' '}
                    {lossSummary.finished_product_reject_loss >
                    lossSummary.production_waste_loss
                      ? 'Fokus mengurangi reject donat jadi (topping meleleh, kering, dll). Pertimbangkan penyimpanan yang lebih baik.'
                      : lossSummary.production_waste_loss >
                        lossSummary.non_topping_expired_loss
                      ? 'Fokus meningkatkan kualitas produksi untuk mengurangi waste (gosong, bentuk jelek).'
                      : 'Fokus mengurangi donat polos expired. Sesuaikan target produksi dengan demand.'}
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Closing Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📝 Catatan Closing</CardTitle>
          <CardDescription>
            Tambahkan catatan atau informasi penting untuk owner (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              placeholder="Contoh: Hari ini banyak customer, stok hampir habis. Besok perlu tambah produksi."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              Catatan ini akan terlihat di laporan closing untuk owner
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info Box */}
      <Alert className="bg-amber-50 border-amber-200">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          <strong>💡 Catatan:</strong> Setelah klik "Simpan Closing", data tidak
          bisa diedit lagi. Pastikan semua data di Tab 1 dan Tab 2 sudah benar!
        </AlertDescription>
      </Alert>
    </div>
  );
}
