'use client';

import { useState } from 'react';

type TabType = 'ringkasan' | 'keuangan' | 'produksi' | 'penjualan' | 'stok';
type UkuranDonat = 'standar' | 'mini';

// ══════════════════════════════════════════
// DEMO DATA - Simulasi data lengkap outlet
// ══════════════════════════════════════════

interface ProdukDetail {
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
  tanggal: string;
  kategori: string;
  keterangan: string;
  jumlah: number;
}

interface TransaksiKasir {
  id: string;
  waktu: string;
  kasir: string;
  totalItem: number;
  totalHarga: number;
  metodeBayar: string;
}

// === Data Produk Lengkap (Standar + Mini) ===
const PRODUK_DATA: ProdukDetail[] = [
  // STANDAR
  { id: 's1', nama: 'Donat Gula', ukuran: 'standar', hargaJual: 3000, hpp: 1800, diproduksi: 50, terjual: 42, gagalProduksi: 2, batalBeli: 1, sisaBertoping: 3, sisaTanpaToping: 2 },
  { id: 's2', nama: 'Donat Cokelat', ukuran: 'standar', hargaJual: 4000, hpp: 2300, diproduksi: 60, terjual: 55, gagalProduksi: 1, batalBeli: 0, sisaBertoping: 2, sisaTanpaToping: 2 },
  { id: 's3', nama: 'Donat Keju', ukuran: 'standar', hargaJual: 4500, hpp: 2600, diproduksi: 45, terjual: 38, gagalProduksi: 2, batalBeli: 1, sisaBertoping: 2, sisaTanpaToping: 2 },
  { id: 's4', nama: 'Donat Strawberry', ukuran: 'standar', hargaJual: 4000, hpp: 2400, diproduksi: 40, terjual: 33, gagalProduksi: 1, batalBeli: 2, sisaBertoping: 2, sisaTanpaToping: 2 },
  { id: 's5', nama: 'Donat Matcha', ukuran: 'standar', hargaJual: 5000, hpp: 2800, diproduksi: 35, terjual: 28, gagalProduksi: 3, batalBeli: 1, sisaBertoping: 1, sisaTanpaToping: 2 },
  { id: 's6', nama: 'Donat Oreo', ukuran: 'standar', hargaJual: 5000, hpp: 2900, diproduksi: 30, terjual: 25, gagalProduksi: 1, batalBeli: 0, sisaBertoping: 2, sisaTanpaToping: 2 },
  { id: 's7', nama: 'Donat Tiramisu', ukuran: 'standar', hargaJual: 5500, hpp: 3200, diproduksi: 25, terjual: 18, gagalProduksi: 2, batalBeli: 1, sisaBertoping: 2, sisaTanpaToping: 2 },
  { id: 's8', nama: 'Donat Red Velvet', ukuran: 'standar', hargaJual: 5500, hpp: 3100, diproduksi: 20, terjual: 14, gagalProduksi: 1, batalBeli: 1, sisaBertoping: 2, sisaTanpaToping: 2 },
  { id: 's9', nama: 'Donat Pandan', ukuran: 'standar', hargaJual: 3500, hpp: 2000, diproduksi: 35, terjual: 30, gagalProduksi: 1, batalBeli: 0, sisaBertoping: 2, sisaTanpaToping: 2 },
  { id: 's10', nama: 'Donat Taro', ukuran: 'standar', hargaJual: 4500, hpp: 2500, diproduksi: 15, terjual: 8, gagalProduksi: 2, batalBeli: 1, sisaBertoping: 2, sisaTanpaToping: 2 },
  // MINI
  { id: 'm1', nama: 'Mini Gula', ukuran: 'mini', hargaJual: 1500, hpp: 900, diproduksi: 80, terjual: 72, gagalProduksi: 3, batalBeli: 0, sisaBertoping: 3, sisaTanpaToping: 2 },
  { id: 'm2', nama: 'Mini Cokelat', ukuran: 'mini', hargaJual: 2000, hpp: 1100, diproduksi: 70, terjual: 65, gagalProduksi: 1, batalBeli: 1, sisaBertoping: 1, sisaTanpaToping: 2 },
  { id: 'm3', nama: 'Mini Keju', ukuran: 'mini', hargaJual: 2200, hpp: 1300, diproduksi: 60, terjual: 50, gagalProduksi: 2, batalBeli: 2, sisaBertoping: 4, sisaTanpaToping: 2 },
  { id: 'm4', nama: 'Mini Strawberry', ukuran: 'mini', hargaJual: 2000, hpp: 1200, diproduksi: 50, terjual: 42, gagalProduksi: 2, batalBeli: 1, sisaBertoping: 3, sisaTanpaToping: 2 },
  { id: 'm5', nama: 'Mini Matcha', ukuran: 'mini', hargaJual: 2500, hpp: 1400, diproduksi: 40, terjual: 30, gagalProduksi: 3, batalBeli: 2, sisaBertoping: 3, sisaTanpaToping: 2 },
  { id: 'm6', nama: 'Mini Oreo', ukuran: 'mini', hargaJual: 2500, hpp: 1500, diproduksi: 35, terjual: 28, gagalProduksi: 1, batalBeli: 1, sisaBertoping: 3, sisaTanpaToping: 2 },
];

// === Data Pengeluaran ===
const PENGELUARAN_DATA: PengeluaranItem[] = [
  { id: 'p1', tanggal: '2025-01-15', kategori: 'Bahan Baku', keterangan: 'Tepung terigu 25kg', jumlah: 175000 },
  { id: 'p2', tanggal: '2025-01-15', kategori: 'Bahan Baku', keterangan: 'Gula pasir 10kg', jumlah: 140000 },
  { id: 'p3', tanggal: '2025-01-15', kategori: 'Bahan Baku', keterangan: 'Telur 5 kg', jumlah: 130000 },
  { id: 'p4', tanggal: '2025-01-15', kategori: 'Bahan Baku', keterangan: 'Minyak goreng 5L', jumlah: 85000 },
  { id: 'p5', tanggal: '2025-01-15', kategori: 'Bahan Baku', keterangan: 'Cokelat, Keju, Topping', jumlah: 220000 },
  { id: 'p6', tanggal: '2025-01-15', kategori: 'Operasional', keterangan: 'Gas LPG 3kg x 2', jumlah: 44000 },
  { id: 'p7', tanggal: '2025-01-15', kategori: 'Operasional', keterangan: 'Listrik prorata harian', jumlah: 25000 },
  { id: 'p8', tanggal: '2025-01-15', kategori: 'Packaging', keterangan: 'Box donat & plastik', jumlah: 65000 },
  { id: 'p9', tanggal: '2025-01-15', kategori: 'Gaji', keterangan: 'Gaji harian 2 karyawan', jumlah: 200000 },
  { id: 'p10', tanggal: '2025-01-15', kategori: 'Lain-lain', keterangan: 'Sabun & kebersihan', jumlah: 15000 },
];

// === Data Transaksi Kasir ===
const TRANSAKSI_DATA: TransaksiKasir[] = [
  { id: 't1', waktu: '2025-01-15T08:15:00', kasir: 'Rina', totalItem: 5, totalHarga: 22000, metodeBayar: 'Tunai' },
  { id: 't2', waktu: '2025-01-15T08:32:00', kasir: 'Rina', totalItem: 12, totalHarga: 48000, metodeBayar: 'QRIS' },
  { id: 't3', waktu: '2025-01-15T09:10:00', kasir: 'Rina', totalItem: 3, totalHarga: 13500, metodeBayar: 'Tunai' },
  { id: 't4', waktu: '2025-01-15T09:45:00', kasir: 'Budi', totalItem: 8, totalHarga: 36000, metodeBayar: 'Tunai' },
  { id: 't5', waktu: '2025-01-15T10:20:00', kasir: 'Budi', totalItem: 6, totalHarga: 27000, metodeBayar: 'QRIS' },
  { id: 't6', waktu: '2025-01-15T10:55:00', kasir: 'Rina', totalItem: 15, totalHarga: 67500, metodeBayar: 'Transfer' },
  { id: 't7', waktu: '2025-01-15T11:30:00', kasir: 'Budi', totalItem: 10, totalHarga: 45000, metodeBayar: 'Tunai' },
  { id: 't8', waktu: '2025-01-15T12:15:00', kasir: 'Rina', totalItem: 20, totalHarga: 90000, metodeBayar: 'QRIS' },
  { id: 't9', waktu: '2025-01-15T13:00:00', kasir: 'Budi', totalItem: 7, totalHarga: 31500, metodeBayar: 'Tunai' },
  { id: 't10', waktu: '2025-01-15T14:30:00', kasir: 'Rina', totalItem: 25, totalHarga: 112500, metodeBayar: 'Transfer' },
  { id: 't11', waktu: '2025-01-15T15:10:00', kasir: 'Budi', totalItem: 4, totalHarga: 18000, metodeBayar: 'Tunai' },
  { id: 't12', waktu: '2025-01-15T16:00:00', kasir: 'Rina', totalItem: 18, totalHarga: 81000, metodeBayar: 'QRIS' },
];

// Helper
const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export default function LaporanPage() {
  const [activeTab, setActiveTab] = useState<TabType>('ringkasan');
  const [periodeBulan, setPeriodeBulan] = useState('2025-01');
  const [filterUkuran, setFilterUkuran] = useState<'semua' | 'standar' | 'mini'>('semua');

  // ══════ Kalkulasi Produk ══════
  const filteredProduk = filterUkuran === 'semua' ? PRODUK_DATA : PRODUK_DATA.filter(p => p.ukuran === filterUkuran);
  const produkStandar = PRODUK_DATA.filter(p => p.ukuran === 'standar');
  const produkMini = PRODUK_DATA.filter(p => p.ukuran === 'mini');

  const sum = (arr: ProdukDetail[], key: keyof ProdukDetail) => arr.reduce((s, p) => s + (p[key] as number), 0);

  // Total semua
  const totalDiproduksi = sum(PRODUK_DATA, 'diproduksi');
  const totalTerjual = sum(PRODUK_DATA, 'terjual');
  const totalGagal = sum(PRODUK_DATA, 'gagalProduksi');
  const totalBatal = sum(PRODUK_DATA, 'batalBeli');
  const totalSisaBertoping = sum(PRODUK_DATA, 'sisaBertoping');
  const totalSisaTanpaToping = sum(PRODUK_DATA, 'sisaTanpaToping');

  // Per ukuran
  const stdDiproduksi = sum(produkStandar, 'diproduksi');
  const stdTerjual = sum(produkStandar, 'terjual');
  const stdGagal = sum(produkStandar, 'gagalProduksi');
  const stdBatal = sum(produkStandar, 'batalBeli');
  const stdSisaBertoping = sum(produkStandar, 'sisaBertoping');
  const stdSisaTanpaToping = sum(produkStandar, 'sisaTanpaToping');

  const miniDiproduksi = sum(produkMini, 'diproduksi');
  const miniTerjual = sum(produkMini, 'terjual');
  const miniGagal = sum(produkMini, 'gagalProduksi');
  const miniBatal = sum(produkMini, 'batalBeli');
  const miniSisaBertoping = sum(produkMini, 'sisaBertoping');
  const miniSisaTanpaToping = sum(produkMini, 'sisaTanpaToping');

  // ══════ Kalkulasi Keuangan ══════
  const totalPendapatan = PRODUK_DATA.reduce((s, p) => s + (p.terjual * p.hargaJual), 0);
  const totalHPP = PRODUK_DATA.reduce((s, p) => s + (p.terjual * p.hpp), 0);
  const totalPengeluaran = PENGELUARAN_DATA.reduce((s, p) => s + p.jumlah, 0);
  const labaKotor = totalPendapatan - totalHPP;
  const labaBersih = totalPendapatan - totalPengeluaran;
  const marginKeuntungan = totalPendapatan > 0 ? Math.round((labaBersih / totalPendapatan) * 100) : 0;

  const pendapatanStandar = produkStandar.reduce((s, p) => s + (p.terjual * p.hargaJual), 0);
  const pendapatanMini = produkMini.reduce((s, p) => s + (p.terjual * p.hargaJual), 0);

  // Per kasir
  const kasirMap = new Map<string, { trx: number; total: number }>();
  TRANSAKSI_DATA.forEach(t => {
    const prev = kasirMap.get(t.kasir) || { trx: 0, total: 0 };
    kasirMap.set(t.kasir, { trx: prev.trx + 1, total: prev.total + t.totalHarga });
  });

  // Per metode bayar
  const metodeMap = new Map<string, { trx: number; total: number }>();
  TRANSAKSI_DATA.forEach(t => {
    const prev = metodeMap.get(t.metodeBayar) || { trx: 0, total: 0 };
    metodeMap.set(t.metodeBayar, { trx: prev.trx + 1, total: prev.total + t.totalHarga });
  });

  // Per kategori pengeluaran
  const kategoriMap = new Map<string, number>();
  PENGELUARAN_DATA.forEach(p => {
    kategoriMap.set(p.kategori, (kategoriMap.get(p.kategori) || 0) + p.jumlah);
  });

  // ══════ Ranking Produk ══════
  const produkSorted = [...filteredProduk].sort((a, b) => b.terjual - a.terjual);
  const topSeller = produkSorted[0];
  const worstSeller = produkSorted[produkSorted.length - 1];
  const maxTerjual = topSeller?.terjual || 1;

  // ══════ Tabs ══════
  const tabs: { key: TabType; label: string }[] = [
    { key: 'ringkasan', label: '📊 Ringkasan' },
    { key: 'keuangan', label: '💰 Keuangan' },
    { key: 'produksi', label: '🏭 Produksi' },
    { key: 'penjualan', label: '🏆 Penjualan' },
    { key: 'stok', label: '📦 Stok' },
  ];

  return (
    <div className="p-4 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📈 Laporan Outlet</h2>
          <p className="text-sm text-gray-500">Laporan lengkap keuangan, produksi, penjualan & stok</p>
        </div>
        <input type="month" value={periodeBulan} onChange={(e) => setPeriodeBulan(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-amber-500" />
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* TAB: RINGKASAN - Overview semua            */}
      {/* ══════════════════════════════════════════ */}

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs text-gray-500">💰 Total Pendapatan</p>
          <p className="text-xl font-bold text-green-600">{rp(totalPendapatan)}</p>
          <div className="flex gap-2 mt-1">
            <span className="text-[10px] text-amber-600">Std: {rp(pendapatanStandar)}</span>
            <span className="text-[10px] text-pink-600">Mini: {rp(pendapatanMini)}</span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs text-gray-500">💸 Total Pengeluaran</p>
          <p className="text-xl font-bold text-red-600">{rp(totalPengeluaran)}</p>
          <p className="text-[10px] text-gray-400">{PENGELUARAN_DATA.length} item pengeluaran</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs text-gray-500">📈 Keuntungan Bersih</p>
          <p className={`text-xl font-bold ${labaBersih >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{rp(labaBersih)}</p>
          <p className="text-[10px] text-gray-400">Margin: {marginKeuntungan}%</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-xs text-gray-500">🍩 Total Terjual</p>
          <p className="text-xl font-bold text-gray-900">{totalTerjual} pcs</p>
          <div className="flex gap-2 mt-1">
            <span className="text-[10px] text-amber-600">Std: {stdTerjual}</span>
            <span className="text-[10px] text-pink-600">Mini: {miniTerjual}</span>
          </div>
        </div>
      </div>

      {/* Produksi + Stok ringkas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500">Diproduksi</p>
          <p className="text-lg font-bold text-blue-600">{totalDiproduksi}</p>
          <p className="text-[10px] text-gray-400">Std:{stdDiproduksi} | Mini:{miniDiproduksi}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500">Terjual</p>
          <p className="text-lg font-bold text-green-600">{totalTerjual}</p>
          <p className="text-[10px] text-gray-400">Std:{stdTerjual} | Mini:{miniTerjual}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500">Gagal Produksi</p>
          <p className="text-lg font-bold text-red-600">{totalGagal}</p>
          <p className="text-[10px] text-gray-400">Std:{stdGagal} | Mini:{miniGagal}</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500">Batal Beli</p>
          <p className="text-lg font-bold text-purple-600">{totalBatal}</p>
          <p className="text-[10px] text-gray-400">Std:{stdBatal} | Mini:{miniBatal}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500">Sisa Tanpa Toping</p>
          <p className="text-lg font-bold text-amber-600">{totalSisaTanpaToping}</p>
          <p className="text-[10px] text-gray-400">Std:{stdSisaTanpaToping} | Mini:{miniSisaTanpaToping}</p>
        </div>
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-gray-500">Sisa Bertoping</p>
          <p className="text-lg font-bold text-cyan-600">{totalSisaBertoping}</p>
          <p className="text-[10px] text-gray-400">Std:{stdSisaBertoping} | Mini:{miniSisaBertoping}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === tab.key ? 'text-amber-600 border-b-2 border-amber-500 bg-amber-50/50' : 'text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">

          {/* ═══════════════════════════════════════ */}
          {/* TAB: RINGKASAN                          */}
          {/* ═══════════════════════════════════════ */}
          {activeTab === 'ringkasan' && (
            <div className="space-y-6">
              {/* Quick Insight */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5">
                <h3 className="font-bold text-gray-900 mb-3">⚡ Insight Cepat</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-500">✅</span>
                    <span>Produk paling laris: <strong className="text-green-700">{topSeller?.nama}</strong> ({topSeller?.terjual} terjual)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-red-500">⚠️</span>
                    <span>Produk kurang laku: <strong className="text-red-700">{worstSeller?.nama}</strong> ({worstSeller?.terjual} terjual)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-500">📊</span>
                    <span>Tingkat keberhasilan produksi: <strong className="text-blue-700">{totalDiproduksi > 0 ? Math.round(((totalDiproduksi - totalGagal) / totalDiproduksi) * 100) : 0}%</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-amber-500">💡</span>
                    <span>Rata-rata per transaksi: <strong className="text-amber-700">{rp(Math.round(TRANSAKSI_DATA.reduce((s, t) => s + t.totalHarga, 0) / TRANSAKSI_DATA.length))}</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-purple-500">🏪</span>
                    <span>Total transaksi: <strong className="text-purple-700">{TRANSAKSI_DATA.length} transaksi</strong></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-cyan-500">📦</span>
                    <span>Total sisa stok: <strong className="text-cyan-700">{totalSisaBertoping + totalSisaTanpaToping} pcs</strong> (bertoping: {totalSisaBertoping}, polos: {totalSisaTanpaToping})</span>
                  </div>
                </div>
              </div>

              {/* Perbandingan Standar vs Mini */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">🍩 vs 🧁 Perbandingan Standar vs Mini</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500">Metrik</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-amber-600">🍩 Standar</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-pink-600">🧁 Mini</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700">Diproduksi</td>
                        <td className="px-4 py-2 text-right font-bold text-amber-600">{stdDiproduksi}</td>
                        <td className="px-4 py-2 text-right font-bold text-pink-600">{miniDiproduksi}</td>
                        <td className="px-4 py-2 text-right font-bold">{totalDiproduksi}</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700">Terjual</td>
                        <td className="px-4 py-2 text-right font-bold text-amber-600">{stdTerjual}</td>
                        <td className="px-4 py-2 text-right font-bold text-pink-600">{miniTerjual}</td>
                        <td className="px-4 py-2 text-right font-bold">{totalTerjual}</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700">Gagal Produksi</td>
                        <td className="px-4 py-2 text-right font-bold text-amber-600">{stdGagal}</td>
                        <td className="px-4 py-2 text-right font-bold text-pink-600">{miniGagal}</td>
                        <td className="px-4 py-2 text-right font-bold">{totalGagal}</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700">Batal Beli</td>
                        <td className="px-4 py-2 text-right font-bold text-amber-600">{stdBatal}</td>
                        <td className="px-4 py-2 text-right font-bold text-pink-600">{miniBatal}</td>
                        <td className="px-4 py-2 text-right font-bold">{totalBatal}</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700">Sisa Tanpa Toping</td>
                        <td className="px-4 py-2 text-right font-bold text-amber-600">{stdSisaTanpaToping}</td>
                        <td className="px-4 py-2 text-right font-bold text-pink-600">{miniSisaTanpaToping}</td>
                        <td className="px-4 py-2 text-right font-bold">{totalSisaTanpaToping}</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700">Sisa Bertoping</td>
                        <td className="px-4 py-2 text-right font-bold text-amber-600">{stdSisaBertoping}</td>
                        <td className="px-4 py-2 text-right font-bold text-pink-600">{miniSisaBertoping}</td>
                        <td className="px-4 py-2 text-right font-bold">{totalSisaBertoping}</td>
                      </tr>
                      <tr className="bg-green-50 hover:bg-green-100">
                        <td className="px-4 py-2 font-bold text-gray-900">Pendapatan</td>
                        <td className="px-4 py-2 text-right font-bold text-amber-600">{rp(pendapatanStandar)}</td>
                        <td className="px-4 py-2 text-right font-bold text-pink-600">{rp(pendapatanMini)}</td>
                        <td className="px-4 py-2 text-right font-bold text-green-700">{rp(totalPendapatan)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top 5 Paling Laris */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">🏆 Top 5 Produk Paling Laris</h3>
                <div className="space-y-2">
                  {[...PRODUK_DATA].sort((a, b) => b.terjual - a.terjual).slice(0, 5).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                      <span className={`text-lg font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-300'}`}>
                        #{i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-sm">{p.nama}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.ukuran === 'mini' ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'}`}>
                            {p.ukuran === 'mini' ? 'Mini' : 'Standar'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(p.terjual / ([...PRODUK_DATA].sort((a, b) => b.terjual - a.terjual)[0]?.terjual || 1)) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-bold text-green-600 whitespace-nowrap">{p.terjual} pcs</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{rp(p.terjual * p.hargaJual)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════ */}
          {/* TAB: KEUANGAN                           */}
          {/* ═══════════════════════════════════════ */}
          {activeTab === 'keuangan' && (
            <div className="space-y-6">
              {/* Kartu Keuangan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                  <p className="text-sm text-gray-600">💰 Total Pendapatan</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{rp(totalPendapatan)}</p>
                  <p className="text-xs text-gray-500 mt-1">{TRANSAKSI_DATA.length} transaksi</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                  <p className="text-sm text-gray-600">💸 Total Pengeluaran</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">{rp(totalPengeluaran)}</p>
                  <p className="text-xs text-gray-500 mt-1">{PENGELUARAN_DATA.length} item</p>
                </div>
                <div className={`${labaBersih >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border rounded-xl p-5 text-center`}>
                  <p className="text-sm text-gray-600">📈 Keuntungan Bersih</p>
                  <p className={`text-2xl font-bold mt-1 ${labaBersih >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{rp(labaBersih)}</p>
                  <p className="text-xs text-gray-500 mt-1">Margin: {marginKeuntungan}%</p>
                </div>
              </div>

              {/* Detail Keuntungan */}
              <div className="bg-gray-50 rounded-xl p-5 border">
                <h3 className="font-bold text-gray-900 mb-3">📋 Rincian Perhitungan Keuntungan</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Total Pendapatan (Penjualan)</span>
                    <span className="font-bold text-green-600">{rp(totalPendapatan)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">HPP (Harga Pokok Penjualan)</span>
                    <span className="font-bold text-gray-600">- {rp(totalHPP)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t pt-2">
                    <span className="text-gray-900 font-bold">Laba Kotor</span>
                    <span className="font-bold text-blue-600">{rp(labaKotor)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-600">Total Pengeluaran Operasional</span>
                    <span className="font-bold text-red-600">- {rp(totalPengeluaran)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t-2 border-double border-gray-400 mt-2">
                    <span className="text-gray-900 font-bold text-base">Keuntungan Bersih</span>
                    <span className={`font-bold text-base ${labaBersih >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{rp(labaBersih)}</span>
                  </div>
                </div>
              </div>

              {/* Pendapatan per Kasir */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">👤 Pendapatan per Kasir</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from(kasirMap.entries()).map(([kasir, data]) => (
                    <div key={kasir} className="bg-white border rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{kasir}</p>
                        <p className="text-xs text-gray-500">{data.trx} transaksi</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{rp(data.total)}</p>
                        <p className="text-xs text-gray-400">rata-rata {rp(Math.round(data.total / data.trx))}/trx</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Metode Pembayaran */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">💳 Per Metode Pembayaran</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Array.from(metodeMap.entries()).map(([metode, data]) => (
                    <div key={metode} className="bg-white border rounded-xl p-4 text-center">
                      <p className="text-2xl mb-1">{metode === 'Tunai' ? '💵' : metode === 'QRIS' ? '📱' : '🏦'}</p>
                      <p className="font-bold text-gray-900">{metode}</p>
                      <p className="text-lg font-bold text-green-600">{rp(data.total)}</p>
                      <p className="text-xs text-gray-500">{data.trx} transaksi</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Daftar Pengeluaran */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">💸 Rincian Pengeluaran</h3>
                {/* Per kategori summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                  {Array.from(kategoriMap.entries()).map(([kat, total]) => (
                    <div key={kat} className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">{kat}</p>
                      <p className="text-sm font-bold text-red-600">{rp(total)}</p>
                    </div>
                  ))}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Kategori</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Keterangan</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {PENGELUARAN_DATA.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100">{p.kategori}</span></td>
                          <td className="px-3 py-2 text-gray-700">{p.keterangan}</td>
                          <td className="px-3 py-2 text-right font-bold text-red-600">{rp(p.jumlah)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-red-50 font-bold">
                        <td colSpan={2} className="px-3 py-3 text-gray-900">Total Pengeluaran</td>
                        <td className="px-3 py-3 text-right text-red-700">{rp(totalPengeluaran)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════ */}
          {/* TAB: PRODUKSI                           */}
          {/* ═══════════════════════════════════════ */}
          {activeTab === 'produksi' && (
            <div className="space-y-6">
              {/* Filter */}
              <div className="flex gap-2">
                {(['semua', 'standar', 'mini'] as const).map(u => (
                  <button key={u} onClick={() => setFilterUkuran(u)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${filterUkuran === u
                      ? u === 'mini' ? 'bg-pink-500 text-white border-pink-500' : u === 'standar' ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
                    {u === 'semua' ? '🍩 Semua' : u === 'standar' ? '🍩 Standar' : '🧁 Mini'}
                  </button>
                ))}
              </div>

              {/* Summary produksi */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500">Total Diproduksi</p>
                  <p className="text-2xl font-bold text-blue-600">{sum(filteredProduk, 'diproduksi')}</p>
                  <p className="text-xs text-gray-400">donat polos</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500">Gagal Produksi</p>
                  <p className="text-2xl font-bold text-red-600">{sum(filteredProduk, 'gagalProduksi')}</p>
                  <p className="text-xs text-gray-400">{totalDiproduksi > 0 ? Math.round((sum(filteredProduk, 'gagalProduksi') / sum(filteredProduk, 'diproduksi')) * 100) : 0}% gagal</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500">Berhasil Diproduksi</p>
                  <p className="text-2xl font-bold text-green-600">{sum(filteredProduk, 'diproduksi') - sum(filteredProduk, 'gagalProduksi')}</p>
                  <p className="text-xs text-gray-400">{totalDiproduksi > 0 ? Math.round(((sum(filteredProduk, 'diproduksi') - sum(filteredProduk, 'gagalProduksi')) / sum(filteredProduk, 'diproduksi')) * 100) : 0}% berhasil</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500">Batal Beli</p>
                  <p className="text-2xl font-bold text-purple-600">{sum(filteredProduk, 'batalBeli')}</p>
                  <p className="text-xs text-gray-400">setelah ditoping</p>
                </div>
              </div>

              {/* Tabel detail per produk */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">📋 Detail Produksi per Produk</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Produk</th>
                        <th className="px-3 py-2 text-center text-xs font-bold text-gray-500">Ukuran</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-blue-500">Diproduksi</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-red-500">Gagal</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-green-500">Berhasil</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">% Berhasil</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredProduk.map(p => {
                        const berhasil = p.diproduksi - p.gagalProduksi;
                        const rate = p.diproduksi > 0 ? Math.round((berhasil / p.diproduksi) * 100) : 0;
                        return (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-900">{p.nama}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.ukuran === 'mini' ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'}`}>
                                {p.ukuran === 'mini' ? 'Mini' : 'Standar'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-blue-600">{p.diproduksi}</td>
                            <td className="px-3 py-2 text-right font-bold text-red-600">{p.gagalProduksi}</td>
                            <td className="px-3 py-2 text-right font-bold text-green-600">{berhasil}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <div className="w-12 bg-gray-200 rounded-full h-1.5">
                                  <div className={`h-1.5 rounded-full ${rate >= 90 ? 'bg-green-500' : rate >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
                                </div>
                                <span className="text-xs font-bold text-gray-600">{rate}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-bold">
                        <td className="px-3 py-3 text-gray-900">TOTAL</td>
                        <td></td>
                        <td className="px-3 py-3 text-right text-blue-700">{sum(filteredProduk, 'diproduksi')}</td>
                        <td className="px-3 py-3 text-right text-red-700">{sum(filteredProduk, 'gagalProduksi')}</td>
                        <td className="px-3 py-3 text-right text-green-700">{sum(filteredProduk, 'diproduksi') - sum(filteredProduk, 'gagalProduksi')}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════ */}
          {/* TAB: PENJUALAN                          */}
          {/* ═══════════════════════════════════════ */}
          {activeTab === 'penjualan' && (
            <div className="space-y-6">
              {/* Filter */}
              <div className="flex gap-2">
                {(['semua', 'standar', 'mini'] as const).map(u => (
                  <button key={u} onClick={() => setFilterUkuran(u)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${filterUkuran === u
                      ? u === 'mini' ? 'bg-pink-500 text-white border-pink-500' : u === 'standar' ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
                    {u === 'semua' ? '🍩 Semua' : u === 'standar' ? '🍩 Standar' : '🧁 Mini'}
                  </button>
                ))}
              </div>

              {/* Ranking Penjualan */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">🏆 Ranking Penjualan Produk (Terlaris → Tidak Laris)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-center text-xs font-bold text-gray-500 w-10">#</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Produk</th>
                        <th className="px-3 py-2 text-center text-xs font-bold text-gray-500">Ukuran</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Terjual</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Grafik</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Harga</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Pendapatan</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Laba/pcs</th>
                        <th className="px-3 py-2 text-center text-xs font-bold text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {produkSorted.map((p, i) => {
                        const pendapatan = p.terjual * p.hargaJual;
                        const labaPcs = p.hargaJual - p.hpp;
                        const barWidth = (p.terjual / maxTerjual) * 100;
                        const isTop = i < 3;
                        const isBottom = i >= produkSorted.length - 2;
                        return (
                          <tr key={p.id} className={`hover:bg-gray-50 ${isTop ? 'bg-green-50/50' : isBottom ? 'bg-red-50/30' : ''}`}>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-sm font-bold ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-700' : 'text-gray-300'}`}>
                                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-bold text-gray-900">{p.nama}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.ukuran === 'mini' ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'}`}>
                                {p.ukuran === 'mini' ? 'Mini' : 'Std'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-green-600">{p.terjual}</td>
                            <td className="px-3 py-2">
                              <div className="w-full bg-gray-200 rounded-full h-2 min-w-[60px]">
                                <div className={`h-2 rounded-full ${isTop ? 'bg-green-500' : isBottom ? 'bg-red-400' : 'bg-blue-400'}`} style={{ width: `${barWidth}%` }} />
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">{rp(p.hargaJual)}</td>
                            <td className="px-3 py-2 text-right font-bold text-green-700">{rp(pendapatan)}</td>
                            <td className="px-3 py-2 text-right text-gray-600">{rp(labaPcs)}</td>
                            <td className="px-3 py-2 text-center">
                              {isTop ? <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">🔥 Laris</span>
                                : isBottom ? <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">📉 Kurang</span>
                                : <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Normal</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-bold">
                        <td></td>
                        <td className="px-3 py-3 text-gray-900">TOTAL</td>
                        <td></td>
                        <td className="px-3 py-3 text-right text-green-700">{sum(filteredProduk, 'terjual')}</td>
                        <td></td>
                        <td></td>
                        <td className="px-3 py-3 text-right text-green-700">{rp(filteredProduk.reduce((s, p) => s + p.terjual * p.hargaJual, 0))}</td>
                        <td></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Top & Bottom comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <h4 className="font-bold text-green-800 mb-2">🔥 Paling Laris</h4>
                  {produkSorted.slice(0, 3).map((p, i) => (
                    <div key={p.id} className="flex justify-between items-center py-1 text-sm">
                      <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {p.nama} <span className="text-xs text-gray-400">({p.ukuran})</span></span>
                      <span className="font-bold text-green-700">{p.terjual} pcs</span>
                    </div>
                  ))}
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <h4 className="font-bold text-red-800 mb-2">📉 Kurang Laku</h4>
                  {produkSorted.slice(-3).reverse().map((p, i) => (
                    <div key={p.id} className="flex justify-between items-center py-1 text-sm">
                      <span>⚠️ {p.nama} <span className="text-xs text-gray-400">({p.ukuran})</span></span>
                      <span className="font-bold text-red-700">{p.terjual} pcs</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Riwayat Transaksi */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">🧾 Riwayat Transaksi Hari Ini</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Waktu</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Kasir</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Item</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Metode</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {TRANSAKSI_DATA.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-600">{new Date(t.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{t.kasir}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{t.totalItem}</td>
                          <td className="px-3 py-2"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100">{t.metodeBayar}</span></td>
                          <td className="px-3 py-2 text-right font-bold text-green-600">{rp(t.totalHarga)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-green-50 font-bold">
                        <td colSpan={2} className="px-3 py-3 text-gray-900">TOTAL</td>
                        <td className="px-3 py-3 text-right text-gray-700">{TRANSAKSI_DATA.reduce((s, t) => s + t.totalItem, 0)}</td>
                        <td></td>
                        <td className="px-3 py-3 text-right text-green-700">{rp(TRANSAKSI_DATA.reduce((s, t) => s + t.totalHarga, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════ */}
          {/* TAB: STOK                               */}
          {/* ═══════════════════════════════════════ */}
          {activeTab === 'stok' && (
            <div className="space-y-6">
              {/* Filter */}
              <div className="flex gap-2">
                {(['semua', 'standar', 'mini'] as const).map(u => (
                  <button key={u} onClick={() => setFilterUkuran(u)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${filterUkuran === u
                      ? u === 'mini' ? 'bg-pink-500 text-white border-pink-500' : u === 'standar' ? 'bg-amber-500 text-white border-amber-500' : 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}>
                    {u === 'semua' ? '🍩 Semua' : u === 'standar' ? '🍩 Standar' : '🧁 Mini'}
                  </button>
                ))}
              </div>

              {/* Stok summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500">🫓 Sisa Tanpa Toping</p>
                  <p className="text-2xl font-bold text-amber-600">{sum(filteredProduk, 'sisaTanpaToping')}</p>
                  <p className="text-xs text-gray-400">donat polos belum ditoping</p>
                </div>
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500">🍩 Sisa Bertoping</p>
                  <p className="text-2xl font-bold text-cyan-600">{sum(filteredProduk, 'sisaBertoping')}</p>
                  <p className="text-xs text-gray-400">sudah ditoping, belum terjual</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500">🚫 Batal Beli</p>
                  <p className="text-2xl font-bold text-purple-600">{sum(filteredProduk, 'batalBeli')}</p>
                  <p className="text-xs text-gray-400">donat bertoping dikembalikan</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500">📦 Total Sisa</p>
                  <p className="text-2xl font-bold text-gray-900">{sum(filteredProduk, 'sisaTanpaToping') + sum(filteredProduk, 'sisaBertoping')}</p>
                  <p className="text-xs text-gray-400">semua stok tersisa</p>
                </div>
              </div>

              {/* Tabel stok per produk */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">📋 Detail Stok per Produk</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Produk</th>
                        <th className="px-3 py-2 text-center text-xs font-bold text-gray-500">Ukuran</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-blue-500">Diproduksi</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-green-500">Terjual</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-red-500">Gagal</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-purple-500">Batal</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-amber-500">Sisa Polos</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-cyan-500">Sisa Toping</th>
                        <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Total Sisa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredProduk.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{p.nama}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.ukuran === 'mini' ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'}`}>
                              {p.ukuran === 'mini' ? 'Mini' : 'Std'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-blue-600 font-bold">{p.diproduksi}</td>
                          <td className="px-3 py-2 text-right text-green-600 font-bold">{p.terjual}</td>
                          <td className="px-3 py-2 text-right text-red-600 font-bold">{p.gagalProduksi}</td>
                          <td className="px-3 py-2 text-right text-purple-600 font-bold">{p.batalBeli}</td>
                          <td className="px-3 py-2 text-right text-amber-600 font-bold">{p.sisaTanpaToping}</td>
                          <td className="px-3 py-2 text-right text-cyan-600 font-bold">{p.sisaBertoping}</td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">{p.sisaTanpaToping + p.sisaBertoping}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-bold">
                        <td className="px-3 py-3 text-gray-900">TOTAL</td>
                        <td></td>
                        <td className="px-3 py-3 text-right text-blue-700">{sum(filteredProduk, 'diproduksi')}</td>
                        <td className="px-3 py-3 text-right text-green-700">{sum(filteredProduk, 'terjual')}</td>
                        <td className="px-3 py-3 text-right text-red-700">{sum(filteredProduk, 'gagalProduksi')}</td>
                        <td className="px-3 py-3 text-right text-purple-700">{sum(filteredProduk, 'batalBeli')}</td>
                        <td className="px-3 py-3 text-right text-amber-700">{sum(filteredProduk, 'sisaTanpaToping')}</td>
                        <td className="px-3 py-3 text-right text-cyan-700">{sum(filteredProduk, 'sisaBertoping')}</td>
                        <td className="px-3 py-3 text-right text-gray-900">{sum(filteredProduk, 'sisaTanpaToping') + sum(filteredProduk, 'sisaBertoping')}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Alur Donat Visual */}
              <div className="bg-gray-50 rounded-xl p-5 border">
                <h3 className="font-bold text-gray-900 mb-3">🔄 Alur Donat</h3>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">Diproduksi: {sum(filteredProduk, 'diproduksi')}</span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">Gagal: -{sum(filteredProduk, 'gagalProduksi')}</span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">Terjual: {sum(filteredProduk, 'terjual')}</span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">Batal: {sum(filteredProduk, 'batalBeli')}</span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold">Sisa Polos: {sum(filteredProduk, 'sisaTanpaToping')}</span>
                  <span className="text-gray-400">+</span>
                  <span className="bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full font-bold">Sisa Toping: {sum(filteredProduk, 'sisaBertoping')}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
