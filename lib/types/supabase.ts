import type {
  ProductionDaily,
  ProductionWasteDetail,
  InventoryNonTopping,
  ToppingUsage,
  ToppingError,
  DailyClosing,
  ClosingNonToppingStatus,
  ClosingFinishedProduct,
  DailyLossSummary,
} from './production';
import type {
  Product,
  Outlet,
  User,
  ProductCategory,
  ProductBox,
  ProductPackage,
  ProductBundling,
  ProductCustomTemplate,
  CustomModeConfig,
  OutletChannelPrice,
  KasirMenu,
  ReceiptSettings,
  OtrPaket,
  OtrSession,
  OtrTransaksi,
} from '../types';

export type Database = {
  public: {
    Tables: {
      // Core POS tables
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Product>;
      };
      outlets: {
        Row: Outlet;
        Insert: Omit<Outlet, 'id'> & { id?: string };
        Update: Partial<Outlet>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id'> & { id?: string };
        Update: Partial<User>;
      };
      product_categories: {
        Row: ProductCategory;
        Insert: Omit<ProductCategory, 'id'> & { id?: string };
        Update: Partial<ProductCategory>;
      };
      product_boxes: {
        Row: ProductBox;
        Insert: Omit<ProductBox, 'id'> & { id?: string };
        Update: Partial<ProductBox>;
      };
      product_packages: {
        Row: ProductPackage;
        Insert: Omit<ProductPackage, 'id'> & { id?: string };
        Update: Partial<ProductPackage>;
      };
      product_bundling: {
        Row: ProductBundling;
        Insert: Omit<ProductBundling, 'id'> & { id?: string };
        Update: Partial<ProductBundling>;
      };
      product_custom_templates: {
        Row: ProductCustomTemplate;
        Insert: Omit<ProductCustomTemplate, 'id'> & { id?: string };
        Update: Partial<ProductCustomTemplate>;
      };
      custom_mode_config: {
        Row: CustomModeConfig;
        Insert: Omit<CustomModeConfig, 'id'> & { id?: string };
        Update: Partial<CustomModeConfig>;
      };
      outlet_channel_prices: {
        Row: OutletChannelPrice;
        Insert: Omit<OutletChannelPrice, 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<OutletChannelPrice>;
      };
      kasir_menus: {
        Row: KasirMenu;
        Insert: Omit<KasirMenu, 'id'> & { id?: string };
        Update: Partial<KasirMenu>;
      };
      receipt_settings: {
        Row: ReceiptSettings;
        Insert: ReceiptSettings;
        Update: Partial<ReceiptSettings>;
      };
      otr_paket: {
        Row: OtrPaket;
        Insert: Omit<OtrPaket, 'id'> & { id?: string };
        Update: Partial<OtrPaket>;
      };
      otr_sessions: {
        Row: OtrSession;
        Insert: Omit<OtrSession, 'id'> & { id?: string };
        Update: Partial<OtrSession>;
      };
      otr_transaksi: {
        Row: OtrTransaksi;
        Insert: Omit<OtrTransaksi, 'id'> & { id?: string };
        Update: Partial<OtrTransaksi>;
      };
      production_batches: {
        Row: {
          id: string;
          batch_number: string;
          status: string;
          quantity_planned: number;
          quantity_produced: number;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          notes: string | null;
          product_id: string;
          created_by?: string;
        };
        Insert: Omit<Database['public']['Tables']['production_batches']['Row'], 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['production_batches']['Row']>;
      };
      stocks: {
        Row: {
          id: string;
          location_id: string;
          product_id: string;
          quantity: number;
          last_updated_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['stocks']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['stocks']['Row']>;
      };
      inventory_locations: {
        Row: {
          id: string;
          outlet_id: string;
          nama: string;
          tipe: string;
          dikepalai_oleh?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['inventory_locations']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['inventory_locations']['Row']>;
      };
      inventory_movements: {
        Row: {
          id: string;
          location_id: string;
          product_id: string;
          type: string;
          quantity: number;
          created_at?: string;
        };
        Insert: Omit<Database['public']['Tables']['inventory_movements']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['inventory_movements']['Row']>;
      };

      // Production Tracking tables
      production_daily: {
        Row: ProductionDaily;
        Insert: Omit<ProductionDaily, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProductionDaily, 'id' | 'created_at' | 'updated_at'>>;
      };
      production_waste_details: {
        Row: ProductionWasteDetail;
        Insert: Omit<ProductionWasteDetail, 'id' | 'created_at'>;
        Update: Partial<Omit<ProductionWasteDetail, 'id' | 'created_at'>>;
      };
      inventory_non_topping: {
        Row: InventoryNonTopping;
        Insert: Omit<InventoryNonTopping, 'id' | 'last_updated'>;
        Update: Partial<Omit<InventoryNonTopping, 'id'>>;
      };
      topping_usage: {
        Row: ToppingUsage;
        Insert: Omit<ToppingUsage, 'id' | 'created_at'>;
        Update: Partial<Omit<ToppingUsage, 'id' | 'created_at'>>;
      };
      topping_errors: {
        Row: ToppingError;
        Insert: Omit<ToppingError, 'id' | 'created_at'>;
        Update: Partial<Omit<ToppingError, 'id' | 'created_at'>>;
      };
      daily_closing: {
        Row: DailyClosing;
        Insert: Omit<DailyClosing, 'id' | 'created_at'>;
        Update: Partial<Omit<DailyClosing, 'id' | 'created_at'>>;
      };
      closing_non_topping_status: {
        Row: ClosingNonToppingStatus;
        Insert: Omit<ClosingNonToppingStatus, 'id' | 'created_at'>;
        Update: Partial<Omit<ClosingNonToppingStatus, 'id' | 'created_at'>>;
      };
      closing_finished_products: {
        Row: ClosingFinishedProduct;
        Insert: Omit<ClosingFinishedProduct, 'id' | 'created_at'>;
        Update: Partial<Omit<ClosingFinishedProduct, 'id' | 'created_at'>>;
      };
      daily_loss_summary: {
        Row: DailyLossSummary;
        Insert: Omit<DailyLossSummary, 'id' | 'created_at'>;
        Update: Partial<Omit<DailyLossSummary, 'id' | 'created_at'>>;
      };
    };
    Views: {};
    Functions: {
      calculate_daily_loss: {
        Args: {
          p_outlet_id: string;
          p_tanggal: string;
        };
        Returns: {
          production_waste_loss: number;
          topping_error_loss: number;
          non_topping_expired_loss: number;
          finished_product_reject_loss: number;
          total_loss: number;
          total_waste_qty: number;
        };
      };
    };
    Enums: {
      donut_size: 'standar' | 'mini';
      inventory_status: 'fresh' | 'aging' | 'expired' | 'reject';
    };
  };
};
