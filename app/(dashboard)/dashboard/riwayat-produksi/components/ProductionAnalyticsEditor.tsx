// ============================================================================
// PRODUCTION ANALYTICS EDITOR COMPONENT (MANAGEMENT)
// ============================================================================
// File: app/dashboard/riwayat-produksi/components/ProductionAnalyticsEditor.tsx
// Description: Analytics dashboard & Editor untuk produksi per outlet dan per ukuran
// Version: 1.0
// ============================================================================

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProductionList } from '@/lib/hooks/useProduction';
import { useRealtimeProduction } from '@/lib/hooks/useRealtimeProduction';
import { getTodayWIB } from '@/lib/utils/timezone';

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

interface DeleteCandidate {
  id: string;
  outlet_name: string;
  tanggal: string;
  ukuran: string;
  success_qty: number;
}

interface ReversalPreview {
  qty_originally_added: number;
  qty_still_available: number;
  qty_already_sold: number;
  can_delete: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductionAnalyticsEditor() {
  const [viewMode, setViewMode] = useState<ViewMode>('analytics');

  // ── Delete state ──
  const [deleteCandidate, setDeleteCandidate] = useState<DeleteCandidate | null>(null);
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'preview' | null>(null);
  const [reversalPreview, setReversalPreview] = useState<ReversalPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  // WIB timezone for initial date filters
  const today = getTodayWIB();

  const [filters, setFilters] = useState<AnalyticsFilters>({
    start_date: today, // Today in WIB
    end_date: today,   // Today in WIB
    sort_by: 'total',
    sort_order: 'desc',
  });

  // REALTIME: Subscribe to production changes
  useRealtimeProduction();

  // Check auth is ready before fetching
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Ensure user is authenticated and localStorage is ready
    const storedUser = localStorage.getItem('donutshop_user');
    if (storedUser) {
      setIsAuthReady(true);
    } else {
      // Retry once after 300ms if not ready
      const timeout = setTimeout(() => {
        const retryUser = localStorage.getItem('donutshop_user');
        if (retryUser) {
          setIsAuthReady(true);
        }
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Fetch all production data for the date range
  const { data, isLoading, isError, error } = useProductionList({
    start_date: filters.start_date,
    end_date: filters.end_date,
    limit: 10000, // Get all records for analytics
  }, isAuthReady);

  // Fetch real-time stock summary for all outlets
  const { data: allStockData } = useQuery({
    queryKey: ['inventory', 'stock', 'all', filters.start_date],
    queryFn: async () => {
      const res = await fetch('/api/inventory/stock/all');
      const json = await res.json();
      return json.success ? json.data : {};
    },
    enabled: isAuthReady && filters.start_date === today, // Only fetch stock if viewing today
    refetchInterval: 10000, // Auto refresh every 10s
  });

  // ── Delete handlers ──
  const handleDeleteClick = async (production: any) => {
    setDeleteCandidate({
      id: production.id,
      outlet_name: production.outlet?.nama || 'Unknown',
      tanggal: production.tanggal?.substring(0, 10) || '',
      ukuran: production.ukuran,
      success_qty: production.success_qty,
    });
    setDeleteStep('confirm');
    setReversalPreview(null);

    // Load reversal preview
    setIsLoadingPreview(true);
    try {
      const userStr = localStorage.getItem('donutshop_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const headers: HeadersInit = {};
      
      if (user) {
        headers['x-user-id'] = user.id;
        headers['x-user-role'] = user.role;
        headers['x-outlet-id'] = user.outlet_id;
      }

      const res = await fetch(`/api/production/daily/${production.id}/reversal-preview`, { headers });
      const json = await res.json();
      if (json.success && json.data?.inventory_impact) {
        setReversalPreview(json.data.inventory_impact);
      }
    } catch (e) {
      console.error('Gagal load reversal preview:', e);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    try {
      const userStr = localStorage.getItem('donutshop_user');
      const user = userStr ? JSON.parse(userStr) : null;
      const headers: HeadersInit = {};
      
      if (user) {
        headers['x-user-id'] = user.id;
        headers['x-user-role'] = user.role;
        headers['x-outlet-id'] = user.outlet_id;
      }

      const res = await fetch(`/api/production/daily/${deleteCandidate.id}`, {
        method: 'DELETE',
        headers
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Entri produksi berhasil dihapus', {
          description: json.reversal?.qty_reversed > 0
            ? `${json.reversal.qty_reversed} pcs stok telah dikembalikan dari kasir`
            : 'Semua stok sudah terjual sebelumnya',
          duration: 5000,
        });
        setDeleteStep(null);
        setDeleteCandidate(null);
        setRefetchKey(k => k + 1); // trigger refetch
        // Force page reload to refresh data
        window.location.reload();
      } else {
        toast.error(json.message || 'Gagal menghapus entri produksi', { duration: 5000 });
      }
    } catch (e) {
      toast.error('Terjadi kesalahan jaringan', { duration: 5000 });
    } finally {
      setIsDeleting(false);
    }
  };

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
    a.download = `production-analytics-editor-${filters.start_date}-${filters.end_date}.csv`;
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
          <h2 className="text-2xl font-bold">Riwayat Produksi (Editor)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {viewMode === 'analytics' 
              ? 'Analitik produksi per outlet dan ukuran (Editor)'
              : 'Detail riwayat produksi per entry dengan opsi modifikasi'
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
                          {filters.start_date === today && allStockData && allStockData[summary.outlet_id] && (
                            <div className="text-xs text-emerald-600 font-medium mt-1">
                              Kasir: {allStockData[summary.outlet_id].standar} pcs
                            </div>
                          )}
                          {summary.standar_waste > 0 && (
                            <div className="text-xs text-red-500 mt-1">
                              waste: {summary.standar_waste} pcs
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-semibold text-green-600">
                            {summary.mini_qty.toLocaleString('id-ID')} pcs
                          </div>
                          {filters.start_date === today && allStockData && allStockData[summary.outlet_id] && (
                            <div className="text-xs text-emerald-600 font-medium mt-1">
                              Kasir: {allStockData[summary.outlet_id].mini} pcs
                            </div>
                          )}
                          {summary.mini_waste > 0 && (
                            <div className="text-xs text-red-500 mt-1">
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
                      <TableHead className="text-center">Aksi</TableHead>
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
                              timeZone: 'Asia/Jakarta',
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(production.created_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Jakarta',
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
                        <TableCell className="text-center">
                          {/* Tombol hapus — hanya entri hari ini */}
                          {production.tanggal?.substring(0, 10) === new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }) && (
                            <button
                              onClick={() => handleDeleteClick(production)}
                              title="Hapus entri ini (dengan reversal stok)"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* ── DELETE CONFIRMATION MODAL ── */}
            {deleteStep === 'confirm' && deleteCandidate && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                  {/* Header */}
                  <div className="bg-red-50 border-b border-red-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-xl">
                        <Trash2 className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-red-900">Hapus Entri Produksi</h3>
                        <p className="text-xs text-red-600 mt-0.5">Tindakan ini tidak dapat dibatalkan</p>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="px-6 py-4 space-y-4">
                    {/* Detail entri */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Outlet</span>
                        <span className="font-black text-slate-800">{deleteCandidate.outlet_name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Ukuran</span>
                        <span className={`font-black ${deleteCandidate.ukuran === 'standar' ? 'text-blue-600' : 'text-green-600'}`}>
                          {deleteCandidate.ukuran.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 font-medium">Produksi Berhasil</span>
                        <span className="font-black text-slate-800">{deleteCandidate.success_qty} pcs</span>
                      </div>
                    </div>

                    {/* Dampak reversal inventory */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-black text-amber-800 uppercase tracking-wide">Dampak pada Stok Kasir</span>
                      </div>

                      {isLoadingPreview ? (
                        <div className="flex items-center gap-2 text-amber-700">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Mengecek stok kasir...</span>
                        </div>
                      ) : reversalPreview ? (
                        <div className="space-y-2">
                          {reversalPreview.qty_still_available > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-amber-700">🗑️ Stok akan dihapus dari kasir</span>
                              <span className="font-black text-red-700">{reversalPreview.qty_still_available} pcs</span>
                            </div>
                          )}
                          {reversalPreview.qty_already_sold > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-amber-700">✅ Sudah terjual (aman)</span>
                              <span className="font-black text-green-700">{reversalPreview.qty_already_sold} pcs</span>
                            </div>
                          )}
                          {reversalPreview.qty_still_available === 0 && (
                            <div className="flex items-center gap-2 text-green-700">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm">Semua stok sudah terjual — tidak ada yang perlu dihapus dari kasir</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-amber-700">Tidak dapat memuat preview dampak stok.</p>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 text-center">
                      Transaksi yang sudah terjual <strong>tidak akan terpengaruh</strong>.
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                    <button
                      onClick={() => { setDeleteStep(null); setDeleteCandidate(null); }}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleDeleteConfirm}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-black text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                      {isDeleting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Menghapus...</>
                      ) : (
                        <><Trash2 className="h-4 w-4" /> Ya, Hapus Entri</>  
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
