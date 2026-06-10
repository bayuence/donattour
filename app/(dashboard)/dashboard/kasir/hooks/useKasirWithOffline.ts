/**
 * useKasirWithOffline Hook
 * 
 * Wrapper hook yang menggabungkan useKasir dengan offline transaction support
 * 
 * Features:
 * - Semua fungsi useKasir original
 * - Offline transaction support dengan IndexedDB
 * - Auto-sync saat koneksi kembali
 * - Real-time inventory updates
 */

'use client';

import { useKasir } from './useKasir';
import { useOfflineTransaction } from '@/lib/hooks/use-offline-transaction';
import { useOfflineStatus } from '@/lib/hooks/use-offline-mutation';
import { toast } from 'sonner';
import type { PaymentMethodKasir } from '@/lib/types';

export function useKasirWithOffline() {
  // Get original kasir hook
  const kasir = useKasir();

  // Get offline transaction hook
  const createOfflineTransaction = useOfflineTransaction();

  // Get offline status
  const offlineStatus = useOfflineStatus();

  // Override prosesBayar untuk support offline
  const prosesBayarWithOffline = async (methodOverride?: string) => {
    const paymentMethod = methodOverride || kasir.paymentMethod;

    // ═══ PAYMENT dengan OFFLINE SUPPORT ═══
    
    if (!kasir.outlet || !kasir.cashier) {
      toast.error('Outlet atau kasir belum dipilih');
      return;
    }

    if (kasir.cart.length === 0) {
      toast.error('Keranjang kosong!');
      return;
    }

    const isCash = paymentMethod.toLowerCase().includes('tunai') || paymentMethod.toLowerCase().includes('cash');
    const bayar = isCash ? (parseFloat(kasir.bayarNominal) || 0) : kasir.finalTotal;
    const realFinalTotal = kasir.finalTotal;

    if (isCash && bayar < realFinalTotal) {
      toast.error('Uang bayar kurang!');
      return;
    }

    try {
      // Prepare order data
      const orderData = {
        outlet_id: kasir.outlet.id,
        customer_name: kasir.namaPelanggan.trim() || 'Umum',
        total_amount: realFinalTotal,
        payment_method: paymentMethod,
        payment_method_name: kasir.paymentMethodsList.find(m => m.id === paymentMethod)?.name
          || (paymentMethod === 'cash' ? 'Tunai' : paymentMethod),
        channel: kasir.selectedChannel,
        paid_amount: bayar,
        change_amount: bayar - realFinalTotal,
        kasir_name: kasir.cashier.name,
        kasir_id: kasir.cashier.id,
      };

      // Prepare items
      const dbItems: any[] = [];
      
      kasir.cart.forEach(item => {
        if (item.type === 'satuan') {
          dbItems.push({
            product_id: item.varianId,
            product_name: item.nama,
            quantity: item.qty,
            unit_price: item.harga,
            subtotal: item.harga * item.qty,
            tipe_produk: item.tipe_produk,
            base_product_id: item.base_product_id,
          });
        } else if (item.type === 'paket') {
          dbItems.push({
            product_id: null,
            product_name: item.namaPaket,
            quantity: 1,
            unit_price: item.hargaPaket,
            subtotal: item.hargaPaket,
            tipe_produk: 'paket',
          });
          
          // Add donat items
          item.isiDonat.forEach(donat => {
            if (donat.productId) {
              dbItems.push({
                product_id: donat.productId,
                product_name: donat.nama,
                quantity: 1,
                unit_price: 0,
                subtotal: 0,
                tipe_produk: 'donat_varian',
                base_product_id: donat.base_product_id,
              });
            }
          });

          // Add extras
          (item.extras || []).forEach(ext => {
            dbItems.push({
              product_id: ext.productId,
              product_name: ext.nama,
              quantity: ext.qty,
              unit_price: ext.harga,
              subtotal: ext.harga * ext.qty,
              tipe_produk: 'tambahan',
            });
          });
        } else if (item.type === 'bundling') {
          dbItems.push({
            product_id: null,
            product_name: item.nama,
            quantity: 1,
            unit_price: item.harga,
            subtotal: item.harga,
            tipe_produk: 'bundling',
          });
        } else if (item.type === 'custom') {
          const isiNamaCounts: Record<string, number> = {};
          item.isiDonat.forEach(d => {
            isiNamaCounts[d.nama] = (isiNamaCounts[d.nama] || 0) + 1;
          });
          const isiRingkas = Object.entries(isiNamaCounts)
            .map(([nama, qty]) => (qty > 1 ? `${nama} x${qty}` : nama))
            .join(', ');

          const customNotes = [
            `[${item.kode || 'CUSTOM'}] ${item.modeLabel || item.jenisMode}`,
            `Isi: ${isiRingkas}`,
            item.tulisanCoklat ? `Tulisan: "${item.tulisanCoklat}"` : null,
            item.diskon > 0 ? `Diskon: ${kasir.formatRp(item.diskon)}` : null,
          ]
            .filter(Boolean)
            .join(' | ');

          dbItems.push({
            product_id: null,
            product_name: `${item.kode || item.namaPaket} - ${item.modeLabel || item.jenisMode}`,
            quantity: 1,
            unit_price: item.totalHarga,
            subtotal: item.totalHarga,
            tipe_produk: 'custom',
            notes: customNotes,
          });

          // Add donat items
          item.isiDonat.forEach(donat => {
            if (donat.productId) {
              dbItems.push({
                product_id: donat.productId,
                product_name: donat.nama,
                quantity: 1,
                unit_price: 0,
                subtotal: 0,
                tipe_produk: 'donat_varian',
              });
            }
          });

          // Add tambahan
          item.tambahan.forEach(t => {
            dbItems.push({
              product_id: t.id,
              product_name: t.nama,
              quantity: t.qty,
              unit_price: t.harga / t.qty,
              subtotal: t.harga,
              tipe_produk: 'tambahan',
            });
          });
        } else if (item.type === 'box') {
          dbItems.push({
            product_id: null,
            product_name: item.nama,
            quantity: item.qty,
            unit_price: item.harga,
            subtotal: item.harga * item.qty,
            tipe_produk: 'box',
          });
        }
      });

      // Add automated boxes
      kasir.automatedBoxes.forEach(a => {
        dbItems.push({
          product_id: null,
          product_name: a.box.nama,
          quantity: a.qty,
          unit_price: a.box.harga_box,
          subtotal: a.box.harga_box * a.qty,
          tipe_produk: 'box',
        });
      });

      // Add biaya ekstra
      kasir.selectedBiayaEkstra.forEach(e => {
        dbItems.push({
          product_id: e.id,
          product_name: e.nama,
          quantity: 1,
          unit_price: e.harga,
          subtotal: e.harga,
          tipe_produk: 'biaya_ekstra',
        });
      });

      // ✅ USE OFFLINE TRANSACTION HOOK
      const mutationResult = await createOfflineTransaction.mutateAsync({
        orderData,
        items: dbItems,
        outletId: kasir.outlet.id,
      });

      // Get real transaction ID if available, otherwise fallback to temporary
      // Format: TRX-XXXXXX (6 char terakhir dari UUID, konsisten dengan toast notifikasi)
      const rawId = mutationResult?.id || '';
      const realTrxId = rawId
        ? `TRX-${rawId.replace(/-/g, '').toUpperCase().slice(-6)}`
        : `TRX-${Date.now().toString().slice(-6)}`;

      // Success - prepare receipt
      const methodData = kasir.paymentMethodsList.find(m => m.id === paymentMethod);
      const methodName = methodData ? methodData.name : (paymentMethod === 'cash' ? 'Tunai' : paymentMethod);

      const waktuStruk = new Date().toLocaleString('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short',
      });

      kasir.setStrukData({
        items: [...kasir.cart],
        biayaEkstra: [...kasir.selectedBiayaEkstra],
        automatedBoxes: [...kasir.automatedBoxes],
        totalCart: kasir.grandTotal,
        totalBiaya: kasir.totalBiayaEkstra,
        automatedBoxTotal: kasir.automatedBoxTotal,
        finalTotal: realFinalTotal,
        bayar,
        kembalian: bayar - realFinalTotal,
        waktu: waktuStruk,
        noTrx: realTrxId,
        nama: kasir.namaPelanggan.trim() || 'Umum',
        metodeBayar: methodName,
        metodeBayarRaw: paymentMethod,
        kasirName: kasir.cashier?.name || 'Kasir',
        receiptSettings: kasir.receiptSettings,
      });

      // Clear cart and show receipt
      kasir.setShowBayar(false);
      kasir.setShowStruk(true);
      kasir.setCart([]);
      kasir.setSelectedBiayaEkstra([]);
      kasir.setBayarNominal('');
      kasir.setNamaPelanggan('');
      kasir.setPaymentMethod('cash');
    } catch (error: any) {
      console.error('Error proses bayar:', error);
      // Error handling sudah di-handle oleh useOfflineTransaction hook
    }
  };

  // Return enhanced kasir object
  return {
    ...kasir,
    prosesBayar: prosesBayarWithOffline,
    offlineStatus,
    realtimeConnected: true,
  };
}
