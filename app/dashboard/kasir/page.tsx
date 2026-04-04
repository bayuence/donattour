'use client';

import { useState, useMemo, useEffect } from 'react';
import * as Icons from 'lucide-react';
import * as db from '@/lib/db';
import type { 
  Outlet, 
  ProductWithCategory, 
  ProductPackage, 
  ProductBundling, 
  ProductCustomTemplate, 
  Product,
  ChannelType,
  OutletChannelPrice,
  ProductCategory
} from '@/lib/types';

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
  tipe_produk?: string;
  base_product_id?: string | null;
}

interface CartPaketItem {
  type: 'paket';
  id: string;
  paketId: string;
  namaPaket: string;
  kapasitas: number;
  hargaPaket: number;
  isiDonat: string[];
}

interface CartBundlingItem {
  type: 'bundling';
  id: string;
  bundlingId: string;
  nama: string;
  harga: number;
}

interface CartCustomItem {
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

type CartItem = CartSatuanItem | CartPaketItem | CartBundlingItem | CartCustomItem;

// ═══════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════

export default function PosPage() {
  // ═══ Outlet & Channel State ═══
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [outletList, setOutletList] = useState<Outlet[]>([]);
  const [showOutletPicker, setShowOutletPicker] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>('toko');

  // ═══ Product Data State ═══
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [paketList, setPaketList] = useState<ProductPackage[]>([]);
  const [bundlingList, setBundlingList] = useState<ProductBundling[]>([]);
  const [customList, setCustomList] = useState<ProductCustomTemplate[]>([]);
  const [tambahanList, setTambahanList] = useState<Product[]>([]);
  const [channelPrices, setChannelPrices] = useState<OutletChannelPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ═══ Cart & UI State ═══
  const [cart, setCart] = useState<CartItem[]>([]);

  // Paket flow
  const [paketModal, setPaketModal] = useState<ProductPackage | null>(null);
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

  // ═══ INITIAL LOAD: OUTLETS ═══
  useEffect(() => {
    db.getActiveOutlets().then(setOutletList);
    try {
      const saved = localStorage.getItem('kasir_outlet');
      if (saved) setOutlet(JSON.parse(saved));
      else setShowOutletPicker(true);
    } catch {
      setShowOutletPicker(true);
    }
  }, []);

  // ═══ SYNC DATA: PRODUCTS & PRICES ═══
  useEffect(() => {
    async function loadData() {
      if (!outlet) return;
      setIsLoading(true);
      try {
        const [
          prods, 
          cats, 
          pkgs, 
          bunds, 
          custs, 
          adds, 
          prices
        ] = await Promise.all([
          db.getProductsWithCategory(),
          db.getProductCategories(),
          db.getProductPackages(),
          db.getProductBundlings(),
          db.getProductCustomTemplates(),
          db.getProductsByTipe('tambahan'),
          db.getChannelPrices(outlet.id, selectedChannel)
        ]);

        setProducts(prods);
        setCategories(cats);
        setPaketList(pkgs);
        setBundlingList(bunds);
        setCustomList(custs);
        setTambahanList(adds);
        setChannelPrices(prices);
      } catch (err) {
        console.error('Failed to load POS data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [outlet, selectedChannel]);

  // Handle outlet selection
  const pilihOutlet = (o: Outlet) => {
    setOutlet(o);
    localStorage.setItem('kasir_outlet', JSON.stringify(o));
    setShowOutletPicker(false);
    setCart([]); // Reset cart when outlet changes
  };

  // ═══ HELPERS ═══
  const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID');

  const getDisplayPrice = (p: ProductWithCategory) => {
    const cp = channelPrices.find((c) => c.product_id === p.id);
    return cp ? cp.harga_jual : p.harga_jual;
  };

  // Groups
  const jenisGroups = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      varian: products.filter(p => p.category_id === cat.id && p.tipe_produk === 'donat_varian')
    })).filter(g => g.varian.length > 0);
  }, [categories, products]);

  const grandTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      if (item.type === 'satuan') return sum + (item.harga * item.qty);
      if (item.type === 'paket') return sum + item.hargaPaket;
      if (item.type === 'bundling') return sum + item.harga;
      if (item.type === 'custom') return sum + item.totalHarga;
      return sum;
    }, 0);
  }, [cart]);

  // ═══ CART: TAMBAH SATUAN ═══
  const tambahSatuan = (p: ProductWithCategory) => {
    const harga = getDisplayPrice(p);
    const existing = cart.find((c) => c.type === 'satuan' && c.varianId === p.id) as CartSatuanItem | undefined;

    if (existing) {
      setCart(cart.map((c) => (c.id === existing.id ? { ...c, qty: existing.qty + 1 } : c)));
    } else {
      setCart([...cart, {
        type: 'satuan',
        id: `satuan-${Date.now()}`,
        varianId: p.id,
        nama: p.nama,
        jenis: p.category?.nama || 'Donat',
        harga,
        qty: 1,
        tipe_produk: p.tipe_produk,
        base_product_id: p.base_product_id
      }]);
    }
  };

  // ═══ CART: PAKET FLOW ═══
  const bukaPaketModal = (p: ProductPackage) => {
    setPaketModal(p);
    setPaketIsi(Array(p.kapasitas).fill(''));
  };

  const konfirmasiPaket = () => {
    if (!paketModal) return;
    setCart([...cart, {
      type: 'paket',
      id: `paket-${Date.now()}`,
      paketId: paketModal.id,
      namaPaket: paketModal.nama,
      kapasitas: paketModal.kapasitas,
      hargaPaket: paketModal.harga_paket,
      isiDonat: paketIsi,
    }]);
    setPaketModal(null);
  };

  // ═══ CART: BUNDLING ═══
  const tambahBundling = (b: ProductBundling) => {
    setCart([...cart, {
      type: 'bundling',
      id: `bund-${Date.now()}`,
      bundlingId: b.id,
      nama: b.nama,
      harga: b.harga_bundling,
    }]);
  };

  // ═══ CART: CUSTOM ═══
  const konfirmasiCustom = () => {
    if (!selectedCustomPaket) return;
    const hargaDonat = customJenisMode === 'campur' 
        ? selectedCustomPaket.harga_satuan_default * selectedCustomPaket.kapasitas
        : (customJenisMode === 'klasik' ? selectedCustomPaket.harga_klasik_full : (customJenisMode === 'reguler' ? selectedCustomPaket.harga_reguler_full : selectedCustomPaket.harga_premium_full)) || 0;
    
    const totalTambahan = customTambahan.reduce((s, t) => s + t.harga, 0);

    setCart([...cart, {
      type: 'custom',
      id: `custom-${Date.now()}`,
      customPaketId: selectedCustomPaket.id,
      namaPaket: selectedCustomPaket.nama,
      kapasitas: selectedCustomPaket.kapasitas,
      ukuranDonat: selectedCustomPaket.ukuran_donat as 'standar' | 'mini',
      jenisMode: customJenisMode,
      isiDonat: customIsi,
      hargaDonat,
      tambahan: customTambahan,
      tulisanCoklat: customTulisan,
      totalHarga: hargaDonat + totalTambahan,
    }]);
    resetCustomFlow();
  };

  // ═══ CART: REMOVE & QTY ═══
  const hapusItem = (id: string) => setCart(cart.filter((c) => c.id !== id));

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map((c) => {
      if (c.id === id && c.type === 'satuan') {
        const newQty = c.qty + delta;
        return newQty <= 0 ? (null as any) : { ...c, qty: newQty };
      }
      return c;
    }).filter(Boolean));
  };

  const getCartQty = (varianId: string): number => {
    const item = cart.find((c) => c.type === 'satuan' && (c as CartSatuanItem).varianId === varianId) as CartSatuanItem | undefined;
    return item?.qty || 0;
  };

  const getCartSatuanId = (varianId: string): string | null => {
    const item = cart.find((c) => c.type === 'satuan' && (c as CartSatuanItem).varianId === varianId) as CartSatuanItem | undefined;
    return item?.id || null;
  };

  // ═══ BAYAR: SAVE TO DB ═══
  const prosesBayar = async () => {
    if (!outlet) return;
    const bayar = parseInt(bayarNominal);
    if (!bayar || bayar < grandTotal) return;

    setIsLoading(true);
    try {
      const dbItems: any[] = [];
      cart.forEach(item => {
        if (item.type === 'satuan') {
          dbItems.push({
            product_id: item.varianId,
            quantity: item.qty,
            unit_price: item.harga,
            subtotal: item.harga * item.qty,
            tipe_produk: item.tipe_produk,
            base_product_id: item.base_product_id
          });
        } else if (item.type === 'paket') {
          dbItems.push({ product_id: item.paketId, quantity: 1, unit_price: item.hargaPaket, subtotal: item.hargaPaket, tipe_produk: 'paket' });
        } else if (item.type === 'bundling') {
          dbItems.push({ product_id: item.bundlingId, quantity: 1, unit_price: item.harga, subtotal: item.harga, tipe_produk: 'bundling' });
        } else if (item.type === 'custom') {
          dbItems.push({ product_id: item.customPaketId, quantity: 1, unit_price: item.totalHarga, subtotal: item.totalHarga, tipe_produk: 'custom' });
          item.tambahan.forEach(t => {
            dbItems.push({ product_id: t.id, quantity: t.qty, unit_price: t.harga / t.qty, subtotal: t.harga, tipe_produk: 'tambahan' });
          });
        }
      });

      // Dummy location_id logic (needs refinement for multi-location outlets)
      const locationId = outlet.id; 

      const result = await db.createOrder({
        outlet_id: outlet.id,
        customer_name: namaPelanggan.trim() || 'Umum',
        total_amount: grandTotal,
        payment_method: 'cash',
        channel: selectedChannel
      }, dbItems, locationId);

      if (result.success) {
        setStrukData({
          items: [...cart], total: grandTotal, bayar, kembalian: bayar - grandTotal,
          waktu: new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }),
          noTrx: result.data?.id ? `TRX-${result.data.id.slice(-6).toUpperCase()}` : `TRX-${Date.now()}`,
          nama: namaPelanggan.trim() || 'Umum',
        });
        setShowBayar(false);
        setShowStruk(true);
        setCart([]);
        setBayarNominal('');
        setNamaPelanggan('');
      } else {
        alert('Gagal: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      alert('Error saat bayar.');
    } finally {
      setIsLoading(false);
    }
  };

  const jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // ═══ RENDER: OUTLET PICKER ═══
  if (!outlet || showOutletPicker) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 border border-white">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-4">
              <Icons.Store size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-800">Pilih Outlet</h1>
            <p className="text-slate-400 mt-2">Selamat datang! Silakan pilih tempat bertugas.</p>
          </div>
          <div className="space-y-3">
            {outletList.map((o) => (
              <button key={o.id} onClick={() => pilihOutlet(o)}
                className="w-full group flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-amber-400 hover:bg-amber-50 transition-all text-left">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-amber-500 shadow-sm">
                  <Icons.MapPin size={24} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{o.nama}</p>
                  <p className="text-xs text-slate-400 truncate">{o.alamat}</p>
                </div>
                <Icons.ChevronRight className="text-slate-300 group-hover:text-amber-500" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ═══ RENDER: MAIN POS ═══
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-slate-50 overflow-hidden">
      
      {/* HEADER */}
      <div className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
            <Icons.Store size={24} />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-800 leading-tight">{outlet.nama}</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{jam} • Mode Kasir</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          {(['toko', 'online'] as const).map(c => (
            <button key={c} onClick={() => setSelectedChannel(c)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-tight ${selectedChannel === c ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowOutletPicker(true)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg">
            <Icons.RefreshCw size={20} />
          </button>
          <button onClick={() => setShowCart(true)} className="relative p-2 bg-slate-900 text-white rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-slate-900/10">
            <Icons.ShoppingCart size={20} />
            {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white font-bold">{cart.length}</span>}
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="px-6 py-2 bg-white flex gap-2 border-b overflow-x-auto shrink-0 no-scrollbar">
        {([
            { id: 'donat', label: 'Varian Satuan', icon: Icons.CircleDot },
            { id: 'paket', label: 'Paket Hemat', icon: Icons.Box },
            { id: 'bundling', label: 'Promo Bundling', icon: Icons.Gift },
            { id: 'custom', label: 'Custom Order', icon: Icons.Palette },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeSection === tab.id ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:bg-slate-50'}`}>
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* DONAT SECTION */}
          {activeSection === 'donat' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <Icons.Loader2 className="animate-spin mb-4" size={40} />
                    <p className="font-bold">Memuat Menu...</p>
                  </div>
               ) : (
                  jenisGroups.map(group => (
                    <div key={group.id} className="mb-8">
                      <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">{group.nama}</h2>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {group.varian.map(v => {
                          const qty = getCartQty(v.id);
                          const price = getDisplayPrice(v);
                          return (
                            <div key={v.id} onClick={() => tambahSatuan(v)}
                              className="group relative flex flex-col bg-white rounded-3xl p-3 border border-slate-100 hover:border-amber-200 hover:shadow-xl transition-all text-left overflow-hidden cursor-pointer">
                               <div className="aspect-square rounded-2xl bg-slate-50 mb-3 overflow-hidden flex items-center justify-center">
                                  {v.image_url ? <img src={v.image_url} alt={v.nama} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <Icons.Circle size={32} className="text-slate-200" />}
                               </div>
                               <h3 className="font-bold text-slate-800 text-xs line-clamp-1 mb-1">{v.nama}</h3>
                               <p className="text-amber-600 font-black text-sm">{formatRp(price)}</p>
                               {qty > 0 && (
                                 <div className="absolute top-2 right-2 flex items-center gap-1.5 p-1 bg-white/90 backdrop-blur rounded-full shadow-lg border">
                                    <button onClick={(e) => { e.stopPropagation(); updateQty(getCartSatuanId(v.id)!, -1); }} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                                      <Icons.Minus size={12} />
                                    </button>
                                    <span className="text-[10px] font-black w-3 text-center">{qty}</span>
                                    <button onClick={(e) => { e.stopPropagation(); tambahSatuan(v); }} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-colors">
                                      <Icons.Plus size={12} />
                                    </button>
                                 </div>
                               )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
               )}
            </div>
          )}

          {/* PAKET SECTION */}
          {activeSection === 'paket' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paketList.map(pkt => (
                <button key={pkt.id} onClick={() => bukaPaketModal(pkt)}
                  className="group relative bg-white p-6 rounded-3xl border border-slate-100 hover:border-amber-200 hover:shadow-2xl transition-all text-left overflow-hidden">
                  <div className="relative z-10">
                    <div className="p-3 w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mb-4 group-hover:bg-amber-500 group-hover:text-white transition-all">
                      <Icons.Package size={24} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 mb-1">{pkt.nama}</h3>
                    <p className="text-slate-400 text-xs mb-6 uppercase tracking-wider font-bold">Kapasitas {pkt.kapasitas} Varian</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-amber-600">{formatRp(pkt.harga_paket)}</span>
                      <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-amber-600 transition-colors">Atur Isi</div>
                    </div>
                  </div>
                  <Icons.Package size={120} className="absolute -bottom-10 -right-10 text-slate-50 group-hover:text-amber-50 group-hover:rotate-12 transition-all" />
                </button>
              ))}
            </div>
          )}

          {/* CUSTOM SECTION */}
          {activeSection === 'custom' && (
            <div className="max-w-4xl mx-auto w-full bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/40">
              <div className="bg-slate-900 p-6 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <Icons.Palette className="text-amber-500" size={24} />
                   <h2 className="text-white font-black text-lg">Custom Order Builder</h2>
                 </div>
                 <div className="flex gap-2">
                    {['pilih-paket', 'pilih-jenis', 'pilih-rasa', 'tambahan'].map((s, i) => (
                      <div key={s} className={`w-3 h-3 rounded-full ${customStep === s ? 'bg-amber-500' : 'bg-slate-700'}`} />
                    ))}
                 </div>
              </div>

              <div className="p-8">
                 {customStep === 'pilih-paket' && (
                   <div className="animate-in fade-in zoom-in-95 duration-300">
                      <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-6">Langkah 1: Pilih Ukuran Box</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {customList.map(cp => (
                          <button key={cp.id} onClick={() => { setSelectedCustomPaket(cp); setCustomStep('pilih-jenis'); }}
                            className="p-5 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-amber-400 hover:bg-white transition-all text-left group">
                            <div className="text-3xl mb-4 group-hover:scale-125 transition-transform duration-500">📦</div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 py-1 px-2 bg-amber-50 rounded-lg">{cp.ukuran_donat}</span>
                            <h4 className="text-lg font-black text-slate-800 mt-2">{cp.nama}</h4>
                            <p className="text-slate-400 text-xs mt-1">Isi {cp.kapasitas} pcs Donat</p>
                          </button>
                        ))}
                      </div>
                   </div>
                 )}

                 {customStep === 'pilih-jenis' && selectedCustomPaket && (
                   <div className="animate-in fade-in zoom-in-95 duration-300">
                      <button onClick={() => setCustomStep('pilih-paket')} className="flex items-center gap-2 text-slate-400 text-[10px] uppercase font-black tracking-widest mb-6 hover:text-slate-800">
                        <Icons.ArrowLeft size={14} /> Kembali
                      </button>
                      <h3 className="text-xl font-black text-slate-800 mb-6">Pilih Gaya Isian</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { id: 'campur', label: 'Mix & Match', desc: 'Bebas campur semua kategori rasa', price: selectedCustomPaket.harga_satuan_default * selectedCustomPaket.kapasitas },
                          { id: 'klasik', label: 'Full Klasik', desc: 'Hanya varian klasik (Ekstra hemat)', price: selectedCustomPaket.harga_klasik_full },
                          { id: 'reguler', label: 'Full Reguler', desc: 'Hanya varian reguler favorit', price: selectedCustomPaket.harga_reguler_full },
                          { id: 'premium', label: 'Full Premium', desc: 'Hanya varian premium mewah', price: selectedCustomPaket.harga_premium_full },
                        ].map(m => (
                          <button key={m.id} disabled={!m.price} onClick={() => { setCustomJenisMode(m.id as any); setCustomIsi(Array(selectedCustomPaket.kapasitas).fill('')); setCustomStep('pilih-rasa'); }}
                            className={`flex justify-between items-center p-5 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-amber-400 hover:bg-white transition-all text-left group ${!m.price ? 'opacity-30' : ''}`}>
                            <div>
                               <h4 className="font-black text-slate-800 group-hover:text-amber-600 transition-colors">{m.label}</h4>
                               <p className="text-xs text-slate-400 mt-1">{m.desc}</p>
                            </div>
                            <span className="text-lg font-black text-slate-900">{formatRp(m.price || 0)}</span>
                          </button>
                        ))}
                      </div>
                   </div>
                 )}

                 {customStep === 'pilih-rasa' && selectedCustomPaket && (
                   <div className="animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => setCustomStep('pilih-jenis')} className="p-2 bg-slate-100 rounded-lg"><Icons.ArrowLeft size={16} /></button>
                        <div className="flex-1">
                          <h3 className="font-black text-slate-800">Isi Slot Donat</h3>
                          <p className="text-[10px] uppercase font-bold text-slate-400">{selectedCustomPaket.nama} • Mode {customJenisMode}</p>
                        </div>
                        <span className="text-lg font-black text-amber-600">{customIsi.filter(x => x).length} / {selectedCustomPaket.kapasitas}</span>
                      </div>

                      <div className="flex gap-8">
                         <div className="flex-1 space-y-2">
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Pilihan Rasa Terasedia</p>
                           <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[300px] pr-2">
                              {products.filter(v => v.tipe_produk === 'donat_varian' && (customJenisMode === 'campur' || v.category?.nama?.toLowerCase() === customJenisMode)).map(v => (
                                <button key={v.id} onClick={() => {
                                  const next = customIsi.findIndex(x => !x);
                                  if (next !== -1) {
                                    const nextIsi = [...customIsi]; nextIsi[next] = v.nama; setCustomIsi(nextIsi);
                                  }
                                }}
                                className="p-2 bg-slate-50 border border-slate-100 rounded-xl hover:border-amber-400 hover:bg-amber-50 text-[10px] font-bold text-slate-700 text-center transition-all truncate">
                                  {v.nama}
                                </button>
                              ))}
                           </div>
                         </div>
                         <div className="w-48 bg-slate-50 rounded-2xl p-4 self-start border">
                             <p className="text-[10px] font-black uppercase text-slate-400 mb-4 text-center">Isi Box</p>
                             <div className="grid grid-cols-3 gap-2">
                               {customIsi.map((v, i) => (
                                 <button key={i} onClick={() => { if(v) { const next = [...customIsi]; next[i] = ''; setCustomIsi(next); } }}
                                   className={`aspect-square rounded-lg border-2 flex items-center justify-center ${v ? 'bg-amber-400 border-amber-500 text-white' : 'bg-white border-slate-200'}`}>
                                    {v ? <Icons.Check size={12} /> : <span className="text-[8px] text-slate-300">{i+1}</span>}
                                 </button>
                               ))}
                             </div>
                             <button disabled={customIsi.some(x => !x)} onClick={() => setCustomStep('tambahan')}
                               className="w-full mt-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 hover:bg-amber-600 transition-colors">
                               Berikutnya
                             </button>
                         </div>
                      </div>
                   </div>
                 )}

                 {customStep === 'tambahan' && selectedCustomPaket && (
                   <div className="animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => setCustomStep('pilih-rasa')} className="p-2 bg-slate-100 rounded-lg"><Icons.ArrowLeft size={16} /></button>
                        <h3 className="font-black text-slate-800">Finalisasi</h3>
                        <button onClick={konfirmasiCustom} className="ml-auto px-6 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all">Selesaikan & Tambah</button>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                         <div>
                           <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Tambahan Topping / Hiasan</p>
                           <div className="space-y-2">
                             {tambahanList.map(t => {
                               const qty = customTambahan.find(x => x.id === t.id)?.qty || 0;
                               return (
                                 <div key={t.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex-1">
                                      <p className="text-xs font-bold text-slate-800">{t.nama}</p>
                                      <p className="text-[10px] text-amber-600 font-bold">{formatRp(t.harga_jual)}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <button onClick={() => {
                                         const next = [...customTambahan];
                                         const idx = next.findIndex(x => x.id === t.id);
                                         if (idx !== -1) {
                                           if (next[idx].qty > 1) { next[idx].qty--; next[idx].harga = t.harga_jual * next[idx].qty; }
                                           else next.splice(idx, 1);
                                           setCustomTambahan(next);
                                         }
                                      }} className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-bold">−</button>
                                      <span className="text-xs font-black w-4 text-center">{qty}</span>
                                      <button onClick={() => {
                                         const next = [...customTambahan];
                                         const idx = next.findIndex(x => x.id === t.id);
                                         if (idx === -1) next.push({ id: t.id, nama: t.nama, qty: 1, harga: t.harga_jual });
                                         else { next[idx].qty++; next[idx].harga = t.harga_jual * next[idx].qty; }
                                         setCustomTambahan(next);
                                      }} className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center font-bold">+</button>
                                    </div>
                                 </div>
                               );
                             })}
                           </div>
                         </div>
                         <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">Pesan di Atas Box</p>
                            <textarea value={customTulisan} onChange={(e) => setCustomTulisan(e.target.value)}
                              placeholder="Tulis ucapan di sini (misal: Happy Birthday)..."
                              className="w-full h-40 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs focus:border-amber-400 focus:outline-none transition-all placeholder:text-slate-300 font-medium" />
                         </div>
                      </div>
                   </div>
                 )}
              </div>
            </div>
          )}

        </div>

        {/* CART SIDEBAR - MINI VERSION IF ON MOBILE OR TOGGLED */}
        <div className={`w-[400px] border-l bg-white shrink-0 flex flex-col shadow-2xl transition-all ${showCart ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Icons.ShoppingBag size={20} className="text-slate-800" />
               <h2 className="font-black text-slate-800 uppercase tracking-widest text-sm">Keranjang</h2>
            </div>
            <button onClick={() => setShowCart(false)} className="lg:hidden p-2"><Icons.X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.map(item => (
              <div key={item.id} className="group flex gap-4 animate-in fade-in slide-in-from-right-4">
                 <div className="flex-1">
                    <div className="flex justify-between items-start">
                       <h4 className="text-xs font-black text-slate-800 leading-snug">{item.type === 'satuan' ? item.nama : (item.type === 'paket' ? item.namaPaket : (item.type === 'bundling' ? item.nama : item.namaPaket))}</h4>
                       <button onClick={() => hapusItem(item.id)} className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"><Icons.Trash2 size={12} /></button>
                    </div>
                    
                    {item.type === 'satuan' && <p className="text-[10px] font-bold text-slate-400">{item.jenis}</p>}
                    {item.type === 'paket' && <div className="flex flex-wrap gap-1 mt-1">{item.isiDonat.filter(i => i).map((d, i) => <span key={i} className="text-[8px] px-1 bg-slate-50 border rounded text-slate-500">{d}</span>)}</div>}
                    {item.type === 'custom' && (
                      <div className="mt-1 flex flex-col gap-1">
                        <div className="flex flex-wrap gap-1">
                          {item.isiDonat.filter(i => i).map((d, i) => <span key={i} className="text-[8px] px-1 bg-pink-50 border border-pink-100 rounded text-pink-500">{d}</span>)}
                        </div>
                        {item.tambahan.map(t => (
                          <div key={t.id} className="flex justify-between items-center text-[10px] text-slate-500 italic">
                             <span>+ {t.nama} x{t.qty}</span>
                             <span>{formatRp(t.harga)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                       {item.type === 'satuan' ? (
                         <div className="flex items-center gap-3">
                            <button onClick={() => updateQty(item.id, -1)} className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-xs">−</button>
                            <span className="text-xs font-black">{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-xs">+</button>
                         </div>
                       ) : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.type}</span>}
                       <span className="text-xs font-black text-slate-800">{formatRp(item.type === 'satuan' ? item.harga * item.qty : (item.type === 'paket' ? item.hargaPaket : (item.type === 'bundling' ? item.harga : item.totalHarga)))}</span>
                    </div>
                 </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                <Icons.ShoppingBasket size={48} className="opacity-20 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest opacity-40">Keranjang Kosong</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50 border-t space-y-4">
             <div className="space-y-2">
                <div className="flex justify-between text-slate-500 text-xs font-bold uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span>{formatRp(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-slate-800 text-lg font-black">
                  <span>Total</span>
                  <span className="text-amber-600">{formatRp(grandTotal)}</span>
                </div>
             </div>
             <button disabled={cart.length === 0} onClick={() => setShowBayar(true)}
               className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-amber-600 transition-all active:scale-[0.98] disabled:opacity-20">
               Proses Pembayaran
             </button>
          </div>
        </div>
      </div>

      {/* MODALS: PAKET ISI */}
      {paketModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="bg-amber-500 p-6 flex items-center justify-between">
                 <div className="flex items-center gap-3 text-white">
                    <Icons.Box size={24} />
                    <div>
                      <h3 className="font-black text-lg">Pilih Varian {paketModal.nama}</h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">Isi paket dengan {paketModal.kapasitas} pcs Donat</p>
                    </div>
                 </div>
                 <button onClick={() => setPaketModal(null)} className="p-2 text-white/50 hover:text-white"><Icons.X size={24} /></button>
              </div>
              <div className="p-8 flex gap-8">
                 <div className="flex-1">
                    <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[300px]">
                      {products.filter(v => v.tipe_produk === 'donat_varian').map(v => (
                         <button key={v.id} onClick={() => {
                           const next = paketIsi.findIndex(x => !x);
                           if (next !== -1) {
                             const n = [...paketIsi]; n[next] = v.nama; setPaketIsi(n);
                           }
                         }}
                         className="p-3 bg-slate-50 border rounded-xl hover:border-amber-400 hover:bg-amber-50 text-[10px] font-bold text-slate-800 transition-all">
                           {v.nama}
                         </button>
                      ))}
                    </div>
                 </div>
                 <div className="w-48 bg-slate-50 rounded-2xl p-4 border border-slate-200 shrink-0">
                    <p className="text-[10px] font-black uppercase text-slate-400 text-center mb-4">Isi Paket</p>
                    <div className="grid grid-cols-3 gap-2">
                       {paketIsi.map((v, i) => (
                         <div key={i} className={`aspect-square rounded-lg border-2 flex items-center justify-center ${v ? 'bg-amber-500 border-amber-600' : 'bg-white border-slate-200'}`}>
                           {v ? <Icons.Check size={12} className="text-white" /> : <span className="text-[8px] text-slate-300">{i+1}</span>}
                         </div>
                       ))}
                    </div>
                    <button disabled={paketIsi.some(x => !x)} onClick={konfirmasiPaket}
                      className="w-full mt-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-20">
                      Konfirmasi
                    </button>
                    <button onClick={() => setPaketIsi(Array(paketModal.kapasitas).fill(''))} className="w-full mt-2 text-[10px] font-bold text-slate-400 hover:text-slate-600">Reset</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: BAYAR */}
      {showBayar && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="p-8">
                 <div className="text-center mb-8">
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-1">Tagihan Untuk Pelanggan</p>
                    <h3 className="text-4xl font-black text-amber-600">{formatRp(grandTotal)}</h3>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nama Pelanggan (Opsional)</label>
                       <input type="text" value={namaPelanggan} onChange={e => setNamaPelanggan(e.target.value)} placeholder="Umum"
                         className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-amber-400 focus:outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nominal Bayar (Tunai)</label>
                       <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">Rp</span>
                          <input type="number" value={bayarNominal} onChange={e => setBayarNominal(e.target.value)} autoFocus
                            className="w-full p-4 pl-12 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black focus:border-amber-400 focus:outline-none transition-all" />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-2 mt-4">
                    {[grandTotal, 50000, 100000, 200000].map(v => (
                       <button key={v} onClick={() => setBayarNominal(v.toString())} className="py-3 bg-slate-100 rounded-xl text-xs font-black hover:bg-amber-100 hover:text-amber-700 transition-all">{formatRp(v)}</button>
                    ))}
                 </div>

                 <div className="mt-8 flex gap-4">
                    <button onClick={() => setShowBayar(false)} className="px-6 py-4 bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-200 transition-all">Batal</button>
                    <button disabled={isLoading || !bayarNominal || parseInt(bayarNominal) < grandTotal} onClick={prosesBayar}
                      className="flex-1 py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-slate-900/20 hover:bg-amber-600 transition-all disabled:opacity-20">
                      {isLoading ? 'Memproses...' : 'Selesaikan Pembayaran'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: STRUK */}
      {showStruk && strukData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
           <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 animate-in slide-in-from-bottom-2 duration-500">
              <div className="text-center mb-8">
                 <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icons.CheckCheck size={32} />
                 </div>
                 <h2 className="text-xl font-black text-slate-800">Pembayaran Berhasil!</h2>
                 <p className="text-slate-400 text-xs mt-1">Struk telah siap dicetak.</p>
              </div>

              <div className="border-2 border-dashed border-slate-100 p-6 rounded-2xl font-mono text-[10px] text-slate-600 space-y-1 select-none">
                 <div className="text-center font-bold text-slate-800 mb-4 border-b border-dashed pb-2">
                    <p className="text-lg">DONATTOUR</p>
                    <p className="text-[8px] opacity-50 uppercase tracking-tighter">{outlet.alamat}</p>
                 </div>
                 <div className="flex justify-between"><span>No</span> <span># {strukData.noTrx}</span></div>
                 <div className="flex justify-between"><span>Kasir</span> <span>{strukData.nama}</span></div>
                 <div className="flex justify-between border-b border-dashed pb-1 mb-2"><span>Waktu</span> <span>{strukData.waktu}</span></div>
                 
                 <div className="space-y-2 py-2">
                    {strukData.items.map((it, idx) => (
                      <div key={idx}>
                         <div className="flex justify-between font-bold text-slate-800">
                           <span>{it.type === 'satuan' ? it.nama : (it.type === 'paket' ? it.namaPaket : (it.type === 'bundling' ? it.nama : it.namaPaket))} x{it.type === 'satuan' ? it.qty : 1}</span>
                           <span>{formatRp(it.type === 'satuan' ? it.harga * it.qty : (it.type === 'paket' ? it.hargaPaket : (it.type === 'bundling' ? it.harga : it.totalHarga)))}</span>
                         </div>
                         {it.type === 'paket' && <p className="opacity-60 text-[8px] pl-2 line-clamp-1 italic">{it.isiDonat.filter(i=>i).join(', ')}</p>}
                      </div>
                    ))}
                 </div>

                 <div className="border-t border-dashed pt-2 space-y-1">
                    <div className="flex justify-between"><span>Subtotal</span> <span>{formatRp(strukData.total)}</span></div>
                    <div className="flex justify-between font-bold text-slate-800 text-xs"><span>TOTAL</span> <span>{formatRp(strukData.total)}</span></div>
                    <div className="flex justify-between"><span>Bayar</span> <span>{formatRp(strukData.bayar)}</span></div>
                    <div className="flex justify-between font-bold text-green-600"><span>Kembalian</span> <span>{formatRp(strukData.kembalian)}</span></div>
                 </div>

                 <div className="text-center pt-6 opacity-40 italic">
                    <p>Terima kasih atas kunjungannya!</p>
                    <p>— Donat Selembut Awan —</p>
                 </div>
              </div>

              <div className="mt-8 flex gap-3">
                 <button className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2">
                    <Icons.Printer size={14} /> Cetak Struk
                 </button>
                 <button onClick={() => setShowStruk(false)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all">Selesai</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
