'use client';

import { Receipt, Wifi, Image as ImageIcon, AlertCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { ExpenseItem } from '../types';
import { rp } from '../utils/helpers';

interface ExpenseListProps {
  expenses: ExpenseItem[];
  totalPengeluaran: number;
}

// Modal untuk menampilkan gambar bukti
function ImageProofModal({ isOpen, onClose, imageUrl, keterangan }: { isOpen: boolean; onClose: () => void; imageUrl: string | null; keterangan: string }) {
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <ImageIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Bukti Pengeluaran</h3>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{keterangan}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] bg-gray-50">
          {imageUrl ? (
            <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
              <img 
                src={imageUrl} 
                alt={`Bukti: ${keterangan}`}
                className="w-full h-auto"
                onError={(e) => {
                  // Fallback jika gambar gagal dimuat
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="flex flex-col items-center justify-center py-16">
                        <div class="w-16 h-16 bg-red-50 rounded-lg flex items-center justify-center mb-3">
                          <svg class="w-8 h-8 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </div>
                        <p class="text-gray-600 font-semibold">Gambar gagal dimuat</p>
                        <p class="text-gray-400 text-sm mt-1">URL gambar tidak valid atau sudah dihapus</p>
                      </div>
                    `;
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-lg flex items-center justify-center mb-3 border border-gray-200">
                <AlertCircle className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-600 font-semibold">Tidak ada bukti gambar</p>
              <p className="text-gray-400 text-sm mt-1">Transaksi ini tidak menyertakan foto bukti</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExpenseList({ expenses, totalPengeluaran }: ExpenseListProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string | null; keterangan: string } | null>(null);

  const handleImageClick = (imageUrl: string | null, keterangan: string) => {
    setSelectedImage({ url: imageUrl, keterangan });
  };

  // Debug: Log first expense to see structure
  useEffect(() => {
    if (expenses.length > 0) {
      console.log('🔍 [DEBUG] First expense data:', expenses[0]);
      console.log('🔍 [DEBUG] Available fields:', Object.keys(expenses[0]));
      console.log('🔍 [DEBUG] bukti_url:', expenses[0].bukti_url);
      console.log('🔍 [DEBUG] receipt_url:', (expenses[0] as any).receipt_url);
    }
  }, [expenses]);

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden lg:col-span-3 shadow-sm">
        {/* Header - Clean */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <h2 className="text-sm font-bold text-gray-900">Rincian Transaksi Pengeluaran</h2>
          <p className="text-xs text-gray-500 mt-0.5">Detail pengeluaran operasional hari ini</p>
        </div>

        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Keterangan</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Jumlah</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Bukti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {expenses.map((item) => {
                  // Get image URL - check both receipt_url and bukti_url for compatibility
                  const imageUrl = (item as any).receipt_url || item.bukti_url || null;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 border border-slate-200 capitalize">
                          {String(item.kategori || 'Operasional').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                        <div className="line-clamp-2">{item.keterangan}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                        {rp(item.jumlah)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {imageUrl ? (
                          <button
                            type="button"
                            onClick={() => handleImageClick(imageUrl, item.keterangan)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 hover:shadow-sm"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            Lihat
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-400 border border-gray-200">
                            <ImageIcon className="w-3.5 h-3.5" />
                            N/A
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-sm font-bold text-gray-900">
                    Total Pengeluaran
                  </td>
                  <td colSpan={2} className="px-6 py-4 text-right text-base font-bold text-red-600">
                    {rp(totalPengeluaran)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mx-auto mb-3 border border-slate-200">
              <Receipt className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-600 font-medium">Belum ada pengeluaran hari ini</p>
            <p className="text-xs text-slate-400 mt-1 flex items-center justify-center gap-1">
              <Wifi className="w-3 h-3" />
              Data akan muncul otomatis setelah ada input pengeluaran
            </p>
          </div>
        )}
      </div>

      {/* Image Proof Modal */}
      <ImageProofModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage?.url || null}
        keterangan={selectedImage?.keterangan || ''}
      />
    </>
  );
}
