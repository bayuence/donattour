'use client';

import { useState, useEffect } from 'react';
import * as db from '@/lib/db';
import * as Types from '@/lib/types';
import { Button } from '@/components/ui/button';

interface CreateBatchModalProps {
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export function CreateBatchModal({ onClose, onSuccess, userId }: CreateBatchModalProps) {
  const [products, setProducts] = useState<Types.Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const loadedProducts = await db.getProducts();
        setProducts(loadedProducts);
        if (loadedProducts.length > 0) {
          setSelectedProduct(loadedProducts[0].id);
        }
      } catch (err) {
        console.error('Error loading products:', err);
      }
    };

    loadProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedProduct || !quantity) {
      setError('Please fill in all required fields');
      return;
    }

    const quantityNum = parseInt(quantity);
    if (quantityNum <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    setIsLoading(true);

    try {
      const batch = await db.createProductionBatch(
        selectedProduct,
        quantityNum,
        userId,
        notes || undefined
      );

      if (batch) {
        onSuccess();
      } else {
        setError('Failed to create batch');
      }
    } catch (err) {
      console.error('Error creating batch:', err);
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create Production Batch</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Select */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} (Stock: {product.quantity_in_stock})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Quantity to Produce
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="0"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
              rows={3}
              placeholder="Add any notes..."
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold"
            >
              {isLoading ? 'Creating...' : 'Create Batch'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
