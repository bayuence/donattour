'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { bluetoothPrinter } from '@/lib/bluetooth-printer';
import { toast } from 'sonner';
import type { Outlet, ChannelType, User } from '@/lib/types';
import type { ActiveSection } from '../hooks/useKasir';

const CHANNELS: { id: ChannelType; label: string; color: string }[] = [
  { id: 'toko', label: 'Toko', color: 'amber' },
  { id: 'gofood', label: 'GoFood', color: 'green' },
  { id: 'shopeefood', label: 'Shopee', color: 'orange' },
  { id: 'grabfood', label: 'Grab', color: 'emerald' },
  { id: 'online', label: 'Online', color: 'blue' },
];

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
  cashier: User | null;
  onSelectCashier: () => void;
}

export default function KasirHeader({
  outlet, selectedChannel, setSelectedChannel, activeSection, setActiveSection,
  ukuranFilter, setUkuranFilter, cartCount, onChangeOutlet,
  printerConnected, setPrinterConnected, printerName, setPrinterName,
  cashier, onSelectCashier
}: Props) {
  const [isConnecting, setIsConnecting] = useState(false);

  const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

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
    <div className="bg-white border-b border-slate-100 shrink-0">
      {/* Top Row */}
      <div className="px-4 lg:px-6 py-3 flex items-center gap-3 justify-between">
        {/* Outlet Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Icons.Store size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-black text-slate-800 leading-tight truncate">{outlet.nama}</h1>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${cashier ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {jam} • {cashier ? `KASIR: ${cashier.name.split(' ')[0]}` : 'PILIH KASIR'}
              </p>
            </div>
          </div>
        </div>

        {/* Cashier Quick Select */}
        <button onClick={onSelectCashier} 
          className={`flex items-center gap-2 px-3 py-2 rounded-2xl transition-all border-2 ${cashier ? 'bg-white border-slate-100 hover:border-amber-200' : 'bg-amber-500 text-white border-amber-600 animate-bounce shadow-lg shadow-amber-500/20'}`}>
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${cashier ? 'bg-amber-100 text-amber-600' : 'bg-white/20 text-white'}`}>
            {cashier ? cashier.name.charAt(0).toUpperCase() : <Icons.User size={14} />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">
            {cashier ? 'Ganti Kasir' : 'Pilih Personil'}
          </span>
        </button>

        {/* Right Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Ukuran Filter */}
          <div className="hidden sm:flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            {(['standar', 'mini'] as const).map(u => (
              <button key={u} onClick={() => setUkuranFilter(u)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all uppercase ${ukuranFilter === u ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                {u}
              </button>
            ))}
          </div>

          {/* Bluetooth Printer */}
          <button onClick={handlePrinterConnect} disabled={isConnecting}
            title={printerConnected ? `Terhubung: ${printerName}` : 'Hubungkan printer Bluetooth'}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all ${printerConnected ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            {isConnecting
              ? <Icons.Loader2 size={14} className="animate-spin" />
              : <Icons.Printer size={14} />}
            <span className="hidden md:inline">{isConnecting ? 'Konek...' : printerConnected ? printerName.slice(0, 12) : 'Printer'}</span>
            {printerConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          </button>

          {/* Change Outlet */}
          <button onClick={onChangeOutlet} title="Ganti outlet"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
            <Icons.RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Channel + Tabs Row */}
      <div className="px-4 lg:px-6 pb-2 flex items-center gap-4 overflow-x-auto no-scrollbar">
        {/* Channel Selector */}
        <div className="flex items-center gap-1 shrink-0">
          {CHANNELS.map(c => (
            <button key={c.id} onClick={() => setSelectedChannel(c.id)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${selectedChannel === c.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-slate-200 shrink-0" />

        {/* Section Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black transition-all whitespace-nowrap ${activeSection === tab.id ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:bg-slate-50'}`}>
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
