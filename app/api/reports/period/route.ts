import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const outletId = searchParams.get('outlet_id');
    const groupBy = searchParams.get('group_by') || 'day'; // day, week, month

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'MISSING_PARAMS', 
            message: 'Parameter start_date dan end_date wajib diisi' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_DATE', 
            message: 'Format tanggal harus YYYY-MM-DD' 
          } 
        },
        { status: 400 }
      );
    }

    // Validate date range (max 90 days)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 90) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'DATE_RANGE_TOO_LARGE', 
            message: 'Rentang tanggal maksimal 90 hari' 
          } 
        },
        { status: 400 }
      );
    }

    if (start > end) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_DATE_RANGE', 
            message: 'Tanggal mulai harus lebih kecil dari tanggal akhir' 
          } 
        },
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
      // 1. Production data for the period
      supabase
        .from('production_daily')
        .select('*, outlets(nama)')
        .match(outletFilter)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true }),

      // 2. Sales data for the period
      supabase
        .from('orders')
        .select(`
          *,
          order_items(*, products(nama, harga_pokok_penjualan, ukuran)),
          outlets(nama)
        `)
        .match(outletFilter)
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .eq('status', 'completed')
        .order('created_at', { ascending: true }),

      // 3. Loss summary for the period
      supabase
        .from('daily_loss_summary')
        .select('*')
        .match(outletFilter)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true }),

      // 4. Topping errors for the period
      supabase
        .from('topping_errors')
        .select('*')
        .match(outletFilter)
        .gte('reported_at', `${startDate}T00:00:00`)
        .lte('reported_at', `${endDate}T23:59:59`)
        .order('reported_at', { ascending: true }),

      // 5. Closing data for the period
      supabase
        .from('daily_closing')
        .select(`
          *,
          closing_non_topping_status(*),
          closing_finished_products(*)
        `)
        .match(outletFilter)
        .gte('tanggal', startDate)
        .lte('tanggal', endDate)
        .order('tanggal', { ascending: true }),
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

    // Process data by grouping
    const production = productionData.data || [];
    const sales = salesData.data || [];
    const losses = lossData.data || [];
    const toppingErrors = toppingErrorsData.data || [];
    const closings = closingData.data || [];

    // Group data by period (day/week/month)
    const groupedData = groupDataByPeriod(
      { production, sales, losses, toppingErrors, closings },
      groupBy,
      startDate,
      endDate
    );

    // Calculate aggregated metrics
    const aggregatedMetrics = calculateAggregatedMetrics(groupedData);

    // Calculate trends
    const trends = calculateTrends(groupedData);

    // Top performing products across the period
    const topProducts = calculateTopProducts(sales);

    // Outlet comparison (if multiple outlets)
    const outletComparison = outletId ? null : calculateOutletComparison(
      { production, sales, losses }
    );

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start_date: startDate,
          end_date: endDate,
          group_by: groupBy,
          total_days: daysDiff + 1,
        },
        outlet_id: outletId,
        aggregated_metrics: aggregatedMetrics,
        trends: trends,
        grouped_data: groupedData,
        top_products: topProducts,
        outlet_comparison: outletComparison,
      },
    });

  } catch (error) {
    console.error('Error fetching period report:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Gagal mengambil laporan periode',
          details: error instanceof Error ? error.stack : undefined,
        },
      },
      { status: 500 }
    );
  }
}

// Helper function to group data by period
function groupDataByPeriod(
  data: {
    production: any[];
    sales: any[];
    losses: any[];
    toppingErrors: any[];
    closings: any[];
  },
  groupBy: string,
  startDate: string,
  endDate: string
) {
  const grouped: Record<string, any> = {};

  // Generate all periods in range
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split('T')[0];
    let periodKey = dateKey;

    if (groupBy === 'week') {
      // Get Monday of the week
      const monday = new Date(d);
      monday.setDate(d.getDate() - d.getDay() + 1);
      periodKey = monday.toISOString().split('T')[0];
    } else if (groupBy === 'month') {
      periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    if (!grouped[periodKey]) {
      grouped[periodKey] = {
        period: periodKey,
        production: [],
        sales: [],
        losses: [],
        toppingErrors: [],
        closings: [],
        metrics: {
          omzet: 0,
          hpp_sold: 0,
          total_loss: 0,
          gross_profit: 0,
          margin: 0,
          target: 0,
          success: 0,
          waste: 0,
          sold: 0,
          remaining: 0,
          success_rate: 0,
          waste_rate: 0,
          sold_rate: 0,
          remaining_rate: 0,
        },
      };
    }
  }

  // Group production data
  data.production.forEach((item) => {
    const date = item.tanggal;
    let periodKey = date;

    if (groupBy === 'week') {
      const d = new Date(date);
      const monday = new Date(d);
      monday.setDate(d.getDate() - d.getDay() + 1);
      periodKey = monday.toISOString().split('T')[0];
    } else if (groupBy === 'month') {
      const d = new Date(date);
      periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    if (grouped[periodKey]) {
      grouped[periodKey].production.push(item);
    }
  });

  // Group sales data
  data.sales.forEach((item) => {
    const date = item.created_at.split('T')[0];
    let periodKey = date;

    if (groupBy === 'week') {
      const d = new Date(date);
      const monday = new Date(d);
      monday.setDate(d.getDate() - d.getDay() + 1);
      periodKey = monday.toISOString().split('T')[0];
    } else if (groupBy === 'month') {
      const d = new Date(date);
      periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    if (grouped[periodKey]) {
      grouped[periodKey].sales.push(item);
    }
  });

  // Group loss data
  data.losses.forEach((item) => {
    const date = item.tanggal;
    let periodKey = date;

    if (groupBy === 'week') {
      const d = new Date(date);
      const monday = new Date(d);
      monday.setDate(d.getDate() - d.getDay() + 1);
      periodKey = monday.toISOString().split('T')[0];
    } else if (groupBy === 'month') {
      const d = new Date(date);
      periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    if (grouped[periodKey]) {
      grouped[periodKey].losses.push(item);
    }
  });

  // Calculate metrics for each period
  Object.keys(grouped).forEach((periodKey) => {
    const period = grouped[periodKey];
    
    // Calculate omzet
    period.metrics.omzet = period.sales.reduce((sum: number, order: any) => 
      sum + (order.total_amount || 0), 0
    );

    // Calculate HPP sold
    period.metrics.hpp_sold = period.sales.reduce((sum: number, order: any) => {
      const orderHpp = (order.order_items || []).reduce((itemSum: number, item: any) => {
        return itemSum + ((item.products?.harga_pokok_penjualan || 0) * (item.quantity || item.qty || 0));
      }, 0);
      return sum + orderHpp;
    }, 0);

    // Calculate total loss
    period.metrics.total_loss = period.losses.reduce((sum: number, loss: any) => 
      sum + (loss.total_loss || 0), 0
    );

    // Calculate production metrics
    period.metrics.target = period.production.reduce((sum: number, p: any) => 
      sum + (p.target_qty || 0), 0
    );
    period.metrics.success = period.production.reduce((sum: number, p: any) => 
      sum + (p.success_qty || 0), 0
    );
    period.metrics.waste = period.production.reduce((sum: number, p: any) => 
      sum + (p.waste_qty || 0), 0
    );

    // Calculate sold quantity
    period.metrics.sold = period.sales.reduce((sum: number, order: any) => {
      return sum + (order.order_items || []).reduce((itemSum: number, item: any) => 
        itemSum + (item.quantity || item.qty || 0), 0
      );
    }, 0);

    // Calculate gross profit and margin
    period.metrics.gross_profit = period.metrics.omzet - period.metrics.hpp_sold - period.metrics.total_loss;
    period.metrics.margin = period.metrics.omzet > 0 ? 
      ((period.metrics.gross_profit / period.metrics.omzet) * 100) : 0;

    // Calculate rates
    period.metrics.success_rate = period.metrics.target > 0 ? 
      ((period.metrics.success / period.metrics.target) * 100) : 0;
    period.metrics.waste_rate = period.metrics.target > 0 ? 
      ((period.metrics.waste / period.metrics.target) * 100) : 0;
    period.metrics.sold_rate = period.metrics.success > 0 ? 
      ((period.metrics.sold / period.metrics.success) * 100) : 0;
  });

  return grouped;
}

// Helper function to calculate aggregated metrics
function calculateAggregatedMetrics(groupedData: Record<string, any>) {
  const periods = Object.values(groupedData);
  
  const totals = periods.reduce((acc: any, period: any) => {
    acc.omzet += period.metrics.omzet;
    acc.hpp_sold += period.metrics.hpp_sold;
    acc.total_loss += period.metrics.total_loss;
    acc.gross_profit += period.metrics.gross_profit;
    acc.target += period.metrics.target;
    acc.success += period.metrics.success;
    acc.waste += period.metrics.waste;
    acc.sold += period.metrics.sold;
    return acc;
  }, {
    omzet: 0,
    hpp_sold: 0,
    total_loss: 0,
    gross_profit: 0,
    target: 0,
    success: 0,
    waste: 0,
    sold: 0,
  });

  // Calculate average rates
  const avgMargin = totals.omzet > 0 ? ((totals.gross_profit / totals.omzet) * 100) : 0;
  const avgSuccessRate = totals.target > 0 ? ((totals.success / totals.target) * 100) : 0;
  const avgWasteRate = totals.target > 0 ? ((totals.waste / totals.target) * 100) : 0;
  const avgSoldRate = totals.success > 0 ? ((totals.sold / totals.success) * 100) : 0;

  return {
    ...totals,
    margin: Math.round(avgMargin * 100) / 100,
    success_rate: Math.round(avgSuccessRate * 100) / 100,
    waste_rate: Math.round(avgWasteRate * 100) / 100,
    sold_rate: Math.round(avgSoldRate * 100) / 100,
    period_count: periods.length,
  };
}

// Helper function to calculate trends
function calculateTrends(groupedData: Record<string, any>) {
  const periods = Object.values(groupedData).sort((a: any, b: any) => 
    a.period.localeCompare(b.period)
  );

  if (periods.length < 2) {
    return {
      omzet_trend: 0,
      waste_rate_trend: 0,
      margin_trend: 0,
      sold_rate_trend: 0,
    };
  }

  const first = periods[0] as any;
  const last = periods[periods.length - 1] as any;

  const omzetTrend = first.metrics.omzet > 0 ? 
    (((last.metrics.omzet - first.metrics.omzet) / first.metrics.omzet) * 100) : 0;
  
  const wasteRateTrend = last.metrics.waste_rate - first.metrics.waste_rate;
  const marginTrend = last.metrics.margin - first.metrics.margin;
  const soldRateTrend = last.metrics.sold_rate - first.metrics.sold_rate;

  return {
    omzet_trend: Math.round(omzetTrend * 100) / 100,
    waste_rate_trend: Math.round(wasteRateTrend * 100) / 100,
    margin_trend: Math.round(marginTrend * 100) / 100,
    sold_rate_trend: Math.round(soldRateTrend * 100) / 100,
  };
}

// Helper function to calculate top products
function calculateTopProducts(sales: any[]) {
  const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};

  sales.forEach((order) => {
    (order.order_items || []).forEach((item: any) => {
      const productId = item.product_id;
      const productName = item.products?.nama || 'Unknown';

      if (!productSales[productId]) {
        productSales[productId] = {
          name: productName,
          qty: 0,
          revenue: 0,
        };
      }

      productSales[productId].qty += (item.quantity || item.qty || 0);
      productSales[productId].revenue += item.subtotal || 0;
    });
  });

  return Object.entries(productSales)
    .map(([productId, data]) => ({
      product_id: productId,
      product_name: data.name,
      qty: data.qty,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10); // Top 10 products
}

// Helper function to calculate outlet comparison
function calculateOutletComparison(data: {
  production: any[];
  sales: any[];
  losses: any[];
}) {
  const outletMetrics: Record<string, any> = {};

  // Group by outlet
  data.production.forEach((item) => {
    const outletId = item.outlet_id;
    if (!outletMetrics[outletId]) {
      outletMetrics[outletId] = {
        outlet_name: item.outlets?.nama || 'Unknown',
        omzet: 0,
        total_loss: 0,
        target: 0,
        success: 0,
        waste: 0,
        sold: 0,
      };
    }
    outletMetrics[outletId].target += item.target_qty || 0;
    outletMetrics[outletId].success += item.success_qty || 0;
    outletMetrics[outletId].waste += item.waste_qty || 0;
  });

  data.sales.forEach((order) => {
    const outletId = order.outlet_id;
    if (outletMetrics[outletId]) {
      outletMetrics[outletId].omzet += order.total_amount || 0;
      outletMetrics[outletId].sold += (order.order_items || []).reduce(
        (sum: number, item: any) => sum + (item.quantity || item.qty || 0), 0
      );
    }
  });

  data.losses.forEach((loss) => {
    const outletId = loss.outlet_id;
    if (outletMetrics[outletId]) {
      outletMetrics[outletId].total_loss += loss.total_loss || 0;
    }
  });

  // Calculate metrics for each outlet
  return Object.entries(outletMetrics)
    .map(([outletId, metrics]: [string, any]) => ({
      outlet_id: outletId,
      outlet_name: metrics.outlet_name,
      omzet: metrics.omzet,
      total_loss: metrics.total_loss,
      gross_profit: metrics.omzet - metrics.total_loss,
      margin: metrics.omzet > 0 ? ((metrics.omzet - metrics.total_loss) / metrics.omzet * 100) : 0,
      success_rate: metrics.target > 0 ? (metrics.success / metrics.target * 100) : 0,
      waste_rate: metrics.target > 0 ? (metrics.waste / metrics.target * 100) : 0,
      sold_rate: metrics.success > 0 ? (metrics.sold / metrics.success * 100) : 0,
    }))
    .sort((a, b) => b.omzet - a.omzet);
}