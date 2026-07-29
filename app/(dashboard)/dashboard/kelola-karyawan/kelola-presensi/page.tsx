'use client';

import { useState } from 'react';
import { ArrowLeft, Clock, Search, Filter, AlertCircle, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function KelolaPresensiPage() {
  const [search, setSearch] = useState('');
  
  // Mock data absensi
  const mockAttendance = [
    { id: 1, nama: 'ence', role: 'Kasir', checkIn: '07:54 (WIB)', checkOut: '16:05 (WIB)', totalJam: '8 jam 11 mnt', status: 'Hadir tepat waktu', outlet: 'Outlet PNF' },
    { id: 2, nama: 'admin', role: 'Admin', checkIn: '08:12 (WIB)', checkOut: '- (Sedang Kerja)', totalJam: '-', status: 'Terlambat', outlet: 'Outlet PNF' },
    { id: 3, nama: 'budi', role: 'Kasir OTR', checkIn: '07:45 (WIB)', checkOut: '16:00 (WIB)', totalJam: '8 jam 15 mnt', status: 'Hadir tepat waktu', outlet: 'Lintas Outlet' },
  ];

  return (
    <div className="space-y-6">
      {/* Date Picker & Action */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>Hari Ini: 19 Juli 2026</span>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800">
          <p className="font-bold mb-1">Status Modul: Sedang dalam Pengembangan</p>
          <p>Fitur ini akan diintegrasikan dengan modul presensi offline/online dari panel kasir toko tempat karyawan melakukan scan absensi.</p>
        </div>
      </div>

      {/* Action / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama karyawan..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl border-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5 h-9">
            <Filter className="w-3.5 h-3.5" /> Filter Outlet
          </Button>
        </div>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
              <tr>
                <th className="px-6 py-4">Karyawan</th>
                <th className="px-6 py-4">Outlet</th>
                <th className="px-6 py-4">Check-In</th>
                <th className="px-6 py-4">Check-Out</th>
                <th className="px-6 py-4">Total Kerja</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {mockAttendance
                .filter(item => item.nama.toLowerCase().includes(search.toLowerCase()))
                .map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-800">{row.nama}</p>
                        <p className="text-[11px] text-slate-400">{row.role}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">{row.outlet}</td>
                    <td className="px-6 py-4 text-xs">{row.checkIn}</td>
                    <td className="px-6 py-4 text-xs">{row.checkOut}</td>
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">{row.totalJam}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 border rounded-md ${
                        row.status.includes('tepat') 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {row.status}
                      </span>
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
