'use client';

import { useState, useEffect } from 'react';
import * as db from '@/lib/db';
import type { Outlet } from '@/lib/types';

export default function KelolaOutletPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama: '', alamat: '', telepon: '' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setOutlets(await db.getOutlets());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama || !form.alamat) return;
    await db.createOutlet(form);
    setForm({ nama: '', alamat: '', telepon: '' });
    setShowForm(false);
    load();
  };

  const handleToggle = async (id: string) => {
    await db.toggleOutletStatus(id);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">🏪 Kelola Outlet</h2>
          <p className="text-xs text-gray-400 mt-0.5">{outlets.length} outlet terdaftar</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition
            ${showForm ? 'bg-gray-100 text-gray-600' : 'bg-orange-500 text-white hover:bg-orange-600'}`}
        >
          {showForm ? 'Batal' : '+ Tambah'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-4 mb-4 space-y-3">
          <h3 className="font-bold text-gray-800">Tambah Outlet Baru</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Outlet</label>
            <input
              type="text"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="cth: Outlet Cabang Selatan"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <input
              type="text"
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="cth: Jl. Sudirman No. 10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telepon <span className="text-gray-400 font-normal">(opsional)</span></label>
            <input
              type="tel"
              value={form.telepon}
              onChange={(e) => setForm({ ...form, telepon: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="08..."
            />
          </div>
          <button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition"
          >
            Simpan Outlet
          </button>
        </form>
      )}

      {/* Outlet List */}
      <div className="space-y-3">
        {outlets.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">🏪</div>
            <p className="text-sm">Belum ada outlet. Tambah sekarang!</p>
          </div>
        )}
        {outlets.map((o) => (
          <div key={o.id} className="bg-white rounded-2xl shadow px-4 py-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0
              ${o.status === 'aktif' ? 'bg-orange-100' : 'bg-gray-100'}`}>
              🏪
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-gray-900">{o.nama}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                  ${o.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {o.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {o.alamat}</p>
              {o.telepon && <p className="text-xs text-gray-400">📞 {o.telepon}</p>}
            </div>
            <button
              onClick={() => handleToggle(o.id)}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold border transition
                ${o.status === 'aktif'
                  ? 'border-red-200 text-red-500 hover:bg-red-50'
                  : 'border-green-200 text-green-600 hover:bg-green-50'}`}
            >
              {o.status === 'aktif' ? 'Tutup' : 'Aktifkan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
