'use client';

import { useState, useEffect } from 'react';
import { CreditCard, Edit3, Trash2, Wallet, Image as ImageIcon, Settings, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { upsertPaymentMethod, deletePaymentMethod, getPaymentTypes, addPaymentType, deletePaymentType } from '@/lib/db/payment-methods';
import type { PaymentMethodConfig, PaymentType } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface Props {
  paymentMethods: PaymentMethodConfig[];
  refreshData: () => Promise<void>;
}

const defaultForm = () => ({
  name: '',
  type: '',
  account_number: '',
  account_name: '',
  logo_url: '',
  is_active: true,
});

export function TabMetodePembayaran({ paymentMethods, refreshData }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(defaultForm());
  
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [isSavingType, setIsSavingType] = useState(false);

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    const types = await getPaymentTypes();
    setPaymentTypes(types);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultForm());
  };

  const handleEdit = (p: PaymentMethodConfig) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      type: p.type,
      account_number: p.account_number || '',
      account_name: p.account_name || '',
      logo_url: p.logo_url || '',
      is_active: p.is_active,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus metode pembayaran "${name}"?`)) return;
    try {
      const ok = await deletePaymentMethod(id);
      if (ok) {
        toast.success(`Metode pembayaran ${name} dihapus`);
        await refreshData();
      } else {
        toast.error('Gagal menghapus metode pembayaran');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat menghapus');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.type) return toast.error('Nama dan tipe wajib diisi');

    setIsSaving(true);
    try {
      const ok = await upsertPaymentMethod({
        id: editingId || undefined,
        name: form.name,
        type: form.type,
        account_number: form.account_number || null,
        account_name: form.account_name || null,
        logo_url: form.logo_url || null,
        is_active: form.is_active,
      });

      if (ok) {
        toast.success(editingId ? 'Metode pembayaran diperbarui' : 'Metode pembayaran ditambahkan');
        resetForm();
        await refreshData();
      } else {
        toast.error('Gagal menyimpan metode pembayaran');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check size limit (1MB = 1048576 bytes) just in case, though user said no limit, it's good practice
    // Actually user said "biarin aja toh juga dari code base", so we just read it.
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm({ ...form, logo_url: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    setIsSavingType(true);
    const ok = await addPaymentType(newTypeName.trim());
    if (ok) {
      toast.success('Tipe pembayaran ditambahkan');
      setNewTypeName('');
      await loadTypes();
    } else {
      toast.error('Gagal menambahkan tipe');
    }
    setIsSavingType(false);
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('Hapus tipe ini?')) return;
    const ok = await deletePaymentType(id);
    if (ok) {
      toast.success('Tipe dihapus');
      await loadTypes();
    } else {
      toast.error('Gagal menghapus tipe');
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Kelola Metode Pembayaran</h3>
          <div className="flex items-center gap-2 mt-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
              {paymentMethods.length} metode terdaftar
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={() => setShowTypeModal(true)}
            className="border-slate-200 text-slate-600 font-bold text-xs px-5 py-4 rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <Settings size={14} /> KELOLA TIPE
          </Button>
          <Button 
            onClick={() => { if (showForm && !editingId) resetForm(); else { setShowForm(!showForm); setEditingId(null); setForm(defaultForm()); } }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs px-6 py-4 rounded-2xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/40 hover:-translate-y-0.5 transition-all duration-300"
          >
            {showForm ? '✕ BATAL' : '+ TAMBAH BARU'}
          </Button>
        </div>
      </div>

      {/* MODAL KELOLA TIPE */}
      {showTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-6 relative border border-slate-100">
            <button onClick={() => setShowTypeModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <h3 className="text-lg font-black text-slate-800 mb-6">Kelola Tipe Pembayaran</h3>
            
            <form onSubmit={handleAddType} className="flex gap-2 mb-6">
              <input 
                value={newTypeName} 
                onChange={e => setNewTypeName(e.target.value)}
                placeholder="Tipe Baru (Misal: Kasbon)" 
                className="flex-1 bg-slate-50 border border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 rounded-xl px-4 py-2.5 text-sm"
              />
              <Button type="submit" disabled={isSavingType || !newTypeName.trim()} className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4">
                <Plus size={18} />
              </Button>
            </form>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
              {paymentTypes.map(pt => (
                <div key={pt.id} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <span className="font-bold text-slate-700 text-sm">{pt.name}</span>
                  <button onClick={() => handleDeleteType(pt.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {paymentTypes.length === 0 && <p className="text-center text-xs text-slate-400 py-4">Belum ada tipe khusus. Silakan tambah di atas.</p>}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-10 p-8 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Nama Metode *</label>
              <input 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
                className="w-full bg-slate-50/50 border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-300" 
                placeholder="Misal: BCA Transfer, QRIS DANA" 
                required 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Tipe *</label>
              <select 
                value={form.type} 
                onChange={e => setForm({ ...form, type: e.target.value })} 
                className="w-full bg-slate-50/50 border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-300" 
                required 
              >
                <option value="" disabled>Pilih Tipe Pembayaran</option>
                {paymentTypes.map(pt => (
                  <option key={pt.id} value={pt.name}>{pt.name}</option>
                ))}
                {/* Fallback in case table is empty but somehow type is needed */}
                {paymentTypes.length === 0 && <option value="Transfer Bank">Transfer Bank</option>}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">No. Rekening / HP (Opsional)</label>
              <input 
                value={form.account_number} 
                onChange={e => setForm({ ...form, account_number: e.target.value })} 
                className="w-full bg-slate-50/50 border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-300" 
                placeholder="Misal: 1234567890" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Nama Pemilik (Opsional)</label>
              <input 
                value={form.account_name} 
                onChange={e => setForm({ ...form, account_name: e.target.value })} 
                className="w-full bg-slate-50/50 border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-300" 
                placeholder="Misal: A.N Donattour" 
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Upload Logo PNG/JPG (Opsional)</label>
              <div className="flex gap-4 items-center">
                <div className="flex-1">
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleImageUpload} 
                    className="w-full text-sm text-slate-500 file:mr-4 file:py-3.5 file:px-6 file:rounded-2xl file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-all cursor-pointer" 
                  />
                  <p className="text-[10px] text-slate-400 mt-2 ml-1">Gambar akan diubah menjadi Base64 dan disimpan di database.</p>
                </div>
                {form.logo_url && (
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 p-2 flex-shrink-0 flex items-center justify-center relative group">
                    <img src={form.logo_url} alt="Preview" className="max-w-full max-h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                    <button type="button" onClick={() => setForm({...form, logo_url: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 md:col-span-2">
              <input 
                type="checkbox" 
                id="is_active" 
                checked={form.is_active} 
                onChange={e => setForm({ ...form, is_active: e.target.checked })} 
                className="w-5 h-5 text-amber-500 rounded-lg border-slate-300 focus:ring-amber-500 transition-colors cursor-pointer" 
              />
              <label htmlFor="is_active" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                Aktif (Tampilkan di Kasir)
              </label>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              disabled={isSaving} 
              className="bg-slate-900 text-white font-black text-xs px-10 py-6 rounded-2xl hover:bg-slate-800 transition-all duration-300 disabled:opacity-50 shadow-lg shadow-slate-900/20 hover:shadow-xl hover:-translate-y-0.5 w-full md:w-auto"
            >
              {isSaving ? 'MENYIMPAN...' : (editingId ? '✓ UPDATE DATA' : '+ SIMPAN METODE')}
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paymentMethods.map(p => (
          <div key={p.id} className="group relative bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-2xl hover:shadow-amber-500/10 hover:border-amber-200 transition-all duration-500 overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-full blur-2xl group-hover:from-amber-500/10 group-hover:to-orange-500/10 transition-all duration-500 transform group-hover:scale-150" />
            
            <div className="flex items-start gap-4 mb-6 relative z-10">
              <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/50 flex items-center justify-center shadow-inner group-hover:border-amber-200 transition-all duration-300 shrink-0 overflow-hidden p-2">
                {p.logo_url ? (
                  <img src={p.logo_url} alt={p.name} className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-slate-400 group-hover:text-amber-500 transition-colors">
                    {p.type?.toLowerCase().includes('tunai') ? <Wallet size={28} strokeWidth={1.5} /> : <CreditCard size={28} strokeWidth={1.5} />}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${p.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                    {p.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                  <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg uppercase tracking-widest border border-blue-100 truncate max-w-[80px]">
                    {p.type}
                  </span>
                </div>
                <h4 className="font-black text-slate-900 text-lg tracking-tight leading-tight line-clamp-2">{p.name}</h4>
              </div>
            </div>

            <div className="mb-6 flex-1 relative z-10 bg-slate-50/50 rounded-2xl p-4 border border-slate-100/50 group-hover:bg-amber-50/30 transition-colors">
              {p.account_number ? (
                <div className="space-y-1">
                  <p className="text-slate-800 font-bold text-base font-mono tracking-tight">{p.account_number}</p>
                  {p.account_name && <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold">{p.account_name}</p>}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-medium italic flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  Tanpa Rekening
                </p>
              )}
            </div>

            <div className="flex gap-3 relative z-10 mt-auto">
              <button 
                onClick={() => handleDelete(p.id, p.name)} 
                className="w-12 h-12 bg-white border border-slate-100 hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all duration-300 flex items-center justify-center flex-shrink-0 group/btn shadow-sm" 
                title="Hapus Metode"
              >
                <Trash2 size={18} className="group-hover/btn:scale-110 transition-transform" />
              </button>
              <button 
                onClick={() => handleEdit(p)} 
                className="flex-1 h-12 text-[11px] font-black uppercase tracking-[0.2em] bg-white border border-slate-100 hover:border-amber-200 hover:bg-amber-50 text-slate-600 hover:text-amber-600 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm group/btn"
              >
                <Edit3 size={14} className="group-hover/btn:-translate-y-0.5 transition-transform" /> 
                Edit
              </button>
            </div>
          </div>
        ))}
        
        {paymentMethods.length === 0 && (
          <div className="col-span-full py-20 px-6 rounded-[3rem] border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-300 mb-4">
              <Wallet size={32} />
            </div>
            <p className="text-slate-400 text-sm font-black uppercase tracking-[0.2em]">
              Belum ada metode pembayaran
            </p>
            <p className="text-slate-400 text-xs mt-2 max-w-sm">
              Klik tombol tambah di pojok kanan atas untuk mulai mendaftarkan metode pembayaran kasir Anda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
