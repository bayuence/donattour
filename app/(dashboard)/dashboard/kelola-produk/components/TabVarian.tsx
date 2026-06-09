"use client";

import { useState, useMemo } from "react";
import {
  Pencil,
  Trash2,
  Loader2,
  Plus,
  X,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CurrencyInput } from "@/components/ui/currency-input";
import { toast } from "sonner";
import { upsertProduct, deleteProduct, uploadProductImage } from "@/lib/db";
import type { ProductWithCategory, ProductCategory, Outlet } from "@/lib/types";
import { formatRp } from "./shared";

// ─── Types ────────────────────────────────────────────────────

interface TabVarianProps {
  outlet: Outlet;
  varianList: ProductWithCategory[];
  jenisList: ProductCategory[];
  kasirMenus: any[]; // backward compat, tidak dipakai
  refreshData: () => Promise<void>;
}

interface SizeForm {
  aktif: boolean;
  hpp_base: string; // HPP donat polos / HPP modal (non-donat)
  hpp_topping: string; // biaya topping (donat) / 0 (non-donat)
  harga_jual: string;
}

interface VarianForm {
  nama: string;
  category_id: string;
  image_url: string;
  has_multiple_sizes: boolean;
  standar: SizeForm;
  mini: SizeForm;
}

// ─── Helpers ──────────────────────────────────────────────────

const defaultSize = (aktif = true): SizeForm => ({
  aktif,
  hpp_base: "0",
  hpp_topping: "0",
  harga_jual: "0",
});

const blankForm = (): VarianForm => ({
  nama: "",
  category_id: "",
  image_url: "",
  has_multiple_sizes: false,
  standar: defaultSize(true),
  mini: defaultSize(false),
});

const parseN = (v: string) =>
  Number(
    String(v || "0")
      .replace(/\./g, "")
      .replace(/,/g, ""),
  );

// ─── HPP Calculator Sub-component ─────────────────────────────

interface HPPCalcProps {
  size: "standar" | "mini";
  label: string;
  accent: "amber" | "blue";
  isDonat: boolean;
  isSingleSize: boolean;
  form: SizeForm;
  onUpdate: (field: keyof SizeForm, value: any) => void;
}

function HPPCalc({
  label,
  accent,
  isDonat,
  isSingleSize,
  form: s,
  onUpdate,
}: HPPCalcProps) {
  const hppBase = parseN(s.hpp_base);
  const hppTopping = parseN(s.hpp_topping);
  const hppTotal = isDonat ? hppBase + hppTopping : hppTopping;
  const jual = parseN(s.harga_jual);
  const margin = jual - hppTotal;
  const marginPct = jual > 0 ? ((margin / jual) * 100).toFixed(1) : "0";
  const isProfit = margin >= 0;
  const isAmber = accent === "amber";
  const dim = !s.aktif && !isSingleSize;

  const inputBase = `w-full bg-white text-sm font-semibold text-slate-800 outline-none transition-all
    disabled:bg-slate-50/80 disabled:text-slate-300 disabled:cursor-not-allowed`;
  const ring = isAmber
    ? "border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
    : "border-blue-200  focus:border-blue-500  focus:ring-2 focus:ring-blue-100";

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        isSingleSize
          ? "border-slate-200 shadow-sm"
          : s.aktif
            ? isAmber
              ? "border-amber-200 shadow-sm shadow-amber-50"
              : "border-blue-200  shadow-sm shadow-blue-50"
            : "border-slate-200 opacity-60"
      } ${dim ? "opacity-50" : ""}`}
    >
      {/* Header */}
      {!isSingleSize && (
        <div
          className={`flex items-center justify-between px-5 py-3.5 ${
            isAmber
              ? "bg-amber-50 border-b border-amber-100"
              : "bg-blue-50  border-b border-blue-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2 h-2 rounded-full ${
                isAmber ? "bg-amber-500" : "bg-blue-500"
              }`}
            />
            <span
              className={`text-xs font-black uppercase tracking-widest ${
                isAmber ? "text-amber-700" : "text-blue-700"
              }`}
            >
              {label}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onUpdate("aktif", !s.aktif)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              s.aktif
                ? isAmber
                  ? "bg-amber-500 text-white"
                  : "bg-blue-500 text-white"
                : "bg-white border border-slate-200 text-slate-400 hover:border-slate-300"
            }`}
          >
            <span
              className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                s.aktif ? "border-white/80" : "border-slate-300"
              }`}
            >
              {s.aktif && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isAmber ? "bg-white" : "bg-white"
                  }`}
                />
              )}
            </span>
            {s.aktif ? "Aktif" : "Nonaktif"}
          </button>
        </div>
      )}

      <div className="p-5 space-y-5">
        {/* HPP Section */}
        {isDonat ? (
          <>
            {/* HPP Polos + Topping side-by-side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">
                  HPP Polos
                </label>
                <div
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    s.aktif
                      ? isAmber
                        ? "border-amber-200 focus-within:border-amber-500 bg-white"
                        : "border-blue-200 focus-within:border-blue-500 bg-white"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <span className="text-xs font-black text-slate-400 shrink-0">
                    Rp
                  </span>
                  <CurrencyInput
                    disabled={!s.aktif}
                    value={s.hpp_base}
                    onChange={(e) => onUpdate("hpp_base", e.target.value)}
                    className={`${inputBase} min-w-0`}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 block">
                  + Biaya Topping
                </label>
                <div
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
                    s.aktif
                      ? isAmber
                        ? "border-amber-200 focus-within:border-amber-500 bg-white"
                        : "border-blue-200 focus-within:border-blue-500 bg-white"
                      : "border-slate-100 bg-slate-50"
                  }`}
                >
                  <span className="text-xs font-black text-slate-400 shrink-0">
                    Rp
                  </span>
                  <CurrencyInput
                    disabled={!s.aktif}
                    value={s.hpp_topping}
                    onChange={(e) => onUpdate("hpp_topping", e.target.value)}
                    className={`${inputBase} min-w-0`}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* = Total HPP */}
            <div
              className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                isAmber
                  ? "bg-amber-50 border border-amber-100"
                  : "bg-blue-50 border border-blue-100"
              }`}
            >
              <span className="text-xs text-slate-500">
                {formatRp(hppBase)} <span className="text-slate-400">+</span>{" "}
                {formatRp(hppTopping)} <span className="text-slate-400">=</span>
              </span>
              <span
                className={`text-base font-black ${
                  isAmber ? "text-amber-700" : "text-blue-700"
                }`}
              >
                {formatRp(hppTotal)}
              </span>
            </div>
          </>
        ) : (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 block">
              HPP / Modal
            </label>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 focus-within:border-amber-400 bg-white transition-all">
              <span className="text-xs font-black text-slate-400 shrink-0">
                Rp
              </span>
              <CurrencyInput
                disabled={!s.aktif}
                value={s.hpp_topping}
                onChange={(e) => onUpdate("hpp_topping", e.target.value)}
                className={`${inputBase} min-w-0 disabled:bg-transparent`}
                placeholder="0"
              />
            </div>
          </div>
        )}

        {/* Harga Jual — full width, prominent */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 block">
            Harga Jual
          </label>
          <div
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${
              s.aktif
                ? isAmber
                  ? "border-amber-300 focus-within:border-amber-500 bg-white shadow-sm"
                  : "border-blue-300  focus-within:border-blue-500  bg-white shadow-sm"
                : "border-slate-100 bg-slate-50"
            }`}
          >
            <span className="text-sm font-black text-slate-400 shrink-0">
              Rp
            </span>
            <CurrencyInput
              disabled={!s.aktif}
              value={s.harga_jual}
              onChange={(e) => onUpdate("harga_jual", e.target.value)}
              className={`flex-1 bg-transparent text-lg font-black text-slate-800 outline-none
                disabled:text-slate-300 disabled:cursor-not-allowed min-w-0`}
              placeholder="0"
            />
          </div>
        </div>

        {/* Margin bar */}
        {s.aktif && jual > 0 && (
          <div
            className={`flex items-center justify-between px-4 py-3 rounded-xl ${
              isProfit
                ? "bg-emerald-50 border border-emerald-200"
                : "bg-rose-50   border border-rose-200"
            }`}
          >
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Margin
              </p>
              <p
                className={`text-sm font-black mt-0.5 ${
                  isProfit ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {isProfit ? "+" : ""}
                {formatRp(margin)}
              </p>
            </div>
            <span
              className={`text-2xl font-black ${
                isProfit ? "text-emerald-500" : "text-rose-400"
              }`}
            >
              {isProfit ? "+" : ""}
              {marginPct}%
            </span>
          </div>
        )}
        {/* Placeholder saat margin belum ada agar height konsisten */}
        {s.aktif && jual === 0 && (
          <div className="h-[62px] rounded-xl border border-dashed border-slate-100 flex items-center justify-center">
            <span className="text-xs text-slate-300">
              Isi harga jual untuk lihat margin
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export function TabVarian({
  outlet,
  varianList,
  jenisList,
  refreshData,
}: TabVarianProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editStandarId, setEditStandarId] = useState<string | null>(null);
  const [editMiniId, setEditMiniId] = useState<string | null>(null);
  const [form, setForm] = useState<VarianForm>(blankForm);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Derived ──
  const isCategoryDonat = useMemo(() => {
    const cat = jenisList.find((c) => c.id === form.category_id);
    return cat ? cat.is_donat !== false : true;
  }, [form.category_id, jenisList]);

  // ── Reset ──
  const resetForm = () => {
    setShowForm(false);
    setEditStandarId(null);
    setEditMiniId(null);
    setForm(blankForm());
    setImgFile(null);
    if (imgPreview?.startsWith("blob:")) URL.revokeObjectURL(imgPreview);
    setImgPreview("");
  };

  const updateSize = (
    size: "standar" | "mini",
    field: keyof SizeForm,
    value: any,
  ) => setForm((p) => ({ ...p, [size]: { ...p[size], [field]: value } }));

  // ── Save ──
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.standar.aktif && !form.mini.aktif) {
      toast.error("Minimal satu ukuran harus aktif");
      return;
    }

    setIsSaving(true);
    try {
      let imgUrl = form.image_url;
      if (imgFile) {
        toast.info("Mengunggah foto...", { duration: 3000 });
        const up = await uploadProductImage(imgFile);
        if (up) imgUrl = up;
        else toast.error("Gagal mengunggah gambar");
      }

      const base = {
        nama: form.nama,
        category_id: form.category_id,
        image_url: imgUrl,
        is_donat: isCategoryDonat,
        tipe_produk: isCategoryDonat ? ("donat_varian" as const) : undefined,
        is_active: true,
      };

      // Standar
      if (form.standar.aktif) {
        const r = await upsertProduct({
          ...base,
          id: editStandarId || undefined,
          ukuran: "standar",
          hpp_base_donat: isCategoryDonat ? parseN(form.standar.hpp_base) : 0,
          hpp_topping: parseN(form.standar.hpp_topping),
          harga_jual: parseN(form.standar.harga_jual),
        });
        if (!r) {
          toast.error("Gagal menyimpan ukuran standar");
          setIsSaving(false);
          return;
        }
      } else if (editStandarId) {
        await deleteProduct(editStandarId);
      }

      // Mini
      if (form.mini.aktif) {
        const r = await upsertProduct({
          ...base,
          id: editMiniId || undefined,
          ukuran: "mini",
          hpp_base_donat: isCategoryDonat ? parseN(form.mini.hpp_base) : 0,
          hpp_topping: parseN(form.mini.hpp_topping),
          harga_jual: parseN(form.mini.harga_jual),
        });
        if (!r) {
          toast.error("Gagal menyimpan ukuran mini");
          setIsSaving(false);
          return;
        }
      } else if (editMiniId) {
        await deleteProduct(editMiniId);
      }

      toast.success(
        editStandarId || editMiniId
          ? "Produk berhasil diperbarui ✓"
          : "Produk baru ditambahkan ✓",
      );
      resetForm();
      await refreshData();
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan saat menyimpan");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Grouping ──
  const grouped = useMemo(() => {
    const map = new Map<string, any>();
    varianList.forEach((v) => {
      const k = `${v.nama}__${v.category_id}`;
      if (!map.has(k))
        map.set(k, {
          nama: v.nama,
          category_id: v.category_id || "",
          category: v.category,
          image_url: v.image_url || "",
        });
      const e = map.get(k)!;
      if (v.ukuran === "standar") e.standar = v;
      if (v.ukuran === "mini") e.mini = v;
    });
    return Array.from(map.values());
  }, [varianList]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return grouped;
    const q = searchQuery.toLowerCase();
    return grouped.filter(
      (v) =>
        v.nama.toLowerCase().includes(q) ||
        v.category?.nama?.toLowerCase().includes(q),
    );
  }, [grouped, searchQuery]);

  // ── Open Edit ──
  const openEdit = (v: any) => {
    const { standar, mini } = v;
    const hasS = !!standar,
      hasM = !!mini;

    setEditStandarId(standar?.id || null);
    setEditMiniId(mini?.id || null);

    // Baca hpp dari field baru (hpp_base_donat + hpp_topping)
    // Fallback ke field lama (harga_pokok_penjualan) untuk data legacy
    setForm({
      nama: v.nama,
      category_id: v.category_id || "",
      image_url: v.image_url || "",
      has_multiple_sizes: hasM,
      standar: {
        aktif: hasS,
        hpp_base: String(standar?.hpp_base_donat ?? 0),
        hpp_topping: String(
          standar?.hpp_topping ?? standar?.harga_pokok_penjualan ?? 0,
        ),
        harga_jual: String(standar?.harga_jual ?? 0),
      },
      mini: {
        aktif: hasM,
        hpp_base: String(mini?.hpp_base_donat ?? 0),
        hpp_topping: String(
          mini?.hpp_topping ?? mini?.harga_pokok_penjualan ?? 0,
        ),
        harga_jual: String(mini?.harga_jual ?? 0),
      },
    });
    setImgPreview(v.image_url || "");
    setShowForm(true);
  };

  // ── Delete ──
  const handleDelete = async (v: any) => {
    try {
      if (v.standar?.id) await deleteProduct(v.standar.id);
      if (v.mini?.id) await deleteProduct(v.mini.id);
      toast.success(`"${v.nama}" berhasil dihapus`);
      setDeleteConfirm(null);
      await refreshData();
    } catch {
      toast.error("Gagal menghapus produk");
    }
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama produk atau kategori..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
          />
        </div>
        {/* Add button */}
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-2xl font-black text-sm hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap"
        >
          <Plus size={15} />
          Tambah Produk
        </button>
      </div>

      {/* ── Product List ── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* List header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
              Daftar Produk & Varian
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {grouped.length} produk · {varianList.length} varian ·{" "}
              <span className="text-amber-600 font-bold">{outlet.nama}</span>
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${
              varianList.length > 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-slate-50 text-slate-400"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${varianList.length > 0 ? "bg-emerald-500" : "bg-slate-300"}`}
            />
            {varianList.length > 0 ? `${varianList.length} aktif` : "Kosong"}
          </span>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
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
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
            </div>
            <p className="font-black text-slate-400 text-sm uppercase tracking-widest">
              {searchQuery ? "Tidak ada hasil" : "Belum ada produk"}
            </p>
            <p className="text-slate-300 text-xs mt-1.5">
              {searchQuery
                ? `Tidak ditemukan untuk "${searchQuery}"`
                : 'Klik "Tambah Produk" untuk mulai'}
            </p>
          </div>
        )}

        {/* Items */}
        <div className="divide-y divide-slate-50">
          {filtered.map((v, idx) => {
            const key = `${v.nama}__${idx}`;
            const { standar, mini } = v;

            const hppOf = (p: any) => {
              if (!p) return 0;
              if (p.hpp_base_donat !== undefined || p.hpp_topping !== undefined)
                return (p.hpp_base_donat || 0) + (p.hpp_topping || 0);
              return p.harga_pokok_penjualan || 0;
            };

            return (
              <div key={key} className="group">
                <div className="flex items-start gap-4 px-6 py-5 hover:bg-slate-50/50 transition-colors">
                  {/* Foto */}
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shrink-0">
                    {v.image_url ? (
                      <img
                        src={v.image_url}
                        alt={v.nama}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#cbd5e1"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    {/* Nama + Kategori */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-slate-800 text-sm">
                        {v.nama}
                      </p>
                      {v.category && (
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                          {v.category.nama}
                        </span>
                      )}
                    </div>

                    {/* Size cards */}
                    <div className="flex flex-wrap gap-2">
                      {standar && (
                        <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-sm text-[10px]">
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          <span className="font-black text-amber-600 uppercase">
                            Standar
                          </span>
                          <span className="text-slate-200">|</span>
                          <span className="text-slate-500">
                            HPP{" "}
                            <span className="font-bold text-slate-700">
                              {formatRp(hppOf(standar))}
                            </span>
                          </span>
                          <span className="text-slate-200">→</span>
                          <span className="font-black text-slate-800">
                            {formatRp(standar.harga_jual)}
                          </span>
                          {standar.margin_percent != null && (
                            <span
                              className={`font-black px-1.5 py-0.5 rounded-lg ${standar.margin_percent >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}
                            >
                              {standar.margin_percent >= 0 ? "+" : ""}
                              {Number(standar.margin_percent).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      )}
                      {mini && (
                        <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-sm text-[10px]">
                          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                          <span className="font-black text-slate-500 uppercase">
                            Mini
                          </span>
                          <span className="text-slate-200">|</span>
                          <span className="text-slate-500">
                            HPP{" "}
                            <span className="font-bold text-slate-700">
                              {formatRp(hppOf(mini))}
                            </span>
                          </span>
                          <span className="text-slate-200">→</span>
                          <span className="font-black text-slate-800">
                            {formatRp(mini.harga_jual)}
                          </span>
                          {mini.margin_percent != null && (
                            <span
                              className={`font-black px-1.5 py-0.5 rounded-lg ${mini.margin_percent >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}
                            >
                              {mini.margin_percent >= 0 ? "+" : ""}
                              {Number(mini.margin_percent).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(v)}
                      title="Edit"
                      className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-500 text-amber-500 hover:text-white transition-all flex items-center justify-center"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteConfirm(deleteConfirm === key ? null : key)
                      }
                      title="Hapus"
                      className="w-9 h-9 rounded-xl bg-red-50 hover:bg-red-500 text-red-400 hover:text-white transition-all flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Inline delete confirm */}
                {deleteConfirm === key && (
                  <div className="mx-6 mb-4 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl">
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
                      Hapus <strong>"{v.nama}"</strong>? Semua ukurannya akan
                      terhapus.
                    </p>
                    <button
                      onClick={() => handleDelete(v)}
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

      {/* ── Add/Edit Dialog ── */}
      <Dialog
        open={showForm}
        onOpenChange={(o) => {
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] overflow-y-auto p-0 bg-white border-0 shadow-2xl rounded-2xl gap-0">
          <form onSubmit={handleSave} className="flex flex-col min-h-0">
            {/* ── Modal Header ── */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10">
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
                  {editStandarId || editMiniId
                    ? "Edit Produk"
                    : "Tambah Produk Baru"}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-400 mt-1">
                  HPP dihitung per item — setiap produk punya rincian biayanya
                  sendiri
                </DialogDescription>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-500 transition-all shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-8 space-y-10">
              {/* ── Step 1: Identitas Produk ── */}
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-7 h-7 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                    1
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">
                    Identitas Produk
                  </h4>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Nama */}
                  <div className="lg:col-span-2 space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">
                      Nama Produk *
                    </label>
                    <input
                      value={form.nama}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, nama: e.target.value }))
                      }
                      className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100/50 transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-300"
                      placeholder="Cth: Donat Coklat Premium"
                      required
                    />
                  </div>

                  {/* Kategori */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">
                      Kategori *
                    </label>
                    <select
                      value={form.category_id}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, category_id: e.target.value }))
                      }
                      className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100/50 transition-all text-sm font-semibold text-slate-800 appearance-none"
                      required
                    >
                      <option value="">Pilih Kategori</option>
                      {jenisList.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Foto */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 block">
                      Foto Produk
                    </label>
                    <label className="flex items-center gap-3 px-4 py-3.5 bg-slate-50 border-2 border-slate-100 border-dashed rounded-2xl cursor-pointer hover:border-amber-300 hover:bg-amber-50/30 transition-all">
                      {imgPreview ? (
                        <img
                          src={imgPreview}
                          alt="preview"
                          className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <ImageIcon
                          size={18}
                          className="text-slate-300 shrink-0"
                        />
                      )}
                      <span className="text-xs text-slate-400 truncate flex-1">
                        {imgFile ? imgFile.name : "Klik untuk upload"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setImgFile(f);
                          setImgPreview(URL.createObjectURL(f));
                        }}
                      />
                    </label>
                  </div>
                </div>
              </section>

              {/* ── Step 2: Konfigurasi Ukuran (non-donat only) ── */}
              {!isCategoryDonat && (
                <section>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-7 h-7 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                      2
                    </div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">
                      Konfigurasi Ukuran
                    </h4>
                    <div className="flex-1 h-px bg-slate-100" />
                  </div>
                  <div className="flex items-center gap-5 p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        const v = !form.has_multiple_sizes;
                        setForm((p) => ({
                          ...p,
                          has_multiple_sizes: v,
                          mini: { ...p.mini, aktif: v },
                        }));
                      }}
                      className={`w-14 h-7 rounded-full transition-all relative shrink-0 ${
                        form.has_multiple_sizes ? "bg-blue-500" : "bg-slate-200"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                          form.has_multiple_sizes ? "left-8" : "left-1"
                        }`}
                      />
                    </button>
                    <div>
                      <p className="text-sm font-black text-slate-800">
                        Produk punya beberapa ukuran?
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Aktifkan jika ada variasi seperti Regular / Large /
                        Jumbo
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* ── Step 3: HPP & Harga ── */}
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-7 h-7 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                    {!isCategoryDonat ? "3" : "2"}
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-widest text-slate-800">
                    {isCategoryDonat
                      ? "HPP Per Item & Harga Jual"
                      : "Modal & Harga Jual"}
                  </h4>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {isCategoryDonat && (
                  <div className="flex items-center gap-3 mb-5 px-5 py-3.5 bg-amber-50 border border-amber-200 rounded-2xl">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className="text-xs text-amber-700 font-semibold">
                      HPP dihitung per item:{" "}
                      <strong>HPP Polos + Topping = Total HPP</strong> — setiap
                      produk rinci, tidak lagi universal.
                    </p>
                  </div>
                )}

                <div
                  className={`grid gap-4 ${
                    isCategoryDonat || form.has_multiple_sizes
                      ? "grid-cols-1 md:grid-cols-2"
                      : "grid-cols-1 max-w-lg"
                  }`}
                >
                  <HPPCalc
                    size="standar"
                    label="Ukuran Standar"
                    accent="amber"
                    isDonat={isCategoryDonat}
                    isSingleSize={!isCategoryDonat && !form.has_multiple_sizes}
                    form={form.standar}
                    onUpdate={(f, v) => updateSize("standar", f, v)}
                  />
                  {(isCategoryDonat || form.has_multiple_sizes) && (
                    <HPPCalc
                      size="mini"
                      label="Ukuran Mini"
                      accent="blue"
                      isDonat={isCategoryDonat}
                      isSingleSize={false}
                      form={form.mini}
                      onUpdate={(f, v) => updateSize("mini", f, v)}
                    />
                  )}
                </div>
              </section>
            </div>

            {/* ── Modal Footer ── */}
            <div className="flex items-center justify-between px-8 py-6 border-t border-slate-100 sticky bottom-0 bg-white/95 backdrop-blur">
              <p className="text-xs text-slate-400">
                {editStandarId || editMiniId
                  ? "Mengedit produk yang sudah ada"
                  : "Produk baru akan langsung aktif"}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 rounded-2xl border-2 border-slate-100 text-slate-600 font-black text-sm hover:bg-slate-50 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-3 rounded-2xl bg-amber-500 text-white font-black text-sm hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-60 flex items-center gap-2.5"
                >
                  {isSaving && <Loader2 size={16} className="animate-spin" />}
                  {isSaving
                    ? "Menyimpan..."
                    : editStandarId || editMiniId
                      ? "Simpan Perubahan"
                      : "Simpan Produk"}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
