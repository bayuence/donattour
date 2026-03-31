'use client';

import { useState, useMemo, useEffect } from 'react';
import * as db from '@/lib/db';
import type { Outlet } from '@/lib/types';

// ═══════════════════════════════════════════════════
// DATA — sama dengan Kelola Kasir (nanti sync via DB)
// ═══════════════════════════════════════════════════

interface VarianDonat {
  id: string;
  nama: string;
  jenisId: string;
  jenisNama: string;
  gambar: string;
  hargaJual: number;
}

interface PaketDonat {
  id: string;
  nama: string;
  jenisId: string;
  jenisNama: string;
  kapasitas: number;
  hargaPaket: number;
  hargaNormal: number;
}

interface BundlingItem {
  id: string;
  nama: string;
  isiItem: string;
  hargaNormal: number;
  hargaBundling: number;
}

interface CustomPaket {
  id: string;
  nama: string;
  kapasitas: number;
  ukuranDonat: 'standar' | 'mini';
  hargaSatuan: number;
  hargaKlasik: number;
  hargaReguler: number;
  hargaPremium: number;
}

interface TambahanItem {
  id: string;
  nama: string;
  gambar: string;
  hargaJual: number;
  satuan: string;
}

const VARIAN: VarianDonat[] = [
  { id: 'var-1', nama: 'Donat Gula', jenisId: 'jenis-1', jenisNama: 'Klasik', gambar: '🍩', hargaJual: 3000 },
  { id: 'var-2', nama: 'Donat Meses', jenisId: 'jenis-1', jenisNama: 'Klasik', gambar: '🟤', hargaJual: 3000 },
  { id: 'var-3', nama: 'Donat Gula Halus', jenisId: 'jenis-1', jenisNama: 'Klasik', gambar: '⚪', hargaJual: 3000 },
  { id: 'var-4', nama: 'Donat Coklat Ceres', jenisId: 'jenis-2', jenisNama: 'Reguler', gambar: '🍫', hargaJual: 5000 },
  { id: 'var-5', nama: 'Donat Tiramisu', jenisId: 'jenis-2', jenisNama: 'Reguler', gambar: '☕', hargaJual: 5000 },
  { id: 'var-6', nama: 'Donat Strawberry', jenisId: 'jenis-2', jenisNama: 'Reguler', gambar: '🍓', hargaJual: 5000 },
  { id: 'var-7', nama: 'Donat Keju', jenisId: 'jenis-2', jenisNama: 'Reguler', gambar: '🧀', hargaJual: 5000 },
  { id: 'var-8', nama: 'Donat Vanila Lotus', jenisId: 'jenis-3', jenisNama: 'Premium', gambar: '🪷', hargaJual: 8000 },
  { id: 'var-9', nama: 'Donat Matcha', jenisId: 'jenis-3', jenisNama: 'Premium', gambar: '🍵', hargaJual: 8000 },
  { id: 'var-10', nama: 'Donat Red Velvet', jenisId: 'jenis-3', jenisNama: 'Premium', gambar: '❤️', hargaJual: 8000 },
];

const PAKET: PaketDonat[] = [
  { id: 'pkt-1', nama: 'Paket Klasik Isi 3', jenisId: 'jenis-1', jenisNama: 'Klasik', kapasitas: 3, hargaPaket: 8000, hargaNormal: 9000 },
  { id: 'pkt-2', nama: 'Paket Klasik Isi 6', jenisId: 'jenis-1', jenisNama: 'Klasik', kapasitas: 6, hargaPaket: 15000, hargaNormal: 18000 },
  { id: 'pkt-3', nama: 'Paket Reguler Isi 3', jenisId: 'jenis-2', jenisNama: 'Reguler', kapasitas: 3, hargaPaket: 13000, hargaNormal: 15000 },
  { id: 'pkt-4', nama: 'Paket Reguler Isi 6', jenisId: 'jenis-2', jenisNama: 'Reguler', kapasitas: 6, hargaPaket: 25000, hargaNormal: 30000 },
  { id: 'pkt-5', nama: 'Paket Premium Isi 3', jenisId: 'jenis-3', jenisNama: 'Premium', kapasitas: 3, hargaPaket: 22000, hargaNormal: 24000 },
  { id: 'pkt-6', nama: 'Paket Premium Isi 6', jenisId: 'jenis-3', jenisNama: 'Premium', kapasitas: 6, hargaPaket: 42000, hargaNormal: 48000 },
];

const BUNDLING: BundlingItem[] = [
  { id: 'bund-1', nama: 'Bundling Hemat A', isiItem: '3 Donat Klasik + 2 Donat Reguler', hargaNormal: 19000, hargaBundling: 15000 },
  { id: 'bund-2', nama: 'Bundling Premium Mix', isiItem: '3 Donat Premium + 3 Donat Reguler', hargaNormal: 39000, hargaBundling: 33000 },
];

const VARIAN_MINI: VarianDonat[] = [
  { id: 'var-11', nama: 'Mini Gula', jenisId: 'jenis-1', jenisNama: 'Klasik', gambar: '🔸', hargaJual: 1500 },
  { id: 'var-12', nama: 'Mini Meses', jenisId: 'jenis-1', jenisNama: 'Klasik', gambar: '🔹', hargaJual: 1500 },
  { id: 'var-13', nama: 'Mini Coklat', jenisId: 'jenis-2', jenisNama: 'Reguler', gambar: '🍬', hargaJual: 2500 },
  { id: 'var-14', nama: 'Mini Keju', jenisId: 'jenis-2', jenisNama: 'Reguler', gambar: '🧁', hargaJual: 2500 },
  { id: 'var-15', nama: 'Mini Matcha', jenisId: 'jenis-3', jenisNama: 'Premium', gambar: '💚', hargaJual: 4000 },
  { id: 'var-16', nama: 'Mini Red Velvet', jenisId: 'jenis-3', jenisNama: 'Premium', gambar: '💗', hargaJual: 4000 },
];

const CUSTOM_PAKET: CustomPaket[] = [
  { id: 'cust-1', nama: 'Custom Isi 3', kapasitas: 3, ukuranDonat: 'standar', hargaSatuan: 3000, hargaKlasik: 8000, hargaReguler: 13000, hargaPremium: 22000 },
  { id: 'cust-2', nama: 'Custom Isi 6', kapasitas: 6, ukuranDonat: 'standar', hargaSatuan: 3000, hargaKlasik: 15000, hargaReguler: 25000, hargaPremium: 42000 },
  { id: 'cust-3', nama: 'Custom Mini Isi 12', kapasitas: 12, ukuranDonat: 'mini', hargaSatuan: 1500, hargaKlasik: 15000, hargaReguler: 25000, hargaPremium: 42000 },
];

const TAMBAHAN: TambahanItem[] = [
  { id: 'tmb-1', nama: 'Keping Coklat', gambar: '🍫', hargaJual: 5000, satuan: 'keping' },
  { id: 'tmb-2', nama: 'Pita Hias', gambar: '🎀', hargaJual: 3000, satuan: 'buah' },
  { id: 'tmb-3', nama: 'Lilin Angka', gambar: '🕯️', hargaJual: 5000, satuan: 'batang' },
  { id: 'tmb-4', nama: 'Lilin Kecil', gambar: '🎂', hargaJual: 3000, satuan: 'pak' },
];

// ═══════════════════════════════════════════════════
// CART TYPES
// ═══════════════════════════════════════════════════

interface CartSatuanItem {
  type: 'satuan';
  id: string;
  varianId: string;
  nama: string;
  jenis: string;
  harga: number;
  qty: number;
}

interface CartPaketItem {
  type: 'paket';
  id: string;
  paketId: string;
  namaPaket: string;
  jenis: string;
  kapasitas: number;
  hargaPaket: number;
  isiDonat: string[];
}

interface CartBundlingItem {
  type: 'bundling';
  id: string;
  bundlingId: string;
  nama: string;
  isiItem: string;
  harga: number;
}

interface CartCustomItem {
  type: 'custom';
  id: string;
  customPaketId: string;
  namaPaket: string;
  kapasitas: number;
  ukuranDonat: 'standar' | 'mini';
  jenisMode: string; // 'campur', 'klasik', 'reguler', 'premium'
  isiDonat: string[];
  hargaDonat: number;
  tambahan: { nama: string; qty: number; harga: number }[];
  tulisanCoklat: string;
  totalHarga: number;
}

type CartItem = CartSatuanItem | CartPaketItem | CartBundlingItem | CartCustomItem;

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

export default function PosPage() {
  // ═══ Outlet State ═══
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [outletList, setOutletList] = useState<Outlet[]>([]);
  const [showOutletPicker, setShowOutletPicker] = useState(false);

  useEffect(() => {
    db.getActiveOutlets().then(setOutletList);
    // Coba load outlet tersimpan dari localStorage
    try {
      const saved = localStorage.getItem('kasir_outlet');
      if (saved) setOutlet(JSON.parse(saved));
      else setShowOutletPicker(true);
    } catch {
      setShowOutletPicker(true);
    }
  }, []);

  const pilihOutlet = (o: Outlet) => {
    setOutlet(o);
    localStorage.setItem('kasir_outlet', JSON.stringify(o));
    setShowOutletPicker(false);
  };

  const [cart, setCart] = useState<CartItem[]>([]);

  // Paket flow
  const [paketModal, setPaketModal] = useState<PaketDonat | null>(null);
  const [paketIsi, setPaketIsi] = useState<string[]>([]);

  // Cart modal
  const [showCart, setShowCart] = useState(false);

  // Payment
  const [showBayar, setShowBayar] = useState(false);
  const [bayarNominal, setBayarNominal] = useState('');
  const [namaPelanggan, setNamaPelanggan] = useState('');

  // Struk
  const [showStruk, setShowStruk] = useState(false);
  const [strukData, setStrukData] = useState<{
    items: CartItem[]; total: number; bayar: number; kembalian: number; waktu: string; noTrx: string; nama: string;
  } | null>(null);

  // Scroll section
  const [activeSection, setActiveSection] = useState<'donat' | 'paket' | 'bundling' | 'custom'>('donat');

  // Custom flow
  const [customStep, setCustomStep] = useState<'pilih-paket' | 'pilih-jenis' | 'pilih-rasa' | 'tambahan'>('pilih-paket');
  const [selectedCustomPaket, setSelectedCustomPaket] = useState<CustomPaket | null>(null);
  const [customJenisMode, setCustomJenisMode] = useState<'campur' | 'klasik' | 'reguler' | 'premium'>('campur');
  const [customIsi, setCustomIsi] = useState<string[]>([]);
  const [customTambahan, setCustomTambahan] = useState<{ id: string; qty: number }[]>([]);
  const [customTulisan, setCustomTulisan] = useState('');

  const resetCustomFlow = () => {
    setCustomStep('pilih-paket');
    setSelectedCustomPaket(null);
    setCustomJenisMode('campur');
    setCustomIsi([]);
    setCustomTambahan([]);
    setCustomTulisan('');
  };

  const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');

  // ═══ Grouped varian ═══
  const jenisGroups = useMemo(() => {
    const groups: { id: string; nama: string; color: string; bgColor: string; textColor: string; borderColor: string; varian: VarianDonat[] }[] = [
      { id: 'jenis-1', nama: 'Klasik', color: 'text-amber-700', bgColor: 'bg-amber-50', textColor: 'text-amber-800', borderColor: 'border-amber-200', varian: [] },
      { id: 'jenis-2', nama: 'Reguler', color: 'text-blue-700', bgColor: 'bg-blue-50', textColor: 'text-blue-800', borderColor: 'border-blue-200', varian: [] },
      { id: 'jenis-3', nama: 'Premium', color: 'text-purple-700', bgColor: 'bg-purple-50', textColor: 'text-purple-800', borderColor: 'border-purple-200', varian: [] },
    ];
    VARIAN.forEach((v) => {
      const g = groups.find((g) => g.id === v.jenisId);
      if (g) g.varian.push(v);
    });
    return groups;
  }, []);

  // ═══ TOTAL ═══
  const grandTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      if (item.type === 'satuan') return total + item.harga * item.qty;
      if (item.type === 'paket') return total + item.hargaPaket;
      if (item.type === 'bundling') return total + item.harga;
      if (item.type === 'custom') return total + (item as CartCustomItem).totalHarga;
      return total;
    }, 0);
  }, [cart]);

  const totalDonat = useMemo(() => {
    return cart.reduce((t, item) => {
      if (item.type === 'satuan') return t + item.qty;
      if (item.type === 'paket') return t + item.kapasitas;
      if (item.type === 'custom') return t + (item as CartCustomItem).kapasitas;
      return t;
    }, 0);
  }, [cart]);

  // ═══ SATUAN: ADD ═══
  const tambahSatuan = (varian: VarianDonat) => {
    const existing = cart.find((c) => c.type === 'satuan' && (c as CartSatuanItem).varianId === varian.id) as CartSatuanItem | undefined;
    if (existing) {
      setCart(cart.map((c) => c.id === existing.id ? { ...existing, qty: existing.qty + 1 } : c));
    } else {
      setCart([...cart, {
        type: 'satuan', id: `sat-${Date.now()}`, varianId: varian.id,
        nama: varian.nama, jenis: varian.jenisNama, harga: varian.hargaJual, qty: 1,
      }]);
    }
  };

  // ═══ PAKET: OPEN MODAL ═══
  const bukaPaketModal = (paket: PaketDonat) => {
    setPaketModal(paket);
    setPaketIsi(Array(paket.kapasitas).fill(''));
  };

  // ═══ PAKET: CONFIRM ═══
  const konfirmasiPaket = () => {
    if (!paketModal) return;
    if (paketIsi.some((v) => !v)) return;
    setCart([...cart, {
      type: 'paket', id: `pkt-${Date.now()}`, paketId: paketModal.id,
      namaPaket: paketModal.nama, jenis: paketModal.jenisNama,
      kapasitas: paketModal.kapasitas, hargaPaket: paketModal.hargaPaket,
      isiDonat: paketIsi,
    }]);
    setPaketModal(null);
    setPaketIsi([]);
  };

  // ═══ PAKET: ISI CEPAT (semua sama) ═══
  const isiPaketCepat = (namaVarian: string) => {
    if (!paketModal) return;
    setPaketIsi(Array(paketModal.kapasitas).fill(namaVarian));
  };

  // ═══ BUNDLING: ADD ═══
  const tambahBundling = (bund: BundlingItem) => {
    setCart([...cart, {
      type: 'bundling', id: `bund-${Date.now()}`, bundlingId: bund.id,
      nama: bund.nama, isiItem: bund.isiItem, harga: bund.hargaBundling,
    }]);
  };

  // ═══ CUSTOM: CONFIRM ═══
  const konfirmasiCustom = () => {
    if (!selectedCustomPaket) return;
    if (customIsi.some((v) => !v)) return;

    // Calculate donat price
    let hargaDonat = 0;
    if (customJenisMode === 'campur') {
      hargaDonat = selectedCustomPaket.hargaSatuan * selectedCustomPaket.kapasitas;
    } else if (customJenisMode === 'klasik') {
      hargaDonat = selectedCustomPaket.hargaKlasik;
    } else if (customJenisMode === 'reguler') {
      hargaDonat = selectedCustomPaket.hargaReguler;
    } else {
      hargaDonat = selectedCustomPaket.hargaPremium;
    }

    // Calculate tambahan
    const tambahanDetails = customTambahan.filter(t => t.qty > 0).map(t => {
      const item = TAMBAHAN.find(x => x.id === t.id);
      return { nama: item?.nama || '', qty: t.qty, harga: (item?.hargaJual || 0) * t.qty };
    });
    const totalTambahan = tambahanDetails.reduce((s, t) => s + t.harga, 0);

    setCart([...cart, {
      type: 'custom',
      id: `cust-${Date.now()}`,
      customPaketId: selectedCustomPaket.id,
      namaPaket: selectedCustomPaket.nama,
      kapasitas: selectedCustomPaket.kapasitas,
      ukuranDonat: selectedCustomPaket.ukuranDonat,
      jenisMode: customJenisMode,
      isiDonat: customIsi,
      hargaDonat,
      tambahan: tambahanDetails,
      tulisanCoklat: customTulisan,
      totalHarga: hargaDonat + totalTambahan,
    }]);
    resetCustomFlow();
  };

  // ═══ CART: REMOVE ═══
  const hapusItem = (id: string) => setCart(cart.filter((c) => c.id !== id));

  // ═══ CART: UPDATE QTY SATUAN ═══
  const updateQty = (id: string, delta: number) => {
    setCart(cart.map((c) => {
      if (c.id === id && c.type === 'satuan') {
        const newQty = c.qty + delta;
        return newQty <= 0 ? (null as unknown as CartItem) : { ...c, qty: newQty };
      }
      return c;
    }).filter(Boolean));
  };

  // ═══ GET QTY IN CART for a varian ═══
  const getCartQty = (varianId: string): number => {
    const item = cart.find((c) => c.type === 'satuan' && (c as CartSatuanItem).varianId === varianId) as CartSatuanItem | undefined;
    return item?.qty || 0;
  };

  const getCartSatuanId = (varianId: string): string | null => {
    const item = cart.find((c) => c.type === 'satuan' && (c as CartSatuanItem).varianId === varianId) as CartSatuanItem | undefined;
    return item?.id || null;
  };

  // ═══ BAYAR ═══
  const prosesBayar = () => {
    const bayar = parseInt(bayarNominal);
    if (!bayar || bayar < grandTotal) return;

    setStrukData({
      items: [...cart], total: grandTotal, bayar, kembalian: bayar - grandTotal,
      waktu: new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }),
      noTrx: `TRX-${Date.now().toString(36).toUpperCase()}`,
      nama: namaPelanggan.trim() || 'Umum',
    });
    setShowBayar(false);
    setShowStruk(true);
    setCart([]);
    setBayarNominal('');
    setNamaPelanggan('');
  };

  // ═══ BOX SATUAN ═══
  const boxInfo = useMemo(() => {
    const totalSatuan = cart.filter((c) => c.type === 'satuan').reduce((t, c) => t + (c as CartSatuanItem).qty, 0);
    if (totalSatuan === 0) return null;
    const box6 = Math.floor(totalSatuan / 6);
    const sisa6 = totalSatuan % 6;
    const box3 = Math.floor(sisa6 / 3);
    const box1 = sisa6 % 3;
    const parts: string[] = [];
    if (box6 > 0) parts.push(`${box6}x Box 6`);
    if (box3 > 0) parts.push(`${box3}x Box 3`);
    if (box1 > 0) parts.push(`${box1}x Box 1`);
    return parts.join(', ');
  }, [cart]);

  // Waktu
  const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // ═══ OUTLET PICKER SCREEN ═══
  if (!outlet || showOutletPicker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-5xl mb-2">🏪</div>
            <h1 className="text-2xl font-bold text-gray-900">Pilih Outlet</h1>
            <p className="text-sm text-gray-400 mt-1">Pilih outlet tempat kamu bertugas hari ini</p>
          </div>
          <div className="space-y-3">
            {outletList.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">Belum ada outlet aktif. Tambah dulu di menu Kelola Outlet.</p>
            )}
            {outletList.map((o) => (
              <button
                key={o.id}
                onClick={() => pilihOutlet(o)}
                className="w-full bg-white rounded-2xl shadow px-5 py-4 text-left flex items-center gap-4 hover:shadow-md hover:border-orange-300 border-2 border-transparent transition-all active:scale-[0.98]"
              >
                <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🏪</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{o.nama}</p>
                  <p className="text-xs text-gray-400 truncate">📍 {o.alamat}</p>
                </div>
                <span className="text-orange-400 text-xl">›</span>
              </button>
            ))}
          </div>
          {outlet && showOutletPicker && (
            <button
              onClick={() => setShowOutletPicker(false)}
              className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 py-2"
            >
              Batal, tetap di {outlet.nama}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-100">

      {/* ═══ TOP BAR ═══ */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">🏪</span>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">{outlet.nama}</h1>
            <p className="text-xs text-gray-400">{jam} — Kasir</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {([
            { key: 'donat' as const, label: 'Satuan', icon: '🍩', count: cart.filter((c) => c.type === 'satuan').reduce((t, c) => t + (c as CartSatuanItem).qty, 0) },
            { key: 'paket' as const, label: 'Paket', icon: '📦', count: cart.filter((c) => c.type === 'paket').length },
            { key: 'bundling' as const, label: 'Bundling', icon: '🎁', count: cart.filter((c) => c.type === 'bundling').length },
            { key: 'custom' as const, label: 'Custom', icon: '🎨', count: cart.filter((c) => c.type === 'custom').length },
          ]).map((s) => (
            <button key={s.key} onClick={() => setActiveSection(s.key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeSection === s.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {s.icon} {s.label}
              {s.count > 0 && (
                <span className="bg-green-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {s.count}
                </span>
              )}
            </button>
          ))}
          {/* Ganti Outlet */}
          <button
            onClick={() => setShowOutletPicker(true)}
            className="ml-1 flex items-center gap-1.5 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-xs font-semibold transition-colors border border-orange-200"
            title="Ganti Outlet"
          >
            🏪 Ganti
          </button>
        </div>
      </div>


      {/* ═══ MAIN AREA ═══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ════════════════════════════════════════════ */}
        {/* LEFT: SEMUA PRODUK (scrollable)             */}
        {/* ════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* ═══ SECTION: DONAT SATUAN ═══ */}
          {activeSection === 'donat' && <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🍩</span>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Donat Satuan / Campuran</h2>
              <span className="text-xs text-gray-400 ml-auto">Tap untuk tambah, klik - untuk kurangi</span>
            </div>

            {jenisGroups.map((group) => (
              <div key={group.id} className="mb-4">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 ${group.bgColor} ${group.textColor}`}>
                  <span className="w-2 h-2 rounded-full bg-current opacity-60" />
                  {group.nama} — Rp {group.varian[0]?.hargaJual.toLocaleString('id-ID')}/pcs
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  {group.varian.map((v) => {
                    const qty = getCartQty(v.id);
                    const cartId = getCartSatuanId(v.id);
                    return (
                      <div key={v.id}
                        className={`relative rounded-xl border-2 transition-all select-none ${qty > 0 ? `${group.borderColor} ${group.bgColor}` : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        {/* Main tap area */}
                        <button onClick={() => tambahSatuan(v)}
                          className="w-full p-3 text-left">
                          <div className="text-2xl mb-1">{v.gambar || '🍩'}</div>
                          <p className="font-semibold text-gray-900 text-sm leading-snug">{v.nama}</p>
                          <p className={`text-xs font-bold mt-1 ${group.color}`}>{formatRp(v.hargaJual)}</p>
                        </button>
                        {/* Qty controls */}
                        {qty > 0 && (
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
                            <button onClick={(e) => { e.stopPropagation(); if (cartId) updateQty(cartId, -1); }}
                              className="w-6 h-6 rounded-full bg-white border border-gray-300 text-gray-600 text-xs font-bold flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-colors">
                              −
                            </button>
                            <span className="w-7 text-center text-sm font-bold text-gray-900">{qty}</span>
                            <button onClick={(e) => { e.stopPropagation(); tambahSatuan(v); }}
                              className="w-6 h-6 rounded-full bg-white border border-gray-300 text-gray-600 text-xs font-bold flex items-center justify-center hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-colors">
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>}

          {/* ═══ SECTION: PAKET ═══ */}
          {activeSection === 'paket' && <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📦</span>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Paket Hemat</h2>
              <span className="text-xs text-green-600 font-semibold ml-2">Harga diskon!</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PAKET.map((pkt) => {
                const hemat = pkt.hargaNormal - pkt.hargaPaket;
                const jenisGroup = jenisGroups.find((g) => g.id === pkt.jenisId);
                return (
                  <button key={pkt.id} onClick={() => bukaPaketModal(pkt)}
                    className="rounded-xl border-2 border-gray-200 bg-white p-4 text-left hover:border-green-300 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">{pkt.nama}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold ${jenisGroup?.bgColor || 'bg-gray-100'} ${jenisGroup?.textColor || 'text-gray-600'}`}>
                          {pkt.jenisNama} • {pkt.kapasitas} pcs
                        </span>
                      </div>
                      <span className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity">📦</span>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-gray-400 line-through">{formatRp(pkt.hargaNormal)}</p>
                        <p className="text-lg font-bold text-green-600">{formatRp(pkt.hargaPaket)}</p>
                      </div>
                      {hemat > 0 && (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">
                          Hemat {formatRp(hemat)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>}

          {/* ═══ SECTION: BUNDLING ═══ */}
          {activeSection === 'bundling' && <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎁</span>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Promo Bundling</h2>
              <span className="text-xs text-red-600 font-semibold ml-2">Promo spesial!</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {BUNDLING.map((bund) => {
                const diskon = Math.round(((bund.hargaNormal - bund.hargaBundling) / bund.hargaNormal) * 100);
                return (
                  <button key={bund.id} onClick={() => tambahBundling(bund)}
                    className="rounded-xl border-2 border-gray-200 bg-white p-4 text-left hover:border-purple-300 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-gray-900">{bund.nama}</h4>
                      <div className="flex items-center gap-2">
                        {diskon > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded text-xs font-bold">-{diskon}%</span>}
                        <span className="text-xl opacity-60 group-hover:opacity-100">🎁</span>
                      </div>
                    </div>
                    <div className="mt-2 bg-purple-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-purple-800 font-medium">{bund.isiItem}</p>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <p className="text-xs text-gray-400 line-through">{formatRp(bund.hargaNormal)}</p>
                        <p className="text-lg font-bold text-green-600">{formatRp(bund.hargaBundling)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {BUNDLING.length === 0 && (
                <p className="text-gray-400 text-center py-8 col-span-2">Tidak ada promo bundling saat ini</p>
              )}
            </div>
          </div>}

          {/* ═══ SECTION: CUSTOM ORDER ═══ */}
          {activeSection === 'custom' && <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🎨</span>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Custom Order</h2>
              <span className="text-xs text-pink-600 font-semibold ml-2">Pilih paket → jenis → rasa → tambahan</span>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-1 mb-4 bg-white rounded-lg p-2 border">
              {(['pilih-paket', 'pilih-jenis', 'pilih-rasa', 'tambahan'] as const).map((step, i) => {
                const labels = ['1. Isi Berapa', '2. Jenis', '3. Pilih Rasa', '4. Tambahan'];
                const isActive = customStep === step;
                const stepIdx = ['pilih-paket', 'pilih-jenis', 'pilih-rasa', 'tambahan'].indexOf(customStep);
                const isDone = i < stepIdx;
                return (
                  <div key={step} className="flex items-center gap-1 flex-1">
                    <div className={`flex-1 text-center py-1.5 rounded text-xs font-bold transition-all ${isActive ? 'bg-pink-500 text-white' : isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {isDone ? '✓' : ''} {labels[i]}
                    </div>
                    {i < 3 && <span className="text-gray-300 text-xs">→</span>}
                  </div>
                );
              })}
            </div>

            {/* Step 1: Pilih paket custom */}
            {customStep === 'pilih-paket' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CUSTOM_PAKET.map((cp) => (
                  <button key={cp.id} onClick={() => {
                    setSelectedCustomPaket(cp);
                    setCustomIsi(Array(cp.kapasitas).fill(''));
                    setCustomStep('pilih-jenis');
                  }}
                    className="rounded-xl border-2 border-gray-200 bg-white p-5 text-left hover:border-pink-300 hover:shadow-md transition-all">
                    <div className="text-3xl mb-2">{cp.ukuranDonat === 'mini' ? '🔸' : '🍩'}</div>
                    <h4 className="font-bold text-gray-900 text-lg">{cp.nama}</h4>
                    <div className="flex gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${cp.ukuranDonat === 'mini' ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'}`}>
                        {cp.ukuranDonat === 'mini' ? 'Mini' : 'Standar'}
                      </span>
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">{cp.kapasitas} pcs</span>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-gray-500">
                      <p>Campur: <b className="text-gray-700">{formatRp(cp.hargaSatuan)}/pcs</b></p>
                      <p>Klasik: <b className="text-amber-600">{formatRp(cp.hargaKlasik)}</b> | Reguler: <b className="text-blue-600">{formatRp(cp.hargaReguler)}</b></p>
                      <p>Premium: <b className="text-purple-600">{formatRp(cp.hargaPremium)}</b></p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Pilih jenis (campur / semua klasik / reguler / premium) */}
            {customStep === 'pilih-jenis' && selectedCustomPaket && (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  <b>{selectedCustomPaket.nama}</b> — Pilih jenis isian:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    { mode: 'campur' as const, label: 'Campur / Satuan', desc: 'Bebas pilih rasa', color: 'border-green-300 bg-green-50', text: 'text-green-700', harga: selectedCustomPaket.hargaSatuan * selectedCustomPaket.kapasitas },
                    { mode: 'klasik' as const, label: 'Semua Klasik', desc: 'Gula, Meses, dll', color: 'border-amber-300 bg-amber-50', text: 'text-amber-700', harga: selectedCustomPaket.hargaKlasik },
                    { mode: 'reguler' as const, label: 'Semua Reguler', desc: 'Coklat, Keju, dll', color: 'border-blue-300 bg-blue-50', text: 'text-blue-700', harga: selectedCustomPaket.hargaReguler },
                    { mode: 'premium' as const, label: 'Semua Premium', desc: 'Matcha, Lotus, dll', color: 'border-purple-300 bg-purple-50', text: 'text-purple-700', harga: selectedCustomPaket.hargaPremium },
                  ]).map((opt) => (
                    <button key={opt.mode} onClick={() => {
                      setCustomJenisMode(opt.mode);
                      setCustomIsi(Array(selectedCustomPaket.kapasitas).fill(''));
                      setCustomStep('pilih-rasa');
                    }}
                      className={`rounded-xl border-2 p-4 text-left hover:shadow-md transition-all ${opt.color}`}>
                      <p className={`font-bold text-sm ${opt.text}`}>{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      <p className={`text-lg font-bold mt-2 ${opt.text}`}>{formatRp(opt.harga)}</p>
                    </button>
                  ))}
                </div>
                <button onClick={() => { setCustomStep('pilih-paket'); setSelectedCustomPaket(null); }}
                  className="mt-3 text-xs text-gray-500 hover:text-gray-700">← Kembali pilih paket</button>
              </div>
            )}

            {/* Step 3: Pilih rasa */}
            {customStep === 'pilih-rasa' && selectedCustomPaket && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-700 font-bold">
                    {selectedCustomPaket.nama} — {customJenisMode === 'campur' ? 'Campur' : `Semua ${customJenisMode.charAt(0).toUpperCase() + customJenisMode.slice(1)}`}
                  </p>
                  <span className="text-xs text-gray-400">{customIsi.filter(v => v).length}/{selectedCustomPaket.kapasitas} terisi</span>
                </div>

                {/* Slot visual */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {customIsi.map((val, idx) => {
                    const allVarian = selectedCustomPaket.ukuranDonat === 'mini' ? VARIAN_MINI : VARIAN;
                    const varianInfo = val ? allVarian.find(v => v.nama === val) : null;
                    return (
                      <button key={idx} onClick={() => { if (val) { const newIsi = [...customIsi]; newIsi[idx] = ''; setCustomIsi(newIsi); } }}
                        className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center transition-all text-xs ${val ? 'border-pink-400 bg-pink-50 hover:border-red-300 hover:bg-red-50 group' : 'border-dashed border-gray-300 bg-gray-50'}`}>
                        {val ? (
                          <>
                            <span className="text-lg group-hover:hidden">{varianInfo?.gambar || '🍩'}</span>
                            <span className="hidden group-hover:block text-red-500">✕</span>
                          </>
                        ) : (
                          <span className="text-gray-300">{idx + 1}</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Available varian */}
                {(() => {
                  const allVarian = selectedCustomPaket.ukuranDonat === 'mini' ? VARIAN_MINI : VARIAN;
                  const filteredVarian = customJenisMode === 'campur'
                    ? allVarian
                    : allVarian.filter(v => v.jenisNama.toLowerCase() === customJenisMode);
                  const isFull = !customIsi.some(slot => !slot);
                  return (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                      {filteredVarian.map((v) => (
                        <button key={v.id} onClick={() => {
                          const nextEmpty = customIsi.findIndex(slot => !slot);
                          if (nextEmpty === -1) return;
                          const newIsi = [...customIsi]; newIsi[nextEmpty] = v.nama; setCustomIsi(newIsi);
                        }}
                          disabled={isFull}
                          className={`rounded-xl border-2 p-2 text-center transition-all ${isFull ? 'opacity-40 cursor-not-allowed border-gray-200' : 'border-gray-200 hover:border-pink-400 hover:bg-pink-50 active:scale-95'}`}>
                          <span className="text-xl block">{v.gambar || '🍩'}</span>
                          <p className="text-[10px] font-semibold text-gray-900 mt-0.5 leading-tight">{v.nama.replace('Donat ', '').replace('Mini ', '')}</p>
                        </button>
                      ))}
                    </div>
                  );
                })()}

                {/* Isi cepat */}
                {customJenisMode !== 'campur' && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-400 mb-2">Isi cepat (semua sama):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(selectedCustomPaket.ukuranDonat === 'mini' ? VARIAN_MINI : VARIAN)
                        .filter(v => v.jenisNama.toLowerCase() === customJenisMode)
                        .map((v) => (
                          <button key={v.id} onClick={() => setCustomIsi(Array(selectedCustomPaket.kapasitas).fill(v.nama))}
                            className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-pink-50 hover:border-pink-300 transition-colors">
                            {v.gambar} Semua {v.nama.replace('Donat ', '').replace('Mini ', '')}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button onClick={() => setCustomStep('pilih-jenis')}
                    className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 border">← Kembali</button>
                  <button onClick={() => setCustomStep('tambahan')}
                    disabled={customIsi.some(v => !v)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Lanjut ke Tambahan →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Tambahan (coklat, pita, lilin) */}
            {customStep === 'tambahan' && selectedCustomPaket && (
              <div>
                <p className="text-sm text-gray-700 font-bold mb-3">Tambahan (opsional)</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {TAMBAHAN.map((item) => {
                    const existing = customTambahan.find(t => t.id === item.id);
                    const qty = existing?.qty || 0;
                    return (
                      <div key={item.id} className={`border-2 rounded-xl p-4 transition-all ${qty > 0 ? 'border-pink-300 bg-pink-50' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{item.gambar}</span>
                          <div className="flex-1">
                            <p className="font-bold text-gray-900 text-sm">{item.nama}</p>
                            <p className="text-xs text-amber-600 font-bold">{formatRp(item.hargaJual)} /{item.satuan}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => {
                              if (qty <= 0) return;
                              setCustomTambahan(customTambahan.map(t => t.id === item.id ? { ...t, qty: t.qty - 1 } : t).filter(t => t.qty > 0));
                            }}
                              className="w-8 h-8 rounded-lg border bg-white text-gray-500 text-sm font-bold flex items-center justify-center hover:bg-red-50 hover:border-red-300">−</button>
                            <span className="w-8 text-center text-sm font-bold">{qty}</span>
                            <button onClick={() => {
                              if (existing) {
                                setCustomTambahan(customTambahan.map(t => t.id === item.id ? { ...t, qty: t.qty + 1 } : t));
                              } else {
                                setCustomTambahan([...customTambahan, { id: item.id, qty: 1 }]);
                              }
                            }}
                              className="w-8 h-8 rounded-lg border bg-white text-gray-500 text-sm font-bold flex items-center justify-center hover:bg-green-50 hover:border-green-300">+</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tulisan coklat */}
                {customTambahan.some(t => t.id === 'tmb-1' && t.qty > 0) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                    <label className="block text-xs font-bold text-amber-700 mb-1">✏️ Tulisan pada keping coklat:</label>
                    <input type="text" value={customTulisan} onChange={(e) => setCustomTulisan(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-amber-300 rounded-lg text-sm focus:outline-none focus:border-amber-500"
                      placeholder='Contoh: "Selamat Menua"' maxLength={50} />
                  </div>
                )}

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-1.5 text-sm">
                  <p className="font-bold text-gray-700">Ringkasan Custom Order:</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{selectedCustomPaket.nama} — {customJenisMode}</span>
                    <span className="font-bold">
                      {formatRp(customJenisMode === 'campur'
                        ? selectedCustomPaket.hargaSatuan * selectedCustomPaket.kapasitas
                        : customJenisMode === 'klasik' ? selectedCustomPaket.hargaKlasik
                        : customJenisMode === 'reguler' ? selectedCustomPaket.hargaReguler
                        : selectedCustomPaket.hargaPremium)}
                    </span>
                  </div>
                  {customTambahan.filter(t => t.qty > 0).map(t => {
                    const item = TAMBAHAN.find(x => x.id === t.id);
                    return (
                      <div key={t.id} className="flex justify-between text-xs">
                        <span className="text-gray-500">{item?.gambar} {item?.nama} x{t.qty}</span>
                        <span className="font-bold">{formatRp((item?.hargaJual || 0) * t.qty)}</span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between pt-1.5 border-t font-bold">
                    <span>Total</span>
                    <span className="text-green-600">
                      {formatRp(
                        (customJenisMode === 'campur'
                          ? selectedCustomPaket.hargaSatuan * selectedCustomPaket.kapasitas
                          : customJenisMode === 'klasik' ? selectedCustomPaket.hargaKlasik
                          : customJenisMode === 'reguler' ? selectedCustomPaket.hargaReguler
                          : selectedCustomPaket.hargaPremium)
                        + customTambahan.filter(t => t.qty > 0).reduce((s, t) => s + (TAMBAHAN.find(x => x.id === t.id)?.hargaJual || 0) * t.qty, 0)
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setCustomStep('pilih-rasa')}
                    className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 border">← Kembali</button>
                  <button onClick={konfirmasiCustom}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-colors shadow-lg shadow-green-200">
                    ✓ Tambah ke Pesanan
                  </button>
                </div>
              </div>
            )}
          </div>}

          {/* Spacer for floating cart button */}
          <div className="h-20" />
        </div>
      </div>

      {/* ═══ FLOATING CART BUTTON ═══ */}
      <button onClick={() => setShowCart(true)}
        className="fixed bottom-6 right-6 z-40 w-16 h-16 rounded-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 shadow-xl shadow-amber-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95">
        <span className="text-2xl">🛒</span>
        {cart.length > 0 && (
          <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shadow-lg border-2 border-white">
            {totalDonat}
          </span>
        )}
        {grandTotal > 0 && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow">
            {formatRp(grandTotal)}
          </span>
        )}
      </button>

      {/* ══════════════════════════════════════════════ */}
      {/* MODAL: KERANJANG (full screen drawer)          */}
      {/* ══════════════════════════════════════════════ */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowCart(false); }}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
            {/* Cart header */}
            <div className="px-5 py-4 border-b bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛒</span>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">Pesanan</h3>
                    {totalDonat > 0 && <p className="text-xs text-amber-600 font-medium">{totalDonat} donat</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {cart.length > 0 && (
                    <button onClick={() => { if (confirm('Kosongkan pesanan?')) setCart([]); }}
                      className="text-xs text-red-400 hover:text-red-600 font-medium">
                      Hapus semua
                    </button>
                  )}
                  <button onClick={() => setShowCart(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-lg font-bold transition-colors">
                    ✕
                  </button>
                </div>
              </div>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <span className="text-5xl mb-3 opacity-40">🛒</span>
                  <p className="text-sm font-medium">Belum ada pesanan</p>
                  <p className="text-xs mt-1">Pilih donat dulu, lalu buka keranjang</p>
                  <button onClick={() => setShowCart(false)}
                    className="mt-4 px-4 py-2 rounded-lg bg-amber-100 text-amber-700 text-sm font-bold hover:bg-amber-200 transition-colors">
                    Pilih Donat
                  </button>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {/* Satuan items */}
                  {cart.filter((c) => c.type === 'satuan').length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold text-gray-400 uppercase px-1">Donat Satuan</p>
                      {cart.filter((c) => c.type === 'satuan').map((item) => {
                        const c = item as CartSatuanItem;
                        return (
                          <div key={c.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{c.nama}</p>
                              <p className="text-xs text-gray-400">{c.jenis} • {formatRp(c.harga)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateQty(c.id, -1)}
                                className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 text-sm font-bold flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-600">
                                −
                              </button>
                              <span className="w-8 text-center text-sm font-bold">{c.qty}</span>
                              <button onClick={() => updateQty(c.id, 1)}
                                className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-500 text-sm font-bold flex items-center justify-center hover:bg-green-50 hover:border-green-300 hover:text-green-600">
                                +
                              </button>
                            </div>
                            <p className="text-sm font-bold text-gray-900 w-[72px] text-right">{formatRp(c.harga * c.qty)}</p>
                          </div>
                        );
                      })}
                      {boxInfo && (
                        <p className="text-xs text-amber-600 font-medium px-1 py-1">📦 Box: {boxInfo}</p>
                      )}
                    </div>
                  )}

                  {/* Paket items */}
                  {cart.filter((c) => c.type === 'paket').map((item) => {
                    const c = item as CartPaketItem;
                    return (
                      <div key={c.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">📦</span>
                              <p className="text-sm font-bold text-gray-900">{c.namaPaket}</p>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {c.isiDonat.map((d, i) => (
                                <span key={i} className="text-xs bg-white/80 text-gray-600 px-1.5 py-0.5 rounded">{d}</span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right ml-2">
                            <p className="text-sm font-bold text-green-700">{formatRp(c.hargaPaket)}</p>
                            <button onClick={() => hapusItem(c.id)} className="text-xs text-red-400 hover:text-red-600 mt-0.5">hapus</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Bundling items */}
                  {cart.filter((c) => c.type === 'bundling').map((item) => {
                    const c = item as CartBundlingItem;
                    return (
                      <div key={c.id} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">🎁</span>
                              <p className="text-sm font-bold text-gray-900">{c.nama}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{c.isiItem}</p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="text-sm font-bold text-green-700">{formatRp(c.harga)}</p>
                            <button onClick={() => hapusItem(c.id)} className="text-xs text-red-400 hover:text-red-600 mt-0.5">hapus</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Custom items */}
                  {cart.filter((c) => c.type === 'custom').map((item) => {
                    const c = item as CartCustomItem;
                    return (
                      <div key={c.id} className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">🎨</span>
                              <p className="text-sm font-bold text-gray-900">{c.namaPaket}</p>
                              <span className="text-xs bg-pink-200 text-pink-700 px-1.5 py-0.5 rounded font-bold">{c.jenisMode}</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {c.isiDonat.slice(0, 6).map((d, i) => (
                                <span key={i} className="text-xs bg-white/80 text-gray-600 px-1.5 py-0.5 rounded">{d.replace('Donat ', '').replace('Mini ', '')}</span>
                              ))}
                              {c.isiDonat.length > 6 && <span className="text-xs text-gray-400">+{c.isiDonat.length - 6} lagi</span>}
                            </div>
                            {c.tambahan.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {c.tambahan.map((t, i) => (
                                  <span key={i} className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">{t.nama} x{t.qty}</span>
                                ))}
                              </div>
                            )}
                            {c.tulisanCoklat && <p className="text-xs text-amber-600 mt-0.5 italic">&quot;{c.tulisanCoklat}&quot;</p>}
                          </div>
                          <div className="text-right ml-2">
                            <p className="text-sm font-bold text-green-700">{formatRp(c.totalHarga)}</p>
                            <button onClick={() => hapusItem(c.id)} className="text-xs text-red-400 hover:text-red-600 mt-0.5">hapus</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cart footer - total & bayar */}
            {cart.length > 0 && (
              <div className="border-t bg-white p-4 space-y-3 shrink-0">
                <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                  {cart.filter((c) => c.type === 'satuan').length > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Satuan ({cart.filter((c) => c.type === 'satuan').reduce((t, c) => t + (c as CartSatuanItem).qty, 0)} pcs)</span>
                      <span>{formatRp(cart.filter((c) => c.type === 'satuan').reduce((t, c) => t + (c as CartSatuanItem).harga * (c as CartSatuanItem).qty, 0))}</span>
                    </div>
                  )}
                  {cart.filter((c) => c.type === 'paket').length > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Paket ({cart.filter((c) => c.type === 'paket').length}x)</span>
                      <span>{formatRp(cart.filter((c) => c.type === 'paket').reduce((t, c) => t + (c as CartPaketItem).hargaPaket, 0))}</span>
                    </div>
                  )}
                  {cart.filter((c) => c.type === 'bundling').length > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Bundling ({cart.filter((c) => c.type === 'bundling').length}x)</span>
                      <span>{formatRp(cart.filter((c) => c.type === 'bundling').reduce((t, c) => t + (c as CartBundlingItem).harga, 0))}</span>
                    </div>
                  )}
                  {cart.filter((c) => c.type === 'custom').length > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Custom ({cart.filter((c) => c.type === 'custom').length}x)</span>
                      <span>{formatRp(cart.filter((c) => c.type === 'custom').reduce((t, c) => t + (c as CartCustomItem).totalHarga, 0))}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-900">TOTAL</span>
                    <span className="text-xl font-bold text-gray-900">{formatRp(grandTotal)}</span>
                  </div>
                </div>
                <button onClick={() => { setShowCart(false); setShowBayar(true); setBayarNominal(''); }}
                  className="w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-bold text-base transition-colors shadow-lg shadow-green-200">
                  Bayar — {formatRp(grandTotal)}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* MODAL: PILIH ISI PAKET                        */}
      {/* ══════════════════════════════════════════════ */}
      {paketModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <h3 className="text-lg font-bold text-gray-900">📦 {paketModal.nama}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Pilih {paketModal.kapasitas} donat <span className="font-semibold">{paketModal.jenisNama}</span> untuk mengisi paket
              </p>
              <p className="text-xs text-green-600 font-bold mt-1">Harga paket: {formatRp(paketModal.hargaPaket)} (hemat {formatRp(paketModal.hargaNormal - paketModal.hargaPaket)})</p>
            </div>

            {/* Slot visual — max 3/6 slots */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-xs font-bold text-gray-500 mb-2">Isi paket ({paketIsi.filter(v => v).length}/{paketModal.kapasitas}):</p>
              <div className="flex gap-2 flex-wrap">
                {paketIsi.map((val, idx) => {
                  const varianInfo = val ? VARIAN.find(v => v.nama === val) : null;
                  return (
                    <button key={idx} onClick={() => { if (val) { const newIsi = [...paketIsi]; newIsi[idx] = ''; setPaketIsi(newIsi); } }}
                      className={`w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${val ? 'border-green-400 bg-green-50 hover:border-red-300 hover:bg-red-50 group' : 'border-dashed border-gray-300 bg-gray-50'}`}>
                      {val ? (
                        <>
                          <span className="text-xl group-hover:hidden">{varianInfo?.gambar || '🍩'}</span>
                          <span className="text-xs text-green-700 font-medium truncate max-w-[56px] group-hover:hidden">{(val || '').replace('Donat ', '')}</span>
                          <span className="hidden group-hover:block text-red-500 text-lg">✕</span>
                        </>
                      ) : (
                        <>
                          <span className="text-gray-300 text-lg">+</span>
                          <span className="text-[10px] text-gray-400">{idx + 1}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pilihan donat — klik langsung */}
            <div className="p-5">
              <p className="text-xs font-bold text-gray-500 mb-2">Tap donat untuk mengisi slot:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VARIAN.filter((v) => v.jenisId === paketModal.jenisId).map((v) => {
                  const isFull = !paketIsi.some(slot => !slot);
                  return (
                    <button key={v.id} onClick={() => {
                      const nextEmpty = paketIsi.findIndex(slot => !slot);
                      if (nextEmpty === -1) return;
                      const newIsi = [...paketIsi]; newIsi[nextEmpty] = v.nama; setPaketIsi(newIsi);
                    }}
                      disabled={isFull}
                      className={`rounded-xl border-2 p-3 text-center transition-all ${isFull ? 'opacity-40 cursor-not-allowed border-gray-200' : 'border-gray-200 hover:border-green-400 hover:bg-green-50 active:scale-95'}`}>
                      <span className="text-2xl block">{v.gambar || '🍩'}</span>
                      <p className="text-xs font-semibold text-gray-900 mt-1 leading-tight">{v.nama.replace('Donat ', '')}</p>
                    </button>
                  );
                })}
              </div>
              {/* Isi cepat */}
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-400 mb-2">Isi cepat (semua sama):</p>
                <div className="flex flex-wrap gap-1.5">
                  {VARIAN.filter((v) => v.jenisId === paketModal.jenisId).map((v) => (
                    <button key={v.id} onClick={() => isiPaketCepat(v.nama)}
                      className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-green-50 hover:border-green-300 transition-colors">
                      {v.gambar} Semua {v.nama.replace('Donat ', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t flex items-center justify-between">
              <button onClick={() => { setPaketModal(null); setPaketIsi([]); }}
                className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors">
                Batal
              </button>
              <button onClick={konfirmasiPaket}
                disabled={paketIsi.some((v) => !v)}
                className="px-6 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-green-200">
                Tambah ke Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* MODAL: PEMBAYARAN                             */}
      {/* ══════════════════════════════════════════════ */}
      {showBayar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <h3 className="text-lg font-bold text-gray-900">Pembayaran</h3>
              <p className="text-sm text-gray-500">Total: <span className="font-bold text-green-600 text-base">{formatRp(grandTotal)}</span></p>
            </div>

            <div className="p-5 space-y-4">
              {/* Nama Pelanggan */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Atas nama</label>
                <input type="text" value={namaPelanggan}
                  onChange={(e) => setNamaPelanggan(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-green-500 transition-colors"
                  placeholder="Nama pelanggan (kosongkan jika umum)" />
              </div>

              {/* Input nominal */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">Uang diterima</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">Rp</span>
                  <input type="number" value={bayarNominal}
                    onChange={(e) => setBayarNominal(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl text-2xl font-bold text-right focus:outline-none focus:border-green-500 transition-colors"
                    placeholder="0" autoFocus />
                </div>
              </div>

              {/* Quick amount */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Uang Pas', val: grandTotal },
                  { label: formatRp(Math.ceil(grandTotal / 10000) * 10000), val: Math.ceil(grandTotal / 10000) * 10000 },
                  { label: formatRp(Math.ceil(grandTotal / 50000) * 50000), val: Math.ceil(grandTotal / 50000) * 50000 },
                  { label: 'Rp 50.000', val: 50000 },
                  { label: 'Rp 100.000', val: 100000 },
                  { label: 'Rp 200.000', val: 200000 },
                ].map((n, i) => (
                  <button key={i} onClick={() => setBayarNominal(String(n.val))}
                    className={`px-3 py-2.5 border-2 rounded-xl text-xs font-bold transition-colors ${String(n.val) === bayarNominal ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-green-300 hover:bg-green-50'}`}>
                    {n.label}
                  </button>
                ))}
              </div>

              {/* Kembalian */}
              {bayarNominal && parseInt(bayarNominal) >= grandTotal && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Kembalian</p>
                  <p className="text-3xl font-bold text-green-600">{formatRp(parseInt(bayarNominal) - grandTotal)}</p>
                </div>
              )}

              {bayarNominal && parseInt(bayarNominal) < grandTotal && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-red-600 font-medium">Kurang {formatRp(grandTotal - parseInt(bayarNominal))}</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t flex gap-3">
              <button onClick={() => setShowBayar(false)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors">
                Batal
              </button>
              <button onClick={prosesBayar}
                disabled={!bayarNominal || parseInt(bayarNominal) < grandTotal}
                className="flex-[2] py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-green-200">
                Proses Bayar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════ */}
      {/* MODAL: STRUK                                  */}
      {/* ══════════════════════════════════════════════ */}
      {showStruk && strukData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header Struk */}
              <div className="text-center mb-4 pb-4 border-b-2 border-dashed border-gray-300">
                <p className="text-2xl mb-1">🍩</p>
                <h3 className="text-lg font-bold text-gray-900">donattour</h3>
                <p className="text-xs text-gray-400 mt-1">{strukData.waktu}</p>
                <p className="text-xs text-gray-400 font-mono">{strukData.noTrx}</p>
                <p className="text-sm font-bold text-gray-700 mt-2">a/n: {strukData.nama}</p>
              </div>

              {/* Isi struk */}
              <div className="space-y-2 mb-4 pb-4 border-b-2 border-dashed border-gray-300 text-sm">
                {strukData.items.filter((c) => c.type === 'satuan').map((item) => {
                  const c = item as CartSatuanItem;
                  return (
                    <div key={c.id} className="flex justify-between">
                      <span className="text-gray-700">{c.nama} <span className="text-gray-400">x{c.qty}</span></span>
                      <span className="font-medium">{formatRp(c.harga * c.qty)}</span>
                    </div>
                  );
                })}
                {strukData.items.filter((c) => c.type === 'paket').map((item) => {
                  const c = item as CartPaketItem;
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between">
                        <span className="text-gray-700">{c.namaPaket}</span>
                        <span className="font-medium">{formatRp(c.hargaPaket)}</span>
                      </div>
                      <p className="text-xs text-gray-400 ml-2">({c.isiDonat.join(', ')})</p>
                    </div>
                  );
                })}
                {strukData.items.filter((c) => c.type === 'bundling').map((item) => {
                  const c = item as CartBundlingItem;
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between">
                        <span className="text-gray-700">{c.nama}</span>
                        <span className="font-medium">{formatRp(c.harga)}</span>
                      </div>
                      <p className="text-xs text-gray-400 ml-2">({c.isiItem})</p>
                    </div>
                  );
                })}
                {strukData.items.filter((c) => c.type === 'custom').map((item) => {
                  const c = item as CartCustomItem;
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between">
                        <span className="text-gray-700">{c.namaPaket} ({c.jenisMode})</span>
                        <span className="font-medium">{formatRp(c.totalHarga)}</span>
                      </div>
                      <p className="text-xs text-gray-400 ml-2">({c.isiDonat.slice(0, 4).join(', ')}{c.isiDonat.length > 4 ? `, +${c.isiDonat.length - 4}` : ''})</p>
                      {c.tambahan.length > 0 && <p className="text-xs text-gray-400 ml-2">+ {c.tambahan.map(t => `${t.nama} x${t.qty}`).join(', ')}</p>}
                      {c.tulisanCoklat && <p className="text-xs text-gray-400 ml-2 italic">&quot;{c.tulisanCoklat}&quot;</p>}
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="space-y-1.5 mb-4 pb-4 border-b-2 border-dashed border-gray-300">
                <div className="flex justify-between font-bold text-base">
                  <span>TOTAL</span>
                  <span>{formatRp(strukData.total)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Tunai</span>
                  <span>{formatRp(strukData.bayar)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-green-600">
                  <span>Kembalian</span>
                  <span>{formatRp(strukData.kembalian)}</span>
                </div>
              </div>

              <p className="text-center text-xs text-gray-400 mb-4">Terima kasih! 🍩</p>

              <button onClick={() => { setShowStruk(false); setStrukData(null); }}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors">
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
