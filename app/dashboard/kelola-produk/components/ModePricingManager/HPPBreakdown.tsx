'use client';

import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import type { CustomModeConfig } from '@/lib/types';
import { formatRp } from '../types';

interface Props {
  ukuranDonat: 'standar' | 'mini';
  kapasitas: number;
  modeConfig: CustomModeConfig;
  categories: { id: string; nama: string }[];
}

export function HPPBreakdown({ ukuranDonat, kapasitas, modeConfig, categories }: Props) {
  const [hppData, setHppData] = useState<{
    categoryBreakdown: Array<{
      categoryName: string;
      hppPolos: number;
      hppTopping: number;
      hppPerDonat: number;
      productName: string;
      slots: number;
    }>;
    totalHPP: number;
    loading: boolean;
    error: string | null;
  }>({
    categoryBreakdown: [],
    totalHPP: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchHPPData = async () => {
      try {
        setHppData(prev => ({ ...prev, loading: true, error: null }));

        const { getAllProducts } = await import('@/lib/db');
        const allProducts = await getAllProducts();

        const categoryBreakdown: Array<{
          categoryName: string;
          hppPolos: number;
          hppTopping: number;
          hppPerDonat: number;
          productName: string;
          slots: number;
        }> = [];

        let totalHPP = 0;
        let totalSlots = 0;

        // Process each category in the mode
        for (const categoryLimit of modeConfig.category_limits || []) {
          const categoryName =
            categories.find(c => c.id === categoryLimit.category_id)?.nama || 'Unknown';
          const maxSlots =
            ukuranDonat === 'mini' ? categoryLimit.max_mini : categoryLimit.max_reguler;

          // Find products in this specific category with matching ukuran
          const categoryProducts = allProducts.filter(
            p =>
              p.category_id === categoryLimit.category_id &&
              p.ukuran === ukuranDonat &&
              p.is_active &&
              ((p.harga_pokok_penjualan || 0) > 0 || p.biaya_topping > 0)
          );

          if (categoryProducts.length > 0) {
            const product = categoryProducts[0]; // Use first valid product
            const hppPolos = product.harga_pokok_penjualan || 0;
            const hppTopping = product.biaya_topping || 0;
            const hppPerDonat = hppPolos + hppTopping;
            const slotsToFill = Math.min(maxSlots, kapasitas - totalSlots);
            const categoryHPP = slotsToFill * hppPerDonat;

            categoryBreakdown.push({
              categoryName,
              hppPolos,
              hppTopping,
              hppPerDonat,
              productName: product.nama,
              slots: slotsToFill,
            });

            totalHPP += categoryHPP;
            totalSlots += slotsToFill;
          } else {
            // No products found in this category
            categoryBreakdown.push({
              categoryName,
              hppPolos: 0,
              hppTopping: 0,
              hppPerDonat: 0,
              productName: '',
              slots: 0,
            });
          }

          if (totalSlots >= kapasitas) break;
        }

        setHppData({
          categoryBreakdown,
          totalHPP,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching HPP data:', error);
        setHppData(prev => ({
          ...prev,
          loading: false,
          error: 'Error mengambil data HPP',
        }));
      }
    };

    if (modeConfig.category_limits && modeConfig.category_limits.length > 0) {
      fetchHPPData();
    } else {
      setHppData({
        categoryBreakdown: [],
        totalHPP: 0,
        loading: false,
        error: 'Mode belum dikonfigurasi kategori',
      });
    }
  }, [ukuranDonat, kapasitas, modeConfig, categories]);

  if (hppData.loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Icons.Loader2 size={12} className="animate-spin" />
        Memuat data HPP per kategori...
      </div>
    );
  }

  if (hppData.error) {
    return <div className="text-xs text-red-500">⚠️ {hppData.error}</div>;
  }

  if (hppData.categoryBreakdown.length === 0) {
    return <div className="text-xs text-slate-400 italic">⚠️ Mode belum dikonfigurasi kategori</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-[10px] text-slate-600 font-medium mb-2">
        📊 HPP per Kategori ({ukuranDonat}):
      </div>

      {hppData.categoryBreakdown.map((category, index) => (
        <div key={index} className="border border-slate-200 rounded-lg p-2 bg-white">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-slate-700">📦 {category.categoryName}</span>
            <span className="text-[10px] text-slate-500">{category.slots} slot</span>
          </div>

          {category.productName ? (
            <>
              <div className="text-[9px] text-slate-500 mb-1">
                Data dari: <span className="font-medium">{category.productName}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[9px] mb-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">HPP Polos:</span>
                  <span className="font-semibold">{formatRp(category.hppPolos)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">HPP Topping:</span>
                  <span className="font-semibold">{formatRp(category.hppTopping)}</span>
                </div>
              </div>

              <div className="flex justify-between text-[10px] font-medium border-t border-slate-100 pt-1">
                <span>HPP per donat:</span>
                <span className="text-red-600">{formatRp(category.hppPerDonat)}</span>
              </div>
            </>
          ) : (
            <div className="text-[9px] text-red-500 italic">
              ⚠️ Tidak ada produk {ukuranDonat} dengan HPP valid
            </div>
          )}
        </div>
      ))}

      <div className="border-t-2 border-slate-300 pt-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-slate-700">Total HPP ({kapasitas} pcs):</span>
          <span className="text-red-600">{formatRp(hppData.totalHPP)}</span>
        </div>
      </div>

      <div className="text-[8px] text-slate-400 italic mt-1">
        💡 Formula: (HPP Polos + HPP Topping) × Slot per kategori
      </div>
    </div>
  );
}
