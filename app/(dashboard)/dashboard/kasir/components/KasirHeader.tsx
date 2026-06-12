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

function StockBadge({ label, qty, status }: { label: string; qty: number; status: 'sufficient' | 'low' | 'out_of_stock' }) {
  const colors = getStatusColor(status);
  const Icon = getStatusIcon(status);
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${colors.bg} ${colors.border}`}>
      <Icon className={`h-3 w-3 ${colors.icon}`} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5">
        <span className={`sm:hidden text-[9px] font-black uppercase tracking-wider ${colors.text}`}>{label}</span>
        <span className={`text-[10px] font-black uppercase tracking-wider ${colors.text}`}>{qty} pcs</span>
      </div>
    </div>
  );
}

export default function KasirHeader({
  outlet, selectedChannel, setSelectedChannel, activeSection, setActiveSection,
  ukuranFilter, setUkuranFilter, cartCount, onChangeOutlet,
  printerConnected, setPrinterConnected, printerName, setPrinterName,
  kasirMenus, stockValidation, realtimeConnected, cashier, onChangeCashier
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

      {/* ═══ TOP ROW ═══ */}
      <div className="px-4 lg:px-6 py-2.5 flex items-center gap-3">

        {/* Outlet Info */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Icons.Store size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black text-slate-800 leading-tight truncate max-w-[120px] lg:max-w-none">{outlet.nama}</h1>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse`} />
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {jam}
              </p>
            </div>
          </div>
        </div>
        {/* ─── SECTION TABS (Moved to top row) ─── */}
        <div className="flex items-center gap-1 pl-3 border-l border-slate-100 shrink-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black transition-all whitespace-nowrap ${
                activeSection === tab.id
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <tab.icon size={12} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Offline & Realtime Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 border-l border-slate-100">
          <OfflineIndicator />
          {realtimeConnected && (
            <div className="text-[10px] font-black text-green-600 flex items-center gap-1.5 uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span>Real-time</span>
            </div>
          )}
        </div>

        {/* Stock Display */}
        {stockValidation && stockValidation.stock_summary && (
          <div className="hidden lg:flex items-center gap-2 border-l border-slate-100 pl-3">
            <Package className="h-4 w-4 text-slate-400" />
            <StockBadge
              label="Standar"
              qty={stockValidation.stock_summary.standar.qty_available}
              status={stockValidation.stock_summary.standar.status}
            />
            <StockBadge
              label="Mini"
              qty={stockValidation.stock_summary.mini.qty_available}
              status={stockValidation.stock_summary.mini.status}
            />
          </div>
        )}

        {/* Right Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Ukuran Filter */}
          <div className="hidden sm:flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg">
            {(['standar', 'mini'] as const).map(u => (
              <button
                key={u}
                onClick={() => setUkuranFilter(u)}
                className={`px-2.5 py-1 rounded-md text-[9px] font-black transition-all uppercase ${ukuranFilter === u ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
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
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all ${
              printerConnected 
                ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}
          >
            {isConnecting
              ? <Icons.Loader2 size={13} className="animate-spin" />
              : <Icons.Printer size={13} />}
            <span className="hidden md:inline">
              {isConnecting ? 'Konek...' : printerConnected ? printerName.slice(0, 10) : 'Printer'}
            </span>
            {printerConnected && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
          </button>

          {/* Cashier Selector */}
          {onChangeCashier && (
            <button
              onClick={onChangeCashier}
              title="Pilih/Ganti Kasir"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all border ${
                cashier 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' 
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 animate-pulse'
              }`}
            >
              <Icons.User size={13} />
              <span className="hidden sm:inline">
                {cashier ? cashier.name.split(' ')[0].substring(0, 8) : 'PILIH KASIR'}
              </span>
            </button>
          )}

          {/* Change Outlet */}
          <button
            onClick={onChangeOutlet}
            title="Ganti outlet"
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
          >
            <Icons.RefreshCw size={16} />
          </button>

        </div>
      </div>

    </div>
    </>
  );
}
