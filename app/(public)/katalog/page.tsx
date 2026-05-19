'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import type { ProductWithCategory } from '@/lib/types';

/**
 * Public Catalog Page
 * 
 * Halaman katalog publik untuk menampilkan produk Donattour
 * Dapat diakses tanpa login
 */
export default function KatalogPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load products
      const { data: productsData } = await supabase
        .from('products')
        .select(`
          *,
          category:product_categories(*)
        `)
        .eq('is_active', true)
        .order('nama');

      // Load categories
      const { data: categoriesData } = await supabase
        .from('product_categories')
        .select('*')
        .order('nama');

      setProducts(productsData || []);
      setCategories(categoriesData || []);
      
      if (categoriesData && categoriesData.length > 0) {
        setSelectedCategory(categoriesData[0].id);
      }
    } catch (error) {
      console.error('Error loading catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">🍩</div>
          <p className="text-gray-600">Loading katalog...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">🍩</div>
              <div>
                <h1 className="text-2xl font-bold text-orange-600">
                  Donattour
                </h1>
                <p className="text-sm text-gray-600">
                  Katalog Produk Kami
                </p>
              </div>
            </div>
            
            <a
              href="/login"
              className="rounded-lg bg-orange-600 px-6 py-2 text-white hover:bg-orange-700"
            >
              Login Kasir
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-orange-500 to-orange-600 py-16 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-4xl font-bold">
            Selamat Datang di Donattour! 🍩
          </h2>
          <p className="text-xl text-orange-100">
            Donat segar dengan berbagai varian rasa pilihan
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="border-b bg-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`whitespace-nowrap rounded-full px-6 py-2 font-medium transition-colors ${
                selectedCategory === null
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semua Produk
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`whitespace-nowrap rounded-full px-6 py-2 font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.nama}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {filteredProducts.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mb-4 text-6xl">🍩</div>
              <p className="text-xl text-gray-600">
                Belum ada produk di kategori ini
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-lg"
                >
                  {/* Product Image Placeholder */}
                  <div className="flex h-48 items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200">
                    <div className="text-6xl">🍩</div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="mb-2">
                      <span className="inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700">
                        {product.category?.nama || 'Produk'}
                      </span>
                    </div>
                    
                    <h3 className="mb-2 text-lg font-bold text-gray-900">
                      {product.nama}
                    </h3>
                    
                    {product.deskripsi && (
                      <p className="mb-3 line-clamp-2 text-sm text-gray-600">
                        {product.deskripsi}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-orange-600">
                          Rp {product.harga_jual.toLocaleString('id-ID')}
                        </div>
                        {product.ukuran && (
                          <div className="text-xs text-gray-500">
                            Ukuran: {product.ukuran}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p className="mb-2">
            © 2026 Donattour. All rights reserved.
          </p>
          <p className="text-sm">
            Untuk pemesanan, silakan hubungi outlet terdekat
          </p>
        </div>
      </footer>
    </div>
  );
}
