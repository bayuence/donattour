'use client';

// ============================================================================
// EXECUTIVE DASHBOARD — DATA HOOK
// ============================================================================
// Fetches /api/dashboard/multi-outlet?start_date=&end_date=&outlet_id=
// Auto-refreshes every 30s and re-fetches instantly when Supabase Realtime
// reports a change on `orders`, `production_daily`, or `expenses`.
// ============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface OutletRow {
  outlet_id: string;
  nama: string;
  omzet: number;
  transactions: number;
  avg_trx: number;
  target: number;
  success: number;
  sold: number;
  waste: number;
  success_rate: number;
  waste_rate: number;
  hpp_sold: number;
  total_loss: number;
  expenses: number;
  margin: number;
  low_stock_count: number;
  last_order_at: string | null;
  active_kasir_count: number;
  status: 'top' | 'aktif' | 'perhatian' | 'tidur';
}

export interface Totals {
  omzet: number;
  transactions: number;
  target: number;
  success: number;
  sold: number;
  waste: number;
  hpp_sold: number;
  total_loss: number;
  expenses: number;
  low_stock_count: number;
  gross_profit: number;
  margin: number;
  avg_trx: number;
  active_outlets: number;
}

export interface TrendPoint {
  date: string;
  omzet: number;
  transactions: number;
  expenses: number;
}

export interface ProductSalesRow {
  product_id: string;
  product_name: string;
  category_id: string | null;
  category_name: string | null;
  qty: number;
  revenue: number;
  hpp_unit: number;
  total_hpp: number;
  total_margin: number;
  margin_percent: number;
}

export interface MultiOutletData {
  range: { start_date: string; end_date: string; days: number };
  outlet_filter: string | null;
  outlet_count: number;
  totals: Totals;
  outlets: OutletRow[];
  trend: TrendPoint[];
  channels: Record<string, { omzet: number; transactions: number }>;
  sales_by_product: ProductSalesRow[];
}

interface UseMultiOutletParams {
  startDate: string;
  endDate: string;
  outletId?: string | null;
}

interface UseMultiOutletResult {
  data: MultiOutletData | null;
  loading: boolean;
  error: string | null;
  isLive: boolean;
  refresh: () => void;
  lastRefreshedAt: Date | null;
}

const POLL_INTERVAL_MS = 30_000;

export function useMultiOutletData(params: UseMultiOutletParams): UseMultiOutletResult {
  const { startDate, endDate, outletId } = params;

  const [data, setData] = useState<MultiOutletData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const inflight = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (inflight.current) inflight.current.abort();
    const controller = new AbortController();
    inflight.current = controller;

    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {};
      try {
        const stored =
          typeof window !== 'undefined' ? localStorage.getItem('donutshop_user') : null;
        if (stored) {
          const u = JSON.parse(stored);
          if (u?.id) headers['x-user-id'] = String(u.id);
          if (u?.role) headers['x-user-role'] = String(u.role);
        }
      } catch {
        /* noop */
      }

      const qs = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });
      if (outletId) qs.set('outlet_id', outletId);

      const res = await fetch(`/api/dashboard/multi-outlet?${qs.toString()}`, {
        signal: controller.signal,
        headers,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || `HTTP ${res.status}`);
      }
      setData(json.data as MultiOutletData);
      setLastRefreshedAt(new Date());
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, outletId]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchData]);

  // Realtime invalidation
  useEffect(() => {
    const channel = (supabase as any)
      .channel(`exec-dashboard-${startDate}-${endDate}-${outletId ?? 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_daily' }, () =>
        fetchData()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () =>
        fetchData()
      )
      .subscribe((status: string) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      try {
        (supabase as any).removeChannel(channel);
      } catch {
        /* noop */
      }
      setIsLive(false);
    };
  }, [startDate, endDate, outletId, fetchData]);

  return { data, loading, error, isLive, refresh: fetchData, lastRefreshedAt };
}
