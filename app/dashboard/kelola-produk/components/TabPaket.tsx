'use client';

import { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import { upsertPackage } from '@/lib/db';
import type { ProductPackage, ProductBox, ProductCategory, ProductWithCategory } from '@/lib/types';
import { inputClass, formatRp } from './shared';

interface TabPaketProps {
  paketList: ProductPackage[];
  boxList: ProductBox[];
  jenisList: ProductCategory[];
  varianList: ProductWithCategory[]; // Needed for groupedVarian / smart insights
  refreshData: () => Promise<void>;
}

export function TabPaket({ paketList, boxList, jenisList, varianList, refreshData }: TabPaketProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [paketForm, setPaketForm] = useState({ nama: '', category_id: '', box_id: '', harga_paket: '0' });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setPaketForm({ nama: '', category_id: '', box_id: '', harga_paket: '0' });
  };

  const groupedVarian = useMemo(() => {
    const map = new Map<string, any>();
    varianList.forEach(v => {
      const key = `${v.nama}_${v.category_id}`;
      if (!map.has(key)) {
        map.set(key, { nama: v.nama, category_id: v.category_id || '', category: v.category, image_url: v.image_url || '' });
      }
      const entry = map.get(key)!;
      if (v.ukuran === 'standar') entry.standar = v;
      if (v.ukuran === 'mini') entry.mini = v;
    });
    return Array.from(map.values());
  }, [varianList]);

  // --- Smart Paket Insights ---
  const paketInsight = useMemo(() => {
    const { category_id, box_id, harga_paket } = paketForm;
    if (!category_id || !box_id) return null;

    const selectedBox = boxList.find(b => b.id === box_id);
    if (!selectedBox) return null;

    const capacity = selectedBox.kapasitas || 0;
    const boxCost = selectedBox.harga_box || 0;

    // Ambil semua donat standar di kategori ini
    const variantsInCategory = groupedVarian.filter(v => v.category_id === category_id && v.standar);
    
    if (variantsInCategory.length === 0) return { empty: true as const };

    const avgJual = variantsInCategory.reduce((acc, v) => acc + (v.standar?.harga_jual || 0), 0) / variantsInCategory.length;
    const avgHpp = variantsInCategory.reduce((acc, v) => acc + (v.standar?.harga_pokok_penjualan || 0), 0) / variantsInCategory.length;

    const totalNormal = (avgJual * capacity) + boxCost;
    const totalHpp = (avgHpp * capacity) + boxCost;
    const sellingPrice = parseInt(harga_paket || '0');
    
    const profit = sellingPrice - totalHpp;
    const hemat = totalNormal - sellingPrice;
    const marginPercent = totalHpp > 0 ? (profit / totalHpp) * 100 : 0;

    return {
      empty: false as const,
      avgJual,
      avgHpp,
      totalNormal,
      totalHpp,
      profit,
      hemat,
      marginPercent,
      capacity,
      categoryName: variantsInCategory[0].category?.nama || 'Kategori ini',
      count: variantsInCategory.length
    };
  }, [paketForm, groupedVarian, boxList]);

  const handleAddPaket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const ok = await upsertPackage({
        id: editingId || undefined,
        nama: paketForm.nama,
        category_id: paketForm.category_id,
        box_id: paketForm.box_id,
        harga_paket: Number(paketForm.harga_paket),
        is_active: true
      });
      if (ok) { 
        toast.success(editingId ? 'Paket diperbarui' : 'Paket baru ditambahkan', {
          description: `"${paketForm.nama}" • Harga: Rp${Number(paketForm.harga_paket).toLocaleString('id-ID')}`,
        }); 
        resetForm(); 
        await refreshData(); 
      } else {
        toast.error('Gagal menyimpan paket', { description: 'Periksa data dan coba lagi.' });
      }
    } catch (error) {
      console.error('Error saving package:', error);
      toast.error('Terjadi kesalahan saat menyimpan paket');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800">Paket</h3>
        <Button onClick={() => setShowForm(!showForm)} className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors">
          {showForm ? 'BATAL' : '+ TAMBAH'}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAddPaket} className="mb-6 p-6 bg-slate-50 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nama Paket Donat</label>
                <input value={paketForm.nama} onChange={(e) => setPaketForm({ ...paketForm, nama: e.target.value })} className={inputClass} placeholder="Misal: Paket 1/2 Lusin Klasik" required />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Kategori Donat</label>
                <select value={paketForm.category_id} onChange={(e) => setPaketForm({ ...paketForm, category_id: e.target.value })} className={inputClass} required>
                  <option value="">Pilih Kategori...</option>
                  {jenisList.map(j => <option key={j.id} value={j.id}>{j.nama}</option>)}
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Box / Kemasan</label>
                <select value={paketForm.box_id} onChange={(e) => setPaketForm({ ...paketForm, box_id: e.target.value })} className={inputClass} required>
                  <option value="">Pilih Box...</option>
                  {boxList.map(b => <option key={b.id} value={b.id}>{b.nama} ({b.kapasitas} pcs)</option>)}
                </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
            <div className="space-y-2 md:col-span-1">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Harga Jual Paket</label>
                <CurrencyInput value={paketForm.harga_paket} onChange={(e) => setPaketForm({ ...paketForm, harga_paket: e.target.value })} className={`${inputClass} text-amber-600 font-extrabold text-lg`} placeholder="Tentukan Harga Paket" required />
            </div>

            {/* Smart Insights Panel */}
            <div className="md:col-span-2">
              {paketInsight ? (
                paketInsight.empty ? (
                  <div className="h-full bg-slate-100/50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-4 text-center">
                    <Icons.AlertCircle size={20} className="text-slate-300 mb-2" />
                    <p className="text-[10px] font-bold text-slate-500">Tidak ada varian (standar) di kategori ini.</p>
                  </div>
                ) : (
                  <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
                    
                    <div className="flex items-center gap-2 mb-3 z-10 relative">
                      <Icons.Brain size={14} className="text-amber-500" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700">Estimasi Bisnis</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4 z-10 relative">
                      <div>
                        <div className="flex justify-between items-center text-[10px] mb-1">
                          <span className="font-bold text-slate-500">Modal HPP (Isi+Box)</span>
                          <span className="font-black text-slate-800">{formatRp(paketInsight.totalHpp)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-slate-500">Normal Eceran</span>
                          <span className="font-black text-slate-800 line-through decoration-red-500">{formatRp(paketInsight.totalNormal)}</span>
                        </div>
                      </div>
                      
                      <div className="border-l border-amber-200 pl-4 flex flex-col justify-center">
                        <div className="flex items-end justify-between mb-1">
                          <span className="text-[10px] font-black uppercase text-amber-600/70 tracking-widest">Profit / Pack</span>
                          <span className={`font-black ${paketInsight.profit > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {paketInsight.profit > 0 ? '+' : ''}{formatRp(paketInsight.profit)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-amber-200/50 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${paketInsight.marginPercent > 30 ? 'bg-green-500' : paketInsight.marginPercent > 10 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, Math.max(0, paketInsight.marginPercent))}%` }} />
                          </div>
                          <span className="text-[9px] font-black text-slate-600">{paketInsight.marginPercent.toFixed(1)}% margin</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-amber-200/50 flex justify-between items-center">
                      <p className="text-[9px] font-bold text-amber-700/70">
                        *Diestimasi dari {paketInsight.count} rasa {paketInsight.categoryName} <br/>(Rata-rata: Modal Rp{paketInsight.avgHpp.toLocaleString('id-ID')}, Jual Rp{paketInsight.avgJual.toLocaleString('id-ID')}/pcs)
                      </p>
                      {paketInsight.hemat > 0 && (
                        <div className="bg-red-100 text-red-600 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest animate-pulse">
                          Cust. Hemat {formatRp(paketInsight.hemat)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <div className="h-full bg-slate-100/50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-4 text-center">
                  <Icons.Calculator size={20} className="text-slate-300 mb-2" />
                  <p className="text-[10px] font-bold text-slate-500">Pilih Kategori & Box untuk melihat estimasi profit</p>
                </div>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isSaving} className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 mt-4 w-full md:w-auto px-8">
            {isSaving ? 'Menyimpan...' : 'SIMPAN PAKET'}
          </Button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paketList.map(p => (
          <div key={p.id} className="group relative p-8 bg-white border border-slate-100 rounded-[40px] shadow-sm hover:shadow-2xl hover:border-amber-300 transition-all overflow-hidden flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center shadow-inner transition-all duration-500 shrink-0">
                <Icons.Box size={32} />
            </div>
            <div className="flex-1 min-w-0 z-10">
              <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-1 truncate">{p.nama}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Isi {p.kapasitas} pcs • {p.box?.nama || 'Box'}</p>
              <p className="text-amber-600 font-black text-xl">{formatRp(p.harga_paket)}</p>
            </div>
            <div className="flex flex-col gap-2 z-10">
                <button onClick={() => { setEditingId(p.id); setPaketForm({ nama: p.nama, category_id: p.category_id || '', box_id: p.box_id || '', harga_paket: String(p.harga_paket) }); setShowForm(true); }} className="p-3 bg-slate-50 hover:bg-amber-50 text-slate-300 hover:text-amber-600 rounded-2xl transition-all">
                  <Icons.Edit3 size={18} />
                </button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
          </div>
        ))}
        {paketList.length === 0 && <p className="col-span-full text-center text-slate-300 py-16 text-xs font-black uppercase tracking-[0.3em] border-2 border-dashed rounded-[40px]">Belum ada paket</p>}
      </div>
    </div>
  );
}
