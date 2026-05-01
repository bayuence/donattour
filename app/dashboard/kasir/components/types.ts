import type { ProductWithCategory, ProductPackage, ProductBundling, ProductCustomTemplate, Product, ProductBox, ProductCategory } from '@/lib/types';
import type { ActiveSection } from '../hooks/useKasir';

export interface JenisGroup extends ProductCategory {
  varian: ProductWithCategory[];
}

export interface MenuPanelProps {
  activeSection: ActiveSection;
  isLoading: boolean;
  jenisGroups: JenisGroup[];
  paketList: ProductPackage[];
  bundlingList: ProductBundling[];
  customList: ProductCustomTemplate[];
  tambahanList: Product[];
  products: ProductWithCategory[];
  boxList: ProductBox[];
  // Cart helpers
  getCartQty: (varianId: string) => number;
  getCartSatuanId: (varianId: string) => string | null;
  getDisplayPrice: (p: ProductWithCategory) => number;
  formatRp: (n: number) => string;
  // Actions
  tambahSatuan: (p: ProductWithCategory) => void;
  updateQty: (id: string, delta: number) => void;
  bukaPaketModal: (p: ProductPackage) => void;
  bukaPaketInline: (p: ProductPackage) => void;
  konfirmasiPaketInline: () => void;
  tambahBundling: (b: ProductBundling) => void;
  tambahManualBox: (bx: ProductBox) => void;
  // Paket inline state
  selectedPaketForInline: ProductPackage | null;
  setSelectedPaketForInline: (p: ProductPackage | null) => void;
  paketInlineIsi: { productId: string; nama: string; ukuran?: string }[];
  setPaketInlineIsi: (items: { productId: string; nama: string; ukuran?: string }[]) => void;
  // Custom flow
  customStep: 'pilih-paket' | 'pilih-jenis' | 'pilih-rasa' | 'tulisan' | 'tambahan';
  setCustomStep: (s: any) => void;
  selectedCustomPaket: ProductCustomTemplate | null;
  setSelectedCustomPaket: (p: ProductCustomTemplate | null) => void;
  customJenisMode: string;
  setCustomJenisMode: (m: any) => void;
  customModeLabel: string;
  setCustomModeLabel: (l: string) => void;
  customIsi: { productId: string; nama: string }[];
  setCustomIsi: (i: { productId: string; nama: string }[]) => void;
  customTambahan: { id: string; nama: string; qty: number; harga: number }[];
  setCustomTambahan: (t: any) => void;
  customTulisan: string;
  setCustomTulisan: (t: string) => void;
  customMintaTulisan: boolean;
  setCustomMintaTulisan: (v: boolean) => void;
  customJumlahPapan: number;
  setCustomJumlahPapan: (n: number) => void;
  konfirmasiCustom: () => void;
  activeColor: string;
}

// Helper functions
export const getActiveColorValues = (color: string) => {
  const map: Record<string, { bg: string, text: string, hoverText: string, hoverBorder: string, border: string, shadow: string, hoverBg: string }> = {
    amber: { bg: 'bg-amber-500', text: 'text-amber-600', hoverText: 'hover:text-amber-600', hoverBorder: 'hover:border-amber-400', border: 'border-amber-200', shadow: 'shadow-amber-500/30', hoverBg: 'hover:bg-amber-500' },
    green: { bg: 'bg-green-500', text: 'text-green-600', hoverText: 'hover:text-green-600', hoverBorder: 'hover:border-green-400', border: 'border-green-200', shadow: 'shadow-green-500/30', hoverBg: 'hover:bg-green-500' },
    orange: { bg: 'bg-orange-500', text: 'text-orange-600', hoverText: 'hover:text-orange-600', hoverBorder: 'hover:border-orange-400', border: 'border-orange-200', shadow: 'shadow-orange-500/30', hoverBg: 'hover:bg-orange-500' },
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', hoverText: 'hover:text-emerald-600', hoverBorder: 'hover:border-emerald-400', border: 'border-emerald-200', shadow: 'shadow-emerald-500/30', hoverBg: 'hover:bg-emerald-500' },
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', hoverText: 'hover:text-blue-600', hoverBorder: 'hover:border-blue-400', border: 'border-blue-200', shadow: 'shadow-blue-500/30', hoverBg: 'hover:bg-blue-500' },
  };
  return map[color] || map['amber'];
};

export const getCategoryColor = (color: string) => {
  const map: Record<string, string> = {
    amber: 'text-amber-600', blue: 'text-blue-600', purple: 'text-purple-600',
    green: 'text-green-600', rose: 'text-rose-600', pink: 'text-pink-600',
    indigo: 'text-indigo-600', emerald: 'text-emerald-600',
  };
  return map[color] || 'text-slate-800';
};

export const getCategoryLineColor = (color: string) => {
  const map: Record<string, string> = {
    amber: 'bg-amber-200', blue: 'bg-blue-200', purple: 'bg-purple-200',
    green: 'bg-green-200', rose: 'bg-rose-200', pink: 'bg-pink-200',
    indigo: 'bg-indigo-200', emerald: 'bg-emerald-200',
  };
  return map[color] || 'bg-slate-200';
};
