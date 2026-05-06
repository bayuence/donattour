// ============================================================================
// TOPPING ERROR FORM COMPONENT
// ============================================================================
// File: components/pos/ToppingErrorForm.tsx
// Description: Form untuk lapor kesalahan topping dari POS interface
// Version: 2.0 - FIXED HPP CALCULATION
// Date: 2026-05-03
//
// 🚨 CRITICAL CHANGES:
// - Removed manual HPP and topping cost inputs
// - Auto-fetch HPP breakdown from API
// - Display calculated breakdown to user
// - Pass outlet_id to API for correct calculation
// ============================================================================

'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// ============================================================================
// TYPES
// ============================================================================

interface ToppingErrorFormProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Outlet ID (REQUIRED for correct HPP calculation) */
  outletId: string;
  /** List of products for dropdown */
  products?: Array<{ id: string; name: string }>;
  /** Callback after successful submission */
  onSuccess?: () => void;
}

interface FormData {
  product_ordered: string;
  product_made: string;
  qty: number;
  reason: string;
}

interface HPPBreakdown {
  hpp_per_pcs: number;
  topping_cost: number;
  total_hpp_loss: number;
  breakdown?: {
    hpp_polos: number;
    biaya_topping: number;
    qty: number;
    calculation: string;
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Topping Error Form - Form untuk lapor kesalahan topping
 * 
 * Features:
 * - Product ordered dropdown (what customer wanted)
 * - Product made dropdown (what was actually made)
 * - Quantity input
 * - Reason textarea (min 10 characters)
 * - Auto-calculate HPP breakdown from API
 * - Display breakdown: HPP Polos + Biaya Topping × Qty = Total
 * - Confirmation before submit
 * - Success message after submission
 * 
 * 🚨 CRITICAL: outlet_id is REQUIRED for correct HPP calculation
 * 
 * @example
 * ```tsx
 * const [showForm, setShowForm] = useState(false);
 * 
 * <ToppingErrorForm
 *   open={showForm}
 *   onClose={() => setShowForm(false)}
 *   outletId="outlet-123"  // REQUIRED!
 *   products={productList}
 * />
 * ```
 */
export function ToppingErrorForm({
  open,
  onClose,
  outletId,
  products = [],
  onSuccess,
}: ToppingErrorFormProps) {
  const [formData, setFormData] = useState<FormData>({
    product_ordered: '',
    product_made: '',
    qty: 1,
    reason: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hppBreakdown, setHppBreakdown] = useState<HPPBreakdown | null>(null);

  // Handle input change
  const handleChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.product_ordered) {
      newErrors.product_ordered = 'Produk yang dipesan harus dipilih';
    }
    if (!formData.product_made) {
      newErrors.product_made = 'Produk yang dibuat harus dipilih';
    }
    if (formData.product_ordered === formData.product_made) {
      newErrors.product_made = 'Produk yang dibuat harus berbeda dengan yang dipesan';
    }
    if (formData.qty <= 0) {
      newErrors.qty = 'Jumlah harus lebih dari 0';
    }
    if (formData.reason.trim().length < 10) {
      newErrors.reason = 'Alasan minimal 10 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validate()) return;

    setShowConfirmation(true);
  };

  // Handle confirmed submit
  const handleConfirmedSubmit = async () => {
    setShowConfirmation(false);
    setIsSubmitting(true);
    setErrors({}); // Clear previous errors

    try {
      const response = await fetch('/api/topping-errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outlet_id: outletId,  // ✅ CRITICAL: Pass outlet_id for HPP calculation
          ...formData,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Show detailed error message
        const errorMessage = result.message || 'Failed to submit error report';
        const errorDetails = result.error || '';
        const fullError = errorDetails ? `${errorMessage}\n\nDetail: ${errorDetails}` : errorMessage;
        
        throw new Error(fullError);
      }

      // Save HPP breakdown from API response
      setHppBreakdown(result.data);

      // Show success message
      setShowSuccess(true);
      
      // Reset form
      setFormData({
        product_ordered: '',
        product_made: '',
        qty: 1,
        reason: '',
      });

      // Call success callback
      onSuccess?.();

      // Auto close after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setHppBreakdown(null);
        onClose();
      }, 3000);

    } catch (error: any) {
      console.error('Error submitting topping error:', error);
      
      // Show error in confirmation dialog
      setErrors({ 
        submit: error.message || 'Gagal mengirim laporan. Silakan coba lagi.' 
      });
      
      // Re-open confirmation dialog to show error
      setShowConfirmation(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close
  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        product_ordered: '',
        product_made: '',
        qty: 1,
        reason: '',
      });
      setErrors({});
      setShowConfirmation(false);
      setShowSuccess(false);
      setHppBreakdown(null);
      onClose();
    }
  };

  return (
    <>
      {/* Main Form Dialog */}
      <Dialog open={open && !showConfirmation && !showSuccess} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Lapor Kesalahan Topping
            </DialogTitle>
            <DialogDescription>
              Laporkan kesalahan pembuatan produk dengan topping yang salah
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Product Ordered */}
            <div className="space-y-2">
              <Label htmlFor="product_ordered">
                Produk yang Dipesan <span className="text-red-500">*</span>
              </Label>
              <select
                id="product_ordered"
                value={formData.product_ordered}
                onChange={(e) => handleChange('product_ordered', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Pilih produk...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.name}>
                    {product.name}
                  </option>
                ))}
              </select>
              {errors.product_ordered && (
                <p className="text-sm text-red-500">{errors.product_ordered}</p>
              )}
            </div>

            {/* Product Made */}
            <div className="space-y-2">
              <Label htmlFor="product_made">
                Produk yang Dibuat <span className="text-red-500">*</span>
              </Label>
              <select
                id="product_made"
                value={formData.product_made}
                onChange={(e) => handleChange('product_made', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Pilih produk...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.name}>
                    {product.name}
                  </option>
                ))}
              </select>
              {errors.product_made && (
                <p className="text-sm text-red-500">{errors.product_made}</p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="qty">
                Jumlah <span className="text-red-500">*</span>
              </Label>
              <Input
                id="qty"
                type="number"
                min="1"
                value={formData.qty}
                onChange={(e) => handleChange('qty', parseInt(e.target.value) || 0)}
              />
              {errors.qty && (
                <p className="text-sm text-red-500">{errors.qty}</p>
              )}
            </div>

            {/* Info: HPP will be calculated automatically */}
            <Alert className="border-blue-300 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 text-sm">
                HPP dan biaya topping akan dihitung otomatis berdasarkan outlet dan produk yang dipilih
              </AlertDescription>
            </Alert>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Alasan / Keterangan <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Jelaskan kesalahan yang terjadi (minimal 10 karakter)..."
                value={formData.reason}
                onChange={(e) => handleChange('reason', e.target.value)}
                rows={4}
              />
              <p className="text-xs text-slate-500">
                {formData.reason.length}/10 karakter minimum
              </p>
              {errors.reason && (
                <p className="text-sm text-red-500">{errors.reason}</p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors.submit}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              Laporkan Kesalahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={() => !isSubmitting && setShowConfirmation(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Laporan</DialogTitle>
            <DialogDescription>
              Pastikan data yang Anda masukkan sudah benar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-slate-600">Produk Dipesan:</div>
              <div className="font-medium">{formData.product_ordered}</div>
              
              <div className="text-slate-600">Produk Dibuat:</div>
              <div className="font-medium">{formData.product_made}</div>
              
              <div className="text-slate-600">Jumlah:</div>
              <div className="font-medium">{formData.qty} pcs</div>
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm text-slate-600">Alasan:</p>
              <p className="text-sm mt-1">{formData.reason}</p>
            </div>

            {/* Error Display */}
            {errors.submit && (
              <Alert variant="destructive" className="mt-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="whitespace-pre-wrap">
                  {errors.submit}
                </AlertDescription>
              </Alert>
            )}

            {/* Info if no error */}
            {!errors.submit && (
              <Alert className="border-orange-300 bg-orange-50">
                <Info className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-700 text-sm">
                  HPP dan total rugi akan dihitung otomatis setelah laporan dikirim
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmation(false);
                setErrors({});
              }}
              disabled={isSubmitting}
            >
              Kembali
            </Button>
            <Button onClick={handleConfirmedSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Mengirim...' : 'Ya, Laporkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-green-600">
                Laporan Berhasil Dikirim!
              </h3>
              <p className="text-sm text-slate-600">
                Kesalahan topping telah dicatat dalam sistem
              </p>
              
              {/* Display HPP Breakdown */}
              {hppBreakdown && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg text-left">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    Rincian HPP:
                  </p>
                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>HPP Polos:</span>
                      <span className="font-medium">
                        Rp {hppBreakdown.hpp_per_pcs.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Biaya Topping:</span>
                      <span className="font-medium">
                        Rp {hppBreakdown.topping_cost.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jumlah:</span>
                      <span className="font-medium">{formData.qty} pcs</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-300">
                      <span className="font-semibold">Total Rugi:</span>
                      <span className="font-bold text-red-600">
                        Rp {hppBreakdown.total_hpp_loss.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                  {hppBreakdown.breakdown && (
                    <p className="text-xs text-slate-500 mt-2 italic">
                      {hppBreakdown.breakdown.calculation}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
