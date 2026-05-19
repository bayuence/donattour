// ============================================================================
// PRODUCTION HISTORY LIST COMPONENT
// ============================================================================
// File: app/dashboard/input-produksi/components/ProductionHistoryList.tsx
// Description: List view untuk riwayat produksi dengan filter
// Version: 1.0
// Date: 2026-05-03
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
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
  Calendar,
  Filter,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Wifi,
} from 'lucide-react';
import { useProductionList, useDeleteProduction } from '@/lib/hooks/useProduction';
import { useRealtimeProduction } from '@/lib/hooks/useRealtimeProduction';
import { getTodayWIB } from '@/lib/utils/timezone'; // ✅ FIX: Import WIB timezone helper

// ============================================================================
// TYPES
// ============================================================================

interface ProductionFilters {
  outlet_id?: string;
  start_date?: string;
  end_date?: string;
  ukuran?: 'standar' | 'mini';
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ProductionHistoryList({ refetchRef }: { refetchRef?: React.MutableRefObject<(() => void) | null> }) {
  // ✅ FIX: Use WIB timezone for initial date filters
  const today = getTodayWIB();
  const sevenDaysAgo = (() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD format in WIB
  })();

  const [filters, setFilters] = useState<ProductionFilters>({
    start_date: sevenDaysAgo, // ✅ Last 7 days in WIB
    end_date: today,          // ✅ Today in WIB
  });

  const [page, setPage] = useState(1);
  const limit = 20;

  // ✅ REALTIME: Subscribe to production changes for instant updates
  useRealtimeProduction(filters.outlet_id);

  // Fetch production list
  const { data, isLoading, isError, error, refetch } = useProductionList({
    ...filters,
    page,
    limit,
  });

  // ✅ Assign refetch function to ref so parent can trigger it
  useEffect(() => {
    if (refetchRef) {
      refetchRef.current = refetch;
    }
  }, [refetch, refetchRef]);
  // Handle filter change
  const handleFilterChange = (key: keyof ProductionFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page
  };

  // Get waste rate color
  const getWasteRateColor = (rate: number) => {
    if (rate <= 5) return 'text-green-600';
    if (rate <= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Check if this is the latest record for the outlet/ukuran combination
  const isLatestRecord = (production: any) => {
    if (!data?.items) return false;
    const sameOutletSize = data.items.filter(
      (p: any) =>
        p.outlet_id === production.outlet_id &&
        p.ukuran === production.ukuran
    );
    return sameOutletSize.length > 0 && sameOutletSize[0].id === production.id;
  };

  // ✅ FIX: Calculate cumulative total for outlet/ukuran/tanggal (SUM of all success_qty for SAME DATE)
  const getCumulativeTotal = (production: any) => {
    if (!data?.items) return 0;
    
    // Sum all success_qty for same outlet + ukuran + tanggal (SAME DATE ONLY)
    const total = data.items
      .filter((p: any) => 
        p.outlet_id === production.outlet_id && 
        p.ukuran === production.ukuran &&
        p.tanggal === production.tanggal  // ✅ Only count entries from same date
      )
      .reduce((sum: number, p: any) => sum + (p.success_qty || 0), 0);
    
    return total;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter
          </CardTitle>
          <CardDescription>Filter riwayat produksi berdasarkan kriteria</CardDescription>
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

            {/* Size Filter */}
            <div className="space-y-2">
              <Label htmlFor="ukuran">Ukuran</Label>
              <select
                id="ukuran"
                value={filters.ukuran || 'all'}
                onChange={(e) =>
                  handleFilterChange('ukuran', e.target.value === 'all' ? '' : e.target.value)
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="all">Semua Ukuran</option>
                <option value="standar">Standar</option>
                <option value="mini">Mini</option>
              </select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  // ✅ FIX: Reset to WIB timezone dates
                  const today = getTodayWIB();
                  const sevenDaysAgo = (() => {
                    const date = new Date();
                    date.setDate(date.getDate() - 7);
                    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
                  })();
                  
                  setFilters({
                    start_date: sevenDaysAgo,
                    end_date: today,
                  });
                  setPage(1);
                }}
                className="w-full"
              >
                Reset Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Memuat data...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error?.message || 'Gagal memuat data produksi'}
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Card - Today's Total by Size */}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-amber-600" />
              Total Produksi Hari Ini
            </CardTitle>
            <CardDescription>Ringkasan produksi berdasarkan ukuran donat</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Standar Summary */}
              {(() => {
                const today = getTodayWIB(); // ✅ FIX: Use WIB timezone
                const standarEntries = data.items.filter((p: any) => 
                  p.ukuran === 'standar' && 
                  p.tanggal === today
                );
                const totalStandar = standarEntries.reduce((sum: number, p: any) => sum + (p.success_qty || 0), 0);
                const entryCount = standarEntries.length;
                
                return totalStandar > 0 ? (
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="default" className="text-base px-3 py-1">
                        🔵 STANDAR
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {entryCount} input
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      {totalStandar} <span className="text-lg font-normal text-muted-foreground">pcs</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total donat standar berhasil hari ini
                    </p>
                  </div>
                ) : null;
              })()}

              {/* Mini Summary */}
              {(() => {
                const today = getTodayWIB(); // ✅ FIX: Use WIB timezone
                const miniEntries = data.items.filter((p: any) => 
                  p.ukuran === 'mini' && 
                  p.tanggal === today
                );
                const totalMini = miniEntries.reduce((sum: number, p: any) => sum + (p.success_qty || 0), 0);
                const entryCount = miniEntries.length;
                
                return totalMini > 0 ? (
                  <div className="bg-white rounded-lg p-4 border-2 border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-base px-3 py-1">
                        🟢 MINI
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {entryCount} input
                      </span>
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {totalMini} <span className="text-lg font-normal text-muted-foreground">pcs</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Total donat mini berhasil hari ini
                    </p>
                  </div>
                ) : null;
              })()}

              {/* Show placeholder if no production today */}
              {(() => {
                const today = getTodayWIB(); // ✅ FIX: Use WIB timezone
                const todayEntries = data.items.filter((p: any) => 
                  p.tanggal === today
                );
                return todayEntries.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Belum ada produksi hari ini</p>
                  </div>
                ) : null;
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {!isLoading && !isError && data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Produksi</CardTitle>
              <CardDescription>
                Menampilkan {data.items.length} dari {data.pagination.total} produksi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Tidak ada data produksi</p>
                  <p className="text-sm mt-1">Coba ubah filter atau tambah produksi baru</p>
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
                        <TableHead className="text-right">HPP Loss</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((production: any) => {
                        const isLatest = isLatestRecord(production);
                        return (
                          <TableRow
                            key={production.id}
                            className={isLatest ? 'bg-amber-50 border-l-4 border-amber-500 font-semibold hover:bg-amber-100' : ''}
                          >
                            <TableCell className="font-medium">
                              <div>
                                {new Date(production.tanggal).toLocaleDateString('id-ID', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </div>
                              <div className={`text-xs ${isLatest ? 'text-amber-700 font-bold' : 'text-muted-foreground'}`}>
                                {new Date(production.created_at).toLocaleTimeString('id-ID', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{production.outlet?.nama || 'Unknown'}</span>
                                {isLatest && (
                                  <span className="px-2 py-1 bg-amber-500 text-white text-xs rounded-full font-bold">
                                    TERBARU
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {/* Large, prominent size badge */}
                                <Badge 
                                  variant={production.ukuran === 'standar' ? 'default' : 'secondary'}
                                  className={`text-base px-4 py-2 font-bold ${
                                    production.ukuran === 'standar' 
                                      ? 'bg-blue-500 hover:bg-blue-600' 
                                      : 'bg-green-500 hover:bg-green-600 text-white'
                                  }`}
                                >
                                  {production.ukuran === 'standar' ? '🔵 STANDAR' : '🟢 MINI'}
                                </Badge>
                                {/* Show cumulative total for this size today */}
                                {isLatest && (
                                  <span className="text-sm font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                                    Total: {getCumulativeTotal(production)} pcs
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {production.target_qty}
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${isLatest ? 'text-amber-700' : 'text-green-600'}`}>
                              {production.success_qty}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-semibold">
                              {production.waste_qty}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-medium text-green-600">
                                {production.success_rate?.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={`font-medium ${getWasteRateColor(
                                  production.waste_rate || 0
                                )}`}
                              >
                                {production.waste_rate?.toFixed(1)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              Rp {production.total_hpp_loss?.toLocaleString('id-ID')}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {data.pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Halaman {data.pagination.page} dari {data.pagination.total_pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.pagination.total_pages}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
