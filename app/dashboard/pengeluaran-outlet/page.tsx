'use client';

import { useState } from 'react';
import { CurrencyInput } from '@/components/ui/currency-input';

interface Pengeluaran {
  id: string;
  tanggal: string;
  keterangan: string;
  jumlah: number;
  kategori: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const KATEGORI_STYLE: Record<string, { emoji: string; bg: string; text: string }> = {
  operasional: { emoji: '⚙️', bg: 'bg-blue-100', text: 'text-blue-700' },
  bahan_baku:  { emoji: '🧂', bg: 'bg-amber-100', text: 'text-amber-700' },
  gaji:        { emoji: '👤', bg: 'bg-green-100', text: 'text-green-700' },
  lainnya:     { emoji: '📌', bg: 'bg-gray-100',  text: 'text-gray-600'  },
};

export default function PengeluaranPage() {
  const [list, setList] = useState<Pengeluaran[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ keterangan: '', jumlah: '', kategori: 'operasional' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keterangan || !form.jumlah) return;
    setList([{
      id: `exp-${Date.now()}`,
      tanggal: new Date().toISOString(),
      keterangan: form.keterangan,
      jumlah: parseInt(form.jumlah),
      kategori: form.kategori,
    }, ...list]);
    setForm({ keterangan: '', jumlah: '', kategori: 'operasional' });
    setShowForm(false);
  };

  const total = list.reduce((s, i) => s + i.jumlah, 0);

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">💸 Pengeluaran Outlet</h2>
          <p className="text-xs text-gray-400 mt-0.5">Catat pengeluaran harian</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition
            ${showForm ? 'bg-gray-100 text-gray-600' : 'bg-red-500 text-white hover:bg-red-600'}`}
        >
          {showForm ? 'Batal' : '+ Tambah'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-xs text-gray-500">Total Pengeluaran</p>
          <p className="text-xl font-bold text-red-600 mt-1">{fmt(total)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs text-gray-500">Jumlah Item</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{list.length}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-4 mb-4 space-y-3">
          <h3 className="font-bold text-gray-800">Tambah Pengeluaran</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
            <input
              type="text"
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="cth: Beli minyak goreng"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
            <CurrencyInput
              value={form.jumlah}
              onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              placeholder="50000"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(KATEGORI_STYLE).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm({ ...form, kategori: k })}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold border-2 text-left transition
                    ${form.kategori === k ? `${v.bg} ${v.text} border-current` : 'border-gray-200 text-gray-500'}`}
                >
                  {v.emoji} {k.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm transition"
          >
            Simpan Pengeluaran
          </button>
        </form>
      )}

      {/* Card List */}
      {list.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-2">💸</div>
          <p className="text-sm">Belum ada pengeluaran hari ini</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((item) => {
            const s = KATEGORI_STYLE[item.kategori] ?? KATEGORI_STYLE.lainnya;
            return (
              <div key={item.id} className="bg-white rounded-2xl shadow px-4 py-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${s.bg}`}>
                  {s.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{item.keterangan}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(item.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    <span className={`${s.text} font-medium`}>{item.kategori.replace('_', ' ')}</span>
                  </p>
                </div>
                <p className="font-bold text-red-600 text-sm">{fmt(item.jumlah)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
