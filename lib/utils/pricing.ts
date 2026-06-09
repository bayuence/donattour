/**
 * Pricing Utilities
 * Helper functions for calculating product pricing, margins, and HPP
 */

import type { Product } from '../types';

/**
 * Calculate total HPP for a product
 */
export function calculateHPPTotal(product: Partial<Product>): number {
  if (product.is_donat) {
    const base = product.hpp_base_donat || 0;
    const topping = product.hpp_topping || 0;
    return base + topping;
  }
  return product.hpp_total || product.harga_pokok_penjualan || 0;
}

/**
 * Calculate margin amount (Rp)
 */
export function calculateMarginAmount(hargaJual: number, hppTotal: number): number {
  return hargaJual - hppTotal;
}

/**
 * Calculate margin percentage (%)
 */
export function calculateMarginPercent(hargaJual: number, hppTotal: number): number {
  if (hargaJual <= 0) return 0;
  const margin = hargaJual - hppTotal;
  return Math.round((margin / hargaJual * 100) * 100) / 100; // 2 decimal places
}

/**
 * Auto-calculate all pricing fields for a product
 */
export function calculateProductPricing(product: Partial<Product>): {
  hpp_total: number;
  margin_amount: number;
  margin_percent: number;
} {
  const hppTotal = calculateHPPTotal(product);
  const hargaJual = product.harga_jual || 0;
  const marginAmount = calculateMarginAmount(hargaJual, hppTotal);
  const marginPercent = calculateMarginPercent(hargaJual, hppTotal);

  return {
    hpp_total: hppTotal,
    margin_amount: marginAmount,
    margin_percent: marginPercent,
  };
}

/**
 * Validate product pricing
 */
export function validateProductPricing(product: Partial<Product>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if harga_jual is set
  if (!product.harga_jual || product.harga_jual <= 0) {
    errors.push('Harga jual harus lebih dari 0');
  }

  // If donat, check HPP fields
  if (product.is_donat) {
    if (!product.ukuran_donat) {
      errors.push('Ukuran donat harus dipilih');
    }
    if (!product.hpp_base_donat || product.hpp_base_donat < 0) {
      errors.push('HPP donat polos harus diisi');
    }
    if (product.hpp_topping === undefined || product.hpp_topping < 0) {
      errors.push('HPP topping harus diisi (minimal 0)');
    }
  } else {
    // Non-donat products must have hpp_total
    if (!product.hpp_total && product.hpp_total !== 0) {
      errors.push('HPP total harus diisi');
    }
  }

  // Check margin
  const pricing = calculateProductPricing(product);
  if (pricing.margin_amount < 0) {
    errors.push('Harga jual tidak boleh lebih kecil dari HPP');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format HPP breakdown for display
 */
export function formatHPPBreakdown(product: Product): {
  base?: string;
  topping?: string;
  total: string;
} {
  const rp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

  if (product.is_donat) {
    return {
      base: rp(product.hpp_base_donat || 0),
      topping: rp(product.hpp_topping || 0),
      total: rp((product.hpp_base_donat || 0) + (product.hpp_topping || 0)),
    };
  }

  return {
    total: rp(product.hpp_total || 0),
  };
}

/**
 * Calculate profit for multiple products (e.g., cart, order)
 */
export function calculateOrderProfit(items: Array<{
  product: Product;
  quantity: number;
}>): {
  totalRevenue: number;
  totalHPP: number;
  totalMargin: number;
  marginPercent: number;
} {
  let totalRevenue = 0;
  let totalHPP = 0;

  for (const item of items) {
    const hppTotal = calculateHPPTotal(item.product);
    const revenue = item.product.harga_jual * item.quantity;
    const hpp = hppTotal * item.quantity;

    totalRevenue += revenue;
    totalHPP += hpp;
  }

  const totalMargin = totalRevenue - totalHPP;
  const marginPercent = totalRevenue > 0 ? (totalMargin / totalRevenue * 100) : 0;

  return {
    totalRevenue,
    totalHPP,
    totalMargin,
    marginPercent: Math.round(marginPercent * 100) / 100,
  };
}

/**
 * Get recommended price based on target margin
 */
export function calculateRecommendedPrice(
  hppTotal: number,
  targetMarginPercent: number
): number {
  // Formula: harga_jual = hpp / (1 - margin_percent/100)
  const price = hppTotal / (1 - targetMarginPercent / 100);
  return Math.ceil(price / 100) * 100; // Round up to nearest 100
}

/**
 * Compare pricing between products
 */
export function comparePricing(productA: Product, productB: Product): {
  cheaperHPP: string;
  betterMargin: string;
  recommendation: string;
} {
  const hppA = calculateHPPTotal(productA);
  const hppB = calculateHPPTotal(productB);
  const marginA = calculateMarginPercent(productA.harga_jual, hppA);
  const marginB = calculateMarginPercent(productB.harga_jual, hppB);

  return {
    cheaperHPP: hppA < hppB ? productA.nama : productB.nama,
    betterMargin: marginA > marginB ? productA.nama : productB.nama,
    recommendation: marginA > marginB ? productA.nama : productB.nama,
  };
}
