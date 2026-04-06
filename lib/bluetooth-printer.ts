/**
 * lib/bluetooth-printer.ts
 * 
 * Bluetooth Thermal Printer Integration menggunakan Web Bluetooth API
 * Kompatibel dengan printer ESC/POS (Epson, Xprinter, GOOJPRT, POS58, dll)
 * 
 * NOTE: Web Bluetooth API hanya tersedia di Chrome/Edge (Chromium-based browsers)
 */

// ─── Web Bluetooth API Type Declarations ─────────────────────
// (Diperlukan karena TypeScript standard lib belum include Web Bluetooth)
declare global {
  interface BluetoothDevice {
    name?: string;
    id: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(type: 'gattserverdisconnected', callback: () => void): void;
  }
  interface BluetoothRemoteGATTServer {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
    getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
  }
  interface BluetoothRemoteGATTService {
    getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
    getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
  }
  interface BluetoothRemoteGATTCharacteristic {
    properties: {
      write: boolean;
      writeWithoutResponse: boolean;
      notify: boolean;
      read: boolean;
    };
    writeValue(value: BufferSource): Promise<void>;
    writeValueWithoutResponse(value: BufferSource): Promise<void>;
  }
}


// ESC/POS Command constants
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const CR = 0x0d;

const COMMANDS = {
  INIT: [ESC, 0x40],                    // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],        // Left align
  ALIGN_CENTER: [ESC, 0x61, 0x01],      // Center align  
  ALIGN_RIGHT: [ESC, 0x61, 0x02],       // Right align
  BOLD_ON: [ESC, 0x45, 0x01],           // Bold on
  BOLD_OFF: [ESC, 0x45, 0x00],          // Bold off
  DOUBLE_HEIGHT: [GS, 0x21, 0x01],      // Double height
  DOUBLE_WIDTH: [GS, 0x21, 0x10],       // Double width
  DOUBLE_SIZE: [GS, 0x21, 0x11],        // Double height + width
  NORMAL_SIZE: [GS, 0x21, 0x00],        // Normal size
  UNDERLINE_ON: [ESC, 0x2d, 0x01],      // Underline on
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],     // Underline off
  FEED_LINE: [LF],                      // Feed 1 line
  FEED_2: [ESC, 0x64, 0x02],            // Feed 2 lines
  FEED_3: [ESC, 0x64, 0x03],            // Feed 3 lines
  CUT: [GS, 0x56, 0x01],               // Cut paper (partial)
  FULL_CUT: [GS, 0x56, 0x00],          // Full cut
  DIVIDER: '--------------------------------',
};

// Bluetooth service UUIDs (common for thermal printers)
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Common BT thermal printer
  '0000ff00-0000-1000-8000-00805f9b34fb', // Alternative UUID
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Some Xprinter models
  '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile
];

const PRINTER_CHAR_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '0000ff02-0000-1000-8000-00805f9b34fb',
  '0000ff01-0000-1000-8000-00805f9b34fb',
];

export interface StrukData {
  noTrx: string;
  namaOutlet: string;
  alamatOutlet: string;
  namaPelanggan: string;
  kasirName?: string;
  waktu: string;
  items: {
    nama: string;
    qty: number;
    harga: number;
    subtotal: number;
  }[];
  biayaEkstra: { nama: string; harga: number }[];
  subtotal: number;
  totalBiaya: number;
  finalTotal: number;
  metodeBayar: string;
  bayar: number;
  kembalian: number;
  channel: string;
  receiptSettings?: any;
}

function textToBytes(text: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Basic ASCII (replace non-ASCII with ?)
    bytes.push(code < 128 ? code : 0x3f);
  }
  return bytes;
}

function lineBytes(text: string): number[] {
  return [...textToBytes(text), LF];
}

function buildReceiptBytes(data: StrukData): Uint8Array {
  const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
  const padRight = (str: string, len: number) => str.substring(0, len).padEnd(len, ' ');
  const padLeft = (str: string, len: number) => str.substring(0, len).padStart(len, ' ');
  
  const WIDTH = 32; // 58mm printer = 32 chars; 80mm = 48 chars

  const bytes: number[] = [];
  const rs = data.receiptSettings || {};

  // INIT
  bytes.push(...COMMANDS.INIT);

  // HEADER
  bytes.push(...COMMANDS.ALIGN_CENTER);
  bytes.push(...COMMANDS.BOLD_ON);
  bytes.push(...COMMANDS.DOUBLE_SIZE);
  bytes.push(...lineBytes(rs.header_text || 'DONATTOUR'));
  bytes.push(...COMMANDS.NORMAL_SIZE);
  bytes.push(...lineBytes(data.namaOutlet));
  bytes.push(...COMMANDS.BOLD_OFF);
  
  const addr = rs.address_text || data.alamatOutlet;
  bytes.push(...lineBytes(addr.substring(0, WIDTH)));
  
  if (rs.tax_info) {
    bytes.push(...lineBytes(rs.tax_info.substring(0, WIDTH)));
  }
  bytes.push(...COMMANDS.FEED_LINE);

  // DIVIDER
  bytes.push(...COMMANDS.ALIGN_LEFT);
  bytes.push(...lineBytes(COMMANDS.DIVIDER.substring(0, WIDTH)));

  // TRANSACTION INFO
  bytes.push(...lineBytes(`No  : ${data.noTrx}`));
  bytes.push(...lineBytes(`Waktu: ${data.waktu}`));
  bytes.push(...lineBytes(`Kasir: ${data.kasirName || 'Kasir'}`));
  const custLine = `Pelanggan: ${data.namaPelanggan}`;
  bytes.push(...lineBytes(custLine.substring(0, WIDTH)));
  
  // Channel
  const channelMap: Record<string, string> = {
    toko: 'Toko', otr: 'OTR', gofood: 'GoFood',
    shopeefood: 'ShopeeFood', grabfood: 'GrabFood', online: 'Online'
  };
  bytes.push(...lineBytes(`Channel: ${channelMap[data.channel] || data.channel}`));
  bytes.push(...lineBytes(COMMANDS.DIVIDER.substring(0, WIDTH)));

  // ITEMS
  bytes.push(...COMMANDS.BOLD_ON);
  bytes.push(...lineBytes('ITEM'));
  bytes.push(...COMMANDS.BOLD_OFF);

  for (const item of data.items) {
    const namaLine = padRight(item.nama, WIDTH - 8);
    bytes.push(...lineBytes(namaLine));
    const qtyPrice = `  ${item.qty}x ${formatRp(item.harga)}`;
    const sub = padLeft(formatRp(item.subtotal), WIDTH - qtyPrice.length);
    bytes.push(...lineBytes(`${qtyPrice}${sub}`));
  }

  // BIAYA EKSTRA
  if (data.biayaEkstra.length > 0) {
    bytes.push(...lineBytes('- - - - - - - - - - - - - - - -'));
    bytes.push(...lineBytes('Biaya Tambahan:'));
    for (const b of data.biayaEkstra) {
      const left = padRight(`  ${b.nama}`, WIDTH - 12);
      const right = padLeft(formatRp(b.harga), 12);
      bytes.push(...lineBytes(`${left}${right}`));
    }
  }

  bytes.push(...lineBytes(COMMANDS.DIVIDER.substring(0, WIDTH)));

  // TOTALS
  const subLeft = padRight('Subtotal', WIDTH - 16);
  const subRight = padLeft(formatRp(data.subtotal), 16);
  bytes.push(...lineBytes(`${subLeft}${subRight}`));

  if (data.totalBiaya > 0) {
    const feeLeft = padRight('Biaya Lain', WIDTH - 16);
    const feeRight = padLeft(formatRp(data.totalBiaya), 16);
    bytes.push(...lineBytes(`${feeLeft}${feeRight}`));
  }

  bytes.push(...lineBytes(COMMANDS.DIVIDER.substring(0, WIDTH)));
  bytes.push(...COMMANDS.BOLD_ON);
  const totalLeft = padRight('TOTAL', WIDTH - 16);
  const totalRight = padLeft(formatRp(data.finalTotal), 16);
  bytes.push(...lineBytes(`${totalLeft}${totalRight}`));
  bytes.push(...COMMANDS.BOLD_OFF);

  // PAYMENT
  const metodePretty: Record<string, string> = {
    cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer',
    gopay: 'GoPay', ovo: 'OVO', dana: 'Dana', shopeepay: 'ShopeePay', card: 'Kartu'
  };
  bytes.push(...lineBytes(`Bayar: ${metodePretty[data.metodeBayar] || data.metodeBayar}`));
  
  if (data.metodeBayar === 'cash') {
    const bayarLeft = padRight('  Diterima', WIDTH - 16);
    const bayarRight = padLeft(formatRp(data.bayar), 16);
    bytes.push(...lineBytes(`${bayarLeft}${bayarRight}`));
    bytes.push(...COMMANDS.BOLD_ON);
    const kembaliLeft = padRight('  Kembalian', WIDTH - 16);
    const kembaliRight = padLeft(formatRp(data.kembalian), 16);
    bytes.push(...lineBytes(`${kembaliLeft}${kembaliRight}`));
    bytes.push(...COMMANDS.BOLD_OFF);
  }

  // FOOTER
  bytes.push(...COMMANDS.FEED_2);
  bytes.push(...COMMANDS.ALIGN_CENTER);
  bytes.push(...lineBytes(rs.footer_text || 'Terima kasih atas kunjungannya!'));
  
  if (rs.social_media) {
    bytes.push(...lineBytes(rs.social_media.substring(0, WIDTH)));
  } else {
    bytes.push(...lineBytes('- Donat Selembut Awan -'));
  }
  
  if (rs.wifi_password) {
    bytes.push(...lineBytes(`WiFi: ${rs.wifi_password.substring(0, WIDTH)}`));
  }
  
  bytes.push(...COMMANDS.FEED_3);

  // CUT
  bytes.push(...COMMANDS.CUT);

  return new Uint8Array(bytes);
}

export class BluetoothPrinter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private _isConnected = false;

  isConnected(): boolean {
    return this._isConnected && !!this.device?.gatt?.connected;
  }

  getDeviceName(): string | null {
    return this.device?.name || null;
  }

  async connect(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!('bluetooth' in navigator)) {
      return { success: false, error: 'Web Bluetooth tidak didukung browser ini. Gunakan Chrome/Edge.' };
    }

    try {
      // Request device — try multiple service UUIDs
      this.device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICE_UUIDS,
      });

      if (!this.device?.gatt) {
        return { success: false, error: 'GATT server tidak tersedia.' };
      }

      const server = await this.device.gatt.connect();

      // Try each service UUID
      let service: BluetoothRemoteGATTService | null = null;
      for (const uuid of PRINTER_SERVICE_UUIDS) {
        try {
          service = await server.getPrimaryService(uuid);
          if (service) break;
        } catch {
          // Try next UUID
        }
      }

      if (!service) {
        // Last resort: get first available service
        try {
          const services = await server.getPrimaryServices();
          service = services[0] || null;
        } catch {
          return { success: false, error: 'Service printer tidak ditemukan. Pastikan printer dalam mode pairing.' };
        }
      }

      if (!service) {
        return { success: false, error: 'Tidak dapat menemukan service printer.' };
      }

      // Try each characteristic UUID
      for (const uuid of PRINTER_CHAR_UUIDS) {
        try {
          this.characteristic = await service.getCharacteristic(uuid);
          if (this.characteristic) break;
        } catch {
          // Try next
        }
      }

      if (!this.characteristic) {
        try {
          const chars = await service.getCharacteristics();
          // Find writable characteristic
          const writable = chars.find(c =>
            c.properties.write || c.properties.writeWithoutResponse
          );
          this.characteristic = writable || chars[0] || null;
        } catch {
          return { success: false, error: 'Tidak dapat menemukan karakteristik printer.' };
        }
      }

      if (!this.characteristic) {
        return { success: false, error: 'Karakteristik printer tidak ditemukan.' };
      }

      this._isConnected = true;

      // Listen for disconnect
      this.device.addEventListener('gattserverdisconnected', () => {
        this._isConnected = false;
        this.characteristic = null;
      });

      return { success: true, deviceName: this.device.name || 'Printer Bluetooth' };

    } catch (err: any) {
      if (err?.name === 'NotFoundError') {
        return { success: false, error: 'Tidak ada printer yang dipilih.' };
      }
      if (err?.name === 'SecurityError') {
        return { success: false, error: 'Izin Bluetooth ditolak.' };
      }
      return { success: false, error: err?.message || 'Gagal menghubungkan printer.' };
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this._isConnected = false;
    this.characteristic = null;
  }

  async printReceipt(data: StrukData): Promise<{ success: boolean; error?: string }> {
    if (!this.isConnected() || !this.characteristic) {
      return { success: false, error: 'Printer tidak terhubung.' };
    }

    try {
      const bytes = buildReceiptBytes(data);

      // Split into chunks (BLE has MTU limit ~512 bytes)
      const CHUNK_SIZE = 512;
      for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        const chunk = bytes.slice(i, i + CHUNK_SIZE);
        if (this.characteristic.properties.writeWithoutResponse) {
          await this.characteristic.writeValueWithoutResponse(chunk);
        } else {
          await this.characteristic.writeValue(chunk);
        }
        // Small delay between chunks
        await new Promise(r => setTimeout(r, 50));
      }

      return { success: true };
    } catch (err: any) {
      this._isConnected = false;
      return { success: false, error: err?.message || 'Gagal mencetak.' };
    }
  }

  async printTestPage(): Promise<{ success: boolean; error?: string }> {
    const testData: StrukData = {
      noTrx: 'TEST-001',
      namaOutlet: 'Outlet Test',
      alamatOutlet: 'Jl. Test No. 1',
      namaPelanggan: 'Test Customer',
      kasirName: 'Kasir Test',
      waktu: new Date().toLocaleString('id-ID'),
      items: [
        { nama: 'Donat Cokelat', qty: 2, harga: 12000, subtotal: 24000 },
        { nama: 'Donat Strawberry', qty: 1, harga: 12000, subtotal: 12000 },
      ],
      biayaEkstra: [],
      subtotal: 36000,
      totalBiaya: 0,
      finalTotal: 36000,
      metodeBayar: 'cash',
      bayar: 50000,
      kembalian: 14000,
      channel: 'toko',
    };
    return this.printReceipt(testData);
  }
}

// Singleton instance
export const bluetoothPrinter = new BluetoothPrinter();
