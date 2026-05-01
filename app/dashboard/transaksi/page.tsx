'use client';

import { useState, useEffect } from 'react';
import * as db from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { bluetoothPrinter, type StrukData } from '@/lib/bluetooth-printer';
import { toast } from 'sonner';

export default function TransaksiPage() {
  const [transaksiList, setTransaksiList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTrx, setSelectedTrx] = useState<any | null>(null);
  const [printerConnected, setPrinterConnected] = useState(false);
  const [printerName, setPrinterName] = useState('');
  const [printing, setPrinting] = useState(false);
  const [outletData, setOutletData] = useState<any>(null);
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending' | 'cancelled'>('all');

  const formatRp = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID');

  // PRINT STRUK FROM TRANSACTION - Using shared printer connection from Kasir
  const handlePrintStruk = async () => {
    if (!selectedTrx) return;

    if (!printerConnected) {
      toast.error('⚠️ Hubungkan printer dari menu Kasir terlebih dahulu');
      return;
    }

    setPrinting(true);
    try {
      const strukData: StrukData = {
        noTrx: selectedTrx.id.substring(selectedTrx.id.length - 6).toUpperCase(),
        namaOutlet: outletData?.nama || 'Outlet',
        alamatOutlet: outletData?.alamat || '-',
        namaPelanggan: selectedTrx.customer_name || 'Umum',
        kasirName: selectedTrx.kasir_name || 'Kasir',
        waktu: new Date(selectedTrx.created_at).toLocaleString('id-ID'),
        items: (selectedTrx.order_items || []).map((item: any) => ({
          nama: item.products?.nama || 'Item',
          qty: item.quantity || 1,
          harga: item.unit_price || 0,
          subtotal: (item.unit_price || 0) * (item.quantity || 1),
        })),
        biayaEkstra: [],
        subtotal: selectedTrx.subtotal_amount || 0,
        totalBiaya: 0,
        finalTotal: selectedTrx.total_amount || 0,
        metodeBayar: selectedTrx.payment_method || 'cash',
        bayar: selectedTrx.total_amount || 0,
        kembalian: 0,
        channel: selectedTrx.channel || 'toko',
        receiptSettings: outletData?.receipt_settings || {},
      };

      toast.loading('Mencetak struk...', { id: 'print-struk' });
      const result = await bluetoothPrinter.printReceipt(strukData);

      if (result.success) {
        toast.success('✅ Struk berhasil dicetak!', { id: 'print-struk' });
      } else {
        toast.error(`❌ Gagal cetak: ${result.error}`, { id: 'print-struk' });
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`, { id: 'print-struk' });
    } finally {
      setPrinting(false);
    }
  };

  useEffect(() => {
    async function loadTransaksi() {
      // Prevent double-load
      if (loading || isRefreshing) return;
      
      setLoading(true);
      try {
        // Load outlet data for receipt settings
        const outlets = await db.getOutlets();
        if (outlets && outlets.length > 0) {
          setOutletData(outlets[0]);
        }

        // Tentukan range tanggal berdasarkan filter
        let startDate: Date;
        const endDate = new Date();
        
        if (filterPeriod === 'today') {
          startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 0, 0, 0);
        } else if (filterPeriod === 'week') {
          startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 7);
        } else if (filterPeriod === 'month') {
          startDate = new Date(endDate);
          startDate.setMonth(startDate.getMonth() - 1);
        } else {
          // 'all' - ambil semua transaksi (6 bulan terakhir untuk performa)
          startDate = new Date(endDate);
          startDate.setMonth(startDate.getMonth() - 6);
        }

        let query = supabase
          .from('orders')
          .select(`
            id, created_at, status, total_amount, payment_method, payment_method_detail,
            customer_name, kasir_name, channel,
            order_items (
              quantity, unit_price, product_name,
              products(nama)
            )
          `)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false });

        // Filter by status jika bukan 'all'
        if (filterStatus !== 'all') {
          query = query.eq('status', filterStatus);
        }

        const { data, error } = await query;

        if (!error && data) {
          setTransaksiList(data);
        } else if (error) {
          console.error('Error loading transactions:', error);
          toast.error('Gagal memuat transaksi');
        }
      } catch (err: any) {
        console.error(err);
        toast.error('Terjadi kesalahan saat memuat data');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }

    loadTransaksi();

    // Get printer connection state dari bluetoothPrinter
    setPrinterConnected(bluetoothPrinter.isConnected());
    setPrinterName(bluetoothPrinter.getDeviceName() || '');

    // Listen for connection changes
    bluetoothPrinter.setConnectionChangeCallback((connected: boolean) => {
      setPrinterConnected(connected);
    });

    return () => {
      bluetoothPrinter.setConnectionChangeCallback(null);
    };
  }, [filterPeriod, filterStatus]);

  const filtered = transaksiList.filter(
    (t) => t.id.toLowerCase().includes(search.toLowerCase()) ||
           t.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
           t.kasir_name?.toLowerCase().includes(search.toLowerCase()) ||
           t.order_items.some((oi: any) => (oi.products?.nama || oi.product_name || '').toLowerCase().includes(search.toLowerCase()))
  );

  const totalHariIni = transaksiList.reduce((sum, t) => sum + t.total_amount, 0);
  const totalCompleted = transaksiList.filter(t => t.status === 'completed').reduce((sum, t) => sum + t.total_amount, 0);
  const totalPending = transaksiList.filter(t => t.status === 'pending').length;
  const totalCancelled = transaksiList.filter(t => t.status === 'cancelled').length;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">🧾 Transaksi</h2>
        <p className="text-sm text-gray-500">Riwayat semua transaksi</p>
      </div>

      {/* Filter Period & Status */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterPeriod('today')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterPeriod === 'today'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setFilterPeriod('week')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterPeriod === 'week'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            7 Hari
          </button>
          <button
            onClick={() => setFilterPeriod('month')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterPeriod === 'month'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            30 Hari
          </button>
          <button
            onClick={() => setFilterPeriod('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterPeriod === 'all'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semua (6 Bulan)
          </button>
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterStatus === 'all'
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Semua Status
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterStatus === 'completed'
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterStatus === 'pending'
                ? 'bg-amber-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('cancelled')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterStatus === 'cancelled'
                ? 'bg-red-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Cancelled
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm text-gray-600">Total Penjualan</p>
          <p className="text-2xl font-bold text-green-600 mt-1">Rp {totalCompleted.toLocaleString('id-ID')}</p>
          <p className="text-xs text-gray-500 mt-1">Completed</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm text-gray-600">Jumlah Transaksi</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{transaksiList.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{totalPending}</p>
          <p className="text-xs text-gray-500 mt-1">Menunggu</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-sm text-gray-600">Cancelled</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{totalCancelled}</p>
          <p className="text-xs text-gray-500 mt-1">Dibatalkan</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 px-4 py-2 border rounded-lg focus:outline-none focus:border-amber-500"
          placeholder="Cari transaksi..."
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Waktu Lengkap</th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Pelanggan</th>
              <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Detail Item</th>
              <th className="px-6 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Channel & Metode</th>
              <th className="px-6 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-black text-gray-600 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                    <p className="text-slate-500 font-medium">Memuat transaksi...</p>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  Tidak ada transaksi ditemukan
                </td>
              </tr>
            ) : (
              filtered.map((o) => {
                const trxId = o.id.substring(o.id.length - 6).toUpperCase();
                const itemsStr = o.order_items.map((oi: any) => `${oi.products?.nama || oi.product_name || 'Item'} x${oi.quantity}`).join(', ');
                const waktuLengkap = new Date(o.created_at);
                const tanggal = waktuLengkap.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                const jam = waktuLengkap.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                return (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => setSelectedTrx(o)}>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-gray-700">{tanggal}</p>
                      <p className="text-sm font-mono font-black text-gray-900 mt-0.5">{jam}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono font-bold text-gray-900 group-hover:text-orange-600 transition-colors">TRX-{trxId}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{o.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-800">{o.customer_name || 'Umum'}</p>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">KASIR: {(o.kasir_name || '-').split(' ')[0]}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-700 max-w-[200px] truncate" title={itemsStr}>{itemsStr}</p>
                        <button className="p-1.5 bg-gray-50 text-gray-400 group-hover:text-orange-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col gap-1 items-center justify-center">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-black uppercase">{o.channel || 'toko'}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 rounded text-[10px] font-black uppercase" title={o.payment_method_detail || o.payment_method}>
                          {o.payment_method_detail || o.payment_method}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${o.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : o.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-base font-black text-emerald-600">
                      {formatRp(o.total_amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL */}
      {selectedTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
            
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="text-2xl font-black text-gray-900">Detail Transaksi</h3>
              <button 
                onClick={() => setSelectedTrx(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Tutup"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="space-y-6 relative z-10">
              {/* Header Info */}
              <div className="flex justify-between items-start bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">No. Transaksi</p>
                  <p className="text-lg font-black text-gray-900 font-mono">TRX-{selectedTrx.id.substring(selectedTrx.id.length - 6).toUpperCase()}</p>
                  <p className="text-[9px] text-gray-400 font-mono mt-1">{selectedTrx.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Waktu Transaksi</p>
                  <p className="text-sm font-bold text-gray-700">
                    {new Date(selectedTrx.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-sm font-mono font-black text-gray-900 mt-0.5">
                    {new Date(selectedTrx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Personnel Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                  <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest mb-1">Kasir</p>
                  <p className="text-sm font-black text-orange-700">{selectedTrx.kasir_name || '-'}</p>
                </div>
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Pelanggan</p>
                  <p className="text-sm font-black text-blue-700">{selectedTrx.customer_name || 'Umum'}</p>
                </div>
              </div>

              {/* Items List */}
              <div>
                <p className="text-xs font-black text-gray-900 mb-3 uppercase tracking-wider">Item Pesanan</p>
                <div className="bg-gray-50 rounded-2xl border border-gray-100 divide-y divide-gray-200/50 max-h-[250px] overflow-y-auto">
                  {selectedTrx.order_items.map((it: any, idx: number) => (
                    <div key={idx} className="p-4 flex justify-between items-center bg-white/50">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{it.products?.nama || it.product_name || 'Item Tidak Diketahui'}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">X {it.quantity}</p>
                      </div>
                      <p className="text-sm font-black text-gray-900">
                        {formatRp(it.unit_price * it.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Row */}
              <div className="pt-4 border-t-2 border-dashed border-gray-100 flex justify-between items-center">
                <div className="flex flex-col gap-2">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-black uppercase tracking-widest">
                    {selectedTrx.channel || 'toko'}
                  </span>
                  <span className="px-3 py-1 bg-gray-900 text-white rounded text-[10px] font-black uppercase tracking-widest" title={selectedTrx.payment_method_detail || selectedTrx.payment_method}>
                    {selectedTrx.payment_method_detail || selectedTrx.payment_method}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Akhir</p>
                  <p className="text-2xl font-black text-emerald-600">{formatRp(selectedTrx.total_amount)}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${selectedTrx.status === 'completed' ? 'text-emerald-600' : selectedTrx.status === 'pending' ? 'text-amber-600' : 'text-red-600'}`}>
                    {selectedTrx.status}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={handlePrintStruk}
                disabled={!printerConnected || printing}
                className={`flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all transform hover:scale-105 shadow-xl ${
                  printerConnected && !printing
                    ? 'bg-gradient-to-br from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-orange-300'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {printing ? '⏳ Mencetak...' : '🖨️ Cetak Struk'}
              </button>
              <button
                onClick={() => setSelectedTrx(null)}
                className="flex-1 py-4 bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-950 hover:to-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all transform hover:scale-105 shadow-xl shadow-slate-400/20"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

