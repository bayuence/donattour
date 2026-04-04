'use client';

import { useState, useEffect } from 'react';
import * as db from '@/lib/db';
import type { ProductWithCategory, OutletChannelPrice, ChannelType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Save, AlertCircle, ShoppingBag, Truck, Smartphone } from 'lucide-react';

export default function MenuManagementTab({ outletId }: { outletId: string }) {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [channelPrices, setChannelPrices] = useState<OutletChannelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local state to keep track of modifications before saving
  const [draftPrices, setDraftPrices] = useState<Record<string, Record<ChannelType, { harga_jual: number; is_active: boolean }>>>({});

  const channels: { id: ChannelType; label: string; icon: any }[] = [
    { id: 'toko', label: 'Toko (Offline)', icon: ShoppingBag },
    { id: 'otr', label: 'Mobil OTR', icon: Truck },
    { id: 'gofood', label: 'GoFood', icon: Smartphone },
    { id: 'shopeefood', label: 'ShopeeFood', icon: Smartphone },
    { id: 'grabfood', label: 'GrabFood', icon: Smartphone },
  ];

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [prods, prices] = await Promise.all([
        db.getProducts(),
        db.getOutletChannelPrices(outletId)
      ]);
      setProducts(prods);
      setChannelPrices(prices);
      
      // Initialize draft state
      const initialDraft: Record<string, Record<ChannelType, { harga_jual: number; is_active: boolean }>> = {};
      
      prods.forEach(p => {
        initialDraft[p.id] = {} as Record<ChannelType, { harga_jual: number; is_active: boolean }>;
        channels.forEach(ch => {
          // Find if there's an existing override
          const override = prices.find(price => price.product_id === p.id && price.channel === ch.id);
          initialDraft[p.id][ch.id] = {
            harga_jual: override ? override.harga_jual : p.harga_jual,
            is_active: override ? override.is_active : p.is_active // By default follow master
          };
        });
      });
      
      setDraftPrices(initialDraft);
      setLoading(false);
    }
    
    if (outletId) loadData();
  }, [outletId]);

  const handlePriceChange = (productId: string, channel: ChannelType, field: 'harga_jual' | 'is_active', value: any) => {
    setDraftPrices(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [channel]: {
          ...prev[productId][channel],
          [field]: value
        }
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    let successCount = 0;
    
    // We only want to save things that actually changed or all of them
    // For simplicity, we loop through the draft and upsert everything to Supabase.
    // In a real heavy app, we'd diff it first.
    for (const [productId, channelData] of Object.entries(draftPrices)) {
      for (const [channel, data] of Object.entries(channelData)) {
        const payload = {
          outlet_id: outletId,
          product_id: productId,
          channel: channel as ChannelType,
          harga_jual: data.harga_jual,
          is_active: data.is_active
        };
        const ok = await db.upsertOutletChannelPrice(payload);
        if (ok) successCount++;
      }
    }
    
    alert(`Berhasil menyimpan ${successCount} konfigurasi channel.`);
    setSaving(false);
  };

  if (loading) {
    return <div className="py-20 text-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">Konfigurasi Harga & Menu Multichannel</h3>
          <p className="text-gray-500 text-sm">Sesuaikan ketersediaan menu dan harga untuk setiap platform penjualan di outlet ini.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-lg border border-orange-600">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
        </Button>
      </div>

      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl mb-8 flex items-start gap-3 border border-yellow-200">
        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="text-sm">
          <p className="font-bold mb-1">Catatan Make-To-Order (JIT)</p>
          <p>Jika produk Varian (misal: Donat Coklat) diaktifkan, pastikan stok harian <strong>Donat Polos</strong> (bahan dasarnya) selalu diperbarui karena pembeli di kasir akan otomatis memotong sisa persediaan Donat Polos saat struk dicetak.</p>
        </div>
      </div>

      <div className="space-y-12">
        {products.length === 0 && (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed">
            <ShoppingBag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-600">Belum ada produk di database.</p>
            <p className="text-xs text-gray-500">Silakan tambahkan produk master di Kelola Produk terlebih dahulu.</p>
          </div>
        )}
        
        {products.length > 0 && products.map(p => p.category?.nama || 'Tanpa Kategori').filter((val, i, arr) => arr.indexOf(val) === i).map((catName) => (
          <div key={catName} className="space-y-4">
            <h4 className="font-extrabold text-lg text-gray-800 border-b-2 border-gray-100 pb-2">{catName}</h4>
            
            <div className="grid grid-cols-1 gap-6">
              {products.filter(p => (p.category?.nama || 'Tanpa Kategori') === catName).map(product => (
                <div key={product.id} className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h5 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        {product.nama}
                        {product.tipe_produk === 'donat_base' && <span className="text-[10px] uppercase bg-gray-100 text-gray-600 px-2 py-1 rounded font-bold tracking-wider">Base Material</span>}
                      </h5>
                      <p className="text-xs text-gray-400">Harga Master Pusat: Rp {product.harga_jual.toLocaleString('id-ID')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {channels.map(ch => {
                      const Icon = ch.icon;
                      const draft = draftPrices[product.id]?.[ch.id] || { harga_jual: product.harga_jual, is_active: product.is_active };
                      
                      return (
                        <div key={ch.id} className={`p-3 rounded-xl border flex flex-col gap-3 transition-colors ${draft.is_active ? 'bg-orange-50/30 border-orange-200' : 'bg-gray-50 border-gray-200 opacity-70'}`}>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                              <Icon className="w-3.5 h-3.5" />
                              {ch.label}
                            </div>
                            
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={draft.is_active}
                                onChange={(e) => handlePriceChange(product.id, ch.id, 'is_active', e.target.checked)}
                              />
                              <div className="w-7 h-4 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-orange-500"></div>
                            </label>
                          </div>

                          <div>
                            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Harga Jual (Rp)</label>
                            <input 
                              type="number" 
                              disabled={!draft.is_active}
                              value={draft.harga_jual}
                              onChange={(e) => handlePriceChange(product.id, ch.id, 'harga_jual', parseInt(e.target.value) || 0)}
                              className={`w-full text-sm font-semibold rounded-lg border px-2.5 py-1.5 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all ${!draft.is_active ? 'bg-gray-100 text-gray-400' : 'bg-white'}`}
                            />
                          </div>

                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
