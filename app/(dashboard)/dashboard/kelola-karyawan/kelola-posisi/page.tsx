'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Plus, Shield, Check, Trash2, Edit } from 'lucide-react';

export default function KelolaPosisiPage() {
  const [search, setSearch] = useState('');

  // Dummy data untuk sementara sebelum ada backend untuk tabel posisi khusus
  const dummyPositions = [
    { id: '1', name: 'Admin Backoffice', code: 'admin', usersCount: 2, isActive: true },
    { id: '2', name: 'Kasir / Staf Biasa', code: 'cashier', usersCount: 8, isActive: true },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama posisi atau jabatan..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm font-bold text-xs h-9">
          <Plus className="w-4 h-4 mr-1" /> Tambah Posisi Baru
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
              <tr>
                <th className="px-6 py-4">Nama Posisi / Jabatan</th>
                <th className="px-6 py-4">Kode Sistem</th>
                <th className="px-6 py-4">Jumlah Staf</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dummyPositions.map((pos) => (
                <tr key={pos.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 font-bold shrink-0">
                        <Shield className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-800">{pos.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold border bg-slate-100 text-slate-600 border-slate-200 uppercase">
                      {pos.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-blue-600">{pos.usersCount} Orang</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1 text-xs font-bold ${pos.isActive ? 'text-emerald-600' : 'text-red-500'}`}>
                      <span className={`w-2 h-2 rounded-full ${pos.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      {pos.isActive ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-blue-600 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-slate-500 hover:text-red-600 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
