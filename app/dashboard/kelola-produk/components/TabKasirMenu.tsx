'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';
import { addKasirMenu, updateKasirMenu, toggleKasirMenu, deleteKasirMenu } from '@/lib/db/kasir-menus';
import type { KasirMenu, Outlet } from '@/lib/types';

// ─── Pilihan Warna ────────────────────────────────────────────

const COLOR_OPTIONS = [
  { id: 'amber',   label: 'Amber',   bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-400'   },
  { id: 'green',   label: 'Hijau',   bg: 'bg-green-100',   text: 'text-green-700',   ring: 'ring-green-400'   },
  { id: 'orange',  label: 'Oranye',  bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-400'  },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-400' },
  { id: 'blue',    label: 'Biru',    bg: 'bg-blue-100',    text: 'text-blue-700',    ring: 'ring-blue-400'    },
  { id: 'violet',  label: 'Ungu',    bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-400'  },
  { id: 'rose',    label: 'Merah',   bg: 'bg-rose-100',    text: 'text-rose-700',    ring: 'ring-rose-400'    },
  { id: 'slate',   label: 'Abu',     bg: 'bg-slate-100',   text: 'text-slate-700',   ring: 'ring-slate-400'   },
];

function getColorClasses(color: string) {
  return COLOR_OPTIONS.find(c => c.id === color) ?? COLOR_OPTIONS[0];
}

// ─── Modal Tambah / Edit ──────────────────────────────────────

interface ModalProps {
  mode: 'tambah' | 'edit';
  initial?: KasirMenu;
  onSave: (data: { nama: string; slug: string; color: string }) => Promise<void>;
  onClose: () => void;
  isSaving: boolean;
}

function KasirMenuModal({ mode, initial, onSave, onClose, isSaving }: ModalProps) {
  const [nama, setNama]     = useState(initial?.nama ?? '');
  const [slug, setSlug]     = useState(initial?.slug ?? '');
  const [color, setColor]   = useState(initial?.color ?? 'amber');
  const [slugEdited, setSlugEdited] = useState(false);

  const handleNamaChange = (v: string) => {
    setNama(v);
    if (!slugEdited) setSlug(v.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
  };

  const handleSlugChange = (v: string) => {
    setSlug(v.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));
    setSlugEdited(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !slug.trim()) return;
    await onSave({ nama: nama.trim(), slug: slug.trim(), color });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl shadow-slate-900/20">
        {/* Header */}
        <div className="flex items-center gap-4 p-6 border-b border-slate-100">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
            <Icons.LayoutGrid size={22} />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800">
              {mode === 'tambah' ? 'Tambah Menu Kasir' : 'Edit Menu Kasir'}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Kanal yang aktif akan tampil di halaman kasir
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
            <Icons.X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Nama */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 block mb-2">
              Nama Menu
            </label>
            <input
              type="text"
              value={nama}
              onChange={e => handleNamaChange(e.target.value)}
              placeholder="Contoh: GrabFood, Bazar, dll"
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:outline-none focus:border-amber-300 text-slate-800 font-semibold text-sm transition-colors"
              required
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 block mb-2">
              Slug / Kode
              <span className="ml-2 text-slate-300 font-medium normal-case tracking-normal">
                (digunakan sebagai ID kanal, huruf kecil/garis bawah)
              </span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => handleSlugChange(e.target.value)}
              placeholder="Contoh: grabfood, bazar"
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:outline-none focus:border-amber-300 text-slate-700 font-mono text-sm transition-colors"
              required
            />
          </div>

          {/* Pilih Warna */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 block mb-3">
              Warna Tema
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`px-3 py-2.5 rounded-xl text-[11px] font-black transition-all ${c.bg} ${c.text} ${color === c.id ? `ring-2 ${c.ring} scale-105` : 'opacity-60 hover:opacity-90'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview Tombol */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Tampilan di Kasir</p>
            <div className="flex gap-2">
              <span className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider ${getColorClasses(color).bg} ${getColorClasses(color).text}`}>
                {nama || 'Nama Menu'}
              </span>
              <span className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider bg-slate-900 text-white">
                Toko
              </span>
              <span className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-400">
                GoFood
              </span>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-slate-100 text-slate-500 font-black text-sm hover:bg-slate-50 transition-all">
              Batal
            </button>
            <button type="submit" disabled={isSaving || !nama.trim() || !slug.trim()}
              className="flex-1 py-3 rounded-2xl bg-amber-500 text-white font-black text-sm hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSaving && <Icons.Loader2 size={16} className="animate-spin" />}
              {mode === 'tambah' ? 'Simpan Menu' : 'Update Menu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

interface Props {
  outlet: Outlet;
  kasirMenus: KasirMenu[];
  refreshData: () => void;
}

export function TabKasirMenu({ outlet, kasirMenus, refreshData }: Props) {
  const [showModal, setShowModal]     = useState<'tambah' | 'edit' | null>(null);
  const [editTarget, setEditTarget]   = useState<KasirMenu | null>(null);
  const [isSaving, setIsSaving]       = useState(false);
  const [togglingId, setTogglingId]   = useState<string | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  // ─── Tambah ──────────────────────────────────────────────────
  const handleTambah = async (payload: { nama: string; slug: string; color: string }) => {
    setIsSaving(true);
    const result = await addKasirMenu(outlet.id, { ...payload, urutan: kasirMenus.length });
    setIsSaving(false);
    if (result.success) {
      toast.success(`Menu "${payload.nama}" berhasil ditambahkan!`, { position: 'top-center' });
      setShowModal(null);
      refreshData();
    } else {
      toast.error(result.error || 'Gagal menambah menu', { position: 'top-center' });
    }
  };

  // ─── Edit ─────────────────────────────────────────────────────
  const handleEdit = async (payload: { nama: string; slug: string; color: string }) => {
    if (!editTarget) return;
    setIsSaving(true);
    const result = await updateKasirMenu(editTarget.id, { nama: payload.nama, color: payload.color });
    setIsSaving(false);
    if (result.success) {
      toast.success(`Menu "${payload.nama}" diperbarui!`, { position: 'top-center' });
      setShowModal(null);
      setEditTarget(null);
      refreshData();
    } else {
      toast.error(result.error || 'Gagal update menu', { position: 'top-center' });
    }
  };

  // ─── Toggle Aktif/Nonaktif ────────────────────────────────────
  const handleToggle = async (menu: KasirMenu) => {
    setTogglingId(menu.id);
    const result = await toggleKasirMenu(menu.id, !menu.is_active);
    setTogglingId(null);
    if (result.success) {
      toast.success(`Menu "${menu.nama}" ${!menu.is_active ? 'diaktifkan' : 'dinonaktifkan'}!`, { position: 'top-center' });
      refreshData();
    } else {
      toast.error(result.error || 'Gagal mengubah status', { position: 'top-center' });
    }
  };

  // ─── Hapus ────────────────────────────────────────────────────
  const handleDelete = async (menu: KasirMenu) => {
    if (!confirm(`Hapus menu "${menu.nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setDeletingId(menu.id);
    const result = await deleteKasirMenu(menu.id);
    setDeletingId(null);
    if (result.success) {
      toast.success(`Menu "${menu.nama}" dihapus!`, { position: 'top-center' });
      refreshData();
    } else {
      toast.error(result.error || 'Gagal menghapus menu', { position: 'top-center' });
    }
  };

  const activeMenus   = kasirMenus.filter(m => m.is_active);
  const inactiveMenus = kasirMenus.filter(m => !m.is_active);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
          <Icons.Info size={20} />
        </div>
        <div>
          <p className="font-black text-amber-800 text-sm">Apa itu Kasir Menu?</p>
          <p className="text-amber-700 text-xs mt-1 leading-relaxed">
            Kasir Menu adalah daftar kanal penjualan yang muncul di halaman kasir <span className="font-black">{outlet.nama}</span>. 
            Aktifkan kanal yang digunakan (misal: Toko, GoFood), dan matikan yang tidak digunakan. 
            Anda juga bisa menambah kanal baru sesuka hati.
          </p>
        </div>
      </div>

      {/* Header + Tombol Tambah */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-800">Daftar Kasir Menu</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            <span className="text-emerald-600 font-black">{activeMenus.length} Aktif</span>
            {' · '}
            <span className="text-slate-400">{inactiveMenus.length} Nonaktif</span>
          </p>
        </div>
        <button
          onClick={() => setShowModal('tambah')}
          className="flex items-center gap-2 px-5 py-3 bg-amber-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
        >
          <Icons.Plus size={16} />
          Tambah Menu
        </button>
      </div>

      {/* Daftar Menu */}
      {kasirMenus.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <Icons.LayoutGrid size={40} className="mx-auto text-slate-300 mb-4" />
          <p className="font-black text-slate-400 text-sm uppercase tracking-widest">Belum Ada Menu Kasir</p>
          <p className="text-slate-300 text-xs mt-2">Klik "Tambah Menu" untuk membuat kanal kasir pertama</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {kasirMenus.map((menu) => {
            const colors = getColorClasses(menu.color);
            const isToggling = togglingId === menu.id;
            const isDeleting = deletingId === menu.id;
            return (
              <div
                key={menu.id}
                className={`bg-white rounded-2xl border-2 transition-all p-4 flex items-center gap-4 ${menu.is_active ? 'border-slate-100 shadow-sm' : 'border-dashed border-slate-200 opacity-60'}`}
              >
                {/* Warna indikator */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}>
                  <Icons.ShoppingBag size={22} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-slate-800 text-sm">{menu.nama}</p>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                      {menu.color}
                    </span>
                    {!menu.is_active && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-400">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">slug: {menu.slug}</p>
                </div>

                {/* Tombol Aksi */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Toggle */}
                  <button
                    onClick={() => handleToggle(menu)}
                    disabled={isToggling}
                    title={menu.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    className={`p-2.5 rounded-xl transition-all ${menu.is_active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                  >
                    {isToggling
                      ? <Icons.Loader2 size={16} className="animate-spin" />
                      : menu.is_active ? <Icons.ToggleRight size={18} /> : <Icons.ToggleLeft size={18} />
                    }
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => { setEditTarget(menu); setShowModal('edit'); }}
                    title="Edit Menu"
                    className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all"
                  >
                    <Icons.Pencil size={15} />
                  </button>

                  {/* Hapus */}
                  <button
                    onClick={() => handleDelete(menu)}
                    disabled={isDeleting}
                    title="Hapus Menu"
                    className="p-2.5 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-all"
                  >
                    {isDeleting
                      ? <Icons.Loader2 size={15} className="animate-spin" />
                      : <Icons.Trash2 size={15} />
                    }
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal === 'tambah' && (
        <KasirMenuModal
          mode="tambah"
          onSave={handleTambah}
          onClose={() => setShowModal(null)}
          isSaving={isSaving}
        />
      )}
      {showModal === 'edit' && editTarget && (
        <KasirMenuModal
          mode="edit"
          initial={editTarget}
          onSave={handleEdit}
          onClose={() => { setShowModal(null); setEditTarget(null); }}
          isSaving={isSaving}
        />
      )}
    </div>
  );
}
