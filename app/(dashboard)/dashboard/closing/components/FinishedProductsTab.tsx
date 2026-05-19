'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info, Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Validation schema for single product
const finishedProductSchema = z.object({
  product_id: z.string().optional(),
  product_name: z.string().min(1, 'Nama produk wajib diisi'),
  total_sisa: z.number().int().min(0, 'Total sisa harus >= 0'),
  qty_fresh: z.number().int().min(0, 'Qty fresh harus >= 0'),
  qty_aging: z.number().int().min(0, 'Qty aging harus >= 0'),
  qty_reject: z.number().int().min(0, 'Qty reject harus >= 0'),
  hpp_topping_loss: z.number().min(0, 'HPP loss harus >= 0'),
  reason_reject: z.string().optional(),
}).refine(
  (data) => data.qty_fresh + data.qty_aging + data.qty_reject === data.total_sisa,
  {
    message: 'Total (fresh + aging + reject) harus sama dengan total sisa',
    path: ['total_sisa'],
  }
).refine(
  (data) => data.qty_reject === 0 || (data.reason_reject && data.reason_reject.trim().length > 0),
  {
    message: 'Alasan reject wajib diisi jika ada reject',
    path: ['reason_reject'],
  }
);

// Form schema
const finishedProductsSchema = z.object({
  products: z.array(finishedProductSchema),
});

type FinishedProductsFormData = z.infer<typeof finishedProductsSchema>;
type FinishedProduct = z.infer<typeof finishedProductSchema>;

interface FinishedProductsTabProps {
  outletId: string;
  onDataChange?: (data: FinishedProduct[]) => void;
  isLoading?: boolean;
}

interface Product {
  id: string;
  nama: string;
  ukuran: 'standar' | 'mini';
  harga_pokok_penjualan: number;
}

interface HppBreakdown {
  hpp_polos: number;
  hpp_total: number;
  biaya_topping: number;
}

export function FinishedProductsTab({
  outletId,
  onDataChange,
  isLoading = false,
}: FinishedProductsTabProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [hppCosts, setHppCosts] = useState<{
    standar: number;
    mini: number;
  } | null>(null);
  const [hppBreakdowns, setHppBreakdowns] = useState<Map<number, HppBreakdown>>(new Map());

  const form = useForm<FinishedProductsFormData>({
    resolver: zodResolver(finishedProductsSchema),
    defaultValues: {
      products: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'products',
  });

  // Fetch products list
  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    setProductsError(null);

    try {
      const response = await fetch('/api/products?category=finished');
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data produk');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setProducts(data.data);
      }
    } catch (error) {
      setProductsError(
        error instanceof Error ? error.message : 'Gagal mengambil data produk'
      );
      console.error('Error fetching products:', error);
    } finally {
      setProductsLoading(false);
    }
  }, []);

  // Fetch HPP costs
  const fetchHppCosts = useCallback(async () => {
    if (!outletId) return;

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
      console.error('Error fetching HPP costs:', error);
    }
  }, [outletId]);

  // Fetch data on mount
  useEffect(() => {
    fetchProducts();
    fetchHppCosts();
  }, [fetchProducts, fetchHppCosts]);

  // Calculate HPP breakdown for a product
  const calculateHppBreakdown = useCallback(
    (productName: string): HppBreakdown | null => {
      if (!hppCosts) return null;

      const product = products.find((p) => p.nama === productName);
      if (!product) return null;

      const hpp_polos = product.ukuran === 'standar' 
        ? hppCosts.standar 
        : hppCosts.mini;
      const hpp_total = product.harga_pokok_penjualan;
      const biaya_topping = hpp_total - hpp_polos;

      return {
        hpp_polos,
        hpp_total,
        biaya_topping,
      };
    },
    [products, hppCosts]
  );

  // Calculate HPP topping loss
  const calculateHppToppingLoss = useCallback(
    (productName: string, qtyReject: number): number => {
      const breakdown = calculateHppBreakdown(productName);
      if (!breakdown) return 0;

      return (breakdown.hpp_polos + breakdown.biaya_topping) * qtyReject;
    },
    [calculateHppBreakdown]
  );

  // Handle product selection
  const handleProductSelect = useCallback(
    (index: number, productName: string) => {
      const product = products.find((p) => p.nama === productName);
      if (!product) return;

      form.setValue(`products.${index}.product_id`, product.id);
      form.setValue(`products.${index}.product_name`, product.nama);

      // Calculate and store HPP breakdown
      const breakdown = calculateHppBreakdown(product.nama);
      if (breakdown) {
        setHppBreakdowns((prev) => {
          const newMap = new Map(prev);
          newMap.set(index, breakdown);
          return newMap;
        });
      }

      // Recalculate HPP loss if qty_reject already set
      const currentData = form.getValues(`products.${index}`);
      if (currentData.qty_reject > 0) {
        const hppLoss = calculateHppToppingLoss(product.nama, currentData.qty_reject);
        form.setValue(`products.${index}.hpp_topping_loss`, hppLoss);
      }
    },
    [products, form, calculateHppBreakdown, calculateHppToppingLoss]
  );

  // Handle qty changes
  const handleQtyChange = useCallback(
    (index: number, field: string, value: number) => {
      const currentData = form.getValues(`products.${index}`);

      if (field === 'qty_reject' && currentData.product_name) {
        const hppLoss = calculateHppToppingLoss(currentData.product_name, value);
        form.setValue(`products.${index}.hpp_topping_loss`, hppLoss);
      }

      // Validate total
      const fresh = field === 'qty_fresh' ? value : currentData.qty_fresh;
      const aging = field === 'qty_aging' ? value : currentData.qty_aging;
      const reject = field === 'qty_reject' ? value : currentData.qty_reject;
      const total = fresh + aging + reject;

      // Update total_sisa if it's different
      if (total !== currentData.total_sisa) {
        form.setValue(`products.${index}.total_sisa`, total);
      }

      // Trigger validation
      form.trigger(`products.${index}`);

      // Notify parent component
      if (onDataChange) {
        onDataChange(form.getValues('products'));
      }
    },
    [form, calculateHppToppingLoss, onDataChange]
  );

  // Add new product entry
  const handleAddProduct = () => {
    append({
      product_id: '',
      product_name: '',
      total_sisa: 0,
      qty_fresh: 0,
      qty_aging: 0,
      qty_reject: 0,
      hpp_topping_loss: 0,
      reason_reject: '',
    });
  };

  // Remove product entry
  const handleRemoveProduct = (index: number) => {
    remove(index);
    setHppBreakdowns((prev) => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });

    if (onDataChange) {
      onDataChange(form.getValues('products'));
    }
  };

  // Calculate total loss
  const totalLoss = form.watch('products').reduce(
    (sum, product) => sum + product.hpp_topping_loss,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Sisa Donat Sudah Topping</h3>
        <p className="text-sm text-gray-600 mt-1">
          Isi status sisa donat jadi (fresh, aging, reject) untuk setiap produk
        </p>
      </div>

      {/* Products Loading */}
      {productsLoading && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Mengambil data produk...
          </AlertDescription>
        </Alert>
      )}

      {/* Products Error */}
      {productsError && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {productsError}
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
          {/* Product Entries */}
          {fields.map((field, index) => {
            const productData = form.watch(`products.${index}`);
            const breakdown = hppBreakdowns.get(index);
            const totalQty = productData.qty_fresh + productData.qty_aging + productData.qty_reject;
            const isValid = totalQty === productData.total_sisa;

            return (
              <Card key={field.id} className="relative">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        Produk #{index + 1}
                      </CardTitle>
                      <CardDescription>
                        {productData.product_name || 'Pilih produk'}
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveProduct(index)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Product Selector */}
                  <FormField
                    control={form.control}
                    name={`products.${index}.product_name`}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>Nama Produk *</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            formField.onChange(value);
                            handleProductSelect(index, value);
                          }}
                          value={formField.value}
                          disabled={isLoading || productsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih produk" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.nama}>
                                {product.nama} ({product.ukuran})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* HPP Breakdown Display */}
                  {breakdown && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-sm">
                      <p className="font-medium text-blue-900 mb-2">💰 HPP Breakdown:</p>
                      <div className="space-y-1 text-blue-700">
                        <p>HPP Polos: Rp {breakdown.hpp_polos.toLocaleString('id-ID')}</p>
                        <p>Biaya Topping: Rp {breakdown.biaya_topping.toLocaleString('id-ID')}</p>
                        <p className="font-semibold border-t border-blue-300 pt-1">
                          HPP Total: Rp {breakdown.hpp_total.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Qty Fresh */}
                  <FormField
                    control={form.control}
                    name={`products.${index}.qty_fresh`}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>Qty Fresh (Jual Besok Diskon)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...formField}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              formField.onChange(value);
                              handleQtyChange(index, 'qty_fresh', value);
                            }}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormDescription>
                          Donat fresh yang bisa dijual besok dengan diskon
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Qty Aging */}
                  <FormField
                    control={form.control}
                    name={`products.${index}.qty_aging`}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>Qty Aging (Diskon Besar)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...formField}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              formField.onChange(value);
                              handleQtyChange(index, 'qty_aging', value);
                            }}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormDescription>
                          Donat aging yang harus dijual dengan diskon besar
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Qty Reject */}
                  <FormField
                    control={form.control}
                    name={`products.${index}.qty_reject`}
                    render={({ field: formField }) => (
                      <FormItem>
                        <FormLabel>Qty Reject (Buang)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            {...formField}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0;
                              formField.onChange(value);
                              handleQtyChange(index, 'qty_reject', value);
                            }}
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormDescription>
                          Donat reject yang tidak bisa dijual (waste)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* HPP Loss Display */}
                  {productData.qty_reject > 0 && breakdown && (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-900">
                        💰 HPP + Topping Loss:
                      </p>
                      <p className="text-lg font-bold text-red-700 mt-1">
                        Rp {productData.hpp_topping_loss.toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        = ({breakdown.hpp_polos.toLocaleString('id-ID')} +{' '}
                        {breakdown.biaya_topping.toLocaleString('id-ID')}) ×{' '}
                        {productData.qty_reject} pcs
                      </p>
                    </div>
                  )}

                  {/* Reason Reject */}
                  {productData.qty_reject > 0 && (
                    <FormField
                      control={form.control}
                      name={`products.${index}.reason_reject`}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>Alasan Reject *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Contoh: Topping meleleh, kering, jatuh, dll"
                              {...formField}
                              disabled={isLoading}
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
                          ✅ Total valid: {productData.qty_fresh} +{' '}
                          {productData.qty_aging} + {productData.qty_reject} ={' '}
                          {totalQty} pcs
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Alert className="bg-red-50 border-red-200">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <AlertDescription className="text-red-700">
                          ❌ Total tidak sesuai: {productData.qty_fresh} +{' '}
                          {productData.qty_aging} + {productData.qty_reject} ={' '}
                          {totalQty} pcs (seharusnya {productData.total_sisa} pcs)
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Add Product Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleAddProduct}
            disabled={isLoading || productsLoading}
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Produk
          </Button>

          {/* Summary */}
          {fields.length > 0 && (
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base">
                  📊 Summary Rugi Finished Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {form.watch('products').map((product, index) => (
                    <div key={index} className="flex justify-between">
                      <span>{product.product_name || `Produk #${index + 1}`}:</span>
                      <span className="font-semibold">
                        Rp {product.hpp_topping_loss.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold text-base">
                    <span>Total Rugi Finished Products:</span>
                    <span className="text-red-600">
                      Rp {totalLoss.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </Form>

      {/* Info Box */}
      <Alert className="bg-amber-50 border-amber-200">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-700">
          <strong>💡 Catatan:</strong> Fresh & aging bisa dijual besok dengan
          diskon. Reject tidak bisa dijual dan masuk ke laporan rugi.
        </AlertDescription>
      </Alert>
    </div>
  );
}
