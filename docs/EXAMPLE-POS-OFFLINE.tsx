// ============================================================================
// EXAMPLE: POS Interface with Offline Support
// ============================================================================
// File: docs/EXAMPLE-POS-OFFLINE.tsx
// Description: Complete example of POS interface with offline transaction
// Version: 1.0
// Date: 2026-05-08
// ============================================================================

'use client';

import React, { useState } from 'react';
import { useOfflineTransaction } from '@/lib/hooks/use-offline-transaction';
import { useRealtimeInventory, useRealtimeOrders } from '@/lib/hooks/use-realtime-inventory';
import { OfflineIndicator } from '@/components/offline/offline-indicator';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Example POS Interface Component
 * 
 * Features:
 * - Offline-first transactions
 * - Real-time inventory updates
 * - Real-time order notifications
 * - Offline indicator
 * - Cart management
 */
export function ExamplePOSInterface() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'digital'>('cash');
  const [paidAmount, setPaidAmount] = useState(0);

  // Get user from context (example)
  const user = {
    id: 'user-123',
    name: 'Kasir 1',
    outlet_id: 'outlet-123',
  };

  // Offline transaction hook
  const createTransaction = useOfflineTransaction();

  // Real-time inventory updates
  const { isConnected: inventoryConnected } = useRealtimeInventory({
    outletId: user.outlet_id,
    onUpdate: (update) => {
      toast.info('📦 Stock Updated', {
        description: `Product ${update.product_id}: ${update.old_quantity} → ${update.new_quantity}`,
      });
    },
  });

  // Real-time order updates (untuk notifikasi order dari kasir lain)
  const { isConnected: ordersConnected } = useRealtimeOrders({
    outletId: user.outlet_id,
    onUpdate: (payload) => {
      toast.info('🛒 New Order', {
        description: `Order created by another cashier`,
      });
    },
  });

  // Fetch products with offline cache
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', user.outlet_id],
    queryFn: async () => {
      const response = await fetch(`/api/products?outlet_id=${user.outlet_id}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const total = subtotal;
  const change = paidAmount - total;

  // Add to cart
  const addToCart = (product: any) => {
    const existingItem = cart.find((item) => item.product_id === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.unit_price,
              }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          product_name: product.nama,
          quantity: 1,
          unit_price: product.harga_jual,
          subtotal: product.harga_jual,
        },
      ]);
    }
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  // Update quantity
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) =>
        item.product_id === productId
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.unit_price,
            }
          : item
      )
    );
  };

  // Handle checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (paymentMethod === 'cash' && paidAmount < total) {
      toast.error('Paid amount is less than total');
      return;
    }

    try {
      await createTransaction.mutateAsync({
        orderData: {
          outlet_id: user.outlet_id,
          customer_name: 'Walk-in Customer',
          total_amount: total,
          payment_method: paymentMethod,
          channel: 'toko',
          paid_amount: paymentMethod === 'cash' ? paidAmount : total,
          change_amount: paymentMethod === 'cash' ? change : 0,
          kasir_name: user.name,
          kasir_id: user.id,
        },
        items: cart,
        outletId: user.outlet_id,
      });

      // Clear cart on success
      setCart([]);
      setPaidAmount(0);
    } catch (error) {
      // Error handling is done in the hook
      console.error('Checkout error:', error);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel - Products */}
      <div className="flex-1 overflow-y-auto border-r p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">POS - {user.name}</h1>
          <OfflineIndicator />
        </div>

        {/* Real-time Status */}
        <div className="mb-4 flex gap-4 text-xs">
          <div className={inventoryConnected ? 'text-green-600' : 'text-red-600'}>
            {inventoryConnected ? '🟢' : '🔴'} Inventory Sync
          </div>
          <div className={ordersConnected ? 'text-green-600' : 'text-red-600'}>
            {ordersConnected ? '🟢' : '🔴'} Orders Sync
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div>Loading products...</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {products?.data?.map((product: any) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="rounded-lg border p-4 hover:bg-gray-50"
              >
                <div className="font-medium">{product.nama}</div>
                <div className="text-sm text-gray-500">
                  Rp {product.harga_jual.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">
                  Stock: {product.quantity_in_stock}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Panel - Cart & Checkout */}
      <div className="w-96 flex flex-col border-l">
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="mb-4 text-xl font-bold">Cart</h2>

          {cart.length === 0 ? (
            <div className="text-center text-gray-400">Cart is empty</div>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.product_id} className="rounded border p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-sm text-gray-500">
                        Rp {item.unit_price.toLocaleString()} × {item.quantity}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        Rp {item.subtotal.toLocaleString()}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-xs text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                      className="rounded border px-2 py-1 text-sm"
                    >
                      -
                    </button>
                    <span className="text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                      className="rounded border px-2 py-1 text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Panel */}
        <div className="border-t p-4">
          {/* Payment Method */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium">Payment Method</label>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`flex-1 rounded border px-4 py-2 ${
                  paymentMethod === 'cash' ? 'bg-blue-500 text-white' : ''
                }`}
              >
                Cash
              </button>
              <button
                onClick={() => setPaymentMethod('digital')}
                className={`flex-1 rounded border px-4 py-2 ${
                  paymentMethod === 'digital' ? 'bg-blue-500 text-white' : ''
                }`}
              >
                Digital
              </button>
            </div>
          </div>

          {/* Paid Amount (Cash only) */}
          {paymentMethod === 'cash' && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">Paid Amount</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
                className="w-full rounded border px-3 py-2"
                placeholder="0"
              />
            </div>
          )}

          {/* Totals */}
          <div className="mb-4 space-y-2 border-t pt-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">Rp {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>Rp {total.toLocaleString()}</span>
            </div>
            {paymentMethod === 'cash' && paidAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Change:</span>
                <span className="font-bold">Rp {Math.max(0, change).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || createTransaction.isPending}
            className="w-full rounded bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            {createTransaction.isPending ? 'Processing...' : 'Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Types
interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}
