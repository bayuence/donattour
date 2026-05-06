// ============================================================================
// PRODUCTION INPUT FORM COMPONENT
// ============================================================================
// File: app/dashboard/input-produksi/components/ProductionInputForm.tsx
// Description: Form untuk input produksi harian dengan waste tracking
// Version: 1.0
// Date: 2026-05-03
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Plus, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useCreateProduction } from '@/lib/hooks/useProduction';
import { createProductionSchema } from '@/lib/validations/production';
import { WASTE_REASONS } from '@/lib/constants/production';
import type { CreateProductionDaily } from '@/lib/types/production';
import { WasteReasonInput } from '@/app/dashboard/input-produksi/components/WasteReasonInput';
import { ProductionSummaryCard } from '@/app/dashboard/input-produksi/components/ProductionSummaryCard';

// ============================================================================
// TYPES
// ============================================================================

interface Outlet {
  id: string;
  nama: string;
  kode?: string;
}

interface ProductionInputFormProps {
  outlets: Outlet[];
  existingProduction?: any;
  onSuccess?: () => void;
}

interface FormData {
  outlet_id: string;
  tanggal: string;
  ukuran: 'standar' | 'mini';
  target_qty: number;
  success_qty: number;
  waste_details: Array<{
    reason: string;
    qty: number;
    hpp_per_pcs: number;
  }>;
  created_by?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductionInputForm({ 
  outlets, 
  existingProduction,
  onSuccess 
}: ProductionInputFormProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const createProduction = useCreateProduction();

  // Initialize form with react-hook-form + Zod validation
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<any>({
    resolver: zodResolver(createProductionSchema) as any,
    defaultValues: existingProduction || {
      outlet_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      ukuran: 'standar',
      target_qty: 0,
      success_qty: 0,
      waste_details: [],
    },
  });

  // Field array for dynamic waste reasons
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'waste_details',
  });

  // Watch form values for real-time calculations
  const watchedValues = watch();
  const { target_qty, success_qty, waste_details } = watchedValues;

  // Calculate totals
  const totalWaste = waste_details.reduce((sum: number, detail: any) => sum + (detail.qty || 0), 0);
  const totalHppLoss = waste_details.reduce(
    (sum: number, detail: any) => sum + ((detail.qty || 0) * (detail.hpp_per_pcs || 0)),
    0
  );
  const successRate = target_qty > 0 ? (success_qty / target_qty) * 100 : 0;
  const wasteRate = target_qty > 0 ? (totalWaste / target_qty) * 100 : 0;
  const totalInput = success_qty + totalWaste;

  // Validation warnings
  const hasHighWasteRate = wasteRate > 15;
  const exceedsTarget = totalInput > target_qty;

  // Handle form submission
  const onSubmit = async (data: any) => {
    try {
      // Prepare data for API - API will calculate waste_qty and total_hpp_loss
      await createProduction.mutateAsync(data);
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Reset form
      reset({
        outlet_id: data.outlet_id,
        tanggal: new Date().toISOString().split('T')[0],
        ukuran: 'standar',
        target_qty: 0,
        success_qty: 0,
        waste_details: [],
      });

      // Call success callback
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating production:', error);
    }
  };

  // Add waste reason
  const handleAddWaste = () => {
    append({
      reason: '',
      qty: 0,
      hpp_per_pcs: 2000, // Default HPP
    });
  };

  // Remove waste reason
  const handleRemoveWaste = (index: number) => {
    remove(index);
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccess && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            ✅ Produksi berhasil disimpan! {success_qty} donat berhasil, {totalWaste} waste
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {createProduction.isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {createProduction.error?.message || 'Gagal menyimpan produksi'}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Input Produksi Harian
          </CardTitle>
          <CardDescription>
            Input hasil produksi donat dengan detail waste tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Outlet & Date Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Outlet */}
              <div className="space-y-2">
                <Label htmlFor="outlet_id">Outlet *</Label>
                <select
                  id="outlet_id"
                  {...register('outlet_id')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Pilih outlet...</option>
                  {outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.nama} {outlet.kode && `(${outlet.kode})`}
                    </option>
                  ))}
                </select>
                {errors.outlet_id && (
                  <p className="text-sm text-red-500">{String(errors.outlet_id.message)}</p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="tanggal">Tanggal Produksi *</Label>
                <Input
                  id="tanggal"
                  type="date"
                  {...register('tanggal')}
                  max={new Date().toISOString().split('T')[0]}
                />
                {errors.tanggal && (
                  <p className="text-sm text-red-500">{String(errors.tanggal.message)}</p>
                )}
              </div>
            </div>

            {/* Size & Target */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Size */}
              <div className="space-y-2">
                <Label htmlFor="ukuran">Ukuran Donat *</Label>
                <select
                  id="ukuran"
                  {...register('ukuran')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="standar">Standar</option>
                  <option value="mini">Mini</option>
                </select>
                {errors.ukuran && (
                  <p className="text-sm text-red-500">{String(errors.ukuran.message)}</p>
                )}
              </div>

              {/* Target */}
              <div className="space-y-2">
                <Label htmlFor="target_qty">Target Produksi *</Label>
                <Input
                  id="target_qty"
                  type="number"
                  min="1"
                  {...register('target_qty', { valueAsNumber: true })}
                  placeholder="200"
                />
                {errors.target_qty && (
                  <p className="text-sm text-red-500">{String(errors.target_qty.message)}</p>
                )}
              </div>
            </div>

            <div className="border-t pt-4" />

            {/* Success Quantity */}
            <div className="space-y-2">
              <Label htmlFor="success_qty">Qty Berhasil (Success) *</Label>
              <Input
                id="success_qty"
                type="number"
                min="0"
                {...register('success_qty', { valueAsNumber: true })}
                placeholder="0"
                className="text-lg font-semibold"
              />
              {errors.success_qty && (
                <p className="text-sm text-red-500">{String(errors.success_qty.message)}</p>
              )}
              <div className="flex items-center gap-2 text-sm">
                <div className="flex-1 bg-green-100 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(successRate, 100)}%` }}
                  />
                </div>
                <span className="text-green-700 font-medium w-12 text-right">
                  {successRate.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="border-t pt-4" />

            {/* Waste Details Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Detail Waste (Gagal)</Label>
                  <p className="text-sm text-muted-foreground">
                    Tambahkan alasan dan jumlah donat yang gagal
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddWaste}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Alasan
                </Button>
              </div>

              {fields.length === 0 && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>Belum ada waste. Klik "Tambah Alasan" jika ada donat yang gagal.</p>
                  </CardContent>
                </Card>
              )}

              {fields.map((field, index) => (
                <WasteReasonInput
                  key={field.id}
                  index={index}
                  register={register}
                  errors={errors}
                  onRemove={() => handleRemoveWaste(index)}
                />
              ))}

              {/* Waste Summary */}
              {fields.length > 0 && (
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Waste</p>
                        <p className="text-2xl font-bold text-red-700">{totalWaste} pcs</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total HPP Loss</p>
                        <p className="text-2xl font-bold text-red-700">
                          Rp {totalHppLoss.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm mt-2">
                      <div className="flex-1 bg-red-100 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(wasteRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-red-700 font-medium w-12 text-right">
                        {wasteRate.toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="border-t pt-4" />

            {/* Production Summary */}
            <ProductionSummaryCard
              target={target_qty}
              success={success_qty}
              waste={totalWaste}
              successRate={successRate}
              wasteRate={wasteRate}
            />

            {/* Validation Warnings */}
            {exceedsTarget && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Total input ({totalInput}) melebihi target ({target_qty})!
                </AlertDescription>
              </Alert>
            )}

            {hasHighWasteRate && !exceedsTarget && (
              <Alert className="border-yellow-500 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  ⚠️ Waste rate tinggi ({wasteRate.toFixed(1)}%)! Perlu perhatian khusus.
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1"
                disabled={createProduction.isPending || exceedsTarget}
              >
                {createProduction.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Simpan Produksi
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="text-blue-600 text-2xl">💡</div>
            <div className="space-y-2 text-sm text-blue-900">
              <p className="font-medium">Tips Input Produksi:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Input segera setelah produksi selesai untuk data akurat</li>
                <li>Donat berhasil akan otomatis masuk ke inventory</li>
                <li>Waste akan dicatat untuk analisis dan laporan</li>
                <li>Waste rate di atas 15% akan memicu alert ke owner</li>
                <li>Hanya bisa edit produksi hari ini</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
