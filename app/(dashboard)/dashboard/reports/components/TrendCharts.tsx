// ============================================================================
// TREND CHARTS COMPONENT
// ============================================================================
// File: app/dashboard/reports/components/TrendCharts.tsx
// Description: Display trend charts for waste rate, loss, and sales
// Version: 1.0
// Date: 2026-05-06
// ============================================================================

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface TrendChartsProps {
  trends: {
    waste_rate_by_period: Array<{
      date: string;
      waste_rate: number;
    }>;
    loss_by_category: Array<{
      date: string;
      production_waste: number;
      topping_errors: number;
      non_topping_expired: number;
      finished_product_reject: number;
    }>;
    sales_by_flavor: Array<{
      flavor: string;
      qty: number;
      revenue: number;
    }>;
  };
}

export function TrendCharts({ trends }: TrendChartsProps) {
  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return `Rp ${value.toLocaleString('id-ID')}`;
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  };

  // Sort sales by flavor by qty (descending)
  const sortedSalesByFlavor = [...trends.sales_by_flavor].sort((a, b) => b.qty - a.qty);

  return (
    <div className="space-y-6">
      {/* Waste Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>📉 Trend Waste Rate</CardTitle>
          <p className="text-sm text-gray-600">
            Persentase waste dari total produksi per hari
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends.waste_rate_by_period}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                style={{ fontSize: '12px' }}
              />
              <YAxis
                label={{ value: 'Waste Rate (%)', angle: -90, position: 'insideLeft' }}
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(2)}%`}
                labelFormatter={formatDate}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="waste_rate"
                stroke="#ef4444"
                strokeWidth={2}
                name="Waste Rate"
                dot={{ fill: '#ef4444', r: 4 }}
              />
              {/* Target line at 15% */}
              <Line
                type="monotone"
                dataKey={() => 15}
                stroke="#fbbf24"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Target (15%)"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Loss by Category Trend */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Trend Rugi per Kategori</CardTitle>
          <p className="text-sm text-gray-600">
            Breakdown rugi harian per kategori (dalam Rupiah)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={trends.loss_by_category}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                style={{ fontSize: '12px' }}
              />
              <YAxis
                label={{ value: 'Rugi (Rp)', angle: -90, position: 'insideLeft' }}
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={formatCurrency}
                labelFormatter={formatDate}
              />
              <Legend />
              <Bar
                dataKey="production_waste"
                stackId="a"
                fill="#ef4444"
                name="Gagal Produksi"
              />
              <Bar
                dataKey="topping_errors"
                stackId="a"
                fill="#f97316"
                name="Salah Topping"
              />
              <Bar
                dataKey="non_topping_expired"
                stackId="a"
                fill="#f59e0b"
                name="Polos Expired"
              />
              <Bar
                dataKey="finished_product_reject"
                stackId="a"
                fill="#fb923c"
                name="Jadi Reject"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Sales by Flavor */}
      <Card>
        <CardHeader>
          <CardTitle>🏆 Top Selling Products</CardTitle>
          <p className="text-sm text-gray-600">
            Produk terlaris berdasarkan quantity terjual
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={sortedSalesByFlavor.slice(0, 10)}
              layout="vertical"
              margin={{ left: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                type="category"
                dataKey="flavor"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'qty') return `${value} pcs`;
                  if (name === 'revenue') return formatCurrency(value);
                  return value;
                }}
              />
              <Legend />
              <Bar
                dataKey="qty"
                fill="#3b82f6"
                name="Qty Terjual (pcs)"
              />
              <Bar
                dataKey="revenue"
                fill="#10b981"
                name="Revenue (Rp)"
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Summary Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">#</th>
                  <th className="px-4 py-2 text-left font-semibold">Produk</th>
                  <th className="px-4 py-2 text-right font-semibold">Qty</th>
                  <th className="px-4 py-2 text-right font-semibold">Revenue</th>
                  <th className="px-4 py-2 text-right font-semibold">% Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedSalesByFlavor.slice(0, 10).map((item, index) => {
                  const totalRevenue = trends.sales_by_flavor.reduce(
                    (sum, p) => sum + p.revenue,
                    0
                  );
                  const percentage = totalRevenue > 0
                    ? ((item.revenue / totalRevenue) * 100)
                    : 0;

                  return (
                    <tr key={item.flavor} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2 font-medium">{item.flavor}</td>
                      <td className="px-4 py-2 text-right">{item.qty} pcs</td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(item.revenue)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {percentage.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
