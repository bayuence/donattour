'use client';

import { useState } from 'react';
import * as db from '@/lib/db';
import * as Types from '@/lib/types';
import { Button } from '@/components/ui/button';

interface PaymentModalProps {
  cartItems: Types.CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  cashierId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({
  cartItems,
  subtotal,
  tax,
  total,
  taxRate,
  cashierId,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<Types.PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState<number>(total);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const change = cashReceived - total;

  const handlePayment = async () => {
    if (paymentMethod === 'cash' && cashReceived < total) {
      setError('Cash received is less than total amount');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Create transaction
      const transaction = await db.createTransaction(
        cashierId,
        cartItems,
        paymentMethod,
        taxRate / 100,
        notes
      );

      if (transaction) {
        // Update stock for each product
        for (const item of cartItems) {
          const product = await db.getProductById(item.product_id);
          if (product) {
            const newStock = product.quantity_in_stock - item.quantity;
            await db.updateProductStock(item.product_id, newStock);
          }
        }

        // Show success
        alert(`Payment received! Transaction: ${transaction.transaction_number}`);
        onSuccess();
      } else {
        setError('Failed to process payment. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('An error occurred while processing payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment</h2>

        {/* Order Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span className="font-bold">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax ({taxRate}%):</span>
            <span className="font-bold">{formatPrice(tax)}</span>
          </div>
          <div className="border-t border-gray-300 pt-2 flex justify-between">
            <span className="font-bold">Total:</span>
            <span className="text-xl font-bold text-blue-600">{formatPrice(total)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-3">
            Payment Method
          </label>
          <div className="space-y-2">
            {(['cash', 'card', 'mobile_money'] as const).map((method) => (
              <label key={method} className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                  className="w-4 h-4"
                />
                <span className="text-gray-900 capitalize">{method.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Cash Input (if cash payment) */}
        {paymentMethod === 'cash' && (
          <div className="mb-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">
              Cash Received
            </label>
            <input
              type="number"
              value={cashReceived}
              onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="Enter amount"
            />
            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Change:</p>
              <p className="text-xl font-bold text-blue-600">{formatPrice(change)}</p>
            </div>
            {change < 0 && (
              <p className="text-xs text-red-600 mt-2">
                Insufficient payment: {formatPrice(Math.abs(change))} short
              </p>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-900 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
            rows={2}
            placeholder="Add notes..."
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            disabled={isProcessing}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing || (paymentMethod === 'cash' && cashReceived < total)}
            className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold"
          >
            {isProcessing ? 'Processing...' : 'Confirm Payment'}
          </Button>
        </div>
      </div>
    </div>
  );
}
