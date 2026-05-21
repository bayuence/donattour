'use client';

import { useState } from 'react';
import type { ExpenseWithDetails } from '@/lib/types/expenses';

interface ExportButtonProps {
  expenses: ExpenseWithDetails[];
  filename?: string;
}

export function ExportButton({ expenses, filename = 'pengeluaran' }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const exportToCSV = () => {
    setExporting(true);
    try {
      // CSV Headers
      const headers = ['Tanggal', 'Kategori', 'Keterangan', 'Jumlah (Rp)', 'Dibuat Oleh', 'Waktu Input'];
      
      // CSV Rows
      const rows = expenses.map(exp => [
        exp.tanggal,
        exp.kategori,
        exp.keterangan,
        Number(exp.jumlah).toString(),
        exp.created_by_user?.name || '-',
        new Date(exp.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      ]);
      
      // Combine
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      ].join('\n');
      
      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      setShowMenu(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Gagal export data');
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = () => {
    setExporting(true);
    try {
      // Simple HTML table for Excel
      const headers = ['Tanggal', 'Kategori', 'Keterangan', 'Jumlah (Rp)', 'Dibuat Oleh', 'Waktu Input'];
      
      let html = '<table border="1"><thead><tr>';
      headers.forEach(h => {
        html += `<th>${h}</th>`;
      });
      html += '</tr></thead><tbody>';
      
      expenses.forEach(exp => {
        html += '<tr>';
        html += `<td>${exp.tanggal}</td>`;
        html += `<td>${exp.kategori}</td>`;
        html += `<td>${exp.keterangan}</td>`;
        html += `<td>${Number(exp.jumlah)}</td>`;
        html += `<td>${exp.created_by_user?.name || '-'}</td>`;
        html += `<td>${new Date(exp.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</td>`;
        html += '</tr>';
      });
      
      html += '</tbody></table>';
      
      // Download as Excel
      const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.xls`;
      link.click();
      
      setShowMenu(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Gagal export data');
    } finally {
      setExporting(false);
    }
  };

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const total = expenses.reduce((sum, exp) => sum + Number(exp.jumlah), 0);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Pengeluaran</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
            .total { font-weight: bold; text-align: right; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>Laporan Pengeluaran Outlet</h1>
          <p>Tanggal Cetak: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Kategori</th>
                <th>Keterangan</th>
                <th>Jumlah (Rp)</th>
              </tr>
            </thead>
            <tbody>
              ${expenses.map((exp, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${exp.tanggal}</td>
                  <td>${exp.kategori}</td>
                  <td>${exp.keterangan}</td>
                  <td style="text-align: right;">${Number(exp.jumlah).toLocaleString('id-ID')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            Total: Rp ${total.toLocaleString('id-ID')}
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting || expenses.length === 0}
        className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {exporting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            Exporting...
          </>
        ) : (
          <>
            📥 Export
          </>
        )}
      </button>

      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border z-20">
            <button
              onClick={exportToCSV}
              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              📄 Export ke CSV
            </button>
            <button
              onClick={exportToExcel}
              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 border-t"
            >
              📊 Export ke Excel
            </button>
            <button
              onClick={printReport}
              className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2 border-t"
            >
              🖨️ Print Laporan
            </button>
          </div>
        </>
      )}
    </div>
  );
}
