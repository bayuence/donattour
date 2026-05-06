import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;
    
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const outletId = searchParams.get('outlet_id');
    const groupBy = searchParams.get('group_by') || 'day';
    const format = searchParams.get('format') || 'excel';

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

    // Build outlet filter
    const outletFilter = outletId ? { outlet_id: outletId } : {};

    // Fetch data (similar to period report API)
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
    if (productionData.error || salesData.error || lossData.error || toppingErrorsData.error || closingData.error) {
      throw new Error('Gagal mengambil data dari database');
    }

    const production = productionData.data || [];
    const sales = salesData.data || [];
    const losses = lossData.data || [];
    const toppingErrors = toppingErrorsData.data || [];
    const closings = closingData.data || [];

    if (format === 'excel') {
      return generateExcelReport({
        production,
        sales,
        losses,
        toppingErrors,
        closings,
        startDate,
        endDate,
        outletId,
      });
    } else if (format === 'pdf') {
      return generatePDFReport({
        production,
        sales,
        losses,
        toppingErrors,
        closings,
        startDate,
        endDate,
        outletId,
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'UNSUPPORTED_FORMAT', 
            message: 'Format tidak didukung. Gunakan excel atau pdf' 
          } 
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error generating report:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Gagal membuat laporan',
          details: error instanceof Error ? error.stack : undefined,
        },
      },
      { status: 500 }
    );
  }
}

function generateExcelReport(data: {
  production: any[];
  sales: any[];
  losses: any[];
  toppingErrors: any[];
  closings: any[];
  startDate: string;
  endDate: string;
  outletId: string | null;
}) {
  const { production, sales, losses, toppingErrors, closings, startDate, endDate, outletId } = data;

  // Create workbook
  const workbook = XLSX.utils.book_new();

  // 1. Summary Sheet
  const summaryData = calculateSummaryData(data);
  const summarySheet = XLSX.utils.json_to_sheet([
    { Metric: 'Periode', Value: `${startDate} s/d ${endDate}` },
    { Metric: 'Total Hari', Value: Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1 },
    { Metric: '', Value: '' },
    { Metric: 'KEUANGAN', Value: '' },
    { Metric: 'Total Omzet', Value: summaryData.totalOmzet },
    { Metric: 'Total HPP Terjual', Value: summaryData.totalHppSold },
    { Metric: 'Total Rugi', Value: summaryData.totalLoss },
    { Metric: 'Gross Profit', Value: summaryData.grossProfit },
    { Metric: 'Margin (%)', Value: summaryData.margin },
    { Metric: '', Value: '' },
    { Metric: 'PRODUKSI', Value: '' },
    { Metric: 'Total Target', Value: summaryData.totalTarget },
    { Metric: 'Total Berhasil', Value: summaryData.totalSuccess },
    { Metric: 'Total Waste', Value: summaryData.totalWaste },
    { Metric: 'Success Rate (%)', Value: summaryData.successRate },
    { Metric: 'Waste Rate (%)', Value: summaryData.wasteRate },
    { Metric: '', Value: '' },
    { Metric: 'PENJUALAN', Value: '' },
    { Metric: 'Total Terjual', Value: summaryData.totalSold },
    { Metric: 'Sold Rate (%)', Value: summaryData.soldRate },
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

  // 2. Production Sheet
  const productionSheet = XLSX.utils.json_to_sheet(
    production.map((p: any) => ({
      Tanggal: p.tanggal,
      Outlet: p.outlets?.nama || 'Unknown',
      Ukuran: p.ukuran,
      Target: p.target_qty,
      Berhasil: p.success_qty,
      Waste: p.waste_qty,
      'Success Rate (%)': p.target_qty > 0 ? ((p.success_qty / p.target_qty) * 100).toFixed(2) : 0,
      'Waste Rate (%)': p.target_qty > 0 ? ((p.waste_qty / p.target_qty) * 100).toFixed(2) : 0,
      'HPP Loss': p.total_hpp_loss || 0,
    }))
  );
  XLSX.utils.book_append_sheet(workbook, productionSheet, 'Produksi Harian');

  // 3. Sales Sheet
  const salesSheet = XLSX.utils.json_to_sheet(
    sales.map((order: any) => ({
      Tanggal: order.created_at.split('T')[0],
      'Order ID': order.id,
      Outlet: order.outlets?.nama || 'Unknown',
      Channel: order.channel || 'toko',
      'Total Amount': order.total_amount,
      'Total Items': (order.order_items || []).reduce((sum: number, item: any) => sum + item.qty, 0),
      Status: order.status,
    }))
  );
  XLSX.utils.book_append_sheet(workbook, salesSheet, 'Penjualan');

  // 4. Loss Breakdown Sheet
  const lossSheet = XLSX.utils.json_to_sheet(
    losses.map((loss: any) => ({
      Tanggal: loss.tanggal,
      Outlet: loss.outlet_id,
      'Production Waste': loss.production_waste_loss || 0,
      'Topping Error': loss.topping_error_loss || 0,
      'Non-Topping Expired': loss.non_topping_expired_loss || 0,
      'Finished Product Reject': loss.finished_product_reject_loss || 0,
      'Total Loss': loss.total_loss || 0,
      'Total Waste Qty': loss.total_waste_qty || 0,
    }))
  );
  XLSX.utils.book_append_sheet(workbook, lossSheet, 'Detail Rugi');

  // 5. Topping Errors Sheet
  const toppingErrorsSheet = XLSX.utils.json_to_sheet(
    toppingErrors.map((error: any) => ({
      Tanggal: error.reported_at.split('T')[0],
      Outlet: error.outlet_id,
      'Product Ordered': error.product_ordered,
      'Product Made': error.product_made,
      Quantity: error.qty,
      Reason: error.reason,
      'HPP Loss': error.hpp_loss,
    }))
  );
  XLSX.utils.book_append_sheet(workbook, toppingErrorsSheet, 'Kesalahan Topping');

  // 6. Top Products Sheet
  const topProducts = calculateTopProducts(sales);
  const topProductsSheet = XLSX.utils.json_to_sheet(
    topProducts.map((product: any, index: number) => ({
      Ranking: index + 1,
      'Product Name': product.product_name,
      'Total Qty': product.qty,
      'Total Revenue': product.revenue,
      'Percentage (%)': product.percentage,
    }))
  );
  XLSX.utils.book_append_sheet(workbook, topProductsSheet, 'Top Produk');

  // Generate Excel buffer
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  // Return file response
  const filename = `laporan-${startDate}-${endDate}${outletId ? `-outlet-${outletId}` : ''}.xlsx`;
  
  return new NextResponse(excelBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': excelBuffer.length.toString(),
    },
  });
}

function calculateSummaryData(data: {
  production: any[];
  sales: any[];
  losses: any[];
  toppingErrors: any[];
  closings: any[];
}) {
  const { production, sales, losses } = data;

  // Calculate financial metrics
  const totalOmzet = sales.reduce((sum, order) => sum + (order.total_amount || 0), 0);
  
  const totalHppSold = sales.reduce((sum, order) => {
    const orderHpp = (order.order_items || []).reduce((itemSum: number, item: any) => {
      return itemSum + ((item.products?.harga_pokok_penjualan || 0) * item.qty);
    }, 0);
    return sum + orderHpp;
  }, 0);

  const totalLoss = losses.reduce((sum, loss) => sum + (loss.total_loss || 0), 0);
  const grossProfit = totalOmzet - totalHppSold - totalLoss;
  const margin = totalOmzet > 0 ? ((grossProfit / totalOmzet) * 100) : 0;

  // Calculate production metrics
  const totalTarget = production.reduce((sum, p) => sum + (p.target_qty || 0), 0);
  const totalSuccess = production.reduce((sum, p) => sum + (p.success_qty || 0), 0);
  const totalWaste = production.reduce((sum, p) => sum + (p.waste_qty || 0), 0);
  
  const successRate = totalTarget > 0 ? ((totalSuccess / totalTarget) * 100) : 0;
  const wasteRate = totalTarget > 0 ? ((totalWaste / totalTarget) * 100) : 0;

  // Calculate sales metrics
  const totalSold = sales.reduce((sum, order) => {
    return sum + (order.order_items || []).reduce((itemSum: number, item: any) => itemSum + item.qty, 0);
  }, 0);
  
  const soldRate = totalSuccess > 0 ? ((totalSold / totalSuccess) * 100) : 0;

  return {
    totalOmzet: Math.round(totalOmzet),
    totalHppSold: Math.round(totalHppSold),
    totalLoss: Math.round(totalLoss),
    grossProfit: Math.round(grossProfit),
    margin: Math.round(margin * 100) / 100,
    totalTarget,
    totalSuccess,
    totalWaste,
    successRate: Math.round(successRate * 100) / 100,
    wasteRate: Math.round(wasteRate * 100) / 100,
    totalSold,
    soldRate: Math.round(soldRate * 100) / 100,
  };
}

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

      productSales[productId].qty += item.qty;
      productSales[productId].revenue += item.subtotal || 0;
    });
  });

  const totalSold = Object.values(productSales).reduce((sum, product) => sum + product.qty, 0);

  return Object.entries(productSales)
    .map(([productId, data]) => ({
      product_id: productId,
      product_name: data.name,
      qty: data.qty,
      revenue: Math.round(data.revenue),
      percentage: totalSold > 0 ? Math.round((data.qty / totalSold) * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 20); // Top 20 products
}

function generatePDFReport(data: {
  production: any[];
  sales: any[];
  losses: any[];
  toppingErrors: any[];
  closings: any[];
  startDate: string;
  endDate: string;
  outletId: string | null;
}) {
  const { production, sales, losses, startDate, endDate, outletId } = data;

  // Create PDF document
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  let yPosition = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('LAPORAN PRODUKSI & PENJUALAN', 105, yPosition, { align: 'center' });
  
  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${formatDate(startDate)} s/d ${formatDate(endDate)}`, 105, yPosition, { align: 'center' });
  
  if (outletId) {
    yPosition += 7;
    doc.text(`Outlet: ${outletId}`, 105, yPosition, { align: 'center' });
  }

  yPosition += 15;

  // Summary data
  const summaryData = calculateSummaryData(data);

  // Financial Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RINGKASAN KEUANGAN', 20, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const financialData = [
    ['Total Omzet', formatRupiah(summaryData.totalOmzet)],
    ['Total HPP Terjual', formatRupiah(summaryData.totalHppSold)],
    ['Total Rugi', formatRupiah(summaryData.totalLoss)],
    ['Gross Profit', formatRupiah(summaryData.grossProfit)],
    ['Margin', `${summaryData.margin}%`],
  ];

  (doc as any).autoTable({
    startY: yPosition,
    head: [['Metrik', 'Nilai']],
    body: financialData,
    theme: 'grid',
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 60, halign: 'right' },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Production Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RINGKASAN PRODUKSI', 20, yPosition);
  yPosition += 10;

  const productionSummaryData = [
    ['Total Target', formatNumber(summaryData.totalTarget)],
    ['Total Berhasil', formatNumber(summaryData.totalSuccess)],
    ['Total Waste', formatNumber(summaryData.totalWaste)],
    ['Success Rate', `${summaryData.successRate}%`],
    ['Waste Rate', `${summaryData.wasteRate}%`],
  ];

  (doc as any).autoTable({
    startY: yPosition,
    head: [['Metrik', 'Nilai']],
    body: productionSummaryData,
    theme: 'grid',
    styles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 60, halign: 'right' },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  // Production Details
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DETAIL PRODUKSI HARIAN', 20, yPosition);
  yPosition += 10;

  const productionTableData = production.slice(0, 15).map((p: any) => [
    p.tanggal,
    p.outlets?.nama || 'Unknown',
    p.ukuran,
    formatNumber(p.target_qty),
    formatNumber(p.success_qty),
    formatNumber(p.waste_qty),
    p.target_qty > 0 ? `${((p.success_qty / p.target_qty) * 100).toFixed(1)}%` : '0%',
    formatRupiah(p.total_hpp_loss || 0, true),
  ]);

  (doc as any).autoTable({
    startY: yPosition,
    head: [['Tanggal', 'Outlet', 'Ukuran', 'Target', 'Berhasil', 'Waste', 'Success%', 'HPP Loss']],
    body: productionTableData,
    theme: 'striped',
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 25 },
      2: { cellWidth: 18 },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 25, halign: 'right' },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  // Loss Breakdown
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BREAKDOWN RUGI', 20, yPosition);
  yPosition += 10;

  const lossTableData = losses.slice(0, 10).map((loss: any) => [
    loss.tanggal,
    formatRupiah(loss.production_waste_loss || 0, true),
    formatRupiah(loss.topping_error_loss || 0, true),
    formatRupiah(loss.non_topping_expired_loss || 0, true),
    formatRupiah(loss.finished_product_reject_loss || 0, true),
    formatRupiah(loss.total_loss || 0, true),
  ]);

  (doc as any).autoTable({
    startY: yPosition,
    head: [['Tanggal', 'Prod. Waste', 'Topping Error', 'Expired', 'Reject', 'Total']],
    body: lossTableData,
    theme: 'striped',
    styles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25, halign: 'right' },
      2: { cellWidth: 25, halign: 'right' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Check if we need a new page
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  // Top Products
  const topProducts = calculateTopProducts(sales);
  if (topProducts.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOP 10 PRODUK TERLARIS', 20, yPosition);
    yPosition += 10;

    const topProductsTableData = topProducts.slice(0, 10).map((product: any, index: number) => [
      (index + 1).toString(),
      product.product_name,
      formatNumber(product.qty),
      formatRupiah(product.revenue, true),
      `${product.percentage}%`,
    ]);

    (doc as any).autoTable({
      startY: yPosition,
      head: [['#', 'Produk', 'Qty', 'Revenue', '%']],
      body: topProductsTableData,
      theme: 'striped',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 60 },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
      },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Generated on ${new Date().toLocaleDateString('id-ID')} - Page ${i} of ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Generate PDF buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

  // Return file response
  const filename = `laporan-${startDate}-${endDate}${outletId ? `-outlet-${outletId}` : ''}.pdf`;
  
  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length.toString(),
    },
  });
}

// Helper functions for formatting
function formatRupiah(amount: number, short: boolean = false): string {
  if (short && amount >= 1000000) {
    return `Rp ${(amount / 1000000).toFixed(1)}M`;
  } else if (short && amount >= 1000) {
    return `Rp ${(amount / 1000).toFixed(0)}K`;
  }
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatNumber(num: number): string {
  return num.toLocaleString('id-ID');
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID');
}