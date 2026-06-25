'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Loader2, History, Clock, Trash2 } from 'lucide-react';
import { getActiveOutletChannels, type OutletChannel } from '@/lib/db/outlet-channels';
import { supabase } from '@/lib/supabase/client';
import { getTodayWIB } from '@/lib/utils/timezone';
import { toast } from 'sonner';
import ChannelSalesInputModal from './ChannelSalesInputModal';

interface ChannelSalesEntrySectionProps {
  outletId: string;
  onTransactionSuccess: () => void;
  isKasirLocked?: boolean;
}

interface DeductionHistory {
  id: string;
  channel_key: string;
  ukuran: string;
  kategori: string;
  qty: number;
  catatan: string;
  created_at: string;
}

export default function ChannelSalesEntrySection({
  outletId,
  onTransactionSuccess,
  isKasirLocked = false
}: ChannelSalesEntrySectionProps) {
  const [channels, setChannels] = useState<OutletChannel[]>([]);
  const [history, setHistory] = useState<DeductionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<OutletChannel | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<DeductionHistory | null>(null);

  const handleDeleteConfirm = async () => {
    if (isKasirLocked || !confirmDeleteRecord) return;
    const id = confirmDeleteRecord.id;

    setDeletingId(id);
    try {
      const res = await fetch('/api/channel-sales/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Gagal menghapus transaksi');
      }
      toast.success('Transaksi berhasil dihapus dan stok dikembalikan!');
      setConfirmDeleteRecord(null);
      handleSuccess();
    } catch (err: any) {
      toast.error('Gagal menghapus transaksi', { description: err.message });
      console.error('Delete channel sales error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const loadData = async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const data = await getActiveOutletChannels(outletId);
      setChannels(data.filter(c => c.channel_key !== 'toko'));
      
      await loadHistory();
    } catch (err) {
      console.error('Failed to load active channels:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      // Get today's range in WIB
      const today = getTodayWIB();
      const startDate = `${today}T00:00:00+07:00`;
      const endDate = `${today}T23:59:59+07:00`;

      const { data, error } = await supabase
        .from('channel_stock_deductions')
        .select('*')
        .eq('outlet_id', outletId)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') { // Ignore table not found if prisma hasn't pushed yet
        throw error;
      }
      
      setHistory(data || []);
    } catch (err) {
      console.error('Failed to load deduction history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [outletId]);

  const handleSuccess = () => {
    loadHistory(); // Refresh history
    onTransactionSuccess(); // Refresh other dashboard stats if needed
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6 flex items-center justify-center min-h-[120px]">
        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
      </div>
    );
  }

  if (channels.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 animate-in fade-in slide-in-from-bottom-2 overflow-hidden">
        
        {/* TOP SECTION: Buttons */}
        <div className="p-5 sm:p-6 border-b border-slate-100">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              Potong Stok Channel Online
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Pilih channel untuk memotong stok fisik donat yang terjual di aplikasi online (GoFood, ShopeeFood, dll).
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => setSelectedChannel(channel)}
                className="flex items-center gap-3 p-3 pr-5 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 rounded-xl transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 group-hover:shadow-sm transition-shadow">
                  {channel.icon_url ? (
                    <img src={channel.icon_url} alt={channel.channel_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-slate-400 group-hover:text-orange-400 text-lg">
                      {channel.channel_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-slate-800 group-hover:text-orange-700 transition-colors">
                    {channel.channel_name}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                    Input Stok
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* BOTTOM SECTION: History */}
        <div className="bg-slate-50 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              Riwayat Potong Stok Hari Ini
            </h4>
            <button 
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50"
            >
              {loadingHistory ? 'Memuat...' : 'Refresh'}
            </button>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-white">
              <p className="text-sm text-slate-400">Belum ada pemotongan stok dari channel online hari ini.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Jam</th>
                    <th className="px-4 py-3 font-semibold">Channel</th>
                    <th className="px-4 py-3 font-semibold">Kategori</th>
                    <th className="px-4 py-3 font-semibold">Ukuran</th>
                    <th className="px-4 py-3 font-semibold text-right">Potong</th>
                    <th className="px-4 py-3 font-semibold">Catatan</th>
                    {!isKasirLocked && <th className="px-4 py-3 font-semibold text-center">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item) => {
                    const channelObj = channels.find(c => c.channel_key === item.channel_key);
                    const channelName = channelObj ? channelObj.channel_name : item.channel_key;
                    const date = new Date(item.created_at);
                    
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            {date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {channelName}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.kategori || 'Donat Umum'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 capitalize">
                          {item.ukuran}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold bg-red-50 text-red-600 rounded-md">
                            -{item.qty} pcs
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 italic max-w-[200px] truncate" title={item.catatan || '-'}>
                          {item.catatan || '-'}
                        </td>
                         {!isKasirLocked && (
                           <td className="px-4 py-3 text-center whitespace-nowrap">
                             <button
                               onClick={() => setConfirmDeleteRecord(item)}
                               disabled={deletingId === item.id}
                               className="text-xs font-bold text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1 mx-auto hover:bg-red-50 px-2 py-1.5 rounded-lg"
                             >
                               <Trash2 size={13} />
                               Hapus
                             </button>
                           </td>
                         )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

       {selectedChannel && (
         <ChannelSalesInputModal
           isOpen={!!selectedChannel}
           onClose={() => setSelectedChannel(null)}
           outletId={outletId}
           channel={selectedChannel}
           onSuccess={handleSuccess}
         />
       )}

       {confirmDeleteRecord && (
         <DeleteDeductionConfirmModal
           isOpen={!!confirmDeleteRecord}
           onClose={() => setConfirmDeleteRecord(null)}
           onConfirm={handleDeleteConfirm}
           qty={confirmDeleteRecord.qty}
           ukuran={confirmDeleteRecord.ukuran}
           channelName={(() => {
             const channelObj = channels.find(c => c.channel_key === confirmDeleteRecord.channel_key);
             return channelObj ? channelObj.channel_name : confirmDeleteRecord.channel_key;
           })()}
           loading={deletingId === confirmDeleteRecord.id}
         />
       )}
     </>
   );
 }

interface DeleteDeductionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  qty: number;
  ukuran: string;
  channelName: string;
  loading: boolean;
}

function DeleteDeductionConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  qty,
  ukuran,
  channelName,
  loading
}: DeleteDeductionConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Batalkan Potong Stok</h3>
              <p className="text-red-100 text-sm">Kembalikan produk ke inventori toko</p>
            </div>
          </div>
        </div>
        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 text-sm leading-relaxed mb-3">
            Yakin ingin menghapus catatan potong stok ini?
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between">
              <span>Channel:</span>
              <span className="font-bold text-slate-800">{channelName}</span>
            </div>
            <div className="flex justify-between">
              <span>Jumlah Donat:</span>
              <span className="font-bold text-slate-800">{qty} pcs ({ukuran})</span>
            </div>
            <div className="text-[10px] text-orange-600 font-semibold mt-1">
              * Stok donat fisik di sistem akan bertambah kembali secara otomatis.
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Ya, Kembalikan'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
