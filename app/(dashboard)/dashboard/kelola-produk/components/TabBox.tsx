"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, X, Loader2 } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { toast } from "sonner";
import { upsertBox, deleteBox } from "@/lib/db";
import type { ProductBox } from "@/lib/types";
import { formatRp } from "./shared";

// ─── Helpers ──────────────────────────────────────────────────

interface BoxForm {
  nama: string;
  kapasitas: string;
  harga_box: string;
  peruntukan: string;
}

const blankForm = (): BoxForm => ({
  nama: "",
  kapasitas: "",
  harga_box: "0",
  peruntukan: "standar",
});

const PERUNTUKAN_OPTIONS = [
  { value: "standar", label: "Donat Standar", color: "amber" },
  { value: "mini", label: "Donat Mini", color: "blue" },
  { value: "non_donat", label: "Non-Donat / Minuman", color: "violet" },
  { value: "universal", label: "Universal (Semua)", color: "emerald" },
] as const;

const peruntukanInfo = (val?: string) =>
  PERUNTUKAN_OPTIONS.find((o) => o.value === val) ?? PERUNTUKAN_OPTIONS[0];

const colorMap: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dot: "bg-blue-500",
  },
  violet: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
  emerald: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
};

// ─── Component ────────────────────────────────────────────────

interface TabBoxProps {
  boxList: ProductBox[];
  refreshData: () => Promise<void>;
}

export function TabBox({ boxList, refreshData }: TabBoxProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<BoxForm>(blankForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(blankForm());
  };

  const openEdit = (b: ProductBox) => {
    setEditingId(b.id);
    setForm({
      nama: b.nama,
      kapasitas: String(b.kapasitas),
      harga_box: String(b.harga_box),
      peruntukan: b.peruntukan || "standar",
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim()) {
      toast.error("Nama kemasan wajib diisi");
      return;
    }
    if (!form.kapasitas || Number(form.kapasitas) < 1) {
      toast.error("Kapasitas harus lebih dari 0");
      return;
    }
    setIsSaving(true);
    try {
      const ok = await upsertBox({
        id: editingId || undefined,
        nama: form.nama.trim(),
        kapasitas: Number(form.kapasitas),
        harga_box: Number(String(form.harga_box).replace(/\./g, "")),
        peruntukan: form.peruntukan,
      });
      if (ok) {
        toast.success(
          editingId ? "Kemasan diperbarui ✓" : "Kemasan ditambahkan ✓",
        );
        resetForm();
        await refreshData();
      } else {
        toast.error("Gagal menyimpan kemasan");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (b: ProductBox) => {
    try {
      const ok = await deleteBox(b.id);
      if (ok) {
        toast.success(`"${b.nama}" dihapus`);
        setDeleteConfirm(null);
        await refreshData();
      } else {
        toast.error("Gagal menghapus kemasan");
      }
    } catch {
      toast.error("Terjadi kesalahan");
    }
  };

  // Hitung per tipe peruntukan
  const counts = PERUNTUKAN_OPTIONS.reduce(
    (acc, o) => {
      acc[o.value] = boxList.filter(
        (b) => (b.peruntukan || "standar") === o.value,
      ).length;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-5">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Master Box & Kemasan
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {boxList.length} kemasan terdaftar · mendukung donat & non-donat
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
          Tambah Kemasan
        </button>
      </div>

      {/* ── Inline Form ── */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
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
                {editingId ? "Edit Kemasan" : "Tambah Kemasan Baru"}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
              {/* Nama */}
              <div className="lg:col-span-1 space-y-2">
                <label className="text-xs font-bold text-slate-500 block">
                  Nama Kemasan *
                </label>
                <input
                  value={form.nama}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nama: e.target.value }))
                  }
                  placeholder="Cth: Box Isi 6, Kantong Plastik"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100/50 transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300"
                />
              </div>

              {/* Kapasitas */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block">
                  Kapasitas (Jumlah Item)
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.kapasitas}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, kapasitas: e.target.value }))
                  }
                  placeholder="Cth: 6"
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100/50 transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300"
                />
              </div>

              {/* Harga */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block">
                  Harga Tambahan Box
                </label>
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus-within:border-amber-400 focus-within:bg-white transition-all">
                  <span className="text-xs font-black text-slate-400 shrink-0">
                    Rp
                  </span>
                  <CurrencyInput
                    value={form.harga_box}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, harga_box: e.target.value }))
                    }
                    className="flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none min-w-0"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Peruntukan */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 block">
                  Peruntukan
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {PERUNTUKAN_OPTIONS.map((o) => {
                    const c = colorMap[o.color];
                    const active = form.peruntukan === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() =>
                          setForm((p) => ({ ...p, peruntukan: o.value }))
                        }
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border-2 text-[10px] font-bold transition-all ${
                          active
                            ? `${c.bg} ${c.text} ${c.border}`
                            : "border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? c.dot : "bg-slate-300"}`}
                        />
                        <span className="truncate">{o.label}</span>
                      </button>
                    );
                  })}
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
                    : "Simpan Kemasan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Box List ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Daftar Kemasan
          </h3>
          {/* Summary badges */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {PERUNTUKAN_OPTIONS.filter((o) => counts[o.value] > 0).map((o) => {
              const c = colorMap[o.color];
              return (
                <span
                  key={o.value}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${c.bg} ${c.text} ${c.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  {counts[o.value]} {o.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Empty */}
        {boxList.length === 0 && (
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
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <p className="font-black text-slate-400 text-sm uppercase tracking-widest">
              Belum ada kemasan
            </p>
            <p className="text-slate-300 text-xs mt-1.5">
              Klik "Tambah Kemasan" untuk mulai
            </p>
          </div>
        )}

        {/* Items */}
        <div className="divide-y divide-slate-50">
          {boxList.map((b) => {
            const pInfo = peruntukanInfo(b.peruntukan);
            const c = colorMap[pInfo.color];

            return (
              <div key={b.id} className="group">
                <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  {/* Icon box */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.bg} border ${c.border}`}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={c.text}
                    >
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                      <line x1="12" y1="22.08" x2="12" y2="12" />
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="font-black text-slate-800 text-sm">
                        {b.nama}
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}
                      >
                        {pInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] text-slate-400">
                        Kapasitas:{" "}
                        <span className="font-bold text-slate-600">
                          {b.kapasitas} item
                        </span>
                      </span>
                      {b.harga_box > 0 && (
                        <>
                          <span className="text-slate-200">·</span>
                          <span className="text-[11px] text-slate-400">
                            +
                            <span className="font-bold text-slate-600">
                              {formatRp(b.harga_box)}
                            </span>
                          </span>
                        </>
                      )}
                      {b.harga_box === 0 && (
                        <>
                          <span className="text-slate-200">·</span>
                          <span className="text-[11px] text-emerald-500 font-bold">
                            Gratis
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Kapasitas pill */}
                  <div className="hidden sm:block shrink-0">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-black ${c.bg} ${c.text} ${c.border}`}
                    >
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="7" width="20" height="14" rx="2" />
                        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                      </svg>
                      {b.kapasitas} pcs
                    </div>
                  </div>

                  {/* Harga pill */}
                  <div className="hidden sm:block shrink-0">
                    <span
                      className={`text-sm font-black ${b.harga_box > 0 ? "text-slate-800" : "text-emerald-600"}`}
                    >
                      {b.harga_box > 0 ? formatRp(b.harga_box) : "Gratis"}
                    </span>
                  </div>

                  {/* Actions — selalu tampil (touch-friendly) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openEdit(b)}
                      title="Edit"
                      className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-500 text-amber-500 hover:text-white transition-all flex items-center justify-center"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm(deleteConfirm === b.id ? null : b.id)
                      }
                      title="Hapus"
                      className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-500 text-red-400 hover:text-white transition-all flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Inline delete confirm */}
                {deleteConfirm === b.id && (
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
                      Hapus <strong>"{b.nama}"</strong>? Paket yang menggunakan
                      kemasan ini akan terpengaruh.
                    </p>
                    <button
                      onClick={() => handleDelete(b)}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
