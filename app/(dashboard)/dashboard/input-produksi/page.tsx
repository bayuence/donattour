// ============================================================================
// INPUT PRODUKSI PAGE
// ============================================================================
// File: app/dashboard/input-produksi/page.tsx
// Description: Halaman input produksi harian
// Version: 2.1 — Fix: load outlet dari DB bukan hardcoded
// Date: 2026-05-06
// ============================================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { ProductionInputForm } from './components/ProductionInputForm';
import { ProductionAnalytics } from './components/ProductionAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Plus, Loader2 } from 'lucide-react';
import { getActiveOutlets } from '@/lib/db/outlets';
import { getOfflineOutlets } from '@/lib/offline/offline-dal';

export default function InputProduksiPage() {
  const [activeTab, setActiveTab] = useState('input');
  const [outlets, setOutlets] = useState<{ id: string; nama: string; kode?: string }[]>([]);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(true);
  const refetchRef = useRef<(() => void) | null>(null);

  // Load outlets dari database dengan offline fallback
  useEffect(() => {
    async function loadOutlets() {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (isOnline) {
        try {
          const data = await getActiveOutlets();
          if (data && data.length > 0) {
            setOutlets(data || []);
            setIsLoadingOutlets(false);
            return;
          }
        } catch (err) {
          console.error('Gagal load outlets secara online, mencoba offline fallback:', err);
        }
      }

      // Offline or online call returned empty/failed
      try {
        const localOutlets = await getOfflineOutlets();
        setOutlets(localOutlets || []);
      } catch (offlineErr) {
        console.error('Gagal load outlets secara offline:', offlineErr);
        setOutlets([]);
      } finally {
        setIsLoadingOutlets(false);
      }
    }
    loadOutlets();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Input Produksi</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Catat hasil produksi harian dengan detail waste tracking
            </p>
          </div>
        </div>
      </div>

      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 sm:max-w-md">
            <TabsTrigger value="input" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Plus className="h-3 sm:h-4 w-3 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Input Produksi</span>
              <span className="sm:hidden">Input</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <BarChart3 className="h-3 sm:h-4 w-3 sm:w-4 flex-shrink-0" />
              <span className="hidden sm:inline">Riwayat</span>
              <span className="sm:hidden">History</span>
            </TabsTrigger>
          </TabsList>

        {/* Input Tab */}
        <TabsContent value="input" className="mt-4 sm:mt-6">
          {isLoadingOutlets ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16">
              <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-amber-500 mb-3" />
              <span className="text-xs sm:text-sm text-slate-500 font-medium">Memuat daftar outlet...</span>
            </div>
          ) : outlets.length === 0 ? (
            <div className="text-center py-12 sm:py-16 px-4">
              <p className="text-sm sm:text-base font-semibold text-slate-600">Tidak ada outlet aktif ditemukan.</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-2">Pastikan outlet sudah dibuat dan aktif di sistem.</p>
            </div>
          ) : (
            <ProductionInputForm
              outlets={outlets}
              onSuccess={() => {
                // Trigger refetch di ProductionAnalytics
                if (refetchRef.current) {
                  refetchRef.current();
                }
                setActiveTab('history');
              }}
            />
          )}
        </TabsContent>

        {/* History Tab - REDESIGNED with Analytics View */}
        <TabsContent value="history" className="mt-4 sm:mt-6">
          <ProductionAnalytics />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
