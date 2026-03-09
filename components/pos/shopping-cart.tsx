'use client';

import * as Types from '@/lib/types';
import { Button } from '@/components/ui/button';

interface ShoppingCartProps {
  items: Types.CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

export function ShoppingCart({
  items,
  subtotal,
  tax,
  total,
  taxRate,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
}: ShoppingCartProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 h-fit sticky top-24">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Cart</h2>

      {/* Items List */}
      <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Your cart is empty</p>
        ) : (
          items.map((item) => (
            <div key={item.product_id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-sm text-gray-900">{item.product_name}</h3>
                <button
                  onClick={() => onRemoveItem(item.product_id)}
                  className="text-red-500 hover:text-red-700 text-lg leading-none"
                >
                  ×
                </button>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                  className="bg-gray-200 hover:bg-gray-300 w-6 h-6 rounded text-sm"
                >
                  −
                </button>
                <span className="flex-1 text-center font-bold">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                  className="bg-gray-200 hover:bg-gray-300 w-6 h-6 rounded text-sm"
                >
                  +
                </button>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-600">
                  {formatPrice(item.unit_price)} × {item.quantity}
                </p>
                <p className="font-bold text-blue-600">{formatPrice(item.subtotal)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Divider */}
      {items.length > 0 && <div className="border-t border-gray-200 my-4"></div>}

      {/* Summary */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-bold text-gray-900">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tax ({taxRate}%)</span>
          <span className="font-bold text-gray-900">{formatPrice(tax)}</span>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-blue-600">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-3">
        <Button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg text-lg"
        >
          Checkout (F12)
        </Button>
        <Button
          onClick={onClearCart}
          disabled={items.length === 0}
          variant="outline"
          className="w-full text-orange-600 border-orange-600 hover:bg-orange-50"
        >
          Clear Cart
        </Button>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
        <p>Items: {items.length}</p>
      </div>
    </div>
  );
}
