'use client';

import { useRef } from 'react';
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
}

interface Props {
  data: StrukDataFull;
  outletNama: string;
  outletAlamat: string;
  channel: string;
  printerConnected: boolean;
  onClose: () => void;
}

export default function ReceiptModal({ data, outletNama, outletAlamat, channel, printerConnected, onClose }: Props) {
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

  const rs = data.receiptSettings || {};

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-500">
        
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/30 animate-in zoom-in duration-500">
            <Icons.CheckCheck size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Pembayaran Berhasil!</h2>
          <p className="text-slate-400 text-xs mt-1">{data.metodeBayar} • {data.waktu}</p>
        </div>

        {/* Struk */}
        <div className="border-2 border-dashed border-slate-100 rounded-2xl p-5 font-mono text-[10px] text-slate-600 space-y-1 bg-slate-50 relative flex flex-col items-center">
          <div className="text-center w-full mb-3 pb-3 border-b border-dashed flex flex-col items-center">
            {rs.show_logo && rs.logo_url && (
              <img src={rs.logo_url} alt="Logo" className="max-w-[100px] max-h-[64px] object-contain mb-2 grayscale contrast-125" />
            )}
            <p className="text-base font-black text-slate-800">{rs.header_text || 'DONATTOUR'}</p>
            <p className="text-[9px] opacity-70 leading-relaxed font-semibold max-w-[220px]">{rs.address_text || outletAlamat}</p>
            {rs.tax_info && <p className="text-[9px] opacity-70 mt-1">{rs.tax_info}</p>}
          </div>

          <div className="flex justify-between w-full"><span>No</span><span className="font-bold">{data.noTrx}</span></div>
          <div className="flex justify-between w-full"><span>Waktu</span><span className="text-[9px]">{data.waktu}</span></div>
          <div className="flex justify-between w-full"><span>Kasir</span><span className="font-semibold">{data.kasirName || 'Kasir'}</span></div>
          <div className="flex justify-between w-full"><span>Pelanggan</span><span>{data.nama}</span></div>
          <div className="flex justify-between pb-2 border-b border-dashed w-full">
            <span>Metode Bayar</span><span className="font-bold text-amber-600">{data.metodeBayar}</span>
          </div>

          <div className="py-2 space-y-2 w-full">
            {data.items.map((it, idx) => (
              <div key={idx}>
                <div className="flex justify-between">
                  <span className="flex-1 truncate pr-2">
                    {it.type === 'paket' && it.kode ? `[${it.kode}] ` : ''}{getItemLabel(it)} x{getQty(it)}
                  </span>
                  <span className="font-bold shrink-0">{formatRp(getItemTotal(it))}</span>
                </div>
                {/* Package breakdown */}
                {it.type === 'paket' && it.isiDonat && it.isiDonat.length > 0 && (
                  <div className="pl-3 mt-0.5 space-y-0.5">
                    {/* Group identical donuts */}
                    {Array.from(
                      new Map(it.isiDonat.map(d => [d.productId, { nama: d.nama, count: it.isiDonat.filter(x => x.productId === d.productId).length }]))
                    ).map(([pid, d]) => (
                      <div key={pid} className="flex items-center gap-1 text-[9px] text-slate-500">
                        <span>↳</span><span>{d.nama}{d.count > 1 ? ` x${d.count}` : ''}</span>
                      </div>
                    ))}
                    {it.boxNama && <div className="text-[9px] text-slate-400">📦 {it.boxNama}</div>}
                    {(it.extras || []).map((e, ei) => (
                      <div key={ei} className="flex justify-between text-[9px] text-slate-500">
                        <span>+ {e.nama} x{e.qty}</span><span>{formatRp(e.harga)}</span>
                      </div>
                    ))}
                    {(it.diskon || 0) > 0 && (
                      <div className="text-[8px] text-green-600 font-bold">💚 Hemat {formatRp(it.diskon)}</div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {data.automatedBoxes && data.automatedBoxes.length > 0 && data.automatedBoxes.map((a: any, i: number) => (
              <div key={`ab-${i}`} className="flex justify-between">
                <span className="flex-1 truncate pr-2 text-slate-700">📦 {a.box.nama} x{a.qty}</span>
                <span className="font-bold shrink-0">{formatRp(a.box.harga_box * a.qty)}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-dashed space-y-1 w-full">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatRp(data.totalCart)}</span></div>
            {(data.automatedBoxTotal || 0) > 0 && (
              <div className="flex justify-between pl-2 opacity-80"><span>• Kemasan Box</span><span>{formatRp(data.automatedBoxTotal || 0)}</span></div>
            )}
            {data.biayaEkstra.map((b: any, i: number) => (
              <div key={i} className="flex justify-between pl-2 opacity-80"><span>• {b.nama}</span><span>{formatRp(b.harga)}</span></div>
            ))}
            <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-dashed text-[11px]">
              <span>TOTAL</span><span>{formatRp(data.finalTotal)}</span>
            </div>
            {data.metodeBayarRaw === 'cash' && (
              <>
                <div className="flex justify-between text-slate-500"><span>Bayar</span><span>{formatRp(data.bayar)}</span></div>
                <div className="flex justify-between font-bold text-emerald-600"><span>Kembalian</span><span>{formatRp(data.kembalian)}</span></div>
              </>
            )}
          </div>

          <div className="text-center w-full pt-3 opacity-60 italic text-[9px] space-y-0.5">
            <p className="font-semibold">{rs.footer_text || 'Terima kasih atas kunjungannya!'}</p>
            <p>{rs.social_media || '— Donat Selembut Awan —'}</p>
            {rs.wifi_password && <p className="mt-1">WiFi: <b>{rs.wifi_password}</b></p>}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <button onClick={handlePrint}
            className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${printerConnected ? 'bg-slate-900 text-white hover:bg-amber-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
            <Icons.Printer size={14} />
            {printerConnected ? 'Cetak Struk' : 'Printer Offline'}
          </button>
          <button onClick={onClose}
            className="flex-1 py-3 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:from-amber-600 hover:to-orange-600 transition-all">
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
