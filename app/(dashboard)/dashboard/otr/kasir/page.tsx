'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/context/auth-context';
import * as db from '@/lib/db';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { OtrPaket, OtrSession, OtrTransaksiItem } from '@/lib/types';
import { 
  Truck, 
  MapPin, 
  Package, 
  ShoppingCart, 
  LogOut, 
  ChevronRight, 
  Plus, 
  Minus, 
  ArrowLeft, 
  Check, 
  Banknote, 
  ArrowRight,
  TrendingUp,
  History,
  X,
  CreditCard,
  Briefcase
} from 'lucide-react';

const Icons = {
  Truck,
  MapPin,
  Package,
  ShoppingCart,
  LogOut,
  ChevronRight,
  Plus,
  Minus,
  ArrowLeft,
  Check,
  Banknote,
  ArrowRight,
  TrendingUp,
  History,
  X,
  CreditCard,
  Briefcase
};

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-orange-400/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-amber-500/5 blur-[120px] rounded-full" />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-amber-600 rounded-[32px] flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-orange-500/20 rotate-3 animate-in fade-in zoom-in duration-700">
            <Icons.Truck size={48} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Donattour OTR</h1>
          <p className="text-slate-500 font-medium mt-3 text-sm italic">"Donat Selembut Awan, Keliling Kota"</p>
        </div>

        <div className="bg-white/70 backdrop-blur-3xl rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] p-8 border border-white space-y-6">
          <div className="flex items-center gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100/50">
             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-600 shadow-sm">
                <Icons.Briefcase size={20} strokeWidth={2.5} />
             </div>
             <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Petugas Hari Ini</p>
                <p className="font-bold text-slate-800 text-sm leading-none mt-1">{user.name}</p>
             </div>
          </div>
          {/* Pilih Mobil */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Pilih Armada Mobil</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                <Icons.Truck size={18} strokeWidth={2.5} />
              </div>
              <select
                value={nopol}
                onChange={(e) => setNopol(e.target.value)}
                className="w-full h-14 bg-slate-50 border-transparent focus:border-orange-400 focus:bg-white rounded-2xl transition-all font-bold text-slate-800 appearance-none pl-12 pr-10"
              >
                {mobil.map((m) => (
                  <option key={m.id} value={m.nopol}>
                    {m.nama} — {m.nopol}
                  </option>
                ))}
              </select>
              <Icons.ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 rotate-90" size={18} />
            </div>
          </div>

          {/* Lokasi */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Lokasi Awal Berangkat</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors">
                <Icons.MapPin size={18} strokeWidth={2.5} />
              </div>
              <input
                type="text"
                placeholder="cth: Jl. Sudirman, depan BCA"
                value={lokasi}
                onChange={(e) => setLokasi(e.target.value)}
                className="w-full h-14 bg-slate-50 border-transparent focus:border-orange-400 focus:bg-white rounded-2xl transition-all font-bold text-slate-800 pl-12 placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Stok Bawa */}
          <div className="pt-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Stok yang Dibawa</label>
            <div className="space-y-3">
              {paketList.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="min-w-0">
                    <p className="font-black text-slate-800 text-sm leading-none truncate mb-1">{p.nama}</p>
                    <p className="text-[10px] font-bold text-orange-600">{fmt(p.harga)}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    <button
                      onClick={() => setStok((prev) => ({ ...prev, [p.id]: Math.max(0, (prev[p.id] ?? 0) - 1) }))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm flex items-center justify-center"
                    ><Icons.Minus size={14} /></button>
                    <span className="w-8 text-center font-black text-slate-800 text-sm">{stok[p.id] ?? 0}</span>
                    <button
                      onClick={() => setStok((prev) => ({ ...prev, [p.id]: (prev[p.id] ?? 0) + 1 }))}
                      className="w-8 h-8 rounded-lg bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center font-bold"
                    ><Icons.Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full h-16 bg-slate-900 hover:bg-orange-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-slate-900/10 active:scale-[0.98] disabled:opacity-20 flex items-center justify-center gap-3 text-xs"
          >
            {loading ? 'Memulai Sesi...' : (
              <>
                Siap Berangkat <Icons.ArrowRight size={16} />
              </>
            )}
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 px-5 py-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500 rounded-xl text-white shadow-lg shadow-orange-500/20">
            <Icons.Truck size={18} strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-white text-sm tracking-tight truncate leading-none uppercase">{session.nopol_mobil}</p>
            <div className="flex items-center gap-1.5 mt-1 opacity-60">
               <Icons.MapPin size={10} className="text-orange-400" />
               <p className="text-[9px] font-bold text-white truncate max-w-[120px] uppercase tracking-tighter">{session.lokasi_awal}</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest leading-none mb-1">Omzet Hari Ini</p>
          <p className="font-black text-white text-base leading-none">{fmt(session.total_penjualan || 0)}</p>
        </div>
      </div>

      {/* Notif receipt */}
      {lastReceipt && (
        <div className="mx-4 mt-4 bg-emerald-500 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-top-4 duration-500 shadow-lg shadow-emerald-500/20 text-white">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Icons.Check size={24} />
          </div>
          <div className="flex-1">
            <p className="font-black text-xs uppercase tracking-widest leading-none mb-1">Transaksi Berhasil</p>
            <p className="text-[10px] font-bold opacity-80">{lastReceipt.nomor} • {fmt(lastReceipt.total)}</p>
            {lastReceipt.kembalian > 0 && (
              <p className="text-[10px] font-black mt-0.5">Kembalian: {fmt(lastReceipt.kembalian)}</p>
            )}
          </div>
          <button onClick={() => setLastReceipt(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Icons.X size={18} /></button>
        </div>
      )}

      {/* Grid Paket */}
      <div className="p-5 grid grid-cols-2 gap-4 flex-1">
        {paketList.map((p) => {
          const qty = cart[p.id] ?? 0;
          const sisa = sisaStok(p.id);
          const habis = sisa <= 0;
          return (
            <div
              key={p.id}
              onClick={() => !habis && addToCart(p.id)}
              className={`group relative bg-white rounded-3xl p-5 border-2 transition-all select-none
                ${habis ? 'opacity-40 grayscale pointer-events-none' : 'cursor-pointer hover:border-orange-400 hover:shadow-2xl hover:shadow-orange-200/50 active:scale-[0.95]'}
                ${qty > 0 ? 'border-orange-400 shadow-xl shadow-orange-100' : 'border-slate-50'}`}
            >
              <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600 mb-4 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
                <Icons.Package size={28} />
              </div>
              <h3 className="font-black text-slate-800 text-sm mb-1 leading-tight">{p.nama}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mb-4">{p.deskripsi}</p>
              
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-orange-600">{fmt(p.harga)}</span>
                <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${habis ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                  {habis ? 'Sold Out' : `Sisa ${sisa}`}
                </div>
              </div>

              {qty > 0 && (
                <div className="absolute top-4 right-4 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg animate-in zoom-in duration-300">
                  {qty}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cart Summary (tampil kalau ada item) */}
      {totalItem > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-3xl border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] px-6 py-5 pb-8 lg:pb-5 animate-in slide-in-from-bottom-full duration-500">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Icons.ShoppingCart size={14} className="text-orange-500" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{totalItem} Item Terpilih</p>
              </div>
              <p className="font-black text-slate-800 text-2xl tracking-tighter">{fmt(totalHarga)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearCart}
                className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 hover:bg-red-50 transition-all border border-slate-100"
              >
                <Icons.X size={20} />
              </button>
              <button
                onClick={() => setShowBayar(true)}
                className="h-12 px-8 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl shadow-slate-900/10 active:scale-[0.95] flex items-center gap-2"
              >
                Bayar <CreditCard size={14} />
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
      <div className="p-6 pb-32">
        <button
          onClick={() => setKonfirmSelesai(true)}
          className="w-full h-14 border-2 border-red-100 text-red-500 hover:bg-red-50 font-black uppercase tracking-[0.2em] rounded-2xl transition-all text-[10px] flex items-center justify-center gap-3"
        >
          <Icons.LogOut size={16} /> Akhiri Sesi OTR
        </button>
      </div>

      {/* Modal Bayar */}
      {showBayar && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-8 space-y-8 animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-500">
            <div className="text-center">
              <p className="text-[10px] font-black tracking-[0.2em] text-slate-400 uppercase mb-2">Total Tagihan OTR</p>
              <h2 className="text-4xl font-black text-orange-600 tracking-tighter">{fmt(totalHarga)}</h2>
            </div>
            
            <div className="space-y-6">
              {/* Metode */}
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
                {(['tunai', 'transfer'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMetode(m)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all
                      ${metode === m ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {m === 'tunai' ? <Icons.Banknote size={14} /> : <Icons.CreditCard size={14} />}
                    {m}
                  </button>
                ))}
              </div>

              {metode === 'tunai' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 block">Uang Tunai Diterima</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors font-black">Rp</div>
                    <CurrencyInput
                      placeholder="0"
                      value={uangDiterima}
                      onChange={(e) => setUangDiterima(e.target.value)}
                      className="w-full h-16 bg-slate-50 border-transparent focus:border-orange-400 focus:bg-white rounded-2xl transition-all font-black text-2xl text-slate-800 pl-12 pr-6 appearance-none"
                      autoFocus
                    />
                  </div>
                  {parseInt(uangDiterima) >= totalHarga && (
                    <div className="mt-4 p-4 bg-emerald-50 rounded-2xl flex justify-between items-center border border-emerald-100 animate-in zoom-in-95 duration-300">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Kembalian</p>
                      <p className="text-lg font-black text-emerald-600 leading-none">{fmt(parseInt(uangDiterima) - totalHarga)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBayar(false)}
                className="flex-1 h-16 bg-slate-100 text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl hover:bg-slate-200 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleBayar}
                className="flex-2 h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-orange-600 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2"
              >
                <Icons.Check size={16} /> Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirm Selesai */}
      {konfirmSelesai && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-10 w-full max-w-sm text-center space-y-8 animate-in zoom-in-95 duration-500 shadow-2xl border border-white">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
               <Icons.LogOut size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Akhiri Sesi OTR?</h2>
              <p className="text-slate-500 text-sm mt-2 font-medium">
                Total omzet yang Anda kumpulkan hari ini melalui OTR adalah <span className="text-orange-600 font-black">{fmt(session.total_penjualan || 0)}</span>. Anda yakin ingin mengakhiri sesi?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setKonfirmSelesai(false)}
                className="flex-1 h-14 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-200 transition-all"
              >
                Belum
              </button>
              <button
                onClick={handleSelesaiOTR}
                className="flex-1 h-14 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-600 transition-all shadow-xl shadow-red-500/20"
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
