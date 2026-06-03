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
          order_items(*, products(nama, harga_pokok_penjualan, ukuran)),
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

    // Calculate financial summary
    const production = productionData.data || [];
    const sales = salesData.data || [];
    const loss = lossData.data?.[0] || null;

    // Calculate omzet (revenue)
    const omzet = sales.reduce((sum, order) => sum + ((order as any).total_amount || 0), 0);

    // Calculate HPP sold
    const hppSold = sales.reduce((sum, order) => {
      const orderHpp = ((order as any).order_items || []).reduce((itemSum: number, item: any) => {
        return itemSum + ((item.products?.harga_pokok_penjualan || 0) * item.qty);
      }, 0);
      return sum + orderHpp;
    }, 0);

    // Total loss from loss summary
    const totalLoss = (loss as any)?.total_loss || 0;

    // Calculate gross profit
    const grossProfit = omzet - hppSold - totalLoss;

    // Calculate margin
    const margin = omzet > 0 ? ((grossProfit / omzet) * 100) : 0;

    // Calculate production & sales metrics
    const totalTarget = production.reduce((sum, p) => sum + ((p as any).target_qty || 0), 0);
    const totalSuccess = production.reduce((sum, p) => sum + ((p as any).success_qty || 0), 0);
    const totalWaste = production.reduce((sum, p) => sum + ((p as any).waste_qty || 0), 0);

    // Calculate total sold (from order items)
    const totalSold = sales.reduce((sum, order) => {
      return sum + ((order as any).order_items || []).reduce((itemSum: number, item: any) => itemSum + item.qty, 0);
    }, 0);

    // Calculate remaining (from closing data)
    const totalRemaining = (closingData.data || []).reduce((sum, closing) => {
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

    // Calculate rates
    const successRate = totalTarget > 0 ? ((totalSuccess / totalTarget) * 100) : 0;
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
    const salesByProduct: Record<string, { qty: number; revenue: number; product_name: string }> = {};
    
    sales.forEach((order) => {
      ((order as any).order_items || []).forEach((item: any) => {
        const productId = item.product_id;
        const productName = item.products?.nama || 'Unknown';
        
        if (!salesByProduct[productId]) {
          salesByProduct[productId] = {
            product_name: productName,
            qty: 0,
            revenue: 0,
          };
        }
        
        salesByProduct[productId].qty += item.qty;
        salesByProduct[productId].revenue += item.subtotal || 0;
      });
    });

    // Convert to array and sort by qty
    const salesByProductArray = Object.entries(salesByProduct)
      .map(([productId, data]) => ({
        product_id: productId,
        product_name: data.product_name,
        qty: data.qty,
        revenue: data.revenue,
        percentage: totalSold > 0 ? ((data.qty / totalSold) * 100) : 0,
      }))
      .sort((a, b) => b.qty - a.qty);

    // Calculate Transaction Count & Payment Methods
    const transactionCount = sales.length;
    const averageOrderValue = transactionCount > 0 ? omzet / transactionCount : 0;
    
    const paymentMethods: Record<string, { count: number, total: number }> = {
      Tunai: { count: 0, total: 0 },
      QRIS: { count: 0, total: 0 },
      Transfer: { count: 0, total: 0 }
    };
    let otherPaymentCount = 0;
    let otherPaymentTotal = 0;

    sales.forEach((order) => {
      const pm = (order as any).payment_method || 'Unknown';
      const amount = (order as any).total_amount || 0;
      
      if (pm.toLowerCase().includes('tunai') || pm.toLowerCase().includes('cash')) {
        paymentMethods['Tunai'].count += 1;
        paymentMethods['Tunai'].total += amount;
      } else if (pm.toLowerCase().includes('qris')) {
        paymentMethods['QRIS'].count += 1;
        paymentMethods['QRIS'].total += amount;
      } else if (pm.toLowerCase().includes('transfer') || pm.toLowerCase().includes('bank')) {
        paymentMethods['Transfer'].count += 1;
        paymentMethods['Transfer'].total += amount;
      } else {
        otherPaymentCount += 1;
        otherPaymentTotal += amount;
      }
    });

    const paymentMethodsArray = [
      { method: 'Tunai', ...paymentMethods['Tunai'] },
      { method: 'QRIS', ...paymentMethods['QRIS'] },
      { method: 'Transfer', ...paymentMethods['Transfer'] },
    ];
    if (otherPaymentCount > 0) {
      paymentMethodsArray.push({ method: 'Lainnya', count: otherPaymentCount, total: otherPaymentTotal });
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
