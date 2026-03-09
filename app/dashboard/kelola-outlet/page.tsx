'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Outlet {
  id: string;
  nama: string;
  alamat: string;
  telepon: string;
  status: 'aktif' | 'tutup';
}

export default function KelolaOutletPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([
    { id: '1', nama: 'Outlet Pusat', alamat: 'Jl. Utama No. 1', telepon: '081234567890', status: 'aktif' },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama: '', alamat: '', telepon: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama || !form.alamat) return;

    const newOutlet: Outlet = {
      id: `outlet-${Date.now()}`,
      nama: form.nama,
      alamat: form.alamat,
      telepon: form.telepon,
      status: 'aktif',
    };
    setOutlets([...outlets, newOutlet]);
    setForm({ nama: '', alamat: '', telepon: '' });
    setShowForm(false);
  };

  const toggleStatus = (id: string) => {
    setOutlets(outlets.map((o) => (o.id === id ? { ...o, status: o.status === 'aktif' ? 'tutup' : 'aktif' } : o)));
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🏪 Kelola Outlet</h2>
          <p className="text-sm text-gray-500">Kelola daftar outlet</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
        >
          {showForm ? 'Batal' : '+ Tambah Outlet'}
        </Button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4">Tambah Outlet Baru</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Outlet</label>
                <input type="text" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-amber-500" placeholder="Outlet Cabang 1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                <input type="text" value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-amber-500" placeholder="Jl. ..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                <input type="text" value={form.telepon} onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:border-amber-500" placeholder="08..." />
              </div>
            </div>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-bold">Simpan</Button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {outlets.map((outlet) => (
          <div key={outlet.id} className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-gray-900">{outlet.nama}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${outlet.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {outlet.status}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-1">📍 {outlet.alamat}</p>
            {outlet.telepon && <p className="text-sm text-gray-600 mb-3">📞 {outlet.telepon}</p>}
            <button
              onClick={() => toggleStatus(outlet.id)}
              className="text-xs text-blue-600 hover:underline"
            >
              {outlet.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
