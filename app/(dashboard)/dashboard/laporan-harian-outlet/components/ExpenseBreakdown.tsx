'use client';

import { BarChart3, TrendingUp } from 'lucide-react';
import type { DashboardData } from '../types';

interface TopCategoriesCardProps {
  dashboardData: DashboardData;
}

export function TopCategoriesCard({ dashboardData }: TopCategoriesCardProps) {
  // Group sales by category_id (from sales_by_product yang akan diperbaiki di API)
  // Untuk sekarang, kita gunakan data yang ada dari sales_by_product
  const categorySales: Record<string, { count: number; qty: number; revenue: number; category_name: string }> = {};
  
  // Aggregate products by their category_id
  // NOTE: API perlu menambahkan category_id dan category_name di sales_by_product response
  dashboardData.sales_by_product.forEach((product) => {
    // Extract category from product data (will be added from API)
    const categoryId = (product as any).category_id || 'unknown';
    const categoryName = (product as any).category_name || 'Lainnya';
    
    if (!categorySales[categoryId]) {
      categorySales[categoryId] = {
        category_name: categoryName,
        count: 0,
        qty: 0,
        revenue: 0,
      };
    }
    
    categorySales[categoryId].count += 1; // Count distinct products in this category
    categorySales[categoryId].qty += product.qty;
    categorySales[categoryId].revenue += product.revenue;
  });
  
  // Sort by quantity sold
  const sortedCategories = Object.entries(categorySales)
    .map(([_, data]) => data)
    .sort((a, b) => b.qty - a.qty) // Sort by quantity sold
    .slice(0, 5); // Top 5
  
  const totalQty = sortedCategories.reduce((sum, cat) => sum + cat.qty, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden lg:col-span-1 shadow-sm">
      {/* Header - Clean & Professional */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-slate-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">Kategori Terlaris</h2>
            <p className="text-xs text-gray-500">Ranking penjualan berdasarkan kategori produk</p>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {sortedCategories.length > 0 ? (
          <div className="space-y-4">
            {sortedCategories.map((cat, idx) => {
              const pct = totalQty > 0 ? (cat.qty / totalQty) * 100 : 0;
              
              return (
                <div key={idx} className="group">
                  <div className="flex items-center gap-4">
                    {/* Ranking Number - Clean, no emoji */}
                    <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                      <span className="text-base font-bold text-slate-700">#{idx + 1}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Category Name & Quantity */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">{cat.category_name}</span>
                        <div className="flex items-center gap-3 ml-3">
                          <span className="text-xs text-gray-500">{pct.toFixed(1)}%</span>
                          <span className="text-sm font-bold text-slate-900">{cat.qty}x</span>
                        </div>
                      </div>
                      
                      {/* Progress Bar - Minimal */}
                      <div className="w-full bg-slate-100 rounded-sm h-1.5 overflow-hidden">
                        <div 
                          className="bg-slate-700 h-full rounded-sm transition-all duration-300"
                          style={{ width: `${Math.min(pct, 100)}%` }} 
                        />
                      </div>
                      
                      {/* Meta Info */}
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-gray-400">
                          {cat.count} produk
                        </span>
                        {idx === 0 && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <TrendingUp className="w-3 h-3" />
                            Terlaris
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mx-auto mb-3 border border-slate-200">
              <BarChart3 className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-600 font-medium">Belum ada penjualan</p>
            <p className="text-xs text-slate-400 mt-1">Data akan muncul setelah ada transaksi</p>
          </div>
        )}
      </div>
    </div>
  );
}
