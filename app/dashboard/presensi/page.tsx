'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { Button } from '@/components/ui/button';

interface PresensiRecord {
  id: string;
  nama: string;
  waktuMasuk: string;
  waktuKeluar: string | null;
  status: 'hadir' | 'izin' | 'sakit' | 'alpha';
}

export default function PresensiPage() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const [records, setRecords] = useState<PresensiRecord[]>([
    { id: '1', nama: user?.name || 'Admin', waktuMasuk: new Date().toISOString(), waktuKeluar: null, status: 'hadir' },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama: '', status: 'hadir' as PresensiRecord['status'] });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama) return;

    const newRecord: PresensiRecord = {
      id: `pre-${Date.now()}`,
      nama: form.nama,
      waktuMasuk: form.status === 'hadir' ? new Date().toISOString() : '',
      waktuKeluar: null,
      status: form.status,
    };
    setRecords([...records, newRecord]);
    setForm({ nama: '', status: 'hadir' });
    setShowForm(false);
  };

  const handleClockOut = (id: string) => {
    setRecords(records.map((r) => (r.id === id ? { ...r, waktuKeluar: new Date().toISOString() } : r)));
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      hadir: 'bg-green-100 text-green-800',
      izin: 'bg-yellow-100 text-yellow-800',
      sakit: 'bg-blue-100 text-blue-800',
      alpha: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">📋 Presensi</h2>
          <p className="text-sm text-gray-500">{today}</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
        >
          {showForm ? 'Batal' : '+ Tambah Presensi'}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{records.filter((r) => r.status === 'hadir').length}</p>
          <p className="text-xs text-gray-500 mt-1">Hadir</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{records.filter((r) => r.status === 'izin').length}</p>
          <p className="text-xs text-gray-500 mt-1">Izin</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{records.filter((r) => r.status === 'sakit').length}</p>
          <p className="text-xs text-gray-500 mt-1">Sakit</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{records.filter((r) => r.status === 'alpha').length}</p>
          <p className="text-xs text-gray-500 mt-1">Alpha</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Tambah Presensi</h3>
          <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-amber-500"
                placeholder="Nama karyawan"
              />
            </div>
            <div className="w-40">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as PresensiRecord['status'] })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-amber-500"
              >
                <option value="hadir">Hadir</option>
                <option value="izin">Izin</option>
                <option value="sakit">Sakit</option>
                <option value="alpha">Alpha</option>
              </select>
            </div>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold">
              Simpan
            </Button>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Nama</th>
              <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Status</th>
              <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Jam Masuk</th>
              <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Jam Keluar</th>
              <th className="px-6 py-3 text-center text-sm font-bold text-gray-700">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{r.nama}</td>
                <td className="px-6 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${getStatusBadge(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-6 py-3 text-center text-sm text-gray-600">
                  {r.waktuMasuk ? new Date(r.waktuMasuk).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
                <td className="px-6 py-3 text-center text-sm text-gray-600">
                  {r.waktuKeluar ? new Date(r.waktuKeluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
                <td className="px-6 py-3 text-center">
                  {r.status === 'hadir' && !r.waktuKeluar && (
                    <button
                      onClick={() => handleClockOut(r.id)}
                      className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium hover:bg-red-200"
                    >
                      Clock Out
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
