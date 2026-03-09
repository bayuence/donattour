'use client';

import { useState } from 'react';
import * as db from '@/lib/db';
import * as Types from '@/lib/types';
import { Button } from '@/components/ui/button';

interface UpdateBatchModalProps {
  batch: Types.ProductionBatchWithDetails;
  onClose: () => void;
  onUpdate: (newQuantity: number) => void;
}

export function UpdateBatchModal({ batch, onClose, onUpdate }: UpdateBatchModalProps) {
  const [quantity, setQuantity] = useState(batch.quantity_produced.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const newQuantity = parseInt(quantity);

    if (newQuantity < 0 || newQuantity > batch.quantity_planned) {
      setError(`Quantity must be between 0 and ${batch.quantity_planned}`);
      return;
    }

    setIsLoading(true);

    try {
      const success = await db.updateBatchProduction(batch.id, newQuantity);

      if (success) {
        onUpdate(newQuantity);
      } else {
        setError('Failed to update batch');
      }
    } catch (err) {
      console.error('Error updating batch:', err);
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Update Production Quantity</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Product</p>
            <p className="text-lg font-bold text-gray-900">{batch.product?.name}</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600">Total Planned</p>
            <p className="text-xl font-bold text-blue-900">{batch.quantity_planned}</p>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Quantity Produced
            </label>
            <input
              type="number"
              min="0"
              max={batch.quantity_planned}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg font-bold"
            />
            <p className="text-xs text-gray-600 mt-2">
              Range: 0 - {batch.quantity_planned}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm font-bold text-gray-900">
                {parseInt(quantity)} / {batch.quantity_planned}
              </span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{
                  width: `${(parseInt(quantity) / batch.quantity_planned) * 100}%`,
                }}
              ></div>
            </div>
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
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold"
            >
              {isLoading ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
