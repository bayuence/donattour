/**
 * lib/bluetooth-printer.ts
 * 
 * Bluetooth Thermal Printer Integration menggunakan Web Bluetooth API
 * Kompatibel dengan printer ESC/POS (Epson, Xprinter, GOOJPRT, POS58, RPP02, dll)
 * 
 * OPTIMIZED: Data dikirim lebih lambat dan reliable agar printer murah tidak overflow
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

const COMMANDS = {
  INIT: [ESC, 0x40],                    // Initialize printer
  ALIGN_LEFT: [ESC, 0x61, 0x00],        // Left align
  ALIGN_CENTER: [ESC, 0x61, 0x01],      // Center align
  ALIGN_RIGHT: [ESC, 0x61, 0x02],       // Right align
  BOLD_ON: [ESC, 0x45, 0x01],           // Bold on
  BOLD_OFF: [ESC, 0x45, 0x00],          // Bold off
  // Gunakan DOUBLE_WIDTH saja (lebih ringan, lebih kompatibel daripada DOUBLE_SIZE)
  EMPHASIS_ON: [GS, 0x21, 0x10],        // Double width only (header toko)
  EMPHASIS_OFF: [GS, 0x21, 0x00],       // Normal size
  UNDERLINE_ON: [ESC, 0x2d, 0x01],      // Underline on
  UNDERLINE_OFF: [ESC, 0x2d, 0x00],     // Underline off
  FEED_LINE: [LF],                      // Feed 1 line
  FEED_2: [ESC, 0x64, 0x02],            // Feed 2 lines
  FEED_3: [ESC, 0x64, 0x03],            // Feed 3 lines
  FEED_4: [ESC, 0x64, 0x04],            // Feed 4 lines
  // CUT yang lebih compatible - GS V 66 n (partial cut with fed n lines)
  // Banyak printer 58mm tidak ada cutter, jadi kita feed saja tanpa cut
  CUT_SAFE: [GS, 0x56, 0x42, 0x00],    // GS V 66 0 (lebih safe/compatible)
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
  items: any[];
  automatedBoxes?: { box: any; qty: number }[];
  automatedBoxTotal?: number;
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

// ─── IMAGE PROCESSING FOR LOGO ─────────────────────
// Metode "bit-image column" yang lebih compatible daripada raster
// Menggunakan ESC * (Select bit-image mode) yang didukung hampir semua printer ESC/POS
async function imageToEscBitmapBytes(imageUrl: string, maxWidth: number = 192): Promise<number[] | null> {
  if (!imageUrl) return null;

  // Only works in browser environment
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    console.warn('Image processing hanya tersedia di browser');
    return null;
  }

  try {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      // Timeout ketat - jangan block terlalu lama
      const timeout = setTimeout(() => {
        console.warn('⏱️ timeout image load (3s) - lanjut tanpa logo');
        img.src = '';
        resolve(null);
      }, 3000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          // --- UKURAN LOGO IDEAL ---
          // Printer 58mm punya lebar ~384 dot. 
          // Gunakan lebar yang lebih "manis" untuk logo (120px)
          const targetWidth = Math.min(maxWidth, 90); 
          const scale = targetWidth / img.width;
          const width = targetWidth;
          const rawHeight = Math.round(img.height * scale);
          const height = Math.ceil(rawHeight / 8) * 8;

          canvas.width = width;
          canvas.height = height;

          // Background putih (penting agar area transparan tidak jadi hitam)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, rawHeight);

          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;

          // --- FLOYD-STEINBERG DITHERING ---
          // Teknik membuat "efek abu-abu" menggunakan titik-titik (dot)
          // Agar foto terlihat natural, bukan blok hitam pekat
          const greyscale = new Float32Array(width * height);
          for (let i = 0; i < data.length; i += 4) {
            // formula luminance: 0.299R + 0.587G + 0.114B
            greyscale[i / 4] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          }

          const bitmap = new Uint8Array(width * height);
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const i = y * width + x;
              const oldPixel = greyscale[i];
              const newPixel = oldPixel < 128 ? 0 : 255;
              bitmap[i] = newPixel === 0 ? 1 : 0; // 1 = hitam, 0 = putih
              const error = oldPixel - newPixel;

              // Tebarkan error ke tetangga (Floyd-Steinberg pattern)
              if (x + 1 < width) greyscale[i + 1] += error * (7 / 16);
              if (y + 1 < height) {
                if (x > 0) greyscale[i + width - 1] += error * (3 / 16);
                greyscale[i + width] += error * (5 / 16);
                if (x + 1 < width) greyscale[i + width + 1] += error * (1 / 16);
              }
            }
          }

          const commands: number[] = [];
          // Gunakan ESC * m nL nH (Select bit-image mode)
          // Mode 0 = 8-dot single density
          for (let stripeY = 0; stripeY < height; stripeY += 8) {
            commands.push(ESC, 0x2a, 0x00); 
            commands.push(width & 0xFF, (width >> 8) & 0xFF);

            for (let x = 0; x < width; x++) {
              let columnByte = 0;
              for (let bit = 0; bit < 8; bit++) {
                const y = stripeY + bit;
                if (y < height) {
                  const i = y * width + x;
                  if (bitmap[i] === 1) {
                    columnByte |= (0x80 >> bit);
                  }
                }
              }
              commands.push(columnByte);
            }
            commands.push(LF);
          }

          console.log(`✅ Logo Dithered: ${width}x${height}px, ${commands.length} bytes`);
          
          // Jika data terlalu besar (>8KB), skip logo
          if (commands.length > 8000) {
            console.warn('⚠️ Logo data terlalu besar (>8KB), skip logo untuk stabilitas');
            resolve(null);
            return;
          }

          resolve(commands);
        } catch (err) {
          console.error('Error processing image:', err);
          resolve(null);
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        console.error('❌ Failed to load image from:', imageUrl);
        resolve(null);
      };

      if (typeof imageUrl === 'string') {
        img.src = imageUrl;
      }
    });
  } catch (err) {
    console.error('❌ Error in imageToEscBitmapBytes:', err);
    return null;
  }
}

function buildReceiptBytes(data: StrukData): Uint8Array {
  const formatRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
  const padRight = (str: string, len: number) => str.substring(0, len).padEnd(len, ' ');
  const padLeft = (str: string, len: number) => str.substring(0, len).padStart(len, ' ');

  const WIDTH = 32; // 58mm printer = 32 chars

  const bytes: number[] = [];
  const rs = data.receiptSettings || {};

  // ═══ INIT ═══
  // Hanya ESC @ (initialize) - sederhana dan universal
  bytes.push(...COMMANDS.INIT);

  // ═══ HEADER ═══  
  bytes.push(...COMMANDS.ALIGN_CENTER);

  // Hanya cetak HEADER UTAMA jika ada teksnya
  if (rs.header_text && rs.header_text.trim() !== '') {
    bytes.push(...COMMANDS.BOLD_ON);
    bytes.push(...COMMANDS.EMPHASIS_ON);
    bytes.push(...lineBytes(rs.header_text));
    bytes.push(...COMMANDS.EMPHASIS_OFF);
    bytes.push(...COMMANDS.BOLD_OFF);
  }

  // Nama Outlet selalu dicetak (sebagai nama toko default)
  bytes.push(...lineBytes(data.namaOutlet));

  // Hanya cetak ALAMAT jika diisi
  const addr = rs.address_text || data.alamatOutlet;
  if (addr && addr.trim() !== '') {
    bytes.push(...lineBytes(addr.substring(0, WIDTH)));
  }

  if (rs.tax_info && rs.tax_info.trim() !== '') {
    bytes.push(...lineBytes(rs.tax_info.substring(0, WIDTH)));
  }
  bytes.push(...COMMANDS.FEED_LINE);

  // ═══ DIVIDER ═══
  bytes.push(...COMMANDS.ALIGN_LEFT);
  bytes.push(...lineBytes(COMMANDS.DIVIDER.substring(0, WIDTH)));

  // ═══ TRANSACTION INFO ═══
  bytes.push(...lineBytes(`No: ${data.noTrx}`));
  bytes.push(...lineBytes(`Waktu: ${data.waktu}`));
  bytes.push(...lineBytes(`Kasir: ${data.kasirName || 'Kasir'}`));
  bytes.push(...lineBytes(`Pelanggan: ${data.namaPelanggan}`));

  const channelMap: Record<string, string> = {
    toko: 'Toko', otr: 'OTR', gofood: 'GoFood',
    shopeefood: 'ShopeeFood', grabfood: 'GrabFood', online: 'Online'
  };
  bytes.push(...lineBytes(`Ch: ${channelMap[data.channel] || data.channel}`));
  bytes.push(...lineBytes(COMMANDS.DIVIDER.substring(0, WIDTH)));

  // ═══ ITEMS ═══
  bytes.push(...COMMANDS.BOLD_ON);
  const itemHeader = padRight('ITEM', 18) + padLeft('HARGA', 14);
  bytes.push(...lineBytes(itemHeader));
  bytes.push(...COMMANDS.BOLD_OFF);

  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      let displayName = item.nama || item.namaPaket || 'Item';
      if (item.type === 'paket' && item.kode) {
        displayName = `[${item.kode}] ` + displayName;
      }
      
      const namaLine = padRight(displayName.substring(0, WIDTH), WIDTH);
      bytes.push(...lineBytes(namaLine));
      
      const itemQty = item.qty || 1;
      const itemHarga = item.harga || item.hargaPaket || item.totalHarga || 0;
      const itemSubtotal = item.subtotal || item.hargaPaket || item.totalHarga || 0;
      
      const qtyPrice = `  ${itemQty}x ${formatRp(itemHarga)}`;
      const sub = padLeft(formatRp(itemSubtotal), Math.max(0, WIDTH - qtyPrice.length));
      bytes.push(...lineBytes(`${qtyPrice}${sub}`));

      // Breakdown isi paket
      if (item.type === 'paket' && item.isiDonat && item.isiDonat.length > 0) {
        const map = new Map();
        for (const d of item.isiDonat) {
          if (!d.productId) continue;
          if (map.has(d.productId)) map.get(d.productId).qty++;
          else map.set(d.productId, { nama: d.nama, qty: 1 });
        }
        for (const [_, d] of Array.from(map.entries())) {
           bytes.push(...lineBytes(`   - ${d.nama}${d.qty > 1 ? ` x${d.qty}` : ''}`.substring(0, WIDTH)));
        }
        if (item.boxNama) {
           bytes.push(...lineBytes(`   [Box] ${item.boxNama}`.substring(0, WIDTH)));
        }
        if (item.extras && item.extras.length > 0) {
           for (const e of item.extras) {
             bytes.push(...lineBytes(`   + ${e.nama} x${e.qty} (${formatRp(e.harga)})`.substring(0, WIDTH)));
           }
        }
        if (item.diskon && item.diskon > 0) {
           bytes.push(...lineBytes(`   * Hemat ${formatRp(item.diskon)}`.substring(0, WIDTH)));
        }
      }
    }
  } else {
    bytes.push(...lineBytes('[Tidak ada item]'));
  }

  // ═══ AUTOMATED BOXES ═══
  if (data.automatedBoxes && data.automatedBoxes.length > 0) {
    for (const a of data.automatedBoxes) {
      const boxName = `[Box] ${a.box.nama}`;
      bytes.push(...lineBytes(padRight(boxName.substring(0, WIDTH), WIDTH)));
      const qtyPrice = `  ${a.qty}x ${formatRp(a.box.harga_box)}`;
      const sub = padLeft(formatRp(a.qty * a.box.harga_box), Math.max(0, WIDTH - qtyPrice.length));
      bytes.push(...lineBytes(`${qtyPrice}${sub}`));
    }
  }

  // ═══ BIAYA EKSTRA ═══
  if (data.biayaEkstra && data.biayaEkstra.length > 0) {
    bytes.push(...lineBytes(COMMANDS.DIVIDER.substring(0, WIDTH)));
    bytes.push(...COMMANDS.BOLD_ON);
    bytes.push(...lineBytes('BIAYA TAMBAHAN:'));
    bytes.push(...COMMANDS.BOLD_OFF);
    for (const b of data.biayaEkstra) {
      const left = padRight(`  ${b.nama}`, WIDTH - 12);
      const right = padLeft(formatRp(b.harga), 12);
      bytes.push(...lineBytes(`${left}${right}`));
    }
  }

  bytes.push(...lineBytes(COMMANDS.DIVIDER.substring(0, WIDTH)));

  // ═══ TOTALS ═══
  const subLeft = padRight('Subtotal', WIDTH - 16);
  const subRight = padLeft(formatRp(data.subtotal), 16);
  bytes.push(...lineBytes(`${subLeft}${subRight}`));

  if ((data.automatedBoxTotal || 0) > 0) {
    const boxLeft = padRight('Kemasan Box', WIDTH - 16);
    const boxRight = padLeft(formatRp(data.automatedBoxTotal!), 16);
    bytes.push(...lineBytes(`${boxLeft}${boxRight}`));
  }

  if (data.totalBiaya > 0) {
    const feeLeft = padRight('Biaya Lain', WIDTH - 16);
    const feeRight = padLeft(formatRp(data.totalBiaya), 16);
    bytes.push(...lineBytes(`${feeLeft}${feeRight}`));
  }

  bytes.push(...lineBytes(COMMANDS.DIVIDER.substring(0, WIDTH)));
  bytes.push(...COMMANDS.BOLD_ON);
  const totalLeft = padRight('TOTAL BAYAR', WIDTH - 16);
  const totalRight = padLeft(formatRp(data.finalTotal), 16);
  bytes.push(...lineBytes(`${totalLeft}${totalRight}`));
  bytes.push(...COMMANDS.BOLD_OFF);

  // ═══ PAYMENT INFO ═══
  bytes.push(...COMMANDS.FEED_LINE);
  const metodePretty: Record<string, string> = {
    cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer',
    gopay: 'GoPay', ovo: 'OVO', dana: 'Dana', shopeepay: 'ShopeePay', card: 'Kartu'
  };
  const methodLine = padRight(`Bayar: ${metodePretty[data.metodeBayar] || data.metodeBayar}`, WIDTH);
  bytes.push(...lineBytes(methodLine));

  if (data.metodeBayar === 'cash') {
    const bayarLeft = padRight('Diterima', WIDTH - 14);
    const bayarRight = padLeft(formatRp(data.bayar), 14);
    bytes.push(...lineBytes(`${bayarLeft}${bayarRight}`));
    bytes.push(...COMMANDS.BOLD_ON);
    const kembaliLeft = padRight('Kembalian', WIDTH - 14);
    const kembaliRight = padLeft(formatRp(data.kembalian), 14);
    bytes.push(...lineBytes(`${kembaliLeft}${kembaliRight}`));
    bytes.push(...COMMANDS.BOLD_OFF);
  }

  // ═══ FOOTER ═══
  bytes.push(...COMMANDS.FEED_2);
  bytes.push(...COMMANDS.ALIGN_CENTER);
  
  // Hanya cetak FOOTER jika diisi
  if (rs.footer_text && rs.footer_text.trim() !== '') {
    bytes.push(...lineBytes(rs.footer_text));
  }
  
  // Hanya cetak SOCIAL MEDIA jika diisi
  if (rs.social_media && rs.social_media.trim() !== '') {
    bytes.push(...lineBytes(rs.social_media.substring(0, WIDTH)));
  }
  
  // Hanya cetak WIFI jika diisi
  if (rs.wifi_password && rs.wifi_password.trim() !== '') {
    bytes.push(...lineBytes(`WiFi: ${rs.wifi_password.substring(0, WIDTH)}`));
  }
  
  // ═══ AKHIR: Feed kertas cukup panjang agar bisa dirobek ═══
  bytes.push(...COMMANDS.FEED_4);

  // TIDAK kirim CUT command secara default
  if (rs.enable_auto_cut) {
    bytes.push(...COMMANDS.CUT_SAFE);
  }

  return new Uint8Array(bytes);
}

export class BluetoothPrinter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private _isConnected = false;
  private onConnectionChange: ((connected: boolean) => void) | null = null;

  setConnectionChangeCallback(callback: ((connected: boolean) => void) | null) {
    this.onConnectionChange = callback;
  }

  isConnected(): boolean {
    const gattConnected = this.device?.gatt?.connected ?? false;
    const charAvailable = !!this.characteristic?.properties.write || !!this.characteristic?.properties.writeWithoutResponse;
    return gattConnected && charAvailable && this._isConnected;
  }

  getDeviceName(): string | null {
    return this.device?.name || null;
  }

  // ─── CORE: Kirim bytes ke printer dengan flow control ─────
  // Metode ini menangani chunking, delay, dan error handling
  private async sendBytes(data: Uint8Array): Promise<{ success: boolean; error?: string }> {
    if (!this.characteristic) {
      return { success: false, error: 'Characteristic not available' };
    }

    const canWrite = this.characteristic.properties.write;
    const canWriteWithoutResponse = this.characteristic.properties.writeWithoutResponse;

    if (!canWrite && !canWriteWithoutResponse) {
      return { success: false, error: 'Printer tidak support write operations' };
    }

    console.log(`🔧 Write mode: write=${canWrite}, writeWithoutResponse=${canWriteWithoutResponse}`);
    console.log(`📦 Total data: ${data.length} bytes`);

    // ─── KONFIGURASI PENGIRIMAN ───
    // Chunk size lebih besar = lebih sedikit overhead
    // Delay lebih lama = printer punya waktu proses
    const CHUNK_SIZE = 100;          // Naik dari 20 → 100 bytes per chunk
    const DELAY_MS = 50;              // Naik dari 10 → 50ms antar chunk
    const DELAY_FIRST_CHUNK = 150;    // Delay ekstra setelah chunk pertama (init printer)
    const DELAY_LAST_CHUNK = 100;     // Delay ekstra setelah chunk terakhir (finalize)

    let sentBytes = 0;
    let consecutiveErrors = 0;
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      // Cek koneksi masih aktif
      if (!this.device?.gatt?.connected || !this.characteristic) {
        this._isConnected = false;
        return { success: false, error: 'Koneksi hilang saat mencetak. Print ulang.' };
      }

      const chunk = data.slice(i, i + CHUNK_SIZE);
      const chunkNum = Math.floor(i / CHUNK_SIZE) + 1;
      let writeSuccess = false;

      // ─── PRIORITAS: writeValue (dengan acknowledgment) ───
      // Lebih lambat tapi JAUH lebih reliable
      // Printer mengirim ACK sebelum kita kirim chunk berikutnya
      if (canWrite && !writeSuccess) {
        try {
          await this.characteristic.writeValue(chunk);
          writeSuccess = true;
        } catch (err: any) {
          console.warn(`⚠️ writeValue gagal chunk ${chunkNum}:`, err?.message);
          // Jika writeValue error, coba writeWithoutResponse
        }
      }

      // Fallback ke writeWithoutResponse (tanpa ACK)
      if (!writeSuccess && canWriteWithoutResponse) {
        try {
          await this.characteristic.writeValueWithoutResponse(chunk);
          writeSuccess = true;
        } catch (err: any) {
          console.warn(`⚠️ writeWithoutResponse gagal chunk ${chunkNum}:`, err?.message);
        }
      }

      if (!writeSuccess) {
        consecutiveErrors++;
        console.error(`❌ Chunk ${chunkNum}/${totalChunks} gagal total`);

        if (consecutiveErrors >= 3) {
          this._isConnected = false;
          return {
            success: false,
            error: `Gagal mengirim data ke printer setelah 3x percobaan. Coba konek ulang.`
          };
        }

        // Tunggu lama sebelum retry chunk yang sama
        await new Promise(r => setTimeout(r, 300));
        i -= CHUNK_SIZE; // Retry chunk ini
        continue;
      }

      // Reset error counter jika sukses
      consecutiveErrors = 0;
      sentBytes += chunk.length;

      // Progress log setiap 10 chunk
      if (chunkNum % 10 === 0 || chunkNum === totalChunks) {
        const pct = Math.round((sentBytes / data.length) * 100);
        console.log(`📤 Progress: ${pct}% (${sentBytes}/${data.length} bytes, chunk ${chunkNum}/${totalChunks})`);
      }

      // ─── ADAPTIVE DELAY ───
      // Chunk pertama: delay ekstra karena printer perlu waktu init
      // Chunk terakhir: delay ekstra untuk finalize
      // Chunk biasa: delay standar
      let delay = DELAY_MS;
      if (chunkNum === 1) delay = DELAY_FIRST_CHUNK;
      else if (chunkNum === totalChunks) delay = DELAY_LAST_CHUNK;

      await new Promise(r => setTimeout(r, delay));
    }

    console.log(`✅ Semua data terkirim: ${sentBytes}/${data.length} bytes`);
    return { success: true };
  }

  // Simple test print untuk debug
  async printSimpleTest(): Promise<{ success: boolean; error?: string }> {
    if (!this.isConnected()) {
      return { success: false, error: 'Printer tidak terhubung' };
    }

    try {
      const bytes: number[] = [];
      bytes.push(...COMMANDS.INIT);
      bytes.push(...COMMANDS.ALIGN_CENTER);
      bytes.push(...COMMANDS.BOLD_ON);
      bytes.push(...lineBytes('=== TEST PRINT ==='));
      bytes.push(...COMMANDS.BOLD_OFF);
      bytes.push(...lineBytes('Printer OK!'));
      bytes.push(...lineBytes(new Date().toLocaleString('id-ID')));
      bytes.push(...COMMANDS.FEED_4);

      console.log(`🧪 Test print: ${bytes.length} bytes`);
      return this.sendBytes(new Uint8Array(bytes));
    } catch (err: any) {
      return { success: false, error: err?.message || 'Test print failed' };
    }
  }

  async connect(): Promise<{ success: boolean; deviceName?: string; error?: string }> {
    if (!('bluetooth' in navigator)) {
      return { success: false, error: 'Web Bluetooth tidak didukung browser ini. Gunakan Chrome/Edge.' };
    }

    try {
      // Request device — accept all devices, try multiple services
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
          if (service) {
            console.log(`✅ Found service: ${uuid}`);
            break;
          }
        } catch {
          // Try next UUID
        }
      }

      if (!service) {
        try {
          const services = await server.getPrimaryServices();
          service = services[0] || null;
          if (service) console.log(`✅ Using fallback service`);
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
          if (this.characteristic) {
            console.log(`✅ Found characteristic: ${uuid}`);
            console.log(`   Properties: write=${this.characteristic.properties.write}, writeWithoutResponse=${this.characteristic.properties.writeWithoutResponse}`);
            break;
          }
        } catch {
          // Try next
        }
      }

      if (!this.characteristic) {
        try {
          const chars = await service.getCharacteristics();
          const writable = chars.find(c =>
            c.properties.write || c.properties.writeWithoutResponse
          );
          this.characteristic = writable || chars[0] || null;

          if (this.characteristic) {
            console.log(`✅ Using fallback characteristic`);
            console.log(`   Properties: write=${this.characteristic.properties.write}, writeWithoutResponse=${this.characteristic.properties.writeWithoutResponse}`);
          }
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
        console.warn('⚠️ Printer disconnected (GATT event)');
        this._isConnected = false;
        this.characteristic = null;
        this.onConnectionChange?.(false);
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

  async printReceipt(data: StrukData, retryCount: number = 0): Promise<{ success: boolean; error?: string }> {
    const MAX_RETRIES = 2;

    // Validasi koneksi
    if (!this.device?.gatt?.connected) {
      if (retryCount < MAX_RETRIES) {
        console.warn(`⚠️ Koneksi hilang, mencoba reconnect... (retry ${retryCount + 1}/${MAX_RETRIES})`);
        try {
          if (this.device?.gatt) {
            await this.device.gatt.connect();
            await new Promise(r => setTimeout(r, 500));
            return this.printReceipt(data, retryCount + 1);
          }
        } catch (reconErr) {
          console.error('Reconnect gagal:', reconErr);
        }
      }
      this._isConnected = false;
      return { success: false, error: 'Printer tidak terhubung. Silakan konek ulang.' };
    }

    if (!this.characteristic) {
      return { success: false, error: 'Koneksi printer error. Hubungkan ulang.' };
    }

    try {
      const rs = data.receiptSettings || {};
      const startTime = Date.now();

      // ═══ LANGKAH 1: Siapkan data teks struk (pure text, ringan) ═══
      console.log('📄 Building receipt text...');
      const textBytes = buildReceiptBytes(data);
      console.log(`✅ Receipt text: ${textBytes.length} bytes (${Date.now() - startTime}ms)`);

      // ═══ LANGKAH 2: Proses logo (opsional, terpisah) ═══
      let logoBytes: number[] | null = null;
      if (rs.show_logo && rs.logo_url) {
        console.log('🎨 Processing logo...');
        try {
          logoBytes = await imageToEscBitmapBytes(rs.logo_url, 100); // Max 160px width
          if (logoBytes) {
            console.log(`✅ Logo: ${logoBytes.length} bytes`);
          } else {
            console.warn('⚠️ Logo gagal diproses, lanjut tanpa logo');
          }
        } catch (logoErr) {
          console.warn('⚠️ Logo error (lanjut tanpa logo):', logoErr);
          logoBytes = null;
        }
      }

      // ═══ LANGKAH 3: Kirim ke printer ═══
      // Jika ada logo, kirim TERPISAH (logo dulu, baru teks)
      // Ini agar jika logo gagal, teks tetap bisa dicetak

      if (logoBytes && logoBytes.length > 0) {
        console.log('🖨️ Printing logo...');
        // Kirim init + center + logo bytes
        const logoData = new Uint8Array([
          ...COMMANDS.INIT,
          ...COMMANDS.ALIGN_CENTER,
          ...logoBytes,
          LF, // Extra line after logo
        ]);
        
        const logoResult = await this.sendBytes(logoData);
        if (!logoResult.success) {
          console.warn('⚠️ Logo gagal dicetak, lanjut cetak teks saja');
          // Tidak return error - lanjut cetak teks
        } else {
          // Delay ekstra setelah logo agar printer selesai proses
          await new Promise(r => setTimeout(r, 300));
        }
      }

      // Kirim data teks struk
      console.log('🖨️ Printing receipt text...');
      const printResult = await this.sendBytes(textBytes);

      if (printResult.success) {
        const totalTime = Date.now() - startTime;
        console.log(`✅ Print berhasil! Total waktu: ${totalTime}ms`);
      }

      return printResult;

    } catch (err: any) {
      this._isConnected = false;
      const errorMsg = err?.message || 'Gagal mencetak.';
      console.error('❌ Print error:', errorMsg, err);
      return { success: false, error: errorMsg };
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
