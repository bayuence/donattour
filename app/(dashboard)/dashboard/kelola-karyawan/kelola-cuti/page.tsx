'use client';

import { useState } from 'react';
import { ArrowLeft, Plane, Search, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function KelolaCutiPage() {
  const [search, setSearch] = useState('');
  
  // Mock data cuti
  const mockLeaves = [
    { id: 1, nama: 'ence', tipe: 'Cuti Tahunan', tanggal: '25 - 26 Juli 2026', keterangan: 'Acara pernikahan keluarga di luar kota', status: 'Menunggu Persetujuan' },
    { id: 2, nama: 'siti', tipe: 'Izin Sakit', tanggal: '17 Juli 2026', keterangan: 'Demam tinggi dan butuh istirahat dokter', status: 'Disetujui' },
    { id: 3, nama: 'joni', tipe: 'Cuti Melahirkan', tanggal: '01 Juli - 01 Oktober 2026', keterangan: 'Persalinan anak pertama', status: 'Disetujui' },
  ];

  return (
    <div className="space-y-6">

      {/* Info Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800">
          <p className="font-bold mb-1">Status Modul: Sedang dalam Pengembangan</p>
          <p>Karyawan akan mengajukan cuti dari portal menu karyawan, lalu notifikasi keputusan akan terkirim secara otomatis.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
        <input 
          type="text" 
          placeholder="Cari pengajuan nama staf..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
        />
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b">
              <tr>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Jenis Izin</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Keterangan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Keputusan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {mockLeaves
                .filter(item => item.nama.toLowerCase().includes(search.toLowerCase()))
                .map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{row.nama}</td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-600">{row.tipe}</td>
                    <td className="px-6 py-4 text-xs">{row.tanggal}</td>
                    <td className="px-6 py-4 text-xs">{row.keterangan}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2.5 py-1 border rounded-md ${
                        row.status.includes('Persetujuan') 
                          ? 'bg-amber-50 text-amber-700 border-amber-200' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right gap-1.5 inline-flex justify-end w-full">
                      {row.status.includes('Persetujuan') ? (
                        <>
                          <Button size="sm" variant="outline" className="text-emerald-600 hover:text-emerald-700 border-emerald-200 py-1 px-2.5 h-7 text-xs">Setujui</Button>
                          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700 border-red-200 py-1 px-2.5 h-7 text-xs">Tolak</Button>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 font-bold">Selesai</span>
                      )}
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
