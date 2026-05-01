'use client';

import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useKasir } from './hooks/useKasir';
import OutletPicker from './components/OutletPicker';
import KasirHeader from './components/KasirHeader';
import MenuPanel from './components/MenuPanel';
import CartPanel from './components/CartPanel';
import PaymentMethodSelector from './components/PaymentMethodSelector';
import CashPaymentModal from './components/CashPaymentModal';
import ReceiptModal from './components/ReceiptModal';
import PaketModal from './components/PaketModal';
import CashierModal from './components/CashierModal';
import MidtransSnapWrapper, { preloadMidtransScript } from './components/MidtransSnapWrapper';
import { bluetoothPrinter } from '@/lib/bluetooth-printer';

export default function KasirPage() {
  const k = useKasir();

  // Bluetooth printer state
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState('');

  // ═══ CART COLLAPSE STATE ═══
  // true = collapsed (icon only), false = full panel
  const [cartCollapsed, setCartCollapsed] = useState(false);

  // ═══ PAYMENT METHOD SELECTION STATE ═══
  const [showCashModal, setShowCashModal] = useState(false);

  // Auto-collapse cart ketika viewport kecil (split-screen), expand saat layar penuh
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 640 && w < 1100) {
        // Layar tablet kecil / split-screen sempit → auto collapse
        setCartCollapsed(true);
      } else if (w >= 1100) {
        // Layar cukup lebar (setengah layar desktop 1920px = ~960px) → expand cart
        setCartCollapsed(false);
      }
      // di bawah 640px = mobile, cart menggunakan pop-up (diatur di bagian UI)
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ═══ PRELOAD MIDTRANS SNAP SCRIPT ═══
  // Load script di background saat halaman kasir mount,
  // sehingga saat user klik "Non-Tunai", popup langsung muncul.
  useEffect(() => {
    preloadMidtransScript();
  }, []);

  // ═══ BLUETOOTH PRINTER CONNECTION ═══
  useEffect(() => {
    // Cleanup previous callback first (prevent multiple listeners)
    bluetoothPrinter.setConnectionChangeCallback(null);
    
    // Set new callback
    const handleConnectionChange = (connected: boolean) => {
      console.log('🔌 Bluetooth connection changed:', connected);
      setPrinterConnected(connected);
      if (!connected) {
        setPrinterName('');
      }
    };
    
    bluetoothPrinter.setConnectionChangeCallback(handleConnectionChange);
    
    // Initial state
    setPrinterConnected(bluetoothPrinter.isConnected());
    setPrinterName(bluetoothPrinter.getDeviceName() || '');

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up bluetooth listener');
      bluetoothPrinter.setConnectionChangeCallback(null);
    };
  }, []); // Empty deps OK karena bluetoothPrinter adalah singleton

  // ═══ OUTLET PICKER ═══
  if (!k.outlet || k.showOutletPicker) {
    return <OutletPicker outletList={k.outletList} onSelect={k.pilihOutlet} />;
  }

  return (
    <div className="h-[calc(100vh-0px)] sm:h-screen flex flex-col bg-slate-50 overflow-hidden">

      {/* HEADER */}
      <KasirHeader
        outlet={k.outlet}
        selectedChannel={k.selectedChannel}
        setSelectedChannel={k.setSelectedChannel}
        activeSection={k.activeSection}
        setActiveSection={k.setActiveSection}
        ukuranFilter={k.ukuranFilter}
        setUkuranFilter={k.setUkuranFilter}
        cartCount={k.cart.length}
        onChangeOutlet={() => k.setShowOutletPicker(true)}
        printerConnected={printerConnected}
        setPrinterConnected={setPrinterConnected}
        printerName={printerName}
        setPrinterName={setPrinterName}
        cashier={k.cashier}
        onSelectCashier={() => k.setShowCashierModal(true)}
        kasirMenus={k.kasirMenus}
      />

      {/* MAIN BODY — split panel */}
      <div className="flex-1 overflow-hidden flex w-full">

        {/* LEFT: Menu Browser */}
        <div className="flex-1 overflow-hidden h-full min-w-0">
          <MenuPanel
            activeSection={k.activeSection}
            isLoading={k.isLoading}
            jenisGroups={k.jenisGroups}
            paketList={k.paketList}
            bundlingList={k.bundlingList}
            customList={k.customList}
            tambahanList={k.tambahanList}
            products={k.products}
            boxList={k.boxList}
            getCartQty={k.getCartQty}
            getCartSatuanId={k.getCartSatuanId}
            getDisplayPrice={k.getDisplayPrice}
            formatRp={k.formatRp}
            tambahSatuan={k.tambahSatuan}
            updateQty={k.updateQty}
            bukaPaketModal={k.bukaPaketModal}
            bukaPaketInline={k.bukaPaketInline}
            konfirmasiPaketInline={k.konfirmasiPaketInline}
            selectedPaketForInline={k.selectedPaketForInline}
            setSelectedPaketForInline={k.setSelectedPaketForInline}
            paketInlineIsi={k.paketInlineIsi}
            setPaketInlineIsi={k.setPaketInlineIsi}
            tambahBundling={k.tambahBundling}
            tambahManualBox={k.tambahManualBox}
            customStep={k.customStep}
            setCustomStep={k.setCustomStep}
            selectedCustomPaket={k.selectedCustomPaket}
            setSelectedCustomPaket={k.setSelectedCustomPaket}
            customJenisMode={k.customJenisMode}
            setCustomJenisMode={k.setCustomJenisMode}
            customModeLabel={k.customModeLabel}
            setCustomModeLabel={k.setCustomModeLabel}
            customIsi={k.customIsi}
            setCustomIsi={k.setCustomIsi}
            customTambahan={k.customTambahan}
            setCustomTambahan={k.setCustomTambahan}
            customTulisan={k.customTulisan}
            setCustomTulisan={k.setCustomTulisan}
            customMintaTulisan={k.customMintaTulisan}
            setCustomMintaTulisan={k.setCustomMintaTulisan}
            customJumlahPapan={k.customJumlahPapan}
            setCustomJumlahPapan={k.setCustomJumlahPapan}
            konfirmasiCustom={k.konfirmasiCustom}
            activeColor={k.kasirMenus.find(m => m.slug === k.selectedChannel)?.color || 'amber'}
          />
        </div>

        {/* RIGHT: Cart Panel — selalu tampil di sm+, collapsible dengan w-0 */}
        <div
          className={`
            hidden sm:flex flex-col shrink-0 bg-white
            transition-all duration-300 ease-in-out overflow-hidden
            ${cartCollapsed ? 'w-0 border-l-0 opacity-0' : 'w-80 xl:w-96 border-l border-slate-200 opacity-100'}
          `}
        >
          {/* ── EXPANDED: Full cart panel ── */}
          <div className="flex flex-col h-full relative w-80 xl:w-96">
            <CartPanel
              cart={k.cart}
              grandTotal={k.grandTotal}
              totalBiayaEkstra={k.totalBiayaEkstra}
              finalTotal={k.finalTotal}
              biayaEkstraList={k.biayaEkstraList}
              selectedBiayaEkstra={k.selectedBiayaEkstra}
              setSelectedBiayaEkstra={k.setSelectedBiayaEkstra}
              namaPelanggan={k.namaPelanggan}
              setNamaPelanggan={k.setNamaPelanggan}
              hapusItem={k.hapusItem}
              updateQty={k.updateQty}
              onBayar={() => {
                k.setShowBayar(true);
                k.prefetchMidtransToken(); // ⚡ Mulai fetch token sekarang
              }}
              formatRp={k.formatRp}
              automatedBoxes={k.automatedBoxes}
              automatedBoxTotal={k.automatedBoxTotal}
              onCollapse={() => setCartCollapsed(true)}
            />
          </div>
        </div>
      </div>

      {/* ═══ FLOATING CART BUTTON ═══ */}
      {/* Muncul jika keranjang ada isinya, dan: sedang di mobile, ATAU sedang collapsed di desktop */}
      <div 
        className={`fixed z-40 transition-all duration-500 ease-in-out ${
          cartCollapsed 
            ? 'bottom-20 right-4 sm:bottom-8 sm:right-8 opacity-100 translate-y-0' 
            : 'bottom-20 right-4 opacity-100 translate-y-0 sm:opacity-0 sm:pointer-events-none sm:translate-y-10'
        }`}
      >
        <button
          onClick={() => {
            if (window.innerWidth < 640) {
              k.setShowCart(true); 
            } else {
              setCartCollapsed(false); 
            }
          }}
          className="relative flex items-center justify-center w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all group"
        >
          <Icons.ShoppingCart size={24} className="group-hover:scale-110 transition-transform" />
          
          {k.cart.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[24px] h-[24px] px-1.5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
              {k.cart.length > 99 ? '99+' : k.cart.length}
            </span>
          )}
        </button>
      </div>



      {/* Mobile: Cart Slide Over */}
      {k.showCart && (
        <div className="sm:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => k.setShowCart(false)} />
          <div className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-3xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-black text-slate-800">Keranjang</h2>
              <button onClick={() => k.setShowCart(false)} className="p-2 rounded-xl hover:bg-slate-100">✕</button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CartPanel
                cart={k.cart}
                grandTotal={k.grandTotal}
                totalBiayaEkstra={k.totalBiayaEkstra}
                finalTotal={k.finalTotal}
                biayaEkstraList={k.biayaEkstraList}
                selectedBiayaEkstra={k.selectedBiayaEkstra}
                setSelectedBiayaEkstra={k.setSelectedBiayaEkstra}
                namaPelanggan={k.namaPelanggan}
                setNamaPelanggan={k.setNamaPelanggan}
                hapusItem={k.hapusItem}
                updateQty={k.updateQty}
                onBayar={() => { k.setShowCart(false); k.setShowBayar(true); k.prefetchMidtransToken(); }}
                formatRp={k.formatRp}
                automatedBoxes={k.automatedBoxes}
                automatedBoxTotal={k.automatedBoxTotal}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAKET ISI */}
      {k.paketModal && (
        <PaketModal
          paket={k.paketModal}
          paketIsi={k.paketIsi}
          setPaketIsi={k.setPaketIsi}
          paketExtras={k.paketExtras}
          setPaketExtras={k.setPaketExtras}
          products={k.products}
          tambahanList={k.tambahanList}
          selectedChannel={k.selectedChannel}
          onConfirm={k.konfirmasiPaket}
          onClose={() => k.setPaketModal(null)}
          formatRp={k.formatRp}
        />
      )}

      {/* MODAL: PILIH METODE BAYAR */}
      {k.showBayar && !showCashModal && (
        <PaymentMethodSelector
          finalTotal={k.finalTotal}
          formatRp={k.formatRp}
          onSelectCash={() => {
            // User pilih tunai, batalkan prefetch dan buka modal input nominal
            k.cancelPrefetch();
            k.setPaymentMethod('cash');
            k.setShowBayar(false);
            setShowCashModal(true);
          }}
          onSelectDigital={() => {
            // User pilih digital, langsung proses Midtrans (token mungkin sudah prefetched)
            k.setPaymentMethod('digital');
            k.setShowBayar(false);
            k.prosesBayar('digital');
          }}
          onCancel={() => {
            k.cancelPrefetch(); // Batalkan prefetch kalau user cancel
            k.setShowBayar(false);
          }}
        />
      )}

      {/* MODAL: INPUT NOMINAL TUNAI */}
      {showCashModal && (
        <CashPaymentModal
          finalTotal={k.finalTotal}
          formatRp={k.formatRp}
          bayarNominal={k.bayarNominal}
          setBayarNominal={k.setBayarNominal}
          isLoading={k.isLoading}
          onConfirm={() => {
            k.prosesBayar();
            setShowCashModal(false);
          }}
          onCancel={() => {
            setShowCashModal(false);
            k.setBayarNominal('');
          }}
        />
      )}

      {/* MODAL: STRUK */}
      {k.showStruk && k.strukData && (
        <ReceiptModal
          data={k.strukData}
          outletNama={k.outlet.nama}
          outletAlamat={k.outlet.alamat}
          channel={k.selectedChannel}
          printerConnected={printerConnected}
          onClose={() => k.setShowStruk(false)}
          onConnectPrinter={async () => {
            const { bluetoothPrinter } = await import('@/lib/bluetooth-printer');
            const result = await bluetoothPrinter.connect();
            if (result.success) {
              setPrinterConnected(true);
              setPrinterName(result.deviceName || 'Printer BT');
            }
            return result;
          }}
        />
      )}

      {/* MODAL: PILIH KASIR */}
      {k.showCashierModal && (
        <CashierModal
          cashierList={k.cashierList}
          onSelect={k.pilihCashier}
          onClose={() => k.setShowCashierModal(false)}
        />
      )}

      {/* MIDTRANS SNAP POPUP */}
      {k.midtransSnapToken && (
        <MidtransSnapWrapper
          key={k.midtransSnapToken}
          snapToken={k.midtransSnapToken}
          onSuccess={k.handleMidtransSuccess}
          onPending={k.handleMidtransPending}
          onError={k.handleMidtransError}
          onClose={k.handleMidtransClose}
        />
      )}
    </div>
  );
}
