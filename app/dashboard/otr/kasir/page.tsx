'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import * as db from '@/lib/db';
import type { OtrPaket, OtrSession, OtrTransaksiItem } from '@/lib/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// ─── Mulai Sesi ──────────────────────────────────────────────
function MulaiSesi({
  paketList,
  mobil,
  user,
  onStart,
}: {
  paketList: OtrPaket[];
  mobil: { id: string; nopol: string; nama: string }[];
  user: { id: string; name: string };
  onStart: (session: OtrSession) => void;
}) {
  const [nopol, setNopol] = useState(mobil[0]?.nopol ?? '');
  const [lokasi, setLokasi] = useState('');
  const [stok, setStok] = useState<Record<string, number>>(
    Object.fromEntries(paketList.map((p) => [p.id, 0]))
  );
  const [loading, setLoading] = useState(false);

  const totalPaket = Object.values(stok).reduce((a, b) => a + b, 0);

  const handleStart = async () => {
    if (!lokasi.trim()) return alert('Isi lokasi awal dulu!');
    if (totalPaket === 0) return alert('Isi stok minimal 1 paket!');
    setLoading(true);
    const session = await db.startOtrSession({
      karyawan_id: user.id,
      karyawan_nama: user.name,
      nopol_mobil: nopol,
      lokasi_awal: lokasi,
      stok_bawa: Object.entries(stok)
        .filter(([, j]) => j > 0)
        .map(([paket_id, jumlah]) => ({ paket_id, jumlah })),
    });
    setLoading(false);
    if (session) {
      onStart(session);
    } else {
      alert('Gagal memulai sesi OTR.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🚐</div>
          <h1 className="text-2xl font-bold text-gray-900">Mulai OTR</h1>
          <p className="text-gray-500 text-sm">Halo, <strong>{user.name}</strong> — isi info sebelum berangkat</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5 space-y-4">
          {/* Pilih Mobil */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Pilih Mobil</label>
            <select
              value={nopol}
              onChange={(e) => setNopol(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {mobil.map((m) => (
                <option key={m.id} value={m.nopol}>
                  {m.nama} — {m.nopol}
                </option>
              ))}
            </select>
          </div>

          {/* Lokasi */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Lokasi Awal</label>
            <input
              type="text"
              placeholder="cth: Jl. Sudirman, depan BCA"
              value={lokasi}
              onChange={(e) => setLokasi(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Stok Bawa */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Stok yang Dibawa</label>
            <div className="space-y-2">
              {paketList.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-orange-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{p.nama}</p>
                    <p className="text-xs text-gray-400">{fmt(p.harga)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStok((prev) => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] ?? 0) - 1) }))}
                      className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 text-lg leading-none flex items-center justify-center"
                    >−</button>
                    <span className="w-8 text-center font-bold text-gray-800">{stok[p.id] ?? 0}</span>
                    <button
                      onClick={() => setStok((prev) => ({ ...prev, [p.id]: (prev[p.id] ?? 0) + 1 }))}
                      className="w-8 h-8 rounded-full bg-orange-500 text-white font-bold hover:bg-orange-600 text-lg leading-none flex items-center justify-center"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition text-base disabled:opacity-50"
          >
            {loading ? 'Memulai...' : '🚀 Berangkat OTR!'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Mode Jual ───────────────────────────────────────────────
function ModeJual({
  session,
  paketList,
  onSelesai,
}: {
  session: OtrSession;
  paketList: OtrPaket[];
  onSelesai: () => void;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [metode, setMetode] = useState<'tunai' | 'transfer'>('tunai');
  const [showBayar, setShowBayar] = useState(false);
  const [uangDiterima, setUangDiterima] = useState('');
  const [lastReceipt, setLastReceipt] = useState<{ nomor: string; total: number; kembalian: number } | null>(null);
  const [konfirmSelesai, setKonfirmSelesai] = useState(false);

  const totalItem = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalHarga = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = paketList.find((p) => p.id === id);
    return sum + (p?.harga ?? 0) * qty;
  }, 0);

  const kembalian = metode === 'tunai' ? (parseInt(uangDiterima) || 0) - totalHarga : 0;

  const addToCart = (id: string) => setCart((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  const removeFromCart = (id: string) =>
    setCart((prev) => {
      const next = { ...prev };
      if ((next[id] ?? 0) <= 1) delete next[id];
      else next[id]--;
      return next;
    });
  const clearCart = () => setCart({});

  const handleBayar = async () => {
    if (metode === 'tunai' && parseInt(uangDiterima) < totalHarga) {
      return alert('Uang tidak cukup!');
    }
    const items: OtrTransaksiItem[] = Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const p = paketList.find((p) => p.id === id)!;
        return {
          paket_id: id,
          paket_nama: p.nama,
          jumlah: qty,
          harga_satuan: p.harga,
          subtotal: p.harga * qty,
        };
      });

    const trx = await db.createOtrTransaksi({ session_id: session.id, items, metode_bayar: metode });
    if (trx) {
      setLastReceipt({ nomor: trx.nomor_transaksi, total: trx.total, kembalian });
      setCart({});
      setUangDiterima('');
      setShowBayar(false);
    }
  };

  const handleSelesaiOTR = async () => {
    await db.endOtrSession(session.id);
    onSelesai();
  };

  // Sisa stok per paket
  const sisaStok = (paketId: string) => {
    const s = session.stok_bawa.find((s) => s.paket_id === paketId);
    if (!s) return 0;
    const sudahDiCart = cart[paketId] ?? 0;
    return s.jumlah_bawa - s.jumlah_terjual - sudahDiCart;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-orange-500 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div>
          <p className="font-bold text-sm">🚐 {session.nopol_mobil}</p>
          <p className="text-xs opacity-80">📍 {session.lokasi_awal}</p>
        </div>
        <div className="text-right">
          <p className="text-xs opacity-80">Total Hari Ini</p>
          <p className="font-bold text-sm">{fmt(session.total_penjualan)}</p>
        </div>
      </div>

      {/* Notif receipt */}
      {lastReceipt && (
        <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div className="flex-1">
            <p className="font-semibold text-green-800 text-sm">Transaksi Berhasil!</p>
            <p className="text-xs text-green-600">{lastReceipt.nomor} • {fmt(lastReceipt.total)}</p>
            {lastReceipt.kembalian > 0 && (
              <p className="text-xs text-green-600 font-bold">Kembalian: {fmt(lastReceipt.kembalian)}</p>
            )}
          </div>
          <button onClick={() => setLastReceipt(null)} className="text-green-400 text-lg">✕</button>
        </div>
      )}

      {/* Grid Paket */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {paketList.map((p) => {
          const qty = cart[p.id] ?? 0;
          const sisa = sisaStok(p.id);
          const habis = sisa <= 0;
          return (
            <div
              key={p.id}
              onClick={() => !habis && addToCart(p.id)}
              className={`relative bg-white rounded-2xl shadow p-4 text-center select-none transition-all
                ${habis ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:shadow-md active:scale-95'}`}
            >
              <div className="text-4xl mb-2">{p.isi === 3 ? '🍩🍩🍩' : '🍩🍩🍩🍩🍩🍩'}</div>
              <p className="font-bold text-gray-800">{p.nama}</p>
              <p className="text-xs text-gray-400 mb-1">{p.deskripsi}</p>
              <p className="text-orange-600 font-bold text-lg">{fmt(p.harga)}</p>
              <p className="text-xs text-gray-400">Sisa: {sisa} pcs</p>
              {habis && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70">
                  <span className="text-red-500 font-bold text-sm">HABIS</span>
                </div>
              )}
              {qty > 0 && (
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow">
                  {qty}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cart Summary (tampil kalau ada item) */}
      {totalItem > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 shadow-lg px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs text-gray-400">{totalItem} paket</p>
              <p className="font-bold text-gray-900 text-lg">{fmt(totalHarga)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearCart}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={() => setShowBayar(true)}
                className="px-5 py-2 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600"
              >
                Bayar 💳
              </button>
            </div>
          </div>
          {/* Detail cart */}
          <div className="flex gap-2 overflow-x-auto">
            {Object.entries(cart).map(([id, qty]) => {
              const p = paketList.find((p) => p.id === id);
              if (!p) return null;
              return (
                <div key={id} className="flex-shrink-0 bg-orange-50 rounded-xl px-3 py-1.5 flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-700">{p.nama}</span>
                  <span className="text-xs font-bold text-orange-600">×{qty}</span>
                  <button
                    onClick={() => removeFromCart(id)}
                    className="text-red-400 text-xs hover:text-red-600"
                  >✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tombol Selesai OTR */}
      <div className="p-4 pb-32">
        <button
          onClick={() => setKonfirmSelesai(true)}
          className="w-full border-2 border-red-200 text-red-500 hover:bg-red-50 font-semibold py-3 rounded-xl transition text-sm"
        >
          🏁 Selesai OTR Hari Ini
        </button>
      </div>

      {/* Modal Bayar */}
      {showBayar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 text-center">Pembayaran</h2>
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-3xl font-bold text-orange-600">{fmt(totalHarga)}</p>
            </div>

            {/* Metode */}
            <div className="grid grid-cols-2 gap-2">
              {(['tunai', 'transfer'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetode(m)}
                  className={`py-2.5 rounded-xl font-semibold text-sm transition
                    ${metode === m ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-600'}`}
                >
                  {m === 'tunai' ? '💵 Tunai' : '📲 Transfer'}
                </button>
              ))}
            </div>

            {metode === 'tunai' && (
              <div>
                <label className="text-sm text-gray-600 font-medium mb-1 block">Uang Diterima</label>
                <input
                  type="number"
                  placeholder="Masukkan nominal"
                  value={uangDiterima}
                  onChange={(e) => setUangDiterima(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-400"
                  autoFocus
                />
                {parseInt(uangDiterima) >= totalHarga && (
                  <p className="text-green-600 font-bold text-sm mt-1">
                    Kembalian: {fmt(parseInt(uangDiterima) - totalHarga)}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowBayar(false)}
                className="flex-1 border border-gray-200 rounded-xl py-3 text-gray-500 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleBayar}
                className="flex-1 bg-orange-500 text-white rounded-xl py-3 font-bold hover:bg-orange-600"
              >
                ✅ Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirm Selesai */}
      {konfirmSelesai && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center space-y-4">
            <div className="text-5xl">🏁</div>
            <h2 className="text-xl font-bold text-gray-900">Selesai OTR?</h2>
            <p className="text-gray-500 text-sm">
              Total penjualan hari ini: <strong>{fmt(session.total_penjualan)}</strong>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setKonfirmSelesai(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2.5 text-gray-500 font-semibold"
              >
                Belum
              </button>
              <button
                onClick={handleSelesaiOTR}
                className="flex-1 bg-red-500 text-white rounded-xl py-2.5 font-bold hover:bg-red-600"
              >
                Ya, Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function KasirOTRPage() {
  const { user } = useAuth();
  const [paketList, setPaketList] = useState<OtrPaket[]>([]);
  const [mobil, setMobil] = useState<{ id: string; nopol: string; nama: string }[]>([]);
  const [activeSession, setActiveSession] = useState<OtrSession | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [paket, mob, session] = await Promise.all([
      db.getOtrPaket(),
      db.getOtrMobil(),
      db.getActiveOtrSession(user.id),
    ]);
    setPaketList(paket);
    setMobil(mob);
    setActiveSession(session);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-10 w-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeSession) {
    return (
      <MulaiSesi
        paketList={paketList}
        mobil={mobil}
        user={user}
        onStart={(s) => setActiveSession(s)}
      />
    );
  }

  return (
    <ModeJual
      session={activeSession}
      paketList={paketList}
      onSelesai={() => { setActiveSession(null); load(); }}
    />
  );
}
