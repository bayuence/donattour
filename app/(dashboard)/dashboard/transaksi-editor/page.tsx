'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getPaymentMethods, getActiveOutlets } from '@/lib/db';
import { getReceiptSettings } from '@/lib/db/outlets';
import { supabase } from '@/lib/supabase';
import { bluetoothPrinter, type StrukData } from '@/lib/bluetooth-printer';
import { toast } from 'sonner';
import { useRealtimeOrders } from '@/lib/hooks/use-realtime-inventory';
import { useUser } from '@/lib/context/user-context';
import type { Outlet } from '@/lib/types';
import {
  Receipt, Search, RefreshCw, X, Store, User, Printer,
  Package, TrendingUp, AlertCircle, XCircle, CheckCircle2,
  Loader2, Banknote, ChevronDown, Building2, Tag, ArrowUpRight,
  Pencil, Save, DollarSign, Clock, Trash2,
  CalendarDays, ChevronLeft, ChevronRight,
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════════ */
const fmtRp   = (n: number) => 'Rp\u00a0' + (n || 0).toLocaleString('id-ID');
const fmtDate = (iso: string) => {
  const wib = new Date(new Date(iso).getTime() + 7 * 3600000);
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${String(wib.getUTCDate()).padStart(2,'0')} ${months[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`;
};
const fmtTime = (iso: string) => {
  const wib = new Date(new Date(iso).getTime() + 7 * 3600000);
  return `${String(wib.getUTCHours()).padStart(2,'0')}:${String(wib.getUTCMinutes()).padStart(2,'0')}`;
};
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
const shortId = (id: string) => 'TRX-' + id.replace(/-/g,'').toUpperCase().slice(-6);

type StatusFilter = 'all' | 'completed' | 'pending' | 'cancelled';

// Helper: get WIB date string YYYY-MM-DD
function getWIBDateString(offsetDays = 0): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ════════════════════════════════════════════════════════════════
   STATUS BADGE
════════════════════════════════════════════════════════════════ */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: any }> = {
    completed: { label: 'Selesai', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    pending:   { label: 'Pending', cls: 'bg-amber-50  text-amber-700  border-amber-200',    icon: Clock        },
    cancelled: { label: 'Batal',   cls: 'bg-red-50    text-red-700    border-red-200',      icon: XCircle      },
  };
  const s = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: AlertCircle };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${s.cls}`}>
      <Icon size={9} /> {s.label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════
   STAT CARD
════════════════════════════════════════════════════════════════ */
function StatCard({ label, value, sub, icon: Icon, color, highlight }: {
  label: string; value: string | number; sub?: string; icon: any;
  color: 'emerald' | 'blue' | 'amber' | 'red' | 'purple' | 'orange';
  highlight?: boolean;
}) {
  const c = {
    emerald: 'text-emerald-600 bg-emerald-50',
    blue:    'text-blue-600 bg-blue-50',
    amber:   'text-amber-600 bg-amber-50',
    red:     'text-red-600 bg-red-50',
    purple:  'text-purple-600 bg-purple-50',
    orange:  'text-orange-600 bg-orange-50',
  }[color];
  return (
    <div className={`bg-white border rounded-lg p-4 flex items-start gap-3 ${highlight ? 'border-emerald-300 ring-1 ring-emerald-100' : 'border-slate-200'}`}>
      <div className={`p-2 rounded-lg shrink-0 ${c}`}><Icon size={16} /></div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 leading-tight">{label}</p>
        <p className={`text-lg font-bold mt-0.5 leading-none ${c.split(' ')[0]}`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   DELETE CONFIRM MODAL
════════════════════════════════════════════════════════════════ */
function DeleteModal({ trx, onClose, onDeleted }: {
  trx: any; onClose: () => void; onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [reversalInfo, setReversalInfo] = useState<{ standar: number; mini: number } | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // ✅ FIX: Pakai API baru yang sekaligus reversal stok donat non-topping
      const res = await fetch(`/api/orders/${trx.id}`, { method: 'DELETE' });
      const result = await res.json();

      if (!result.success) throw new Error(result.message || 'Gagal menghapus');

      // Tampilkan info stok yang dikembalikan (jika ada)
      if (result.reversal && (result.reversal.standar > 0 || result.reversal.mini > 0)) {
        setReversalInfo(result.reversal);
        toast.success(result.message, { duration: 6000 });
      } else {
        toast.success(result.message || 'Transaksi berhasil dihapus');
      }

      onDeleted(trx.id);
      onClose();
    } catch (e: any) {
      toast.error('Gagal menghapus: ' + e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-red-50">
          <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
            <Trash2 size={16} className="text-red-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-800">Hapus Transaksi</p>
            <p className="text-[10px] text-red-500 font-mono">{shortId(trx.id)}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 hover:bg-red-100 rounded-lg text-red-400"><X size={14}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1 text-xs text-slate-600">
            <p><span className="font-semibold">Outlet:</span> {trx._outletName}</p>
            <p><span className="font-semibold">Kasir:</span> {trx._kasirName}</p>
            <p><span className="font-semibold">Total:</span> {fmtRp(trx.total_amount)}</p>
            <p><span className="font-semibold">Waktu:</span> {fmtDate(trx.created_at)} {fmtTime(trx.created_at)}</p>
          </div>
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            ⚠️ Tindakan ini <strong>permanen</strong> dan tidak bisa dibatalkan. Semua data item dalam transaksi ini akan ikut terhapus.
          </p>
          {trx.status === 'completed' && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              🔄 Stok donat yang sudah terjual dalam transaksi ini akan <strong>dikembalikan otomatis</strong> ke stok kasir.
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">Batal</button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
              {deleting ? <><Loader2 size={13} className="animate-spin"/> Menghapus...</> : <><Trash2 size={13}/> Ya, Hapus</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   EDIT TRANSACTION MODAL (LIGHTWEIGHT EDITS)
════════════════════════════════════════════════════════════════ */
function EditTransactionModal({ trx, onClose, onSaved, paymentMethodsList }: {
  trx: any;
  onClose: () => void;
  onSaved: (id: string, updatedFields: any) => void;
  paymentMethodsList: { id: string; name: string }[];
}) {
  const [customerName, setCustomerName] = useState(trx.customer_name || '');
  const [paymentMethod, setPaymentMethod] = useState(trx.payment_method || 'cash');
  const [status, setStatus] = useState(trx.status);
  const [notes, setNotes] = useState(trx.notes || '');
  const [saving, setSaving] = useState(false);

  const willReversal = trx.status === 'completed' && status === 'cancelled';
  const willDeduct   = trx.status === 'cancelled' && status === 'completed';

  const handleSave = async () => {
    setSaving(true);
    try {
      const paymentDetail = paymentMethod === 'cash'
        ? 'Tunai'
        : (paymentMethodsList.find(m => m.id === paymentMethod)?.name || null);

      const res = await fetch(`/api/orders/${trx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          customer_name: customerName,
          payment_method: paymentMethod,
          payment_method_detail: paymentDetail,
          notes: notes || null,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Gagal memperbarui transaksi');

      toast.success(result.message || 'Transaksi berhasil diperbarui', { duration: 5000 });
      onSaved(trx.id, {
        status,
        customer_name: customerName,
        payment_method: paymentMethod,
        payment_method_detail: paymentDetail,
        notes: notes || null,
      });
      onClose();
    } catch (e: any) {
      toast.error('Gagal: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div>
            <p className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Edit Transaksi</p>
            <p className="text-sm font-bold text-slate-800 font-mono mt-0.5">{shortId(trx.id)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
            <X size={15}/>
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Nama Pelanggan */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Nama Pelanggan
            </label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Umum"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Metode Pembayaran */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Metode Pembayaran
            </label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="cash">Tunai (Cash)</option>
              {paymentMethodsList.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Status Transaksi
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['completed', 'pending', 'cancelled'] as const).map(s => {
                const labels: Record<string, string> = { completed: 'Selesai', pending: 'Pending', cancelled: 'Batal' };
                const activeColors: Record<string, string> = {
                  completed: 'border-emerald-500 bg-emerald-50 text-emerald-800',
                  pending:   'border-amber-500  bg-amber-50  text-amber-800',
                  cancelled: 'border-red-500    bg-red-50    text-red-800',
                };
                return (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                      status === s ? activeColors[s] : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Catatan
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Catatan tambahan..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Warning stok */}
          {willReversal && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span>🔄</span>
              <p>Mengubah ke <strong>Batal</strong> akan otomatis <strong>mengembalikan stok donat</strong> ke kasir.</p>
            </div>
          )}
          {willDeduct && (
            <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <span>🔄</span>
              <p>Mengubah ke <strong>Selesai</strong> akan otomatis <strong>mengurangi stok donat</strong> dari kasir.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} type="button"
            className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold transition-colors">
            Batal
          </button>
          <button onClick={handleSave} disabled={saving} type="button"
            className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors">
            {saving ? <><Loader2 size={13} className="animate-spin"/> Menyimpan...</> : <><Save size={13}/> Simpan</>}
          </button>
        </div>

      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   DETAIL PANEL
════════════════════════════════════════════════════════════════ */
function DetailPanel({ trx, onClose, onEditStatus, onDelete, onPrint, printing }: {
  trx: any;
  onClose: () => void;
  onEditStatus: (trx: any) => void;
  onDelete: (trx: any) => void;
  onPrint: (trx: any) => void;
  printing: boolean;
}) {
  const items: any[]    = trx.order_items || [];
  const subtotal        = trx.subtotal ?? trx.total_amount ?? 0;
  const diskon          = trx.diskon ?? 0;
  const biayaKemasan    = trx.biaya_kemasan ?? 0;
  const biayaTambahan   = trx.biaya_tambahan ?? 0;
  const total           = trx.total_amount ?? 0;

  const totalHPP = items.reduce((s: number, it: any) => {
    const hpp = Number(it.products?.hpp_total ?? it.products?.harga_pokok_penjualan ?? 0);
    return s + hpp * (it.quantity || 1);
  }, 0);
  const keuntungan = total - totalHPP;
  const marginPct  = total > 0 ? (keuntungan / total) * 100 : 0;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={onClose} />
      <div className="fixed top-0 right-0 z-50 h-full w-full sm:w-[460px] bg-white border-l border-slate-200 shadow-xl flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Detail · Owner View</p>
            <p className="text-base font-bold text-slate-900 font-mono mt-0.5">{shortId(trx.id)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onPrint(trx)} disabled={printing}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${printing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-900 text-white'}`}>
              {printing ? <Loader2 size={11} className="animate-spin"/> : <Printer size={11}/>}
              {printing ? 'Mencetak...' : 'Cetak Ulang'}
            </button>
            <button onClick={() => onEditStatus(trx)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors">
              <Pencil size={11}/> Edit
            </button>
            <button onClick={() => onDelete(trx)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold transition-colors">
              <Trash2 size={11}/> Hapus
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 ml-1">
              <X size={15}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Status + waktu */}
          <div className="flex items-center justify-between">
            <StatusBadge status={trx.status}/>
            <div className="text-right">
              <p className="text-[10px] text-slate-400">{fmtDate(trx.created_at)}</p>
              <p className="text-xs font-semibold text-slate-800 font-mono">{fmtTime(trx.created_at)} WIB</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Store,    label: 'Outlet',      value: trx._outletName },
              { icon: User,     label: 'Kasir',       value: trx._kasirName },
              { icon: User,     label: 'Pelanggan',   value: trx.customer_name || 'Umum' },
              { icon: Banknote, label: 'Metode Bayar',value: trx._metodeBayar },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                <div className="flex items-center gap-1 mb-1">
                  <Icon size={9} className="text-slate-400"/>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                </div>
                <p className="text-xs font-semibold text-slate-800 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Items + HPP */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Package size={11} className="text-slate-400"/>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Item & Analisis Margin</p>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-1.5 bg-slate-50">
                <p className="text-[9px] font-semibold text-slate-400 uppercase">Produk</p>
                <p className="text-[9px] font-semibold text-slate-400 uppercase text-right">Harga Jual</p>
                <p className="text-[9px] font-semibold text-slate-400 uppercase text-right">HPP</p>
                <p className="text-[9px] font-semibold text-slate-400 uppercase text-right">Margin</p>
              </div>
              {items.map((it: any, idx: number) => {
                const hpp    = Number(it.products?.hpp_total ?? it.products?.harga_pokok_penjualan ?? 0);
                const harga  = it.unit_price || 0;
                const qty    = it.quantity || 1;
                const margin = harga - hpp;
                const marginP = harga > 0 ? (margin / harga) * 100 : 0;
                return (
                  <div key={idx} className="px-3 py-2.5 grid grid-cols-[1fr_auto_auto_auto] gap-2 items-start">
                    <div>
                      <p className="text-xs font-medium text-slate-800">{it.products?.nama || it.product_name || 'Item'}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{qty}× {fmtRp(harga)}</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 text-right">{fmtRp(harga * qty)}</p>
                    <p className="text-xs text-slate-500 text-right">{hpp > 0 ? fmtRp(hpp * qty) : '—'}</p>
                    <div className="text-right">
                      {margin > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                          <ArrowUpRight size={9}/>{Math.round(marginP)}%
                        </span>
                      ) : <span className="text-[10px] text-slate-400">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Breakdown Keuangan */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Breakdown Keuangan</p>
            </div>
            <div className="divide-y divide-slate-50 px-4">
              <div className="flex justify-between py-2.5">
                <span className="text-xs text-slate-600">Subtotal</span>
                <span className="text-xs font-semibold text-slate-900">{fmtRp(subtotal)}</span>
              </div>
              {diskon > 0 && (
                <div className="flex justify-between py-2.5">
                  <span className="text-xs text-red-600 flex items-center gap-1"><Tag size={10}/> Diskon</span>
                  <span className="text-xs font-semibold text-red-600">− {fmtRp(diskon)}</span>
                </div>
              )}
              {biayaKemasan > 0 && (
                <div className="flex justify-between py-2.5">
                  <span className="text-xs text-slate-600">Biaya Kemasan</span>
                  <span className="text-xs font-semibold text-slate-900">+ {fmtRp(biayaKemasan)}</span>
                </div>
              )}
              {biayaTambahan > 0 && (
                <div className="flex justify-between py-2.5">
                  <span className="text-xs text-slate-600">Biaya Tambahan</span>
                  <span className="text-xs font-semibold text-slate-900">+ {fmtRp(biayaTambahan)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t border-dashed border-slate-200">
                <span className="text-sm font-bold text-slate-900">Total</span>
                <span className="text-base font-bold text-slate-900">{fmtRp(total)}</span>
              </div>
            </div>
          </div>

          {/* Analisis Keuntungan */}
          <div className="border border-emerald-200 rounded-lg overflow-hidden bg-emerald-50/30">
            <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100">
              <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp size={10}/> Analisis Keuntungan
              </p>
            </div>
            <div className="divide-y divide-emerald-100/50 px-4">
              <div className="flex justify-between py-2.5">
                <span className="text-xs text-slate-600">Total Pendapatan</span>
                <span className="text-xs font-semibold text-slate-900">{fmtRp(total)}</span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-xs text-slate-600">Total HPP</span>
                <span className="text-xs font-semibold text-slate-700">
                  {totalHPP > 0 ? `− ${fmtRp(totalHPP)}` : 'Belum di-set'}
                </span>
              </div>
              {diskon > 0 && (
                <div className="flex justify-between py-2.5">
                  <span className="text-xs text-red-600">Diskon Diberikan</span>
                  <span className="text-xs font-semibold text-red-600">− {fmtRp(diskon)}</span>
                </div>
              )}
              <div className="flex justify-between py-3">
                <span className="text-sm font-bold text-emerald-800">Keuntungan Bersih</span>
                <div className="text-right">
                  <p className={`text-base font-bold ${keuntungan >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {totalHPP > 0 ? fmtRp(keuntungan) : '—'}
                  </p>
                  {totalHPP > 0 && (
                    <p className="text-[10px] text-emerald-600">{marginPct.toFixed(1)}% margin</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* UUID */}
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Order UUID</p>
            <p className="text-[9px] font-mono text-slate-500 break-all leading-relaxed">{trx.id}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100 px-5 py-3">
          <button onClick={onClose}
            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors">
            Tutup
          </button>
        </div>
      </div>
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════ */
export default function TransaksiEditorPage() {
  const { user } = useUser();

  // ── State ───────────────────────────────────────────────────
  const [transaksiList, setTransaksiList] = useState<any[]>([]);
  const [search,        setSearch]        = useState('');
  const [loading,       setLoading]       = useState(true);
  const [selectedTrx,   setSelectedTrx]  = useState<any | null>(null);
  const [editingTrx,    setEditingTrx]   = useState<any | null>(null);
  const [deletingTrx,   setDeletingTrx]  = useState<any | null>(null);
  const [printing,      setPrinting]     = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName,   setPrinterName]  = useState('');

  const [filterStatus,  setFilterStatus] = useState<StatusFilter>('all');

  // ── DATE RANGE FILTER ────────────────────────────────────────
  const todayStr = getWIBDateString(0);
  const [dateStart, setDateStart] = useState<string>(todayStr); // YYYY-MM-DD
  const [dateEnd,   setDateEnd]   = useState<string>(todayStr);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerStart, setPickerStart] = useState<string>(todayStr);
  const [pickerEnd,   setPickerEnd]   = useState<string>(todayStr);
  const datePickerBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const [outlets,        setOutlets]           = useState<Outlet[]>([]);
  const [selectedOutlets,setSelectedOutlets]   = useState<string[]>([]);
  const [showOutletDrop, setShowOutletDrop]    = useState(false);
  const [loadingOutlets, setLoadingOutlets]    = useState(true);

  const [paymentMethodsList, setPaymentMethodsList] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [showPaymentDrop, setShowPaymentDrop] = useState(false);

  // Cache payment method UUID → nama
  const paymentMapRef = useRef<Record<string, string>>({});
  // Cache receipt settings per outlet_id
  const receiptCacheRef = useRef<Record<string, any>>({});

  /* ── load transaksi ─────────────────────────────────────── */
  const loadTransaksi = useCallback(async () => {
    setLoading(true);
    try {
      const startWIBStr = `${dateStart} 00:00:00`;
      const wibNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const currentTodayStr = `${wibNow.getFullYear()}-${String(wibNow.getMonth()+1).padStart(2,'0')}-${String(wibNow.getDate()).padStart(2,'0')}`;
      const endWIBStr = dateEnd === currentTodayStr
        ? `${dateEnd} ${String(wibNow.getHours()).padStart(2,'0')}:${String(wibNow.getMinutes()).padStart(2,'0')}:${String(wibNow.getSeconds()).padStart(2,'0')}`
        : `${dateEnd} 23:59:59`;

      let q = supabase
        .from('orders')
        .select(`
          id, order_number, created_at, status,
          total_amount, subtotal, diskon, biaya_kemasan, biaya_tambahan,
          payment_method, payment_method_detail, customer_name,
          kasir_name, kasir_id, channel, outlet_id,
          paid_amount, change_amount,
          outlets ( nama, alamat ),
          users:kasir_id ( name ),
          order_items (
            id, quantity, unit_price, subtotal, product_name,
            products ( nama, hpp_total, harga_pokok_penjualan, margin_amount, margin_percent, harga_jual )
          )
        `)
        .gte('created_at', startWIBStr)
        .lte('created_at', endWIBStr)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') q = q.eq('status', filterStatus);
      if (selectedOutlets.length > 0) q = q.in('outlet_id', selectedOutlets);

      const { data, error } = await q;
      if (error) { toast.error('Gagal memuat transaksi'); return; }

      const isUuid = (s?: string | null) =>
        !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

      setTransaksiList((data || []).map((row: any) => {
        const rawDetail = row.payment_method_detail;
        const rawMethod = row.payment_method;
        let metodeBayar = '—';
        if (rawDetail && !isUuid(rawDetail))                                        metodeBayar = rawDetail;
        else if (rawMethod === 'cash')                                               metodeBayar = 'Tunai';
        else if (rawMethod && isUuid(rawMethod) && paymentMapRef.current[rawMethod]) metodeBayar = paymentMapRef.current[rawMethod];
        else if (rawMethod && !isUuid(rawMethod))                                    metodeBayar = rawMethod;
        return {
          ...row,
          _kasirName:    row.kasir_name || row.users?.name || '—',
          _outletName:   row.outlets?.nama  || '—',
          _outletAlamat: row.outlets?.alamat || '',
          _metodeBayar:  metodeBayar,
        };
      }));
    } catch (err: any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [dateStart, dateEnd, filterStatus, selectedOutlets]);

  useRealtimeOrders({ onUpdate: () => loadTransaksi() });

  /* ── Load outlets ────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      setLoadingOutlets(true);
      try {
        const all = await getActiveOutlets();
        setOutlets(all);
        if (all.length === 1) setSelectedOutlets([all[0].id]);
      } catch { toast.error('Gagal memuat outlet'); }
      finally { setLoadingOutlets(false); }
    })();
  }, []);

  /* ── Load payment methods ────────────────────────────────── */
  useEffect(() => {
    getPaymentMethods().then(methods => {
      const map: Record<string, string> = {};
      methods.forEach(m => { if (m.id) map[m.id] = m.name; });
      paymentMapRef.current = map;
      setPaymentMethodsList(methods);
    }).catch(() => {});
  }, []);

  /* ── Init dev + printer state ────────────────────────────── */
  useEffect(() => {
    if (!loadingOutlets) loadTransaksi();
    setPrinterConnected(bluetoothPrinter.isConnected());
    setPrinterName(bluetoothPrinter.getDeviceName() || '');
    bluetoothPrinter.setConnectionChangeCallback(connected => {
      setPrinterConnected(connected);
      setPrinterName(bluetoothPrinter.getDeviceName() || '');
    });
    return () => { bluetoothPrinter.setConnectionChangeCallback(null); };
  }, [dateStart, dateEnd, filterStatus, selectedOutlets, loadingOutlets, loadTransaksi]);

  /* ── CETAK STRUK (dengan receipt settings toko) ──────────── */
  const handlePrint = async (trx: any) => {
    // 1. Koneksi printer jika belum
    if (!printerConnected) {
      toast.loading('Menghubungkan printer...', { id: 'bt' });
      const r = await bluetoothPrinter.connect();
      if (!r.success) { toast.error(r.error || 'Gagal koneksi', { id: 'bt' }); return; }
      toast.success(`Terhubung ke ${r.deviceName || 'printer'}`, { id: 'bt' });
      setPrinterConnected(true);
      setPrinterName(r.deviceName || '');
    }

    setPrinting(true);
    try {
      // 2. Ambil receipt settings dari toko (dengan cache)
      let receiptSettings = receiptCacheRef.current[trx.outlet_id];
      if (!receiptSettings) {
        receiptSettings = await getReceiptSettings(trx.outlet_id);
        if (receiptSettings) receiptCacheRef.current[trx.outlet_id] = receiptSettings;
      }

      // 3. Susun StrukData
      const sd: StrukData = {
        noTrx:         shortId(trx.id),
        namaOutlet:    trx._outletName,
        alamatOutlet:  trx._outletAlamat,
        namaPelanggan: trx.customer_name || 'Umum',
        kasirName:     trx._kasirName,
        waktu:         fmtDateTime(trx.created_at),
        items: (trx.order_items || []).map((it: any) => ({
          nama:     it.products?.nama || it.product_name || 'Item',
          qty:      it.quantity || 1,
          harga:    it.unit_price || 0,
          subtotal: (it.unit_price || 0) * (it.quantity || 1),
        })),
        biayaEkstra: [
          ...(trx.biaya_kemasan > 0 ? [{ nama: 'Biaya Kemasan', harga: trx.biaya_kemasan }] : []),
          ...(trx.biaya_tambahan > 0 ? [{ nama: 'Biaya Tambahan', harga: trx.biaya_tambahan }] : []),
        ],
        subtotal:    trx.subtotal || trx.total_amount || 0,
        totalBiaya:  (trx.biaya_kemasan || 0) + (trx.biaya_tambahan || 0),
        cartDiscount:trx.diskon || 0,
        finalTotal:  trx.total_amount || 0,
        metodeBayar: trx._metodeBayar,
        bayar:       trx.paid_amount || trx.total_amount || 0,
        kembalian:   trx.change_amount || 0,
        channel:     trx.channel || 'toko',
        receiptSettings: receiptSettings || {},
      };

      toast.loading('Mencetak struk...', { id: 'print' });
      const res = await bluetoothPrinter.printReceipt(sd);
      res.success
        ? toast.success('Struk berhasil dicetak', { id: 'print' })
        : toast.error(res.error || 'Gagal mencetak', { id: 'print' });
    } catch (e: any) {
      toast.error(e.message, { id: 'print' });
    } finally {
      setPrinting(false);
    }
  };

  /* ── Outlet filter helpers ───────────────────────────────── */
  const toggleOutlet = (id: string) =>
    setSelectedOutlets(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  /* ── Derived stats ──────────────────────────────────────── */
  const filtered = transaksiList.filter(t => {
    // 1. Filter metode pembayaran
    if (selectedPayment !== 'all') {
      if (selectedPayment === 'cash' && t.payment_method !== 'cash') return false;
      if (selectedPayment !== 'cash' && t.payment_method !== selectedPayment) return false;
    }
    
    // 2. Filter pencarian teks
    const searchLower = search.toLowerCase();
    return (
      t.id.toLowerCase().includes(searchLower) ||
      (t.customer_name || '').toLowerCase().includes(searchLower) ||
      (t._kasirName || '').toLowerCase().includes(searchLower) ||
      (t._outletName || '').toLowerCase().includes(searchLower) ||
      (t._metodeBayar || '').toLowerCase().includes(searchLower) ||
      (t.order_items || []).some((oi: any) =>
        (oi.products?.nama || oi.product_name || '').toLowerCase().includes(searchLower)
      )
    );
  });

  const completed   = transaksiList.filter(t => t.status === 'completed');
  const sumRevenue  = completed.reduce((s, t) => s + (t.total_amount || 0), 0);
  const sumDiskon   = transaksiList.reduce((s, t) => s + (t.diskon || 0), 0);
  const sumHPP      = completed.reduce((s, t) =>
    s + (t.order_items || []).reduce((a: number, it: any) => {
      const h = Number(it.products?.hpp_total ?? it.products?.harga_pokok_penjualan ?? 0);
      return a + h * (it.quantity || 1);
    }, 0), 0);
  const sumProfit   = sumRevenue - sumHPP;
  const marginPct   = sumRevenue > 0 ? (sumProfit / sumRevenue) * 100 : 0;
  const cntPending  = transaksiList.filter(t => t.status === 'pending').length;
  const cntCancel   = transaksiList.filter(t => t.status === 'cancelled').length;

  const STATUSES: { key: StatusFilter; label: string }[] = [{key:'all',label:'Semua'},{key:'completed',label:'Selesai'},{key:'pending',label:'Pending'},{key:'cancelled',label:'Batal'}];

  // Format display label for date range
  const fmtDateLabel = (d: string) => {
    const [y,m,day] = d.split('-');
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${parseInt(day)} ${months[parseInt(m)-1]} ${y}`;
  };
  const isToday = dateStart === getWIBDateString(0) && dateEnd === getWIBDateString(0);
  const dateRangeLabel = isToday ? 'Hari Ini' : dateStart === dateEnd ? fmtDateLabel(dateStart) : `${fmtDateLabel(dateStart)} – ${fmtDateLabel(dateEnd)}`;

  const applyDateRange = () => {
    setDateStart(pickerStart <= pickerEnd ? pickerStart : pickerEnd);
    setDateEnd(pickerStart <= pickerEnd ? pickerEnd : pickerStart);
    setShowDatePicker(false);
  };

  const setToday = () => {
    const t = getWIBDateString(0);
    setDateStart(t);
    setDateEnd(t);
    setPickerStart(t);
    setPickerEnd(t);
    setShowDatePicker(false);
  };

  const setPreset = (days: number) => {
    const end = getWIBDateString(0);
    const start = getWIBDateString(-days + 1);
    setDateStart(start);
    setDateEnd(end);
    setPickerStart(start);
    setPickerEnd(end);
    setShowDatePicker(false);
  };

  /* ── Handlers ────────────────────────────────────────────── */
  const handleTransactionSaved = (id: string, updatedFields: any) => {
    setTransaksiList(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t));
    if (selectedTrx?.id === id) setSelectedTrx((p: any) => p ? { ...p, ...updatedFields } : p);
  };

  const handleDeleted = (id: string) => {
    setTransaksiList(prev => prev.filter(t => t.id !== id));
    if (selectedTrx?.id === id) setSelectedTrx(null);
  };

  /* ════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6 space-y-4">

          {/* PAGE HEADER */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                <Receipt size={16} className="text-slate-700"/>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-semibold text-slate-900">Transaksi</h1>
                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded uppercase tracking-wide">Owner</span>
                  {printerConnected && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-medium rounded border border-emerald-200">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>
                      {printerName || 'Printer'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Manajemen transaksi · keuntungan & diskon · {dateRangeLabel}
                </p>
              </div>
            </div>
            <button onClick={loadTransaksi} disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''}/> Perbarui
            </button>
          </div>

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            <StatCard icon={TrendingUp}  color="emerald" highlight label="Total Pendapatan"  value={fmtRp(sumRevenue)} sub="Transaksi selesai"/>
            <StatCard icon={DollarSign}  color="purple"            label="Keuntungan Bersih" value={sumHPP > 0 ? fmtRp(sumProfit) : '—'} sub={sumHPP > 0 ? `Margin ${marginPct.toFixed(1)}%` : 'HPP belum di-set'}/>
            <StatCard icon={Receipt}     color="blue"              label="Jumlah Transaksi"  value={transaksiList.length} sub="Semua status"/>
            <StatCard icon={Tag}         color="orange"            label="Total Diskon"       value={fmtRp(sumDiskon)} sub="Diskon diberikan"/>
            <StatCard icon={AlertCircle} color="amber"             label="Menunggu"           value={cntPending} sub="Butuh tindakan"/>
            <StatCard icon={XCircle}     color="red"               label="Dibatalkan"         value={cntCancel}  sub="Transaksi batal"/>
          </div>

          {/* TOOLBAR */}
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 flex flex-wrap items-center gap-2">
            {/* ── DATE RANGE PICKER ── */}
            <div className="relative">
              <div className="flex items-center gap-1">
                {/* Hari Ini quick button */}
                <button
                  onClick={setToday}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all border ${
                    isToday
                      ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  Hari Ini
                </button>

                {/* Date range display button */}
                <button
                  ref={datePickerBtnRef}
                  onClick={() => {
                    setPickerStart(dateStart);
                    setPickerEnd(dateEnd);
                    if (!showDatePicker && datePickerBtnRef.current) {
                      const rect = datePickerBtnRef.current.getBoundingClientRect();
                      setDropdownPos({ top: rect.bottom + 6, left: rect.left });
                    }
                    setShowDatePicker(v=>!v);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                    !isToday
                      ? 'bg-orange-55 text-orange-700 border-orange-300 shadow-sm'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <CalendarDays size={12}/>
                  <span>{isToday ? 'Pilih Tanggal' : dateRangeLabel}</span>
                  <ChevronDown size={11} className={`transition-transform ${showDatePicker?'rotate-180':''}`}/>
                </button>
              </div>

              {/* Date picker dropdown — fixed to viewport so it's not clipped by overflow-hidden */}
              {showDatePicker && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowDatePicker(false)}/>
                  <div
                    className="fixed w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 overflow-hidden"
                    style={{ top: dropdownPos.top, left: dropdownPos.left }}
                  >
                    {/* Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white">
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80 mb-1">Pilih Rentang Tanggal</p>
                      <p className="text-sm font-bold">
                        {pickerStart === pickerEnd ? fmtDateLabel(pickerStart) : `${fmtDateLabel(pickerStart)} – ${fmtDateLabel(pickerEnd)}`}
                      </p>
                    </div>

                    {/* Preset buttons */}
                    <div className="px-3 pt-3 pb-1 grid grid-cols-4 gap-1">
                      {[{label:'Hari ini',days:1},{label:'7 Hari',days:7},{label:'30 Hari',days:30},{label:'90 Hari',days:90}].map(p=>(
                        <button
                          key={p.days}
                          onClick={() => setPreset(p.days)}
                          className="px-1.5 py-1 bg-slate-100 hover:bg-orange-100 hover:text-orange-700 rounded text-[10px] font-semibold text-slate-600 transition-colors text-center"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    {/* Date inputs */}
                    <div className="px-3 py-3 space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Dari Tanggal</label>
                        <input
                          type="date"
                          value={pickerStart}
                          max={pickerEnd || getWIBDateString(0)}
                          onChange={e => setPickerStart(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">Sampai Tanggal</label>
                        <input
                          type="date"
                          value={pickerEnd}
                          min={pickerStart}
                          max={getWIBDateString(0)}
                          onChange={e => setPickerEnd(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="px-3 pb-3 flex gap-2">
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="flex-1 py-2 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Batal
                      </button>
                      <button
                        onClick={applyDateRange}
                        className="flex-1 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        Terapkan
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="w-px h-5 bg-slate-200 hidden sm:block"/>


            {/* Status */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md">
              {STATUSES.map(s => (
                <button key={s.key} onClick={() => setFilterStatus(s.key)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${filterStatus === s.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {s.label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-slate-200 hidden sm:block"/>

            {/* Metode Bayar */}
            <div className="relative">
              <button onClick={() => setShowPaymentDrop(!showPaymentDrop)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium border transition-all ${
                  selectedPayment !== 'all'
                    ? 'bg-orange-50 text-orange-700 border-orange-300 shadow-sm'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}>
                <Banknote size={12}/>
                <span>
                  {selectedPayment === 'all' 
                    ? 'Semua Metode' 
                    : selectedPayment === 'cash' 
                      ? 'Tunai' 
                      : (paymentMethodsList.find(m=>m.id===selectedPayment)?.name || 'Metode Lain')
                  }
                </span>
                <ChevronDown size={11} className={`transition-transform ${showPaymentDrop ? 'rotate-180' : ''}`}/>
              </button>
              {showPaymentDrop && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowPaymentDrop(false)}/>
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-40 overflow-hidden py-1">
                    <button onClick={() => { setSelectedPayment('all'); setShowPaymentDrop(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${selectedPayment === 'all' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-slate-600'}`}>
                      Semua Metode
                    </button>
                    <button onClick={() => { setSelectedPayment('cash'); setShowPaymentDrop(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${selectedPayment === 'cash' ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-slate-600'}`}>
                      Tunai
                    </button>
                    {paymentMethodsList.map(m => {
                      if (!m.id) return null;
                      return (
                        <button key={m.id} onClick={() => { setSelectedPayment(m.id); setShowPaymentDrop(false); }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${selectedPayment === m.id ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-slate-600'}`}>
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Outlet */}
            {outlets.length > 1 && (
              <>
                <div className="w-px h-5 bg-slate-200 hidden sm:block"/>
                <div className="relative">
                  <button onClick={() => setShowOutletDrop(!showOutletDrop)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-[11px] font-medium text-slate-700 transition-colors">
                    <Building2 size={12}/>
                    {selectedOutlets.length === 0 || selectedOutlets.length === outlets.length ? 'Semua Outlet' : `${selectedOutlets.length} Outlet`}
                    <ChevronDown size={11} className={`transition-transform ${showOutletDrop ? 'rotate-180' : ''}`}/>
                  </button>
                  {showOutletDrop && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowOutletDrop(false)}/>
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Filter Outlet</p>
                            <button onClick={() => setShowOutletDrop(false)} className="p-0.5 hover:bg-slate-200 rounded text-slate-400"><X size={11}/></button>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => setSelectedOutlets(outlets.map(o => o.id))} className="flex-1 px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-medium text-slate-600">Pilih Semua</button>
                            <button onClick={() => setSelectedOutlets([])} className="flex-1 px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-medium text-slate-600">Hapus Filter</button>
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-2">
                          {outlets.map(o => (
                            <label key={o.id} className="flex items-start gap-2 px-2 py-2 hover:bg-slate-50 rounded cursor-pointer">
                              <input type="checkbox" checked={selectedOutlets.includes(o.id)} onChange={() => toggleOutlet(o.id)} className="mt-0.5 w-3.5 h-3.5 text-orange-500 border-slate-300 rounded cursor-pointer"/>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800">{o.nama}</p>
                                {o.alamat && <p className="text-[10px] text-slate-400 truncate mt-0.5">{o.alamat}</p>}
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Search */}
            <div className="relative ml-auto">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari ID, kasir, outlet, item..."
                className="pl-7 pr-3 py-1.5 w-56 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"/>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    {['Waktu','Order ID','Outlet','Kasir','Item','Diskon','Total','Keuntungan','Metode','Status','Aksi'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap first:pl-5 last:pr-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={11} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Loader2 size={20} className="animate-spin"/>
                        <span className="text-xs">Memuat data...</span>
                      </div>
                    </td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={11} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-1.5 text-slate-400">
                        <Receipt size={24} className="opacity-30"/>
                        <p className="text-xs">Tidak ada transaksi</p>
                      </div>
                    </td></tr>
                  ) : filtered.map(o => {
                    const itemsStr = (o.order_items || [])
                      .map((oi: any) => `${oi.products?.nama || oi.product_name || 'Item'} x${oi.quantity}`)
                      .join(', ');
                    const hpp = (o.order_items || []).reduce((a: number, it: any) => {
                      const h = Number(it.products?.hpp_total ?? it.products?.harga_pokok_penjualan ?? 0);
                      return a + h * (it.quantity || 1);
                    }, 0);
                    const profit  = o.total_amount - hpp;
                    const hasHPP  = hpp > 0;
                    const diskon  = o.diskon || 0;

                    return (
                      <tr key={o.id} onClick={() => setSelectedTrx(o)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors">
                        {/* Waktu */}
                        <td className="px-3 py-3 pl-5 whitespace-nowrap">
                          <p className="text-[10px] text-slate-400">{fmtDate(o.created_at)}</p>
                          <p className="text-xs font-semibold text-slate-800 font-mono">{fmtTime(o.created_at)}</p>
                        </td>
                        {/* Order ID */}
                        <td className="px-3 py-3">
                          <p className="text-xs font-bold text-orange-600 font-mono">{shortId(o.id)}</p>
                          <p className="text-[9px] text-slate-400 font-mono max-w-[80px] truncate">{o.id}</p>
                        </td>
                        {/* Outlet */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <Store size={10} className="text-slate-400 shrink-0"/>
                            <span className="text-xs font-semibold text-slate-800 whitespace-nowrap">{o._outletName}</span>
                          </div>
                        </td>
                        {/* Kasir */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <User size={10} className="text-slate-400 shrink-0"/>
                            <span className="text-xs text-slate-600 whitespace-nowrap">{o._kasirName}</span>
                          </div>
                        </td>
                        {/* Item */}
                        <td className="px-3 py-3">
                          <p className="text-xs text-slate-600 max-w-[160px] truncate" title={itemsStr}>{itemsStr || '—'}</p>
                        </td>
                        {/* Diskon */}
                        <td className="px-3 py-3">
                          {diskon > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                              <Tag size={8}/> {fmtRp(diskon)}
                            </span>
                          ) : <span className="text-[10px] text-slate-300">—</span>}
                        </td>
                        {/* Total */}
                        <td className="px-3 py-3">
                          <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{fmtRp(o.total_amount)}</span>
                        </td>
                        {/* Keuntungan */}
                        <td className="px-3 py-3">
                          {hasHPP && o.status === 'completed' ? (
                            <div>
                              <p className={`text-xs font-bold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtRp(profit)}</p>
                              <p className="text-[9px] text-slate-400">{((profit / o.total_amount) * 100).toFixed(0)}% margin</p>
                            </div>
                          ) : <span className="text-[10px] text-slate-300">{o.status !== 'completed' ? 'N/A' : '—'}</span>}
                        </td>
                        {/* Metode */}
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-white rounded text-[9px] font-semibold whitespace-nowrap">
                            <Banknote size={9}/> {o._metodeBayar}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="px-3 py-3">
                          <StatusBadge status={o.status}/>
                        </td>
                        {/* Aksi */}
                        <td className="px-3 py-3 pr-5" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handlePrint(o)} disabled={printing}
                              title="Cetak Struk Ulang"
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded transition-colors disabled:opacity-40">
                              <Printer size={11}/>
                            </button>
                            <button onClick={() => setEditingTrx(o)}
                              title="Edit Status"
                              className="p-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 rounded transition-colors">
                              <Pencil size={11}/>
                            </button>
                            <button onClick={() => setDeletingTrx(o)}
                              title="Hapus Transaksi"
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded transition-colors">
                              <Trash2 size={11}/>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            {!loading && filtered.length > 0 && (
              <div className="border-t border-slate-100 px-5 py-2 bg-slate-50/50 flex items-center justify-between">
                <p className="text-[10px] text-slate-400">
                  <span className="font-medium text-slate-600">{filtered.length}</span> dari{' '}
                  <span className="font-medium text-slate-600">{transaksiList.length}</span> transaksi
                </p>
                <p className="text-[10px] text-slate-400">
                  Total: <span className="font-semibold text-slate-700">
                    {fmtRp(filtered.reduce((s, t) => s + (t.total_amount || 0), 0))}
                  </span>
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* DETAIL PANEL */}
      {selectedTrx && !editingTrx && !deletingTrx && (
        <DetailPanel
          trx={selectedTrx}
          onClose={() => setSelectedTrx(null)}
          onEditStatus={trx => setEditingTrx(trx)}
          onDelete={trx => setDeletingTrx(trx)}
          onPrint={handlePrint}
          printing={printing}
        />
      )}

      {/* EDIT TRANSACTION MODAL */}
      {editingTrx && (
        <EditTransactionModal
          trx={editingTrx}
          onClose={() => setEditingTrx(null)}
          onSaved={handleTransactionSaved}
          paymentMethodsList={paymentMethodsList}
        />
      )}

      {/* DELETE CONFIRM MODAL */}
      {deletingTrx && (
        <DeleteModal
          trx={deletingTrx}
          onClose={() => setDeletingTrx(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
