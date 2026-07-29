'use client';

import { useState } from 'react';
import {
  ClipboardList, Loader2, Printer, Bluetooth, X, Box, MessageSquare, Tag,
} from 'lucide-react';
const Icons = { ClipboardList, Loader2, Printer, Bluetooth, X, Box, MessageSquare, Tag };
import { bluetoothPrinter, type StrukData } from '@/lib/bluetooth-printer';
import { toast } from 'sonner';
import type { CartItem } from '@/app/(dashboard)/dashboard/kasir/hooks/useKasir';

interface TagihanDataFull {
  noTagihan: string;
  nama: string;
  waktu: string;
  items: CartItem[];
  biayaEkstra: { nama: string; harga: number; qty?: number }[];
  totalCart: number;
  totalBiaya: number;
  cartDiscount?: number;
  automatedBoxes?: { box: any; qty: number }[];
  automatedBoxTotal?: number;
  finalTotal: number;
  kasirName?: string;
  receiptSettings?: any;
}

interface Props {
  data: TagihanDataFull;
  outletNama: string;
  outletAlamat: string;
  printerConnected: boolean;
  onClose: () => void;
  onConnectPrinter?: () => Promise<{ success: boolean; error?: string; deviceName?: string }>;
}

export default function TagihanReceiptModal({ data, outletNama, outletAlamat, printerConnected, onClose, onConnectPrinter }: Props) {
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
      toast.error('Printer belum terhubung.', { position: 'top-center' });
      return;
    }
    const rs = data.receiptSettings || {};
    const strukPayload: StrukData = {
      noTrx: data.noTagihan,
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
      metodeBayar: 'TAGIHAN',
      bayar: 0,
      kembalian: 0,
      channel: 'toko',
      receiptSettings: rs,
    };
    const result = await bluetoothPrinter.printReceipt(strukPayload);
    if (result.success) {
      toast.success('Struk tagihan berhasil dicetak!', { position: 'top-center' });
    } else {
      toast.error(`Gagal cetak: ${result.error}`, { position: 'top-center' });
    }
  };

  const handleConnectFromModal = async () => {
    if (!onConnectPrinter) { toast.error('Fungsi connect tidak tersedia', { position: 'top-center' }); return; }
    setIsConnecting(true);
    try {
      const result = await onConnectPrinter();
      if (result.success) {
        toast.success(`Terhubung ke ${result.deviceName || 'Printer'}!`, { position: 'top-center' });
      } else {
        toast.error(result.error || 'Gagal terhubung', { position: 'top-center' });
      }
    } catch {
      toast.error('Error saat connect printer', { position: 'top-center' });
    } finally {
      setIsConnecting(false);
    }
  };

  const rs = data.receiptSettings || {};

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md h-screen max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-500">

        {/* Header */}
        <div className="flex-shrink-0 bg-white px-6 pt-6 pb-4 border-b border-slate-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Icons.ClipboardList size={28} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Tagihan Dibuat</h2>
            <p className="text-slate-500 text-sm mt-1">{data.waktu}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <Icons.ClipboardList size={12} />
              Tagihan Belum Lunas
            </div>
          </div>
        </div>

        {/* Struk Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="border-2 border-dashed border-blue-200 rounded-xl p-5 font-mono text-xs text-slate-700 space-y-3 bg-blue-50/30">
            {/* Header Struk */}
            <div className="text-center w-full pb-3 border-b border-dashed border-blue-200">
              {rs.show_logo && rs.logo_url && (
                <img src={rs.logo_url} alt="Logo" className="max-w-[100px] max-h-[60px] object-contain mb-2 mx-auto grayscale" />
              )}
              <p className="text-base font-bold text-slate-900">{rs.header_text || 'DONATTOUR'}</p>
              <p className="text-xs text-slate-600 leading-tight mt-1">{rs.address_text || outletAlamat}</p>
              {/* Badge TAGIHAN */}
              <div className="mt-2 inline-block bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded tracking-widest">
                *** TAGIHAN ***
              </div>
            </div>

            {/* Info Tagihan */}
            <div className="space-y-1.5 pb-3 border-b border-dashed border-blue-200">
              <div className="flex justify-between"><span className="text-slate-600">No. Tagihan</span><span className="font-bold text-blue-700">{data.noTagihan}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Waktu</span><span>{data.waktu}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Kasir</span><span className="font-semibold">{data.kasirName || 'Kasir'}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Pelanggan</span><span className="font-semibold">{data.nama || 'Umum'}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Status</span><span className="font-bold text-orange-600">BELUM DIBAYAR</span></div>
            </div>

            {/* Items */}
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
                    {it.type === 'paket' && it.isiDonat && it.isiDonat.length > 0 && (
                      <div className="pl-3 space-y-1 mt-1.5">
                        <p className="text-xs text-slate-600 font-semibold">Isi paket:</p>
                        {Array.from(
                          new Map(it.isiDonat.map((d: any) => [d.productId, { nama: d.nama, count: it.isiDonat.filter((x: any) => x.productId === d.productId).length }]))
                        ).map(([pid, d]: any) => (
                          <div key={pid} className="flex gap-1.5 text-xs text-slate-600">
                            <span>•</span><span>{d.nama}{d.count > 1 ? ` x${d.count}` : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {it.type === 'custom' && it.isiDonat && it.isiDonat.length > 0 && (
                      <div className="pl-3 space-y-1 mt-1.5">
                        <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold mb-1">
                          <Icons.Box size={12} />
                          <span>{it.kode && `${it.kode} • `}{it.modeLabel || it.jenisMode?.toUpperCase()} • {it.kapasitas} pcs</span>
                        </div>
                        {it.tulisanCoklat && (
                          <div className="text-xs text-slate-700 mt-2 bg-slate-50 px-2 py-1 rounded">
                            <p className="font-semibold flex items-center gap-1">
                              <Icons.MessageSquare size={10} /> Tulisan:
                            </p>
                            <p className="italic">"{it.tulisanCoklat}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Kemasan */}
            {data.automatedBoxes && data.automatedBoxes.length > 0 && (
              <div className="pt-3 border-t border-dashed border-blue-200">
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

            {/* Summary */}
            <div className="pt-3 border-t border-dashed border-blue-200 space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-600">Subtotal</span><span className="font-semibold">{formatRp(data.totalCart)}</span></div>
              {(data.automatedBoxTotal || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Kemasan</span><span className="font-semibold">{formatRp(data.automatedBoxTotal || 0)}</span>
                </div>
              )}
              {data.biayaEkstra.map((b: any, i: number) => (
                <div key={i} className="flex justify-between text-slate-600">
                  <span>{b.nama}{b.qty && b.qty > 1 ? ` x${b.qty}` : ''}</span>
                  <span className="font-semibold">{formatRp(b.harga)}</span>
                </div>
              ))}
              {data.cartDiscount && data.cartDiscount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon</span><span className="font-semibold">- {formatRp(data.cartDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-blue-900 pt-2 border-t border-dashed border-blue-200 text-sm">
                <span>TOTAL TAGIHAN</span><span>{formatRp(data.finalTotal)}</span>
              </div>
              <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                <p className="text-xs font-bold text-orange-700">⚠️ PEMBAYARAN BELUM DITERIMA</p>
                <p className="text-xs text-orange-600 mt-0.5">Mohon segera lakukan pembayaran</p>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center w-full pt-3 border-t border-dashed border-blue-200 text-slate-600 italic text-xs space-y-1">
              <p className="font-semibold">{rs.footer_text || 'Terima kasih atas kepercayaannya!'}</p>
              <p>{rs.social_media || '— Donat Selembut Awan —'}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 bg-white px-6 py-4 border-t border-slate-200 flex gap-3">
          <button
            onClick={printerConnected ? handlePrint : handleConnectFromModal}
            disabled={isConnecting}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              printerConnected
                ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95'
                : isConnecting
                ? 'bg-blue-500 text-white cursor-wait'
                : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-95'
            }`}>
            {isConnecting ? (
              <><Icons.Loader2 size={16} className="animate-spin" />Menghubungkan...</>
            ) : printerConnected ? (
              <><Icons.Printer size={16} />Cetak Tagihan</>
            ) : (
              <><Icons.Bluetooth size={16} />Hubungkan Printer</>
            )}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all">
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
