'use client';

import { Store, MapPin, ChevronRight } from 'lucide-react';
import type { Outlet } from '@/lib/types';

interface OutletSelectionModalProps {
  outlets: Outlet[];
  onSelectOutlet: (outlet: Outlet) => void;
  onClose: () => void;
}

export function OutletSelectionModal({ 
  outlets, 
  onSelectOutlet,
  onClose 
}: OutletSelectionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Modal Header */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">Pilih Outlet</h2>
              <p className="text-orange-100 text-sm mt-0.5">
                Laporan akan ditampilkan untuk outlet yang dipilih
              </p>
            </div>
          </div>
        </div>

        {/* Outlet List */}
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {outlets.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Store className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-700 font-semibold">Belum ada outlet aktif</p>
              <p className="text-gray-400 text-sm mt-1">Tambahkan outlet di menu Kelola Outlet</p>
            </div>
          ) : (
            outlets.map((outlet) => (
              <button
                key={outlet.id}
                onClick={() => onSelectOutlet(outlet)}
                className="w-full text-left p-4 rounded-xl border-2 border-gray-100 hover:border-orange-400 hover:bg-orange-50 transition-all duration-150 group"
              >
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className="w-10 h-10 bg-orange-100 group-hover:bg-orange-200 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                    <Store className="w-5 h-5 text-orange-600" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 group-hover:text-orange-700 transition-colors">
                        {outlet.nama}
                      </p>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${outlet.status === 'aktif' ? 'bg-green-500' : 'bg-red-400'}`} />
                    </div>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {outlet.alamat}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            ))
          )}
        </div>

        <div className="px-4 pb-4">
          <p className="text-center text-xs text-gray-400">
            {outlets.length > 0 ? `${outlets.length} outlet aktif tersedia` : 'Kelola outlet di menu Kelola Outlet'}
          </p>
        </div>
      </div>
    </div>
  );
}
