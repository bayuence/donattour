'use client';

import { useState, useEffect } from 'react';
import { FinancialSummaryCards } from './components/FinancialSummaryCards';
import { LossBreakdownChart } from './components/LossBreakdownChart';
import { SalesByFlavorChart } from './components/SalesByFlavorChart';
import { RecommendationsPanel } from './components/RecommendationsPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw, AlertCircle } from 'lucide-react';
import { formatDate, formatNumber, formatPercent } from '@/lib/utils/format';

interface DashboardData {
  date: string;
  outlet_id: string | null;
  financial_summary: {
    omzet: number;
    hpp_sold: number;
    total_loss: number;
    gross_profit: number;
    margin: number;
  };
  production_sales: {
    target: number;
    success: number;
    waste: number;
    sold: number;
    remaining: number;
    success_rate: number;
    waste_rate: number;
    sold_rate: number;
    remaining_rate: number;
  };
  loss_breakdown: {
    production_waste: { amount: number; percentage: number };
    topping_error: { amount: number; percentage: number };
    non_topping_expired: { amount: number; percentage: number };
    finished_product_reject: { amount: number; percentage: number };
  };
  sales_by_product: Array<{
    product_id: string;
    product_name: string;
    qty: number;
    revenue: number;
    percentage: number;
  }>;
  total_waste_qty: number;
  has_closing: boolean;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/dashboard/daily?date=${selectedDate}`
      );

      if (!response.ok) {
        let errorMessage = 'Gagal mengambil data dashboard';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
          console.error('API Error Response:', errorData);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Dashboard API Response:', result);

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error?.message || 'Gagal mengambil data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(errorMessage);
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDate]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Owner</h1>
          <p className="text-gray-600 mt-1">
            Laporan harian untuk tanggal {formatDate(selectedDate)}
          </p>
        </div>

        <div className="flex gap-2">
          {/* Date Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Financial Summary Cards */}
      {data && (
        <FinancialSummaryCards
          data={data.financial_summary}
          loading={loading}
        />
      )}

      {/* Production & Sales Overview */}
      {data && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Produksi & Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Target</p>
                <p className="text-2xl font-bold">{formatNumber(data.production_sales.target)}</p>
                <p className="text-xs text-gray-500">pcs</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Berhasil</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(data.production_sales.success)}
                </p>
                <p className="text-xs text-green-600">
                  {formatPercent(data.production_sales.success_rate)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Waste</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatNumber(data.production_sales.waste)}
                </p>
                <p className="text-xs text-red-600">
                  {formatPercent(data.production_sales.waste_rate)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Terjual</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(data.production_sales.sold)}
                </p>
                <p className="text-xs text-blue-600">
                  {formatPercent(data.production_sales.sold_rate)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Sisa</p>
                <p className="text-2xl font-bold text-amber-600">
                  {formatNumber(data.production_sales.remaining)}
                </p>
                <p className="text-xs text-amber-600">
                  {formatPercent(data.production_sales.remaining_rate)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loss Breakdown */}
      {data && !loading && (
        <LossBreakdownChart
          data={data.loss_breakdown}
          totalLoss={data.financial_summary.total_loss}
          loading={loading}
        />
      )}

      {/* Top Selling Products */}
      {data && !loading && (
        <SalesByFlavorChart data={data.sales_by_product} loading={loading} />
      )}

      {/* Recommendations Panel */}
      {data && !loading && (
        <RecommendationsPanel data={data} loading={loading} />
      )}

      {/* No Closing Alert */}
      {data && !data.has_closing && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            ⚠️ Belum ada closing untuk tanggal ini. Data rugi mungkin belum lengkap.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty State - No Data */}
      {!loading && !error && !data && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Tidak Ada Data
            </h3>
            <p className="text-gray-500 mb-4">
              Belum ada data untuk tanggal {formatDate(selectedDate)}
            </p>
            <Button
              variant="outline"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            >
              Kembali ke Hari Ini
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty State - No Production Data */}
      {!loading && !error && data && data.production_sales.target === 0 && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            ℹ️ Belum ada input produksi untuk tanggal ini. Dashboard akan menampilkan data kosong.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
