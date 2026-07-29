'use client';

import { useState } from 'react';
import { ArrowLeft, Calendar, Search, Filter, AlertCircle, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function KelolaJadwalPage() {
  const [search, setSearch] = useState('');
  
  // Mock data jadwal shift
  const mockShifts = [
    { id: 1, nama: 'Shift Pagi (Early)', jam: '07:00 - 15:00', staf: ['ence', 'budi'], status: 'Aktif', outlet: 'Outlet PNF' },
    { id: 2, nama: 'Shift Siang / Sore', jam: '15:00 - 22:00', staf: ['siti', 'joni'], status: 'Aktif', outlet: 'Outlet PNF' },
    { id: 3, nama: 'Shift OTR Pagi', jam: '08:00 - 16:00', staf: ['agus'], status: 'Aktif', outlet: 'Lintas Outlet' },
  ];

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex justify-end">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm font-bold text-xs h-9">
          <Plus className="w-4 h-4 mr-1" /> Tambah Shift Baru
        </Button>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800">
          <p className="font-bold mb-1">Status Modul: Sedang dalam Pengembangan</p>
          <p>Fitur ini akan menyajikan kalender mingguan interaktif untuk drag-and-drop pembagian shift kerja karyawan.</p>
        </div>
      </div>

      {/* Action / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari shift atau nama staf..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5 h-9">
            <Filter className="w-3.5 h-3.5" /> Semua Outlet
          </Button>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
              <tr>
                <th className="px-6 py-4">Nama Shift</th>
                <th className="px-6 py-4">Outlet</th>
                <th className="px-6 py-4">Jam Kerja</th>
                <th className="px-6 py-4">Karyawan Terjadwal</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {mockShifts
                .filter(item => item.nama.toLowerCase().includes(search.toLowerCase()) || item.staf.some(s => s.toLowerCase().includes(search.toLowerCase())))
                .map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{row.nama}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">{row.outlet}</td>
                    <td className="px-6 py-4 text-xs">{row.jam}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {row.staf.map((s, idx) => (
                          <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="outline" size="sm" className="rounded-lg border-slate-200 text-slate-600 hover:text-slate-900 text-xs">
                        Edit Shift
                      </Button>
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
