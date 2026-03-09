'use client';

import { useState } from 'react';

interface Transaksi {
  id: string;
  nomorTransaksi: string;
  tanggal: string;
  items: string;
  total: number;
  metode: string;
}

// Demo data
const DEMO_TRANSAKSI: Transaksi[] = [
  { id: '1', nomorTransaksi: 'TXN-001', tanggal: new Date().toISOString(), items: 'Donat Cokelat x3, Kopi Susu x1', total: 36000, metode: 'Cash' },
  { id: '2', nomorTransaksi: 'TXN-002', tanggal: new Date().toISOString(), items: 'Donat Gula x5', total: 25000, metode: 'Cash' },
  { id: '3', nomorTransaksi: 'TXN-003', tanggal: new Date().toISOString(), items: 'Donat Matcha x2, Teh Manis x2', total: 36000, metode: 'Transfer' },
];

export default function TransaksiPage() {
  const [transaksiList] = useState<Transaksi[]>(DEMO_TRANSAKSI);
  const [search, setSearch] = useState('');

  const filtered = transaksiList.filter(
    (t) => t.nomorTransaksi.toLowerCase().includes(search.toLowerCase()) ||
           t.items.toLowerCase().includes(search.toLowerCase())
  );

  const totalHariIni = transaksiList.reduce((sum, t) => sum + t.total, 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🧾 Transaksi</h2>
        <p className="text-sm text-gray-500">Riwayat transaksi (hanya melihat)</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm text-gray-600">Total Penjualan Hari Ini</p>
          <p className="text-2xl font-bold text-green-600 mt-1">Rp {totalHariIni.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm text-gray-600">Jumlah Transaksi</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{transaksiList.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm text-gray-600">Rata-rata per Transaksi</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            Rp {transaksiList.length > 0 ? Math.round(totalHariIni / transaksiList.length).toLocaleString('id-ID') : 0}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 px-4 py-2 border rounded-lg focus:outline-none focus:border-amber-500"
          placeholder="Cari transaksi..."
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">No. Transaksi</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Waktu</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Item</th>
              <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Metode</th>
              <th className="px-6 py-3 text-right text-sm font-bold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  Tidak ada transaksi ditemukan
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-mono font-bold text-gray-900">{t.nomorTransaksi}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {new Date(t.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-700">{t.items}</td>
                  <td className="px-6 py-3 text-center">
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">{t.metode}</span>
                  </td>
                  <td className="px-6 py-3 text-right text-sm font-bold text-green-600">
                    Rp {t.total.toLocaleString('id-ID')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
