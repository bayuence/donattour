'use client';

import { useState, useMemo } from 'react';
import { 
  ArrowUpDown, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Layers
} from 'lucide-react';
import { formatRupiah, formatNumber, formatPercent } from '@/lib/utils/format';
import type { ProductSalesRow } from './useMultiOutletData';

interface ProductSalesTableProps {
  data: ProductSalesRow[];
  loading?: boolean;
}

type SortField = 'product_name' | 'category_name' | 'qty' | 'revenue' | 'total_hpp' | 'total_margin' | 'margin_percent';
type SortOrder = 'asc' | 'desc';

export function ProductSalesTable({ data, loading }: ProductSalesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('qty');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Filter & Sort Data
  const processedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.product_name.toLowerCase().includes(query) ||
          (item.category_name || '').toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle nulls
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    return result;
  }, [data, searchQuery, sortField, sortOrder]);

  // Pagination calculations
  const totalItems = processedData.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  // Overall totals of processed data
  const overallTotals = useMemo(() => {
    return processedData.reduce(
      (acc, item) => {
        acc.qty += item.qty;
        acc.revenue += item.revenue;
        acc.total_hpp += item.total_hpp;
        acc.total_margin += item.total_margin;
        return acc;
      },
      { qty: 0, revenue: 0, total_hpp: 0, total_margin: 0 }
    );
  }, [processedData]);

  const overallMarginPercent = overallTotals.revenue > 0 
    ? (overallTotals.total_margin / overallTotals.revenue) * 100 
    : 0;

  // Sorting indicator icon
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40 ml-1 inline shrink-0" />;
    return (
      <span className="ml-1 font-bold text-orange-600 inline shrink-0">
        {sortOrder === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-orange-500" />
            Rincian Penjualan Produk &amp; Margin
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Analisis performa produk, HPP, omzet, dan margin keuntungan kotor</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari produk atau kategori..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-4 py-2 w-full text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-gray-50/50"
            />
          </div>

          {/* Page size selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-white cursor-pointer font-medium text-gray-700"
          >
            <option value={10}>10 Baris</option>
            <option value={25}>25 Baris</option>
            <option value={50}>50 Baris</option>
            <option value={100}>Semua</option>
          </select>
        </div>
      </div>

      {/* Table Area */}
      <div className="overflow-x-auto border border-gray-100 rounded-xl">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider select-none">
              <th className="px-4 py-3 text-center w-12">No</th>
              <th className="px-4 py-3 cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('product_name')}>
                Varian / Produk <SortIndicator field="product_name" />
              </th>
              <th className="px-4 py-3 cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('category_name')}>
                Kategori <SortIndicator field="category_name" />
              </th>
              <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('qty')}>
                Pcs <SortIndicator field="qty" />
              </th>
              <th className="px-4 py-3 text-right">HPP / Pcs</th>
              <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('total_hpp')}>
                Total HPP <SortIndicator field="total_hpp" />
              </th>
              <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('revenue')}>
                Total Omzet <SortIndicator field="revenue" />
              </th>
              <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('total_margin')}>
                Laba Kotor <SortIndicator field="total_margin" />
              </th>
              <th className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => handleSort('margin_percent')}>
                % Margin <SortIndicator field="margin_percent" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td colSpan={9} className="px-4 py-4 text-center">
                    <div className="h-4 bg-gray-100 rounded w-full"></div>
                  </td>
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400 font-medium">
                  Tidak ada data penjualan produk untuk filter yang dipilih.
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => {
                const itemNum = (currentPage - 1) * pageSize + idx + 1;
                const isPremium = item.category_name?.toLowerCase().includes('premium');
                const isLabaMinus = item.total_margin < 0;

                return (
                  <tr key={item.product_id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="px-4 py-3.5 text-center font-medium text-gray-400 tabular-nums">
                      {itemNum}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-gray-900">
                      {item.product_name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border capitalize
                        ${isPremium 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                      >
                        {item.category_name || 'Varian'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-gray-900 tabular-nums">
                      {formatNumber(item.qty)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-500 tabular-nums">
                      {formatRupiah(item.hpp_unit)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-600 tabular-nums font-medium">
                      {formatRupiah(item.total_hpp)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-gray-900 tabular-nums font-semibold">
                      {formatRupiah(item.revenue)}
                    </td>
                    <td className={`px-4 py-3.5 text-right tabular-nums font-bold
                      ${isLabaMinus ? 'text-rose-600' : 'text-emerald-600'}`}
                    >
                      {formatRupiah(item.total_margin)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border
                        ${item.margin_percent >= 50
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : item.margin_percent >= 30
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                            : 'bg-red-50 text-red-700 border-red-200'}`}
                      >
                        {formatPercent(item.margin_percent)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Table Footer Totals */}
          {processedData.length > 0 && !loading && (
            <tfoot className="bg-gray-50 font-bold border-t border-gray-200 select-none">
              <tr className="text-gray-900 text-right">
                <td colSpan={3} className="px-4 py-4 text-left">Total Penjualan</td>
                <td className="px-4 py-4 tabular-nums text-gray-900">{formatNumber(overallTotals.qty)} pcs</td>
                <td className="px-4 py-4"></td>
                <td className="px-4 py-4 tabular-nums text-gray-600">{formatRupiah(overallTotals.total_hpp)}</td>
                <td className="px-4 py-4 tabular-nums text-gray-900">{formatRupiah(overallTotals.revenue)}</td>
                <td className={`px-4 py-4 tabular-nums ${overallTotals.total_margin < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatRupiah(overallTotals.total_margin)}
                </td>
                <td className="px-4 py-4 text-right">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black border
                    ${overallMarginPercent >= 50
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : overallMarginPercent >= 30
                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        : 'bg-red-50 text-red-700 border-red-200'}`}
                  >
                    {formatPercent(overallMarginPercent)}
                  </span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <p className="text-xs text-gray-500 font-medium">
            Menampilkan <span className="font-semibold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> sampai{' '}
            <span className="font-semibold text-gray-900">{Math.min(currentPage * pageSize, totalItems)}</span> dari{' '}
            <span className="font-semibold text-gray-900">{totalItems}</span> varian
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isCurrent = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 text-xs font-semibold rounded-lg border transition-all
                    ${isCurrent
                      ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white border-transparent shadow-sm'
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
