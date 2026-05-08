// ============================================================================
// GOOGLE SHEETS INTEGRATION
// ============================================================================
// File: lib/integrations/google-sheets.ts
// Description: Auto-sync transactions to Google Sheets
// Version: 1.0
// Date: May 8, 2026
// ============================================================================

import { google } from 'googleapis';

// ============================================================================
// TYPES
// ============================================================================

interface TransactionData {
  order_id: string;
  outlet_id: string;
  outlet_name: string;
  kasir_id: string;
  kasir_name: string;
  customer_name?: string;
  customer_phone?: string;
  channel: string;
  total_amount: number;
  payment_method: string;
  payment_status: string;
  status: string;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  created_at: string;
}

interface ProductionData {
  production_id: string;
  outlet_id: string;
  outlet_name: string;
  tanggal: string;
  ukuran: string;
  target_qty: number;
  success_qty: number;
  waste_qty: number;
  success_rate: number;
  waste_rate: number;
  total_hpp_loss: number;
  created_by: string;
  created_at: string;
}

// ============================================================================
// GOOGLE SHEETS CLIENT
// ============================================================================

class GoogleSheetsClient {
  private auth: any;
  private sheets: any;
  private spreadsheetId: string;

  constructor() {
    // Initialize Google Sheets API
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
    
    // Setup authentication
    this.auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  /**
   * Append transaction to Google Sheets
   */
  async appendTransaction(transaction: TransactionData): Promise<boolean> {
    try {
      if (!this.spreadsheetId) {
        console.warn('[Google Sheets] Spreadsheet ID not configured');
        return false;
      }

      // Prepare row data
      const row = [
        transaction.order_id,
        new Date(transaction.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        transaction.outlet_name,
        transaction.kasir_name,
        transaction.customer_name || '-',
        transaction.customer_phone || '-',
        transaction.channel,
        transaction.payment_method,
        transaction.payment_status,
        transaction.status,
        transaction.total_amount,
        // Items detail (JSON string)
        JSON.stringify(transaction.items),
      ];

      // Append to sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Transactions!A:L', // Sheet name: Transactions
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [row],
        },
      });

      console.log('[Google Sheets] Transaction synced:', transaction.order_id);
      return true;
    } catch (error: any) {
      console.error('[Google Sheets] Error syncing transaction:', error.message);
      return false;
    }
  }

  /**
   * Append production to Google Sheets
   */
  async appendProduction(production: ProductionData): Promise<boolean> {
    try {
      if (!this.spreadsheetId) {
        console.warn('[Google Sheets] Spreadsheet ID not configured');
        return false;
      }

      // Prepare row data
      const row = [
        production.production_id,
        new Date(production.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        production.tanggal,
        production.outlet_name,
        production.ukuran,
        production.target_qty,
        production.success_qty,
        production.waste_qty,
        production.success_rate,
        production.waste_rate,
        production.total_hpp_loss,
        production.created_by,
      ];

      // Append to sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Production!A:L', // Sheet name: Production
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [row],
        },
      });

      console.log('[Google Sheets] Production synced:', production.production_id);
      return true;
    } catch (error: any) {
      console.error('[Google Sheets] Error syncing production:', error.message);
      return false;
    }
  }

  /**
   * Initialize spreadsheet with headers
   */
  async initializeSpreadsheet(): Promise<boolean> {
    try {
      if (!this.spreadsheetId) {
        console.warn('[Google Sheets] Spreadsheet ID not configured');
        return false;
      }

      // Transaction headers
      const transactionHeaders = [
        'Order ID',
        'Tanggal & Waktu',
        'Outlet',
        'Kasir',
        'Customer Name',
        'Customer Phone',
        'Channel',
        'Payment Method',
        'Payment Status',
        'Status',
        'Total Amount',
        'Items Detail (JSON)',
      ];

      // Production headers
      const productionHeaders = [
        'Production ID',
        'Tanggal & Waktu Input',
        'Tanggal Produksi',
        'Outlet',
        'Ukuran',
        'Target Qty',
        'Success Qty',
        'Waste Qty',
        'Success Rate (%)',
        'Waste Rate (%)',
        'Total HPP Loss',
        'Created By',
      ];

      // Create or update sheets
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [
            // Create Transactions sheet
            {
              addSheet: {
                properties: {
                  title: 'Transactions',
                  gridProperties: {
                    frozenRowCount: 1, // Freeze header row
                  },
                },
              },
            },
            // Create Production sheet
            {
              addSheet: {
                properties: {
                  title: 'Production',
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
              },
            },
          ],
        },
      });

      // Add headers
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          valueInputOption: 'RAW',
          data: [
            {
              range: 'Transactions!A1:L1',
              values: [transactionHeaders],
            },
            {
              range: 'Production!A1:L1',
              values: [productionHeaders],
            },
          ],
        },
      });

      console.log('[Google Sheets] Spreadsheet initialized successfully');
      return true;
    } catch (error: any) {
      // Ignore error if sheets already exist
      if (error.message.includes('already exists')) {
        console.log('[Google Sheets] Sheets already exist, skipping initialization');
        return true;
      }
      console.error('[Google Sheets] Error initializing spreadsheet:', error.message);
      return false;
    }
  }

  /**
   * Batch append multiple transactions
   */
  async batchAppendTransactions(transactions: TransactionData[]): Promise<number> {
    try {
      if (!this.spreadsheetId || transactions.length === 0) {
        return 0;
      }

      const rows = transactions.map((t) => [
        t.order_id,
        new Date(t.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
        t.outlet_name,
        t.kasir_name,
        t.customer_name || '-',
        t.customer_phone || '-',
        t.channel,
        t.payment_method,
        t.payment_status,
        t.status,
        t.total_amount,
        JSON.stringify(t.items),
      ]);

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Transactions!A:L',
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: rows,
        },
      });

      console.log(`[Google Sheets] Batch synced ${transactions.length} transactions`);
      return transactions.length;
    } catch (error: any) {
      console.error('[Google Sheets] Error batch syncing transactions:', error.message);
      return 0;
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let googleSheetsClient: GoogleSheetsClient | null = null;

export function getGoogleSheetsClient(): GoogleSheetsClient {
  if (!googleSheetsClient) {
    googleSheetsClient = new GoogleSheetsClient();
  }
  return googleSheetsClient;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sync transaction to Google Sheets
 */
export async function syncTransactionToSheets(transaction: TransactionData): Promise<boolean> {
  try {
    const client = getGoogleSheetsClient();
    return await client.appendTransaction(transaction);
  } catch (error: any) {
    console.error('[Google Sheets] Error syncing transaction:', error.message);
    return false;
  }
}

/**
 * Sync production to Google Sheets
 */
export async function syncProductionToSheets(production: ProductionData): Promise<boolean> {
  try {
    const client = getGoogleSheetsClient();
    return await client.appendProduction(production);
  } catch (error: any) {
    console.error('[Google Sheets] Error syncing production:', error.message);
    return false;
  }
}

/**
 * Initialize Google Sheets with headers
 */
export async function initializeGoogleSheets(): Promise<boolean> {
  try {
    const client = getGoogleSheetsClient();
    return await client.initializeSpreadsheet();
  } catch (error: any) {
    console.error('[Google Sheets] Error initializing:', error.message);
    return false;
  }
}

/**
 * Batch sync transactions to Google Sheets
 */
export async function batchSyncTransactionsToSheets(
  transactions: TransactionData[]
): Promise<number> {
  try {
    const client = getGoogleSheetsClient();
    return await client.batchAppendTransactions(transactions);
  } catch (error: any) {
    console.error('[Google Sheets] Error batch syncing:', error.message);
    return 0;
  }
}
