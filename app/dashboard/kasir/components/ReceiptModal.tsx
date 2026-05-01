'use client';

import { useRef, useState } from 'react';
import * as Icons from 'lucide-react';
import { bluetoothPrinter, type StrukData } from '@/lib/bluetooth-printer';
import { toast } from 'sonner';
import type { CartItem } from '../hooks/useKasir';

interface StrukDataFull {
  noTrx: string;
  nama: string;
  waktu: string;
  items: CartItem[];
  biayaEkstra: { nama: string; harga: number }[];
  totalCart: number;
  totalBiaya: number;
  automatedBoxes?: { box: any; qty: number }[];
  automatedBoxTotal?: number;
  finalTotal: number;
  bayar: number;
  kembalian: number;
  metodeBayar: string;
  metodeBayarRaw: string;
  kasirName?: string;
  receiptSettings?: any;
  // Midtrans fields
  midtransOrderId?: string;
  midtransTransactionId?: string;
  midtransPaymentType?: string;
}

interface Props {
  data: StrukDataFull;
  outletNama: string;
  outletAlamat: string;
  channel: string;
  printerConnected: boolean;
  onClose: () => void;
  onConnectPrinter?: () => Promise<{ success: boolean; error?: string; deviceName?: string }>;
}

export default function ReceiptModal({ data, outletNama, outletAlamat, channel, printerConnected, onClose, onConnectPrinter }: Props) {
  const [isConnecting, setIsConnecting] = useState(false);
  const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID');

  const getItemLabel = (item: CartItem) => {
    if (item.type === 'satuan') return item.nama;
    if (item.type === 'paket') return item.namaPaket;
    if (item.type === 'bundling') return item.nama;
    if (item.type === 'box') return item.nama;
    if (item.type === 'custom') return item.namaPaket;
    return 'Item';
  };
  const getItemTotal = (item: CartItem): number => {
    if (item.type === 'satuan') return item.harga * item.qty;
    if (item.type === 'paket') return item.hargaPaket;
    if (item.type === 'bundling') return item.harga;
    if (item.type === 'box') return item.harga * item.qty;
    if (item.type === 'custom') return item.totalHarga;
    return 0;
  };
  const getQty = (item: CartItem) => item.type === 'satuan' ? item.qty : 1;
  const getUnitPrice = (item: CartItem): number => {
    if (item.type === 'satuan') return item.harga;
    return getItemTotal(item);
  };

  const handlePrint = async () => {
    if (!printerConnected) {
      toast.error('Printer belum terhubung. Klik tombol printer di header terlebih dahulu.', { position: 'top-center' });
      return;
    }
    const strukPayload: StrukData = {
      noTrx: data.noTrx,
      namaOutlet: outletNama,
      alamatOutlet: outletAlamat,
      namaPelanggan: data.nama || 'Umum',
      kasirName: data.kasirName || 'Kasir',
      waktu: data.waktu,
      items: data.items.map(item => ({
        nama: getItemLabel(item),
        qty: getQty(item),
        harga: getUnitPrice(item),
        subtotal: getItemTotal(item),
      })),
      biayaEkstra: data.biayaEkstra || [],
      subtotal: data.totalCart || 0,
      totalBiaya: data.totalBiaya || 0,
      finalTotal: data.finalTotal || 0,
      metodeBayar: data.metodeBayarRaw || 'cash',
      bayar: data.bayar || 0,
      kembalian: data.kembalian || 0,
      channel,
      receiptSettings: data.receiptSettings,
    };
    const result = await bluetoothPrinter.printReceipt(strukPayload);
    if (result.success) {
      toast.success('Struk berhasil dicetak!', { position: 'top-center' });
    } else {
      toast.error(`Gagal cetak: ${result.error}`, { position: 'top-center' });
    }
  };

  const handleConnectFromModal = async () => {
    if (!onConnectPrinter) {
      toast.error('Fungsi connect tidak tersedia', { position: 'top-center' });
      return;
    }
    setIsConnecting(true);
    try {
      const result = await onConnectPrinter();
      if (result.success) {
        toast.success(`Terhubung ke ${result.deviceName || 'Printer'}!`, { position: 'top-center' });
      } else {
        toast.error(result.error || 'Gagal terhubung ke printer', { position: 'top-center' });
      }
    } catch (err) {
      toast.error('Error saat connect printer', { position: 'top-center' });
    } finally {
      setIsConnecting(false);
    }
  };

  const rs = data.receiptSettings || {};

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md h-screen max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500">

        {/* Header - Success Badge */}
        <div className="flex-shrink-0 bg-white px-6 pt-6 pb-4 border-b border-slate-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Icons.Check size={32} className="text-white" strokeWidth={3} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Pembayaran Berhasil</h2>
            <p className="text-slate-500 text-sm mt-1">{data.metodeBayar} • {data.waktu}</p>
          </div>
        </div>

        {/* Scrollable Struk Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 font-mono text-xs text-slate-700 space-y-3 bg-slate-50">
            {/* Header Section */}
            <div className="text-center w-full pb-3 border-b border-dashed border-slate-300">
              {rs.show_logo && rs.logo_url && (
                <img src={rs.logo_url} alt="Logo" className="max-w-[100px] max-h-[60px] object-contain mb-2 mx-auto grayscale" />
              )}
              <p className="text-base font-bold text-slate-900">{rs.header_text || 'DONATTOUR'}</p>
              <p className="text-xs text-slate-600 leading-tight mt-1">{rs.address_text || outletAlamat}</p>
              {rs.tax_info && <p className="text-xs text-slate-600 mt-1">{rs.tax_info}</p>}
            </div>

            {/* Transaction Info */}
            <div className="space-y-1.5 pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between"><span className="text-slate-600">No. Transaksi</span><span className="font-bold">{data.noTrx}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Waktu</span><span>{data.waktu}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Kasir</span><span className="font-semibold">{data.kasirName || 'Kasir'}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Pelanggan</span><span>{data.nama || 'Umum'}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Metode</span><span className="font-bold">{data.metodeBayar}</span></div>
            </div>

            {/* Items Section */}
            <div>
              <p className="font-bold text-slate-900 mb-2">PRODUK</p>
              <div className="space-y-3">
                {data.items.map((it, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="flex-1 font-semibold text-slate-900">
                        {it.type === 'paket' && it.kode ? `[${it.kode}] ` : ''}{getItemLabel(it)}
                      </span>
                      <span className="font-bold ml-2">{formatRp(getItemTotal(it))}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{formatRp(getUnitPrice(it))} x {getQty(it)}</span>
                    </div>
                    
                    {/* Package breakdown */}
                    {it.type === 'paket' && it.isiDonat && it.isiDonat.length > 0 && (
                      <div className="pl-3 space-y-1 mt-1.5">
                        <p className="text-xs text-slate-600 font-semibold">Isi paket:</p>
                        {Array.from(
                          new Map(it.isiDonat.map(d => [d.productId, { nama: d.nama, count: it.isiDonat.filter(x => x.productId === d.productId).length }]))
                        ).map(([pid, d]) => (
                          <div key={pid} className="flex gap-1.5 text-xs text-slate-600">
                            <span>•</span><span>{d.nama}{d.count > 1 ? ` x${d.count}` : ''}</span>
                          </div>
                        ))}
                        {it.boxNama && <div className="text-xs text-slate-500 mt-1">Kemasan: {it.boxNama}</div>}
                        {(it.extras || []).map((e, ei) => (
                          <div key={ei} className="flex justify-between text-xs text-slate-600">
                            <span>+ {e.nama} x{e.qty}</span><span>{formatRp(e.harga)}</span>
                          </div>
                        ))}
                        {(it.diskon || 0) > 0 && (
                          <div className="text-xs text-green-600 font-semibold">Hemat {formatRp(it.diskon)}</div>
                        )}
                      </div>
                    )}
                    
                    {/* Custom order breakdown */}
                    {it.type === 'custom' && it.isiDonat && it.isiDonat.length > 0 && (
                      <div className="pl-3 space-y-1 mt-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold mb-1">
                          <Icons.Box size={12} />
                          <span>
                            {it.kode && `${it.kode} • `}
                            {it.modeLabel || it.jenisMode?.toUpperCase()} • {it.kapasitas} pcs
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 font-semibold">Isi:</p>
                        {(() => {
                          const grouped = new Map<string, { nama: string; count: number }>();
                          it.isiDonat.forEach((d: any) => {
                            const key = typeof d === 'object' ? (d.productId || d.nama) : d;
                            const nama = typeof d === 'object' ? d.nama : d;
                            const existing = grouped.get(key);
                            if (existing) existing.count++;
                            else grouped.set(key, { nama, count: 1 });
                          });
                          return Array.from(grouped.values()).map((d, i) => (
                            <div key={i} className="flex gap-1.5 text-xs text-slate-600">
                              <span>•</span><span>{d.nama}{d.count > 1 ? ` x${d.count}` : ''}</span>
                            </div>
                          ));
                        })()}
                        {it.tulisanCoklat && (
                          <div className="text-xs text-slate-700 mt-2 bg-slate-50 px-2 py-1 rounded">
                            <p className="font-semibold flex items-center gap-1">
                              <Icons.MessageSquare size={10} />
                              Tulisan:
                            </p>
                            <p className="italic">"{it.tulisanCoklat}"</p>
                            {it.jumlahPapanCoklat > 0 && (
                              <p className="text-amber-600 font-semibold mt-1">
                                📋 {it.jumlahPapanCoklat} papan coklat
                              </p>
                            )}
                          </div>
                        )}
                        {(it.tambahan || []).map((t: any, ti: number) => (
                          <div key={ti} className="flex justify-between text-xs text-slate-600">
                            <span>+ {t.nama} x{t.qty}</span><span>{formatRp(t.harga)}</span>
                          </div>
                        ))}
                        {(it.diskon || 0) > 0 && (
                          <div className="text-xs text-green-600 font-semibold flex items-center gap-1 mt-1">
                            <Icons.Tag size={10} />
                            Hemat {formatRp(it.diskon)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Box Usage Section */}
            {data.automatedBoxes && data.automatedBoxes.length > 0 && (
              <div className="pt-3 border-t border-dashed border-slate-300">
                <p className="font-bold text-slate-900 mb-2">KEMASAN</p>
                <div className="space-y-1.5">
                  {data.automatedBoxes.map((a: any, i: number) => (
                    <div key={`ab-${i}`} className="flex justify-between">
                      <span className="flex-1">{a.box.nama} x{a.qty}</span>
                      <span className="font-bold">{formatRp(a.box.harga_box * a.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Section */}
            <div className="pt-3 border-t border-dashed border-slate-300 space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span className="font-semibold">{formatRp(data.totalCart)}</span></div>
              {(data.automatedBoxTotal || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Kemasan</span><span className="font-semibold">{formatRp(data.automatedBoxTotal || 0)}</span>
                </div>
              )}
              {data.biayaEkstra.map((b: any, i: number) => (
                <div key={i} className="flex justify-between text-slate-600">
                  <span>{b.nama}</span><span className="font-semibold">{formatRp(b.harga)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-dashed border-slate-300 text-sm">
                <span>TOTAL</span><span>{formatRp(data.finalTotal)}</span>
              </div>
              {data.metodeBayarRaw === 'cash' && (
                <>
                  <div className="flex justify-between text-slate-600"><span>Bayar</span><span className="font-semibold">{formatRp(data.bayar)}</span></div>
                  <div className="flex justify-between font-bold text-green-600"><span>Kembalian</span><span>{formatRp(data.kembalian)}</span></div>
                </>
              )}

              {/* Midtrans Payment Details */}
              {data.midtransOrderId && (
                <div className="pt-3 mt-3 border-t border-dashed border-slate-300 space-y-1.5">
                  <p className="text-xs font-bold text-slate-700 mb-2">DETAIL PEMBAYARAN DIGITAL</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">ID Transaksi</span>
                    <span className="font-mono font-semibold text-slate-900">{data.midtransOrderId}</span>
                  </div>
                  {data.midtransTransactionId && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">ID Pembayaran</span>
                      <span className="font-mono text-slate-700">{data.midtransTransactionId}</span>
                    </div>
                  )}
                  {data.midtransPaymentType && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600">Tipe Pembayaran</span>
                      <span className="font-semibold text-blue-600 uppercase">{data.midtransPaymentType}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-semibold mt-2">
                    <Icons.CheckCircle size={14} />
                    <span>Pembayaran Terverifikasi</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center w-full pt-3 border-t border-dashed border-slate-300 text-slate-600 italic text-xs space-y-1">
              <p className="font-semibold">{rs.footer_text || 'Terima kasih atas kunjungannya!'}</p>
              <p>{rs.social_media || '— Donat Selembut Awan —'}</p>
              {rs.wifi_password && <p className="mt-1">WiFi: <b>{rs.wifi_password}</b></p>}
            </div>
          </div>
        </div>

        {/* Sticky Actions */}
        <div className="flex-shrink-0 bg-white px-6 py-4 border-t border-slate-200 flex gap-3">
          <button onClick={printerConnected ? handlePrint : handleConnectFromModal}
            disabled={isConnecting}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              printerConnected
                ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                : isConnecting
                ? 'bg-blue-500 text-white cursor-wait'
                : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
            }`}>
            {isConnecting ? (
              <>
                <Icons.Loader2 size={16} className="animate-spin" />
                Menghubungkan...
              </>
            ) : printerConnected ? (
              <>
                <Icons.Printer size={16} />
                Cetak Struk
              </>
            ) : (
              <>
                <Icons.Bluetooth size={16} />
                Hubungkan Printer
              </>
            )}
          </button>
          <button onClick={onClose}
            className="flex-1 py-3 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 active:scale-95 transition-all">
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
