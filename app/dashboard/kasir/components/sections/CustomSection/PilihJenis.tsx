'use client';

import * as Icons from 'lucide-react';
import type { MenuPanelProps } from '../../types';
import type { ProductWithCategory } from '@/lib/types';

export default function PilihJenis(props: MenuPanelProps) {
  const {
    selectedCustomPaket,
    setCustomStep,
    setCustomIsi,
    setCustomJenisMode,
    setCustomModeLabel,
    formatRp,
    products,
  } = props;

  if (!selectedCustomPaket) return null;

  const cp = selectedCustomPaket;
  const diskon =
    (cp.diskon_nominal || 0) > 0
      ? cp.diskon_nominal || 0
      : Math.round(
          (cp.harga_satuan_default * cp.kapasitas) * (cp.diskon_persen || 0) / 100
        );

  const hargaSetelahDiskon = (base: number) =>
    base > 0
      ? Math.max(
          0,
          base -
            ((cp.diskon_nominal || 0) > 0
              ? cp.diskon_nominal || 0
              : Math.round(base * (cp.diskon_persen || 0) / 100))
        )
      : 0;

  // Build mode list dari mode_pricing yang baru (jika ada) atau fallback ke sistem lama
  let modes: {
    id: string;
    label: string;
    desc: string;
    icon: string;
    price: number;
    autoFill: boolean;
  }[] = [];

  console.log('🔍 Debug Custom Template:', {
    nama: cp.nama,
    mode_pricing: cp.mode_pricing,
    mode_pricing_length: cp.mode_pricing?.length || 0,
  });

  if (cp.mode_pricing && cp.mode_pricing.length > 0) {
    console.log('✅ Using new mode pricing system');
    // Gunakan sistem mode pricing yang baru
    modes = cp.mode_pricing
      .filter((mode: any) => mode.is_enabled)
      .map((mode: any) => {
        console.log('📦 Processing mode:', mode);
        return {
          id: mode.mode_config_id || mode.id,
          label: mode.mode_label,
          desc: `Mode ${mode.mode_label} - ${cp.kapasitas} donat`,
          icon: '📦',
          price:
            mode.harga_setelah_diskon > 0
              ? mode.harga_setelah_diskon
              : mode.harga_jual,
          autoFill: false,
        };
      });

    console.log('📋 Generated modes:', modes);

    // TIDAK menambahkan "Pilih Sendiri" - hanya tampilkan mode yang di-setting
  } else {
    console.log('⚠️ Fallback to legacy pricing system');
    // Fallback ke sistem lama jika belum ada mode_pricing
    modes = [
      cp.harga_klasik_full > 0 && {
        id: 'klasik',
        label: 'Full Klasik',
        desc: `Semua ${cp.kapasitas} donat varian Klasik`,
        icon: '⭐',
        price: cp.harga_klasik_full,
        autoFill: false,
      },
      cp.harga_reguler_full > 0 && {
        id: 'reguler',
        label: 'Full Reguler',
        desc: `Semua ${cp.kapasitas} donat varian Reguler`,
        icon: '🍩',
        price: cp.harga_reguler_full,
        autoFill: false,
      },
      cp.harga_premium_full > 0 && {
        id: 'premium',
        label: 'Full Premium',
        desc: `Semua ${cp.kapasitas} donat varian Premium`,
        icon: '👑',
        price: cp.harga_premium_full,
        autoFill: false,
      },
      cp.allow_mix && {
        id: 'mix',
        label: 'Mix Setengah-Setengah',
        desc: `${cp.mix_rasio_reguler || Math.floor(cp.kapasitas / 2)} Reguler + ${
          cp.mix_rasio_premium || Math.ceil(cp.kapasitas / 2)
        } Premium`,
        icon: '🎨',
        price: cp.harga_mix || (cp.harga_reguler_full + cp.harga_premium_full) / 2,
        autoFill: true,
      },
      cp.allow_random && {
        id: 'random',
        label: 'Pilih Acak 🎲',
        desc: 'Sistem pilihkan donat secara random',
        icon: '🎲',
        price: cp.harga_satuan_default * cp.kapasitas,
        autoFill: true,
      },
      {
        id: 'campur',
        label: 'Pilih Sendiri',
        desc: 'Kasir/pelanggan memilih satu per satu',
        icon: '🖐️',
        price: cp.harga_satuan_default * cp.kapasitas,
        autoFill: false,
      },
    ].filter(Boolean) as {
      id: string;
      label: string;
      desc: string;
      icon: string;
      price: number;
      autoFill: boolean;
    }[];
  }

  console.log('🎯 Final modes for kasir:', modes);

  const getFilteredByMode = async (modeId: string): Promise<ProductWithCategory[]> => {
    console.log('🔍 getFilteredByMode called with:', modeId);

    // Untuk mode "campur" (Pilih Sendiri), tampilkan semua produk
    if (modeId === 'campur') {
      const allVariants = products.filter(
        v => v.tipe_produk === 'donat_varian' && v.ukuran === cp.ukuran_donat
      );
      console.log('📦 Mode Campur - showing all variants:', allVariants.length);
      return allVariants;
    }

    // Cari mode config dari mode_pricing
    const selectedMode = cp.mode_pricing?.find(
      (m: any) => (m.mode_config_id === modeId || m.id === modeId) && m.is_enabled
    );

    console.log('📦 Selected mode:', selectedMode);

    if (selectedMode && selectedMode.mode_config_id) {
      // Ambil mode config untuk mendapatkan category_limits
      try {
        const { getCustomModeConfigs } = await import('@/lib/db/products');
        const modeConfigs = await getCustomModeConfigs();
        const modeConfig = modeConfigs.find(mc => mc.id === selectedMode.mode_config_id);

        console.log('📦 Mode config:', modeConfig);

        if (modeConfig && modeConfig.category_limits) {
          // Ambil semua category IDs dari mode config
          const categoryIds = modeConfig.category_limits.map((cl: any) => cl.category_id);
          console.log('📦 Category IDs from mode config:', categoryIds);

          // Filter produk berdasarkan kategori yang diizinkan
          const filtered = products.filter(
            v =>
              v.tipe_produk === 'donat_varian' &&
              v.ukuran === cp.ukuran_donat &&
              categoryIds.includes(v.category_id || '')
          );

          console.log(`📦 Filtered products for mode ${modeId}:`, filtered.length);
          return filtered;
        }
      } catch (error) {
        console.error('Error loading mode config:', error);
      }
    }

    // Fallback ke sistem lama untuk backward compatibility
    const catIdKey = `category_id_${modeId}` as keyof typeof cp;
    const catId = cp[catIdKey] as string | null | undefined;

    const filtered = products.filter(v => {
      if (v.tipe_produk !== 'donat_varian') return false;
      if (v.ukuran !== cp.ukuran_donat) return false;
      if (modeId === 'random' || modeId === 'mix') return true;
      if (catId) return v.category_id === catId;
      return v.category?.nama?.toLowerCase().includes(modeId.toLowerCase()) ?? false;
    });

    console.log(`📦 Fallback filtered products for mode ${modeId}:`, filtered.length);
    return filtered;
  };

  const handlePickMode = async (m: (typeof modes)[0]) => {
    setCustomJenisMode(m.id);
    setCustomModeLabel(m.label);
    setCustomIsi([]);

    if (m.id === 'random') {
      // Auto-fill random dari semua donat (UNIQUE - tidak ada duplikat)
      const pool = await getFilteredByMode('random');
      if (pool.length > 0) {
        const hasil: { productId: string; nama: string }[] = [];
        const availableProducts = [...pool]; // Copy untuk dimanipulasi
        
        for (let i = 0; i < cp.kapasitas; i++) {
          if (availableProducts.length === 0) {
            // Jika produk habis tapi masih kurang, ulangi dari awal
            availableProducts.push(...pool);
          }
          
          // Pilih random dari produk yang tersedia
          const randomIndex = Math.floor(Math.random() * availableProducts.length);
          const pick = availableProducts[randomIndex];
          
          hasil.push({ productId: pick.id, nama: pick.nama });
          
          // Hapus produk yang sudah dipilih agar tidak duplikat
          availableProducts.splice(randomIndex, 1);
        }
        
        setCustomIsi(hasil);
      }
      setCustomStep(cp.enable_tulisan ? 'tulisan' : 'tambahan');
    } else if (m.id === 'mix') {
      // Auto-fill mix: rasio Reguler + Premium (UNIQUE - tidak ada duplikat)
      const jmlReg = cp.mix_rasio_reguler || Math.floor(cp.kapasitas / 2);
      const jmlPrem = cp.mix_rasio_premium || Math.ceil(cp.kapasitas / 2);
      const poolReg = await getFilteredByMode('reguler');
      const poolPrem = await getFilteredByMode('premium');
      const hasil: { productId: string; nama: string }[] = [];
      
      // Ambil random Reguler (unique)
      const availableReg = [...poolReg];
      for (let i = 0; i < jmlReg; i++) {
        if (availableReg.length === 0) {
          // Jika habis, ulangi dari awal
          availableReg.push(...poolReg);
        }
        if (availableReg.length === 0) break; // Safety check
        
        const randomIndex = Math.floor(Math.random() * availableReg.length);
        const pick = availableReg[randomIndex];
        hasil.push({ productId: pick.id, nama: pick.nama });
        availableReg.splice(randomIndex, 1); // Hapus agar tidak duplikat
      }
      
      // Ambil random Premium (unique)
      const availablePrem = [...poolPrem];
      for (let i = 0; i < jmlPrem; i++) {
        if (availablePrem.length === 0) {
          // Jika habis, ulangi dari awal
          availablePrem.push(...poolPrem);
        }
        if (availablePrem.length === 0) break; // Safety check
        
        const randomIndex = Math.floor(Math.random() * availablePrem.length);
        const pick = availablePrem[randomIndex];
        hasil.push({ productId: pick.id, nama: pick.nama });
        availablePrem.splice(randomIndex, 1); // Hapus agar tidak duplikat
      }
      
      setCustomIsi(hasil);
      setCustomStep(cp.enable_tulisan ? 'tulisan' : 'tambahan');
    } else {
      setCustomStep('pilih-rasa');
    }
  };

  return (
    <div>
      <button
        onClick={() => {
          setCustomStep('pilih-paket');
          setCustomIsi([]);
        }}
        className="flex items-center gap-2 text-slate-500 text-sm font-medium mb-5 hover:text-slate-900 transition-colors"
      >
        <Icons.ArrowLeft size={16} /> Kembali
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Pilih Gaya Isian</h3>
          <p className="text-sm text-slate-600 mt-1">
            {cp.kode && <span className="font-semibold mr-2">{cp.kode}</span>}
            {cp.nama} • {cp.kapasitas} pcs
          </p>
        </div>
        {(cp.diskon_persen || 0) > 0 && (
          <span className="ml-auto text-xs font-bold bg-red-100 text-red-600 px-3 py-1 rounded-md">
            Diskon {cp.diskon_persen}%
          </span>
        )}
        {(cp.diskon_nominal || 0) > 0 && (
          <span className="ml-auto text-xs font-bold bg-red-100 text-red-600 px-3 py-1 rounded-md">
            Hemat {formatRp(cp.diskon_nominal || 0)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {modes.map(m => {
          const hargaFinal = hargaSetelahDiskon(m.price);
          const diskonNominal = m.price - hargaFinal;
          return (
            <button
              key={m.id}
              onClick={() => handlePickMode(m)}
              className="flex justify-between items-center p-5 rounded-xl border-2 border-slate-200 hover:border-slate-900 transition-all text-left group bg-white hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Icons.Package size={20} className="text-slate-600" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 group-hover:text-slate-900 transition-colors">
                    {m.label}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                  {m.autoFill && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded mt-1.5 inline-block">
                      Auto-isi
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                {diskonNominal > 0 && (
                  <p className="text-xs text-slate-400 line-through">{formatRp(m.price)}</p>
                )}
                <p className="text-lg font-bold text-slate-900">{formatRp(hargaFinal)}</p>
                {diskonNominal > 0 && (
                  <p className="text-xs text-red-500 font-semibold">
                    Hemat {formatRp(diskonNominal)}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
