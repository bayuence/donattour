'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CircleDot, Package, Gift, Palette, Store, User as UserIcon,
  Loader2, Printer, AlertTriangle, DoorOpen, RefreshCw, CheckCircle, XCircle
} from 'lucide-react';
const Icons = { CircleDot, Package, Gift, Palette, Store, User: UserIcon, Loader2, Printer, AlertTriangle, DoorOpen, RefreshCw };
import { bluetoothPrinter } from '@/lib/bluetooth-printer';
import { toast } from 'sonner';
import type { Outlet, ChannelType, User, KasirMenu } from '@/lib/types';
import type { ActiveSection } from '../hooks/useKasir';
import { OfflineIndicator } from '@/components/offline/offline-indicator';

// Peta warna kasir menu -> kelas CSS Tailwind
const COLOR_MAP: Record<string, { active: string; inactive: string }> = {
  amber:   { active: 'bg-amber-500 text-white shadow-amber-500/20',   inactive: 'text-slate-400 hover:bg-amber-50 hover:text-amber-600' },
  green:   { active: 'bg-green-500 text-white shadow-green-500/20',   inactive: 'text-slate-400 hover:bg-green-50 hover:text-green-600' },
  orange:  { active: 'bg-orange-500 text-white shadow-orange-500/20', inactive: 'text-slate-400 hover:bg-orange-50 hover:text-orange-600' },
  emerald: { active: 'bg-emerald-500 text-white shadow-emerald-500/20', inactive: 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-600' },
  blue:    { active: 'bg-blue-500 text-white shadow-blue-500/20',     inactive: 'text-slate-400 hover:bg-blue-50 hover:text-blue-600' },
  violet:  { active: 'bg-violet-500 text-white shadow-violet-500/20', inactive: 'text-slate-400 hover:bg-violet-50 hover:text-violet-600' },
  rose:    { active: 'bg-rose-500 text-white shadow-rose-500/20',     inactive: 'text-slate-400 hover:bg-rose-50 hover:text-rose-600' },
  slate:   { active: 'bg-slate-700 text-white shadow-slate-500/20',   inactive: 'text-slate-400 hover:bg-slate-50 hover:text-slate-600' },
};

function getChannelColor(color: string, isActive: boolean) {
  const map = COLOR_MAP[color] ?? COLOR_MAP.amber;
  return isActive ? `${map.active} shadow-lg` : map.inactive;
}

const TABS: { id: ActiveSection; label: string; icon: any }[] = [
  { id: 'donat', label: 'Varian', icon: Icons.CircleDot },
  { id: 'paket', label: 'Paket', icon: Icons.Package },
  { id: 'bundling', label: 'Bundling', icon: Icons.Gift },
  { id: 'custom', label: 'Custom', icon: Icons.Palette },
];

interface Props {
  outlet: Outlet;
  selectedChannel: ChannelType;
  setSelectedChannel: (c: ChannelType) => void;
  activeSection: ActiveSection;
  setActiveSection: (s: ActiveSection) => void;
  ukuranFilter: 'standar' | 'mini';
  setUkuranFilter: (u: 'standar' | 'mini') => void;
  cartCount: number;
  onChangeOutlet: () => void;
  printerConnected: boolean;
  setPrinterConnected: (v: boolean) => void;
  printerName: string;
  setPrinterName: (v: string) => void;
  kasirMenus: KasirMenu[];  // ← menu kasir dinamis dari database
  stockValidation?: {
    can_operate: boolean;
    stock_summary: any;
  } | null;
  realtimeConnected?: boolean;
  cashier?: User | null;
  onChangeCashier?: () => void;
  offlineDeductions?: { standar: number; mini: number };
}

function getStatusColor(status: 'sufficient' | 'low' | 'out_of_stock') {
  switch (status) {
    case 'sufficient': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', icon: 'text-green-600' };
    case 'low': return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', icon: 'text-yellow-600' };
    case 'out_of_stock': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', icon: 'text-red-600' };
  }
}

function getStatusIcon(status: 'sufficient' | 'low' | 'out_of_stock') {
  switch (status) {
    case 'sufficient': return CheckCircle;
    case 'low': return AlertTriangle;
    case 'out_of_stock': return XCircle;
  }
}

function StockBadge({ label, qty, status, offlineDeduct = 0 }: { label: string; qty: number; status: 'sufficient' | 'low' | 'out_of_stock', offlineDeduct?: number }) {
  const colors = getStatusColor(status);
  const Icon = getStatusIcon(status);
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${colors.bg} ${colors.border}`}>
      <Icon className={`h-3 w-3 ${colors.icon} shrink-0`} />
      <span className={`text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${colors.text}`}>
        {label} {qty} pcs
        {offlineDeduct > 0 && <span className="text-orange-600 ml-1">(-{offlineDeduct} 📡)</span>}
      </span>
    </div>
  );
}

export default function KasirHeader({
  outlet, selectedChannel, setSelectedChannel, activeSection, setActiveSection,
  ukuranFilter, setUkuranFilter, cartCount, onChangeOutlet,
  printerConnected, setPrinterConnected, printerName, setPrinterName,
  kasirMenus, stockValidation, realtimeConnected, cashier, onChangeCashier, offlineDeductions
}: Props) {
  const [isConnecting, setIsConnecting] = useState(false);
  const router = useRouter();

  const [jam, setJam] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setJam(new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Jakarta'
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handlePrinterConnect = async () => {
    if (printerConnected) {
      await bluetoothPrinter.disconnect();
      setPrinterConnected(false);
      setPrinterName('');
      toast.info('Printer terputus', { position: 'top-center' });
      return;
    }
    setIsConnecting(true);
    const result = await bluetoothPrinter.connect();
    setIsConnecting(false);
    if (result.success) {
      setPrinterConnected(true);
      setPrinterName(result.deviceName || 'Printer BT');
      toast.success(`Terhubung ke ${result.deviceName || 'Printer'}!`, { position: 'top-center' });
    } else {
      toast.error(result.error || 'Gagal konek printer', { position: 'top-center' });
    }
  };

  return (
    <>
    <div className="bg-white border-b border-slate-100 shrink-0">

      {/* ═══ ROW 1: Outlet Info + Section Tabs + (Desktop xl: semua kontrol) ═══ */}
      <div className="px-3 lg:px-4 py-2 flex items-center gap-2 min-w-0">

        {/* Outlet Info */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Icons.Store size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black text-slate-800 leading-tight truncate max-w-[80px] md:max-w-[140px] lg:max-w-[180px] xl:max-w-none">{outlet.nama}</h1>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{jam}</p>
            </div>
          </div>
        </div>

        {/* ─── Section Tabs ─── */}
        <div className="flex items-center gap-0.5 pl-2 border-l border-slate-100 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-black transition-all whitespace-nowrap ${
                activeSection === tab.id
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <tab.icon size={11} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* ── DESKTOP xl+: Semua kontrol tampil di baris 1 ── */}
        <div className="hidden xl:flex items-center gap-2">

          {/* Offline & Realtime */}
          <div className="flex items-center gap-1.5 px-2 border-l border-slate-100">
            <OfflineIndicator />
            {realtimeConnected && (
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" title="Real-time terhubung" />
            )}
          </div>

          {/* Stock Badges */}
          {stockValidation && stockValidation.stock_summary && (
            <div className="flex items-center gap-2 border-l border-slate-100 pl-2">
              <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <StockBadge
                label="Standar"
                qty={stockValidation.stock_summary.standar.qty_available}
                status={stockValidation.stock_summary.standar.status}
                offlineDeduct={offlineDeductions?.standar}
              />
              <StockBadge
                label="Mini"
                qty={stockValidation.stock_summary.mini.qty_available}
                status={stockValidation.stock_summary.mini.status}
                offlineDeduct={offlineDeductions?.mini}
              />
            </div>
          )}

          {/* Ukuran Filter */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg border-l border-slate-200 ml-1 pl-2">
            {(['standar', 'mini'] as const).map(u => (
              <button
                key={u}
                onClick={() => setUkuranFilter(u)}
                className={`px-2.5 py-1 rounded-md text-[9px] font-black transition-all uppercase tracking-wide ${ukuranFilter === u ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Bluetooth Printer */}
          <button
            onClick={handlePrinterConnect}
            disabled={isConnecting}
            title={printerConnected ? `Terhubung: ${printerName}` : 'Hubungkan printer Bluetooth'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${
              printerConnected 
                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}
          >
            {isConnecting ? <Icons.Loader2 size={12} className="animate-spin" /> : <Icons.Printer size={12} />}
            {isConnecting ? 'Konek...' : printerConnected ? printerName.slice(0, 10) : 'Printer'}
            {printerConnected && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
          </button>

          {/* Cashier Selector */}
          {onChangeCashier && (
            <button
              onClick={onChangeCashier}
              title="Pilih/Ganti Kasir"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all whitespace-nowrap border ${
                cashier 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' 
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse'
              }`}
            >
              <Icons.User size={12} />
              {cashier ? cashier.name.split(' ')[0].substring(0, 10) : 'PILIH KASIR'}
            </button>
          )}

          {/* Change Outlet */}
          <button
            onClick={onChangeOutlet}
            title="Ganti outlet"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide whitespace-nowrap bg-slate-100 text-slate-500 hover:bg-amber-50 hover:text-amber-600 border border-slate-200 hover:border-amber-200 transition-all"
          >
            <Icons.RefreshCw size={12} />
            Outlet
          </button>

        </div>
      </div>

      {/* ═══ ROW 2 (sm–xl TABLET): Scrollable controls strip ═══ */}
      {/* Tidak tampil di mobile (<sm) karena ada row mobile sendiri */}
      {/* Tidak tampil di desktop xl+ karena sudah tampil di row 1 */}
      <div className="hidden sm:flex xl:hidden items-center gap-2 px-3 py-1.5 bg-slate-50 border-t border-slate-100 overflow-x-auto no-scrollbar">

        {/* Ukuran Filter */}
        <div className="flex items-center gap-0.5 p-0.5 bg-white rounded-lg border border-slate-200 shrink-0">
          {(['standar', 'mini'] as const).map(u => (
            <button
              key={u}
              onClick={() => setUkuranFilter(u)}
              className={`px-3 py-1 rounded-md text-[9px] font-black transition-all uppercase tracking-wide whitespace-nowrap ${ukuranFilter === u ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {u}
            </button>
          ))}
        </div>

        <div className="w-px h-4 bg-slate-200 shrink-0" />

        {/* Bluetooth Printer */}
        <button
          onClick={handlePrinterConnect}
          disabled={isConnecting}
          title={printerConnected ? `Terhubung: ${printerName}` : 'Hubungkan printer Bluetooth'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all whitespace-nowrap shrink-0 ${
            printerConnected 
              ? 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200' 
              : 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
          }`}
        >
          {isConnecting ? <Icons.Loader2 size={12} className="animate-spin" /> : <Icons.Printer size={12} />}
          {isConnecting ? 'Konek...' : printerConnected ? printerName.slice(0, 10) : 'Printer'}
          {printerConnected && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
        </button>

        {/* Cashier Selector */}
        {onChangeCashier && (
          <button
            onClick={onChangeCashier}
            title="Pilih/Ganti Kasir"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all whitespace-nowrap shrink-0 border ${
              cashier 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' 
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse'
            }`}
          >
            <Icons.User size={12} />
            {cashier ? cashier.name.split(' ')[0].substring(0, 12) : 'PILIH KASIR'}
          </button>
        )}

        {/* Change Outlet */}
        <button
          onClick={onChangeOutlet}
          title="Ganti outlet"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-600 border border-slate-200 hover:border-amber-200 transition-all"
        >
          <Icons.RefreshCw size={12} />
          Ganti Outlet
        </button>

        {/* Divider before stock */}
        <div className="w-px h-4 bg-slate-200 shrink-0 ml-1" />

        {/* Offline & Realtime */}
        <div className="flex items-center gap-1.5 shrink-0">
          <OfflineIndicator />
          {realtimeConnected && (
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse shrink-0" title="Real-time terhubung" />
          )}
        </div>

        {/* Stock Badges */}
        {stockValidation && stockValidation.stock_summary && (
          <>
            <div className="w-px h-4 bg-slate-200 shrink-0" />
            <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <StockBadge
              label="Standar"
              qty={stockValidation.stock_summary.standar.qty_available}
              status={stockValidation.stock_summary.standar.status}
              offlineDeduct={offlineDeductions?.standar}
            />
            <StockBadge
              label="Mini"
              qty={stockValidation.stock_summary.mini.qty_available}
              status={stockValidation.stock_summary.mini.status}
              offlineDeduct={offlineDeductions?.mini}
            />
          </>
        )}

      </div>

      {/* ═══ ROW 2 MOBILE (<sm): Quick controls strip ═══ */}
      <div className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border-t border-slate-100 overflow-x-auto no-scrollbar">

        {/* Bluetooth Printer */}
        <button
          onClick={handlePrinterConnect}
          disabled={isConnecting}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 ${
            printerConnected 
              ? 'bg-blue-100 text-blue-700 border border-blue-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}
        >
          {isConnecting ? <Icons.Loader2 size={11} className="animate-spin" /> : <Icons.Printer size={11} />}
          {isConnecting ? 'Konek...' : printerConnected ? 'Terhubung' : 'Printer'}
        </button>

        {/* Cashier Selector */}
        {onChangeCashier && (
          <button
            onClick={onChangeCashier}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 border ${
              cashier 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
            }`}
          >
            <Icons.User size={11} />
            {cashier ? cashier.name.split(' ')[0].substring(0, 10) : 'PILIH KASIR'}
          </button>
        )}

        {/* Change Outlet */}
        <button
          onClick={onChangeOutlet}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide whitespace-nowrap shrink-0 bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-600 border border-slate-200 transition-all"
        >
          <Icons.RefreshCw size={11} />
          Ganti Outlet
        </button>

        {/* Ukuran Filter mobile (di kanan) */}
        <div className="flex items-center gap-0.5 p-0.5 bg-white rounded-lg border border-slate-200 shrink-0 ml-auto">
          {(['standar', 'mini'] as const).map(u => (
            <button
              key={u}
              onClick={() => setUkuranFilter(u)}
              className={`px-2 py-1 rounded-md text-[9px] font-black transition-all uppercase ${ukuranFilter === u ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {u}
            </button>
          ))}
        </div>

      </div>

    </div>
    </>
  );
}
