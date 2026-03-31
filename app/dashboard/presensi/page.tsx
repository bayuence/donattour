'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/auth-context';

interface PresensiRecord {
  id: string;
  nama: string;
  waktuMasuk: string;
  waktuKeluar: string | null;
  status: 'hadir' | 'izin' | 'sakit' | 'alpha';
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; emoji: string }> = {
  hadir:  { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Hadir',  emoji: '✅' },
  izin:   { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Izin',   emoji: '📝' },
  sakit:  { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Sakit',  emoji: '🤒' },
  alpha:  { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Alpha',  emoji: '❌' },
};

const fmtTime = (s: string) =>
  s ? new Date(s).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '--:--';

export default function PresensiPage() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const [records, setRecords] = useState<PresensiRecord[]>([
    { id: '1', nama: user?.name || 'Admin', waktuMasuk: new Date().toISOString(), waktuKeluar: null, status: 'hadir' },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nama: '', status: 'hadir' as PresensiRecord['status'] });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) return;
    setRecords([...records, {
      id: `pre-${Date.now()}`,
      nama: form.nama,
      waktuMasuk: form.status === 'hadir' ? new Date().toISOString() : '',
      waktuKeluar: null,
      status: form.status,
    }]);
    setForm({ nama: '', status: 'hadir' });
    setShowForm(false);
  };

  const handleClockOut = (id: string) => {
    setRecords(records.map((r) => r.id === id ? { ...r, waktuKeluar: new Date().toISOString() } : r));
  };

  const counts = {
    hadir: records.filter(r => r.status === 'hadir').length,
    izin:  records.filter(r => r.status === 'izin').length,
    sakit: records.filter(r => r.status === 'sakit').length,
    alpha: records.filter(r => r.status === 'alpha').length,
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">📋 Presensi</h2>
          <p className="text-xs text-gray-400 mt-0.5">{today}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition
            ${showForm ? 'bg-gray-100 text-gray-600' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
        >
          {showForm ? 'Batal' : '+ Tambah'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {Object.entries(counts).map(([key, val]) => {
          const s = STATUS_STYLES[key];
          return (
            <div key={key} className={`${s.bg} rounded-2xl p-3 text-center`}>
              <p className="text-xl">{s.emoji}</p>
              <p className={`text-xl font-bold ${s.text}`}>{val}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-4 mb-4 space-y-3">
          <h3 className="font-bold text-gray-800">Tambah Presensi</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Karyawan</label>
            <input
              type="text"
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Nama lengkap"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <div className="grid grid-cols-4 gap-2">
              {(['hadir', 'izin', 'sakit', 'alpha'] as const).map((s) => {
                const st = STATUS_STYLES[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, status: s })}
                    className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition
                      ${form.status === s ? `${st.bg} ${st.text} border-current` : 'border-gray-200 text-gray-500'}`}
                  >
                    {st.emoji}<br />{st.label}
                  </button>
                );
              })}
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm transition"
          >
            Simpan
          </button>
        </form>
      )}

      {/* Record List — Cards (mobile-friendly) */}
      <div className="space-y-2">
        {records.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">Belum ada presensi</div>
        )}
        {records.map((r) => {
          const st = STATUS_STYLES[r.status];
          return (
            <div key={r.id} className="bg-white rounded-2xl shadow px-4 py-3 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${st.bg}`}>
                {st.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{r.nama}</p>
                <p className="text-xs text-gray-400">
                  {r.waktuMasuk ? `Masuk ${fmtTime(r.waktuMasuk)}` : ''}
                  {r.waktuKeluar ? ` · Keluar ${fmtTime(r.waktuKeluar)}` : r.status === 'hadir' ? ' · Belum keluar' : ''}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.text}`}>
                  {st.label}
                </span>
                {r.status === 'hadir' && !r.waktuKeluar && (
                  <button
                    onClick={() => handleClockOut(r.id)}
                    className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium hover:bg-red-200"
                  >
                    Clock Out
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
