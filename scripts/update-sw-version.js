/**
 * update-sw-version.js
 * Dijalankan otomatis sebelum setiap `npm run build` via "prebuild" script.
 * Tujuan: Update SW_VERSION di service-worker.js agar browser selalu
 *         mendeteksi file service worker baru → trigger auto-update PWA.
 */

const fs = require('fs');
const path = require('path');

const now = new Date();

// Format: YYYY.MM.DD.HHMM (unik setiap menit, cukup untuk trigger update)
const pad = (n) => String(n).padStart(2, '0');
const version = [
  now.getFullYear(),
  pad(now.getMonth() + 1),
  pad(now.getDate()),
  pad(now.getHours()) + pad(now.getMinutes()),
].join('.');

const swPath = path.join(__dirname, '../public/service-worker.js');

let content = fs.readFileSync(swPath, 'utf-8');

// Ganti baris SW_VERSION dengan versi baru
const updated = content.replace(
  /const SW_VERSION = '[^']*';/,
  `const SW_VERSION = '${version}';`
);

if (updated === content) {
  console.warn('⚠️  [update-sw-version] Pattern SW_VERSION tidak ditemukan di service-worker.js!');
  process.exit(0);
}

fs.writeFileSync(swPath, updated, 'utf-8');
console.log(`✅ [update-sw-version] SW_VERSION → ${version}`);
