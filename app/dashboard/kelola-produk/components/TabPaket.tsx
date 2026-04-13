'use client';

import { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { upsertPackage, deletePackage } from '@/lib/db';
import type { ProductPackage, ProductBox, ProductCategory, ProductWithCategory, KasirMenu } from '@/lib/types';
import { inputClass, formatRp } from './shared';

interface TabPaketProps {
  paketList: ProductPackage[];
  boxList: ProductBox[];
  jenisList: ProductCategory[];
  varianList: ProductWithCategory[];
  tambahanList: ProductWithCategory[];
  kasirMenus: KasirMenu[];
  refreshData: () => Promise<void>;
}

type DiskonMode = 'none' | 'persen' | 'nominal';

const defaultForm = () => ({
  nama: '',
  kode: '',
  deskripsi: '',
  category_id: '',
  box_id: '',
  harga_paket: '0',
  diskon_mode: 'none' as DiskonMode,
  diskon_persen: '0',
  diskon_nominal: '0',
  channel_prices: {} as Record<string, string>,
  allowed_extras: [] as string[],
});

export function TabPaket({ paketList, boxList, jenisList, varianList, tambahanList, kasirMenus, refreshData }: TabPaketProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(defaultForm());

  const resetForm = () => { setShowForm(false); setEditingId(null); setForm(defaultForm()); };

  const setField = <K extends keyof ReturnType<typeof defaultForm>>(k: K, v: ReturnType<typeof defaultForm>[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const setChannelPrice = (slug: string, val: string) =>
    setForm(prev => ({ ...prev, channel_prices: { ...prev.channel_prices, [slug]: val } }));

  const toggleExtra = (id: string) =>
    setField('allowed_extras', form.allowed_extras.includes(id)
      ? form.allowed_extras.filter(x => x !== id)
      : [...form.allowed_extras, id]);

  // ── Grouped varian for insight ──
  const groupedVarian = useMemo(() => {
    const map = new Map<string, any>();
    varianList.forEach(v => {
      const key = `${v.nama}_${v.category_id}`;
      if (!map.has(key)) map.set(key, { nama: v.nama, category_id: v.category_id || '', category: v.category, image_url: v.image_url || '' });
      const entry = map.get(key)!;
      if (v.ukuran === 'standar') entry.standar = v;
      if (v.ukuran === 'mini') entry.mini = v;
    });
    return Array.from(map.values());
  }, [varianList]);

  // ── Smart Insight per channel ──
  const insight = useMemo(() => {
    if (!form.category_id || !form.box_id) return null;
    const box = boxList.find(b => b.id === form.box_id);
    if (!box) return null;
    const variantsInCategory = groupedVarian.filter(v => v.category_id === form.category_id && v.standar);
    if (variantsInCategory.length === 0) return { empty: true as const };
    const avgHpp = variantsInCategory.reduce((s, v) => s + (v.standar?.harga_pokok_penjualan || 0), 0) / variantsInCategory.length;
    const avgJual = variantsInCategory.reduce((s, v) => s + (v.standar?.harga_jual || 0), 0) / variantsInCategory.length;
    const totalHpp = avgHpp * box.kapasitas + box.harga_box;
    const totalNormal = avgJual * box.kapasitas + box.harga_box;
    const kategoriNama = variantsInCategory[0].category?.nama || 'Kategori';

    // Per-channel margins
    const channelData = kasirMenus.map(m => {
      const rawPrice = form.channel_prices[m.slug] || form.harga_paket;
      const price = parseInt(rawPrice || '0') || 0;
      const diskon = form.diskon_mode === 'nominal'
        ? parseInt(form.diskon_nominal || '0') || 0
        : form.diskon_mode === 'persen'
          ? Math.round(price * (parseInt(form.diskon_persen || '0') || 0) / 100)
          : 0;
      const finalPrice = price - diskon;
      const profit = finalPrice - totalHpp;
      const margin = totalHpp > 0 ? (profit / totalHpp) * 100 : 0;
      return { nama: m.nama, slug: m.slug, color: m.color, price: finalPrice, profit, margin };
    });

    return { empty: false as const, totalHpp, totalNormal, avgHpp, avgJual, kategoriNama, count: variantsInCategory.length, channelData };
  }, [form, groupedVarian, boxList, kasirMenus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Build channel_prices: only non-empty entries
      const cpParsed: Record<string, number> = {};
      kasirMenus.forEach(m => {
        const v = parseInt(form.channel_prices[m.slug] || '0') || 0;
        if (v > 0) cpParsed[m.slug] = v;
      });
      // If toko pricing is empty, use harga_paket as toko
      if (!cpParsed['toko'] && parseInt(form.harga_paket || '0')) cpParsed['toko'] = parseInt(form.harga_paket);

      const ok = await upsertPackage({
        id: editingId || undefined,
        nama: form.nama,
        kode: form.kode || undefined,
        deskripsi: form.deskripsi || null,
        category_id: form.category_id,
        box_id: form.box_id,
        harga_paket: parseInt(form.harga_paket) || 0,
        diskon_persen: form.diskon_mode === 'persen' ? parseFloat(form.diskon_persen) || 0 : 0,
        diskon_nominal: form.diskon_mode === 'nominal' ? parseInt(form.diskon_nominal) || 0 : 0,
        channel_prices: cpParsed,
        allowed_extras: form.allowed_extras,
        is_active: true,
      });

      if (ok) {
        toast.success(editingId ? 'Paket diperbarui' : 'Paket baru ditambahkan', {
          description: `"${form.nama}" • ${formatRp(parseInt(form.harga_paket) || 0)}`,
        });
        resetForm();
        await refreshData();
      } else {
        toast.error('Gagal menyimpan paket');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menyimpan paket');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (p: ProductPackage) => {
    const cpStr: Record<string, string> = {};
    Object.entries(p.channel_prices || {}).forEach(([k, v]) => { cpStr[k] = String(v); });
    let diskon_mode: DiskonMode = 'none';
    let diskon_persen = '0';
    let diskon_nominal = '0';
    if ((p.diskon_nominal || 0) > 0) { diskon_mode = 'nominal'; diskon_nominal = String(p.diskon_nominal); }
    else if ((p.diskon_persen || 0) > 0) { diskon_mode = 'persen'; diskon_persen = String(p.diskon_persen); }
    setEditingId(p.id);
    setForm({
      nama: p.nama,
      kode: p.kode || '',
      deskripsi: p.deskripsi || '',
      category_id: p.category_id || '',
      box_id: p.box_id || '',
      harga_paket: String(p.harga_paket),
      diskon_mode,
      diskon_persen,
      diskon_nominal,
      channel_prices: cpStr,
      allowed_extras: p.allowed_extras || [],
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Yakin ingin menghapus paket "${nama}"?`)) return;
    try {
      const ok = await deletePackage(id);
      if (ok) {
        toast.success(`Paket ${nama} berhasil dihapus`);
        await refreshData();
      } else {
        toast.error('Gagal menghapus paket');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menghapus paket');
    }
  };

  const selectedBox = boxList.find(b => b.id === form.box_id);

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Kelola Paket</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{paketList.length} paket aktif</p>
        </div>
        <Button onClick={() => { if (showForm && !editingId) { resetForm(); } else { setShowForm(!showForm); setEditingId(null); setForm(defaultForm()); } }}
          className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">
          {showForm ? '✕ BATAL' : '+ TAMBAH PAKET'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-slate-50 rounded-2xl border space-y-6 animate-in fade-in slide-in-from-top-4">

          {/* ── Section A: Identitas ── */}
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
              <Icons.Tag size={12} /> Identitas Paket
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nama Paket *</label>
                <input value={form.nama} onChange={e => setField('nama', e.target.value)} className={inputClass} placeholder="Misal: Paket Reguler 3" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Kode Singkat</label>
                <input value={form.kode} onChange={e => setField('kode', e.target.value.toUpperCase())} className={inputClass} placeholder="REG3" maxLength={20} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Kategori Donat *</label>
                <select value={form.category_id} onChange={e => setField('category_id', e.target.value)} className={inputClass} required>
                  <option value="">Pilih Kategori...</option>
                  {jenisList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Box / Kemasan *</label>
                <select value={form.box_id} onChange={e => setField('box_id', e.target.value)} className={inputClass} required>
                  <option value="">Pilih Box...</option>
                  {boxList.map(b => <option key={b.id} value={b.id}>{b.nama} ({b.kapasitas} pcs)</option>)}
                </select>
              </div>
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Harga Default (Toko)</label>
                <CurrencyInput value={form.harga_paket} onChange={e => setField('harga_paket', e.target.value)} className={`${inputClass} text-amber-600 font-extrabold`} placeholder="Harga Toko" />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Panduan Kasir (Opsional)</label>
                <input value={form.deskripsi} onChange={e => setField('deskripsi', e.target.value)} className={inputClass} placeholder="Misal: Isi 3 donat reguler pilihan customer" />
              </div>
            </div>
          </div>

          {/* ── Section B: Diskon ── */}
          <div className="border-t border-slate-200 pt-5">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
              <Icons.Percent size={12} /> Diskon Paket
            </p>
            <div className="flex gap-3 flex-wrap mb-4">
              {(['none', 'persen', 'nominal'] as DiskonMode[]).map(m => (
                <button key={m} type="button" onClick={() => setField('diskon_mode', m)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.diskon_mode === m ? 'bg-amber-500 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500'}`}>
                  {m === 'none' ? '❌ Tidak Ada Diskon' : m === 'persen' ? '% Persentase' : 'Rp Nominal'}
                </button>
              ))}
            </div>
            {form.diskon_mode === 'persen' && (
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Diskon (%)</label>
                  <input type="number" min="0" max="100" step="0.5" value={form.diskon_persen} onChange={e => setField('diskon_persen', e.target.value)} className={inputClass} />
                </div>
              </div>
            )}
            {form.diskon_mode === 'nominal' && (
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Diskon (Rp)</label>
                  <CurrencyInput value={form.diskon_nominal} onChange={e => setField('diskon_nominal', e.target.value)} className={inputClass} />
                </div>
              </div>
            )}
          </div>

          {/* ── Section C: Harga Per Channel ── */}
          <div className="border-t border-slate-200 pt-5">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-2">
              <Icons.Store size={12} /> Harga Per Channel
            </p>
            <p className="text-[9px] text-slate-400 mb-4">Kosongkan jika harga sama dengan default toko. Channel tanpa harga tidak akan menggunakan harga khusus.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {kasirMenus.map(m => {
                const val = form.channel_prices[m.slug] || '';
                return (
                  <div key={m.slug} className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full bg-${m.color}-500`} />
                      {m.nama}
                    </label>
                    <CurrencyInput
                      value={val}
                      onChange={e => setChannelPrice(m.slug, e.target.value)}
                      className={`${inputClass} text-sm`}
                      placeholder={form.harga_paket || 'default'}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Section D: Produk Ekstra ── */}
          {tambahanList.length > 0 && (
            <div className="border-t border-slate-200 pt-5">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 flex items-center gap-2">
                <Icons.Plus size={12} /> Produk Ekstra (Opsional)
              </p>
              <p className="text-[9px] text-slate-400 mb-4">Produk yang bisa ditawarkan/dipilih kasir saat menjual paket ini (misal: minuman, lilin, dll).</p>
              <div className="flex flex-wrap gap-2">
                {tambahanList.map(t => (
                  <button key={t.id} type="button" onClick={() => toggleExtra(t.id)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all border-2 ${
                      form.allowed_extras.includes(t.id)
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                    }`}>
                    {form.allowed_extras.includes(t.id) ? '✓ ' : ''}{t.nama}
                    <span className="ml-1 opacity-60">{formatRp(t.harga_jual)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Smart Insight ── */}
          {insight && !insight.empty && (
            <div className="border-t border-slate-200 pt-5">
              <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-3 flex items-center gap-2">
                <Icons.Brain size={12} /> Estimasi Bisnis
              </p>
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <div className="grid grid-cols-2 gap-3 mb-3 text-[10px]">
                  <div className="flex justify-between"><span className="text-slate-500 font-bold">Modal HPP</span><span className="font-black">{formatRp(insight.totalHpp)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 font-bold">Normal Eceran</span><span className="font-black line-through">{formatRp(insight.totalNormal)}</span></div>
                  <div className="col-span-2 text-[9px] text-slate-400">*Estimasi dari {insight.count} rasa {insight.kategoriNama} • Box: {selectedBox?.nama}</div>
                </div>
                {insight.channelData.length > 0 && (
                  <div className="border-t border-amber-200 pt-3">
                    <p className="text-[9px] font-black uppercase text-amber-700 mb-2">Margin Per Channel:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {insight.channelData.map(c => (
                        <div key={c.slug} className="flex items-center justify-between text-[9px]">
                          <span className="font-bold text-slate-600">{c.nama}</span>
                          <div className="flex items-center gap-1">
                            <span className={`font-black ${c.profit > 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {c.profit > 0 ? '+' : ''}{formatRp(c.profit)}
                            </span>
                            <span className={`px-1 py-0.5 rounded text-[8px] font-black ${c.margin > 30 ? 'bg-green-100 text-green-700' : c.margin > 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                              {c.margin.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {insight?.empty && (
            <div className="bg-slate-100 rounded-xl p-3 text-center text-[10px] text-slate-400">
              Tidak ada varian standar di kategori ini untuk estimasi.
            </div>
          )}

          <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 w-full md:w-auto px-8 py-3">
            {isSaving ? 'Menyimpan...' : (editingId ? '✓ UPDATE PAKET' : '+ SIMPAN PAKET')}
          </Button>
        </form>
      )}

      {/* Paket List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {paketList.map(p => {
          const channelCount = Object.keys(p.channel_prices || {}).length;
          const punya_diskon = (p.diskon_nominal || 0) > 0 || (p.diskon_persen || 0) > 0;
          return (
            <div key={p.id} className="group relative p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:shadow-xl hover:border-amber-300 transition-all overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />

              {/* Top: icon + badges */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center shadow-inner transition-all duration-500 shrink-0">
                  <Icons.Box size={26} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                    {p.kode && (
                      <span className="text-[9px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded-md uppercase tracking-widest">{p.kode}</span>
                    )}
                    {punya_diskon && (
                      <span className="text-[9px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded-md uppercase">
                        {(p.diskon_nominal || 0) > 0 ? `-${formatRp(p.diskon_nominal)}` : `-${p.diskon_persen}%`}
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-slate-900 text-base uppercase tracking-tight truncate">{p.nama}</h4>
                  <p className="text-[10px] text-slate-400 font-bold">{p.category?.nama || '—'} • {p.box?.nama || 'Box'} • {p.kapasitas} pcs</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-4">
                <p className="text-amber-600 font-black text-xl">{formatRp(p.harga_paket)}</p>
                {channelCount > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(p.channel_prices).slice(0, 3).map(([slug, harga]) => {
                      const menu = kasirMenus.find(m => m.slug === slug);
                      return (
                        <span key={slug} className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                          {menu?.nama || slug}: {formatRp(harga as number)}
                        </span>
                      );
                    })}
                    {channelCount > 3 && <span className="text-[9px] text-slate-400">+{channelCount - 3} lainnya</span>}
                  </div>
                )}
                {p.deskripsi && (
                  <p className="text-[9px] text-slate-400 italic mt-1 truncate">💬 {p.deskripsi}</p>
                )}
              </div>

              {/* Allowed extras badges */}
              {(p.allowed_extras || []).length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  <span className="text-[8px] font-bold text-slate-400 mr-1">Ekstra:</span>
                  {(p.allowed_extras || []).slice(0, 2).map(extraId => {
                    const t = tambahanList.find(x => x.id === extraId);
                    return t ? <span key={t.id} className="text-[8px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold">+{t.nama}</span> : null;
                  })}
                  {(p.allowed_extras || []).length > 2 && <span className="text-[8px] text-slate-400">+{(p.allowed_extras || []).length - 2}</span>}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button onClick={() => handleDelete(p.id, p.nama)}
                  className="w-10 py-2 text-[10px] uppercase bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all flex items-center justify-center flex-shrink-0"
                  title="Hapus Paket">
                  <Icons.Trash2 size={16} />
                </button>
                <button onClick={() => handleEdit(p)}
                  className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-2xl transition-all flex items-center justify-center gap-2">
                  <Icons.Edit3 size={12} /> Edit Paket
                </button>
              </div>
            </div>
          );
        })}
        {paketList.length === 0 && (
          <p className="col-span-full text-center text-slate-300 py-16 text-xs font-black uppercase tracking-[0.3em] border-2 border-dashed rounded-[40px]">
            Belum ada paket
          </p>
        )}
      </div>
    </div>
  );
}
