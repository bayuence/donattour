import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { getTodayWIB } from '@/lib/utils/timezone'; // ✅ WIB

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const date = searchParams.get('date') || getTodayWIB(); // ✅ WIB bukan UTC
    const outletId = searchParams.get('outlet_id');

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_DATE', message: 'Format tanggal harus YYYY-MM-DD' } },
        { status: 400 }
      );
    }

    // Build outlet filter
    const outletFilter = outletId ? { outlet_id: outletId } : {};

    // Parallel data fetching for performance
    const [
      productionData,
      salesData,
      lossData,
      toppingErrorsData,
      closingData,
      expensesData,
      channelDeductionsData,
    ] = await Promise.all([
      // 1. Production data
      supabase
        .from('production_daily')
        .select('*, outlets(nama)')
        .match({ ...outletFilter, tanggal: date }),

      // 2. Sales data (orders for the day)
      supabase
        .from('orders')
        .select(`
          *,
          order_items(*, products(nama, harga_pokok_penjualan, ukuran, category_id, category:product_categories(nama))),
          outlets(nama)
        `)
        .match(outletFilter)
        .gte('created_at', `${date}T00:00:00`)
        .lte('created_at', `${date}T23:59:59`)
        .eq('status', 'completed'),

      // 3. Loss summary
      supabase
        .from('daily_loss_summary')
        .select('*')
        .match({ ...outletFilter, tanggal: date }),

      // 4. Topping errors
      supabase
        .from('topping_errors')
        .select('*')
        .match(outletFilter)
        .gte('reported_at', `${date}T00:00:00`)
        .lte('reported_at', `${date}T23:59:59`),

      // 5. Closing data
      supabase
        .from('daily_closing')
        .select(`
          *,
          closing_non_topping_status(*),
          closing_finished_products(*)
        `)
        .match({ ...outletFilter, tanggal: date }),

      // 6. Expenses data
      supabase
        .from('expenses')
        .select('id, kategori, keterangan, jumlah, receipt_url, created_at')
        .match({ ...outletFilter, tanggal: date }),

      // 7. Channel stock deductions (WIB)
      supabase
        .from('channel_stock_deductions')
        .select('qty')
        .match(outletFilter)
        .gte('created_at', `${date}T00:00:00+07:00`)
        .lte('created_at', `${date}T23:59:59+07:00`),
    ]);

    // Check for errors
    if (productionData.error) {
      console.error('Production data error:', productionData.error);
      throw new Error(`Production data error: ${productionData.error.message}`);
    }
    if (salesData.error) {
      console.error('Sales data error:', salesData.error);
      throw new Error(`Sales data error: ${salesData.error.message}`);
    }
    if (lossData.error) {
      console.error('Loss data error:', lossData.error);
      throw new Error(`Loss data error: ${lossData.error.message}`);
    }
    if (toppingErrorsData.error) {
      console.error('Topping errors data error:', toppingErrorsData.error);
      throw new Error(`Topping errors data error: ${toppingErrorsData.error.message}`);
    }
    if (closingData.error) {
      console.error('Closing data error:', closingData.error);
      throw new Error(`Closing data error: ${closingData.error.message}`);
    }
    if (expensesData.error) {
      console.error('Expenses data error:', expensesData.error);
      throw new Error(`Expenses data error: ${expensesData.error.message}`);
    }
    if (channelDeductionsData.error) {
      console.error('Channel deductions error:', channelDeductionsData.error);
      throw new Error(`Channel deductions error: ${channelDeductionsData.error.message}`);
    }

    // Calculate financial summary
    const production = productionData.data || [];
    const sales = salesData.data || [];
    const loss = lossData.data?.[0] || null;

    // Calculate omzet (revenue)
    const omzet = sales.reduce((sum, order) => sum + ((order as any).total_amount || 0), 0);

    // Fetch products with category names to calculate average HPP for channel deductions
    const { data: allProducts, error: allProductsError } = await supabase
      .from('products')
      .select('id, nama, hpp_total, harga_pokok_penjualan, ukuran, category:product_categories(nama)')
      .eq('is_active', true);

    if (allProductsError) {
      console.error('Error fetching products for HPP calculation:', allProductsError);
    }

    // Calculate channel deductions HPP
    const totalChannelDeductionsHpp = (channelDeductionsData.data || []).reduce((sum, d) => {
      const matchingProducts = (allProducts || []).filter((p: any) => {
        const pSize = p.ukuran || 'standar';
        const pCatName = p.category?.nama || '';
        return pSize === d.ukuran && pCatName.toLowerCase() === (d.kategori || '').toLowerCase();
      });

      if (matchingProducts.length === 0) {
        const sizeFallbackProducts = (allProducts || []).filter((p: any) => (p.ukuran || 'standar') === d.ukuran);
        if (sizeFallbackProducts.length > 0) {
          const avgHpp = sizeFallbackProducts.reduce((s, p: any) => s + Number(p.hpp_total ?? p.harga_pokok_penjualan ?? 0), 0) / sizeFallbackProducts.length;
          return sum + (avgHpp * (d.qty || 0));
        }
        return sum + (4500 * (d.qty || 0)); // hard fallback
      }

      const avgHpp = matchingProducts.reduce((s, p: any) => s + Number(p.hpp_total ?? p.harga_pokok_penjualan ?? 0), 0) / matchingProducts.length;
      return sum + (avgHpp * (d.qty || 0));
    }, 0);

    // Calculate HPP sold
    const cashierHppSold = sales.reduce((sum, order) => {
      const orderHpp = ((order as any).order_items || []).reduce((itemSum: number, item: any) => {
        return itemSum + (Number(item.products?.hpp_total ?? item.products?.harga_pokok_penjualan ?? 0) * (item.quantity || item.qty || 0));
      }, 0);
      return sum + orderHpp;
    }, 0);

    const hppSold = cashierHppSold + totalChannelDeductionsHpp;

    // Total loss from loss summary
    const totalLoss = (loss as any)?.total_loss || 0;

    // Calculate gross profit
    const grossProfit = omzet - hppSold;

    // Calculate margin
    const margin = omzet > 0 ? ((grossProfit / omzet) * 100) : 0;

    // Calculate production & sales metrics
    const totalTarget = production.reduce((sum, p) => sum + ((p as any).target_qty || 0), 0);
    const totalSuccess = production.reduce((sum, p) => sum + ((p as any).success_qty || 0), 0);
    const totalWaste = production.reduce((sum, p) => sum + ((p as any).waste_qty || 0), 0);

    // Calculate total sold (from order items)
    // ✅ FIX v3: Hitung donat berdasarkan ukuran (standar/mini), bukan tipe_produk
    // 
    // Logika:
    // 1. Hitung hanya item yang punya ukuran (donat) → HITUNG
    // 2. Skip item tanpa ukuran (paket nama, custom nama, box, tambahan) → SKIP
    // 3. Donat dalam paket/custom punya product_id dan ukuran, tapi subtotal = 0 → TETAP HITUNG
    //
    // PENTING: Field tipe_produk TIDAK ADA di tabel order_items!
    // Kita harus JOIN ke products untuk dapat ukuran.
    const totalSold = sales.reduce((sum, order) => {
      return sum + ((order as any).order_items || []).reduce((itemSum: number, item: any) => {
        // Cek apakah item ini adalah donat (punya ukuran)
        const ukuran = item.products?.ukuran; // 'standar' atau 'mini'
        
        // Hitung HANYA donat (yang punya ukuran dari JOIN products)
        if (ukuran) {
          return itemSum + (item.quantity || item.qty || 0);
        }
        
        return itemSum;
      }, 0);
    }, 0);

    // Calculate channel deductions
    const totalChannelDeductions = (channelDeductionsData.data || []).reduce((sum, d) => sum + (d.qty || 0), 0);

    // Calculate remaining (from closing data or dynamic calculation if open)
    const hasClosing = (closingData.data || []).length > 0;
    let totalRemaining = 0;
    if (hasClosing) {
      totalRemaining = (closingData.data || []).reduce((sum, closing) => {
        const nonToppingRemaining = ((closing as any).closing_non_topping_status || []).reduce(
          (ntSum: number, nt: any) => ntSum + (nt.qty_fresh || 0) + (nt.qty_aging || 0),
          0
        );
        const finishedRemaining = ((closing as any).closing_finished_products || []).reduce(
          (fpSum: number, fp: any) => fpSum + (fp.qty_fresh || 0) + (fp.qty_aging || 0),
          0
        );
        return sum + nonToppingRemaining + finishedRemaining;
      }, 0);
    } else {
      totalRemaining = Math.max(0, totalSuccess - totalSold - totalChannelDeductions);
    }

    // Calculate rates
    // ✅ FIX: Success Rate = Sold / Success (bukan Sold / Target)
    // Success Rate menunjukkan % dari donat yang berhasil diproduksi yang kemudian terjual
    const successRate = totalSuccess > 0 ? ((totalSold / totalSuccess) * 100) : 0;
    const wasteRate = totalTarget > 0 ? ((totalWaste / totalTarget) * 100) : 0;
    const soldRate = totalSuccess > 0 ? ((totalSold / totalSuccess) * 100) : 0;
    const remainingRate = totalSuccess > 0 ? ((totalRemaining / totalSuccess) * 100) : 0;

    // Loss breakdown by category
    const lossBreakdown = {
      production_waste: {
        amount: (loss as any)?.production_waste_loss || 0,
        percentage: totalLoss > 0 ? (((loss as any)?.production_waste_loss || 0) / totalLoss * 100) : 0,
      },
      topping_error: {
        amount: (loss as any)?.topping_error_loss || 0,
        percentage: totalLoss > 0 ? (((loss as any)?.topping_error_loss || 0) / totalLoss * 100) : 0,
      },
      non_topping_expired: {
        amount: (loss as any)?.non_topping_expired_loss || 0,
        percentage: totalLoss > 0 ? (((loss as any)?.non_topping_expired_loss || 0) / totalLoss * 100) : 0,
      },
      finished_product_reject: {
        amount: (loss as any)?.finished_product_reject_loss || 0,
        percentage: totalLoss > 0 ? (((loss as any)?.finished_product_reject_loss || 0) / totalLoss * 100) : 0,
      },
    };

    // Sales by product/flavor
    // ✅ FIX: Skip item tanpa product_id atau dengan subtotal = 0
    // Item seperti "header paket", "header custom", dan donat isi paket (subtotal=0)
    // tidak perlu ditampilkan di performa produk
    const salesByProduct: Record<string, { qty: number; revenue: number; product_name: string; category_id: string | null; category_name: string | null }> = {};
    
    sales.forEach((order) => {
      ((order as any).order_items || []).forEach((item: any) => {
        const productId = item.product_id;
        const productName = item.product_name || item.products?.nama || '';
        const subtotal = item.subtotal || 0;
        const categoryId = item.products?.category_id || null;
        const categoryName = item.products?.category?.nama || null;
        
        // ✅ Skip item dengan kondisi:
        // 1. product_id NULL (header paket/custom/box)
        // 2. subtotal = 0 (donat isi paket/custom)
        // 3. product_name kosong
        if (!productId || subtotal <= 0 || !productName) {
          return; // Skip
        }
        
        if (!salesByProduct[productId]) {
          salesByProduct[productId] = {
            product_name: productName,
            category_id: categoryId,
            category_name: categoryName,
            qty: 0,
            revenue: 0,
          };
        }
        
        salesByProduct[productId].qty += (item.quantity || item.qty || 0);
        salesByProduct[productId].revenue += subtotal;
      });
    });

    // Convert to array and sort by qty
    const salesByProductArray = Object.entries(salesByProduct)
      .map(([productId, data]) => ({
        product_id: productId,
        product_name: data.product_name,
        category_id: data.category_id,
        category_name: data.category_name,
        qty: data.qty,
        revenue: data.revenue,
        percentage: totalSold > 0 ? ((data.qty / totalSold) * 100) : 0,
      }))
      .sort((a, b) => b.qty - a.qty);

    // Calculate Transaction Count & Payment Methods
    const transactionCount = sales.length;
    const averageOrderValue = transactionCount > 0 ? omzet / transactionCount : 0;

    // ✅ SOLUSI SEDERHANA: Tidak perlu query payment_methods table
    // Langsung map payment_method/payment_method_detail ke nama yang benar
    const paymentMethodsMap: Record<string, { count: number, total: number }> = {
      'Tunai': { count: 0, total: 0 },
      'QRIS': { count: 0, total: 0 },
      'Transfer': { count: 0, total: 0 },
      'GoPay': { count: 0, total: 0 },
      'OVO': { count: 0, total: 0 },
      'ShopeePay': { count: 0, total: 0 },
    };
    
    let unmappedPaymentCount = 0;
    let unmappedPaymentTotal = 0;
    
    // Helper untuk cek UUID
    const isUuid = (s: string) => {
      return !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    };
    
    // Helper untuk normalize payment method name
    const normalizePaymentMethod = (rawMethod: string | null | undefined, rawDetail: string | null | undefined): string => {
      // 1. Cek payment_method_detail dulu (prioritas tertinggi)
      if (rawDetail && !isUuid(rawDetail)) {
        return rawDetail.trim();
      }
      
      // 2. Hardcode mapping untuk payment_method umum
      const methodLower = (rawMethod || '').toLowerCase().trim();
      
      if (methodLower === 'cash' || methodLower === 'tunai') return 'Tunai';
      if (methodLower === 'qris') return 'QRIS';
      if (methodLower === 'transfer' || methodLower === 'bank_transfer') return 'Transfer';
      if (methodLower === 'gopay') return 'GoPay';
      if (methodLower === 'ovo') return 'OVO';
      if (methodLower === 'shopeepay' || methodLower === 'shopee') return 'ShopeePay';
      
      // 3. Jika payment_method bukan UUID, pakai langsung (capitalize first letter)
      if (rawMethod && !isUuid(rawMethod)) {
        return rawMethod.charAt(0).toUpperCase() + rawMethod.slice(1).toLowerCase();
      }
      
      // 4. Fallback
      return 'Lainnya';
    };

    // Aggregate sales by payment method
    sales.forEach((order) => {
      const rawMethod = (order as any).payment_method;
      const rawDetail = (order as any).payment_method_detail;
      const amount = (order as any).total_amount || 0;
      
      const methodName = normalizePaymentMethod(rawMethod, rawDetail);
      
      console.log(`💳 [PAYMENT] Raw: method="${rawMethod}" detail="${rawDetail}" → Normalized: "${methodName}" | Amount: Rp ${amount.toLocaleString('id-ID')}`);
      
      // Increment count
      if (paymentMethodsMap[methodName]) {
        paymentMethodsMap[methodName].count += 1;
        paymentMethodsMap[methodName].total += amount;
      } else {
        // Tidak ada di map → masuk Lainnya
        if (methodName === 'Lainnya') {
          unmappedPaymentCount += 1;
          unmappedPaymentTotal += amount;
        } else {
          // Buat entry baru untuk metode yang tidak dikenal
          paymentMethodsMap[methodName] = { count: 1, total: amount };
        }
      }
    });

    // Build payment methods array - HANYA tampilkan yang ada transaksi
    const paymentMethodsArray = Object.entries(paymentMethodsMap)
      .map(([method, data]) => ({
        method,
        count: data.count,
        total: data.total
      }))
      .filter(pm => pm.count > 0 || pm.total > 0); // ✅ Filter hanya yang ada transaksi

    // Add unmapped payments if any
    if (unmappedPaymentCount > 0) {
      paymentMethodsArray.push({
        method: 'Lainnya',
        count: unmappedPaymentCount,
        total: unmappedPaymentTotal
      });
    }

    // ✅ Tambahkan Total di akhir (jika ada transaksi)
    if (paymentMethodsArray.length > 0) {
      const totalPaymentCount = paymentMethodsArray.reduce((sum, pm) => sum + pm.count, 0);
      const totalPaymentAmount = paymentMethodsArray.reduce((sum, pm) => sum + pm.total, 0);
      
      paymentMethodsArray.push({
        method: '─── TOTAL ───',
        count: totalPaymentCount,
        total: totalPaymentAmount,
      });
    }

    // Return structured response
    return NextResponse.json({
      success: true,
      data: {
        date,
        outlet_id: outletId,
        financial_summary: {
          omzet,
          hpp_sold: hppSold,
          total_loss: totalLoss,
          gross_profit: grossProfit,
          margin: Math.round(margin * 100) / 100, // Round to 2 decimals
        },
        production_sales: {
          target: totalTarget,
          success: totalSuccess,
          waste: totalWaste,
          sold: totalSold,
          remaining: totalRemaining,
          channel_deductions: totalChannelDeductions,
          channel_deductions_hpp: totalChannelDeductionsHpp,
          success_rate: Math.round(successRate * 100) / 100,
          waste_rate: Math.round(wasteRate * 100) / 100,
          sold_rate: Math.round(soldRate * 100) / 100,
          remaining_rate: Math.round(remainingRate * 100) / 100,
        },
        loss_breakdown: lossBreakdown,
        sales_by_product: salesByProductArray,
        payment_methods: paymentMethodsArray,
        transaction_count: transactionCount,
        average_order_value: averageOrderValue,
        total_waste_qty: (loss as any)?.total_waste_qty || 0,
        has_closing: (closingData.data || []).length > 0,
      },
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Gagal mengambil data dashboard',
          details: error instanceof Error ? error.stack : undefined,
        },
      },
      { status: 500 }
    );
  }
}
