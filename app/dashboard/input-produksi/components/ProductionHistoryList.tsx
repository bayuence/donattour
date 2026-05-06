// ============================================================================
// PRODUCTION HISTORY LIST COMPONENT
// ============================================================================
// File: app/dashboard/input-produksi/components/ProductionHistoryList.tsx
// Description: List view untuk riwayat produksi dengan filter
// Version: 1.0
// Date: 2026-05-03
// ============================================================================

'use client';

import { useState } from 'react';
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
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useProductionList, useDeleteProduction } from '@/lib/hooks/useProduction';

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

export function ProductionHistoryList() {
  const [filters, setFilters] = useState<ProductionFilters>({
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0], // Last 7 days
    end_date: new Date().toISOString().split('T')[0],
  });

  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch production list
  const { data, isLoading, isError, error } = useProductionList({
    ...filters,
    page,
    limit,
  });

  const deleteProduction = useDeleteProduction();

  // Handle filter change
  const handleFilterChange = (key: keyof ProductionFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus produksi ini?')) return;

    try {
      await deleteProduction.mutateAsync(id);
    } catch (error) {
      console.error('Error deleting production:', error);
    }
  };

  // Get waste rate color
  const getWasteRateColor = (rate: number) => {
    if (rate <= 5) return 'text-green-600';
    if (rate <= 15) return 'text-yellow-600';
    return 'text-red-600';
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
                  setFilters({
                    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split('T')[0],
                    end_date: new Date().toISOString().split('T')[0],
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
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Outlet</TableHead>
                        <TableHead>Ukuran</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                        <TableHead className="text-right">Berhasil</TableHead>
                        <TableHead className="text-right">Waste</TableHead>
                        <TableHead className="text-right">Success Rate</TableHead>
                        <TableHead className="text-right">Waste Rate</TableHead>
                        <TableHead className="text-right">HPP Loss</TableHead>
                        <TableHead className="text-center">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.items.map((production: any) => (
                        <TableRow key={production.id}>
                          <TableCell className="font-medium">
                            {new Date(production.tanggal).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>
                            {production.outlet?.nama || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={production.ukuran === 'standar' ? 'default' : 'secondary'}>
                              {production.ukuran}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {production.target_qty}
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-semibold">
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
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {/* Edit button - only for today's production */}
                              {new Date(production.tanggal).toDateString() ===
                                new Date().toDateString() && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // TODO: Open edit modal
                                    console.log('Edit:', production.id);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Delete button - admin only, today only */}
                              {new Date(production.tanggal).toDateString() ===
                                new Date().toDateString() && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(production.id)}
                                  disabled={deleteProduction.isPending}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
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
