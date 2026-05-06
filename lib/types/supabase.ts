/**
 * Supabase Database Type
 * 
 * This type is generated from the database schema
 * For now, we use Database from database.ts as the source of truth
 */

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
} from './database';

export type Database = {
  public: {
    Tables: {
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
        Update: Partial<Omit<InventoryNonTopping, 'id' | 'last_updated'>>;
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
    Views: {
      [_ in never]: never;
    };
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
      user_role: 'admin' | 'owner' | 'manager' | 'bagian_dapur' | 'kasir' | 'closing_staff';
      order_status: 'pending' | 'completed' | 'cancelled';
      payment_status: 'pending' | 'paid' | 'failed';
      alert_severity: 'info' | 'warning' | 'critical';
    };
  };
};
