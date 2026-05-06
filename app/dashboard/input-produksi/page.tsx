// ============================================================================
// INPUT PRODUKSI PAGE
// ============================================================================
// File: app/dashboard/input-produksi/page.tsx
// Description: Halaman input produksi harian
// Version: 2.1 — Fix: load outlet dari DB bukan hardcoded
// Date: 2026-05-06
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { ProductionInputForm } from './components/ProductionInputForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Plus, Loader2 } from 'lucide-react';
import { getActiveOutlets } from '@/lib/db/outlets';
import { ProductionHistoryList } from './components/ProductionHistoryList';

// ============================================================================
// COMPONENT
// ============================================================================

export default function InputProduksiPage() {
  const [activeTab, setActiveTab] = useState('input');
  const [outlets, setOutlets] = useState<{ id: string; nama: string; kode?: string }[]>([]);
  const [isLoadingOutlets, setIsLoadingOutlets] = useState(true);

  // Load outlets dari database
  useEffect(() => {
    async function loadOutlets() {
      try {
        const data = await getActiveOutlets();
        setOutlets(data || []);
      } catch (err) {
        console.error('Gagal load outlets:', err);
        setOutlets([]);
      } finally {
        setIsLoadingOutlets(false);
      }
    }
    loadOutlets();
  }, []);

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Input Produksi</h1>
        <p className="text-muted-foreground mt-2">
          Catat hasil produksi harian dengan detail waste tracking
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="input" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Input Produksi
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Riwayat
          </TabsTrigger>
        </TabsList>

        {/* Input Tab */}
        <TabsContent value="input" className="mt-6">
          {isLoadingOutlets ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <span className="ml-3 text-slate-500 font-medium">Memuat daftar outlet...</span>
            </div>
          ) : outlets.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="font-semibold">Tidak ada outlet aktif ditemukan.</p>
              <p className="text-sm mt-1">Pastikan outlet sudah dibuat dan aktif di sistem.</p>
            </div>
          ) : (
            <ProductionInputForm
              outlets={outlets}
              onSuccess={() => {
                console.log('Production saved successfully');
              }}
            />
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <ProductionHistoryList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
