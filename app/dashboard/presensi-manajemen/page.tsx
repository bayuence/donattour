'use client';

import { useState } from 'react';

interface PresensiRecord {
  id: string;
  nama: string;
  outlet: string;
  tanggal: string;
  masuk: string | null;
  keluar: string | null;
  status: 'hadir' | 'terlambat' | 'izin' | 'alpha';
  catatan: string;
}

const demoRecords: PresensiRecord[] = [
  { id: '1', nama: 'Admin', outlet: 'Outlet Pusat', tanggal: '2025-01-15', masuk: '07:55', keluar: '16:05', status: 'hadir', catatan: '' },
  { id: '2', nama: 'Admin', outlet: 'Outlet Pusat', tanggal: '2025-01-14', masuk: '08:20', keluar: '16:00', status: 'terlambat', catatan: 'Macet' },
  { id: '3', nama: 'Admin', outlet: 'Outlet Pusat', tanggal: '2025-01-13', masuk: null, keluar: null, status: 'izin', catatan: 'Sakit' },
  { id: '4', nama: 'Admin', outlet: 'Outlet Pusat', tanggal: '2025-01-12', masuk: '07:50', keluar: '16:10', status: 'hadir', catatan: '' },
];

const statusColors: Record<string, string> = {
  hadir: 'bg-green-100 text-green-700',
  terlambat: 'bg-yellow-100 text-yellow-700',
  izin: 'bg-blue-100 text-blue-700',
  alpha: 'bg-red-100 text-red-700',
};

export default function PresensiMgmtPage() {
  const [records] = useState(demoRecords);
  const [filterStatus, setFilterStatus] = useState<string>('semua');
  const [filterBulan, setFilterBulan] = useState('2025-01');

  const filtered = records.filter((r) => {
    if (filterStatus !== 'semua' && r.status !== filterStatus) return false;
    if (!r.tanggal.startsWith(filterBulan)) return false;
    return true;
  });

  const totalHadir = records.filter((r) => r.status === 'hadir').length;
  const totalTerlambat = records.filter((r) => r.status === 'terlambat').length;
  const totalIzin = records.filter((r) => r.status === 'izin').length;
  const totalAlpha = records.filter((r) => r.status === 'alpha').length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">📊 Presensi (Manajemen)</h2>
        <p className="text-sm text-gray-500">Pantau dan kelola data presensi seluruh karyawan</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{totalHadir}</p>
          <p className="text-sm text-gray-500">Hadir</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-yellow-600">{totalTerlambat}</p>
          <p className="text-sm text-gray-500">Terlambat</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{totalIzin}</p>
          <p className="text-sm text-gray-500">Izin</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 text-center">
          <p className="text-3xl font-bold text-red-600">{totalAlpha}</p>
          <p className="text-sm text-gray-500">Alpha</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b flex flex-wrap gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Bulan</label>
            <input type="month" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:border-amber-500">
              <option value="semua">Semua</option>
              <option value="hadir">Hadir</option>
              <option value="terlambat">Terlambat</option>
              <option value="izin">Izin</option>
              <option value="alpha">Alpha</option>
            </select>
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Nama</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Outlet</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Tanggal</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Masuk</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Keluar</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((rec) => (
              <tr key={rec.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{rec.nama}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{rec.outlet}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{rec.tanggal}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{rec.masuk ?? '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{rec.keluar ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[rec.status]}`}>
                    {rec.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{rec.catatan || '-'}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Tidak ada data presensi</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
