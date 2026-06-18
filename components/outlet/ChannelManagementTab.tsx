'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  getOutletChannels, addOutletChannel, updateOutletChannel,
  toggleOutletChannel, deleteOutletChannel, type OutletChannel,
} from '@/lib/db/outlet-channels';
import {
  Plus, Trash2, Pencil, Save, X, Loader2, Image as ImageIcon
} from 'lucide-react';

/* ── Inline Edit Form ───────────────────────────────────────── */
interface EditFormProps {
  channel: OutletChannel;
  onSave: (updates: Partial<OutletChannel>) => Promise<void>;
  onCancel: () => void;
}

function EditForm({ channel, onSave, onCancel }: EditFormProps) {
  const [form, setForm] = useState({
    channel_name: channel.channel_name,
    icon_url: channel.icon_url || '',
  });
  const [saving, setSaving] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, icon_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      channel_name: form.channel_name.trim() || channel.channel_name,
      icon_url: form.icon_url,
    });
    setSaving(false);
  };

  return (
    <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Logo Channel
          </label>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
              {form.icon_url ? (
                <img src={form.icon_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-5 h-5 text-slate-300" />
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 cursor-pointer"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Nama Channel
          </label>
          <input
            value={form.channel_name}
            onChange={e => setForm(f => ({ ...f, channel_name: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 bg-white"
            placeholder="Contoh: GrabFood"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
        <button onClick={onCancel}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5">
          <X size={14}/> Batal
        </button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
          Simpan Perubahan
        </button>
      </div>
    </div>
  );
}

/* ── Add Channel Modal ──────────────────────────────────────── */
interface AddChannelModalProps {
  outletId: string;
  onAdded: () => void;
  onClose: () => void;
}

function AddChannelModal({ outletId, onAdded, onClose }: AddChannelModalProps) {
  const [form, setForm] = useState({
    channel_name: '',
    icon_url: '',
  });
  const [adding, setAdding] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, icon_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async () => {
    if (!form.channel_name.trim()) { toast.error('Nama channel wajib diisi'); return; }
    setAdding(true);
    const key = form.channel_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const res = await addOutletChannel({
      outlet_id:     outletId,
      channel_key:   `custom_${key}_${Date.now()}`,
      channel_name:  form.channel_name.trim(),
      icon_url:      form.icon_url || null,
      is_active:     true,
      sort_order:    0,
    });
    if (res) {
      toast.success('Channel berhasil ditambahkan');
      onAdded();
      onClose();
    } else {
      toast.error('Gagal menambahkan channel');
    }
    setAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}/>
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Tambah Channel</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Logo Channel (Opsional)
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                {form.icon_url ? (
                  <img src={form.icon_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-300" />
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Nama Channel <span className="text-red-500">*</span>
            </label>
            <input
              value={form.channel_name}
              onChange={e => setForm(f => ({ ...f, channel_name: e.target.value }))}
              className="w-full px-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 transition-shadow"
              placeholder="Contoh: GoFood, ShopeeFood, Toko Offline"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-semibold transition-colors">
            Batal
          </button>
          <button onClick={handleAdd} disabled={adding}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2">
            {adding ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>}
            Simpan Channel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function ChannelManagementTab({ outletId }: { outletId: string }) {
  const [channels, setChannels]     = useState<OutletChannel[]>([]);
  const [loading, setLoading]       = useState(true);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getOutletChannels(outletId);
    setChannels(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [outletId]);

  const handleToggle = async (ch: OutletChannel) => {
    const newState = !ch.is_active;
    const ok = await toggleOutletChannel(ch.id, newState);
    if (ok) {
      setChannels(prev => prev.map(c => c.id === ch.id ? { ...c, is_active: newState } : c));
      toast.success(newState ? `${ch.channel_name} diaktifkan` : `${ch.channel_name} dinonaktifkan`);
    } else {
      toast.error('Gagal mengubah status');
    }
  };

  const handleSaveEdit = async (id: string, updates: Partial<OutletChannel>) => {
    const res = await updateOutletChannel(id, updates as any);
    if (res) {
      setChannels(prev => prev.map(c => c.id === id ? { ...c, ...res } : c));
      setEditingId(null);
      toast.success('Channel diperbarui');
    } else {
      toast.error('Gagal menyimpan');
    }
  };

  const handleDelete = async (ch: OutletChannel) => {
    if (!confirm(`Hapus channel "${ch.channel_name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const ok = await deleteOutletChannel(ch.id);
    if (ok) {
      setChannels(prev => prev.filter(c => c.id !== ch.id));
      toast.success(`${ch.channel_name} dihapus`);
    } else {
      toast.error('Gagal menghapus channel');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-slate-400"/>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">

      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-xl font-bold text-slate-900 mb-1">Kelola Channel Penjualan</h3>
          <p className="text-slate-500 text-sm">
            Tambahkan platform penjualan custom untuk outlet ini.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
        >
          <Plus size={16}/> Tambah Channel
        </button>
      </div>

      {/* Channel List */}
      {channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <ImageIcon size={40} className="text-slate-300 mb-3"/>
          <p className="text-slate-600 font-medium">Belum ada channel penjualan</p>
          <p className="text-slate-400 text-sm mt-1 mb-5">Tambahkan platform tempat Anda berjualan</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold transition-colors"
          >
            <Plus size={16}/> Tambah Channel
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {channels.map(ch => (
            <div key={ch.id}
              className={`p-4 rounded-xl border transition-all ${ch.is_active ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-100 bg-slate-50'}`}>

              <div className="flex items-center gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 ${!ch.is_active ? 'opacity-50 grayscale' : ''}`}>
                  {ch.icon_url ? (
                    <img src={ch.icon_url} alt={ch.channel_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-slate-400">{ch.channel_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-bold ${ch.is_active ? 'text-slate-900' : 'text-slate-500'}`}>
                      {ch.channel_name}
                    </span>
                    {ch.is_active ? (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold tracking-wide">AKTIF</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold tracking-wide">NONAKTIF</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(ch)}
                    title={ch.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${ch.is_active ? 'bg-slate-900' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ch.is_active ? 'translate-x-6' : 'translate-x-1'}`}/>
                  </button>

                  <div className="w-px h-6 bg-slate-200 mx-1"></div>

                  <button
                    onClick={() => setEditingId(editingId === ch.id ? null : ch.id)}
                    title="Edit"
                    className="p-1.5 hover:bg-slate-100 text-slate-600 rounded transition-colors"
                  >
                    <Pencil size={16}/>
                  </button>
                  <button
                    onClick={() => handleDelete(ch)}
                    title="Hapus"
                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                  >
                    <Trash2 size={16}/>
                  </button>
                </div>
              </div>

              {/* Inline Edit Form */}
              {editingId === ch.id && (
                <EditForm
                  channel={ch}
                  onSave={updates => handleSaveEdit(ch.id, updates)}
                  onCancel={() => setEditingId(null)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Channel Modal */}
      {showAddModal && (
        <AddChannelModal
          outletId={outletId}
          onAdded={load}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
