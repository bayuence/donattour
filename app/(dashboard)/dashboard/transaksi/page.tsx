'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as db from '@/lib/db';
import { getPaymentMethods } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { bluetoothPrinter, type StrukData } from '@/lib/bluetooth-printer';
import { toast } from 'sonner';
import { useRealtimeOrders } from '@/lib/hooks/use-realtime-inventory';
import {
  Receipt, Search, RefreshCw, Printer, X, Store, User,
  CreditCard, Package, TrendingUp, AlertCircle,
  XCircle, CheckCircle2, Loader2, Banknote,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────── */
const fmtRp   = (n: number) => 'Rp\u00a0' + (n || 0).toLocaleString('id-ID');
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', timeZone:'Asia/Jakarta' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', second:'2-digit', timeZone:'Asia/Jakarta' });
const shortId = (id: string) =>
  'TRX-' + id.replace(/-/g,'').toUpperCase().slice(-6);

type Period       = 'today'|'week'|'month'|'all';
type StatusFilter = 'all'|'completed'|'pending'|'cancelled';

/* ─── status badge ────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string,{ label:string; cls:string; icon:any }> = {
    completed: { label:'Selesai', cls:'bg-emerald-50 text-emerald-700 border-emerald-200', icon:CheckCircle2 },
    pending:   { label:'Pending', cls:'bg-amber-50  text-amber-700  border-amber-200',    icon:AlertCircle  },
    cancelled: { label:'Batal',   cls:'bg-red-50    text-red-700    border-red-200',      icon:XCircle      },
  };
  const s = map[status] ?? { label:status, cls:'bg-slate-100 text-slate-600 border-slate-200', icon:AlertCircle };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${s.cls}`}>
      <Icon size={9}/> {s.label}
    </span>
  );
}

/* ─── stat card ───────────────────────────────────────────── */
function StatCard({ label, value, sub, icon:Icon, color }:{
  label:string; value:string|number; sub?:string; icon:any;
  color:'emerald'|'blue'|'amber'|'red';
}) {
  const c = { emerald:'text-emerald-600 bg-emerald-50', blue:'text-blue-600 bg-blue-50',
               amber:'text-amber-600 bg-amber-50', red:'text-red-600 bg-red-50' }[color];
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-3">
      <div className={`p-2 rounded-lg shrink-0 ${c}`}><Icon size={16}/></div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 leading-tight">{label}</p>
        <p className={`text-lg font-bold mt-0.5 leading-none ${c.split(' ')[0]}`}>{value}</p>
        {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function TransaksiPage() {
  const [transaksiList, setTransaksiList] = useState<any[]>([]);
  const [search, setSearch]               = useState('');
  const [loading, setLoading]             = useState(true);
  const [selectedTrx, setSelectedTrx]     = useState<any|null>(null);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName]     = useState('');
  const [printing, setPrinting]           = useState(false);
  const [filterPeriod, setFilterPeriod]   = useState<Period>('today');
  const [filterStatus, setFilterStatus]   = useState<StatusFilter>('all');
  // Ref untuk payment method map (UUID → nama) agar selalu fresh di dalam callback
  const paymentMethodMapRef = useRef<Record<string,string>>({});

  /* ── load data ───────────────────────────────────────────── */
  const loadTransaksi = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const wib = new Date(now.toLocaleString('en-US', { timeZone:'Asia/Jakarta' }));
      const eod = new Date(wib.getFullYear(), wib.getMonth(), wib.getDate(), 23, 59, 59);
      let startDate: Date;
      if      (filterPeriod==='today') startDate = new Date(wib.getFullYear(), wib.getMonth(), wib.getDate(), 0,0,0);
      else if (filterPeriod==='week')  { startDate=new Date(wib); startDate.setDate(startDate.getDate()-7); }
      else if (filterPeriod==='month') { startDate=new Date(wib); startDate.setMonth(startDate.getMonth()-1); }
      else                             { startDate=new Date(wib); startDate.setMonth(startDate.getMonth()-6); }

      let query = supabase
        .from('orders')
        .select(`
          id, order_number, created_at, status, total_amount,
          payment_method, payment_method_detail, customer_name,
          kasir_name, kasir_id, channel, outlet_id,
          outlets ( nama, alamat ),
          users:kasir_id ( name ),
          order_items (
            quantity, unit_price, product_name,
            products ( nama )
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', eod.toISOString())
        .order('created_at', { ascending:false });

      if (filterStatus!=='all') query = query.eq('status', filterStatus);

      const { data, error } = await query;
      if (!error && data) {
        const isUuid = (s?: string|null) =>
          !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
        setTransaksiList(data.map((row: any) => {
          // payment_method_detail lama mungkin berisi UUID (method ID), bukan nama
          const rawDetail = row.payment_method_detail;
          const rawMethod = row.payment_method;
          let metodeBayar = '—';
          if (rawDetail && !isUuid(rawDetail)) {
            metodeBayar = rawDetail;
          } else if (rawMethod === 'cash') {
            metodeBayar = 'Tunai';
          } else if (rawMethod && isUuid(rawMethod) && paymentMethodMapRef.current[rawMethod]) {
            // Resolve UUID via payment methods ref
            metodeBayar = paymentMethodMapRef.current[rawMethod];
          } else if (rawMethod && !isUuid(rawMethod)) {
            metodeBayar = rawMethod;
          } else if (rawDetail && !isUuid(rawDetail)) {
            metodeBayar = rawDetail;
          }
          return {
            ...row,
            _kasirName:    row.kasir_name || row.users?.name || '—',
            _outletName:   row.outlets?.nama  || '—',
            _outletAlamat: row.outlets?.alamat || '',
            _metodeBayar:  metodeBayar,
          };
        }));
      } else if (error) {
        console.error(error);
        toast.error('Gagal memuat transaksi');
      }
    } catch (err:any) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [filterPeriod, filterStatus]);

  useRealtimeOrders({ onUpdate:()=>loadTransaksi() });

  // Fetch payment methods sekali saja saat mount
  useEffect(() => {
    getPaymentMethods().then(methods => {
      const map: Record<string,string> = {};
      methods.forEach(m => { if (m.id) map[m.id] = m.name; });
      paymentMethodMapRef.current = map;
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadTransaksi();
    setPrinterConnected(bluetoothPrinter.isConnected());
    setPrinterName(bluetoothPrinter.getDeviceName()||'');
    bluetoothPrinter.setConnectionChangeCallback(setPrinterConnected);
    return ()=>{ bluetoothPrinter.setConnectionChangeCallback(null); };
  }, [filterPeriod, filterStatus]);

  /* ── print ───────────────────────────────────────────────── */
  const handlePrint = async () => {
    if (!selectedTrx) return;
    if (!printerConnected) {
      toast.loading('Menghubungkan printer...', { id:'bt' });
      const r = await bluetoothPrinter.connect();
      if (!r.success) { toast.error(r.error||'Gagal', { id:'bt' }); return; }
      toast.success('Terhubung ke '+(r.deviceName||'printer'), { id:'bt' });
      setPrinterConnected(true); setPrinterName(r.deviceName||'');
    }
    setPrinting(true);
    try {
      const sd: StrukData = {
        noTrx:        shortId(selectedTrx.id),
        namaOutlet:   selectedTrx._outletName,
        alamatOutlet: selectedTrx._outletAlamat,
        namaPelanggan:selectedTrx.customer_name||'Umum',
        kasirName:    selectedTrx._kasirName,
        waktu:        new Date(selectedTrx.created_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}),
        items:(selectedTrx.order_items||[]).map((it:any)=>({
          nama:    it.products?.nama||it.product_name||'Item',
          qty:     it.quantity||1,
          harga:   it.unit_price||0,
          subtotal:(it.unit_price||0)*(it.quantity||1),
        })),
        biayaEkstra:[],
        subtotal:    selectedTrx.total_amount||0,
        totalBiaya:  0,
        finalTotal:  selectedTrx.total_amount||0,
        metodeBayar: selectedTrx._metodeBayar,
        bayar:       selectedTrx.total_amount||0,
        kembalian:   0,
        channel:     'toko',
        receiptSettings:{},
      };
      toast.loading('Mencetak...', { id:'print' });
      const res = await bluetoothPrinter.printReceipt(sd);
      res.success ? toast.success('Struk berhasil dicetak',{id:'print'}) : toast.error(res.error||'Gagal',{id:'print'});
    } catch(e:any) { toast.error(e.message,{id:'print'}); }
    finally { setPrinting(false); }
  };

  /* ── derived ─────────────────────────────────────────────── */
  const filtered = transaksiList.filter(t =>
    t.id.toLowerCase().includes(search.toLowerCase()) ||
    (t.customer_name||'').toLowerCase().includes(search.toLowerCase()) ||
    (t._kasirName||'').toLowerCase().includes(search.toLowerCase()) ||
    (t._outletName||'').toLowerCase().includes(search.toLowerCase()) ||
    t.order_items.some((oi:any)=>(oi.products?.nama||oi.product_name||'').toLowerCase().includes(search.toLowerCase()))
  );
  const sumCompleted = transaksiList.filter(t=>t.status==='completed').reduce((s,t)=>s+t.total_amount,0);
  const cntTotal     = transaksiList.length;
  const cntPending   = transaksiList.filter(t=>t.status==='pending').length;
  const cntCancelled = transaksiList.filter(t=>t.status==='cancelled').length;

  const PERIODS:  {key:Period;       label:string}[] = [{key:'today',label:'Hari Ini'},{key:'week',label:'7 Hari'},{key:'month',label:'30 Hari'},{key:'all',label:'6 Bulan'}];
  const STATUSES: {key:StatusFilter; label:string}[] = [{key:'all',label:'Semua'},{key:'completed',label:'Selesai'},{key:'pending',label:'Pending'},{key:'cancelled',label:'Batal'}];

  /* ── render ──────────────────────────────────────────────── */
  return (
    /* Full height, no max-width — mengisi seluruh area content */
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">

      {/* ── SCROLLABLE BODY ── */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6 space-y-4">

          {/* PAGE HEADER */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm">
                <Receipt size={16} className="text-slate-700"/>
              </div>
              <div>
                <h1 className="text-sm font-semibold text-slate-900 leading-tight">Transaksi</h1>
                <p className="text-[11px] text-slate-400">Riwayat seluruh transaksi outlet</p>
              </div>
            </div>
            <button
              onClick={loadTransaksi} disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading?'animate-spin':''}/> Perbarui
            </button>
          </div>

          {/* STAT CARDS — compact grid, 2 col mobile, 4 col desktop */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard icon={TrendingUp} color="emerald" label="Total Penjualan"  value={fmtRp(sumCompleted)} sub="Transaksi selesai"/>
            <StatCard icon={Receipt}    color="blue"    label="Jumlah Transaksi" value={cntTotal}            sub="Semua status"/>
            <StatCard icon={AlertCircle}color="amber"   label="Menunggu"         value={cntPending}          sub="Butuh tindakan"/>
            <StatCard icon={XCircle}    color="red"     label="Dibatalkan"       value={cntCancelled}        sub="Transaksi batal"/>
          </div>

          {/* TOOLBAR */}
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 flex flex-wrap items-center gap-2">
            {/* Period */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md">
              {PERIODS.map(p=>(
                <button key={p.key} onClick={()=>setFilterPeriod(p.key)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${filterPeriod===p.key?'bg-white text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                  {p.label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-slate-200 hidden sm:block"/>

            {/* Status */}
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md">
              {STATUSES.map(s=>(
                <button key={s.key} onClick={()=>setFilterStatus(s.key)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${filterStatus===s.key?'bg-white text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative ml-auto">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input
                value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Cari ID, kasir, outlet, item..."
                className="pl-7 pr-3 py-1.5 w-52 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* TABLE — full width, horizontal scroll on small screens */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    {['Waktu','Order ID','Outlet','Kasir','Pelanggan','Item','Metode Bayar','Status','Total'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap first:pl-5 last:pr-5 last:text-right">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={9} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Loader2 size={20} className="animate-spin"/>
                        <span className="text-xs">Memuat data...</span>
                      </div>
                    </td></tr>
                  ) : filtered.length===0 ? (
                    <tr><td colSpan={9} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-1.5 text-slate-400">
                        <Receipt size={24} className="opacity-30"/>
                        <p className="text-xs">Tidak ada transaksi</p>
                      </div>
                    </td></tr>
                  ) : filtered.map(o=>{
                    const itemsStr = o.order_items
                      .filter((oi:any)=>oi.unit_price>0) // hanya item berbayar
                      .map((oi:any)=>`${oi.products?.nama||oi.product_name||'Item'} x${oi.quantity}`)
                      .join(', ') || o.order_items.map((oi:any)=>oi.products?.nama||oi.product_name||'Item').join(', ');
                    return (
                      <tr key={o.id} onClick={()=>setSelectedTrx(o)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors group">
                        {/* Waktu */}
                        <td className="px-3 py-3 pl-5 whitespace-nowrap">
                          <p className="text-[10px] text-slate-400">{fmtDate(o.created_at)}</p>
                          <p className="text-xs font-semibold text-slate-800 font-mono">{fmtTime(o.created_at)}</p>
                        </td>
                        {/* Order ID */}
                        <td className="px-3 py-3">
                          <p className="text-xs font-bold text-slate-900 font-mono">{shortId(o.id)}</p>
                          <p className="text-[9px] text-slate-400 font-mono max-w-[90px] truncate">{o.id}</p>
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
                        {/* Pelanggan */}
                        <td className="px-3 py-3">
                          <span className="text-xs text-slate-700">{o.customer_name||'Umum'}</span>
                        </td>
                        {/* Item */}
                        <td className="px-3 py-3">
                          <p className="text-xs text-slate-600 max-w-[180px] truncate" title={itemsStr}>{itemsStr}</p>
                        </td>
                        {/* Metode Bayar - channel dihapus, hanya tampil metode */}
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800 text-white rounded text-[9px] font-semibold whitespace-nowrap">
                            <Banknote size={9}/> {o._metodeBayar}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="px-3 py-3">
                          <StatusBadge status={o.status}/>
                        </td>
                        {/* Total */}
                        <td className="px-3 py-3 pr-5 text-right">
                          <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{fmtRp(o.total_amount)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table footer */}
            {!loading && filtered.length>0 && (
              <div className="border-t border-slate-100 px-5 py-2 bg-slate-50/50">
                <p className="text-[10px] text-slate-400">
                  <span className="font-medium text-slate-600">{filtered.length}</span> dari <span className="font-medium text-slate-600">{transaksiList.length}</span> transaksi
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ══ DETAIL SIDE PANEL (tanpa blur) ═════════════════════ */}
      {selectedTrx && (
        <>
          {/* Overlay tipis tanpa blur */}
          <div
            className="fixed inset-0 z-40 bg-slate-900/20"
            onClick={()=>setSelectedTrx(null)}
          />

          {/* Panel */}
          <div className="fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] bg-white border-l border-slate-200 shadow-xl flex flex-col">

            {/* Panel header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Detail Transaksi</p>
                <p className="text-base font-bold text-slate-900 font-mono mt-0.5">{shortId(selectedTrx.id)}</p>
              </div>
              <button onClick={()=>setSelectedTrx(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600 mt-0.5">
                <X size={15}/>
              </button>
            </div>

            {/* Panel body — scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Status + waktu */}
              <div className="flex items-center justify-between">
                <StatusBadge status={selectedTrx.status}/>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">{fmtDate(selectedTrx.created_at)}</p>
                  <p className="text-xs font-semibold text-slate-800 font-mono">{fmtTime(selectedTrx.created_at)}</p>
                </div>
              </div>

              {/* Info grid: Outlet, Kasir, Pelanggan, Metode */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon:Store,     label:'Outlet',          value:selectedTrx._outletName },
                  { icon:User,      label:'Kasir',           value:selectedTrx._kasirName },
                  { icon:User,      label:'Pelanggan',       value:selectedTrx.customer_name||'Umum' },
                  { icon:Banknote,  label:'Metode Bayar',    value:selectedTrx._metodeBayar },
                ].map(({icon:Icon,label,value})=>(
                  <div key={label} className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                    <div className="flex items-center gap-1 mb-1">
                      <Icon size={9} className="text-slate-400"/>
                      <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* UUID */}
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Order UUID</p>
                <p className="text-[9px] font-mono text-slate-500 break-all leading-relaxed">{selectedTrx.id}</p>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Package size={11} className="text-slate-400"/>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Item Pesanan</p>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                  {(selectedTrx.order_items||[]).map((it:any, idx:number)=>(
                    <div key={idx} className="flex items-center justify-between px-3 py-2.5">
                      <div className="min-w-0 mr-2">
                        <p className="text-xs font-medium text-slate-800 leading-tight">
                          {it.products?.nama||it.product_name||'Item'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {it.quantity}× {fmtRp(it.unit_price)}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 shrink-0">
                        {fmtRp((it.unit_price||0)*(it.quantity||1))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between py-3 border-t border-dashed border-slate-200">
                <span className="text-xs text-slate-500">Total Transaksi</span>
                <span className="text-base font-bold text-slate-900">{fmtRp(selectedTrx.total_amount)}</span>
              </div>
            </div>

            {/* Panel footer — tombol cetak ulang yang jelas */}
            <div className="shrink-0 border-t border-slate-100 px-5 py-3 space-y-2">
              {/* Cetak ulang struk */}
              <button
                onClick={handlePrint} disabled={printing}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                  printing
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {printing
                  ? <><Loader2 size={13} className="animate-spin"/> Sedang mencetak...</>
                  : <><Printer size={13}/> {printerConnected ? 'Cetak Ulang Struk' : 'Hubungkan Printer & Cetak'}</>
                }
              </button>
              {printerConnected && (
                <p className="text-center text-[10px] text-emerald-600 font-medium">
                  ● Printer terhubung: {printerName||'Bluetooth Printer'}
                </p>
              )}
              <button
                onClick={()=>setSelectedTrx(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
