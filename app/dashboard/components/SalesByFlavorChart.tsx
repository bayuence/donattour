'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Award } from 'lucide-react';

interface SalesByFlavorChartProps {
  data: Array<{
    product_id: string;
    product_name: string;
    qty: number;
    revenue: number;
    percentage: number;
  }>;
  loading?: boolean;
}

export function SalesByFlavorChart({ data, loading }: SalesByFlavorChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🏆 Produk Terlaris</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-gray-500">
            <div className="text-center">
              <p className="text-lg font-semibold">Belum ada penjualan hari ini</p>
              <p className="text-sm mt-2">Data akan muncul setelah ada transaksi</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Take top 10 products
  const topProducts = data.slice(0, 10);

  // Color gradient for bars (green shades)
  const getBarColor = (index: number) => {
    const colors = [
      '#10b981', // green-500 (top 1)
      '#34d399', // green-400
      '#6ee7b7', // green-300
      '#a7f3d0', // green-200
      '#d1fae5', // green-100
      '#3b82f6', // blue-500
      '#60a5fa', // blue-400
      '#93c5fd', // blue-300
      '#bfdbfe', // blue-200
      '#dbeafe', // blue-100
    ];
    return colors[index] || '#e5e7eb'; // gray-200 fallback
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-gray-200">
          <p className="font-bold text-base mb-2">{data.product_name}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Terjual:</span>
              <span className="font-semibold">{data.qty} pcs</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">Revenue:</span>
              <span className="font-semibold text-green-600">
                Rp {data.revenue.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-600">% Total:</span>
              <span className="font-semibold">{data.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Handle bar click
  const handleBarClick = (data: any, index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  // Calculate total revenue
  const totalRevenue = topProducts.reduce((sum, item) => sum + item.revenue, 0);
  const totalQty = topProducts.reduce((sum, item) => sum + item.qty, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            🏆 Produk Terlaris
          </CardTitle>
          <div className="text-right text-sm">
            <p className="text-gray-600">Total Terjual</p>
            <p className="font-bold text-lg">{totalQty} pcs</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Bar Chart */}
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="product_name"
                  width={150}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="qty"
                  radius={[0, 8, 8, 0]}
                  onClick={handleBarClick}
                  className="cursor-pointer"
                >
                  {topProducts.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(index)}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                      stroke={activeIndex === index ? '#000' : 'none'}
                      strokeWidth={activeIndex === index ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 3 Highlight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topProducts.slice(0, 3).map((product, index) => (
              <div
                key={product.product_id}
                className={`p-4 rounded-lg border-2 ${
                  index === 0
                    ? 'bg-yellow-50 border-yellow-300'
                    : index === 1
                    ? 'bg-gray-50 border-gray-300'
                    : 'bg-orange-50 border-orange-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </span>
                  <span className="text-lg font-bold">#{index + 1}</span>
                </div>
                <p className="font-semibold text-sm mb-2 line-clamp-2">
                  {product.product_name}
                </p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Terjual:</span>
                    <span className="font-bold">{product.qty} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-bold text-green-600">
                      Rp {(product.revenue / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">% Total:</span>
                    <span className="font-bold">{product.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Table */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Detail Semua Produk:</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-2 font-semibold">#</th>
                    <th className="text-left p-2 font-semibold">Produk</th>
                    <th className="text-right p-2 font-semibold">Qty</th>
                    <th className="text-right p-2 font-semibold">Revenue</th>
                    <th className="text-right p-2 font-semibold">% Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => (
                    <tr
                      key={product.product_id}
                      className={`border-b hover:bg-gray-50 transition-colors cursor-pointer ${
                        activeIndex === index ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleBarClick(product, index)}
                    >
                      <td className="p-2">
                        <span className="font-bold text-gray-400">#{index + 1}</span>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          {index < 3 && (
                            <span>
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                            </span>
                          )}
                          <span className="font-medium">{product.product_name}</span>
                        </div>
                      </td>
                      <td className="p-2 text-right font-semibold">{product.qty} pcs</td>
                      <td className="p-2 text-right font-semibold text-green-600">
                        Rp {product.revenue.toLocaleString('id-ID')}
                      </td>
                      <td className="p-2 text-right">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold">
                          {product.percentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                  <tr>
                    <td colSpan={2} className="p-2">
                      Total (Top {topProducts.length})
                    </td>
                    <td className="p-2 text-right">{totalQty} pcs</td>
                    <td className="p-2 text-right text-green-600">
                      Rp {totalRevenue.toLocaleString('id-ID')}
                    </td>
                    <td className="p-2 text-right">
                      {topProducts.reduce((sum, p) => sum + p.percentage, 0).toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Insights */}
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              💡 Insight Penjualan:
            </h4>
            <div className="text-sm text-green-700 space-y-1">
              <p>
                • <strong>{topProducts[0].product_name}</strong> adalah produk terlaris dengan{' '}
                <strong>{topProducts[0].qty} pcs</strong> ({topProducts[0].percentage.toFixed(1)}%
                dari total penjualan)
              </p>
              <p>
                • Top 3 produk menyumbang{' '}
                <strong>
                  {topProducts
                    .slice(0, 3)
                    .reduce((sum, p) => sum + p.percentage, 0)
                    .toFixed(1)}
                  %
                </strong>{' '}
                dari total penjualan
              </p>
              {topProducts.length > 5 && (
                <p>
                  • Pertimbangkan fokus produksi pada top 5 produk untuk efisiensi maksimal
                </p>
              )}
            </div>
          </div>

          {/* Click instruction */}
          <p className="text-xs text-gray-500 text-center">
            💡 Klik pada bar atau row untuk highlight
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
