'use client';

import { useState, useMemo, useEffect } from 'react';
import * as db from '@/lib/db';
import { toast } from 'sonner';
import type {
  Outlet,
  ProductWithCategory,
  ProductPackage,
  ProductBundling,
  ProductCustomTemplate,
  Product,
  ChannelType,
  OutletChannelPrice,
  ProductCategory,
  PaymentMethodKasir,
  User,
} from '@/lib/types';

// ═══════════════════════════════════════════════════
// CART TYPES
// ═══════════════════════════════════════════════════

export interface CartSatuanItem {
  type: 'satuan';
  id: string;
  varianId: string;
  nama: string;
  jenis: string;
  harga: number;
  qty: number;
  tipe_produk?: string;
  base_product_id?: string | null;
}

export interface CartPaketItem {
  type: 'paket';
  id: string;
  paketId: string;
  namaPaket: string;
  kapasitas: number;
  hargaPaket: number;
  isiDonat: string[];
}

export interface CartBundlingItem {
  type: 'bundling';
  id: string;
  bundlingId: string;
  nama: string;
  harga: number;
}

export interface CartCustomItem {
  type: 'custom';
  id: string;
  customPaketId: string;
  namaPaket: string;
  kapasitas: number;
  ukuranDonat: 'standar' | 'mini';
  jenisMode: string;
  isiDonat: string[];
  hargaDonat: number;
  tambahan: { id: string; nama: string; qty: number; harga: number }[];
  tulisanCoklat: string;
  totalHarga: number;
}

export type CartItem = CartSatuanItem | CartPaketItem | CartBundlingItem | CartCustomItem;

export type ActiveSection = 'donat' | 'paket' | 'bundling' | 'custom';

export function useKasir() {
  // ═══ Outlet & Channel State ═══
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [outletList, setOutletList] = useState<Outlet[]>([]);
  const [showOutletPicker, setShowOutletPicker] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('toko');

  // ═══ Cashier Selection ═══
  const [cashier, setCashier] = useState<User | null>(null);
  const [cashierList, setCashierList] = useState<User[]>([]);
  const [showCashierModal, setShowCashierModal] = useState(false);

  // ═══ Product Data ═══
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [paketList, setPaketList] = useState<ProductPackage[]>([]);
  const [bundlingList, setBundlingList] = useState<ProductBundling[]>([]);
  const [customList, setCustomList] = useState<ProductCustomTemplate[]>([]);
  const [tambahanList, setTambahanList] = useState<Product[]>([]);
  const [biayaEkstraList, setBiayaEkstraList] = useState<Product[]>([]);
  const [channelPrices, setChannelPrices] = useState<OutletChannelPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ═══ Cart & UI ═══
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('donat');
  const [ukuranFilter, setUkuranFilter] = useState<'standar' | 'mini'>('standar');

  // ═══ Payment ═══
  const [showBayar, setShowBayar] = useState(false);
  const [bayarNominal, setBayarNominal] = useState('');
  const [namaPelanggan, setNamaPelanggan] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKasir>('cash');
  const [selectedBiayaEkstra, setSelectedBiayaEkstra] = useState<{ id: string; nama: string; harga: number }[]>([]);

  // ═══ Receipt ═══
  const [showStruk, setShowStruk] = useState(false);
  const [strukData, setStrukData] = useState<any>(null);

  // ═══ Paket Modal ═══
  const [paketModal, setPaketModal] = useState<ProductPackage | null>(null);
  const [paketIsi, setPaketIsi] = useState<string[]>([]);

  // ═══ Custom Flow ═══
  const [customStep, setCustomStep] = useState<'pilih-paket' | 'pilih-jenis' | 'pilih-rasa' | 'tambahan'>('pilih-paket');
  const [selectedCustomPaket, setSelectedCustomPaket] = useState<ProductCustomTemplate | null>(null);
  const [customJenisMode, setCustomJenisMode] = useState<'campur' | 'klasik' | 'reguler' | 'premium'>('campur');
  const [customIsi, setCustomIsi] = useState<string[]>([]);
  const [customTambahan, setCustomTambahan] = useState<{ id: string; nama: string; qty: number; harga: number }[]>([]);
  const [customTulisan, setCustomTulisan] = useState('');

  const resetCustomFlow = () => {
    setCustomStep('pilih-paket');
    setSelectedCustomPaket(null);
    setCustomJenisMode('campur');
    setCustomIsi([]);
    setCustomTambahan([]);
    setCustomTulisan('');
  };

  // ═══ LOAD OUTLETS ═══
  useEffect(() => {
    db.getActiveOutlets().then(setOutletList);
    try {
      const saved = localStorage.getItem('kasir_outlet');
      if (saved) {
        const parsed = JSON.parse(saved);
        const isLegacyId = typeof parsed.id === 'string' && parsed.id.startsWith('outlet-');
        if (isLegacyId) { localStorage.removeItem('kasir_outlet'); setShowOutletPicker(true); }
        else { setOutlet(parsed); }
      } else { setShowOutletPicker(true); }
      
      const savedCashier = localStorage.getItem('kasir_user');
      if (savedCashier) setCashier(JSON.parse(savedCashier));
    } catch { setShowOutletPicker(true); }
  }, []);

  const [receiptSettings, setReceiptSettings] = useState<any>(null);

  // ═══ LOAD DATA ═══
  useEffect(() => {
    async function loadData() {
      if (!outlet) return;
      setIsLoading(true);
      try {
        const [prods, cats, pkgs, bunds, custs, adds, ekstra, prices, rs, employees] = await Promise.all([
          db.getProductsWithCategory(), db.getProductCategories(), db.getProductPackages(),
          db.getProductBundlings(), db.getProductCustomTemplates(), db.getProductsByTipe('tambahan'),
          db.getProductsByTipe('biaya_ekstra'), db.getChannelPrices(outlet.id, selectedChannel),
          db.getReceiptSettings?.(outlet.id), db.getUsersDetailed(outlet.id)
        ]);
        setProducts(prods); setCategories(cats); setPaketList(pkgs); setBundlingList(bunds);
        setCustomList(custs); setTambahanList(adds); setBiayaEkstraList(ekstra.filter(e => e.is_active));
        setChannelPrices(prices); setCashierList(employees.filter(e => e.is_active));
        if (rs) setReceiptSettings(rs);
      } catch (err) { console.error('Failed to load POS data:', err); }
      finally { setIsLoading(false); }
    }
    loadData();
  }, [outlet, selectedChannel]);

  // ═══ HELPERS ═══
  const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID');

  const getDisplayPrice = (p: ProductWithCategory) => {
    const cp = channelPrices.find(c => c.product_id === p.id);
    return cp ? cp.harga_jual : p.harga_jual;
  };

  const pilihOutlet = (o: Outlet) => {
    setOutlet(o); localStorage.setItem('kasir_outlet', JSON.stringify(o));
    setShowOutletPicker(false); setCart([]);
    setCashier(null); localStorage.removeItem('kasir_user');
    setShowCashierModal(true);
  };

  const pilihCashier = (u: User) => {
    setCashier(u); localStorage.setItem('kasir_user', JSON.stringify(u));
    setShowCashierModal(false);
  };

  // ═══ CART TOTALS ═══
  const grandTotal = useMemo(() => cart.reduce((sum, item) => {
    if (item.type === 'satuan') return sum + (item.harga * item.qty);
    if (item.type === 'paket') return sum + item.hargaPaket;
    if (item.type === 'bundling') return sum + item.harga;
    if (item.type === 'custom') return sum + item.totalHarga;
    return sum;
  }, 0), [cart]);

  const totalBiayaEkstra = useMemo(() => selectedBiayaEkstra.reduce((s, i) => s + i.harga, 0), [selectedBiayaEkstra]);
  const finalTotal = grandTotal + totalBiayaEkstra;

  // ═══ CART: ADD SATUAN ═══
  const tambahSatuan = (p: ProductWithCategory) => {
    const harga = getDisplayPrice(p);
    const existing = cart.find(c => c.type === 'satuan' && c.varianId === p.id) as CartSatuanItem | undefined;
    if (existing) {
      setCart(cart.map(c => c.id === existing.id ? { ...c, qty: existing.qty + 1 } : c));
      toast.success(`${p.nama} +1`, { position: 'top-center' });
    } else {
      setCart([...cart, { type: 'satuan', id: `s-${Date.now()}`, varianId: p.id, nama: p.nama,
        jenis: p.category?.nama || 'Donat', harga, qty: 1, tipe_produk: p.tipe_produk, base_product_id: p.base_product_id }]);
      toast.success(`${p.nama} ditambahkan`, { position: 'top-center' });
    }
  };

  // ═══ CART: QTY ═══
  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(c => {
      if (c.id === id && c.type === 'satuan') {
        const nq = c.qty + delta;
        return nq <= 0 ? (null as any) : { ...c, qty: nq };
      }
      return c;
    }).filter(Boolean));
  };

  const hapusItem = (id: string) => { setCart(cart.filter(c => c.id !== id)); toast.info('Item dihapus', { position: 'top-center' }); };

  const getCartQty = (varianId: string): number => {
    const item = cart.find(c => c.type === 'satuan' && (c as CartSatuanItem).varianId === varianId) as CartSatuanItem | undefined;
    return item?.qty || 0;
  };

  const getCartSatuanId = (varianId: string): string | null => {
    const item = cart.find(c => c.type === 'satuan' && (c as CartSatuanItem).varianId === varianId) as CartSatuanItem | undefined;
    return item?.id || null;
  };

  // ═══ PAKET ═══
  const bukaPaketModal = (p: ProductPackage) => { setPaketModal(p); setPaketIsi(Array(p.kapasitas).fill('')); };
  const konfirmasiPaket = () => {
    if (!paketModal) return;
    setCart([...cart, { type: 'paket', id: `p-${Date.now()}`, paketId: paketModal.id, namaPaket: paketModal.nama,
      kapasitas: paketModal.kapasitas, hargaPaket: paketModal.harga_paket, isiDonat: paketIsi }]);
    toast.success(`${paketModal.nama} ditambahkan`, { position: 'top-center' }); setPaketModal(null);
  };

  // ═══ BUNDLING ═══
  const tambahBundling = (b: ProductBundling) => {
    setCart([...cart, { type: 'bundling', id: `b-${Date.now()}`, bundlingId: b.id, nama: b.nama, harga: b.harga_bundling }]);
    toast.success(`Bundling ${b.nama} ditambahkan`, { position: 'top-center' });
  };

  // ═══ CUSTOM ═══
  const konfirmasiCustom = () => {
    if (!selectedCustomPaket) return;
    const hargaDonat = customJenisMode === 'campur'
      ? selectedCustomPaket.harga_satuan_default * selectedCustomPaket.kapasitas
      : (customJenisMode === 'klasik' ? selectedCustomPaket.harga_klasik_full : (customJenisMode === 'reguler' ? selectedCustomPaket.harga_reguler_full : selectedCustomPaket.harga_premium_full)) || 0;
    const totalTambahan = customTambahan.reduce((s, t) => s + t.harga, 0);
    setCart([...cart, { type: 'custom', id: `c-${Date.now()}`, customPaketId: selectedCustomPaket.id,
      namaPaket: selectedCustomPaket.nama, kapasitas: selectedCustomPaket.kapasitas,
      ukuranDonat: selectedCustomPaket.ukuran_donat as 'standar' | 'mini', jenisMode: customJenisMode,
      isiDonat: customIsi, hargaDonat, tambahan: customTambahan, tulisanCoklat: customTulisan,
      totalHarga: hargaDonat + totalTambahan }]);
    toast.success(`Custom ${selectedCustomPaket.nama} ditambahkan`, { position: 'top-center' }); resetCustomFlow();
  };

  // ═══ BAYAR ═══
  const prosesBayar = async () => {
    if (!outlet) return;
    if (!cashier) {
      toast.error('Silakan pilih Personil/Kasir terlebih dahulu!', { position: 'top-center' });
      setShowCashierModal(true);
      return;
    }
    const bayar = paymentMethod === 'cash' ? parseInt(bayarNominal) : finalTotal;
    if (paymentMethod === 'cash' && (!bayar || bayar < finalTotal)) return;

    setIsLoading(true);
    try {
      const dbItems: any[] = [];
      cart.forEach(item => {
        if (item.type === 'satuan') {
          dbItems.push({ product_id: item.varianId, quantity: item.qty, unit_price: item.harga,
            subtotal: item.harga * item.qty, tipe_produk: item.tipe_produk, base_product_id: item.base_product_id });
        } else if (item.type === 'paket') {
          dbItems.push({ product_id: item.paketId, quantity: 1, unit_price: item.hargaPaket, subtotal: item.hargaPaket, tipe_produk: 'paket' });
        } else if (item.type === 'bundling') {
          dbItems.push({ product_id: item.bundlingId, quantity: 1, unit_price: item.harga, subtotal: item.harga, tipe_produk: 'bundling' });
        } else if (item.type === 'custom') {
          dbItems.push({ product_id: item.customPaketId, quantity: 1, unit_price: item.totalHarga, subtotal: item.totalHarga, tipe_produk: 'custom' });
          item.tambahan.forEach(t => { dbItems.push({ product_id: t.id, quantity: t.qty, unit_price: t.harga / t.qty, subtotal: t.harga, tipe_produk: 'tambahan' }); });
        }
      });

      const result = await db.createOrder({
        outlet_id: outlet.id, customer_name: namaPelanggan.trim() || 'Umum',
        total_amount: finalTotal, payment_method: paymentMethod, channel: selectedChannel,
        paid_amount: bayar, change_amount: paymentMethod === 'cash' ? bayar - finalTotal : 0,
        kasir_name: cashier.name,
        kasir_id: cashier.id,
      }, [...dbItems, ...selectedBiayaEkstra.map(e => ({ product_id: e.id, quantity: 1, unit_price: e.harga, subtotal: e.harga, tipe_produk: 'biaya_ekstra' }))], outlet.id);

      if (result.success) {
        const metodePretty: Record<string, string> = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', gopay: 'GoPay', ovo: 'OVO', dana: 'Dana', shopeepay: 'ShopeePay', card: 'Kartu' };

        // Gunakan waktu dari database order (created_at) untuk akurasi
        let waktuStruk = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
        if (result.data?.created_at) {
          waktuStruk = new Date(result.data.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
        }

        setStrukData({
          items: [...cart], biayaEkstra: [...selectedBiayaEkstra], totalCart: grandTotal,
          totalBiaya: totalBiayaEkstra, finalTotal, bayar, kembalian: paymentMethod === 'cash' ? bayar - finalTotal : 0,
          waktu: waktuStruk,
          noTrx: result.data?.id ? `TRX-${result.data.id.slice(-6).toUpperCase()}` : `TRX-${Date.now()}`,
          nama: namaPelanggan.trim() || 'Umum', metodeBayar: metodePretty[paymentMethod] || paymentMethod,
          metodeBayarRaw: paymentMethod,
          kasirName: cashier?.name || 'Kasir',
          receiptSettings,
        });
        setShowBayar(false); setShowStruk(true); setCart([]); setSelectedBiayaEkstra([]);
        setBayarNominal(''); setNamaPelanggan(''); setPaymentMethod('cash');
      } else { alert('Gagal: ' + result.error); }
    } catch (err) { console.error(err); alert('Error saat bayar.'); }
    finally { setIsLoading(false); }
  };

  // ═══ JENIS GROUPS ═══
  const jenisGroups = useMemo(() => {
    return categories.map(cat => ({
      ...cat, varian: products.filter(p => p.category_id === cat.id && p.tipe_produk === 'donat_varian' && p.ukuran === ukuranFilter)
    })).filter(g => g.varian.length > 0);
  }, [categories, products, ukuranFilter]);

  return {
    // State
    outlet, outletList, showOutletPicker, setShowOutletPicker, selectedChannel, setSelectedChannel,
    products, categories, paketList, bundlingList, customList, tambahanList, biayaEkstraList,
    channelPrices, isLoading, cart, showCart, setShowCart, activeSection, setActiveSection,
    ukuranFilter, setUkuranFilter, showBayar, setShowBayar, bayarNominal, setBayarNominal,
    namaPelanggan, setNamaPelanggan, paymentMethod, setPaymentMethod, selectedBiayaEkstra,
    setSelectedBiayaEkstra, showStruk, setShowStruk, strukData, paketModal, setPaketModal,
    paketIsi, setPaketIsi, customStep, setCustomStep, selectedCustomPaket, setSelectedCustomPaket,
    customJenisMode, setCustomJenisMode, customIsi, setCustomIsi, customTambahan, setCustomTambahan,
    customTulisan, setCustomTulisan, cashier, cashierList, showCashierModal, setShowCashierModal,
    // Computed
    grandTotal, totalBiayaEkstra, finalTotal, jenisGroups,
    // Actions
    pilihOutlet, pilihCashier, tambahSatuan, updateQty, hapusItem, getCartQty, getCartSatuanId,
    bukaPaketModal, konfirmasiPaket, tambahBundling, konfirmasiCustom, prosesBayar,
    formatRp, getDisplayPrice, resetCustomFlow,
  };
}
