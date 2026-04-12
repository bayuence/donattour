'use client';

import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { useKasir } from './hooks/useKasir';
import OutletPicker from './components/OutletPicker';
import KasirHeader from './components/KasirHeader';
import MenuPanel from './components/MenuPanel';
import CartPanel from './components/CartPanel';
import PaymentModal from './components/PaymentModal';
import ReceiptModal from './components/ReceiptModal';
import PaketModal from './components/PaketModal';
import CashierModal from './components/CashierModal';

export default function KasirPage() {
  const k = useKasir();

  // Bluetooth printer state
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState('');

  // ═══ CART COLLAPSE STATE ═══
  // true = collapsed (icon only), false = full panel
  const [cartCollapsed, setCartCollapsed] = useState(false);

  // Auto-collapse cart ketika viewport kecil (split-screen), expand saat layar penuh
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w >= 640 && w < 1100) {
        // Split-screen / viewport sedang → auto collapse cart untuk hemat ruang
        setCartCollapsed(true);
      } else if (w >= 1100) {
        // Layar penuh → expand cart
        setCartCollapsed(false);
      }
      // di bawah 640px = mobile, cart floating button (tidak perlu diatur di sini)
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
            tambahBundling={k.tambahBundling}
            tambahManualBox={k.tambahManualBox}
            customStep={k.customStep}
            setCustomStep={k.setCustomStep}
            selectedCustomPaket={k.selectedCustomPaket}
            setSelectedCustomPaket={k.setSelectedCustomPaket}
            customJenisMode={k.customJenisMode}
            setCustomJenisMode={k.setCustomJenisMode}
            customIsi={k.customIsi}
            setCustomIsi={k.setCustomIsi}
            customTambahan={k.customTambahan}
            setCustomTambahan={k.setCustomTambahan}
            customTulisan={k.customTulisan}
            setCustomTulisan={k.setCustomTulisan}
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
            {/* Tombol collapse — di sudut kiri atas panel */}
            <button
              onClick={() => setCartCollapsed(true)}
              title="Kecilkan Keranjang"
              className="absolute left-2 top-3 z-10 w-7 h-7 rounded-lg bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 flex items-center justify-center transition-all"
            >
              <Icons.PanelRightClose size={14} />
            </button>
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
              onBayar={() => k.setShowBayar(true)}
              formatRp={k.formatRp}
              automatedBoxes={k.automatedBoxes}
              automatedBoxTotal={k.automatedBoxTotal}
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
          className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-full shadow-xl shadow-amber-500/40 hover:scale-110 active:scale-95 transition-all group"
        >
          <Icons.ShoppingCart size={24} className="group-hover:animate-bounce" />
          
          {k.cart.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[24px] h-[24px] px-1 bg-red-500 text-white rounded-full flex items-center justify-center text-[11px] font-black border-2 border-white shadow-sm">
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
                onBayar={() => { k.setShowCart(false); k.setShowBayar(true); }}
                formatRp={k.formatRp}
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
          products={k.products}
          onConfirm={k.konfirmasiPaket}
          onClose={() => k.setPaketModal(null)}
          formatRp={k.formatRp}
        />
      )}

      {/* MODAL: BAYAR */}
      {k.showBayar && (
        <PaymentModal
          finalTotal={k.finalTotal}
          formatRp={k.formatRp}
          bayarNominal={k.bayarNominal}
          setBayarNominal={k.setBayarNominal}
          paymentMethod={k.paymentMethod}
          setPaymentMethod={k.setPaymentMethod}
          isLoading={k.isLoading}
          onConfirm={k.prosesBayar}
          onCancel={() => k.setShowBayar(false)}
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
    </div>
  );
}
