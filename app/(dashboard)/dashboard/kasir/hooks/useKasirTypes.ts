import type {
  Outlet,
  ProductWithCategory,
  ProductPackage,
  ProductBundling,
  ProductCustomTemplate,
  Product,
  OutletChannelPrice,
  ProductCategory,
  ProductBox,
  PaymentMethodConfig,
  User,
} from '@/lib/types';

export interface CartSatuanItem {
  type: 'satuan';
  id: string;
  varianId: string;
  nama: string;
  jenis: string;
  harga: number;
  qty: number;
  tipe_produk?: string;
  base_product_id?: string | null;
}

export interface CartPaketItem {
  type: 'paket';
  id: string;
  paketId: string;
  namaPaket: string;
  kode?: string;
  kapasitas: number;
  hargaPaket: number;
  hargaNormal: number;
  diskon: number;
  isiDonat: {
    productId: string;
    nama: string;
    ukuran?: string;
    base_product_id?: string | null;
  }[];
  boxNama?: string;
  extras?: { productId: string; nama: string; qty: number; harga: number }[];
}

export interface CartBundlingItem {
  type: 'bundling';
  id: string;
  bundlingId: string;
  nama: string;
  harga: number;
}

export interface CartCustomItem {
  type: 'custom';
  id: string;
  customPaketId: string;
  kode?: string;
  namaPaket: string;
  kapasitas: number;
  ukuranDonat: 'standar' | 'mini';
  jenisMode: string;
  modeLabel: string;
  isiDonat: { productId: string; nama: string }[];
  hargaDonat: number;
  diskon: number;
  mintaTulisan: boolean;
  tambahan: { id: string; nama: string; qty: number; harga: number }[];
  tulisanCoklat: string;
  jumlahPapanCoklat: number;
  totalHarga: number;
}

export interface CartBoxItem {
  type: 'box';
  id: string;
  boxId: string;
  nama: string;
  harga: number;
  qty: number;
}

export type CartItem =
  | CartSatuanItem
  | CartPaketItem
  | CartBundlingItem
  | CartCustomItem
  | CartBoxItem;

export type ActiveSection = 'donat' | 'paket' | 'bundling' | 'custom';

export type {
  Outlet,
  ProductWithCategory,
  ProductPackage,
  ProductBundling,
  ProductCustomTemplate,
  Product,
  OutletChannelPrice,
  ProductCategory,
  ProductBox,
  PaymentMethodConfig,
  User,
};
