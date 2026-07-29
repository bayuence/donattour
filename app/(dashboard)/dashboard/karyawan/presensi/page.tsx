'use client';

import { Users, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function PresensiKaryawanPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center shadow-lg relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-orange-100 rounded-full blur-3xl opacity-60" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-100 rounded-full blur-3xl opacity-60" />

        <div className="relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-orange-500/20">
            <Users className="w-8 h-8 text-white" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-100 mb-4">
            <AlertTriangle className="w-3.5 h-3.5" />
            Dalam Pengembangan
          </span>

          <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-3">
            Presensi Karyawan
          </h1>
          
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Halaman pencatatan kehadiran, absensi, dan jam kerja karyawan sedang disiapkan dan akan segera tersedia.
          </p>

          <Link
            href="/dashboard/laporan-harian-outlet"
            className="inline-flex items-center justify-center px-6 py-3 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-sm"
          >
            Kembali ke Laporan Harian
          </Link>
        </div>
      </div>
    </div>
  );
}
