// ============================================================================
// PRODUCTION ANALYTICS COMPONENT
// ============================================================================
// File: app/dashboard/input-produksi/components/ProductionAnalytics.tsx
// Description: Analytics dashboard untuk produksi per outlet dan per ukuran
// Version: 2.0 - Added toggle between Analytics and Detail view
// Date: May 8, 2026
// ============================================================================

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  Search,
  Loader2,
  AlertTriangle,
  Store,
  Package,
  List,
  LayoutGrid,
} from 'lucide-react';
import { useProductionList } from '@/lib/hooks/useProduction';
import { useRealtimeProduction } from '@/lib/hooks/useRealtimeProduction';

// ============================================================================
// TYPES
// ============================================================================

interface OutletSummary {
  outlet_id: string;
  outlet_name: string;
  standar_qty: number;
  mini_qty: number;
  total_qty: number;
  standar_waste: number;
  mini_waste: number;
  total_waste: number;
  standar_rate: number;
  mini_rate: number;
  avg_success_rate: number;
  entry_count: number;
}

interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  search?: string;
  sort_by?: 'outlet' | 'total' | 'standar' | 'mini' | 'waste';
  sort_order?: 'asc' | 'desc';
}

type ViewMode = 'analytics' | 'detail';

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductionAnalytics() {
  const [viewMode, setViewMode] = useState<ViewMode>('analytics');
  const [filters, setFilters] = useState<AnalyticsFilters>({
    start_date: new Date().toISOString().split('T')[0], // Today
    end_date: new Date().toISOString().split('T')[0],   // Today
    sort_by: 'total',
    sort_order: 'desc',
  });

  // ✅ REALTIME: Subscribe to production changes
  useRealtimeProduction();

  // Fetch all production data for the date range
  const { data, isLoading, isError, error } = useProductionList({
    start_date: filters.start_date,
    end_date: filters.end_date,
    limit: 10000, // Get all records for analytics
  });

  // ============================================================================
  // COMPUTE ANALYTICS
  // ============================================================================

  const analytics = useMemo(() => {
    if (!data?.items || data.items.length === 0) {
      return {
        outletSummaries: [],
        grandTotal: {
          standar_qty: 0,
          mini_qty: 0,
          total_qty: 0,
          standar_waste: 0,
          mini_waste: 0,
          total_waste: 0,
          avg_success_rate: 0,
          outlet_count: 0,
        },
      };
    }

    // Group by outlet
    const outletMap = new Map<string, OutletSummary>();

    data.items.forEach((prod: any) => {
      const outletId = prod.outlet_id;
      const outletName = prod.outlet?.nama || 'Unknown';

      if (!outletMap.has(outletId)) {
        outletMap.set(outletId, {
          outlet_id: outletId,
          outlet_name: outletName,
          standar_qty: 0,
          mini_qty: 0,
          total_qty: 0,
          standar_waste: 0,
          mini_waste: 0,
          total_waste: 0,
          standar_rate: 0,
          mini_rate: 0,
          avg_success_rate: 0,
          entry_count: 0,
        });
      }

      const summary = outletMap.get(outletId)!;
      summary.entry_count++;

      if (prod.ukuran === 'standar') {
        summary.standar_qty += prod.success_qty || 0;
        summary.standar_waste += prod.waste_qty || 0;
      } else if (prod.ukuran === 'mini') {
        summary.mini_qty += prod.success_qty || 0;
        summary.mini_waste += prod.waste_qty || 0;
      }

      summary.total_qty += prod.success_qty || 0;
      summary.total_waste += prod.waste_qty || 0;
    });

    // Calculate rates
    outletMap.forEach((summary) => {
      const standarTotal = summary.standar_qty + summary.standar_waste;
      const miniTotal = summary.mini_qty + summary.mini_waste;
      const grandTotalProd = summary.total_qty + summary.total_waste;

      summary.standar_rate = standarTotal > 0 ? (summary.standar_qty / standarTotal) * 100 : 0;
      summary.mini_rate = miniTotal > 0 ? (summary.mini_qty / miniTotal) * 100 : 0;
      summary.avg_success_rate = grandTotalProd > 0 ? (summary.total_qty / grandTotalProd) * 100 : 0;
    });

    let outletSummaries = Array.from(outletMap.values());

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      outletSummaries = outletSummaries.filter((s) =>
        s.outlet_name.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    outletSummaries.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      switch (filters.sort_by) {
        case 'outlet':
          return filters.sort_order === 'asc'
            ? a.outlet_name.localeCompare(b.outlet_name)
            : b.outlet_name.localeCompare(a.outlet_name);
        case 'total':
          aVal = a.total_qty;
          bVal = b.total_qty;
          break;
        case 'standar':
          aVal = a.standar_qty;
          bVal = b.standar_qty;
          break;
        case 'mini':
          aVal = a.mini_qty;
          bVal = b.mini_qty;
          break;
        case 'waste':
          aVal = a.total_waste;
          bVal = b.total_waste;
          break;
        default:
          aVal = a.total_qty;
          bVal = b.total_qty;
      }

      return filters.sort_order === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Calculate grand totals
    const grandTotal = {
      standar_qty: outletSummaries.reduce((sum, s) => sum + s.standar_qty, 0),
      mini_qty: outletSummaries.reduce((sum, s) => sum + s.mini_qty, 0),
      total_qty: outletSummaries.reduce((sum, s) => sum + s.total_qty, 0),
      standar_waste: outletSummaries.reduce((sum, s) => sum + s.standar_waste, 0),
      mini_waste: outletSummaries.reduce((sum, s) => sum + s.mini_waste, 0),
      total_waste: outletSummaries.reduce((sum, s) => sum + s.total_waste, 0),
      avg_success_rate:
        outletSummaries.length > 0
          ? outletSummaries.reduce((sum, s) => sum + s.avg_success_rate, 0) / outletSummaries.length
          : 0,
      outlet_count: outletSummaries.length,
    };

    return { outletSummaries, grandTotal };
  }, [data, filters.search, filters.sort_by, filters.sort_order]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFilterChange = (key: keyof AnalyticsFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSort = (column: AnalyticsFilters['sort_by']) => {
    setFilters((prev) => ({
      ...prev,
      sort_by: column,
      sort_order: prev.sort_by === column && prev.sort_order === 'desc' ? 'asc' : 'desc',
    }));
  };

  const exportToCSV = () => {
    if (!analytics.outletSummaries.length) return;

    const headers = [
      'Outlet',
      'Standar (pcs)',
      'Mini (pcs)',
      'Total (pcs)',
      'Standar Waste',
      'Mini Waste',
      'Total Waste',
      'Success Rate (%)',
      'Jumlah Input',
    ];

    const rows = analytics.outletSummaries.map((s) => [
      s.outlet_name,
      s.standar_qty,
      s.mini_qty,
      s.total_qty,
      s.standar_waste,
      s.mini_waste,
      s.total_waste,
      s.avg_success_rate.toFixed(2),
      s.entry_count,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `production-analytics-${filters.start_date}-${filters.end_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Riwayat Produksi</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {viewMode === 'analytics' 
              ? 'Analitik produksi per outlet dan ukuran'
              : 'Detail riwayat produksi per entry'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'analytics' ? 'default' : 'outline'}
            onClick={() => setViewMode('analytics')}
            className="flex items-center gap-2"
          >
            <LayoutGrid className="h-4 w-4" />
            Per Outlet
          </Button>
          <Button
            variant={viewMode === 'detail' ? 'default' : 'outline'}
            onClick={() => setViewMode('detail')}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            Detail Entry
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter & Pencarian
          </CardTitle>
          <CardDescription>Filter data produksi berdasarkan tanggal dan outlet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="start_date">Dari Tanggal</Label>
              <Input
                id="start_date"
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Sampai Tanggal</Label>
              <Input
                id="end_date"
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
              />
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Cari Outlet</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Nama outlet..."
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Export Button */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={!analytics.outletSummaries.length}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grand Total Summary */}
      {!isLoading && !isError && analytics.outletSummaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Outlets */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                <Store className="h-4 w-4" />
                Total Outlet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">
                {analytics.grandTotal.outlet_count}
              </div>
              <p className="text-xs text-purple-600 mt-1">outlet aktif produksi</p>
            </CardContent>
          </Card>

          {/* Total Standar */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Standar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">
                {analytics.grandTotal.standar_qty.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                pcs | waste: {analytics.grandTotal.standar_waste} pcs
              </p>
            </CardContent>
          </Card>

          {/* Total Mini */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total Mini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">
                {analytics.grandTotal.mini_qty.toLocaleString('id-ID')}
              </div>
              <p className="text-xs text-green-600 mt-1">
                pcs | waste: {analytics.grandTotal.mini_waste} pcs
              </p>
            </CardContent>
          </Card>

          {/* Avg Success Rate */}
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-amber-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Rata-rata Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-900">
                {analytics.grandTotal.avg_success_rate.toFixed(1)}%
              </div>
              <p className="text-xs text-amber-600 mt-1">
                dari {analytics.grandTotal.outlet_count} outlet
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Memuat data analytics...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error?.message || 'Gagal memuat data analytics'}</AlertDescription>
        </Alert>
      )}

      {/* Analytics Table */}
      {!isLoading && !isError && viewMode === 'analytics' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Produksi Per Outlet
            </CardTitle>
            <CardDescription>
              Menampilkan {analytics.outletSummaries.length} outlet | Total:{' '}
              {analytics.grandTotal.total_qty.toLocaleString('id-ID')} pcs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.outletSummaries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada data produksi</p>
                <p className="text-sm mt-1">Coba ubah filter tanggal atau tambah produksi baru</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => handleSort('outlet')}
                      >
                        <div className="flex items-center gap-2">
                          Outlet
                          {filters.sort_by === 'outlet' &&
                            (filters.sort_order === 'desc' ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : (
                              <TrendingUp className="h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-slate-50"
                        onClick={() => handleSort('standar')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          🔵 Standar
                          {filters.sort_by === 'standar' &&
                            (filters.sort_order === 'desc' ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : (
                              <TrendingUp className="h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-slate-50"
                        onClick={() => handleSort('mini')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          🟢 Mini
                          {filters.sort_by === 'mini' &&
                            (filters.sort_order === 'desc' ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : (
                              <TrendingUp className="h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-slate-50"
                        onClick={() => handleSort('total')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Total Produksi
                          {filters.sort_by === 'total' &&
                            (filters.sort_order === 'desc' ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : (
                              <TrendingUp className="h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right cursor-pointer hover:bg-slate-50"
                        onClick={() => handleSort('waste')}
                      >
                        <div className="flex items-center justify-end gap-2">
                          Total Waste
                          {filters.sort_by === 'waste' &&
                            (filters.sort_order === 'desc' ? (
                              <TrendingDown className="h-4 w-4" />
                            ) : (
                              <TrendingUp className="h-4 w-4" />
                            ))}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Success Rate</TableHead>
                      <TableHead className="text-right">Jumlah Input</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics.outletSummaries.map((summary) => (
                      <TableRow key={summary.outlet_id}>
                        <TableCell className="font-medium">{summary.outlet_name}</TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-blue-600">
                            {summary.standar_qty.toLocaleString('id-ID')} pcs
                          </div>
                          {summary.standar_waste > 0 && (
                            <div className="text-xs text-red-500">
                              waste: {summary.standar_waste} pcs
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-green-600">
                            {summary.mini_qty.toLocaleString('id-ID')} pcs
                          </div>
                          {summary.mini_waste > 0 && (
                            <div className="text-xs text-red-500">
                              waste: {summary.mini_waste} pcs
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-bold text-lg">
                            {summary.total_qty.toLocaleString('id-ID')}
                          </div>
                          <div className="text-xs text-muted-foreground">pcs</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-red-600">
                            {summary.total_waste.toLocaleString('id-ID')}
                          </div>
                          <div className="text-xs text-muted-foreground">pcs</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              summary.avg_success_rate >= 90
                                ? 'default'
                                : summary.avg_success_rate >= 80
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {summary.avg_success_rate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {summary.entry_count}x
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Detail View - Per Entry */}
      {!isLoading && !isError && viewMode === 'detail' && data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Detail Riwayat Produksi
            </CardTitle>
            <CardDescription>
              Menampilkan {data.items.length} entry produksi
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada data produksi</p>
                <p className="text-sm mt-1">Coba ubah filter tanggal atau tambah produksi baru</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal & Waktu</TableHead>
                      <TableHead>Outlet</TableHead>
                      <TableHead>Ukuran</TableHead>
                      <TableHead className="text-right">Target</TableHead>
                      <TableHead className="text-right">Berhasil</TableHead>
                      <TableHead className="text-right">Waste</TableHead>
                      <TableHead className="text-right">Success Rate</TableHead>
                      <TableHead className="text-right">Waste Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((production: any) => (
                      <TableRow key={production.id}>
                        <TableCell className="font-medium">
                          <div>
                            {new Date(production.tanggal).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(production.created_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </TableCell>
                        <TableCell>{production.outlet?.nama || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={production.ukuran === 'standar' ? 'default' : 'secondary'}
                            className={`text-sm px-3 py-1 ${
                              production.ukuran === 'standar'
                                ? 'bg-blue-500 hover:bg-blue-600'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                          >
                            {production.ukuran === 'standar' ? '🔵 STANDAR' : '🟢 MINI'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{production.target_qty}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {production.success_qty}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-red-600">
                          {production.waste_qty}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              production.success_rate >= 90
                                ? 'default'
                                : production.success_rate >= 80
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {production.success_rate?.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`font-medium ${
                              production.waste_rate <= 5
                                ? 'text-green-600'
                                : production.waste_rate <= 15
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {production.waste_rate?.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
