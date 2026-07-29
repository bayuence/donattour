'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, ShoppingCart, Loader2, User as UserIcon, RefreshCw, Store } from 'lucide-react';
const Icons = { ClipboardList, ShoppingCart, Loader2, User: UserIcon, RefreshCw, Store };
import { useTagihan } from './hooks/useTagihan';
import TagihanCartPanel from './components/TagihanCartPanel';
import TagihanReceiptModal from './components/TagihanReceiptModal';
import OutletPicker from '@/app/(dashboard)/dashboard/kasir/components/OutletPicker';
import CashierModal from '@/app/(dashboard)/dashboard/kasir/components/CashierModal';
import MenuPanel from '@/app/(dashboard)/dashboard/kasir/components/MenuPanel';
import PaketModal from '@/app/(dashboard)/dashboard/kasir/components/PaketModal';
import { bluetoothPrinter } from '@/lib/bluetooth-printer';
import { toast } from 'sonner';

export default function TagihanPage() {
  const t = useTagihan();

  const [cartCollapsed, setCartCollapsed] = useState(false);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState('');

  // PaketModal state
  const [paketModal, setPaketModal] = useState<any>(null);
  const [paketIsi, setPaketIsi] = useState<any[]>([]);
  const [paketExtras, setPaketExtras] = useState<any[]>([]);

  const bukaPaketModal = (paket: any) => {
    setPaketModal(paket);
    setPaketIsi([]);
    setPaketExtras([]);
  };

  const konfirmasiPaket = () => {
    if (!paketModal) return;
    if (paketIsi.length < paketModal.kapasitas) {
      toast.error(`Pilih ${paketModal.kapasitas} donat untuk paket ini`);
      return;
    }
    const hargaPaket = paketModal.harga_paket + paketExtras.reduce((s: number, e: any) => s + e.harga * e.qty, 0);
    t.cart;
    // Gunakan konfirmasiPaketInline dengan data yang sudah di-set manual
    t.setSelectedPaketForInline(paketModal);
    t.setPaketInlineIsi(paketIsi);
    t.setPaketInlineExtras(paketExtras);
    setTimeout(() => {
      t.konfirmasiPaketInline();
      setPaketModal(null);
    }, 0);
  };

  // Auto-collapse cart
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 640 && w < 1100) setCartCollapsed(true);
      else if (w >= 1100) setCartCollapsed(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Bluetooth printer
  useEffect(() => {
    bluetoothPrinter.setConnectionChangeCallback(null);
    const handleConnectionChange = (connected: boolean) => {
      setPrinterConnected(connected);
      if (!connected) setPrinterName('');
    };
    bluetoothPrinter.setConnectionChangeCallback(handleConnectionChange);
    setPrinterConnected(bluetoothPrinter.isConnected());
    setPrinterName(bluetoothPrinter.getDeviceName() || '');
    return () => { bluetoothPrinter.setConnectionChangeCallback(null); };
  }, []);

  if (!t.outlet || t.showOutletPicker) {
    return <OutletPicker outletList={t.outletList} onSelect={t.pilihOutlet} />;
  }

  return (
    <div className="h-[calc(100vh-0px)] sm:h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3 shadow-sm">
        {/* Logo/Title */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Icons.ClipboardList size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 truncate">Tagihan</h1>
            <p className="text-[10px] text-slate-500 truncate">Buat struk tagihan tanpa potong stok</p>
          </div>
        </div>

        {/* Outlet info */}
        <button
          onClick={() => t.setShowOutletPicker(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-600 transition-all ml-2"
        >
          <Icons.Store size={12} />
          <span className="hidden sm:inline truncate max-w-[100px]">{t.outlet.nama}</span>
          <span className="sm:hidden">Outlet</span>
        </button>

        {/* Kasir info */}
        <button
          onClick={() => t.setShowCashierModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-600 transition-all"
        >
          <Icons.User size={12} />
          <span className="hidden sm:inline truncate max-w-[80px]">{t.cashier?.name || 'Pilih Kasir'}</span>
        </button>

        {/* Printer */}
        <button
          onClick={async () => {
            if (printerConnected) {
              await bluetoothPrinter.disconnect();
              setPrinterConnected(false);
              setPrinterName('');
              toast.info('Printer terputus');
            } else {
              const result = await bluetoothPrinter.connect();
              if (result.success) {
                setPrinterConnected(true);
                setPrinterName(result.deviceName || 'Printer BT');
                toast.success(`Terhubung: ${result.deviceName}`);
              } else {
                toast.error(result.error || 'Gagal terhubung');
              }
            }
          }}
          title={printerConnected ? `Printer: ${printerName}` : 'Hubungkan Printer'}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ml-auto ${
            printerConnected
              ? 'bg-green-50 border-green-300 text-green-700'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${printerConnected ? 'bg-green-500' : 'bg-slate-400'}`} />
          <span className="hidden sm:inline">{printerConnected ? 'Printer' : 'Printer'}</span>
        </button>

        {/* Tab navigation */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-lg p-1 ml-2">
          {(['donat', 'paket', 'bundling', 'custom'] as const).map(section => (
            <button
              key={section}
              onClick={() => t.setActiveSection(section)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all capitalize ${
                t.activeSection === section ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {section === 'donat' ? 'Varian' : section === 'paket' ? 'Paket' : section === 'bundling' ? 'Bundling' : 'Custom'}
            </button>
          ))}
        </div>

        {/* Mobile section toggle */}
        <div className="sm:hidden flex items-center gap-1 overflow-x-auto">
          {(['donat', 'paket'] as const).map(section => (
            <button
              key={section}
              onClick={() => t.setActiveSection(section)}
              className={`shrink-0 px-2 py-1 text-[10px] font-semibold rounded-md transition-all ${
                t.activeSection === section ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {section === 'donat' ? 'Varian' : 'Paket'}
            </button>
          ))}
        </div>

        {/* Ukuran filter */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {(['standar', 'mini'] as const).map(u => (
            <button
              key={u}
              onClick={() => t.setUkuranFilter(u)}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all uppercase ${
                t.ukuranFilter === u ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Main body */}
      {t.isLoading ? (
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Icons.Loader2 size={24} className="text-blue-500 animate-spin" />
          </div>
          <p className="text-slate-500 font-medium text-sm">Memuat data produk...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex w-full relative">
          {/* LEFT: Menu Panel */}
          <div className={`flex-1 overflow-hidden h-full min-w-0 transition-all duration-300 ${cartCollapsed ? '' : 'mr-80 xl:mr-96'}`}>
            <MenuPanel
              activeSection={t.activeSection}
              isLoading={t.isLoading}
              jenisGroups={t.jenisGroups}
              paketList={t.paketList}
              bundlingList={t.bundlingList}
              customList={t.customList}
              tambahanList={t.tambahanList}
              products={t.products}
              boxList={t.boxList}
              stockValidation={null}
              getCartQty={t.getCartQty}
              getCartSatuanId={t.getCartSatuanId}
              getDisplayPrice={t.getDisplayPrice}
              formatRp={t.formatRp}
              tambahSatuan={t.tambahSatuan}
              updateQty={t.updateQty}
              bukaPaketModal={bukaPaketModal}
              bukaPaketInline={t.bukaPaketInline}
              konfirmasiPaketInline={t.konfirmasiPaketInline}
              selectedPaketForInline={t.selectedPaketForInline}
              setSelectedPaketForInline={t.setSelectedPaketForInline}
              paketInlineIsi={t.paketInlineIsi}
              setPaketInlineIsi={t.setPaketInlineIsi}
              tambahBundling={t.tambahBundling}
              tambahManualBox={t.tambahManualBox}
              customStep={t.customStep}
              setCustomStep={t.setCustomStep}
              selectedCustomPaket={t.selectedCustomPaket}
              setSelectedCustomPaket={t.setSelectedCustomPaket}
              customJenisMode={t.customJenisMode}
              setCustomJenisMode={t.setCustomJenisMode}
              customModeLabel={t.customModeLabel}
              setCustomModeLabel={t.setCustomModeLabel}
              customIsi={t.customIsi}
              setCustomIsi={t.setCustomIsi}
              customTambahan={t.customTambahan}
              setCustomTambahan={t.setCustomTambahan}
              customTulisan={t.customTulisan}
              setCustomTulisan={t.setCustomTulisan}
              customMintaTulisan={t.customMintaTulisan}
              setCustomMintaTulisan={t.setCustomMintaTulisan}
              customJumlahPapan={t.customJumlahPapan}
              setCustomJumlahPapan={t.setCustomJumlahPapan}
              konfirmasiCustom={t.konfirmasiCustom}
              activeColor="blue"
              ukuranFilter={t.ukuranFilter}
            />
          </div>

          {/* RIGHT: Cart Panel — desktop */}
          <div className={`
            hidden sm:flex flex-col shrink-0 bg-white
            absolute right-0 top-0 bottom-0
            transition-all duration-300 ease-in-out overflow-hidden
            ${cartCollapsed ? 'w-0 border-l-0 opacity-0' : 'w-80 xl:w-96 border-l border-slate-200 opacity-100'}
            h-full
          `} style={{ zIndex: 20 }}>
            <div className="flex flex-col h-full relative w-80 xl:w-96">
              <TagihanCartPanel
                cart={t.cart}
                grandTotal={t.grandTotal}
                totalBiayaEkstra={t.totalBiayaEkstra}
                finalTotal={t.finalTotal}
                cartDiscount={t.cartDiscount}
                maxCartDiscount={t.maxCartDiscount}
                setCartDiscount={t.setCartDiscount}
                biayaEkstraList={t.biayaEkstraList}
                selectedBiayaEkstra={t.selectedBiayaEkstra}
                setSelectedBiayaEkstra={t.setSelectedBiayaEkstra}
                namaPelanggan={t.namaPelanggan}
                setNamaPelanggan={t.setNamaPelanggan}
                hapusItem={t.hapusItem}
                updateQty={t.updateQty}
                onBuatTagihan={t.buatTagihan}
                formatRp={t.formatRp}
                automatedBoxes={t.automatedBoxes as any}
                automatedBoxTotal={t.automatedBoxTotal}
                boxList={t.boxList}
                customBoxes={t.customBoxes}
                setCustomBoxes={t.setCustomBoxes}
                isCustomBoxesActive={t.isCustomBoxesActive}
                setIsCustomBoxesActive={t.setIsCustomBoxesActive}
                onCollapse={() => setCartCollapsed(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      <div className={`fixed z-40 transition-all duration-500 ease-in-out ${
        cartCollapsed
          ? 'bottom-20 right-4 sm:bottom-8 sm:right-8 opacity-100 translate-y-0'
          : 'bottom-20 right-4 opacity-100 translate-y-0 sm:opacity-0 sm:pointer-events-none sm:translate-y-10'
      }`}>
        <button
          onClick={() => {
            if (window.innerWidth < 640) t.setShowCart(true);
            else setCartCollapsed(false);
          }}
          className="relative flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all group"
        >
          <Icons.ClipboardList size={24} className="group-hover:scale-110 transition-transform" />
          {t.cart.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[24px] h-[24px] px-1.5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
              {t.cart.length > 99 ? '99+' : t.cart.length}
            </span>
          )}
        </button>
      </div>

      {/* Mobile Cart Slide Over */}
      {t.showCart && (
        <div className="sm:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => t.setShowCart(false)} />
          <div className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-3xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-black text-slate-800 flex items-center gap-2">
                <Icons.ClipboardList size={18} className="text-blue-600" /> Tagihan
              </h2>
              <button onClick={() => t.setShowCart(false)} className="p-2 rounded-xl hover:bg-slate-100">✕</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <TagihanCartPanel
                cart={t.cart}
                grandTotal={t.grandTotal}
                totalBiayaEkstra={t.totalBiayaEkstra}
                finalTotal={t.finalTotal}
                cartDiscount={t.cartDiscount}
                maxCartDiscount={t.maxCartDiscount}
                setCartDiscount={t.setCartDiscount}
                biayaEkstraList={t.biayaEkstraList}
                selectedBiayaEkstra={t.selectedBiayaEkstra}
                setSelectedBiayaEkstra={t.setSelectedBiayaEkstra}
                namaPelanggan={t.namaPelanggan}
                setNamaPelanggan={t.setNamaPelanggan}
                hapusItem={t.hapusItem}
                updateQty={t.updateQty}
                onBuatTagihan={() => { t.setShowCart(false); t.buatTagihan(); }}
                formatRp={t.formatRp}
                automatedBoxes={t.automatedBoxes as any}
                automatedBoxTotal={t.automatedBoxTotal}
                boxList={t.boxList}
                customBoxes={t.customBoxes}
                setCustomBoxes={t.setCustomBoxes}
                isCustomBoxesActive={t.isCustomBoxesActive}
                setIsCustomBoxesActive={t.setIsCustomBoxesActive}
              />
            </div>
          </div>
        </div>
      )}

      {/* Paket Modal */}
      {paketModal && (
        <PaketModal
          paket={paketModal}
          paketIsi={paketIsi}
          setPaketIsi={setPaketIsi}
          paketExtras={paketExtras}
          setPaketExtras={setPaketExtras}
          products={t.products}
          tambahanList={t.tambahanList}
          selectedChannel={t.selectedChannel}
          onConfirm={konfirmasiPaket}
          onClose={() => setPaketModal(null)}
          formatRp={t.formatRp}
          ukuranFilter={t.ukuranFilter}
        />
      )}

      {/* Cashier Modal */}
      {t.showCashierModal && (
        <CashierModal
          cashierList={t.cashierList}
          onSelect={t.pilihCashier}
          onClose={() => t.setShowCashierModal(false)}
        />
      )}

      {/* Outlet Picker */}
      {t.showOutletPicker && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <OutletPicker outletList={t.outletList} onSelect={t.pilihOutlet} />
        </div>
      )}

      {/* Tagihan Receipt Modal */}
      {t.showTagihan && t.tagihanData && (
        <TagihanReceiptModal
          data={t.tagihanData}
          outletNama={t.outlet.nama}
          outletAlamat={t.outlet.alamat}
          printerConnected={printerConnected}
          onClose={t.tutupTagihan}
          onConnectPrinter={async () => {
            const result = await bluetoothPrinter.connect();
            if (result.success) {
              setPrinterConnected(true);
              setPrinterName(result.deviceName || 'Printer BT');
            }
            return result;
          }}
        />
      )}
    </div>
  );
}
