'use client';

import { useState, useMemo, useEffect } from 'react';
import * as db from '@/lib/db';
import { getActiveKasirMenus } from '@/lib/db/kasir-menus';
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
  KasirMenu,
  ProductBox,
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
  kode?: string;           // Kode singkat paket, e.g. "REG3"
  kapasitas: number;
  hargaPaket: number;      // Harga setelah diskon, sesuai channel
  hargaNormal: number;     // Total eceran (untuk tampilkan hemat)
  diskon: number;          // Nominal diskon yang berlaku
  isiDonat: { productId: string; nama: string; ukuran?: string; base_product_id?: string | null }[]; // Detail donat dipilih
  boxNama?: string;        // Nama box kemasan
  extras?: { productId: string; nama: string; qty: number; harga: number }[];
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

export interface CartBoxItem {
  type: 'box';
  id: string;
  boxId: string;
  nama: string;
  harga: number;
  qty: number;
}

export type CartItem = CartSatuanItem | CartPaketItem | CartBundlingItem | CartCustomItem | CartBoxItem;

export type ActiveSection = 'donat' | 'paket' | 'bundling' | 'custom' | 'box';

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
  const [boxList, setBoxList] = useState<ProductBox[]>([]);
  const [channelPrices, setChannelPrices] = useState<OutletChannelPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kasirMenus, setKasirMenus] = useState<KasirMenu[]>([]);

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
  const [paketIsi, setPaketIsi] = useState<{ productId: string; nama: string; ukuran?: string }[]>([]);
  const [paketExtras, setPaketExtras] = useState<{ productId: string; nama: string; qty: number; harga: number }[]>([]);

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
      // Seketika hapus setting lama saat outlet berubah agar tidak bocor
      setReceiptSettings(null);

      try {
        const [prods, cats, pkgs, bunds, custs, adds, ekstra, bx, prices, rs, employees, kMenus] = await Promise.all([
          db.getProductsWithCategory(), db.getProductCategories(), db.getProductPackages(),
          db.getProductBundlings(), db.getProductCustomTemplates(), db.getProductsByTipe('tambahan'),
          db.getProductsByTipe('biaya_ekstra'), db.getBoxes(), db.getChannelPrices(outlet.id, selectedChannel),
          db.getReceiptSettings?.(outlet.id), db.getUsersDetailed(outlet.id),
          getActiveKasirMenus(outlet.id)
        ]);
        setProducts(prods); setCategories(cats); setPaketList(pkgs); setBundlingList(bunds);
        setCustomList(custs); setTambahanList(adds); setBiayaEkstraList(ekstra.filter(e => e.is_active));
        setBoxList(bx); setChannelPrices(prices); setCashierList(employees.filter(e => e.is_active));
        setKasirMenus(kMenus);
        
        // Selalu set (baik ada data maupun null) untuk menjamin isolasi data antar outlet
        setReceiptSettings(rs || null);
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
    if (item.type === 'box') return sum + (item.harga * item.qty);
    return sum;
  }, 0), [cart]);

  const totalBiayaEkstra = useMemo(() => selectedBiayaEkstra.reduce((s, i) => s + i.harga, 0), [selectedBiayaEkstra]);
  const finalTotal = grandTotal + totalBiayaEkstra;

  // ═══ AUTO PACKER (SMART BOX CALCULATION) ═══
  // Menghitung kemasan secara otomatis untuk produk satuan
  const automatedBoxes = useMemo(() => {
    const list: { box: ProductBox; qty: number; totalCapacity: number; target: string; used: number }[] = [];
    
    // Kelompokkan semua produk satuan berdasarkan kategori (contoh: standar, mini, dll)
    // Di aplikasi saat ini, kita bisa menggunakan "ukuran" dari produk
    const groupedSatuan: Record<string, number> = {};
    
    cart.filter(c => c.type === 'satuan').forEach(c => {
      const p = products.find(prod => prod.id === (c as CartSatuanItem).varianId);
      if (p) {
        // Ambil peruntukan dari ukuran, jika tidak ada asumsikan 'standar'
        const target = p.ukuran === 'mini' ? 'mini' : 'standar';
        groupedSatuan[target] = (groupedSatuan[target] || 0) + c.qty;
      }
    });

    // Proses packing per peruntukan
    for (const target of Object.keys(groupedSatuan)) {
      let remainingQty = groupedSatuan[target];
      if (remainingQty <= 0) continue;

      // Cari kotak yang sesuai peruntukannya atau universal, dan urutkan dari terbesar
      const suitableBoxes = boxList
        .filter(b => b.peruntukan === target || b.peruntukan === 'universal')
        .sort((a, b) => b.kapasitas - a.kapasitas);

      if (suitableBoxes.length === 0) continue; // Tidak ada box yang cocog

      // Auto-Pack algorithm (Greedy approach)
      for (const box of suitableBoxes) {
        if (remainingQty >= box.kapasitas || suitableBoxes.length === 1) {
          const count = Math.floor(remainingQty / box.kapasitas);
          if (count > 0) {
            list.push({ box, qty: count, totalCapacity: count * box.kapasitas, target, used: count * box.kapasitas });
            remainingQty -= count * box.kapasitas;
          }
        }
      }

      // Jika masih ada sisa (contoh: sisa 2 donat, tapi box terkecil kapasitas 3)
      if (remainingQty > 0) {
        // Cari box berkapasitas >= sisa, pilih yang paling kecil
        const bestFitBox = [...suitableBoxes].sort((a, b) => a.kapasitas - b.kapasitas).find(b => b.kapasitas >= remainingQty);
        if (bestFitBox) {
           const exist = list.find(l => l.box.id === bestFitBox.id);
           if (exist) { exist.qty += 1; exist.used += remainingQty; exist.totalCapacity += bestFitBox.kapasitas; }
           else { list.push({ box: bestFitBox, qty: 1, totalCapacity: bestFitBox.kapasitas, target, used: remainingQty }); }
           remainingQty = 0;
        } else if (suitableBoxes.length > 0) {
           // Fallback kalau gak ketemu box yg pas (misal sisanya gede bgt tapi box paling gede tetep dipake)
           const tbox = suitableBoxes[0];
           const exist = list.find(l => l.box.id === tbox.id);
           if (exist) { exist.qty += 1; exist.used += remainingQty; exist.totalCapacity += tbox.kapasitas; }
           else { list.push({ box: tbox, qty: 1, totalCapacity: tbox.kapasitas, target, used: remainingQty }); }
           remainingQty = 0;
        }
      }
    }
    
    // Jangan menghitung box jika user / kasir sudah dengan sengaja memasukkan box tsb secara manual ke keranjang
    // Mencegah double box!
    return list.filter(a => {
      const manualBoxInCart = cart.find(c => c.type === 'box' && c.boxId === a.box.id);
      return !manualBoxInCart;
    });
  }, [cart, products, boxList]);

  // Tambahkan harga dari automated box ke total jika box tsb berbayar
  const automatedBoxTotal = automatedBoxes.reduce((s, a) => s + (a.box.harga_box * a.qty), 0);
  const realFinalTotal = finalTotal + automatedBoxTotal;

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
      if (c.id === id && (c.type === 'satuan' || c.type === 'box')) {
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
  const bukaPaketModal = (p: ProductPackage) => { setPaketModal(p); setPaketIsi([]); setPaketExtras([]); };
  const konfirmasiPaket = () => {
    if (!paketModal) return;
    // Harga sesuai channel aktif, fallback ke harga_paket
    const kanalHarga = (paketModal.channel_prices || {})[selectedChannel] ?? paketModal.harga_paket;
    // Hitung diskon
    const diskon = (paketModal.diskon_nominal || 0) > 0
      ? paketModal.diskon_nominal
      : (paketModal.diskon_persen || 0) > 0
        ? Math.round(kanalHarga * paketModal.diskon_persen / 100)
        : 0;
    const hargaFinal = kanalHarga - diskon;
    // Estimasi harga normal (total eceran seandainya beli satu-satu)
    const hargaNormal = paketIsi.reduce((sum, donat) => {
      const prod = products.find(p => p.id === donat.productId);
      return sum + (prod ? getDisplayPrice(prod) : 0);
    }, 0);
    setCart([...cart, {
      type: 'paket',
      id: `p-${Date.now()}`,
      paketId: paketModal.id,
      namaPaket: paketModal.nama,
      kode: paketModal.kode,
      kapasitas: paketModal.kapasitas,
      hargaPaket: hargaFinal,
      hargaNormal,
      diskon,
      isiDonat: paketIsi,
      boxNama: paketModal.box?.nama,
      extras: paketExtras,
    }]);
    toast.success(`${paketModal.nama} ditambahkan ke keranjang`, { position: 'top-center' });
    setPaketModal(null);
    setPaketIsi([]);
    setPaketExtras([]);
  };

  // ═══ BUNDLING ═══
  const tambahBundling = (b: ProductBundling) => {
    setCart([...cart, { type: 'bundling', id: `b-${Date.now()}`, bundlingId: b.id, nama: b.nama, harga: b.harga_bundling }]);
    toast.success(`Bundling ${b.nama} ditambahkan`, { position: 'top-center' });
  };

  // ═══ MANUAL BOX ═══
  const tambahManualBox = (bx: ProductBox) => {
    const existing = cart.find(c => c.type === 'box' && c.boxId === bx.id) as CartBoxItem | undefined;
    if (existing) {
      setCart(cart.map(c => c.id === existing.id ? { ...c, qty: existing.qty + 1 } : c));
      toast.success(`${bx.nama} +1`, { position: 'top-center' });
    } else {
      setCart([...cart, { type: 'box', id: `bx-${Date.now()}`, boxId: bx.id, nama: bx.nama, harga: bx.harga_box, qty: 1 }]);
      toast.success(`${bx.nama} ditambahkan manual`, { position: 'top-center' });
    }
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
    const bayar = paymentMethod === 'cash' ? parseInt(bayarNominal) : realFinalTotal;
    if (paymentMethod === 'cash' && (!bayar || bayar < realFinalTotal)) return;

    setIsLoading(true);
    try {
      const dbItems: any[] = [];
      cart.forEach(item => {
        if (item.type === 'satuan') {
          dbItems.push({ product_id: item.varianId, quantity: item.qty, unit_price: item.harga,
            subtotal: item.harga * item.qty, tipe_produk: item.tipe_produk, base_product_id: item.base_product_id });
        } else if (item.type === 'paket') {
          // Catat paket sebagai item utama (product_id null karena ID paket bukan dari tabel products)
          dbItems.push({ product_id: null, quantity: 1, unit_price: item.hargaPaket, subtotal: item.hargaPaket, tipe_produk: 'paket' });
          // Catat tiap donat dalam paket secara terpisah untuk tracking stok & laporan
          item.isiDonat.forEach(donat => {
            if (donat.productId) {
              dbItems.push({ product_id: donat.productId, quantity: 1, unit_price: 0, subtotal: 0, tipe_produk: 'donat_varian', base_product_id: donat.base_product_id });
            }
          });
          // Catat ekstra jika ada
          (item.extras || []).forEach(ext => {
            dbItems.push({ product_id: ext.productId, quantity: ext.qty, unit_price: ext.harga, subtotal: ext.harga * ext.qty, tipe_produk: 'tambahan' });
          });
        } else if (item.type === 'bundling') {
          dbItems.push({ product_id: null, quantity: 1, unit_price: item.harga, subtotal: item.harga, tipe_produk: 'bundling' });
        } else if (item.type === 'custom') {
          dbItems.push({ product_id: null, quantity: 1, unit_price: item.totalHarga, subtotal: item.totalHarga, tipe_produk: 'custom' });
          item.tambahan.forEach(t => { dbItems.push({ product_id: t.id, quantity: t.qty, unit_price: t.harga / t.qty, subtotal: t.harga, tipe_produk: 'tambahan' }); });
        } else if (item.type === 'box') {
          // Manual box juga bisa masuk stock pengurangan 
          dbItems.push({ product_id: null, quantity: item.qty, unit_price: item.harga, subtotal: item.harga * item.qty, tipe_produk: 'box' });
        }
      });

      // Tambahkan automated boxes ke database transaction (supaya tercatat stoknya nanti keluar)
      automatedBoxes.forEach(a => {
        dbItems.push({ product_id: null, quantity: a.qty, unit_price: a.box.harga_box, subtotal: a.box.harga_box * a.qty, tipe_produk: 'box' });
      });

      const result = await db.createOrder({
        outlet_id: outlet.id, customer_name: namaPelanggan.trim() || 'Umum',
        total_amount: realFinalTotal, payment_method: paymentMethod, channel: selectedChannel,
        paid_amount: bayar, change_amount: paymentMethod === 'cash' ? bayar - realFinalTotal : 0,
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
          items: [...cart], 
          biayaEkstra: [...selectedBiayaEkstra], 
          automatedBoxes: [...automatedBoxes],
          totalCart: grandTotal,
          totalBiaya: totalBiayaEkstra, 
          automatedBoxTotal,
          finalTotal: realFinalTotal, 
          bayar, 
          kembalian: paymentMethod === 'cash' ? bayar - realFinalTotal : 0,
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
    }));
  }, [categories, products, ukuranFilter]);

  return {
    // State
    outlet, outletList, showOutletPicker, setShowOutletPicker, selectedChannel, setSelectedChannel,
    products, categories, paketList, bundlingList, customList, tambahanList, biayaEkstraList, boxList,
    channelPrices, isLoading, kasirMenus, cart, showCart, setShowCart, activeSection, setActiveSection,
    ukuranFilter, setUkuranFilter, showBayar, setShowBayar, bayarNominal, setBayarNominal,
    namaPelanggan, setNamaPelanggan, paymentMethod, setPaymentMethod, selectedBiayaEkstra,
    setSelectedBiayaEkstra, showStruk, setShowStruk, strukData, paketModal, setPaketModal,
    paketIsi, setPaketIsi, paketExtras, setPaketExtras, customStep, setCustomStep, selectedCustomPaket, setSelectedCustomPaket,
    customJenisMode, setCustomJenisMode, customIsi, setCustomIsi, customTambahan, setCustomTambahan,
    customTulisan, setCustomTulisan, cashier, cashierList, showCashierModal, setShowCashierModal,
    automatedBoxes,
    automatedBoxTotal,
    // Computed
    grandTotal, totalBiayaEkstra, finalTotal: realFinalTotal, jenisGroups,
    // Actions
    pilihOutlet, pilihCashier, tambahSatuan, updateQty, hapusItem, getCartQty, getCartSatuanId,
    bukaPaketModal, konfirmasiPaket, tambahBundling, tambahManualBox, konfirmasiCustom, prosesBayar,
    formatRp, getDisplayPrice, resetCustomFlow,
  };
}
