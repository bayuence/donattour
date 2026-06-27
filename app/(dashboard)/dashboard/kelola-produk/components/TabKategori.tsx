"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { upsertCategory, deleteCategory } from "@/lib/db";
import type { ProductCategory } from "@/lib/types";
import { refreshCatalogCache } from "@/lib/offline/auto-seed";

interface TabKategoriProps {
  jenisList: ProductCategory[];
  refreshData: () => Promise<void>;
}

interface KategoriForm {
  nama: string;
  sort_order: number;
  is_donat: boolean;
}

const blankForm = (): KategoriForm => ({
  nama: "",
  sort_order: 0,
  is_donat: true,
});

export function TabKategori({ jenisList, refreshData }: TabKategoriProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<KategoriForm>(blankForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(blankForm());
  };

  const openEdit = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setForm({
      nama: cat.nama,
      sort_order: cat.sort_order ?? 0,
      is_donat: cat.is_donat !== false,
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      toast.error("Nama kategori wajib diisi");
      return;
    }
    setIsSaving(true);
    try {
      const ok = await upsertCategory({
        id: editingId || undefined,
        nama: form.nama.trim(),
        icon: "amber",
        sort_order: Number(form.sort_order),
        is_donat: form.is_donat,
      });
      if (ok) {
        toast.success(
          editingId ? "Kategori diperbarui ✓" : "Kategori ditambahkan ✓",
        );
        resetForm();
        await refreshData();
        // Refresh cache PGLite agar kasir PWA langsung dapat data terbaru
        refreshCatalogCache().catch(console.error);
      } else {
        toast.error("Gagal menyimpan kategori");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cat: ProductCategory) => {
    try {
      const ok = await deleteCategory(cat.id);
      if (ok) {
        toast.success(`"${cat.nama}" dihapus`);
        setDeleteConfirm(null);
        await refreshData();
      } else {
        toast.error("Gagal menghapus kategori");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  const totalDonat = jenisList.filter((c) => c.is_donat !== false).length;
  const totalNonDonat = jenisList.filter((c) => c.is_donat === false).length;

  return (
    <div className="space-y-5">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Manajemen Kategori
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {jenisList.length} kategori · {totalDonat} donat · {totalNonDonat}{" "}
            non-donat
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-2xl font-black text-sm hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap"
        >
          <Plus size={15} />
          Tambah Kategori
        </button>
      </div>

      {/* ── Inline Form ── */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
                {editingId ? (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                  </svg>
                ) : (
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-black text-slate-800">
                {editingId ? "Edit Kategori" : "Tambah Kategori Baru"}
              </span>
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 transition-all"
            >
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
              {/* Nama */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block">
                  Nama Kategori *
                </label>
                <input
                  value={form.nama}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nama: e.target.value }))
                  }
                  placeholder="Cth: Donat Klasik"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100/50 transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300"
                />
              </div>

              {/* Urutan */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block">
                  Urutan Tampil
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      sort_order: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100/50 transition-all text-sm font-semibold text-slate-800"
                />
              </div>

              {/* Tipe */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block">
                  Tipe Kategori
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, is_donat: true }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 text-xs font-bold transition-all ${
                      form.is_donat
                        ? "border-amber-400 bg-amber-50 text-amber-700"
                        : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${form.is_donat ? "bg-amber-500" : "bg-slate-300"}`}
                    />
                    Donat
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, is_donat: false }))}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 text-xs font-bold transition-all ${
                      !form.is_donat
                        ? "border-blue-400 bg-blue-50 text-blue-700"
                        : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${!form.is_donat ? "bg-blue-500" : "bg-slate-300"}`}
                    />
                    Non-Donat
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl border-2 border-slate-100 text-slate-600 font-black text-sm hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-7 py-2.5 rounded-xl bg-amber-500 text-white font-black text-sm hover:bg-amber-600 active:scale-95 transition-all shadow-md shadow-amber-500/20 disabled:opacity-60 flex items-center gap-2"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                {isSaving
                  ? "Menyimpan..."
                  : editingId
                    ? "Simpan Perubahan"
                    : "Simpan Kategori"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Kategori Grid ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* List header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Daftar Kategori
          </h3>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              {totalDonat} Donat
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {totalNonDonat} Non-Donat
            </span>
          </div>
        </div>

        {/* Empty */}
        {jenisList.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <p className="font-black text-slate-400 text-sm uppercase tracking-widest">
              Belum ada kategori
            </p>
            <p className="text-slate-300 text-xs mt-1.5">
              Klik "Tambah Kategori" untuk mulai
            </p>
          </div>
        )}

        {/* Items */}
        <div className="divide-y divide-slate-50">
          {jenisList
            .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((cat) => (
              <div key={cat.id} className="group">
                <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  {/* Color indicator + type */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      cat.is_donat !== false
                        ? "bg-amber-50 border border-amber-100"
                        : "bg-blue-50 border border-blue-100"
                    }`}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={cat.is_donat !== false ? "#d97706" : "#3b82f6"}
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="font-black text-slate-800 text-sm">
                        {cat.nama}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          cat.is_donat !== false
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}
                      >
                        {cat.is_donat !== false ? "Donat" : "Non-Donat"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Urutan ke-{cat.sort_order ?? 0}
                    </p>
                  </div>

                  {/* Urutan badge */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                      <span className="text-[10px] font-bold text-slate-400">
                        #{cat.sort_order ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Actions — selalu tampil (touch-friendly) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openEdit(cat)}
                      title="Edit"
                      className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-500 text-amber-500 hover:text-white transition-all flex items-center justify-center"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm(
                          deleteConfirm === cat.id ? null : cat.id,
                        )
                      }
                      title="Hapus"
                      className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-500 text-red-400 hover:text-white transition-all flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Inline delete confirm */}
                {deleteConfirm === cat.id && (
                  <div className="mx-6 mb-4 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p className="flex-1 text-sm text-red-700 font-semibold">
                      Hapus <strong>"{cat.nama}"</strong>? Produk yang
                      menggunakan kategori ini perlu diperbarui.
                    </p>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="px-4 py-1.5 bg-red-500 text-white rounded-xl text-xs font-black hover:bg-red-600 transition-all"
                    >
                      Ya, Hapus
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-1.5 bg-white border border-red-200 text-red-500 rounded-xl text-xs font-black hover:bg-red-50 transition-all"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
