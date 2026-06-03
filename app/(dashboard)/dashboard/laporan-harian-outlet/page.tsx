'use client';

import { useState } from 'react';
import { TrendingUp, Package, XCircle, AlertTriangle, Activity, BarChart2, Receipt, FileText } from 'lucide-react';

type UkuranDonat = 'standar' | 'mini';

interface ProdukHarian {
  id: string;
  nama: string;
  ukuran: UkuranDonat;
  hargaJual: number;
  hpp: number;
  diproduksi: number;
  terjual: number;
  gagalProduksi: number;
  batalBeli: number;
  sisaBertoping: number;
  sisaTanpaToping: number;
}

interface PengeluaranItem {
  id: string;
  kategori: string;
  keterangan: string;
  jumlah: number;
}

// Demo Data
const PRODUK_DATA: ProdukHarian[] = [
  { id: 's1', nama: 'Donat Gula', ukuran: 'standar', hargaJual: 3000, hpp: 1800, diproduksi: 50, terjual: 42, gagalProduksi: 2, batalBeli: 1, sisaBertoping: 3, sisaTanpaToping: 2 },
  { id: 's2', nama: 'Donat Cokelat', ukuran: 'standar', hargaJual: 4000, hpp: 2300, diproduksi: 60, terjual: 55, gagalProduksi: 1, batalBeli: 0, sisaBertoping: 2, sisaTanpaToping: 2 },
  { id: 's3', nama: 'Donat Keju', ukuran: 'standar', hargaJual: 4500, hpp: 2600, diproduksi: 45, terjual: 38, gagalProduksi: 2, batalBeli: 1, sisaBertoping: 2, sisaTanpaToping: 2 },
  { id: 's4', nama: 'Donat Strawberry', ukuran: 'standar', hargaJual: 4000, hpp: 2400, diproduksi: 40, terjual: 33, gagalProduksi: 1, batalBeli: 2, sisaBertoping: 2, sisaTanpaToping: 2 },
  { id: 'm1', nama: 'Mini Gula', ukuran: 'mini', hargaJual: 1500, hpp: 900, diproduksi: 80, terjual: 72, gagalProduksi: 3, batalBeli: 0, sisaBertoping: 3, sisaTanpaToping: 2 },
  { id: 'm2', nama: 'Mini Cokelat', ukuran: 'mini', hargaJual: 2000, hpp: 1100, diproduksi: 70, terjual: 65, gagalProduksi: 1, batalBeli: 1, sisaBertoping: 1, sisaTanpaToping: 2 },
];

const PENGELUARAN_DATA: PengeluaranItem[] = [
  { id: 'p1', kategori: 'Bahan Baku', keterangan: 'Tepung terigu 25kg', jumlah: 175000 },
  { id: 'p2', kategori: 'Bahan Baku', keterangan: 'Gula pasir 10kg', jumlah: 140000 },
  { id: 'p3', kategori: 'Operasional', keterangan: 'Gas LPG 3kg x 2', jumlah: 44000 },
  { id: 'p4', kategori: 'Gaji', keterangan: 'Gaji harian 2 karyawan', jumlah: 200000 },
];

const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export default function LaporanOutletPage() {
  const [filterUkuran, setFilterUkuran] = useState<'semua' | 'standar' | 'mini'>('semua');
  
  const tanggalHariIni = new Date().toLocaleDateString('id-ID', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    timeZone: 'Asia/Jakarta' 
  });

  // Filter & calculations
  const produkFiltered = filterUkuran === 'semua' ? PRODUK_DATA : PRODUK_DATA.filter(p => p.ukuran === filterUkuran);
  const sum = (arr: ProdukHarian[], fn: (p: ProdukHarian) => number) => arr.reduce((s, p) => s + fn(p), 0);
  
  const totalDiproduksi = sum(produkFiltered, p => p.diproduksi);
  const totalTerjual = sum(produkFiltered, p => p.terjual);
  const totalGagal = sum(produkFiltered, p => p.gagalProduksi);
  const totalBatalBeli = sum(produkFiltered, p => p.batalBeli);
  const totalSisaToping = sum(produkFiltered, p => p.sisaBertoping);
  const totalSisaPolos = sum(produkFiltered, p => p.sisaTanpaToping);
  const pendapatanKotor = sum(produkFiltered, p => p.terjual * p.hargaJual);
  const totalHPP = sum(produkFiltered, p => p.terjual * p.hpp);
  const totalPengeluaran = PENGELUARAN_DATA.reduce((s, p) => s + p.jumlah, 0);
  const labaKotor = pendapatanKotor - totalHPP;
  const labaBersih = pendapatanKotor - totalPengeluaran;
  const successRate = totalDiproduksi > 0 ? (totalTerjual / totalDiproduksi) * 100 : 0;

  const produkSorted = [...produkFiltered].sort((a, b) => b.terjual - a.terjual);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 min-w-0">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Laporan Harian Outlet</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">{tanggalHariIni}</p>
            </div>
            
            {/* Filter */}
            <div className="inline-flex flex-wrap bg-gray-100 rounded-lg p-1 w-full md:w-auto overflow-x-auto">
              {(['semua', 'standar', 'mini'] as const).map(u => (
                <button
                  key={u}
                  onClick={() => setFilterUkuran(u)}
                  className={`px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap flex-1 md:flex-none ${
                    filterUkuran === u
                      ? 'bg-white text-gray-900 shadow'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {u === 'semua' ? 'Semua' : u === 'standar' ? 'Standar' : 'Mini'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-5 md:space-y-6">

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
          {/* Revenue */}
          <div className="bg-white border rounded-lg p-4 sm:p-5 md:p-6">
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" />
                </div>
                <span className="min-w-0 text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight whitespace-normal">
                  Pendapatan
                </span>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">{rp(pendapatanKotor)}</p>
            <p className="text-xs text-gray-500">{totalTerjual} unit terjual</p>
          </div>

          {/* Expenses */}
          <div className="bg-white border rounded-lg p-4 sm:p-5 md:p-6">
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-red-700" />
                </div>
                <span className="min-w-0 text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight whitespace-normal">
                  Pengeluaran
                </span>
            </div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">{rp(totalPengeluaran)}</p>
            <p className="text-xs text-gray-500">{PENGELUARAN_DATA.length} transaksi</p>
          </div>

          {/* Gross Profit */}
          <div className="bg-white border rounded-lg p-4 sm:p-5 md:p-6">
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-amber-700" />
                </div>
                <span className="min-w-0 text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight whitespace-normal">
                  Laba Kotor
                </span>
            </div>
            <p className={`text-lg sm:text-xl md:text-2xl font-bold mb-1 ${labaKotor >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {rp(labaKotor)}
            </p>
            <p className="text-xs text-gray-500">Setelah HPP</p>
          </div>

          {/* Net Profit */}
          <div className="bg-white border rounded-lg p-4 sm:p-5 md:p-6">
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3 min-w-0">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${labaBersih >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <BarChart2 className={`w-4 h-4 sm:w-5 sm:h-5 ${labaBersih >= 0 ? 'text-green-700' : 'text-red-700'}`} />
                </div>
                <span className="min-w-0 text-[11px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight whitespace-normal">
                  Laba Bersih
                </span>
            </div>
            <p className={`text-lg sm:text-xl md:text-2xl font-bold mb-1 ${labaBersih >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
              {rp(labaBersih)}
            </p>
            <p className="text-xs text-gray-500">Setelah semua biaya</p>
          </div>
        </div>

        {/* Production Metrics */}
        <div className="bg-white border rounded-lg">
          <div className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 border-b">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Metrik Produksi & Operasional</h2>
          </div>
          <div className="p-4 sm:p-5 md:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5 md:gap-6">
              {/* Diproduksi */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg mb-2 sm:mb-3">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalDiproduksi}</p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Diproduksi</p>
              </div>
              
              {/* Terjual */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg mb-2 sm:mb-3">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalTerjual}</p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Terjual</p>
              </div>
              
              {/* Gagal Produksi */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg mb-2 sm:mb-3">
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalGagal}</p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Gagal Produksi</p>
              </div>
              
              {/* Batal Beli */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-lg mb-2 sm:mb-3">
                  <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalBatalBeli}</p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Batal Beli</p>
              </div>
              
              {/* Sisa Topping */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg mb-2 sm:mb-3">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalSisaToping}</p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Sisa Topping</p>
              </div>
              
              {/* Sisa Polos */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg mb-2 sm:mb-3">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalSisaPolos}</p>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">Sisa Polos</p>
              </div>
            </div>
            
            {/* Success Rate Bar */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t">
              <div className="flex justify-between items-center mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm font-semibold text-gray-700">Success Rate (Terjual / Diproduksi)</span>
                <span className="text-xs sm:text-sm font-bold text-gray-900">{successRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
                <div
                  className="bg-green-600 h-full transition-all duration-300"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Product Performance Table */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 border-b">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Performa Produk</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] lg:min-w-[640px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Produk
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Diproduksi
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Terjual
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="hidden lg:table-cell px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Profit Margin
                  </th>
                  <th className="hidden xl:table-cell px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Success Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {produkSorted.map((p, idx) => {
                  const revenue = p.terjual * p.hargaJual;
                  const cost = p.terjual * p.hpp;
                  const margin = revenue > 0 ? (((revenue - cost) / revenue) * 100) : 0;
                  const rate = p.diproduksi > 0 ? ((p.terjual / p.diproduksi) * 100) : 0;
                  
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                          <span className="text-xs sm:text-sm font-semibold text-gray-500">#{idx + 1}</span>
                          <span className="min-w-0 truncate text-xs sm:text-sm font-medium text-gray-900">{p.nama}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold rounded-full ${
                          p.ukuran === 'standar' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {p.ukuran}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm text-gray-900 font-medium">
                        {p.diproduksi}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm text-gray-900 font-medium">
                        {p.terjual}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm text-gray-900 font-semibold">
                        {rp(revenue)}
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                        <span className={`text-xs sm:text-sm font-semibold ${
                          margin >= 30 ? 'text-green-600' : margin >= 20 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="hidden xl:table-cell px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                        <span className={`text-xs sm:text-sm font-semibold ${
                          rate >= 80 ? 'text-green-600' : rate >= 60 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {rate.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="px-4 sm:px-5 md:px-6 py-3 sm:py-4 border-b">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Rincian Pengeluaran</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] sm:min-w-[420px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Keterangan
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Jumlah
                  </th>
                  <th className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Persentase
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {PENGELUARAN_DATA.map((item) => {
                  const percentage = (item.jumlah / totalPengeluaran) * 100;
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 sm:px-3 py-0.5 sm:py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                        {item.keterangan}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-semibold text-gray-900">
                        {rp(item.jumlah)}
                      </td>
                      <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                        <span className="text-xs sm:text-sm font-semibold text-gray-600">
                          {percentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={2} className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-gray-900">
                    Total Pengeluaran
                  </td>
                  <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-bold text-gray-900">
                    {rp(totalPengeluaran)}
                  </td>
                  <td className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm font-bold text-gray-900">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
