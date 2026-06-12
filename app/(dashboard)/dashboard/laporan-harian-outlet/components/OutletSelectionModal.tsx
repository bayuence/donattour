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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop - Glassmorphism effect */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/40 to-black/50 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Card - Premium styling */}
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white/20">

        {/* Modal Header - Modern gradient with subtle glass effect */}
        <div className="relative bg-gradient-to-br from-orange-500 via-orange-500 to-orange-600 px-6 sm:px-8 py-8 text-white overflow-hidden">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-orange-400/20 rounded-full blur-3xl -mr-20 -mt-20" />

          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/30 shadow-lg">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 pt-0.5">
              <h2 className="text-2xl font-bold leading-tight tracking-tight">Pilih Outlet</h2>
              <p className="text-orange-50 text-sm mt-1.5 font-medium">
                Laporan akan ditampilkan untuk outlet yang dipilih
              </p>
            </div>
          </div>
        </div>

        {/* Outlet List - Enhanced spacing and interactions */}
        <div className="p-6 space-y-2.5 max-h-96 overflow-y-auto scrollbar-hide">
          {outlets.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200/50">
                <Store className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-900 font-semibold text-base">Belum ada outlet aktif</p>
              <p className="text-gray-500 text-sm mt-2">Tambahkan outlet di menu Kelola Outlet</p>
            </div>
          ) : (
            outlets.map((outlet) => (
              <button
                key={outlet.id}
                onClick={() => onSelectOutlet(outlet)}
                className="w-full text-left p-4 rounded-2xl border border-gray-200/60 hover:border-orange-300/80 bg-gray-50/40 hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-50/40 transition-all duration-200 group active:scale-98"
              >
                <div className="flex items-center gap-3.5">
                  {/* Icon - Enhanced with shadow */}
                  <div className="w-11 h-11 bg-gradient-to-br from-orange-100/80 to-orange-50 group-hover:from-orange-200/80 group-hover:to-orange-100/60 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-200 border border-orange-200/50 shadow-sm">
                    <Store className="w-5.5 h-5.5 text-orange-600" />
                  </div>

                  {/* Info - Better typography hierarchy */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="font-semibold text-gray-900 group-hover:text-orange-700 transition-colors duration-150">
                        {outlet.nama}
                      </p>
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform ${outlet.status === 'aktif' ? 'bg-emerald-500 shadow-md shadow-emerald-500/40' : 'bg-red-400 shadow-md shadow-red-400/40'}`} />
                    </div>
                    <p className="text-xs text-gray-600 truncate flex items-center gap-1.5 mt-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-500" />
                      {outlet.alamat}
                    </p>
                  </div>

                  {/* Arrow - Smooth animation */}
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer - Refined typography */}
        <div className="px-6 sm:px-8 py-4 border-t border-gray-100/50 bg-gray-50/30 backdrop-blur-sm">
          <p className="text-center text-xs text-gray-600 font-medium">
            {outlets.length > 0 ? `${outlets.length} outlet aktif tersedia` : 'Kelola outlet di menu Kelola Outlet'}
          </p>
        </div>
      </div>
    </div>
  );
}
