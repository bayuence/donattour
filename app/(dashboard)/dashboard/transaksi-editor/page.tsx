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

type Period       = 'today' | 'week' | 'month' | 'all';
type StatusFilter = 'all' | 'completed' | 'pending' | 'cancelled';

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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Hapus order_items dulu (cascade mungkin sudah ada, tapi untuk keamanan)
      const { error: itemsErr } = await supabase
        .from('order_items').delete().eq('order_id', trx.id);
      if (itemsErr) throw itemsErr;

      const { error: orderErr } = await supabase
        .from('orders').delete().eq('id', trx.id);
      if (orderErr) throw orderErr;

      toast.success('Transaksi berhasil dihapus');
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
   EDIT STATUS MODAL
════════════════════════════════════════════════════════════════ */
function EditStatusModal({ trx, onClose, onSaved }: {
  trx: any; onClose: () => void; onSaved: (id: string, newStatus: string) => void;
}) {
  const [status, setStatus] = useState(trx.status);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (status === trx.status) { onClose(); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', trx.id);
      if (error) throw error;
      toast.success('Status diperbarui');
      onSaved(trx.id, status);
      onClose();
    } catch (e: any) {
      toast.error('Gagal: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Edit Status</p>
            <p className="text-sm font-bold text-slate-900 font-mono">{shortId(trx.id)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X size={14}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            {(['completed', 'pending', 'cancelled'] as const).map(s => {
              const labels: Record<string, string> = { completed: 'Selesai', pending: 'Pending', cancelled: 'Dibatalkan' };
              const colors: Record<string, string> = {
                completed: 'border-emerald-300 bg-emerald-50 text-emerald-800',
                pending:   'border-amber-300 bg-amber-50 text-amber-800',
                cancelled: 'border-red-300 bg-red-50 text-red-800',
              };
              return (
                <label key={s}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${status === s ? colors[s] : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="status" value={s} checked={status === s}
                    onChange={() => setStatus(s)} className="sr-only"/>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${status === s ? 'border-current' : 'border-slate-300'}`}>
                    {status === s && <div className="w-2 h-2 rounded-full bg-current"/>}
                  </div>
                  <span className="text-sm font-semibold">{labels[s]}</span>
                </label>
              );
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Batal</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5">
              {saving ? <><Loader2 size={13} className="animate-spin"/> Menyimpan...</> : <><Save size={13}/> Simpan</>}
            </button>
          </div>
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

  const [filterPeriod,  setFilterPeriod] = useState<Period>('today');
  const [filterStatus,  setFilterStatus] = useState<StatusFilter>('all');

  const [outlets,        setOutlets]           = useState<Outlet[]>([]);
  const [selectedOutlets,setSelectedOutlets]   = useState<string[]>([]);
  const [showOutletDrop, setShowOutletDrop]    = useState(false);
  const [loadingOutlets, setLoadingOutlets]    = useState(true);

  // Cache payment method UUID → nama
  const paymentMapRef = useRef<Record<string, string>>({});
  // Cache receipt settings per outlet_id
  const receiptCacheRef = useRef<Record<string, any>>({});

  /* ── load transaksi ─────────────────────────────────────── */
  const loadTransaksi = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const Y = wib.getFullYear(), M = wib.getMonth(), D = wib.getDate();

      const ranges: Record<Period, [string, string]> = {
        today: [new Date(Date.UTC(Y,M,D-1,17,0,0)).toISOString(),  new Date(Date.UTC(Y,M,D,16,59,59)).toISOString()],
        week:  [new Date(Date.UTC(Y,M,D-7,17,0,0)).toISOString(),  new Date(Date.UTC(Y,M,D,16,59,59)).toISOString()],
        month: [new Date(Date.UTC(Y,M,D-30,17,0,0)).toISOString(), new Date(Date.UTC(Y,M,D,16,59,59)).toISOString()],
        all:   [new Date(Date.UTC(Y,M,D-180,17,0,0)).toISOString(),new Date(Date.UTC(Y,M,D,16,59,59)).toISOString()],
      };
      const [startUTC, endUTC] = ranges[filterPeriod];

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
        .gte('created_at', startUTC)
        .lte('created_at', endUTC)
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
  }, [filterPeriod, filterStatus, selectedOutlets]);

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
  }, [filterPeriod, filterStatus, selectedOutlets, loadingOutlets, loadTransaksi]);

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
  const filtered = transaksiList.filter(t =>
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    (t.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t._kasirName || '').toLowerCase().includes(search.toLowerCase()) ||
    (t._outletName || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.order_items || []).some((oi: any) =>
      (oi.products?.nama || oi.product_name || '').toLowerCase().includes(search.toLowerCase())
    )
  );

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

  const PERIODS:  { key: Period; label: string }[]       = [{ key:'today',label:'Hari Ini'},{key:'week',label:'7 Hari'},{key:'month',label:'30 Hari'},{key:'all',label:'6 Bulan'}];
  const STATUSES: { key: StatusFilter; label: string }[] = [{key:'all',label:'Semua'},{key:'completed',label:'Selesai'},{key:'pending',label:'Pending'},{key:'cancelled',label:'Batal'}];

  /* ── Handlers ────────────────────────────────────────────── */
  const handleStatusSaved = (id: string, newStatus: string) => {
    setTransaksiList(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    if (selectedTrx?.id === id) setSelectedTrx((p: any) => p ? { ...p, status: newStatus } : p);
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
                  Manajemen transaksi · keuntungan & diskon
                  {filterPeriod === 'today' && ' · Hari Ini'}
                  {filterPeriod === 'week'  && ' · 7 Hari'}
                  {filterPeriod === 'month' && ' · 30 Hari'}
                  {filterPeriod === 'all'   && ' · 6 Bulan'}
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
            {/* Period */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md">
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setFilterPeriod(p.key)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${filterPeriod === p.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                  {p.label}
                </button>
              ))}
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

      {/* EDIT STATUS MODAL */}
      {editingTrx && (
        <EditStatusModal
          trx={editingTrx}
          onClose={() => setEditingTrx(null)}
          onSaved={handleStatusSaved}
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
