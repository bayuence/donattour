'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import * as db from '@/lib/db';
import type { OtrSession } from '@/lib/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function StokOTRPage() {
  const { user } = useAuth();
  const [session, setSession] = useState<OtrSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    db.getActiveOtrSession(user.id).then((s) => {
      setSession(s);
      setLoading(false);
    });
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-5xl mb-3">📦</div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Tidak Ada Sesi Aktif</h2>
        <p className="text-gray-400 text-sm">Mulai sesi OTR dulu dari menu <strong>Kasir OTR</strong>.</p>
      </div>
    );
  }

  const totalBawa = session.stok_bawa.reduce((a, s) => a + s.jumlah_bawa, 0);
  const totalTerjual = session.stok_bawa.reduce((a, s) => a + s.jumlah_terjual, 0);
  const totalSisa = totalBawa - totalTerjual;

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">📦 Stok OTR</h1>
        <p className="text-gray-400 text-sm">Sesi aktif sejak {fmtDate(session.started_at)}</p>
      </div>

      {/* Info Sesi */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-5">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Mobil</span>
          <span className="font-semibold text-gray-800">{session.nopol_mobil}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-500">Lokasi Awal</span>
          <span className="font-semibold text-gray-800">{session.lokasi_awal}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-500">Total Penjualan</span>
          <span className="font-bold text-orange-600">{fmt(session.total_penjualan)}</span>
        </div>
      </div>

      {/* Summary Card */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Dibawa', value: totalBawa, color: 'bg-blue-50 text-blue-700' },
          { label: 'Terjual', value: totalTerjual, color: 'bg-green-50 text-green-700' },
          { label: 'Sisa', value: totalSisa, color: 'bg-amber-50 text-amber-700' },
        ].map((c) => (
          <div key={c.label} className={`${c.color} rounded-2xl p-3 text-center`}>
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs font-medium mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Per Paket */}
      <div className="space-y-3">
        {session.stok_bawa.map((s) => {
          const sisa = s.jumlah_bawa - s.jumlah_terjual;
          const persen = s.jumlah_bawa > 0 ? (s.jumlah_terjual / s.jumlah_bawa) * 100 : 0;
          return (
            <div key={s.paket_id} className="bg-white rounded-2xl shadow p-4">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-gray-800">{s.paket_nama}</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${sisa === 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {sisa === 0 ? 'HABIS' : `Sisa ${sisa}`}
                </span>
              </div>
              {/* Progress */}
              <div className="w-full bg-gray-100 rounded-full h-2.5 mb-2">
                <div
                  className="bg-orange-400 h-2.5 rounded-full transition-all"
                  style={{ width: `${persen}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Terjual {s.jumlah_terjual} / {s.jumlah_bawa}</span>
                <span>{Math.round(persen)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
