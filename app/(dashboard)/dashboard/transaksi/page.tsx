'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as db from '@/lib/db';
import { getPaymentMethods, getActiveOutlets } from '@/lib/db';
import { getReceiptSettings } from '@/lib/db/outlets';
import { bluetoothPrinter, type StrukData } from '@/lib/bluetooth-printer';
import { toast } from 'sonner';
import { useRealtimeOrders } from '@/lib/hooks/use-realtime-inventory';
import { useUser } from '@/lib/context/user-context';
import { getTodayWIB } from '@/lib/utils/timezone';
import type { Outlet } from '@/lib/types';
import {
  Receipt, Search, RefreshCw, Printer, X, Store, User,
  CreditCard, Package, TrendingUp, AlertCircle,
  XCircle, CheckCircle2, Loader2, Banknote, ChevronDown, Building2,
  CalendarDays, ChevronLeft, ChevronRight,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────────── */
const fmtRp   = (n: number) => 'Rp\u00a0' + (n || 0).toLocaleString('id-ID');
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  // Convert to WIB manually (UTC+7)
  const utcTime = d.getTime();
  const wibTime = utcTime + (7 * 60 * 60 * 1000); // Add 7 hours
  const wibDate = new Date(wibTime);

  const day = String(wibDate.getUTCDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[wibDate.getUTCMonth()];
  const year = wibDate.getUTCFullYear();

  return `${day} ${month} ${year}`;
};
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  // Convert to WIB manually (UTC+7)
  const utcTime = d.getTime();
  const wibTime = utcTime + (7 * 60 * 60 * 1000); // Add 7 hours
  const wibDate = new Date(wibTime);

  const hours = String(wibDate.getUTCHours()).padStart(2, '0');
  const minutes = String(wibDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(wibDate.getUTCSeconds()).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};
const shortId = (id: string) =>
  'TRX-' + id.replace(/-/g,'').toUpperCase().slice(-6);

type StatusFilter = 'all'|'completed'|'pending'|'cancelled';

// Helper: get WIB date string YYYY-MM-DD
function getWIBDateString(offsetDays = 0): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

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
  const { user, hasRole } = useUser();
  const [transaksiList, setTransaksiList] = useState<any[]>([]);
  const [search, setSearch]               = useState('');
  const [loading, setLoading]             = useState(true);
  const [selectedTrx, setSelectedTrx]     = useState<any|null>(null);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName]     = useState('');
  const [printing, setPrinting]           = useState(false);
  const [filterStatus, setFilterStatus]   = useState<StatusFilter>('all');

  // ── DATE RANGE FILTER ────────────────────────────────────────
  const todayStr = getWIBDateString(0);
  const [dateStart, setDateStart] = useState<string>(todayStr);
  const [dateEnd,   setDateEnd]   = useState<string>(todayStr);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerStart, setPickerStart] = useState<string>(todayStr);
  const [pickerEnd,   setPickerEnd]   = useState<string>(todayStr);
  const datePickerBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // ── OUTLET FILTER STATE ──────────────────────────────────────
  const [outlets, setOutlets]             = useState<Outlet[]>([]);
  const [selectedOutlets, setSelectedOutlets] = useState<string[]>([]); // Array outlet IDs
  const [showOutletDropdown, setShowOutletDropdown] = useState(false);
  const [loadingOutlets, setLoadingOutlets] = useState(true);

  const [paymentMethodsList, setPaymentMethodsList] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [showPaymentDrop, setShowPaymentDrop] = useState(false);
  
  // Ref untuk payment method map (UUID → nama) agar selalu fresh di dalam callback
  const paymentMethodMapRef = useRef<Record<string,string>>({});
  // Cache receipt settings per outlet_id agar tidak fetch berulang
  const receiptCacheRef = useRef<Record<string,any>>({});

  /* ── load data via API (bypass RLS) ─────────────────────── */
  const loadTransaksi = useCallback(async () => {
    setLoading(true);
    try {
      // Build WIB start/end from dateStart and dateEnd state
      // dateStart/dateEnd are 'YYYY-MM-DD' in WIB. DB stores local WIB times.
      const startWIBStr = `${dateStart} 00:00:00`;
      // For end: if dateEnd == todayStr, use current time; else end of day
      const wibNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const currentTodayStr = `${wibNow.getFullYear()}-${String(wibNow.getMonth()+1).padStart(2,'0')}-${String(wibNow.getDate()).padStart(2,'0')}`;
      const endWIBStr = dateEnd === currentTodayStr
        ? `${String(wibNow.getHours()).padStart(2,'0')}:${String(wibNow.getMinutes()).padStart(2,'0')}:${String(wibNow.getSeconds()).padStart(2,'0')}`
          .padStart(8,'0') && `${dateEnd} ${String(wibNow.getHours()).padStart(2,'0')}:${String(wibNow.getMinutes()).padStart(2,'0')}:${String(wibNow.getSeconds()).padStart(2,'0')}`
        : `${dateEnd} 23:59:59`;

      // Build query params
      const params = new URLSearchParams({
        start:  startWIBStr,
        end:    endWIBStr,
        status: filterStatus,
      });
      if (selectedOutlets.length > 0) {
        params.set('outlet_ids', selectedOutlets.join(','));
      }

      console.log('🔍 Fetching transaksi:', { start: startWIBStr, end: endWIBStr, dateStart, dateEnd, filterStatus });

      const res  = await fetch(`/api/transaksi?${params.toString()}`);
      const json = await res.json();

      console.log('📊 API Result:', { success: json.success, count: json.data?.length || 0, error: json.error });

      if (json.success && json.data) {
        const isUuid = (s?: string|null) =>
          !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
        setTransaksiList(json.data.map((row: any) => {
          const rawDetail = row.payment_method_detail;
          const rawMethod = row.payment_method;
          let metodeBayar = '—';
          if (rawDetail && !isUuid(rawDetail)) {
            metodeBayar = rawDetail;
          } else if (rawMethod === 'cash') {
            metodeBayar = 'Tunai';
          } else if (rawMethod && isUuid(rawMethod) && paymentMethodMapRef.current[rawMethod]) {
            metodeBayar = paymentMethodMapRef.current[rawMethod];
          } else if (rawMethod && !isUuid(rawMethod)) {
            metodeBayar = rawMethod;
          }
          return {
            ...row,
            _kasirName:    row.kasir_name || row.users?.name || '—',
            _outletName:   row.outlets?.nama  || '—',
            _outletAlamat: row.outlets?.alamat || '',
            _metodeBayar:  metodeBayar,
          };
        }));
      } else if (!json.success) {
        console.error('❌ API Error:', json.error);
        toast.error('Gagal memuat transaksi: ' + (json.error || 'Unknown error'));
      }
    } catch (err:any) {
      console.error('❌ Exception:', err);
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [dateStart, dateEnd, filterStatus, selectedOutlets]);


  useRealtimeOrders({ onUpdate:()=>loadTransaksi() });

  // ── Load outlets on mount ────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingOutlets(true);
      try {
        const allOutlets = await getActiveOutlets();
        
        // Filter berdasarkan user role
        let availableOutlets = allOutlets;
        if (user && !hasRole(['admin', 'owner'])) {
          // Staff hanya bisa lihat outlet mereka
          if (user.outlet_id) {
            availableOutlets = allOutlets.filter(o => o.id === user.outlet_id);
          } else {
            availableOutlets = [];
          }
        }
        
        setOutlets(availableOutlets);
        
        // Auto-select outlet untuk non-admin
        if (availableOutlets.length === 1) {
          setSelectedOutlets([availableOutlets[0].id]);
        } else if (availableOutlets.length > 0 && user && !hasRole(['admin', 'owner'])) {
          // Staff dengan 1 outlet, auto-select
          setSelectedOutlets([availableOutlets[0].id]);
        }
        // Admin/Owner: default show all (empty array = all)
        
      } catch (err) {
        console.error('Error loading outlets:', err);
        toast.error('Gagal memuat daftar outlet');
      } finally {
        setLoadingOutlets(false);
      }
    })();
  }, [user, hasRole]);

  // Fetch payment methods sekali saja saat mount
  useEffect(() => {
    getPaymentMethods().then(methods => {
      const map: Record<string,string> = {};
      methods.forEach(m => { if (m.id) map[m.id] = m.name; });
      paymentMethodMapRef.current = map;
      setPaymentMethodsList(methods);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loadingOutlets) {
      loadTransaksi();
    }
    setPrinterConnected(bluetoothPrinter.isConnected());
    setPrinterName(bluetoothPrinter.getDeviceName()||'');
    bluetoothPrinter.setConnectionChangeCallback(setPrinterConnected);
    return ()=>{ bluetoothPrinter.setConnectionChangeCallback(null); };
  }, [dateStart, dateEnd, filterStatus, selectedOutlets, loadingOutlets, loadTransaksi]);

  /* ── print (dengan receipt settings toko) ────────────────── */
  const handlePrint = async (trx?: any) => {
    const targetTrx = trx || selectedTrx;
    if (!targetTrx) return;
    if (!printerConnected) {
      toast.loading('Menghubungkan printer...', { id:'bt' });
      const r = await bluetoothPrinter.connect();
      if (!r.success) { toast.error(r.error||'Gagal', { id:'bt' }); return; }
      toast.success('Terhubung ke '+(r.deviceName||'printer'), { id:'bt' });
      setPrinterConnected(true); setPrinterName(r.deviceName||'');
    }
    setPrinting(true);
    try {
      // Ambil receipt settings dari toko (dengan cache)
      let receiptSettings = receiptCacheRef.current[targetTrx.outlet_id];
      if (!receiptSettings) {
        receiptSettings = await getReceiptSettings(targetTrx.outlet_id);
        if (receiptSettings) receiptCacheRef.current[targetTrx.outlet_id] = receiptSettings;
      }
      const sd: StrukData = {
        noTrx:        shortId(targetTrx.id),
        namaOutlet:   targetTrx._outletName,
        alamatOutlet: targetTrx._outletAlamat,
        namaPelanggan:targetTrx.customer_name||'Umum',
        kasirName:    targetTrx._kasirName,
        waktu:        new Date(targetTrx.created_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'}),
        items:(targetTrx.order_items||[]).map((it:any)=>({
          nama:    it.products?.nama||it.product_name||'Item',
          qty:     it.quantity||1,
          harga:   it.unit_price||0,
          subtotal:(it.unit_price||0)*(it.quantity||1),
        })),
        biayaEkstra:[
          ...(targetTrx.biaya_kemasan>0?[{nama:'Biaya Kemasan',harga:targetTrx.biaya_kemasan}]:[]),
          ...(targetTrx.biaya_tambahan>0?[{nama:'Biaya Tambahan',harga:targetTrx.biaya_tambahan}]:[]),
        ],
        subtotal:    targetTrx.subtotal||targetTrx.total_amount||0,
        totalBiaya:  (targetTrx.biaya_kemasan||0)+(targetTrx.biaya_tambahan||0),
        cartDiscount:targetTrx.diskon||0,
        finalTotal:  targetTrx.total_amount||0,
        metodeBayar: targetTrx._metodeBayar,
        bayar:       targetTrx.paid_amount||targetTrx.total_amount||0,
        kembalian:   targetTrx.change_amount||0,
        channel:     targetTrx.channel||'toko',
        receiptSettings: receiptSettings || {},
      };
      toast.loading('Mencetak struk...', { id:'print' });
      const res = await bluetoothPrinter.printReceipt(sd);
      res.success ? toast.success('Struk berhasil dicetak',{id:'print'}) : toast.error(res.error||'Gagal',{id:'print'});
    } catch(e:any) { toast.error(e.message,{id:'print'}); }
    finally { setPrinting(false); }
  };

  /* ── outlet handlers ──────────────────────────────────────── */
  const toggleOutlet = (outletId: string) => {
    setSelectedOutlets(prev => {
      if (prev.includes(outletId)) {
        return prev.filter(id => id !== outletId);
      } else {
        return [...prev, outletId];
      }
    });
  };

  const selectAllOutlets = () => {
    setSelectedOutlets(outlets.map(o => o.id));
  };

  const clearOutletSelection = () => {
    setSelectedOutlets([]);
  };

  /* ── derived ─────────────────────────────────────────────── */
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
      (t.customer_name||'').toLowerCase().includes(searchLower) ||
      (t._kasirName||'').toLowerCase().includes(searchLower) ||
      (t._outletName||'').toLowerCase().includes(searchLower) ||
      (t._metodeBayar||'').toLowerCase().includes(searchLower) ||
      t.order_items.some((oi:any)=>(oi.products?.nama||oi.product_name||'').toLowerCase().includes(searchLower))
    );
  });
  const sumCompleted = transaksiList.filter(t=>t.status==='completed').reduce((s,t)=>s+t.total_amount,0);
  const cntTotal     = transaksiList.length;
  const cntPending   = transaksiList.filter(t=>t.status==='pending').length;
  const cntCancelled = transaksiList.filter(t=>t.status==='cancelled').length;

  const STATUSES: {key:StatusFilter; label:string}[] = [{key:'all',label:'Semua'},{key:'completed',label:'Selesai'},{key:'pending',label:'Pending'},{key:'cancelled',label:'Batal'}];

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

  /* ── render ──────────────────────────────────────────────── */
  return (
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
                <p className="text-[11px] text-slate-400">
                  Riwayat seluruh transaksi outlet · {dateRangeLabel}
                </p>
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

          {/* ── OUTLET INDICATOR (tampil kalau ada filter) ── */}
          {selectedOutlets.length > 0 && selectedOutlets.length < outlets.length && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                {/* Info Outlet */}
                <div className="flex items-start gap-2 flex-1">
                  <Building2 size={16} className="text-blue-600 shrink-0 mt-0.5"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-blue-900 leading-tight mb-1">
                      Filter Outlet Aktif
                    </p>
                    <p className="text-[11px] text-blue-600 leading-tight">
                      {outlets
                        .filter(o => selectedOutlets.includes(o.id))
                        .map(o => o.nama)
                        .join(', ')
                      }
                    </p>
                  </div>
                </div>

                {/* Detail Statistik Transaksi */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Total Transaksi */}
                  <div className="text-right">
                    <p className="text-[9px] text-blue-500 uppercase tracking-wider font-semibold">Transaksi</p>
                    <p className="text-lg font-bold text-blue-900 leading-none">{filtered.length}</p>
                  </div>
                  
                  {/* Divider */}
                  <div className="w-px h-8 bg-blue-200"/>
                  
                  {/* Total Nilai */}
                  <div className="text-right">
                    <p className="text-[9px] text-blue-500 uppercase tracking-wider font-semibold">Total Nilai</p>
                    <p className="text-lg font-bold text-blue-900 leading-none whitespace-nowrap">
                      {fmtRp(filtered.reduce((sum, t) => sum + (t.total_amount || 0), 0))}
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-8 bg-blue-200"/>

                  {/* Status Breakdown */}
                  <div className="text-right">
                    <p className="text-[9px] text-blue-500 uppercase tracking-wider font-semibold mb-0.5">Status</p>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-emerald-600 font-semibold">
                        ✓ {filtered.filter(t => t.status === 'completed').length}
                      </span>
                      <span className="text-amber-600 font-semibold">
                        ⏳ {filtered.filter(t => t.status === 'pending').length}
                      </span>
                      <span className="text-red-600 font-semibold">
                        ✕ {filtered.filter(t => t.status === 'cancelled').length}
                      </span>
                    </div>
                  </div>

                  {/* Tombol Clear */}
                  <button
                    onClick={clearOutletSelection}
                    className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-semibold transition-colors shrink-0"
                  >
                    Lihat Semua
                  </button>
                </div>
              </div>
            </div>
          )}

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
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
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
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
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
                    <div className="px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white">
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
                          className="px-1.5 py-1 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 rounded text-[10px] font-semibold text-slate-600 transition-colors text-center"
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
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-semibold transition-colors"
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
              {STATUSES.map(s=>(
                <button key={s.key} onClick={()=>setFilterStatus(s.key)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${filterStatus===s.key?'bg-white text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
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
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-sm'
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
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${selectedPayment === 'all' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-600'}`}>
                      Semua Metode
                    </button>
                    <button onClick={() => { setSelectedPayment('cash'); setShowPaymentDrop(false); }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${selectedPayment === 'cash' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-600'}`}>
                      Tunai
                    </button>
                    {paymentMethodsList.map(m => {
                      if (!m.id) return null;
                      return (
                        <button key={m.id} onClick={() => { setSelectedPayment(m.id); setShowPaymentDrop(false); }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors ${selectedPayment === m.id ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'text-slate-600'}`}>
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* ── OUTLET FILTER DROPDOWN ── */}
            {outlets.length > 1 && (
              <>
                <div className="w-px h-5 bg-slate-200 hidden sm:block"/>
                
                <div className="relative">
                  <button
                    onClick={() => setShowOutletDropdown(!showOutletDropdown)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-md text-[11px] font-medium text-slate-700 transition-colors"
                  >
                    <Building2 size={12}/>
                    <span>
                      {selectedOutlets.length === 0 
                        ? 'Semua Outlet' 
                        : selectedOutlets.length === outlets.length
                        ? 'Semua Outlet'
                        : `${selectedOutlets.length} Outlet`
                      }
                    </span>
                    <ChevronDown size={11} className={`transition-transform ${showOutletDropdown ? 'rotate-180' : ''}`}/>
                  </button>

                  {/* Dropdown panel */}
                  {showOutletDropdown && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowOutletDropdown(false)}
                      />
                      
                      {/* Panel */}
                      <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden">
                        {/* Header */}
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Filter Outlet</p>
                            <button
                              onClick={() => setShowOutletDropdown(false)}
                              className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <X size={11}/>
                            </button>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={selectAllOutlets}
                              className="flex-1 px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-medium text-slate-600 transition-colors"
                            >
                              Pilih Semua
                            </button>
                            <button
                              onClick={clearOutletSelection}
                              className="flex-1 px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-medium text-slate-600 transition-colors"
                            >
                              Hapus Filter
                            </button>
                          </div>
                        </div>

                        {/* Outlet list */}
                        <div className="max-h-64 overflow-y-auto p-2">
                          {outlets.map(outlet => (
                            <label
                              key={outlet.id}
                              className="flex items-start gap-2 px-2 py-2 hover:bg-slate-50 rounded cursor-pointer transition-colors group"
                            >
                              <input
                                type="checkbox"
                                checked={selectedOutlets.includes(outlet.id)}
                                onChange={() => toggleOutlet(outlet.id)}
                                className="mt-0.5 w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500 focus:ring-1 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-800 group-hover:text-slate-900 leading-tight">
                                  {outlet.nama}
                                </p>
                                {outlet.alamat && (
                                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">
                                    {outlet.alamat}
                                  </p>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>

                        {/* Footer info */}
                        <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
                          <p className="text-[10px] text-slate-500">
                            {selectedOutlets.length === 0 
                              ? `Menampilkan semua ${outlets.length} outlet`
                              : `Menampilkan ${selectedOutlets.length} dari ${outlets.length} outlet`
                            }
                          </p>
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
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    {['Waktu','Order ID','Outlet','Kasir','Pelanggan','Item','Metode Bayar','Status','Total','Cetak'].map(h=>(
                      <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap first:pl-5 last:pr-5">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={10} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Loader2 size={20} className="animate-spin"/>
                        <span className="text-xs">Memuat data...</span>
                      </div>
                    </td></tr>
                  ) : filtered.length===0 ? (
                    <tr><td colSpan={10} className="py-14 text-center">
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
                          <p className="text-[8px] text-red-500 hidden">{new Date(o.created_at).getUTCFullYear()}-DEBUG</p>
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
                        <td className="px-3 py-3">
                          <span className="text-sm font-bold text-slate-900 whitespace-nowrap">{fmtRp(o.total_amount)}</span>
                        </td>
                        {/* Cetak */}
                        <td className="px-3 py-3 pr-5" onClick={e=>e.stopPropagation()}>
                          <button
                            onClick={()=>handlePrint(o)}
                            disabled={printing}
                            title="Cetak Struk Ulang"
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border transition-colors whitespace-nowrap ${
                              printing
                                ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-800'
                            }`}
                          >
                            {printing ? <Loader2 size={10} className="animate-spin"/> : <Printer size={10}/>}
                            Cetak
                          </button>
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
