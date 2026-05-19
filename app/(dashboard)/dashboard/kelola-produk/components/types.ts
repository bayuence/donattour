import type {
  ProductWithCategory,
  ProductCategory,
  ProductBox,
  ProductPackage,
  ProductBundling,
  ProductCustomTemplate,
  Outlet,
  KasirMenu,
  CustomModeConfig,
} from '@/lib/types';

// Shared props for all tabs
export interface BaseTabProps {
  outlet: Outlet;
  refreshData: () => Promise<void>;
}

// Tab-specific props
export interface TabKategoriProps extends BaseTabProps {
  jenisList: ProductCategory[];
}

export interface TabVarianProps extends BaseTabProps {
  varianList: ProductWithCategory[];
  jenisList: ProductCategory[];
  kasirMenus: KasirMenu[];
}

export interface TabBoxProps extends BaseTabProps {
  boxList: ProductBox[];
}

export interface TabPaketProps extends BaseTabProps {
  paketList: ProductPackage[];
  boxList: ProductBox[];
  jenisList: ProductCategory[];
  varianList: ProductWithCategory[];
  tambahanList: ProductWithCategory[];
  kasirMenus: KasirMenu[];
}

export interface TabBundlingProps extends BaseTabProps {
  bundlingList: ProductBundling[];
}

export interface TabCustomProps extends BaseTabProps {
  customPaketList: ProductCustomTemplate[];
}

export interface TabTambahanProps extends BaseTabProps {
  tambahanList: ProductWithCategory[];
}

export interface TabBiayaLainnyaProps extends BaseTabProps {
  biayaEkstraList: ProductWithCategory[];
}

export interface TabKasirMenuProps extends BaseTabProps {
  kasirMenus: KasirMenu[];
}

// Helper functions
export const formatRp = (n: number): string => {
  if (isNaN(n) || n === null || n === undefined) return 'Rp 0';
  return 'Rp ' + n.toLocaleString('id-ID');
};

export const formatPercent = (n: number): string => {
  if (isNaN(n) || n === null || n === undefined) return '0%';
  return n.toFixed(1) + '%';
};

// Tab type
export type TabType =
  | 'kasir-menu'
  | 'jenis'
  | 'varian'
  | 'box'
  | 'paket'
  | 'bundling'
  | 'custom'
  | 'tambahan'
  | 'biaya-lainnya';

// Tab configuration
export const TAB_CONFIG = [
  { id: 'kasir-menu', label: 'Kasir Menu', icon: 'LayoutGrid' },
  { id: 'varian', label: 'Varian Donat', icon: 'CircleDot' },
  { id: 'jenis', label: 'Kategori', icon: 'Tags' },
  { id: 'box', label: 'Box & Kemasan', icon: 'Package' },
  { id: 'paket', label: 'Paket', icon: 'Boxes' },
  { id: 'bundling', label: 'Bundling', icon: 'Gift' },
  { id: 'custom', label: 'Custom', icon: 'Palette' },
  { id: 'tambahan', label: 'Tambahan', icon: 'PlusSquare' },
  { id: 'biaya-lainnya', label: 'Biaya Lainnya', icon: 'Receipt' },
] as const;
