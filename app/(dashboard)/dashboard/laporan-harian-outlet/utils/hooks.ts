import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getTodayWIB } from '@/lib/utils/timezone';
import type { Outlet, Product } from '@/lib/types';
import type { DashboardData, ExpenseItem } from '../types';

export function useLaporanData(selectedOutlet: Outlet | null) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (outlet: Outlet) => {
    setLoadingData(true);
    setError(null);
    try {
      const today = getTodayWIB();
      
      // Fetch products if empty
      if (products.length === 0) {
        const { data: prodData } = await supabase.from('products').select('*').eq('is_active', true);
        if (prodData) setProducts(prodData as Product[]);
      }

      // 1. Fetch dashboard summary (production + sales data)
      const dashRes = await fetch(
        `/api/dashboard/daily?outlet_id=${outlet.id}&date=${today}`,
        { cache: 'no-store' }
      );
      const dashJson = await dashRes.json();
      if (dashJson.success && dashJson.data) {
        const data = dashJson.data as DashboardData;
        
        // Cek status closing secara client-side
        const { data: closingData } = await supabase
          .from('daily_closing')
          .select('id, notes')
          .eq('outlet_id', outlet.id)
          .eq('tanggal', today)
          .limit(1)
          .single();
          
        const isKasirLocked = !!closingData;
        const isLockOnly = closingData && (closingData.notes?.includes('AUDIT_IN_PROGRESS') || closingData.notes?.includes('Auto-closed'));
        const hasFinalClosing = closingData && !isLockOnly;
          
        data.has_closing = hasFinalClosing;
        data.is_kasir_locked = isKasirLocked;
        setDashboardData(data);
      }

      // 2. Fetch expenses directly via supabase client (realtime-ready)
      const { data: expData, error: expErr } = await (supabase as any)
        .from('expenses')
        .select('id, kategori, keterangan, jumlah, created_at')
        .eq('outlet_id', outlet.id)
        .eq('tanggal', today)
        .order('created_at', { ascending: false });

      if (!expErr && expData) {
        setExpenses(expData as ExpenseItem[]);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('[LaporanOutlet] fetchData error:', err);
      setError('Gagal memuat data. Periksa koneksi Anda.');
    } finally {
      setLoadingData(false);
    }
  }, [products.length]);

  return {
    dashboardData,
    expenses,
    products,
    loadingData,
    error,
    lastUpdated,
    fetchData,
    setDashboardData,
    setExpenses,
    setError
  };
}

export function useRealtime(
  selectedOutlet: Outlet | null, 
  fetchData: (outlet: Outlet) => void
) {
  const [isLive, setIsLive] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const setupRealtime = useCallback((outlet: Outlet) => {
    // Remove previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`laporan-harian-${outlet.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'production_daily', filter: `outlet_id=eq.${outlet.id}` },
        () => { fetchData(outlet); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `outlet_id=eq.${outlet.id}` },
        () => { fetchData(outlet); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_closing', filter: `outlet_id=eq.${outlet.id}` },
        () => { fetchData(outlet); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `outlet_id=eq.${outlet.id}` },
        () => { fetchData(outlet); }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
  }, [fetchData]);

  useEffect(() => {
    if (!selectedOutlet) return;

    setupRealtime(selectedOutlet);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedOutlet, setupRealtime]);

  return { isLive };
}
