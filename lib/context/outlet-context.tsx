'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as db from '@/lib/db';
import type { Outlet } from '@/lib/types';

interface OutletContextType {
  outlet: Outlet | null;
  outletList: Outlet[];
  isLoading: boolean;
  showPicker: boolean;
  setOutlet: (outlet: Outlet) => void;
  openPicker: () => void;
  closePicker: () => void;
}

const OutletContext = createContext<OutletContextType | undefined>(undefined);

const STORAGE_KEY = 'donattour_active_outlet';

export function OutletProvider({ children }: { children: ReactNode }) {
  const [outlet, setOutletState] = useState<Outlet | null>(null);
  const [outletList, setOutletList] = useState<Outlet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // Load outlet list dan saved outlet
  useEffect(() => {
    const loadData = async () => {
      try {
        const outlets = await db.getActiveOutlets();
        setOutletList(outlets);

        // Coba load dari localStorage
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          // Pastikan outlet masih ada di list
          const exists = outlets.find(o => o.id === parsed.id);
          if (exists) {
            setOutletState(exists);
          } else {
            setShowPicker(true);
          }
        } else {
          setShowPicker(true);
        }
      } catch (error) {
        console.error('Error loading outlets:', error);
        setShowPicker(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const setOutlet = (newOutlet: Outlet) => {
    setOutletState(newOutlet);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newOutlet));
    setShowPicker(false);
  };

  const openPicker = () => setShowPicker(true);
  const closePicker = () => setShowPicker(false);

  return (
    <OutletContext.Provider value={{
      outlet,
      outletList,
      isLoading,
      showPicker,
      setOutlet,
      openPicker,
      closePicker,
    }}>
      {children}
    </OutletContext.Provider>
  );
}

export function useOutlet() {
  const context = useContext(OutletContext);
  if (context === undefined) {
    throw new Error('useOutlet must be used within an OutletProvider');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

// Header yang menampilkan outlet aktif - GUNAKAN DI SEMUA HALAMAN OPERASIONAL
export function OutletHeader({ title }: { title: string }) {
  const { outlet, openPicker, isLoading } = useOutlet();

  if (isLoading) {
    return (
      <div className="bg-white border-b px-4 py-3">
        <div className="animate-pulse h-6 w-48 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xl">
          🏪
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{outlet?.nama || 'Pilih Outlet'}</h1>
          <p className="text-xs text-gray-500">{title}</p>
        </div>
      </div>
      <button
        onClick={openPicker}
        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 transition-colors"
      >
        🔄 Ganti
      </button>
    </div>
  );
}

// Modal Picker untuk pilih outlet
export function OutletPicker() {
  const { outlet, outletList, showPicker, setOutlet, closePicker } = useOutlet();

  if (!showPicker) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">🏪 Pilih Outlet</h2>
          <p className="text-sm text-gray-500 mt-1">Pilih outlet tempat kamu bertugas</p>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {outletList.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              Belum ada outlet aktif.<br />
              Tambah dulu di menu <strong>Kelola Outlet</strong>.
            </p>
          ) : (
            <div className="space-y-2">
              {outletList.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOutlet(o)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    outlet?.id === o.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-semibold text-gray-900">{o.nama}</div>
                  {o.alamat && (
                    <div className="text-sm text-gray-500 mt-1">{o.alamat}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {outlet && (
          <div className="p-4 border-t">
            <button
              onClick={closePicker}
              className="w-full py-2 text-gray-600 hover:text-gray-900"
            >
              Batal, tetap di <strong>{outlet.nama}</strong>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper untuk halaman yang WAJIB pilih outlet dulu
export function RequireOutlet({ children }: { children: ReactNode }) {
  const { outlet, isLoading, showPicker } = useOutlet();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🍩</div>
          <p className="text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!outlet || showPicker) {
    return <OutletPicker />;
  }

  return <>{children}</>;
}
