'use client';

import * as Types from '@/lib/types';
import { Button } from '@/components/ui/button';

interface ProductSelectorProps {
  products: Types.ProductWithCategory[];
  categories: Types.ProductCategory[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string) => void;
  onAddToCart: (product: Types.ProductWithCategory) => void;
}

export function ProductSelector({
  products,
  categories,
  selectedCategory,
  onSelectCategory,
  onAddToCart,
}: ProductSelectorProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Category Buttons */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Categories</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelectCategory('')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              selectedCategory === ''
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Products</h3>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No products available</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => onAddToCart(product)}
                disabled={product.quantity_in_stock === 0}
                className={`p-4 rounded-lg border-2 transition ${
                  product.quantity_in_stock === 0
                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50 active:scale-95'
                }`}
              >
                <div className="text-3xl mb-2">🍩</div>
                <h4 className="font-bold text-sm text-gray-900">{product.name}</h4>
                <p className="text-blue-600 font-bold text-lg mt-2">
                  {formatPrice(product.price)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Stock: {product.quantity_in_stock}
                </p>
                {product.quantity_in_stock === 0 && (
                  <p className="text-xs text-red-500 font-bold mt-1">OUT OF STOCK</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
