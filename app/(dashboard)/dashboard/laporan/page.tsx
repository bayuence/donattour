'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  RefreshCw, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Download,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { formatDate, formatRupiah, formatNumber, formatPercent } from '@/lib/utils/format';
import { getTodayWIB } from '@/lib/utils/timezone'; // ✅ WIB
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
} from 'recharts';

interface PeriodReportData {
  period: {
    start_date: string;
    end_date: string;
    group_by: string;
    total_days: number;
  };
  outlet_id: string | null;
  aggregated_metrics: {
    omzet: number;
    hpp_sold: number;
    total_loss: number;
    gross_profit: number;
    margin: number;
    target: number;
    success: number;
    waste: number;
    sold: number;
    success_rate: number;
    waste_rate: number;
    sold_rate: number;
    period_count: number;
  };
  trends: {
    omzet_trend: number;
    waste_rate_trend: number;
    margin_trend: number;
    sold_rate_trend: number;
  };
  grouped_data: Record<string, any>;
  top_products: Array<{
    product_id: string;
    product_name: string;
    qty: number;
    revenue: number;
  }>;
  outlet_comparison: Array<{
    outlet_id: string;
    outlet_name: string;
    omzet: number;
    total_loss: number;
    gross_profit: number;
    margin: number;
    success_rate: number;
    waste_rate: number;
    sold_rate: number;
  }> | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ReportsPage() {
  const [data, setData] = useState<PeriodReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [startDate, setStartDate] = useState<string>(
    (() => { const d = new Date(); d.setDate(d.getDate() - 7); return getTodayWIB(d); })() // 7 hari lalu WIB
  );
  const [endDate, setEndDate] = useState<string>(
    getTodayWIB() // today WIB
  );
  const [groupBy, setGroupBy] = useState<string>('day');
  const [outletId, setOutletId] = useState<string>('');

  const fetchReportData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        group_by: groupBy,
      });

      if (outletId) {
        params.append('outlet_id', outletId);
      }

      const response = await fetch(`/api/reports/period?${params}`);

      if (!response.ok) {
        let errorMessage = 'Gagal mengambil data laporan';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error?.message || 'Gagal mengambil data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(errorMessage);
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const chartData = data ? Object.values(data.grouped_data)
    .sort((a: any, b: any) => a.period.localeCompare(b.period))
    .map((period: any) => ({
      period: formatDate(period.period),
      omzet: period.metrics.omzet,
      total_loss: period.metrics.total_loss,
      waste_rate: period.metrics.waste_rate,
      margin: period.metrics.margin,
      sold_rate: period.metrics.sold_rate,
    })) : [];

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        group_by: groupBy,
        format,
      });

      if (outletId) {
        params.append('outlet_id', outletId);
      }

      const response = await fetch(`/api/reports/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Gagal mengekspor laporan');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `laporan-${startDate}-${endDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Gagal mengekspor laporan');
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">📊 Laporan Periode</h1>
          <p className="text-gray-600 mt-1">
            Analisis performa bisnis dalam rentang waktu tertentu
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filter Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium mb-1">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                max={getTodayWIB()} // ✅ WIB
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium mb-1">Tanggal Akhir</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                max={getTodayWIB()} // ✅ WIB
              />
            </div>

            {/* Group By */}
            <div>
              <label className="block text-sm font-medium mb-1">Kelompokkan Per</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="day">Harian</option>
                <option value="week">Mingguan</option>
                <option value="month">Bulanan</option>
              </select>
            </div>

            {/* Outlet Filter */}
            <div>
              <label className="block text-sm font-medium mb-1">Outlet</label>
              <select
                value={outletId}
                onChange={(e) => setOutletId(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Semua Outlet</option>
                {/* TODO: Load outlets from API */}
              </select>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button
                onClick={fetchReportData}
                disabled={loading}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Generate'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {data && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Omzet */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Omzet</p>
                  <p className="text-2xl font-bold">{formatRupiah(data.aggregated_metrics.omzet)}</p>
                </div>
                <div className="flex items-center gap-1">
                  {data.trends.omzet_trend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm ${data.trends.omzet_trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(Math.abs(data.trends.omzet_trend))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Loss */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Rugi</p>
                  <p className="text-2xl font-bold text-red-600">{formatRupiah(data.aggregated_metrics.total_loss)}</p>
                </div>
                <Badge variant={data.aggregated_metrics.waste_rate > 15 ? 'destructive' : 'secondary'}>
                  {formatPercent(data.aggregated_metrics.waste_rate)} waste
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Gross Profit */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gross Profit</p>
                  <p className="text-2xl font-bold text-green-600">{formatRupiah(data.aggregated_metrics.gross_profit)}</p>
                </div>
                <div className="flex items-center gap-1">
                  {data.trends.margin_trend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={`text-sm ${data.trends.margin_trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(Math.abs(data.trends.margin_trend))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Margin */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Margin</p>
                  <p className="text-2xl font-bold">{formatPercent(data.aggregated_metrics.margin)}</p>
                </div>
                <Badge variant={data.aggregated_metrics.margin < 30 ? 'destructive' : 'default'}>
                  {data.aggregated_metrics.margin < 30 ? 'Low' : 'Good'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      {data && !loading && chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Omzet Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Trend Omzet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => formatRupiah(value, true)} />
                  <Tooltip formatter={(value) => formatRupiah(value as number)} />
                  <Line 
                    type="monotone" 
                    dataKey="omzet" 
                    stroke="#0088FE" 
                    strokeWidth={2}
                    dot={{ fill: '#0088FE' }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Waste Rate Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Trend Waste Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Line 
                    type="monotone" 
                    dataKey="waste_rate" 
                    stroke="#FF8042" 
                    strokeWidth={2}
                    dot={{ fill: '#FF8042' }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Loss vs Profit */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Rugi vs Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => formatRupiah(value, true)} />
                  <Tooltip formatter={(value) => formatRupiah(value as number)} />
                  <Legend />
                  <Bar dataKey="omzet" fill="#0088FE" name="Omzet" />
                  <Bar dataKey="total_loss" fill="#FF8042" name="Total Rugi" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Margin Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Trend Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Line 
                    type="monotone" 
                    dataKey="margin" 
                    stroke="#00C49F" 
                    strokeWidth={2}
                    dot={{ fill: '#00C49F' }}
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Products */}
      {data && !loading && data.top_products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Top 10 Produk Terlaris
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={data.top_products.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="qty"
                  >
                    {data.top_products.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatNumber(value as number)} />
                </RechartsPieChart>
              </ResponsiveContainer>

              {/* Table */}
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-sm font-medium text-gray-600 border-b pb-2">
                  <span>Produk</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Revenue</span>
                </div>
                {data.top_products.slice(0, 10).map((product, index) => (
                  <div key={product.product_id} className="grid grid-cols-3 gap-2 text-sm py-1">
                    <span className="truncate">
                      {index + 1}. {product.product_name}
                    </span>
                    <span className="text-right font-medium">{formatNumber(product.qty)}</span>
                    <span className="text-right font-medium">{formatRupiah(product.revenue, true)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outlet Comparison */}
      {data && !loading && data.outlet_comparison && data.outlet_comparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>🏪 Perbandingan Outlet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Outlet</th>
                    <th className="text-right py-2">Omzet</th>
                    <th className="text-right py-2">Rugi</th>
                    <th className="text-right py-2">Profit</th>
                    <th className="text-right py-2">Margin</th>
                    <th className="text-right py-2">Success Rate</th>
                    <th className="text-right py-2">Waste Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.outlet_comparison.map((outlet) => (
                    <tr key={outlet.outlet_id} className="border-b">
                      <td className="py-2 font-medium">{outlet.outlet_name}</td>
                      <td className="text-right py-2">{formatRupiah(outlet.omzet, true)}</td>
                      <td className="text-right py-2 text-red-600">{formatRupiah(outlet.total_loss, true)}</td>
                      <td className="text-right py-2 text-green-600">{formatRupiah(outlet.gross_profit, true)}</td>
                      <td className="text-right py-2">
                        <Badge variant={outlet.margin < 30 ? 'destructive' : 'default'}>
                          {formatPercent(outlet.margin)}
                        </Badge>
                      </td>
                      <td className="text-right py-2">{formatPercent(outlet.success_rate)}</td>
                      <td className="text-right py-2">
                        <Badge variant={outlet.waste_rate > 15 ? 'destructive' : 'secondary'}>
                          {formatPercent(outlet.waste_rate)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Actions */}
      {data && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Laporan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => handleExport('excel')}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !data && (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Belum Ada Laporan
            </h3>
            <p className="text-gray-500 mb-4">
              Pilih rentang tanggal dan klik Generate untuk melihat laporan
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}