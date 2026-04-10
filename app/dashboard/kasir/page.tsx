'use client';

import { useState } from 'react';
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

  // Bluetooth printer state (di page level agar bisa pass ke header & receipt)
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState('');

  // ═══ OUTLET PICKER ═══
  if (!k.outlet || k.showOutletPicker) {
    return <OutletPicker outletList={k.outletList} onSelect={k.pilihOutlet} />;
  }

  return (
    <div className="h-[calc(100vh-0px)] lg:h-screen flex flex-col bg-slate-50 overflow-hidden">

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
        <div className="flex-1 overflow-hidden h-full">
          <MenuPanel
            activeSection={k.activeSection}
            isLoading={k.isLoading}
            jenisGroups={k.jenisGroups}
            paketList={k.paketList}
            bundlingList={k.bundlingList}
            customList={k.customList}
            tambahanList={k.tambahanList}
            products={k.products}
            getCartQty={k.getCartQty}
            getCartSatuanId={k.getCartSatuanId}
            getDisplayPrice={k.getDisplayPrice}
            formatRp={k.formatRp}
            tambahSatuan={k.tambahSatuan}
            updateQty={k.updateQty}
            bukaPaketModal={k.bukaPaketModal}
            tambahBundling={k.tambahBundling}
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
 
        {/* RIGHT: Cart Panel — always visible on desktop & landscape */}
        <div className="hidden lg:flex landscape:flex w-80 xl:w-96 flex-col shrink-0 border-l bg-white">
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
          />
        </div>
      </div>
 
      {/* MOBILE: Floating Cart Button — hidden in landscape */}
      <div className="lg:hidden landscape:hidden fixed bottom-20 right-4 z-40">
        {k.cart.length > 0 && (
          <button
            onClick={() => k.setShowCart(true)}
            className="flex items-center gap-2 bg-gradient-to-br from-amber-500 to-orange-500 text-white px-5 py-3 rounded-2xl shadow-xl shadow-amber-500/30 font-black text-sm animate-in slide-in-from-bottom-4"
          >
            <span className="w-5 h-5 bg-white/25 rounded-full flex items-center justify-center text-[10px] font-black">{k.cart.length}</span>
            {k.formatRp(k.finalTotal)}
            <span className="text-[10px] uppercase">→ Bayar</span>
          </button>
        )}
      </div>
 
      {/* MOBILE: Cart Slide Over — hidden in landscape */}
      {k.showCart && (
        <div className="lg:hidden landscape:hidden fixed inset-0 z-50">
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
