'use client';

import { Package, Wifi } from 'lucide-react';
import type { DashboardData } from '../types';
import { rp } from '../utils/helpers';

interface SalesByProductTableProps {
  dashboardData: DashboardData;
}

export function SalesByProductTable({ dashboardData }: SalesByProductTableProps) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden lg:col-span-2">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
        <h2 className="text-sm sm:text-base font-bold text-gray-900">Performa Produk (Terjual)</h2>
      </div>

      {dashboardData.sales_by_product.length > 0 ? (
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <table className="w-full min-w-[480px]">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Produk</th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Terjual</th>
                <th className="px-4 md:px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="hidden sm:table-cell px-4 md:px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Kontribusi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dashboardData.sales_by_product.map((p, idx) => (
                <tr key={p.product_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 md:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{p.product_name}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-medium text-gray-900">
                    {p.qty}
                  </td>
                  <td className="px-4 md:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-gray-900">
                    {rp(p.revenue)}
                  </td>
                  <td className="hidden sm:table-cell px-4 md:px-6 py-3 sm:py-4 text-right">
                    <span className={`text-xs sm:text-sm font-semibold ${p.percentage >= 30 ? 'text-green-600' : p.percentage >= 15 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {p.percentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-10 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Package className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-600 font-semibold">Belum ada penjualan hari ini</p>
          <p className="text-gray-400 text-sm mt-1 flex items-center justify-center gap-1">
            <Wifi className="w-3.5 h-3.5" />
            Data akan muncul otomatis saat ada transaksi
          </p>
        </div>
      )}
    </div>
  );
}
