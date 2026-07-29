'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Users, Clock, Calendar, Plane, Shield } from 'lucide-react';

export default function KelolaKaryawanLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Kelola Posisi', href: '/dashboard/kelola-karyawan/kelola-posisi', icon: Shield },
    { name: 'Data Karyawan', href: '/dashboard/kelola-karyawan/karyawan', icon: Users },
    { name: 'Presensi', href: '/dashboard/kelola-karyawan/kelola-presensi', icon: Clock },
    { name: 'Jadwal Shift', href: '/dashboard/kelola-karyawan/kelola-jadwal', icon: Calendar },
    { name: 'Pengajuan Cuti', href: '/dashboard/kelola-karyawan/kelola-cuti', icon: Plane },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Manajemen Karyawan
          </h2>
          <p className="text-sm text-slate-500 mt-1">Kelola data pegawai, presensi, jadwal shift, dan pengajuan cuti.</p>
        </div>
      </div>

      {/* NAVBAR MENU */}
      <div className="flex overflow-x-auto scrollbar-none border-b border-slate-200">
        <nav className="flex gap-6 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href || (pathname === '/dashboard/kelola-karyawan' && tab.href === '/dashboard/kelola-karyawan/karyawan');
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* RENDER ACTIVE TAB CONTENT */}
      <div className="animate-in fade-in duration-300">
        {children}
      </div>
    </div>
  );
}
