'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as db from '@/lib/db';
import type { UserWithProfile, Outlet } from '@/lib/types';
import { 
  Users, Shield, Clock, Calendar, Plane, 
  ArrowRight, CheckCircle2, AlertCircle, Loader2,
  Building2, UserCheck, UserX, Sparkles, Activity
} from 'lucide-react';

export default function OverviewKaryawanPage() {
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [fetchedUsers, fetchedOutlets] = await Promise.all([
          db.getUsersDetailed(),
          db.getOutlets()
        ]);
        setUsers(fetchedUsers || []);
        setOutlets(fetchedOutlets || []);
      } catch (err) {
        console.error('Failed to load overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active !== false).length;
  const adminUsers = users.filter(u => (u.role as string) === 'admin' || (u.role as string) === 'owner').length;
  const cashierUsers = users.filter(u => (u.role as string) === 'kasir' || (u.role as string) === 'cashier').length;
  const kitchenUsers = users.filter(u => (u.role as string) === 'bagian_dapur' || (u.role as string) === 'kitchen' || (u.role as string) === 'production_manager').length;

  const quickLinks = [
    { 
      title: 'Kelola Divisi & Peran', 
      desc: 'Atur divisi, peran, jabatan, dan struktur staf', 
      href: '/dashboard/kelola-karyawan/kelola-divisi',
      icon: Shield,
      color: 'bg-indigo-500 text-white',
      badge: `${new Set(users.map(u => u.role)).size} Peran`
    },
    { 
      title: 'Data Karyawan', 
      desc: 'Lihat daftar lengkap & tambah staf baru', 
      href: '/dashboard/kelola-karyawan/karyawan',
      icon: Users,
      color: 'bg-blue-500 text-white',
      badge: `${activeUsers} Aktif`
    },
    { 
      title: 'Presensi Staf', 
      desc: 'Pantau log jam masuk & keluar staf', 
      href: '/dashboard/kelola-karyawan/kelola-presensi',
      icon: Clock,
      color: 'bg-emerald-500 text-white',
      badge: 'Realtime'
    },
    { 
      title: 'Jadwal Shift Staf', 
      desc: 'Kelola pembagian shift outlet', 
      href: '/dashboard/kelola-karyawan/kelola-jadwal',
      icon: Calendar,
      color: 'bg-orange-500 text-white',
      badge: 'Minggu ini'
    },
    { 
      title: 'Kelola Cuti Staf', 
      desc: 'Persetujuan & riwayat pengajuan cuti', 
      href: '/dashboard/kelola-karyawan/kelola-cuti',
      icon: Plane,
      color: 'bg-purple-500 text-white',
      badge: 'Permohonan'
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Memuat overview karyawan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-400/30">
              <Activity className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight">Overview Manajemen Karyawan</h1>
          </div>
          <p className="text-xs text-slate-400">
            Pusat pemantauan cepat tim, posisi jabatan, presensi, shift, dan permohonan cuti.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{totalUsers} Total Anggota Tim</span>
        </div>
      </div>

      {/* KPI METRICS STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Karyawan</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-800">{totalUsers}</span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {activeUsers} Aktif
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Admin & Management</span>
            <Shield className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-800">{adminUsers}</span>
            <span className="text-[10px] text-slate-400">Staf Pengelola</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Staf Kasir</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-800">{cashierUsers}</span>
            <span className="text-[10px] text-slate-400">Garis Depan</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tim Dapur</span>
            <Building2 className="w-4 h-4 text-orange-500" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-800">{kitchenUsers}</span>
            <span className="text-[10px] text-slate-400">Tim Produksi</span>
          </div>
        </div>
      </div>

      {/* QUICK ACCESS MENU CARDS */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
          Akses Cepat & Navigasi Modul
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group bg-white p-5 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${link.color} shadow-sm group-hover:scale-105 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                        {link.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{link.desc}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                    {link.badge}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                  <span>Buka Modul</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* OUTLET SUMMARY */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Distribusi Staf Per Outlet</h2>
          <span className="text-xs text-slate-400">{outlets.length} Outlet Terdaftar</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {outlets.map(outlet => {
            const count = users.filter(u => u.outlet_id === outlet.id).length;
            return (
              <div key={outlet.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 truncate">{outlet.nama}</span>
                </div>
                <span className="text-xs font-bold text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200">
                  {count} Staf
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
