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
    <div className="bg-white rounded-lg shadow-sm p-2 h-fit sticky top-24">
      <h2 className="text-base font-bold text-gray-900 mb-2">Keranjang</h2>

      {/* Items List - ONE LINE PER ITEM */}
      <div className="space-y-0.5 mb-3 max-h-64 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-center text-gray-500 text-xs py-3">Kosong</p>
        ) : (
          items.map((item) => (
            <div key={item.product_id} className="flex items-center gap-1 px-1.5 py-1 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100">
              {/* Product Name */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{item.product_name}</p>
                <p className="text-[10px] text-gray-500 leading-none">{formatPrice(item.unit_price)}</p>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-0.5 bg-white border border-gray-300 rounded px-1">
                <button
                  onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                  className="text-gray-600 hover:text-gray-900 text-xs leading-none w-4 h-4 flex items-center justify-center"
                >
                  −
                </button>
                <span className="text-xs font-bold text-center w-4">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                  className="text-gray-600 hover:text-gray-900 text-xs leading-none w-4 h-4 flex items-center justify-center"
                >
                  +
                </button>
              </div>

              {/* Price */}
              <div className="text-right min-w-fit">
                <p className="text-xs font-bold text-blue-600">{formatPrice(item.subtotal)}</p>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => onRemoveItem(item.product_id)}
                className="text-red-500 hover:text-red-700 text-lg leading-none ml-0.5 flex-shrink-0 w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Divider */}
      {items.length > 0 && <div className="border-t border-gray-200 my-1.5"></div>}

      {/* Summary - COMPACT */}
      <div className="space-y-0.5 mb-3 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-bold text-gray-900">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Pajak ({taxRate}%)</span>
          <span className="font-bold text-gray-900">{formatPrice(tax)}</span>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1">
          <div className="flex justify-between items-center">
            <span className="font-bold text-gray-900 text-xs">Total</span>
            <span className="text-lg font-bold text-blue-600">{formatPrice(total)}</span>
          </div>
        </div>
      </div>

      {/* Buttons - COMPACT */}
      <div className="space-y-1">
        <Button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-1.5 rounded-lg text-xs"
        >
          Checkout (F12)
        </Button>
        <Button
          onClick={onClearCart}
          disabled={items.length === 0}
          variant="outline"
          className="w-full text-orange-600 border-orange-600 hover:bg-orange-50 text-xs py-1.5"
        >
          Hapus Semua
        </Button>
      </div>

      {/* Footer */}
      <div className="mt-1 pt-1 border-t border-gray-200 text-xs text-gray-500 text-center">
        <p>{items.length} item</p>
      </div>
    </div>
  );
}
