// ============================================================================
// FINISHED PRODUCTS RECAP FORM COMPONENT
// ============================================================================
// File: components/pos/FinishedProductsRecapForm.tsx
// Description: Form untuk input rekap sisa produk jadi (sudah di-topping) untuk closing
// Version: 1.0
// Date: May 7, 2026
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Package, CheckCircle } from 'lucide-react';
import { getTodayWIB } from '@/lib/utils/timezone';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface FinishedProduct {
  product_id: string;
  product_name: string;
  quantity_standar: number;
  quantity_mini: number;
}

interface FinishedProductsRecapFormProps {
  isOpen: boolean;
  onClose: () => void;
  outletId: string;
  products: any[]; // List produk dari database
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Finished Products Recap Form
 * 
 * Form untuk input rekap sisa produk jadi (sudah di-topping) untuk closing harian.
 * User bisa input banyak produk sekaligus dengan jumlahnya.
 * 
 * Features:
 * - Multi-product input (bisa tambah banyak produk)
 * - Auto-calculate total
 * - Validation (tidak boleh kosong, quantity > 0)
 * - Submit ke database untuk closing report
 * 
 * @example
 * ```tsx
 * <FinishedProductsRecapForm
 *   isOpen={showRecap}
 *   onClose={() => setShowRecap(false)}
 *   outletId={outletId}
 *   products={allProducts}
 * />
 * ```
 */
export function FinishedProductsRecapForm({
  isOpen,
  onClose,
  outletId,
  products,
}: FinishedProductsRecapFormProps) {
  const [items, setItems] = useState<FinishedProduct[]>([
    { product_id: '', product_name: '', quantity_standar: 0, quantity_mini: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load existing data when dialog opens
  useEffect(() => {
    if (isOpen && outletId) {
      loadExistingData();
    }
  }, [isOpen, outletId]);

  // Load existing recap data for today
  const loadExistingData = async () => {
    setIsLoading(true);
    try {
      const today = getTodayWIB(); // ✅ Use WIB timezone
      const response = await fetch(`/api/finished-products-recap?outlet_id=${outletId}&date=${today}`);
      const result = await response.json();

      if (result.success && result.data.items && result.data.items.length > 0) {
        // Group by product_id (combine standar & mini into one row)
        const groupedMap = new Map<string, FinishedProduct>();
        
        result.data.items.forEach((item: any) => {
          const key = item.product_id;
          
          if (!groupedMap.has(key)) {
            groupedMap.set(key, {
              product_id: item.product_id || '',
              product_name: item.product_name,
              quantity_standar: 0,
              quantity_mini: 0,
            });
          }
          
          const grouped = groupedMap.get(key)!;
          if (item.ukuran === 'standar') {
            grouped.quantity_standar = item.quantity;
          } else if (item.ukuran === 'mini') {
            grouped.quantity_mini = item.quantity;
          }
        });
        
        setItems(Array.from(groupedMap.values()));
      } else {
        // No existing data, start with empty row
        setItems([{ product_id: '', product_name: '', quantity_standar: 0, quantity_mini: 0 }]);
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
      // On error, start with empty row
      setItems([{ product_id: '', product_name: '', quantity_standar: 0, quantity_mini: 0 }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add new item row
  const handleAddItem = () => {
    setItems([...items, { product_id: '', product_name: '', quantity_standar: 0, quantity_mini: 0 }]);
  };

  // Remove item row
  const handleRemoveItem = (index: number) => {
    if (items.length === 1) {
      toast.error('Minimal harus ada 1 produk');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Update product selection
  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      product_id: productId,
      product_name: product.nama,
    };
    setItems(newItems);
  };

  // Update quantity standar
  const handleQuantityStandarChange = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity_standar = Math.max(0, quantity);
    setItems(newItems);
  };

  // Update quantity mini
  const handleQuantityMiniChange = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity_mini = Math.max(0, quantity);
    setItems(newItems);
  };

  // Calculate total
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity_standar + item.quantity_mini, 0);

  // Validate form
  const isValid = () => {
    // Check if all items have product selected and at least one quantity > 0
    return items.every((item) => item.product_id && (item.quantity_standar > 0 || item.quantity_mini > 0));
  };

  // Submit form
  const handleSubmit = async () => {
    if (!isValid()) {
      toast.error('Pastikan semua produk sudah dipilih dan minimal 1 ukuran terisi');
      return;
    }

    setIsSubmitting(true);
    try {
      // Flatten items: 1 product with both sizes → 2 separate entries
      const flattenedItems: any[] = [];
      items.forEach((item) => {
        if (item.quantity_standar > 0) {
          flattenedItems.push({
            product_id: item.product_id,
            product_name: item.product_name,
            ukuran: 'standar',
            quantity: item.quantity_standar,
          });
        }
        if (item.quantity_mini > 0) {
          flattenedItems.push({
            product_id: item.product_id,
            product_name: item.product_name,
            ukuran: 'mini',
            quantity: item.quantity_mini,
          });
        }
      });

      const response = await fetch('/api/finished-products-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outletId,
          items: flattenedItems,
          total_quantity: totalQuantity,
          replace_existing: true, // Replace existing data for today
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Gagal menyimpan rekap');
      }

      toast.success('Rekap sisa produk jadi berhasil disimpan!');
      onClose();
    } catch (error: any) {
      console.error('Error submitting recap:', error);
      toast.error(`Gagal: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Rekap Sisa Produk Jadi
          </DialogTitle>
          <DialogDescription>
            Input semua produk jadi (sudah di-topping) yang masih tersisa untuk laporan closing
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
            <p className="text-sm text-slate-500">Memuat data...</p>
          </div>
        ) : (
        <div className="space-y-4 py-4">
          {/* Items List */}
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                {/* Product Select */}
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-600 mb-1 block">
                    Produk
                  </label>
                  <select
                    value={item.product_id}
                    onChange={(e) => handleProductChange(index, e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Pilih produk...</option>
                    {products
                      .filter((p) => p.is_active)
                      .sort((a, b) => a.nama.localeCompare(b.nama, 'id-ID'))
                      .map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.nama}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Quantity Standar */}
                <div className="w-24">
                  <label className="text-xs font-bold text-slate-600 mb-1 block">
                    Standar
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={item.quantity_standar || ''}
                    onChange={(e) =>
                      handleQuantityStandarChange(index, parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                {/* Quantity Mini */}
                <div className="w-24">
                  <label className="text-xs font-bold text-slate-600 mb-1 block">
                    Mini
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={item.quantity_mini || ''}
                    onChange={(e) =>
                      handleQuantityMiniChange(index, parseInt(e.target.value) || 0)
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                {/* Remove Button */}
                <div className="pt-6">
                  <button
                    onClick={() => handleRemoveItem(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Item Button */}
          <button
            onClick={handleAddItem}
            className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Tambah Produk
          </button>

          {/* Total Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-blue-900">
                Total Sisa Produk Jadi:
              </span>
              <span className="text-2xl font-black text-blue-600">
                {totalQuantity} pcs
              </span>
            </div>
            <p className="text-xs text-blue-600 mt-2">
              {items.filter((i) => i.product_id).length} jenis produk
            </p>
          </div>

          {/* Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              💡 <strong>Tips:</strong> Input semua produk jadi yang masih tersisa di outlet
              untuk laporan closing harian. Data ini akan digunakan untuk analisis stok dan
              perencanaan produksi besok.
            </p>
          </div>
        </div>
        )}

        {/* Actions */}
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
            onClick={handleSubmit}
            disabled={!isValid() || isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Simpan Rekap
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
