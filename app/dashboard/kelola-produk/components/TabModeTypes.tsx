'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { upsertCustomModeConfig, deleteCustomModeConfig } from '@/lib/db';
import type { CustomModeConfig, ProductCategory } from '@/lib/types';
import { inputClass } from './shared';

interface TabModeTypesProps {
  modeConfigs: CustomModeConfig[];
  categories: ProductCategory[];
  refreshData: () => Promise<void>;
}

const emptyForm = {
  nama: '',
  category_limits: [] as Array<{
    category_id: string
    max_reguler: number
    max_mini: number
  }>,
};

export function TabModeTypes({ modeConfigs, categories, refreshData }: TabModeTypesProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const F = (key: keyof typeof emptyForm, val: any) => setForm(f => ({ ...f, [key]: val }));

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const generateSlug = (nama: string) => {
    const baseSlug = nama
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    
    // Add timestamp to ensure uniqueness
    const timestamp = Date.now().toString().slice(-4);
    return `${baseSlug}-${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama) {
      toast.error('Nama mode wajib diisi');
      return;
    }

    if (form.category_limits.length === 0) {
      toast.error('Pilih minimal 1 kategori');
      return;
    }

    // Check if mode name contains "mix" - must have exactly 2 categories
    const isMixMode = form.nama.toLowerCase().includes('mix');
    if (isMixMode && form.category_limits.length !== 2) {
      toast.error('Mode Mix harus memilih tepat 2 kategori');
      return;
    }

    setIsSaving(true);
    try {
      const slug = generateSlug(form.nama);

      console.log('Form data:', form);
      console.log('Generated slug:', slug);

      const modeData: any = {
        nama: form.nama.trim(),
        slug,
        tipe_mode: 'flexible',
        category_limits: form.category_limits,
        is_active: true,
      };

      // Only add id if editing
      if (editingId) {
        modeData.id = editingId;
      }

      console.log('Mode data to be sent:', modeData);

      const ok = await upsertCustomModeConfig(modeData);

      if (ok) {
        toast.success(editingId ? 'Mode diperbarui ✓' : 'Mode baru ditambahkan ✓');
        resetForm();
        await refreshData();
      } else {
        toast.error('Gagal menyimpan, coba lagi');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const ok = await deleteCustomModeConfig(id);
      if (ok) {
        toast.success('Mode dihapus');
        setConfirmDeleteId(null);
        await refreshData();
      } else {
        toast.error('Gagal menghapus mode');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menghapus');
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (m: CustomModeConfig) => {
    setEditingId(m.id);
    
    // Convert from database format to form format
    const categoryLimits = (m.category_limits as any) || [];
    
    setForm({
      nama: m.nama,
      category_limits: categoryLimits,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleCategory = (categoryId: string, categoryName: string) => {
    const existing = form.category_limits.find(c => c.category_id === categoryId);
    const isMixMode = form.nama.toLowerCase().includes('mix');
    
    if (existing) {
      // Remove category
      F('category_limits', form.category_limits.filter(c => c.category_id !== categoryId));
    } else {
      // Check if mix mode and already has 2 categories
      if (isMixMode && form.category_limits.length >= 2) {
        toast.error('Mode Mix hanya bisa memilih maksimal 2 kategori');
        return;
      }
      
      // Add category with default limits
      F('category_limits', [
        ...form.category_limits,
        { category_id: categoryId, max_reguler: 6, max_mini: 12 }
      ]);
    }
  };

  const updateCategoryLimit = (categoryId: string, field: 'max_reguler' | 'max_mini', value: number) => {
    F('category_limits', form.category_limits.map(c => 
      c.category_id === categoryId 
        ? { ...c, [field]: value }
        : c
    ));
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Kelola Mode Custom</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Atur mode yang tersedia untuk custom order (Reguler, Mix, Premium)</p>
        </div>
        <Button
          onClick={() => { if (showForm && editingId) resetForm(); else setShowForm(v => !v); }}
          className="bg-amber-500 text-white font-black text-xs px-4 py-2 rounded-xl hover:bg-amber-600 transition-colors"
        >
          {showForm ? 'BATAL' : '+ TAMBAH MODE'}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-amber-200 space-y-5">
          <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">
            {editingId ? '✏️ Edit Mode' : '➕ Mode Baru'}
          </p>

          {/* Basic Info */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nama Mode *</label>
            <input
              value={form.nama}
              onChange={e => F('nama', e.target.value)}
              className={inputClass}
              placeholder="Mode Reguler"
              required
            />
          </div>

          {/* Category Selection with Limits */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase text-blue-700 tracking-widest">Kategori & Batasan *</label>
              {form.nama.toLowerCase().includes('mix') && (
                <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-bold">
                  Mode Mix: Pilih tepat 2 kategori
                </span>
              )}
            </div>
            <p className="text-[9px] text-slate-500">
              {form.nama.toLowerCase().includes('mix') 
                ? 'Centang 2 kategori untuk mode mix, lalu atur max per kategori untuk ukuran reguler dan mini'
                : 'Centang kategori yang boleh dipilih, lalu atur max untuk ukuran reguler dan mini'
              }
            </p>
            
            <div className="space-y-2">
              {categories.map(cat => {
                const limit = form.category_limits.find(c => c.category_id === cat.id);
                const isChecked = !!limit;
                
                return (
                  <div key={cat.id} className="bg-white rounded-lg p-3 border border-slate-100">
                    <div className="flex items-start gap-3">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategory(cat.id, cat.nama)}
                          className="w-4 h-4 accent-blue-500"
                        />
                        <span className="text-sm font-bold text-slate-700">{cat.nama}</span>
                      </label>
                      
                      {isChecked && (
                        <div className="flex gap-2">
                          <div className="flex items-center gap-1.5">
                            <label className="text-[9px] text-slate-400 whitespace-nowrap">Max Reguler:</label>
                            <input
                              type="number"
                              min="1"
                              value={limit?.max_reguler || 6}
                              onChange={e => updateCategoryLimit(cat.id, 'max_reguler', Number(e.target.value))}
                              className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label className="text-[9px] text-slate-400 whitespace-nowrap">Max Mini:</label>
                            <input
                              type="number"
                              min="1"
                              value={limit?.max_mini || 12}
                              onChange={e => updateCategoryLimit(cat.id, 'max_mini', Number(e.target.value))}
                              className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 px-8"
            >
              {isSaving ? 'Menyimpan...' : (editingId ? '💾 Simpan' : '✓ Tambah')}
            </Button>
            <Button
              type="button"
              onClick={resetForm}
              className="bg-slate-100 text-slate-500 font-black text-xs rounded-xl hover:bg-slate-200 transition-colors"
            >
              Batal
            </Button>
          </div>
        </form>
      )}

      {/* Mode List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modeConfigs.map(mode => {
          return (
            <div
              key={mode.id}
              className="group relative bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-amber-200 transition-all overflow-hidden"
            >
              <div className="p-5">
                <div className="mb-3">
                  <h4 className="font-black text-slate-900 text-base">{mode.nama}</h4>
                </div>
                
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-[10px]">
                  {mode.category_limits && (mode.category_limits as any).length > 0 ? (
                    (mode.category_limits as any).map((limit: any, idx: number) => {
                      const cat = categories.find(c => c.id === limit.category_id);
                      return (
                        <div key={idx} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                          <span className="text-slate-600 font-bold">{cat?.nama || 'Unknown'}</span>
                          <div className="flex gap-2 text-[9px]">
                            <span className="text-slate-400">Reg: <span className="font-black text-slate-700">{limit.max_reguler}</span></span>
                            <span className="text-slate-400">Mini: <span className="font-black text-slate-700">{limit.max_mini}</span></span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-400 text-center py-2">Tidak ada kategori</div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 p-4 pt-0">
                <button
                  onClick={() => startEdit(mode)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-xl transition-all font-black text-[10px] uppercase flex items-center justify-center gap-1.5"
                >
                  <Icons.Edit3 size={12} /> Edit
                </button>
                {confirmDeleteId === mode.id ? (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-3 py-2.5 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px]"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleDelete(mode.id)}
                      disabled={deletingId === mode.id}
                      className="px-3 py-2.5 bg-red-500 text-white rounded-xl font-black text-[10px] hover:bg-red-600 disabled:opacity-50"
                    >
                      {deletingId === mode.id ? '...' : 'Hapus!'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(mode.id)}
                    className="w-10 py-2.5 bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-all flex items-center justify-center"
                  >
                    <Icons.Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {modeConfigs.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-200">
            <Icons.Package size={48} className="mb-3 opacity-30" />
            <p className="text-xs font-black uppercase tracking-[0.3em] opacity-40">Belum ada mode</p>
            <p className="text-[10px] opacity-30 mt-1">Jalankan SQL migration terlebih dahulu</p>
          </div>
        )}
      </div>
    </div>
  );
}
