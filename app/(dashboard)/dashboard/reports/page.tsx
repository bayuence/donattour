// ============================================================================
// REPORTS PAGE
// ============================================================================
// File: app/dashboard/reports/page.tsx
// Description: Weekly/Monthly reports visualization page
// Version: 1.0
// Date: 2026-05-06
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { PeriodSelector } from './components/PeriodSelector';
import { TrendCharts } from './components/TrendCharts';
import { OutletComparison } from './components/OutletComparison';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  
  // Filter state
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [outletId, setOutletId] = useState<string>('');

  // Initialize dates (last 7 days)
  useEffect(() => {
    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 7);
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(lastWeek.toISOString().split('T')[0]);
  }, []);

  // Fetch report data
  const fetchReportData = async () => {
    if (!startDate || !endDate) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });

      if (outletId) {
        params.append('outlet_id', outletId);
      }

      const response = await fetch(`/api/reports/period?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data laporan');
      }

      const data = await response.json();
      
      if (data.success) {
        setReportData(data.data);
      } else {
        throw new Error(data.error?.message || 'Gagal mengambil data laporan');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when filters change
  useEffect(() => {
    if (startDate && endDate) {
      fetchReportData();
    }
  }, [startDate, endDate, outletId]);

  // Export to Excel
  const handleExportExcel = async () => {
    if (!startDate || !endDate) {
      alert('Pilih periode terlebih dahulu');
      return;
    }

    try {
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          outlet_id: outletId || undefined,
          include_sheets: ['summary', 'production', 'sales', 'loss', 'flavors'],
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal export Excel');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_${startDate}_${endDate}${outletId ? '_' + outletId : ''}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal export Excel');
      console.error('Error exporting Excel:', err);
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    // TODO: Implement in Task 9.4
    alert('Export PDF akan diimplementasikan di Task 9.4');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">📊 Laporan Periode</h1>
          <p className="text-gray-600 mt-1">
            Analisis performa mingguan/bulanan dengan trend dan perbandingan
          </p>
        </div>
        
        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={loading || !reportData}
          >
            📥 Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={loading || !reportData}
          >
            📄 Export PDF
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <PeriodSelector
        startDate={startDate}
        endDate={endDate}
        outletId={outletId}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onOutletChange={setOutletId}
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Memuat data laporan...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Report Content */}
      {!loading && !error && reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Production */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Produksi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reportData.summary.total_production.toLocaleString('id-ID')} pcs
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Target: {reportData.summary.total_target.toLocaleString('id-ID')} pcs
                </p>
              </CardContent>
            </Card>

            {/* Total Sold */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Terjual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {reportData.summary.total_sold.toLocaleString('id-ID')} pcs
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {reportData.summary.total_production > 0
                    ? ((reportData.summary.total_sold / reportData.summary.total_production) * 100).toFixed(1)
                    : 0}% dari produksi
                </p>
              </CardContent>
            </Card>

            {/* Total Waste */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Waste
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {reportData.summary.total_waste.toLocaleString('id-ID')} pcs
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Waste Rate: {reportData.summary.average_waste_rate.toFixed(1)}%
                </p>
              </CardContent>
            </Card>

            {/* Total Loss */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Rugi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  Rp {reportData.summary.total_loss.toLocaleString('id-ID')}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Margin: {reportData.summary.average_margin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Period Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">
                    📅 Periode: {reportData.period.start_date} s/d {reportData.period.end_date}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Total: {reportData.period.total_days} hari
                  </p>
                </div>
                {reportData.summary.average_waste_rate > 15 ? (
                  <div className="flex items-center gap-2 text-red-600">
                    <TrendingUp className="h-5 w-5" />
                    <span className="font-semibold">Waste Rate Tinggi!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <TrendingDown className="h-5 w-5" />
                    <span className="font-semibold">Waste Rate Normal</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Trend Charts */}
          <TrendCharts trends={reportData.trends} />

          {/* Outlet Comparison */}
          {reportData.outlet_comparison && reportData.outlet_comparison.length > 0 && (
            <OutletComparison outlets={reportData.outlet_comparison} />
          )}
        </>
      )}

      {/* Empty State */}
      {!loading && !error && !reportData && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              Pilih periode untuk melihat laporan
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
