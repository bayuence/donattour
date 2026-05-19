'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

// Validation schema
const nonToppingStatusSchema = z.object({
  standar: z.object({
    total_sisa: z.number().int().min(0, 'Total sisa harus >= 0'),
    qty_fresh: z.number().int().min(0, 'Qty fresh harus >= 0'),
    qty_aging: z.number().int().min(0, 'Qty aging harus >= 0'),
    qty_expired: z.number().int().min(0, 'Qty expired harus >= 0'),
    hpp_loss_expired: z.number().min(0, 'HPP loss harus >= 0'),
    reason_expired: z.string().optional(),
  }).refine(
    (data) => data.qty_fresh + data.qty_aging + data.qty_expired === data.total_sisa,
    {
      message: 'Total (fresh + aging + expired) harus sama dengan total sisa',
      path: ['total_sisa'],
    }
  ).refine(
    (data) => data.qty_expired === 0 || (data.reason_expired && data.reason_expired.trim().length > 0),
    {
      message: 'Alasan expired wajib diisi jika ada expired',
      path: ['reason_expired'],
    }
  ),
  mini: z.object({
    total_sisa: z.number().int().min(0, 'Total sisa harus >= 0'),
    qty_fresh: z.number().int().min(0, 'Qty fresh harus >= 0'),
    qty_aging: z.number().int().min(0, 'Qty aging harus >= 0'),
    qty_expired: z.number().int().min(0, 'Qty expired harus >= 0'),
    hpp_loss_expired: z.number().min(0, 'HPP loss harus >= 0'),
    reason_expired: z.string().optional(),
  }).refine(
    (data) => data.qty_fresh + data.qty_aging + data.qty_expired === data.total_sisa,
    {
      message: 'Total (fresh + aging + expired) harus sama dengan total sisa',
      path: ['total_sisa'],
    }
  ).refine(
    (data) => data.qty_expired === 0 || (data.reason_expired && data.reason_expired.trim().length > 0),
    {
      message: 'Alasan expired wajib diisi jika ada expired',
      path: ['reason_expired'],
    }
  ),
});

type NonToppingStatusFormData = z.infer<typeof nonToppingStatusSchema>;

interface NonToppingStatusTabProps {
  outletId: string;
  onDataChange?: (data: NonToppingStatusFormData) => void;
  isLoading?: boolean;
}

export function NonToppingStatusTab({
  outletId,
  onDataChange,
  isLoading = false,
}: NonToppingStatusTabProps) {
  const [hppCosts, setHppCosts] = useState<{
    standar: number;
    mini: number;
  } | null>(null);
  const [hppLoading, setHppLoading] = useState(false);
  const [hppError, setHppError] = useState<string | null>(null);

  const form = useForm<NonToppingStatusFormData>({
    resolver: zodResolver(nonToppingStatusSchema),
    defaultValues: {
      standar: {
        total_sisa: 0,
        qty_fresh: 0,
        qty_aging: 0,
        qty_expired: 0,
        hpp_loss_expired: 0,
        reason_expired: '',
      },
      mini: {
        total_sisa: 0,
        qty_fresh: 0,
        qty_aging: 0,
        qty_expired: 0,
        hpp_loss_expired: 0,
        reason_expired: '',
      },
    },
  });

  // Fetch HPP costs from outlet_production_costs
  const fetchHppCosts = useCallback(async () => {
    if (!outletId) return;

    setHppLoading(true);
    setHppError(null);

    try {
      const response = await fetch(
        `/api/outlet-production-costs?outlet_id=${outletId}`
      );

      if (!response.ok) {
        throw new Error('Gagal mengambil data HPP');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setHppCosts({
          standar: data.data.cost_polos_standar || 0,
          mini: data.data.cost_polos_mini || 0,
        });
      }
    } catch (error) {
      setHppError(
        error instanceof Error ? error.message : 'Gagal mengambil data HPP'
      );
      console.error('Error fetching HPP costs:', error);
    } finally {
      setHppLoading(false);
    }
  }, [outletId]);

  // Fetch HPP costs on component mount
  useEffect(() => {
    fetchHppCosts();
  }, [fetchHppCosts]);

  // Calculate HPP loss when qty_expired changes
  const calculateHppLoss = useCallback(
    (size: 'standar' | 'mini', qtyExpired: number) => {
      if (!hppCosts) return 0;
      const hpp = hppCosts[size];
      return hpp * qtyExpired;
    },
    [hppCosts]
  );

  // Handle qty changes and auto-calculate HPP loss
  const handleQtyChange = useCallback(
    (size: 'standar' | 'mini', field: string, value: number) => {
      const currentData = form.getValues(size);

      if (field === 'qty_expired') {
        const hppLoss = calculateHppLoss(size, value);
        form.setValue(`${size}.hpp_loss_expired`, hppLoss);
      }

      // Validate total
      const fresh = field === 'qty_fresh' ? value : currentData.qty_fresh;
      const aging = field === 'qty_aging' ? value : currentData.qty_aging;
      const expired = field === 'qty_expired' ? value : currentData.qty_expired;
      const total = fresh + aging + expired;

      // Update total_sisa if it's different
      if (total !== currentData.total_sisa) {
        form.setValue(`${size}.total_sisa`, total);
      }

      // Trigger validation
      form.trigger(`${size}`);

      // Notify parent component
      if (onDataChange) {
        onDataChange(form.getValues());
      }
    },
    [form, calculateHppLoss, onDataChange]
  );

  // Render size section
  const renderSizeSection = (size: 'standar' | 'mini', label: string) => {
    const sizeData = form.watch(size);
    const hppPolos = hppCosts?.[size] || 0;
    const totalQty = sizeData.qty_fresh + sizeData.qty_aging + sizeData.qty_expired;
    const isValid = totalQty === sizeData.total_sisa;

    return (
      <Card key={size} className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Donat {label}</CardTitle>
          <CardDescription>
            Total sisa: {sizeData.total_sisa} pcs | HPP Polos: Rp{' '}
            {hppPolos.toLocaleString('id-ID')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Total Sisa Display */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm font-medium text-blue-900">
              Total Sisa dari Sistem: {sizeData.total_sisa} pcs
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Silakan isi status: fresh, aging, dan expired
            </p>
          </div>

          {/* Qty Fresh */}
          <FormField
            control={form.control}
            name={`${size}.qty_fresh`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qty Fresh (Simpan Besok)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    {...field}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      field.onChange(value);
                      handleQtyChange(size, 'qty_fresh', value);
                    }}
                    disabled={isLoading || hppLoading}
                  />
                </FormControl>
                <FormDescription>
                  Donat fresh yang bisa disimpan untuk dijual besok
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Qty Aging */}
          <FormField
            control={form.control}
            name={`${size}.qty_aging`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qty Aging (Diskon Besok)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    {...field}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      field.onChange(value);
                      handleQtyChange(size, 'qty_aging', value);
                    }}
                    disabled={isLoading || hppLoading}
                  />
                </FormControl>
                <FormDescription>
                  Donat aging yang harus dijual dengan diskon besok
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Qty Expired */}
          <FormField
            control={form.control}
            name={`${size}.qty_expired`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Qty Expired (Buang)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    {...field}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      field.onChange(value);
                      handleQtyChange(size, 'qty_expired', value);
                    }}
                    disabled={isLoading || hppLoading}
                  />
                </FormControl>
                <FormDescription>
                  Donat expired yang tidak bisa dijual (waste)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* HPP Loss Display */}
          {sizeData.qty_expired > 0 && (
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-900">
                💰 HPP Loss Expired:
              </p>
              <p className="text-lg font-bold text-red-700 mt-1">
                Rp {sizeData.hpp_loss_expired.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-red-600 mt-1">
                = {sizeData.qty_expired} pcs × Rp{' '}
                {hppPolos.toLocaleString('id-ID')}
              </p>
            </div>
          )}

          {/* Reason Expired */}
          {sizeData.qty_expired > 0 && (
            <FormField
              control={form.control}
              name={`${size}.reason_expired`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alasan Expired *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Contoh: Terlalu lama tidak terpakai, tekstur berubah, dll"
                      {...field}
                      disabled={isLoading || hppLoading}
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Wajib diisi untuk tracking dan analisis
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Validation Status */}
          <div className="mt-4 pt-4 border-t">
            {isValid ? (
              <Alert className="bg-green-50 border-green-200">
                <Info className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700">
                  ✅ Total valid: {sizeData.qty_fresh} + {sizeData.qty_aging} +{' '}
                  {sizeData.qty_expired} = {totalQty} pcs
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700">
                  ❌ Total tidak sesuai: {sizeData.qty_fresh} + {sizeData.qty_aging}{' '}
                  + {sizeData.qty_expired} = {totalQty} pcs (seharusnya{' '}
                  {sizeData.total_sisa} pcs)
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Sisa Donat Non-Topping</h3>
        <p className="text-sm text-gray-600 mt-1">
          Isi status sisa donat polos (fresh, aging, expired) untuk setiap ukuran
        </p>
      </div>

      {/* HPP Loading */}
      {hppLoading && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Mengambil data HPP polos...
          </AlertDescription>
        </Alert>
      )}

      {/* HPP Error */}
      {hppError && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {hppError}
          </AlertDescription>
        </Alert>
      )}

      {/* HPP Costs Display */}
      {hppCosts && (
        <Alert className="bg-green-50 border-green-200">
          <Info className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            ✅ HPP Polos Standar: Rp {hppCosts.standar.toLocaleString('id-ID')} |
            Mini: Rp {hppCosts.mini.toLocaleString('id-ID')}
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Form {...form}>
        <form className="space-y-6">
          {/* Standar Section */}
          {renderSizeSection('standar', 'Standar')}

          {/* Mini Section */}
          {renderSizeSection('mini', 'Mini')}

          {/* Summary */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base">📊 Summary Rugi Non-Topping</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Standar Expired:</span>
                  <span className="font-semibold">
                    Rp {form.watch('standar.hpp_loss_expired').toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Mini Expired:</span>
                  <span className="font-semibold">
                    Rp {form.watch('mini.hpp_loss_expired').toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-base">
                  <span>Total Rugi Non-Topping:</span>
                  <span className="text-red-600">
                    Rp{' '}
                    {(
                      form.watch('standar.hpp_loss_expired') +
                      form.watch('mini.hpp_loss_expired')
                    ).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* Info Box */}
      <Alert className="bg-amber-50 border-amber-200">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          <strong>💡 Catatan:</strong> Fresh & aging bisa dijual besok dengan
          diskon. Expired tidak bisa dijual dan masuk ke laporan rugi.
        </AlertDescription>
      </Alert>
    </div>
  );
}
