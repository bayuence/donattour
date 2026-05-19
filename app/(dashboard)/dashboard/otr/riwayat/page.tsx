'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import * as db from '@/lib/db';
import type { OtrSession, OtrTransaksi } from '@/lib/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function RiwayatOTRPage() {
  const { user } = useAuth();
  const [session, setSession] = useState<OtrSession | null>(null);
  const [transaksi, setTransaksi] = useState<OtrTransaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const s = await db.getActiveOtrSession(user.id);
      setSession(s);
      if (s) {
        const trx = await db.getOtrTransaksiBySession(s.id);
        setTransaksi(trx.reverse());
      }
      setLoading(false);
    };
    load();
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
        <div className="text-5xl mb-3">🧾</div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">Tidak Ada Sesi Aktif</h2>
        <p className="text-gray-400 text-sm">Mulai sesi OTR dulu dari menu <strong>Kasir OTR</strong>.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">🧾 Riwayat OTR</h1>
        <p className="text-gray-400 text-sm">{transaksi.length} transaksi • Total {fmt(session.total_penjualan)}</p>
      </div>

      {transaksi.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-2">🍩</div>
          <p className="text-sm">Belum ada transaksi sesi ini</p>
        </div>
      ) : (
        <div className="space-y-2">
          {transaksi.map((trx) => (
            <div key={trx.id} className="bg-white rounded-2xl shadow overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === trx.id ? null : trx.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{trx.nomor_transaksi}</p>
                  <p className="text-xs text-gray-400">{fmtDate(trx.created_at)} · {trx.metode_bayar === 'tunai' ? '💵 Tunai' : '📲 Transfer'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-600">{fmt(trx.total)}</p>
                  <p className="text-xs text-gray-300">{expanded === trx.id ? '▲' : '▼'}</p>
                </div>
              </button>
              {expanded === trx.id && (
                <div className="border-t border-gray-50 px-4 py-3 bg-gray-50">
                  {trx.items.map((item) => (
                    <div key={item.paket_id} className="flex justify-between text-sm py-1">
                      <span className="text-gray-600">{item.paket_nama} × {item.jumlah}</span>
                      <span className="font-medium text-gray-800">{fmt(item.subtotal)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-sm">
                    <span>Total</span>
                    <span className="text-orange-600">{fmt(trx.total)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
