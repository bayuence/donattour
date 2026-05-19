'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface LossBreakdownChartProps {
  data: {
    production_waste: { amount: number; percentage: number };
    topping_error: { amount: number; percentage: number };
    non_topping_expired: { amount: number; percentage: number };
    finished_product_reject: { amount: number; percentage: number };
  };
  totalLoss: number;
  loading?: boolean;
}

export function LossBreakdownChart({ data, totalLoss, loading }: LossBreakdownChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for recharts
  const chartData = [
    {
      name: 'Gagal Produksi',
      value: data.production_waste.amount,
      percentage: data.production_waste.percentage,
      color: '#ef4444', // red-500
    },
    {
      name: 'Salah Topping',
      value: data.topping_error.amount,
      percentage: data.topping_error.percentage,
      color: '#f97316', // orange-500
    },
    {
      name: 'Polos Expired',
      value: data.non_topping_expired.amount,
      percentage: data.non_topping_expired.percentage,
      color: '#f59e0b', // amber-500
    },
    {
      name: 'Jadi Reject',
      value: data.finished_product_reject.amount,
      percentage: data.finished_product_reject.percentage,
      color: '#f43f5e', // rose-500
    },
  ].filter((item) => item.value > 0); // Only show categories with loss

  // Custom label for pie chart
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percentage,
  }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percentage < 5) return null; // Don't show label if too small

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-bold text-sm"
      >
        {`${percentage.toFixed(1)}%`}
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded shadow-lg border">
          <p className="font-semibold text-sm">{data.name}</p>
          <p className="text-lg font-bold" style={{ color: data.color }}>
            Rp {data.value.toLocaleString('id-ID')}
          </p>
          <p className="text-sm text-gray-600">{data.percentage.toFixed(1)}% dari total rugi</p>
        </div>
      );
    }
    return null;
  };

  // Handle pie slice click for drill-down
  const handlePieClick = (data: any, index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Breakdown Rugi per Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-80 text-gray-500">
            <div className="text-center">
              <p className="text-lg font-semibold">✅ Tidak ada rugi hari ini!</p>
              <p className="text-sm mt-2">Excellent performance! 🎉</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📊 Breakdown Rugi per Kategori</span>
          <span className="text-sm font-normal text-gray-600">
            Total: Rp {totalLoss.toLocaleString('id-ID')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Pie Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={handlePieClick}
                  className="cursor-pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                      stroke={activeIndex === index ? '#000' : 'none'}
                      strokeWidth={activeIndex === index ? 2 : 0}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value, entry: any) => (
                    <span className="text-sm">
                      {value} - Rp {entry.payload.value.toLocaleString('id-ID')}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Breakdown Table */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Detail per Kategori:</h4>
            <div className="space-y-2">
              {chartData.map((item, index) => (
                <div
                  key={item.name}
                  className={`flex items-center justify-between p-3 rounded transition-all cursor-pointer ${
                    activeIndex === index
                      ? 'bg-gray-100 border-2 border-gray-300'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => handlePieClick(item, index)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <div>
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-xs text-gray-600">
                        {item.percentage.toFixed(1)}% dari total rugi
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold" style={{ color: item.color }}>
                      Rp {item.value.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights */}
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Insight:</h4>
            <p className="text-sm text-blue-700">
              {chartData[0] && (
                <>
                  Kategori rugi terbesar adalah <strong>{chartData[0].name}</strong> dengan{' '}
                  <strong>Rp {chartData[0].value.toLocaleString('id-ID')}</strong> (
                  {chartData[0].percentage.toFixed(1)}%). Fokus perbaikan pada kategori ini dapat
                  mengurangi rugi secara signifikan.
                </>
              )}
            </p>
          </div>

          {/* Click instruction */}
          <p className="text-xs text-gray-500 text-center">
            💡 Klik pada chart atau kategori untuk highlight
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
