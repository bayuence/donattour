'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface Transaksi {
  id: string;
  tanggal: string;
  kasir: string;
  outlet: string;
  items: string;
  total: number;
  metode: string;
  status: 'selesai' | 'dibatalkan';
}

const demoTransactions: Transaksi[] = [
  { id: 'TRX-001', tanggal: '2025-01-15 10:30', kasir: 'Admin', outlet: 'Outlet Pusat', items: 'Donat Coklat x3, Es Teh x1', total: 19000, metode: 'Tunai', status: 'selesai' },
  { id: 'TRX-002', tanggal: '2025-01-15 11:15', kasir: 'Admin', outlet: 'Outlet Pusat', items: 'Donat Original x5', total: 25000, metode: 'QRIS', status: 'selesai' },
  { id: 'TRX-003', tanggal: '2025-01-15 12:00', kasir: 'Admin', outlet: 'Outlet Pusat', items: 'Donat Keju x2, Kopi Susu x2', total: 32000, metode: 'Tunai', status: 'dibatalkan' },
  { id: 'TRX-004', tanggal: '2025-01-15 13:45', kasir: 'Admin', outlet: 'Outlet Pusat', items: 'Donat Strawberry x4, Es Jeruk x2', total: 28000, metode: 'Transfer', status: 'selesai' },
];

export default function TransaksiEditorPage() {
  const [transactions, setTransactions] = useState(demoTransactions);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<'selesai' | 'dibatalkan'>('selesai');

  const filtered = transactions.filter(
    (t) => t.id.toLowerCase().includes(search.toLowerCase()) || t.items.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (id: string) => {
    const trx = transactions.find((t) => t.id === id);
    if (trx) {
      setEditingId(id);
      setEditStatus(trx.status);
    }
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setTransactions(transactions.map((t) => (t.id === editingId ? { ...t, status: editStatus } : t)));
    setEditingId(null);
  };

  const totalPendapatan = transactions.filter((t) => t.status === 'selesai').reduce((s, t) => s + t.total, 0);
  const totalBatal = transactions.filter((t) => t.status === 'dibatalkan').length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">📝 Transaksi (Editor)</h2>
        <p className="text-sm text-gray-500">Kelola dan edit status transaksi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Total Transaksi</p>
          <p className="text-2xl font-bold text-gray-900">{transactions.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Total Pendapatan</p>
          <p className="text-2xl font-bold text-green-600">Rp {totalPendapatan.toLocaleString('id-ID')}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <p className="text-sm text-gray-500">Dibatalkan</p>
          <p className="text-2xl font-bold text-red-600">{totalBatal}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-1/3 px-3 py-2 border rounded-lg focus:outline-none focus:border-amber-500"
            placeholder="🔍 Cari ID atau item..." />
        </div>

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">ID</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Tanggal</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Kasir</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Items</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Total</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Metode</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((trx) => (
              <tr key={trx.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-sm text-amber-600 font-bold">{trx.id}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{trx.tanggal}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{trx.kasir}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">{trx.items}</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900">Rp {trx.total.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{trx.metode}</td>
                <td className="px-4 py-3">
                  {editingId === trx.id ? (
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as 'selesai' | 'dibatalkan')}
                      className="px-2 py-1 border rounded text-xs">
                      <option value="selesai">Selesai</option>
                      <option value="dibatalkan">Dibatalkan</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${trx.status === 'selesai' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {trx.status}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {editingId === trx.id ? (
                    <div className="flex gap-1">
                      <Button onClick={handleSaveEdit} className="text-xs h-7 px-2 bg-green-500 hover:bg-green-600 text-white">Simpan</Button>
                      <Button onClick={() => setEditingId(null)} variant="outline" className="text-xs h-7 px-2">Batal</Button>
                    </div>
                  ) : (
                    <button onClick={() => handleEdit(trx.id)} className="text-xs text-blue-600 hover:underline">Edit</button>
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
