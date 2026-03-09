'use client';

import { useState } from 'react';

type UkuranDonat = 'standar' | 'mini';

// ══════════════════════════════════════════
// DEMO DATA - Laporan Harian Outlet
// ══════════════════════════════════════════

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

interface TransaksiKasir {
  id: string;
  waktu: string;
  kasir: string;
  namaPelanggan: string;
  totalItem: number;
  totalHarga: number;
  metodeBayar: string;
}

// === Data Produk Hari Ini (Standar + Mini) ===
const PRODUK_DATA: ProdukHarian[] = [
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
  { id: 'm1', nama: 'Mini Gula', ukuran: 'mini', hargaJual: 1500, hpp: 900, diproduksi: 80, terjual: 72, gagalProduksi: 3, batalBeli: 0, sisaBertoping: 3, sisaTanpaToping: 2 },
  { id: 'm2', nama: 'Mini Cokelat', ukuran: 'mini', hargaJual: 2000, hpp: 1100, diproduksi: 70, terjual: 65, gagalProduksi: 1, batalBeli: 1, sisaBertoping: 1, sisaTanpaToping: 2 },
  { id: 'm3', nama: 'Mini Keju', ukuran: 'mini', hargaJual: 2200, hpp: 1300, diproduksi: 60, terjual: 50, gagalProduksi: 2, batalBeli: 2, sisaBertoping: 4, sisaTanpaToping: 2 },
  { id: 'm4', nama: 'Mini Strawberry', ukuran: 'mini', hargaJual: 2000, hpp: 1200, diproduksi: 50, terjual: 42, gagalProduksi: 2, batalBeli: 1, sisaBertoping: 3, sisaTanpaToping: 2 },
  { id: 'm5', nama: 'Mini Matcha', ukuran: 'mini', hargaJual: 2500, hpp: 1400, diproduksi: 40, terjual: 30, gagalProduksi: 3, batalBeli: 2, sisaBertoping: 3, sisaTanpaToping: 2 },
  { id: 'm6', nama: 'Mini Oreo', ukuran: 'mini', hargaJual: 2500, hpp: 1500, diproduksi: 35, terjual: 28, gagalProduksi: 1, batalBeli: 1, sisaBertoping: 3, sisaTanpaToping: 2 },
];

const PENGELUARAN_DATA: PengeluaranItem[] = [
  { id: 'p1', kategori: 'Bahan Baku', keterangan: 'Tepung terigu 25kg', jumlah: 175000 },
  { id: 'p2', kategori: 'Bahan Baku', keterangan: 'Gula pasir 10kg', jumlah: 140000 },
  { id: 'p3', kategori: 'Bahan Baku', keterangan: 'Telur 5 kg', jumlah: 130000 },
  { id: 'p4', kategori: 'Bahan Baku', keterangan: 'Minyak goreng 5L', jumlah: 85000 },
  { id: 'p5', kategori: 'Bahan Baku', keterangan: 'Cokelat, Keju, Topping', jumlah: 220000 },
  { id: 'p6', kategori: 'Operasional', keterangan: 'Gas LPG 3kg x 2', jumlah: 44000 },
  { id: 'p7', kategori: 'Operasional', keterangan: 'Listrik prorata harian', jumlah: 25000 },
  { id: 'p8', kategori: 'Packaging', keterangan: 'Box donat & plastik', jumlah: 65000 },
  { id: 'p9', kategori: 'Gaji', keterangan: 'Gaji harian 2 karyawan', jumlah: 200000 },
  { id: 'p10', kategori: 'Lain-lain', keterangan: 'Sabun & kebersihan', jumlah: 15000 },
];

const TRANSAKSI_DATA: TransaksiKasir[] = [
  { id: 't1', waktu: '2025-01-15T08:15:00', kasir: 'Rina', namaPelanggan: 'Budi', totalItem: 5, totalHarga: 22000, metodeBayar: 'Tunai' },
  { id: 't2', waktu: '2025-01-15T08:32:00', kasir: 'Rina', namaPelanggan: 'Sari', totalItem: 12, totalHarga: 48000, metodeBayar: 'QRIS' },
  { id: 't3', waktu: '2025-01-15T09:10:00', kasir: 'Rina', namaPelanggan: 'Umum', totalItem: 3, totalHarga: 13500, metodeBayar: 'Tunai' },
  { id: 't4', waktu: '2025-01-15T09:45:00', kasir: 'Budi', namaPelanggan: 'Dewi', totalItem: 8, totalHarga: 36000, metodeBayar: 'Tunai' },
  { id: 't5', waktu: '2025-01-15T10:20:00', kasir: 'Budi', namaPelanggan: 'Anto', totalItem: 6, totalHarga: 27000, metodeBayar: 'QRIS' },
  { id: 't6', waktu: '2025-01-15T10:55:00', kasir: 'Rina', namaPelanggan: 'PT Maju Jaya', totalItem: 15, totalHarga: 67500, metodeBayar: 'Transfer' },
  { id: 't7', waktu: '2025-01-15T11:30:00', kasir: 'Budi', namaPelanggan: 'Umum', totalItem: 10, totalHarga: 45000, metodeBayar: 'Tunai' },
  { id: 't8', waktu: '2025-01-15T12:15:00', kasir: 'Rina', namaPelanggan: 'Lia', totalItem: 20, totalHarga: 90000, metodeBayar: 'QRIS' },
  { id: 't9', waktu: '2025-01-15T13:00:00', kasir: 'Budi', namaPelanggan: 'Rudi', totalItem: 7, totalHarga: 31500, metodeBayar: 'Tunai' },
  { id: 't10', waktu: '2025-01-15T14:30:00', kasir: 'Rina', namaPelanggan: 'Kantor Kelurahan', totalItem: 25, totalHarga: 112500, metodeBayar: 'Transfer' },
  { id: 't11', waktu: '2025-01-15T15:10:00', kasir: 'Budi', namaPelanggan: 'Umum', totalItem: 4, totalHarga: 18000, metodeBayar: 'Tunai' },
  { id: 't12', waktu: '2025-01-15T16:00:00', kasir: 'Rina', namaPelanggan: 'Wati', totalItem: 18, totalHarga: 81000, metodeBayar: 'QRIS' },
];

const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export default function LaporanOutletPage() {
  const [filterUkuran, setFilterUkuran] = useState<'semua' | 'standar' | 'mini'>('semua');
  const tanggalHariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── Filter produk berdasarkan ukuran ──
  const produkFiltered = filterUkuran === 'semua'
    ? PRODUK_DATA
    : PRODUK_DATA.filter(p => p.ukuran === filterUkuran);

  const produkStandar = PRODUK_DATA.filter(p => p.ukuran === 'standar');
  const produkMini = PRODUK_DATA.filter(p => p.ukuran === 'mini');

  // ── Kalkulasi utama ──
  const sum = (arr: ProdukHarian[], fn: (p: ProdukHarian) => number) => arr.reduce((s, p) => s + fn(p), 0);
  const totalDiproduksi = sum(produkFiltered, p => p.diproduksi);
  const totalTerjual = sum(produkFiltered, p => p.terjual);
  const totalGagal = sum(produkFiltered, p => p.gagalProduksi);
  const totalBatalBeli = sum(produkFiltered, p => p.batalBeli);
  const totalSisaBertoping = sum(produkFiltered, p => p.sisaBertoping);
  const totalSisaTanpaToping = sum(produkFiltered, p => p.sisaTanpaToping);

  const pendapatanKotor = sum(produkFiltered, p => p.terjual * p.hargaJual);
  const totalHPP = sum(produkFiltered, p => p.terjual * p.hpp);
  const totalPengeluaran = PENGELUARAN_DATA.reduce((s, p) => s + p.jumlah, 0);
  const labaKotor = pendapatanKotor - totalHPP;
  const labaBersih = pendapatanKotor - totalPengeluaran;

  // ── Per kasir ──
  const kasirList = [...new Set(TRANSAKSI_DATA.map(t => t.kasir))];
  const pendapatanPerKasir = kasirList.map(k => {
    const txs = TRANSAKSI_DATA.filter(t => t.kasir === k);
    return { kasir: k, jumlahTrx: txs.length, totalItem: txs.reduce((s, t) => s + t.totalItem, 0), totalHarga: txs.reduce((s, t) => s + t.totalHarga, 0) };
  });

  // ── Per metode bayar ──
  const metodeList = [...new Set(TRANSAKSI_DATA.map(t => t.metodeBayar))];
  const pendapatanPerMetode = metodeList.map(m => {
    const txs = TRANSAKSI_DATA.filter(t => t.metodeBayar === m);
    return { metode: m, jumlahTrx: txs.length, total: txs.reduce((s, t) => s + t.totalHarga, 0) };
  });

  // ── Ranking produk ──
  const produkSorted = [...produkFiltered].sort((a, b) => b.terjual - a.terjual);
  const top3 = produkSorted.slice(0, 3);
  const bottom3 = produkSorted.slice(-3).reverse();

  // ── Pengeluaran per kategori ──
  const kategoriList = [...new Set(PENGELUARAN_DATA.map(p => p.kategori))];
  const pengeluaranPerKategori = kategoriList.map(k => {
    const items = PENGELUARAN_DATA.filter(p => p.kategori === k);
    return { kategori: k, items, total: items.reduce((s, i) => s + i.jumlah, 0) };
  });

  const statusBadge = (terjual: number) => {
    if (terjual >= 50) return <span className="px-2 py-0.5 text-xs font-bold bg-green-100 text-green-700 rounded-full">🔥 Laris</span>;
    if (terjual >= 25) return <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">✅ Normal</span>;
    return <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">⚠️ Kurang</span>;
  };

  const medalEmoji = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;

  // ── Perbandingan Standar vs Mini ──
  const stdTotal = { diproduksi: sum(produkStandar, p => p.diproduksi), terjual: sum(produkStandar, p => p.terjual), gagal: sum(produkStandar, p => p.gagalProduksi), pendapatan: sum(produkStandar, p => p.terjual * p.hargaJual) };
  const miniTotal = { diproduksi: sum(produkMini, p => p.diproduksi), terjual: sum(produkMini, p => p.terjual), gagal: sum(produkMini, p => p.gagalProduksi), pendapatan: sum(produkMini, p => p.terjual * p.hargaJual) };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ══════ Header ══════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📊 Laporan Outlet Harian</h2>
          <p className="text-sm text-gray-500">{tanggalHariIni}</p>
        </div>
        <div className="flex gap-2">
          {(['semua', 'standar', 'mini'] as const).map(u => (
            <button key={u} onClick={() => setFilterUkuran(u)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filterUkuran === u ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {u === 'semua' ? '🍩 Semua' : u === 'standar' ? '🟤 Standar' : '🟡 Mini'}
            </button>
          ))}
        </div>
      </div>

      {/* ══════ 1. Ringkasan Keuangan ══════ */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">💰 Ringkasan Keuangan</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-5">
            <p className="text-sm text-gray-600">Pendapatan Kasir</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{rp(pendapatanKotor)}</p>
            <p className="text-xs text-gray-400 mt-1">{totalTerjual} item terjual</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <p className="text-sm text-gray-600">Total Pengeluaran</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{rp(totalPengeluaran)}</p>
            <p className="text-xs text-gray-400 mt-1">{PENGELUARAN_DATA.length} item</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <p className="text-sm text-gray-600">Laba Kotor (- HPP)</p>
            <p className={`text-2xl font-bold mt-1 ${labaKotor >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{rp(labaKotor)}</p>
            <p className="text-xs text-gray-400 mt-1">Margin {totalHPP > 0 ? ((labaKotor / pendapatanKotor) * 100).toFixed(1) : 0}%</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <p className="text-sm text-gray-600">Keuntungan Bersih</p>
            <p className={`text-2xl font-bold mt-1 ${labaBersih >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{rp(labaBersih)}</p>
            <p className="text-xs text-gray-400 mt-1">Pendapatan - Pengeluaran</p>
          </div>
        </div>
      </div>

      {/* ══════ 2. Ringkasan Produksi & Stok ══════ */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">🏭 Ringkasan Produksi & Stok</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Diproduksi</p>
            <p className="text-2xl font-bold text-indigo-600">{totalDiproduksi}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Terjual</p>
            <p className="text-2xl font-bold text-green-600">{totalTerjual}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Gagal Produksi</p>
            <p className="text-2xl font-bold text-red-600">{totalGagal}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Batal Beli</p>
            <p className="text-2xl font-bold text-amber-600">{totalBatalBeli}</p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Sisa Bertoping</p>
            <p className="text-2xl font-bold text-purple-600">{totalSisaBertoping}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500">Sisa Tanpa Toping</p>
            <p className="text-2xl font-bold text-orange-600">{totalSisaTanpaToping}</p>
          </div>
        </div>

        {/* Alur donat visual */}
        <div className="mt-4 bg-gray-50 border rounded-xl p-4">
          <p className="text-sm font-bold text-gray-700 mb-2">🔄 Alur Donat Hari Ini:</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">Produksi: {totalDiproduksi}</span>
            <span>→</span>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">Terjual: {totalTerjual}</span>
            <span>+</span>
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold">Gagal: {totalGagal}</span>
            <span>+</span>
            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold">Batal: {totalBatalBeli}</span>
            <span>+</span>
            <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">Sisa Toping: {totalSisaBertoping}</span>
            <span>+</span>
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-bold">Sisa Polos: {totalSisaTanpaToping}</span>
          </div>
        </div>
      </div>

      {/* ══════ 3. Rincian Keuangan (HPP) ══════ */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-emerald-50">
          <h3 className="font-bold text-gray-900">📋 Rincian Keuangan (HPP per Produk)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Produk</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Ukuran</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Terjual</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Harga Jual</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">HPP</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Pendapatan</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total HPP</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {produkFiltered.map(p => {
                const pendapatan = p.terjual * p.hargaJual;
                const hppTotal = p.terjual * p.hpp;
                const margin = pendapatan > 0 ? ((pendapatan - hppTotal) / pendapatan * 100) : 0;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.nama}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 text-xs font-bold rounded-full ${p.ukuran === 'standar' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>{p.ukuran}</span></td>
                    <td className="px-4 py-3 text-right text-sm">{p.terjual}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">{rp(p.hargaJual)}</td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">{rp(p.hpp)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{rp(pendapatan)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{rp(hppTotal)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">{margin.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-bold">TOTAL</td>
                <td className="px-4 py-3 text-right text-sm font-bold">{totalTerjual}</td>
                <td colSpan={2}></td>
                <td className="px-4 py-3 text-right text-sm font-bold text-green-700">{rp(pendapatanKotor)}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-red-700">{rp(totalHPP)}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">{pendapatanKotor > 0 ? ((labaKotor / pendapatanKotor) * 100).toFixed(1) : 0}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ══════ 4. Pendapatan Per Kasir ══════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b bg-blue-50">
            <h3 className="font-bold text-gray-900">👤 Pendapatan Per Kasir</h3>
          </div>
          <div className="divide-y">
            {pendapatanPerKasir.map(k => (
              <div key={k.kasir} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-bold text-gray-900">{k.kasir}</p>
                  <p className="text-xs text-gray-400">{k.jumlahTrx} transaksi · {k.totalItem} item</p>
                </div>
                <p className="text-lg font-bold text-green-600">{rp(k.totalHarga)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b bg-cyan-50">
            <h3 className="font-bold text-gray-900">💳 Per Metode Bayar</h3>
          </div>
          <div className="divide-y">
            {pendapatanPerMetode.map(m => (
              <div key={m.metode} className="px-5 py-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="font-bold text-gray-900">{m.metode === 'Tunai' ? '💵' : m.metode === 'QRIS' ? '📱' : '🏦'} {m.metode}</p>
                  <p className="text-xs text-gray-400">{m.jumlahTrx} transaksi</p>
                </div>
                <p className="text-lg font-bold text-blue-600">{rp(m.total)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════ 5. Ranking Penjualan ══════ */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-yellow-50">
          <h3 className="font-bold text-gray-900">🏆 Ranking Penjualan Produk</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
          {/* Top 3 */}
          <div className="p-5">
            <p className="text-sm font-bold text-green-700 mb-3">🔥 Top 3 Terlaris</p>
            {top3.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{medalEmoji(i)}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{p.nama}</p>
                    <p className="text-xs text-gray-400">{p.ukuran} · {rp(p.hargaJual)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">{p.terjual} terjual</p>
                  <p className="text-xs text-gray-400">{rp(p.terjual * p.hargaJual)}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Bottom 3 */}
          <div className="p-5">
            <p className="text-sm font-bold text-red-700 mb-3">⚠️ 3 Paling Sedikit</p>
            {bottom3.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">{p.nama}</p>
                  <p className="text-xs text-gray-400">{p.ukuran} · {rp(p.hargaJual)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-red-600">{p.terjual} terjual</p>
                  {statusBadge(p.terjual)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════ 6. Detail Stok Per Produk ══════ */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-orange-50">
          <h3 className="font-bold text-gray-900">🍩 Detail Stok Per Produk</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Produk</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Ukuran</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Produksi</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Terjual</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Gagal</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Batal</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Sisa Toping</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Sisa Polos</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {produkFiltered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.nama}</td>
                  <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 text-xs font-bold rounded-full ${p.ukuran === 'standar' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>{p.ukuran}</span></td>
                  <td className="px-4 py-3 text-right text-sm">{p.diproduksi}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{p.terjual}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{p.gagalProduksi}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-amber-600">{p.batalBeli}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-purple-600">{p.sisaBertoping}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-orange-600">{p.sisaTanpaToping}</td>
                  <td className="px-4 py-3 text-center">{statusBadge(p.terjual)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-bold">TOTAL</td>
                <td className="px-4 py-3 text-right text-sm font-bold">{totalDiproduksi}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-green-700">{totalTerjual}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-red-700">{totalGagal}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-amber-700">{totalBatalBeli}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-purple-700">{totalSisaBertoping}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-orange-700">{totalSisaTanpaToping}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ══════ 7. Perbandingan Standar vs Mini ══════ */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-violet-50">
          <h3 className="font-bold text-gray-900">📊 Perbandingan Standar vs Mini</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Metrik</th>
                <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">🟤 Standar</th>
                <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">🟡 Mini</th>
                <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-medium">Jumlah Varian</td>
                <td className="px-5 py-3 text-right text-sm font-bold">{produkStandar.length}</td>
                <td className="px-5 py-3 text-right text-sm font-bold">{produkMini.length}</td>
                <td className="px-5 py-3 text-right text-sm font-bold">{PRODUK_DATA.length}</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-medium">Diproduksi</td>
                <td className="px-5 py-3 text-right text-sm font-bold">{stdTotal.diproduksi}</td>
                <td className="px-5 py-3 text-right text-sm font-bold">{miniTotal.diproduksi}</td>
                <td className="px-5 py-3 text-right text-sm font-bold">{stdTotal.diproduksi + miniTotal.diproduksi}</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-medium">Terjual</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-green-600">{stdTotal.terjual}</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-green-600">{miniTotal.terjual}</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-green-700">{stdTotal.terjual + miniTotal.terjual}</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-medium">Gagal Produksi</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-red-600">{stdTotal.gagal}</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-red-600">{miniTotal.gagal}</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-red-700">{stdTotal.gagal + miniTotal.gagal}</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-medium">Pendapatan</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-blue-600">{rp(stdTotal.pendapatan)}</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-blue-600">{rp(miniTotal.pendapatan)}</td>
                <td className="px-5 py-3 text-right text-sm font-bold text-blue-700">{rp(stdTotal.pendapatan + miniTotal.pendapatan)}</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-5 py-3 text-sm font-medium">% Penjualan</td>
                <td className="px-5 py-3 text-right text-sm font-bold">{((stdTotal.terjual / (stdTotal.terjual + miniTotal.terjual)) * 100).toFixed(1)}%</td>
                <td className="px-5 py-3 text-right text-sm font-bold">{((miniTotal.terjual / (stdTotal.terjual + miniTotal.terjual)) * 100).toFixed(1)}%</td>
                <td className="px-5 py-3 text-right text-sm font-bold">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════ 8. Rincian Pengeluaran ══════ */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-red-50">
          <h3 className="font-bold text-gray-900">💸 Rincian Pengeluaran Per Kategori</h3>
        </div>
        <div className="divide-y">
          {pengeluaranPerKategori.map(k => (
            <div key={k.kategori}>
              <div className="px-5 py-3 bg-gray-50 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-700">{k.kategori}</p>
                <p className="text-sm font-bold text-red-600">{rp(k.total)}</p>
              </div>
              {k.items.map(item => (
                <div key={item.id} className="px-5 py-2 pl-10 flex items-center justify-between hover:bg-gray-50">
                  <p className="text-sm text-gray-600">{item.keterangan}</p>
                  <p className="text-sm font-medium text-red-500">{rp(item.jumlah)}</p>
                </div>
              ))}
            </div>
          ))}
          <div className="px-5 py-3 bg-red-50 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">TOTAL PENGELUARAN</p>
            <p className="text-lg font-bold text-red-700">{rp(totalPengeluaran)}</p>
          </div>
        </div>
      </div>

      {/* ══════ 9. Riwayat Transaksi ══════ */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-teal-50">
          <h3 className="font-bold text-gray-900">🧾 Riwayat Transaksi Hari Ini</h3>
          <p className="text-xs text-gray-400 mt-1">{TRANSAKSI_DATA.length} transaksi</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Waktu</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Kasir</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Pelanggan</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Item</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Bayar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {TRANSAKSI_DATA.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(t.waktu).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-3 text-sm font-medium">{t.kasir}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{t.namaPelanggan}</td>
                  <td className="px-4 py-3 text-right text-sm">{t.totalItem}</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{rp(t.totalHarga)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${t.metodeBayar === 'Tunai' ? 'bg-green-100 text-green-700' : t.metodeBayar === 'QRIS' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{t.metodeBayar}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-sm font-bold">TOTAL {TRANSAKSI_DATA.length} TRANSAKSI</td>
                <td className="px-4 py-3 text-right text-sm font-bold">{TRANSAKSI_DATA.reduce((s, t) => s + t.totalItem, 0)}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-green-700">{rp(TRANSAKSI_DATA.reduce((s, t) => s + t.totalHarga, 0))}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ══════ 10. Detail Produksi Per Produk ══════ */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b bg-indigo-50">
          <h3 className="font-bold text-gray-900">🏭 Detail Produksi Per Produk</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Produk</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">Ukuran</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Diproduksi</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Berhasil</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">Gagal</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase">% Sukses</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {produkFiltered.map(p => {
                const berhasil = p.diproduksi - p.gagalProduksi;
                const pctSukses = p.diproduksi > 0 ? ((berhasil / p.diproduksi) * 100) : 0;
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.nama}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-2 py-0.5 text-xs font-bold rounded-full ${p.ukuran === 'standar' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>{p.ukuran}</span></td>
                    <td className="px-4 py-3 text-right text-sm">{p.diproduksi}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{berhasil}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{p.gagalProduksi}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${pctSukses >= 95 ? 'bg-green-100 text-green-700' : pctSukses >= 90 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{pctSukses.toFixed(1)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-bold">TOTAL</td>
                <td className="px-4 py-3 text-right text-sm font-bold">{totalDiproduksi}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-green-700">{totalDiproduksi - totalGagal}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-red-700">{totalGagal}</td>
                <td className="px-4 py-3 text-right">
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700">
                    {totalDiproduksi > 0 ? (((totalDiproduksi - totalGagal) / totalDiproduksi) * 100).toFixed(1) : 0}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
