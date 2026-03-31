'use client';

import { useState, useEffect } from 'react';
import * as db from '@/lib/db';
import type { OtrPaket, OtrSession } from '@/lib/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) =>
  new Date(s).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ─── Tab Paket ───────────────────────────────────────────────
function TabPaket() {
  const [paketList, setPaketList] = useState<OtrPaket[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<OtrPaket | null>(null);
  const [form, setForm] = useState({ nama: '', isi: '3', harga: '', deskripsi: '', is_active: true });

  const load = () => db.getAllOtrPaket().then(setPaketList);
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm({ nama: '', isi: '3', harga: '', deskripsi: '', is_active: true }); setShowForm(true); };
  const openEdit = (p: OtrPaket) => { setEditing(p); setForm({ nama: p.nama, isi: String(p.isi), harga: String(p.harga), deskripsi: p.deskripsi ?? '', is_active: p.is_active }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.nama || !form.harga) return alert('Nama dan harga wajib diisi!');
    const data = { nama: form.nama, isi: parseInt(form.isi), harga: parseInt(form.harga), deskripsi: form.deskripsi, is_active: form.is_active };
    if (editing) {
      await db.updateOtrPaket(editing.id, data);
    } else {
      await db.createOtrPaket(data);
    }
    setShowForm(false);
    load();
  };

  const handleToggle = async (p: OtrPaket) => {
    await db.updateOtrPaket(p.id, { is_active: !p.is_active });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus paket ini?')) return;
    await db.deleteOtrPaket(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800">Paket Donat OTR</h2>
        <button onClick={openAdd} className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-600">
          + Tambah Paket
        </button>
      </div>

      <div className="space-y-3">
        {paketList.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl shadow p-4 flex items-center gap-4">
            <div className="text-3xl">{p.isi === 3 ? '🍩🍩🍩' : '🍩🍩🍩🍩🍩🍩'}</div>
            <div className="flex-1">
              <p className="font-bold text-gray-800">{p.nama}</p>
              <p className="text-xs text-gray-400">{p.deskripsi}</p>
              <p className="text-orange-600 font-bold text-sm">{fmt(p.harga)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggle(p)}
                className={`text-xs px-2 py-1 rounded-full font-semibold ${p.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
              >
                {p.is_active ? 'Aktif' : 'Nonaktif'}
              </button>
              <button onClick={() => openEdit(p)} className="text-blue-400 hover:text-blue-600 text-sm px-2">✏️</button>
              <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-600 text-sm px-2">🗑️</button>
            </div>
          </div>
        ))}
        {paketList.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">Belum ada paket</p>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">{editing ? 'Edit Paket' : 'Tambah Paket'}</h3>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nama Paket</label>
              <input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="cth: Paket Isi 3" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Isi (pcs)</label>
                <select value={form.isi} onChange={(e) => setForm({ ...form, isi: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="3">3 pcs</option>
                  <option value="6">6 pcs</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Harga (Rp)</label>
                <input type="number" value={form.harga} onChange={(e) => setForm({ ...form, harga: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="20000" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Deskripsi</label>
              <input value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="opsional" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="aktif" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <label htmlFor="aktif" className="text-sm text-gray-700">Aktif (tampil di Kasir OTR)</label>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-gray-500 font-semibold text-sm">Batal</button>
              <button onClick={handleSave} className="flex-1 bg-orange-500 text-white rounded-xl py-2.5 font-bold text-sm hover:bg-orange-600">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab Sesi ────────────────────────────────────────────────
function TabSesi() {
  const [sessions, setSessions] = useState<OtrSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    db.getOtrSessions().then((s) => { setSessions(s); setLoading(false); });
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>;

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-2">🚐</div>
        <p className="text-sm">Belum ada sesi OTR</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <div key={s.id} className="bg-white rounded-2xl shadow overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`w-2 h-2 rounded-full ${s.status === 'aktif' ? 'bg-green-400' : 'bg-gray-300'}`} />
                <p className="font-semibold text-gray-800 text-sm">{s.karyawan_nama}</p>
                <span className="text-xs text-gray-400">· {s.nopol_mobil}</span>
              </div>
              <p className="text-xs text-gray-400">📍 {s.lokasi_awal} · {fmtDate(s.started_at)}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-orange-600 text-sm">{fmt(s.total_penjualan)}</p>
              <p className={`text-xs font-semibold ${s.status === 'aktif' ? 'text-green-500' : 'text-gray-400'}`}>
                {s.status === 'aktif' ? '🟢 Aktif' : '✅ Selesai'}
              </p>
            </div>
          </button>
          {expanded === s.id && (
            <div className="border-t border-gray-50 px-4 py-3 bg-gray-50 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stok</p>
              {s.stok_bawa.map((sb) => {
                const sisa = sb.jumlah_bawa - sb.jumlah_terjual;
                return (
                  <div key={sb.paket_id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{sb.paket_nama}</span>
                    <span className="text-gray-400">
                      Bawa <strong>{sb.jumlah_bawa}</strong> · Jual <strong className="text-green-600">{sb.jumlah_terjual}</strong> · Sisa <strong className="text-amber-600">{sisa}</strong>
                    </span>
                  </div>
                );
              })}
              {s.ended_at && (
                <p className="text-xs text-gray-400 mt-1">Selesai: {fmtDate(s.ended_at)}</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Tab Mobil ───────────────────────────────────────────────
function TabMobil() {
  const [mobil, setMobil] = useState<{ id: string; nopol: string; nama: string }[]>([]);
  useEffect(() => { db.getOtrMobil().then(setMobil); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-800">Armada Mobil Donat</h2>
        <button className="text-xs text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg">+ Tambah</button>
      </div>
      <div className="space-y-3">
        {mobil.map((m) => (
          <div key={m.id} className="bg-white rounded-2xl shadow px-4 py-3 flex items-center gap-4">
            <span className="text-3xl">🚐</span>
            <div>
              <p className="font-bold text-gray-800">{m.nama}</p>
              <p className="text-sm text-gray-400">{m.nopol}</p>
            </div>
            <span className="ml-auto text-xs bg-green-100 text-green-600 font-semibold px-2 py-1 rounded-full">Siap</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center mt-4">Fitur tambah mobil akan segera hadir</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
const TABS = [
  { key: 'paket', label: '📦 Paket' },
  { key: 'sesi', label: '🚐 Sesi' },
  { key: 'mobil', label: '🚗 Mobil' },
];

export default function KelolaOTRPage() {
  const [tab, setTab] = useState('paket');

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">🚐 Kelola OTR</h1>
        <p className="text-gray-400 text-sm">Manajemen paket, sesi, dan armada Donat OTR</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'paket' && <TabPaket />}
      {tab === 'sesi' && <TabSesi />}
      {tab === 'mobil' && <TabMobil />}
    </div>
  );
}
