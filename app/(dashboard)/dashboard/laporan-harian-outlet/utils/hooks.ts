import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { getTodayWIB } from '@/lib/utils/timezone';
import type { Outlet, Product } from '@/lib/types';
import type { DashboardData, ExpenseItem } from '../types';

/** Format Date object to YYYY-MM-DD (local/WIB) */
export function formatDateToYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function useLaporanData(selectedOutlet: Outlet | null, selectedDate?: string) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (outlet: Outlet, dateOverride?: string) => {
    setLoadingData(true);
    setError(null);
    try {
      const today = getTodayWIB();
      // Use provided date override, or the selectedDate from hook param, or today
      const targetDate = dateOverride ?? selectedDate ?? today;
      const isToday = targetDate === today;

      // Fetch products if empty
      if (products.length === 0) {
        const { data: prodData } = await supabase.from('products').select('*').eq('is_active', true);
        if (prodData) setProducts(prodData as Product[]);
      }

      // 1. Fetch dashboard summary (production + sales data)
      const dashRes = await fetch(
        `/api/dashboard/daily?outlet_id=${outlet.id}&date=${targetDate}&_t=${Date.now()}`,
        { cache: 'no-store' }
      );
      const dashJson = await dashRes.json();
      if (dashJson.success && dashJson.data) {
        const data = dashJson.data as DashboardData;

        // Cek status closing secara client-side
        // ✅ FIX: Hanya select 'id' untuk hindari error 406 dari Supabase
        const { data: closingData, error: closingError } = await supabase
          .from('daily_closing')
          .select('id')
          .eq('outlet_id', outlet.id)
          .eq('tanggal', targetDate)
          .limit(1)
          .maybeSingle(); // ✅ Gunakan maybeSingle() bukan single() untuk hindari error jika tidak ada data

        if (closingError && closingError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, itu OK
          console.error('Error checking closing status:', closingError);
        }

        const isKasirLocked = isToday ? !!closingData : false; // Closing actions only relevant for today
        const hasFinalClosing = !!closingData;

        data.has_closing = hasFinalClosing;
        data.is_kasir_locked = isKasirLocked;
        setDashboardData(data);
      }

      // 2. Fetch expenses directly via supabase client (realtime-ready)
      const { data: expData, error: expErr } = await (supabase as any)
        .from('expenses')
        .select('id, kategori, keterangan, jumlah, receipt_url, created_at')
        .eq('outlet_id', outlet.id)
        .eq('tanggal', targetDate)
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
  }, []);

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
  fetchData: (outlet: Outlet) => void,
  isToday: boolean = true
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'channel_stock_deductions', filter: `outlet_id=eq.${outlet.id}` },
        () => { fetchData(outlet); }
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
  }, [fetchData]);

  useEffect(() => {
    if (!selectedOutlet || !isToday) {
      // Teardown any existing channel when not viewing today
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsLive(false);
      }
      return;
    }

    setupRealtime(selectedOutlet);

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [selectedOutlet, setupRealtime, isToday]);

  return { isLive };
}
