'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import { Button } from '@/components/ui/button';

interface Pengeluaran {
  id: string;
  tanggal: string;
  keterangan: string;
  jumlah: number;
  kategori: string;
}

export default function PengeluaranPage() {
  const { user } = useAuth();
  const [pengeluaranList, setPengeluaranList] = useState<Pengeluaran[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    keterangan: '',
    jumlah: '',
    kategori: 'operasional',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keterangan || !form.jumlah) return;

    const newItem: Pengeluaran = {
      id: `exp-${Date.now()}`,
      tanggal: new Date().toISOString(),
      keterangan: form.keterangan,
      jumlah: parseInt(form.jumlah),
      kategori: form.kategori,
    };

    setPengeluaranList([newItem, ...pengeluaranList]);
    setForm({ keterangan: '', jumlah: '', kategori: 'operasional' });
    setShowForm(false);
  };

  const totalPengeluaran = pengeluaranList.reduce((sum, item) => sum + item.jumlah, 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">💸 Pengeluaran Outlet</h2>
          <p className="text-sm text-gray-500">Catat pengeluaran harian outlet</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
        >
          {showForm ? 'Batal' : '+ Tambah Pengeluaran'}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-sm text-gray-600">Total Pengeluaran Hari Ini</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            Rp {totalPengeluaran.toLocaleString('id-ID')}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm text-gray-600">Jumlah Transaksi</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{pengeluaranList.length}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Tambah Pengeluaran</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <input
                  type="text"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-amber-500"
                  placeholder="Contoh: Beli minyak goreng"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
                <input
                  type="number"
                  value={form.jumlah}
                  onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-amber-500"
                  placeholder="50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={form.kategori}
                  onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-amber-500"
                >
                  <option value="operasional">Operasional</option>
                  <option value="bahan_baku">Bahan Baku</option>
                  <option value="gaji">Gaji</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>
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
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Waktu</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Keterangan</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">Kategori</th>
              <th className="px-6 py-3 text-right text-sm font-bold text-gray-700">Jumlah</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pengeluaranList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                  Belum ada pengeluaran hari ini
                </td>
              </tr>
            ) : (
              pengeluaranList.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {new Date(item.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{item.keterangan}</td>
                  <td className="px-6 py-3 text-sm">
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs capitalize">{item.kategori.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-3 text-sm text-right font-bold text-red-600">
                    Rp {item.jumlah.toLocaleString('id-ID')}
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
