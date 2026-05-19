'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { NonToppingStatusTab } from './NonToppingStatusTab';
import { FinishedProductsTab } from './FinishedProductsTab';
import { ClosingSummaryTab } from './ClosingSummaryTab';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ClosingFormProps {
  outletId: string;
  outletName: string;
  tanggal: string;
}

export function ClosingForm({
  outletId,
  outletName,
  tanggal,
}: ClosingFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('non-topping');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [lossSummary, setLossSummary] = useState<any>(null);

  // Form data state
  const [nonToppingData, setNonToppingData] = useState<any>(null);
  const [finishedProductsData, setFinishedProductsData] = useState<any>(null);
  const [closingNotes, setClosingNotes] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare closing data
      const closingPayload = {
        outlet_id: outletId,
        tanggal: tanggal,
        non_topping_status: [
          {
            ukuran: 'standar',
            total_sisa: nonToppingData?.standar?.total_sisa || 0,
            qty_fresh: nonToppingData?.standar?.qty_fresh || 0,
            qty_aging: nonToppingData?.standar?.qty_aging || 0,
            qty_expired: nonToppingData?.standar?.qty_expired || 0,
            hpp_loss_expired: nonToppingData?.standar?.hpp_loss_expired || 0,
            reason_expired: nonToppingData?.standar?.reason_expired || null,
          },
          {
            ukuran: 'mini',
            total_sisa: nonToppingData?.mini?.total_sisa || 0,
            qty_fresh: nonToppingData?.mini?.qty_fresh || 0,
            qty_aging: nonToppingData?.mini?.qty_aging || 0,
            qty_expired: nonToppingData?.mini?.qty_expired || 0,
            hpp_loss_expired: nonToppingData?.mini?.hpp_loss_expired || 0,
            reason_expired: nonToppingData?.mini?.reason_expired || null,
          },
        ],
        finished_products: finishedProductsData || [],
        notes: closingNotes,
      };

      // Submit to API
      const response = await fetch('/api/closing/daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(closingPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || 'Gagal menyimpan closing'
        );
      }

      // Success
      setSuccess(true);
      setLossSummary(result.data?.loss_summary);
      setShowConfirmation(false);

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/closing');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      console.error('Error submitting closing:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            ✅ Closing berhasil disimpan!
          </AlertDescription>
        </Alert>

        {lossSummary && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
            <h3 className="font-semibold text-lg">📊 Summary Rugi Harian</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-red-50 p-3 rounded">
                <p className="text-sm text-gray-600">Gagal Produksi</p>
                <p className="text-lg font-bold text-red-600">
                  Rp {lossSummary.production_waste_loss?.toLocaleString('id-ID') || 0}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <p className="text-sm text-gray-600">Salah Topping</p>
                <p className="text-lg font-bold text-red-600">
                  Rp {lossSummary.topping_error_loss?.toLocaleString('id-ID') || 0}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <p className="text-sm text-gray-600">Polos Expired</p>
                <p className="text-lg font-bold text-red-600">
                  Rp {lossSummary.non_topping_expired_loss?.toLocaleString('id-ID') || 0}
                </p>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <p className="text-sm text-gray-600">Jadi Reject</p>
                <p className="text-lg font-bold text-red-600">
                  Rp {lossSummary.finished_product_reject_loss?.toLocaleString('id-ID') || 0}
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-red-100 to-orange-100 p-4 rounded border border-red-300">
              <p className="text-sm text-gray-600">Total Rugi Hari Ini</p>
              <p className="text-2xl font-bold text-red-700">
                Rp {lossSummary.total_loss?.toLocaleString('id-ID') || 0}
              </p>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-600">
          Redirecting ke halaman closing...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h2 className="text-xl font-semibold">{outletName}</h2>
        <p className="text-sm text-gray-600">Tanggal: {tanggal}</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="non-topping">
            Tab 1: Sisa Polos
          </TabsTrigger>
          <TabsTrigger value="finished-products">
            Tab 2: Sisa Jadi
          </TabsTrigger>
          <TabsTrigger value="summary">
            Tab 3: Summary
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Non-Topping Status */}
        <TabsContent value="non-topping" className="space-y-4">
          <NonToppingStatusTab
            outletId={outletId}
            onDataChange={setNonToppingData}
            isLoading={isSubmitting}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setActiveTab('finished-products')}
            >
              Lanjut ke Tab 2 →
            </Button>
          </div>
        </TabsContent>

        {/* Tab 2: Finished Products Status */}
        <TabsContent value="finished-products" className="space-y-4">
          <FinishedProductsTab
            outletId={outletId}
            onDataChange={setFinishedProductsData}
            isLoading={isSubmitting}
          />
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setActiveTab('non-topping')}
            >
              ← Kembali ke Tab 1
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab('summary')}
            >
              Lanjut ke Tab 3 →
            </Button>
          </div>
        </TabsContent>

        {/* Tab 3: Summary & Submit */}
        <TabsContent value="summary" className="space-y-4">
          <ClosingSummaryTab
            outletId={outletId}
            tanggal={tanggal}
            nonToppingData={nonToppingData}
            finishedProductsData={finishedProductsData || []}
            notes={closingNotes}
            onNotesChange={setClosingNotes}
          />
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => setActiveTab('finished-products')}
            >
              ← Kembali ke Tab 2
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Submit Button */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button
          onClick={() => setShowConfirmation(true)}
          disabled={isSubmitting || !nonToppingData}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            '💾 Simpan Closing'
          )}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Closing Harian</DialogTitle>
            <DialogDescription>
              Pastikan semua data sudah benar sebelum menyimpan
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded text-sm space-y-2">
              <p>
                <strong>Outlet:</strong> {outletName}
              </p>
              <p>
                <strong>Tanggal:</strong> {tanggal}
              </p>
              <p>
                <strong>Sisa Polos Standar:</strong>{' '}
                {nonToppingData?.standar?.total_sisa || 0} pcs
              </p>
              <p>
                <strong>Sisa Polos Mini:</strong>{' '}
                {nonToppingData?.mini?.total_sisa || 0} pcs
              </p>
            </div>

            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700">
                Closing tidak bisa diedit setelah disimpan. Pastikan semua data
                sudah benar!
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Ya, Simpan Closing'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
