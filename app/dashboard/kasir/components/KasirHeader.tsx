'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CircleDot, Package, Gift, Palette, Box, Store, User as UserIcon,
  Loader2, Printer, AlertTriangle, DoorOpen, RefreshCw,
} from 'lucide-react';
const Icons = { CircleDot, Package, Gift, Palette, Box, Store, User: UserIcon, Loader2, Printer, AlertTriangle, DoorOpen, RefreshCw };
import { bluetoothPrinter } from '@/lib/bluetooth-printer';
import { toast } from 'sonner';
import type { Outlet, ChannelType, User, KasirMenu } from '@/lib/types';
import type { ActiveSection } from '../hooks/useKasir';

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
  { id: 'box', label: 'Kemasan', icon: Icons.Box },
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
  kasirMenus: KasirMenu[];  // ← menu kasir dinamis dari database
  onRecapFinishedProducts?: () => void;  // ← handler untuk buka form rekap sisa produk jadi
  onTutupOutlet?: () => void;  // ← handler untuk tutup outlet / closing harian
}

export default function KasirHeader({
  outlet, selectedChannel, setSelectedChannel, activeSection, setActiveSection,
  ukuranFilter, setUkuranFilter, cartCount, onChangeOutlet,
  printerConnected, setPrinterConnected, printerName, setPrinterName,
  cashier, onSelectCashier, kasirMenus, onRecapFinishedProducts, onTutupOutlet
}: Props) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showTutupConfirm, setShowTutupConfirm] = useState(false);
  const router = useRouter();

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

  const handleTutupConfirm = () => {
    setShowTutupConfirm(false);
    // Trigger onTutupOutlet callback instead of redirect
    if (onTutupOutlet) {
      onTutupOutlet();
    }
  };

  return (
    <>
    {/* Modal Tutup Outlet */}
    {showTutupConfirm && (
      <TutupOutletModal
        outletNama={outlet.nama}
        onConfirm={handleTutupConfirm}
        onCancel={() => setShowTutupConfirm(false)}
      />
    )}

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
              <span className={`w-1.5 h-1.5 rounded-full ${cashier ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                {jam} · {cashier ? `KASIR: ${cashier.name.split(' ')[0]}` : 'PILIH KASIR'}
              </p>
            </div>
          </div>
        </div>

        {/* ─── CHANNEL SELECTOR (Desktop: inline di top row) ─── */}
        <div className="hidden lg:flex items-center gap-1 pl-3 border-l border-slate-100 shrink-0">
          {kasirMenus.length === 0 ? (
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider px-3">
              — Tidak ada menu —
            </span>
          ) : (
            kasirMenus.map(m => (
              <button
                key={m.slug}
                onClick={() => setSelectedChannel(m.slug)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${getChannelColor(m.color, selectedChannel === m.slug)}`}
              >
                {m.nama}
              </button>
            ))
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cashier Quick Select */}
        <button
          onClick={onSelectCashier}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all border-2 shrink-0 ${cashier ? 'bg-white border-slate-100 hover:border-amber-200' : 'bg-amber-500 text-white border-amber-600 animate-bounce shadow-lg shadow-amber-500/20'}`}
        >
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${cashier ? 'bg-amber-100 text-amber-600' : 'bg-white/20 text-white'}`}>
            {cashier ? cashier.name.charAt(0).toUpperCase() : <Icons.User size={12} />}
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">
            {cashier ? 'Ganti Kasir' : 'Pilih Personil'}
          </span>
        </button>

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

          {/* Rekap Sisa Produk Jadi */}
          {onRecapFinishedProducts && (
            <button
              onClick={onRecapFinishedProducts}
              title="Rekap sisa produk jadi untuk closing"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200"
            >
              <Icons.Package size={13} />
              <span className="hidden xl:inline">Rekap Sisa</span>
            </button>
          )}

          {/* Tutup Outlet */}
          <button
            onClick={() => setShowTutupConfirm(true)}
            title="Tutup outlet hari ini (closing)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wide transition-all bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-500/30"
          >
            <Icons.DoorOpen size={13} />
            <span className="hidden md:inline">Tutup</span>
          </button>

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

      {/* ═══ BOTTOM ROW: Channel (mobile only) + Section Tabs ═══ */}
      <div className="px-4 lg:px-6 pb-2 flex items-center gap-3 overflow-x-auto no-scrollbar border-t border-slate-50">

        {/* Channel Selector — HANYA TAMPIL DI MOBILE (di desktop sudah di top row) */}
        <div className="flex lg:hidden items-center gap-1 shrink-0">
          {kasirMenus.length === 0 ? (
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider px-3 py-1.5">
              — Tidak ada menu aktif —
            </span>
          ) : (
            kasirMenus.map(m => (
              <button
                key={m.slug}
                onClick={() => setSelectedChannel(m.slug)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${getChannelColor(m.color, selectedChannel === m.slug)}`}
              >
                {m.nama}
              </button>
            ))
          )}
        </div>

        {/* Divider — hanya tampil di mobile jika ada channel */}
        {kasirMenus.length > 0 && (
          <div className="flex lg:hidden w-px h-5 bg-slate-200 shrink-0" />
        )}

        {/* Section Tabs — selalu tampil di bottom row */}
        <div className="flex items-center gap-1 py-1.5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black transition-all whitespace-nowrap ${
                activeSection === tab.id
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}

// ══════════════════════════════════════════════════
// MODAL KONFIRMASI TUTUP OUTLET
// ══════════════════════════════════════════════════

interface TutupOutletModalProps {
  outletNama: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function TutupOutletModal({ outletNama, onConfirm, onCancel }: TutupOutletModalProps) {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden">
        {/* Header merah */}
        <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Icons.DoorOpen size={36} className="text-white" />
          </div>
          <h2 className="text-xl font-black text-white">Tutup Outlet?</h2>
          <p className="text-red-100 text-sm mt-1 font-medium">{outletNama}</p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <p className="text-slate-600 text-sm text-center leading-relaxed">
            Kamu akan diarahkan ke halaman <strong>Closing Harian</strong> untuk mengakhiri operasional outlet hari ini.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-amber-800 text-xs font-semibold flex items-start gap-2">
              <Icons.AlertTriangle size={14} className="shrink-0 mt-0.5" />
              Pastikan semua transaksi sudah selesai sebelum menutup outlet.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200 active:scale-95 transition-all"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-black text-sm hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-500/30"
            >
              Ya, Tutup Outlet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
