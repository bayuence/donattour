'use client';

import { useState, useEffect } from 'react';
import * as db from '@/lib/db';
import { useAuth } from '@/lib/context/auth-context';
import * as Types from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ProductSelector } from './product-selector';
import { ShoppingCart } from './shopping-cart';
import { PaymentModal } from './payment-modal';

export function PosInterface() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Types.ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Types.ProductCategory[]>([]);
  const [cart, setCart] = useState<Types.CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Types.ShopSettings | null>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedProducts, loadedCategories, shopSettings] = await Promise.all([
          db.getProducts(),
          db.getCategories(),
          db.getShopSettings(),
        ]);

        setProducts(loadedProducts);
        setCategories(loadedCategories);
        setSettings(shopSettings);

        if (loadedCategories.length > 0) {
          setSelectedCategory(loadedCategories[0].id);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Add to cart
  const handleAddToCart = (product: Types.ProductWithCategory) => {
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

  // Update cart quantity
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
    } else {
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
    }
  };

  // Remove from cart
  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  // Clear cart
  const handleClearCart = () => {
    if (confirm('Clear all items from cart?')) {
      setCart([]);
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const taxRate = settings?.tax_rate || 0;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  // Filter products by selected category
  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Product Selection */}
      <div className="lg:col-span-2">
        <ProductSelector
          products={filteredProducts}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onAddToCart={handleAddToCart}
        />
      </div>

      {/* Shopping Cart */}
      <div>
        <ShoppingCart
          items={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          taxRate={taxRate}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveFromCart}
          onClearCart={handleClearCart}
          onCheckout={() => setShowPayment(true)}
        />
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          cartItems={cart}
          subtotal={subtotal}
          tax={tax}
          total={total}
          taxRate={taxRate}
          cashierId={user?.id || ''}
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            setCart([]);
          }}
        />
      )}
    </div>
  );
}
