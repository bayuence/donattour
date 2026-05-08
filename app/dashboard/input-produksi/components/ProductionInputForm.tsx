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
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { useCreateProduction } from '@/lib/hooks/useProduction';
import { createProductionSchema } from '@/lib/validations/production';
import { WasteReasonInput } from '@/app/dashboard/input-produksi/components/WasteReasonInput';

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

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductionInputForm({ 
  outlets, 
  existingProduction,
  onSuccess 
}: ProductionInputFormProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [hppPerPcs, setHppPerPcs] = useState<number>(2000); // Default HPP
  const createProduction = useCreateProduction();
  const queryClient = useQueryClient();

  // Initialize form with react-hook-form + Zod validation
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<any>({
    resolver: zodResolver(createProductionSchema) as any,
    defaultValues: existingProduction || {
      outlet_id: '',
      tanggal: new Date().toISOString().split('T')[0],
      ukuran: 'standar',
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
  const { success_qty, waste_details, ukuran, outlet_id } = watchedValues;

  // ✅ AUTO LOAD HPP when outlet or ukuran changes
  useEffect(() => {
    const fetchHPP = async () => {
      if (!outlet_id || !ukuran) return;
      
      try {
        const response = await fetch(`/api/products/hpp?outlet_id=${outlet_id}&ukuran=${ukuran}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          setHppPerPcs(result.data.hpp);
          console.log(`[HPP Auto-Load] Outlet: ${outlet_id}, ${ukuran}: Rp ${result.data.hpp}`);
        }
      } catch (error) {
        console.error('Error fetching HPP:', error);
        // Fallback to default
        setHppPerPcs(ukuran === 'standar' ? 2000 : 1000);
      }
    };

    fetchHPP();
  }, [outlet_id, ukuran]);

  // Calculate totals
  const totalWaste = waste_details.reduce((sum: number, detail: any) => sum + (detail.qty || 0), 0);
  const totalHppLoss = waste_details.reduce(
    (sum: number, detail: any) => sum + ((detail.qty || 0) * (detail.hpp_per_pcs || 0)),
    0
  );
  
  // ✅ AUTO CALCULATE TARGET from success + waste
  const target_qty = success_qty + totalWaste;
  
  const successRate = target_qty > 0 ? (success_qty / target_qty) * 100 : 0;
  const wasteRate = target_qty > 0 ? (totalWaste / target_qty) * 100 : 0;

  // Validation warnings
  const hasHighWasteRate = wasteRate > 15;
  
  // ✅ LOGIKA BENAR:
  // 1. Boleh: Berhasil saja (tanpa waste)
  // 2. Boleh: Gagal saja (tanpa berhasil) - untuk tracking rugi
  // 3. Boleh: Berhasil + Gagal
  // 4. Tidak boleh: Tidak ada input sama sekali
  const noInput = success_qty === 0 && totalWaste === 0;
  
  // ✅ Jika ada waste detail, harus lengkap (alasan ≥ 5 karakter, qty > 0)
  const hasIncompleteWasteDetail = waste_details.some((detail: any) => 
    !detail.reason || detail.reason.trim().length < 5 || !detail.qty || detail.qty <= 0
  );

  // Handle form submission
  const onSubmit = async (data: any) => {
    try {
      // ✅ AUTO SET target_qty from success + waste
      const totalWaste = data.waste_details.reduce((sum: number, detail: any) => sum + (detail.qty || 0), 0);
      const submissionData = {
        ...data,
        target_qty: data.success_qty + totalWaste, // Auto calculate
      };
      
      // Prepare data for API - API will calculate waste_qty and total_hpp_loss
      await createProduction.mutateAsync(submissionData);
      
      // ✅ FIX #4: Invalidate React Query cache untuk sinkronisasi real-time
      // Invalidate inventory validation cache agar kasir refresh otomatis
      queryClient.invalidateQueries({ 
        queryKey: ['inventory', 'validation', submissionData.outlet_id] 
      });
      
      // Invalidate production list cache agar riwayat refresh
      queryClient.invalidateQueries({ 
        queryKey: ['production', 'daily', submissionData.outlet_id] 
      });
      
      // ✅ TAMBAHAN: Invalidate semua query production untuk refresh list
      queryClient.invalidateQueries({ 
        queryKey: ['production'] 
      });
      
      // Invalidate stock summary cache
      queryClient.invalidateQueries({ 
        queryKey: ['inventory', 'stock', submissionData.outlet_id] 
      });
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);

      // Reset form
      reset({
        outlet_id: submissionData.outlet_id,
        tanggal: new Date().toISOString().split('T')[0],
        ukuran: 'standar',
        success_qty: 0,
        waste_details: [],
      });

      // ✅ Call success callback untuk refresh parent component
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error creating production:', error);
    }
  };

  // Add waste reason
  const handleAddWaste = () => {
    append({
      reason: '',
      qty: 0,
      hpp_per_pcs: hppPerPcs, // ✅ Auto set HPP from state
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
            Produksi berhasil disimpan! {success_qty} donat berhasil, {totalWaste} gagal
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

      {/* Main Form Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">Input Produksi Harian</CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Catat hasil produksi donat dengan detail waste tracking
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Section 1: Informasi Dasar */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">1</div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Informasi Dasar</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Outlet */}
                <div className="space-y-2">
                  <Label htmlFor="outlet_id" className="text-sm font-medium text-slate-700">
                    Outlet <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="outlet_id"
                    {...register('outlet_id')}
                    className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm transition-colors hover:border-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">Pilih outlet...</option>
                    {outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.nama} {outlet.kode && `(${outlet.kode})`}
                      </option>
                    ))}
                  </select>
                  {errors.outlet_id && (
                    <p className="text-xs text-red-600">{String(errors.outlet_id.message)}</p>
                  )}
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <Label htmlFor="tanggal" className="text-sm font-medium text-slate-700">
                    Tanggal Produksi <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="tanggal"
                    type="date"
                    {...register('tanggal')}
                    max={new Date().toISOString().split('T')[0]}
                    className="h-11 rounded-lg border-slate-300 shadow-sm focus:border-amber-500 focus:ring-amber-500/20"
                  />
                  {errors.tanggal && (
                    <p className="text-xs text-red-600">{String(errors.tanggal.message)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Detail Produksi */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">2</div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Detail Produksi</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Size */}
                <div className="space-y-2">
                  <Label htmlFor="ukuran" className="text-sm font-medium text-slate-700">
                    Ukuran Donat <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="ukuran"
                    {...register('ukuran')}
                    className="flex h-11 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 shadow-sm transition-colors hover:border-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="standar">Standar</option>
                    <option value="mini">Mini</option>
                  </select>
                  {errors.ukuran && (
                    <p className="text-xs text-red-600">{String(errors.ukuran.message)}</p>
                  )}
                </div>

                {/* Success Quantity */}
                <div className="space-y-2">
                  <Label htmlFor="success_qty" className="text-sm font-medium text-slate-700">
                    Qty Berhasil <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="success_qty"
                    type="number"
                    min="0"
                    {...register('success_qty', { valueAsNumber: true })}
                    placeholder="0"
                    className="h-11 rounded-lg border-slate-300 shadow-sm focus:border-green-500 focus:ring-green-500/20 text-base font-medium"
                  />
                  {errors.success_qty && (
                    <p className="text-xs text-red-600">{String(errors.success_qty.message)}</p>
                  )}
                </div>
              </div>

              {/* Auto Calculated Summary */}
              {target_qty > 0 && (
                <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-center">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Target</p>
                    <p className="text-2xl font-bold text-slate-900">{target_qty}</p>
                    <p className="text-xs text-slate-500">pcs</p>
                  </div>
                  <div className="text-center border-l border-r border-slate-200">
                    <p className="text-xs font-medium text-green-600 uppercase tracking-wide mb-1">Berhasil</p>
                    <p className="text-2xl font-bold text-green-600">{success_qty}</p>
                    <p className="text-xs text-green-600">{successRate.toFixed(1)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-red-600 uppercase tracking-wide mb-1">Gagal</p>
                    <p className="text-2xl font-bold text-red-600">{totalWaste}</p>
                    <p className="text-xs text-red-600">{wasteRate.toFixed(1)}%</p>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Detail Gagal (Waste) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">3</div>
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Detail Gagal (Opsional)</h3>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddWaste}
                  className="h-9 text-xs font-medium border-slate-300 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Tambah Alasan
                </Button>
              </div>

              {fields.length === 0 && (
                <div className="text-center py-8 px-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                  <p className="text-sm text-slate-500">
                    Tidak ada waste. Klik "Tambah Alasan" jika ada donat yang gagal.
                  </p>
                </div>
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
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="text-xs font-medium text-red-600 uppercase tracking-wide">Total Waste</p>
                    <p className="text-xl font-bold text-red-700">{totalWaste} pcs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-red-600 uppercase tracking-wide">HPP Loss</p>
                    <p className="text-xl font-bold text-red-700">Rp {totalHppLoss.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Validation Warnings */}
            {noInput && (
              <Alert variant="destructive" className="border-red-300">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Belum ada input! Minimal harus ada qty berhasil atau gagal.
                </AlertDescription>
              </Alert>
            )}

            {hasIncompleteWasteDetail && (
              <Alert variant="destructive" className="border-red-300">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Ada detail waste yang belum lengkap! Pastikan alasan minimal 5 karakter dan qty &gt; 0.
                </AlertDescription>
              </Alert>
            )}

            {hasHighWasteRate && !noInput && !hasIncompleteWasteDetail && (
              <Alert className="border-yellow-400 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-sm text-yellow-800">
                  Waste rate tinggi ({wasteRate.toFixed(1)}%)! Perlu perhatian khusus.
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="submit"
                className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold shadow-sm"
                disabled={createProduction.isPending || noInput || hasIncompleteWasteDetail}
              >
                {createProduction.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Simpan Produksi
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
