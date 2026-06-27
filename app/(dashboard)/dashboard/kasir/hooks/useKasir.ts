"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import * as db from "@/lib/db";
import { toast } from "sonner";
import {
  cacheProductsOffline,
  cachePaymentMethodsOffline,
  cacheReceiptSettingsOffline,
  cacheOutletsOffline,
  getOfflineProducts,
  getOfflinePaymentMethods,
  getOfflineReceiptSettings
} from '@/lib/offline/offline-dal';
import { supabase } from "@/lib/supabase/client";
import {
  formatRp,
  getDisplayPrice as helperGetDisplayPrice,
  calculateGrandTotal,
  calculateCartHPP,
  calculateAutomatedBoxes,
  calculateAutomatedBoxTotal,
  calculateMaxCartDiscount,
} from './useKasirHelpers';
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
  ProductBox,
  PaymentMethodConfig,
  User,
} from "@/lib/types";
import type {
  CartItem,
  CartSatuanItem,
  CartBoxItem,
  ActiveSection,
} from './useKasirTypes';

// ═══════════════════════════════════════════════════
// CART TYPES
// ═══════════════════════════════════════════════════

export type { CartItem, CartSatuanItem, CartBoxItem, ActiveSection } from './useKasirTypes';

export function useKasir() {
  // ═══ Race Condition Guard ═══
  const savingOrder = useRef(false);

  // ═══ Outlet & Channel State ═══
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [outletList, setOutletList] = useState<Outlet[]>([]);
  const [showOutletPicker, setShowOutletPicker] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>("toko");

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

  const [paymentMethodsList, setPaymentMethodsList] = useState<
    PaymentMethodConfig[]
  >([]);

  // ═══ Cart & UI ═══
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>("donat");
  const [ukuranFilter, setUkuranFilter] = useState<"standar" | "mini">(
    "standar",
  );

  const [showBayar, setShowBayar] = useState(false);
  const [bayarNominal, setBayarNominal] = useState("");
  const [namaPelanggan, setNamaPelanggan] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [selectedBiayaEkstra, setSelectedBiayaEkstra] = useState<
    { id: string; nama: string; harga: number; qty?: number }[]
  >([]);
  const [cartDiscount, setCartDiscount] = useState(0);
  
  // ═══ Custom/Manual Boxes (Override) ═══
  const [customBoxes, setCustomBoxes] = useState<{ box: ProductBox; qty: number }[]>([]);
  const [isCustomBoxesActive, setIsCustomBoxesActive] = useState<boolean>(false);

  // ═══ Receipt ═══
  const [showStruk, setShowStruk] = useState(false);
  const [strukData, setStrukData] = useState<any>(null);

  // ═══ Paket Modal ═══
  const [paketModal, setPaketModal] = useState<ProductPackage | null>(null);
  const [paketIsi, setPaketIsi] = useState<
    { productId: string; nama: string; ukuran?: string }[]
  >([]);
  const [paketExtras, setPaketExtras] = useState<
    { productId: string; nama: string; qty: number; harga: number }[]
  >([]);

  // ═══ Paket Inline Selection (NEW - Grid Flow) ═══
  const [selectedPaketForInline, setSelectedPaketForInline] =
    useState<ProductPackage | null>(null);
  const [paketInlineIsi, setPaketInlineIsi] = useState<
    { productId: string; nama: string; ukuran?: string }[]
  >([]);
  const [paketInlineExtras, setPaketInlineExtras] = useState<
    { productId: string; nama: string; qty: number; harga: number }[]
  >([]);

  const resetPaketInlineFlow = () => {
    setSelectedPaketForInline(null);
    setPaketInlineIsi([]);
    setPaketInlineExtras([]);
  };

  // ═══ Custom Flow ═══
  const [customStep, setCustomStep] = useState<
    "pilih-paket" | "pilih-jenis" | "pilih-rasa" | "tulisan" | "tambahan"
  >("pilih-paket");
  const [selectedCustomPaket, setSelectedCustomPaket] =
    useState<ProductCustomTemplate | null>(null);
  const [customJenisMode, setCustomJenisMode] = useState<string>("campur");
  const [customModeLabel, setCustomModeLabel] = useState<string>("");
  const [customIsi, setCustomIsi] = useState<
    { productId: string; nama: string }[]
  >([]);
  const [customTambahan, setCustomTambahan] = useState<
    { id: string; nama: string; qty: number; harga: number }[]
  >([]);
  const [customTulisan, setCustomTulisan] = useState("");
  const [customMintaTulisan, setCustomMintaTulisan] = useState(false);
  const [customJumlahPapan, setCustomJumlahPapan] = useState(0);

  const resetCustomFlow = () => {
    setCustomStep("pilih-paket");
    setSelectedCustomPaket(null);
    setCustomJenisMode("campur");
    setCustomModeLabel("");
    setCustomIsi([]);
    setCustomTambahan([]);
    setCustomTulisan("");
    setCustomMintaTulisan(false);
    setCustomJumlahPapan(0);
  };

  // ═══ LOAD OUTLETS ═══
  useEffect(() => {
    db.getActiveOutlets().then(setOutletList);
    try {
      const saved = localStorage.getItem("kasir_outlet");
      if (saved) {
        const parsed = JSON.parse(saved);
        const isLegacyId =
          typeof parsed.id === "string" && parsed.id.startsWith("outlet-");
        if (isLegacyId) {
          localStorage.removeItem("kasir_outlet");
          setShowOutletPicker(true);
        } else {
          setOutlet(parsed);
        }
      } else {
        setShowOutletPicker(true);
      }

      const savedCashier = localStorage.getItem("kasir_user");
      if (savedCashier) setCashier(JSON.parse(savedCashier));
    } catch {
      setShowOutletPicker(true);
    }
  }, []);

  const [receiptSettings, setReceiptSettings] = useState<any>(null);

  // ═══ LOAD DATA (semua kecuali channel prices) ═══
  useEffect(() => {
    async function loadData() {
      if (!outlet) return;
      setIsLoading(true);
      setReceiptSettings(null);
      
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (isOnline) {
        try {
          const [
            prods,
            cats,
            pkgs,
            bunds,
            custs,
            adds,
            ekstra,
            bx,
            rs,
            employees,
            payments,
            outletPrices,
          ] = await Promise.all([
            db.getProductsWithCategory(),
            db.getProductCategories(),
            db.getProductPackages(),
            db.getProductBundlings(),
            db.getProductCustomTemplates(),
            db.getProductsByTipe("tambahan"),
            db.getProductsByTipe("biaya_ekstra"),
            db.getBoxes(),
            db.getReceiptSettings?.(outlet.id),
            db.getUsersDetailed(outlet.id),
            db.getPaymentMethods(),
            db.getOutletChannelPrices(outlet.id), // ✅ Load status aktif per outlet
          ]);

          // ✅ Filter produk donat_varian: hanya tampilkan yang aktif di outlet ini
          // Jika belum ada override di outlet_channel_prices → ikut is_active master
          const activeProductIds = new Set(
            outletPrices
              .filter((cp: any) => cp.channel === 'toko' && cp.is_active === false)
              .map((cp: any) => cp.product_id)
          );
          const filteredProds = prods.filter((p: ProductWithCategory) => {
            // Jika ada override dan is_active = false → sembunyikan
            return !activeProductIds.has(p.id);
          });

          setProducts(filteredProds);
          setChannelPrices(outletPrices);
          setCategories(cats);
          setPaketList(pkgs);
          setBundlingList(bunds);
          setCustomList(custs);
          setTambahanList(adds);
          setBiayaEkstraList(ekstra.filter((e) => e.is_active));
          setBoxList(bx);
          setReceiptSettings(rs || null);
          setCashierList(employees.filter((e) => e.is_active));
          setPaymentMethodsList(payments);

          // Asynchronously cache catalog items in local PGLite database
          cacheProductsOffline(prods).catch(console.error);
          cachePaymentMethodsOffline(payments).catch(console.error);
          if (rs) cacheReceiptSettingsOffline(rs).catch(console.error);
          
          // Cache outlets list
          db.getOutlets().then((allOutlets) => {
            if (allOutlets) {
              cacheOutletsOffline(allOutlets).catch(console.error);
            }
          }).catch(console.error);
        } catch (err) {
          console.error("Failed to load POS data online, trying offline fallback:", err);
          await loadOfflineData();
        } finally {
          setIsLoading(false);
        }
      } else {
        await loadOfflineData();
        setIsLoading(false);
      }

      async function loadOfflineData() {
        try {
          console.log("📡 [useKasir] Device is offline, loading from local PGLite database");
          const offlineProds = await getOfflineProducts();
          const offlinePayments = await getOfflinePaymentMethods();
          const offlineRS = outlet ? await getOfflineReceiptSettings(outlet.id) : null;

          setProducts(offlineProds || []);
          setPaymentMethodsList(offlinePayments || []);
          setReceiptSettings(offlineRS || null);
          
          // Reset other online lists to prevent stale data UI crashes
          setCategories([]);
          setPaketList([]);
          setBundlingList([]);
          setCustomList([]);
          setTambahanList([]);
          setBiayaEkstraList([]);
          setBoxList([]);
          setChannelPrices([]);
        } catch (offlineErr) {
          console.error("❌ Failed to load offline data from PGLite:", offlineErr);
        }
      }
    }
    loadData();
  }, [outlet]);

  // ═══ LISTEN FOR CATALOG UPDATES (dari tab kelola-produk) ═══
  // Ketika admin update/hapus produk di tab lain, kasir langsung reload data
  useEffect(() => {
    if (!outlet) return;

    let bc: BroadcastChannel | null = null;

    const reloadCatalog = () => {
      console.log('[useKasir] 🔄 Catalog updated signal received — reloading data...');
      // Trigger reload dengan reset outlet ke nilai yang sama
      setOutlet((prev) => prev ? { ...prev } : prev);
    };

    // BroadcastChannel: komunikasi antar tab di browser yang sama
    try {
      bc = new BroadcastChannel('donattour_catalog');
      bc.onmessage = (event) => {
        if (event.data?.type === 'CATALOG_UPDATED') {
          reloadCatalog();
        }
      };
    } catch (_) { /* browser lama */ }

    // localStorage storage event: fallback untuk Safari & cross-tab di domain yang sama
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'catalog_updated_at' && e.newValue) {
        reloadCatalog();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      bc?.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, [outlet]);

  // Helpers are provided by useKasirHelpers. Use bound helpers when needed.

  const pilihOutlet = async (o: Outlet) => {
    setOutlet(o);
    localStorage.setItem("kasir_outlet", JSON.stringify(o));
    setShowOutletPicker(false);
    setCart([]);
    setCustomBoxes([]);
    setIsCustomBoxesActive(false);
    setCashier(null);
    localStorage.removeItem("kasir_user");
    setShowCashierModal(true);
  };

  const pilihCashier = (u: User) => {
    setCashier(u);
    localStorage.setItem("kasir_user", JSON.stringify(u));
    setShowCashierModal(false);
  };

  // ═══ CART TOTALS ═══
  const grandTotal = useMemo(() => calculateGrandTotal(cart), [cart]);

  const totalBiayaEkstra = useMemo(
    () => selectedBiayaEkstra.reduce((s, i) => s + i.harga, 0),
    [selectedBiayaEkstra],
  );

  const cartHPP = useMemo(() => calculateCartHPP(cart, products), [cart, products]);

  const finalTotal = grandTotal + totalBiayaEkstra - cartDiscount;

  // ═══ AUTO PACKER (SMART BOX CALCULATION) ═══
  const systemBoxes = useMemo(
    () => calculateAutomatedBoxes(cart, products, boxList),
    [cart, products, boxList],
  );

  const finalBoxes = useMemo(() => {
    if (isCustomBoxesActive) {
      return customBoxes.map(cb => ({
        box: cb.box,
        qty: cb.qty,
        totalCapacity: cb.qty * cb.box.kapasitas,
        target: cb.box.peruntukan || 'universal',
        used: cb.qty * cb.box.kapasitas,
      }));
    }
    return systemBoxes;
  }, [isCustomBoxesActive, customBoxes, systemBoxes]);

  // Tambahkan harga dari automated box ke total jika box tsb berbayar
  const automatedBoxTotal = useMemo(
    () => calculateAutomatedBoxTotal(finalBoxes),
    [finalBoxes],
  );

  const totalBeforeDiscount = grandTotal + totalBiayaEkstra + automatedBoxTotal;
  const maxCartDiscount = calculateMaxCartDiscount(totalBeforeDiscount, cartHPP);

  useEffect(() => {
    if (cart.length === 0 && cartDiscount !== 0) {
      setCartDiscount(0);
    }
  }, [cart, cartDiscount]);

  useEffect(() => {
    if (cartDiscount > maxCartDiscount) {
      setCartDiscount(maxCartDiscount);
    }
  }, [cartDiscount, maxCartDiscount]);

  const realFinalTotal = finalTotal + automatedBoxTotal;

  // ═══ CART: ADD SATUAN ═══
  const tambahSatuan = (p: ProductWithCategory) => {
    const harga = helperGetDisplayPrice(p, channelPrices);
    const existing = cart.find(
      (c) => c.type === "satuan" && c.varianId === p.id,
    ) as CartSatuanItem | undefined;
    if (existing) {
      setCart(
        cart.map((c) =>
          c.id === existing.id ? { ...c, qty: existing.qty + 1 } : c,
        ),
      );
      toast.success(`${p.nama} +1`, { position: "top-center" });
    } else {
      setCart([
        ...cart,
        {
          type: "satuan",
          id: `s-${Date.now()}`,
          varianId: p.id,
          nama: p.nama,
          jenis: p.category?.nama || "Donat",
          harga,
          qty: 1,
          tipe_produk: p.tipe_produk,
          base_product_id: p.base_product_id,
        },
      ]);
      toast.success(`${p.nama} ditambahkan`, { position: "top-center" });
    }
  };

  // ═══ CART: QTY ═══
  const updateQty = (id: string, delta: number) => {
    setCart(
      cart
        .map((c) => {
          if (c.id === id && (c.type === "satuan" || c.type === "box")) {
            const nq = c.qty + delta;
            return nq <= 0 ? (null as any) : { ...c, qty: nq };
          }
          return c;
        })
        .filter(Boolean),
    );
  };

  const hapusItem = (id: string) => {
    setCart(cart.filter((c) => c.id !== id));
    toast.info("Item dihapus", { position: "top-center" });
  };

  const getCartQty = (varianId: string): number => {
    const item = cart.find(
      (c) => c.type === "satuan" && (c as CartSatuanItem).varianId === varianId,
    ) as CartSatuanItem | undefined;
    return item?.qty || 0;
  };

  const getCartSatuanId = (varianId: string): string | null => {
    const item = cart.find(
      (c) => c.type === "satuan" && (c as CartSatuanItem).varianId === varianId,
    ) as CartSatuanItem | undefined;
    return item?.id || null;
  };

  // ═══ PAKET ═══
  const bukaPaketModal = (p: ProductPackage) => {
    setPaketModal(p);
    setPaketIsi([]);
    setPaketExtras([]);
  };
  const konfirmasiPaket = () => {
    if (!paketModal) return;
    // Harga sesuai channel aktif, fallback ke harga_paket
    const kanalHarga =
      (paketModal.channel_prices || {})[selectedChannel] ??
      paketModal.harga_paket;
    // Hitung diskon
    const diskon =
      (paketModal.diskon_nominal || 0) > 0
        ? paketModal.diskon_nominal
        : (paketModal.diskon_persen || 0) > 0
          ? Math.round((kanalHarga * paketModal.diskon_persen) / 100)
          : 0;
    const hargaFinal = kanalHarga - diskon;
    // Estimasi harga normal (total eceran seandainya beli satu-satu)
    const hargaNormal = paketIsi.reduce((sum, donat) => {
      const prod = products.find((p) => p.id === donat.productId);
      return sum + (prod ? helperGetDisplayPrice(prod, channelPrices) : 0);
    }, 0);
    setCart([
      ...cart,
      {
        type: "paket",
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
      },
    ]);
    toast.success(`${paketModal.nama} ditambahkan ke keranjang`, {
      position: "top-center",
    });
    setPaketModal(null);
  };

  const bukaPaketInline = (p: ProductPackage) => {
    setSelectedPaketForInline(p);
    setPaketInlineIsi([]);
    setPaketInlineExtras([]);
    // Jangan ubah activeSection di sini - tetap di 'paket' untuk show products
  };

  const konfirmasiPaketInline = () => {
    if (!selectedPaketForInline) return;
    // Check kapasitas paket terpenuhi
    if (paketInlineIsi.length !== selectedPaketForInline.kapasitas) {
      toast.error(
        `Pilih ${selectedPaketForInline.kapasitas} produk untuk paket ini`,
        { position: "top-center" },
      );
      return;
    }
    // Harga sesuai channel aktif
    const kanalHarga =
      (selectedPaketForInline.channel_prices || {})[selectedChannel] ??
      selectedPaketForInline.harga_paket;
    // Hitung diskon
    const diskon =
      (selectedPaketForInline.diskon_nominal || 0) > 0
        ? selectedPaketForInline.diskon_nominal
        : (selectedPaketForInline.diskon_persen || 0) > 0
          ? Math.round(
              (kanalHarga * selectedPaketForInline.diskon_persen) / 100,
            )
          : 0;
    const hargaFinal = kanalHarga - diskon;
    // Hitung harga normal (total eceran)
    const hargaNormal = paketInlineIsi.reduce((sum, donat) => {
      const prod = products.find((p) => p.id === donat.productId);
      return sum + (prod ? helperGetDisplayPrice(prod, channelPrices) : 0);
    }, 0);
    setCart([
      ...cart,
      {
        type: "paket",
        id: `p-${Date.now()}`,
        paketId: selectedPaketForInline.id,
        namaPaket: selectedPaketForInline.nama,
        kode: selectedPaketForInline.kode,
        kapasitas: selectedPaketForInline.kapasitas,
        hargaPaket: hargaFinal,
        hargaNormal,
        diskon,
        isiDonat: paketInlineIsi,
        boxNama: selectedPaketForInline.box?.nama,
        extras: paketInlineExtras,
      },
    ]);
    toast.success(`${selectedPaketForInline.nama} ditambahkan ke keranjang`, {
      position: "top-center",
    });
    resetPaketInlineFlow();
  };
  const tambahBundling = (b: ProductBundling) => {
    setCart([
      ...cart,
      {
        type: "bundling",
        id: `b-${Date.now()}`,
        bundlingId: b.id,
        nama: b.nama,
        harga: b.harga_bundling,
      },
    ]);
    toast.success(`Bundling ${b.nama} ditambahkan`, { position: "top-center" });
  };

  // ═══ MANUAL BOX ═══
  const tambahManualBox = (bx: ProductBox) => {
    const existing = cart.find((c) => c.type === "box" && c.boxId === bx.id) as
      | CartBoxItem
      | undefined;
    if (existing) {
      setCart(
        cart.map((c) =>
          c.id === existing.id ? { ...c, qty: existing.qty + 1 } : c,
        ),
      );
      toast.success(`${bx.nama} +1`, { position: "top-center" });
    } else {
      setCart([
        ...cart,
        {
          type: "box",
          id: `bx-${Date.now()}`,
          boxId: bx.id,
          nama: bx.nama,
          harga: bx.harga_box,
          qty: 1,
        },
      ]);
      toast.success(`${bx.nama} ditambahkan manual`, {
        position: "top-center",
      });
    }
  };

  // ═══ CUSTOM ═══
  const konfirmasiCustom = () => {
    if (!selectedCustomPaket) return;
    const hargaBase =
      customJenisMode === "campur"
        ? selectedCustomPaket.harga_satuan_default *
          selectedCustomPaket.kapasitas
        : customJenisMode === "klasik"
          ? selectedCustomPaket.harga_klasik_full
          : customJenisMode === "reguler"
            ? selectedCustomPaket.harga_reguler_full
            : customJenisMode === "premium"
              ? selectedCustomPaket.harga_premium_full
              : customJenisMode === "mix"
                ? selectedCustomPaket.harga_mix ||
                  selectedCustomPaket.harga_satuan_default *
                    selectedCustomPaket.kapasitas
                : customJenisMode === "random"
                  ? selectedCustomPaket.harga_satuan_default *
                    selectedCustomPaket.kapasitas
                  : selectedCustomPaket.harga_satuan_default *
                    selectedCustomPaket.kapasitas;
    const diskonNominal =
      (selectedCustomPaket.diskon_nominal || 0) > 0
        ? selectedCustomPaket.diskon_nominal || 0
        : (selectedCustomPaket.diskon_persen || 0) > 0
          ? Math.round(
              (hargaBase * (selectedCustomPaket.diskon_persen || 0)) / 100,
            )
          : 0;
    const hargaDonat = hargaBase - diskonNominal;
    const totalTambahan = customTambahan.reduce((s, t) => s + t.harga, 0);
    const label = customModeLabel || customJenisMode;
    setCart([
      ...cart,
      {
        type: "custom",
        id: `c-${Date.now()}`,
        customPaketId: selectedCustomPaket.id,
        kode: selectedCustomPaket.kode,
        namaPaket: selectedCustomPaket.nama,
        kapasitas: selectedCustomPaket.kapasitas,
        ukuranDonat: selectedCustomPaket.ukuran_donat as "standar" | "mini",
        jenisMode: customJenisMode,
        modeLabel: label,
        isiDonat: customIsi,
        hargaDonat,
        diskon: diskonNominal,
        mintaTulisan: customMintaTulisan,
        tambahan: customTambahan,
        tulisanCoklat: customMintaTulisan ? customTulisan : "",
        jumlahPapanCoklat: customMintaTulisan ? customJumlahPapan : 0,
        totalHarga: hargaDonat + totalTambahan,
      },
    ]);
    toast.success(
      `${selectedCustomPaket.kode || selectedCustomPaket.nama} ditambahkan ke keranjang`,
      { position: "top-center" },
    );
    resetCustomFlow();
  };

  // ═══ BAYAR ═══
  const prosesBayar = async (methodOverride?: string) => {
    // methodOverride digunakan ketika setState belum sempat update
    const activeMethod = methodOverride || paymentMethod;

    if (!outlet) return;
    if (!cashier) {
      toast.error("Silakan pilih Personil/Kasir terlebih dahulu!", {
        position: "top-center",
      });
      setShowCashierModal(true);
      return;
    }

    // Function will be intercepted by useKasirWithOffline
  };

  // ═══ JENIS GROUPS ═══
  const jenisGroups = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      varian: products.filter(
        (p) =>
          p.category_id === cat.id &&
          p.tipe_produk === "donat_varian" &&
          p.ukuran === ukuranFilter,
      ),
    }));
  }, [categories, products, ukuranFilter]);

  return {
    // State
    outlet,
    outletList,
    showOutletPicker,
    setShowOutletPicker,
    selectedChannel,
    setSelectedChannel,
    products,
    categories,
    paketList,
    bundlingList,
    customList,
    tambahanList,
    biayaEkstraList,
    boxList,
    channelPrices,
    isLoading,
    setIsLoading,
    cart,
    setCart,
    showCart,
    setShowCart,
    activeSection,
    setActiveSection,
    ukuranFilter,
    setUkuranFilter,
    showBayar,
    setShowBayar,
    bayarNominal,
    setBayarNominal,
    namaPelanggan,
    setNamaPelanggan,
    paymentMethod,
    setPaymentMethod,
    selectedBiayaEkstra,
    setSelectedBiayaEkstra,
    showStruk,
    setShowStruk,
    strukData,
    setStrukData,
    paketModal,
    setPaketModal,
    paketIsi,
    setPaketIsi,
    paketExtras,
    setPaketExtras,
    selectedPaketForInline,
    setSelectedPaketForInline,
    paketInlineIsi,
    setPaketInlineIsi,
    paketInlineExtras,
    setPaketInlineExtras,
    customStep,
    setCustomStep,
    selectedCustomPaket,
    setSelectedCustomPaket,
    customJenisMode,
    setCustomJenisMode,
    customModeLabel,
    setCustomModeLabel,
    customIsi,
    setCustomIsi,
    customTambahan,
    setCustomTambahan,
    customTulisan,
    setCustomTulisan,
    customMintaTulisan,
    setCustomMintaTulisan,
    customJumlahPapan,
    setCustomJumlahPapan,
    cashier,
    cashierList,
    showCashierModal,
    setShowCashierModal,
    automatedBoxes: finalBoxes,
    automatedBoxTotal,
    customBoxes,
    setCustomBoxes,
    isCustomBoxesActive,
    setIsCustomBoxesActive,
    receiptSettings,
    paymentMethodsList,
    // Computed
    grandTotal,
    totalBiayaEkstra,
    cartDiscount,
    setCartDiscount,
    cartHPP,
    maxCartDiscount,
    finalTotal: realFinalTotal,
    jenisGroups,
    // Actions
    pilihOutlet,
    pilihCashier,
    tambahSatuan,
    updateQty,
    hapusItem,
    getCartQty,
    getCartSatuanId,
    bukaPaketModal,
    konfirmasiPaket,
    bukaPaketInline,
    konfirmasiPaketInline,
    tambahBundling,
    tambahManualBox,
    konfirmasiCustom,
    prosesBayar,
    formatRp,
    getDisplayPrice: (p: ProductWithCategory) => helperGetDisplayPrice(p, channelPrices),
    resetCustomFlow,
    resetPaketInlineFlow,
  };
}
