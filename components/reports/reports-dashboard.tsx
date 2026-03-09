'use client';

import { useState, useEffect } from 'react';
import * as db from '@/lib/db';
import * as Types from '@/lib/types';

export function ReportsDashboard() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dailyReport, setDailyReport] = useState<Types.DailyReport | null>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReportData = async () => {
      setLoading(true);
      try {
        const [report, products] = await Promise.all([
          db.getDailyReport(selectedDate),
          db.getTopProducts(selectedDate, 10),
        ]);

        setDailyReport(report);
        setTopProducts(products);
      } catch (error) {
        console.error('Error loading report data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [selectedDate]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Picker */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <label className="block text-sm font-bold text-gray-900 mb-2">
          Select Date
        </label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Daily Summary */}
      {dailyReport ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <p className="text-sm text-gray-600">Total Sales</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {formatPrice(dailyReport.total_sales)}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              {dailyReport.total_transactions} transactions
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-sm text-gray-600">Cash Sales</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {formatPrice(dailyReport.total_cash)}
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <p className="text-sm text-gray-600">Card Sales</p>
            <p className="text-3xl font-bold text-purple-600 mt-2">
              {formatPrice(dailyReport.total_card)}
            </p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <p className="text-sm text-gray-600">Net Profit</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {formatPrice(dailyReport.net_profit)}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Expenses: {formatPrice(dailyReport.total_expenses)}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <p className="text-gray-500">No sales data for this date</p>
        </div>
      )}

      {/* Top Products */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Top Products</h3>
        {topProducts.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No sales data</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-bold text-gray-900">
                    Product
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-bold text-gray-900">
                    Quantity
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-bold text-gray-900">
                    Revenue
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-bold text-gray-900">
                    Times Sold
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topProducts.map((product, index) => (
                  <tr key={product.product_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className="font-bold text-lg mr-2">
                        {index + 1}.
                      </span>
                      {product.product_name}
                    </td>
                    <td className="text-right px-4 py-3 text-sm text-gray-900 font-bold">
                      {product.total_quantity_sold}
                    </td>
                    <td className="text-right px-4 py-3 text-sm text-blue-600 font-bold">
                      {formatPrice(product.total_revenue)}
                    </td>
                    <td className="text-right px-4 py-3 text-sm text-gray-600">
                      {product.times_sold}×
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
