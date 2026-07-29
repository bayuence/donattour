"use client";

import { useState, useMemo, useEffect } from "react";
import * as db from "@/lib/db";
import { toast } from "sonner";
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
  User,
} from "@/lib/types";
import {
  formatRp,
  getDisplayPrice as helperGetDisplayPrice,
  calculateGrandTotal,
  calculateCartHPP,
  calculateAutomatedBoxes,
  calculateAutomatedBoxTotal,
  calculateMaxCartDiscount,
} from "@/app/(dashboard)/dashboard/kasir/hooks/useKasirHelpers";
import type {
  CartItem,
  CartSatuanItem,
  CartBoxItem,
  ActiveSection,
} from "@/app/(dashboard)/dashboard/kasir/hooks/useKasirTypes";

export type { CartItem, CartSatuanItem, CartBoxItem, ActiveSection };

export function useTagihan() {
  const [outlet, setOutlet] = useState<Outlet | null>(null);
  const [outletList, setOutletList] = useState<Outlet[]>([]);
  const [showOutletPicker, setShowOutletPicker] = useState(false);
  const [selectedChannel] = useState<ChannelType>("toko");

  const [cashier, setCashier] = useState<User | null>(null);
  const [cashierList, setCashierList] = useState<User[]>([]);
  const [showCashierModal, setShowCashierModal] = useState(false);

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
  const [receiptSettings, setReceiptSettings] = useState<any>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>("donat");
  const [ukuranFilter, setUkuranFilter] = useState<"standar" | "mini">("standar");

  const [showTagihan, setShowTagihan] = useState(false);
  const [tagihanData, setTagihanData] = useState<any>(null);

  const [namaPelanggan, setNamaPelanggan] = useState("");
  const [selectedBiayaEkstra, setSelectedBiayaEkstra] = useState<
    { id: string; nama: string; harga: number; qty?: number }[]
  >([]);
  const [cartDiscount, setCartDiscount] = useState(0);

  const [customBoxes, setCustomBoxes] = useState<{ box: ProductBox; qty: number }[]>([]);
  const [isCustomBoxesActive, setIsCustomBoxesActive] = useState<boolean>(false);

  const [selectedPaketForInline, setSelectedPaketForInline] = useState<ProductPackage | null>(null);
  const [paketInlineIsi, setPaketInlineIsi] = useState<{ productId: string; nama: string; ukuran?: string }[]>([]);
  const [paketInlineExtras, setPaketInlineExtras] = useState<{ productId: string; nama: string; qty: number; harga: number }[]>([]);

  const resetPaketInlineFlow = () => {
    setSelectedPaketForInline(null);
    setPaketInlineIsi([]);
    setPaketInlineExtras([]);
  };

  const [customStep, setCustomStep] = useState<"pilih-paket" | "pilih-jenis" | "pilih-rasa" | "tulisan" | "tambahan">("pilih-paket");
  const [selectedCustomPaket, setSelectedCustomPaket] = useState<ProductCustomTemplate | null>(null);
  const [customJenisMode, setCustomJenisMode] = useState<string>("campur");
  const [customModeLabel, setCustomModeLabel] = useState<string>("");
  const [customIsi, setCustomIsi] = useState<{ productId: string; nama: string }[]>([]);
  const [customTambahan, setCustomTambahan] = useState<{ id: string; nama: string; qty: number; harga: number }[]>([]);
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

  useEffect(() => {
    db.getActiveOutlets().then(setOutletList);
    try {
      const saved = localStorage.getItem("kasir_outlet");
      if (saved) {
        const parsed = JSON.parse(saved);
        setOutlet(parsed);
      } else {
        setShowOutletPicker(true);
      }
      const savedCashier = localStorage.getItem("kasir_user");
      if (savedCashier) setCashier(JSON.parse(savedCashier));
    } catch {
      setShowOutletPicker(true);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!outlet) return;
      setIsLoading(true);
      try {
        const [prods, cats, pkgs, bunds, custs, adds, ekstra, bx, rs, employees, outletPrices] = await Promise.all([
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
          db.getOutletChannelPrices(outlet.id),
        ]);
        const inactiveIds = new Set(
          outletPrices.filter((cp: any) => cp.channel === "toko" && cp.is_active === false).map((cp: any) => cp.product_id)
        );
        setProducts(prods.filter((p: ProductWithCategory) => !inactiveIds.has(p.id)));
        setChannelPrices(outletPrices);
        setCategories(cats);
        setPaketList(pkgs);
        setBundlingList(bunds);
        setCustomList(custs);
        setTambahanList(adds);
        setBiayaEkstraList(ekstra.filter((e: any) => e.is_active));
        setBoxList(bx);
        setReceiptSettings(rs || null);
        setCashierList(employees.filter((e: any) => e.is_active));
      } catch (err) {
        console.error("Tagihan: gagal memuat data:", err);
        toast.error("Gagal memuat data produk");
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [outlet]);

  const pilihOutlet = (o: Outlet) => {
    setOutlet(o);
    localStorage.setItem("kasir_outlet", JSON.stringify(o));
    setShowOutletPicker(false);
    setCart([]);
  };

  const pilihCashier = (u: User) => {
    setCashier(u);
    localStorage.setItem("kasir_user", JSON.stringify(u));
    setShowCashierModal(false);
  };

  const tambahSatuan = (p: ProductWithCategory) => {
    const displayPrice = helperGetDisplayPrice(p, channelPrices);
    setCart((prev) => {
      const existing = prev.find((c) => c.type === "satuan" && (c as CartSatuanItem).varianId === p.id);
      if (existing) {
        return prev.map((c) =>
          c.type === "satuan" && (c as CartSatuanItem).varianId === p.id
            ? { ...c, qty: (c as CartSatuanItem).qty + 1 }
            : c
        );
      }
      const newItem: CartSatuanItem = {
        type: "satuan",
        id: `satuan-${p.id}-${Date.now()}`,
        varianId: p.id,
        nama: p.nama,
        jenis: p.ukuran || "standar",
        harga: displayPrice,
        qty: 1,
        tipe_produk: p.tipe_produk,
        base_product_id: (p as any).base_product_id || null,
      };
      return [...prev, newItem];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          if (item.type === "satuan") {
            const newQty = (item as CartSatuanItem).qty + delta;
            if (newQty <= 0) return null as any;
            return { ...item, qty: newQty };
          }
          if (item.type === "box") {
            const newQty = (item as CartBoxItem).qty + delta;
            if (newQty <= 0) return null as any;
            return { ...item, qty: newQty };
          }
          if (delta < 0) return null as any;
          return item;
        })
        .filter(Boolean)
    );
  };

  const hapusItem = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));

  const tambahBundling = (b: ProductBundling) => {
    setCart((prev) => [
      ...prev,
      { type: "bundling" as const, id: `bundling-${b.id}-${Date.now()}`, bundlingId: b.id, nama: b.nama, harga: b.harga_bundling },
    ]);
  };

  const tambahManualBox = (box: ProductBox) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.type === "box" && (c as CartBoxItem).boxId === box.id);
      if (existing) return prev.map((c) => c.type === "box" && (c as CartBoxItem).boxId === box.id ? { ...c, qty: (c as CartBoxItem).qty + 1 } : c);
      const newItem: CartBoxItem = { type: "box", id: `box-${box.id}-${Date.now()}`, boxId: box.id, nama: box.nama, harga: box.harga_box, qty: 1 };
      return [...prev, newItem];
    });
  };

  const bukaPaketInline = (paket: ProductPackage) => {
    setSelectedPaketForInline(paket);
    setPaketInlineIsi([]);
    setPaketInlineExtras([]);
  };

  const konfirmasiPaketInline = () => {
    if (!selectedPaketForInline) return;
    const paket = selectedPaketForInline;
    if (paketInlineIsi.length < paket.kapasitas) { toast.error(`Pilih ${paket.kapasitas} donat untuk paket ini`); return; }
    
    const kanalHarga = (paket.channel_prices || {})[selectedChannel] ?? paket.harga_paket;
    const diskon = (paket.diskon_nominal || 0) > 0 ? paket.diskon_nominal : (paket.diskon_persen || 0) > 0 ? Math.round((kanalHarga * paket.diskon_persen) / 100) : 0;
    const hargaFinal = kanalHarga - diskon;
    const hargaNormal = paketInlineIsi.reduce((sum, donat) => {
      const prod = products.find((p) => p.id === donat.productId);
      return sum + (prod ? helperGetDisplayPrice(prod, channelPrices) : 0);
    }, 0);

    setCart((prev) => [...prev, {
      type: "paket" as const,
      id: `paket-${paket.id}-${Date.now()}`,
      paketId: paket.id,
      namaPaket: paket.nama,
      kode: paket.kode,
      kapasitas: paket.kapasitas,
      hargaPaket: hargaFinal,
      hargaNormal,
      diskon,
      isiDonat: paketInlineIsi,
      extras: paketInlineExtras,
    }]);
    resetPaketInlineFlow();
  };

  const konfirmasiCustom = () => {
    if (!selectedCustomPaket) return;
    const selected = selectedCustomPaket;
    
    const hargaBase = customJenisMode === "campur" ? selected.harga_satuan_default * selected.kapasitas : customJenisMode === "klasik" ? selected.harga_klasik_full : customJenisMode === "reguler" ? selected.harga_reguler_full : customJenisMode === "premium" ? selected.harga_premium_full : customJenisMode === "mix" ? selected.harga_mix || selected.harga_satuan_default * selected.kapasitas : customJenisMode === "random" ? selected.harga_satuan_default * selected.kapasitas : selected.harga_satuan_default * selected.kapasitas;
    const diskonNominal = (selected.diskon_nominal || 0) > 0 ? selected.diskon_nominal || 0 : (selected.diskon_persen || 0) > 0 ? Math.round((hargaBase * (selected.diskon_persen || 0)) / 100) : 0;
    const hargaDonat = hargaBase - diskonNominal;
    const totalTambahan = customTambahan.reduce((s, t) => s + t.harga * t.qty, 0);
    
    const totalHarga = hargaDonat + totalTambahan;
    
    setCart((prev) => [...prev, {
      type: "custom" as const,
      id: `custom-${selected.id}-${Date.now()}`,
      customPaketId: selected.id,
      kode: selected.kode,
      namaPaket: selected.nama,
      kapasitas: selected.kapasitas,
      ukuranDonat: selected.ukuran_donat,
      jenisMode: customJenisMode,
      modeLabel: customModeLabel || customJenisMode,
      isiDonat: customIsi,
      hargaDonat,
      diskon: diskonNominal,
      mintaTulisan: customMintaTulisan,
      tambahan: customTambahan,
      tulisanCoklat: customTulisan,
      jumlahPapanCoklat: customJumlahPapan,
      totalHarga,
    }]);
    resetCustomFlow();
  };

  const grandTotal = useMemo(() => calculateGrandTotal(cart), [cart]);
  const cartHPP = useMemo(() => calculateCartHPP(cart, products), [cart, products]);
  const automatedBoxesCalc = useMemo(
    () => (isCustomBoxesActive ? [] : calculateAutomatedBoxes(cart, products, boxList)),
    [cart, products, boxList, isCustomBoxesActive]
  );
  const effectiveBoxes = useMemo(
    () => (isCustomBoxesActive ? customBoxes.map((cb) => ({ ...cb, target: "custom", used: 0, totalCapacity: 0 })) : automatedBoxesCalc),
    [isCustomBoxesActive, customBoxes, automatedBoxesCalc]
  );
  const automatedBoxTotal = useMemo(() => calculateAutomatedBoxTotal(effectiveBoxes as any), [effectiveBoxes]);
  const totalBiayaEkstra = useMemo(() => selectedBiayaEkstra.reduce((sum, b) => sum + b.harga, 0), [selectedBiayaEkstra]);
  const maxCartDiscount = useMemo(() => calculateMaxCartDiscount(grandTotal + automatedBoxTotal + totalBiayaEkstra, cartHPP), [grandTotal, automatedBoxTotal, totalBiayaEkstra, cartHPP]);
  const finalTotal = useMemo(() => Math.max(0, grandTotal + automatedBoxTotal + totalBiayaEkstra - cartDiscount), [grandTotal, automatedBoxTotal, totalBiayaEkstra, cartDiscount]);

  const buatTagihan = () => {
    if (cart.length === 0) { toast.error("Keranjang kosong, tambahkan produk terlebih dahulu"); return; }
    const now = new Date();
    const waktu = now.toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const noTagihan = `TGH-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getTime()).slice(-5)}`;
    setTagihanData({
      noTagihan, nama: namaPelanggan || "Umum", waktu,
      items: cart, biayaEkstra: selectedBiayaEkstra,
      totalCart: grandTotal, totalBiaya: totalBiayaEkstra,
      cartDiscount, automatedBoxes: effectiveBoxes, automatedBoxTotal,
      finalTotal, kasirName: cashier?.name || "Kasir", receiptSettings,
    });
    setShowTagihan(true);
  };

  const tutupTagihan = () => {
    setShowTagihan(false);
    setTagihanData(null);
    setCart([]);
    setNamaPelanggan("");
    setSelectedBiayaEkstra([]);
    setCartDiscount(0);
    setCustomBoxes([]);
    setIsCustomBoxesActive(false);
  };

  const getDisplayPrice = (p: ProductWithCategory) => helperGetDisplayPrice(p, channelPrices);
  const getCartQty = (varianId: string) => {
    const item = cart.find((c) => c.type === "satuan" && (c as CartSatuanItem).varianId === varianId);
    return item ? (item as CartSatuanItem).qty : 0;
  };
  const getCartSatuanId = (varianId: string) => {
    const item = cart.find((c) => c.type === "satuan" && (c as CartSatuanItem).varianId === varianId);
    return item ? item.id : null;
  };

  const jenisGroups = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      varian: products.filter(
        (p) => p.category_id === cat.id && p.tipe_produk === "donat_varian" && p.ukuran === ukuranFilter
      ),
    }));
  }, [categories, products, ukuranFilter]);

  return {
    outlet, outletList, showOutletPicker, setShowOutletPicker, pilihOutlet, selectedChannel,
    cashier, cashierList, showCashierModal, setShowCashierModal, pilihCashier,
    products, categories, paketList, bundlingList, customList, tambahanList, biayaEkstraList, boxList, isLoading, receiptSettings,
    cart, showCart, setShowCart, activeSection, setActiveSection, ukuranFilter, setUkuranFilter, jenisGroups,
    hapusItem, updateQty, tambahSatuan, tambahBundling, tambahManualBox,
    selectedPaketForInline, setSelectedPaketForInline, paketInlineIsi, setPaketInlineIsi, paketInlineExtras, setPaketInlineExtras, bukaPaketInline, konfirmasiPaketInline,
    customStep, setCustomStep, selectedCustomPaket, setSelectedCustomPaket, customJenisMode, setCustomJenisMode, customModeLabel, setCustomModeLabel,
    customIsi, setCustomIsi, customTambahan, setCustomTambahan, customTulisan, setCustomTulisan, customMintaTulisan, setCustomMintaTulisan, customJumlahPapan, setCustomJumlahPapan, konfirmasiCustom,
    grandTotal, automatedBoxes: effectiveBoxes, automatedBoxTotal, totalBiayaEkstra, finalTotal, maxCartDiscount,
    namaPelanggan, setNamaPelanggan, selectedBiayaEkstra, setSelectedBiayaEkstra, cartDiscount, setCartDiscount,
    customBoxes, setCustomBoxes, isCustomBoxesActive, setIsCustomBoxesActive,
    showTagihan, setShowTagihan, tagihanData, buatTagihan, tutupTagihan,
    formatRp, getDisplayPrice, getCartQty, getCartSatuanId,
  };
}
