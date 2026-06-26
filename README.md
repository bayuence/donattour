# 🍩 Donattour System

Sistem manajemen toko donat yang komprehensif dengan fitur offline-first PWA.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local dengan credentials Supabase

# Run development server
npm run dev

# Build for production
npm run build
```

## 🔧 Troubleshooting

Jika mengalami masalah (stok negatif, cache issues, dll), lihat [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### Quick Fix: Negative Stock
```bash
npx tsx scripts/fix-negative-stock.ts
```

## 📱 Features

- ✅ **Offline-first PWA** - Bekerja tanpa internet
- ✅ **Real-time sync** - Auto sync saat online kembali
- ✅ **Multi-outlet** - Kelola banyak outlet
- ✅ **POS System** - Kasir cepat & mudah
- ✅ **Production tracking** - Monitor produksi harian
- ✅ **Inventory management** - Stok real-time
- ✅ **Reports & Analytics** - Laporan lengkap

## 🛠️ Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL)
- **Offline DB:** PGLite (Client-side PostgreSQL)
- **UI:** Tailwind CSS + shadcn/ui
- **State:** TanStack Query (React Query)
- **PWA:** next-pwa + Workbox

## 📂 Project Structure

```
donattourSYSTEM/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/       # Dashboard routes
│   ├── api/               # API routes
│   └── login/             # Auth pages
├── components/            # React components
│   ├── pos/              # POS system components
│   ├── inventory/        # Inventory components
│   └── ui/               # Reusable UI components
├── lib/                   # Core libraries
│   ├── db/               # Database access layer
│   ├── offline/          # Offline mode logic
│   ├── hooks/            # Custom React hooks
│   └── utils/            # Utility functions
├── scripts/              # Maintenance scripts
│   └── fix-negative-stock.ts
├── public/               # Static assets
└── OFFLINEMODE/         # Offline mode documentation
```

## 🔐 Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📖 Documentation

- [Offline Mode Guide](./OFFLINEMODE/INDEX.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

## 🧪 Testing

```bash
# Run in offline mode
# 1. Open DevTools (F12)
# 2. Tab "Application" → "Service Workers"
# 3. Check "Offline"
# 4. Test kasir, production input, etc.
```

## 🚀 Deployment

System ini sudah ready untuk deployment ke:
- **Vercel** (Recommended)
- **Netlify**
- **Any Node.js hosting**

```bash
# Deploy to Vercel
vercel --prod
```

## 🐛 Known Issues & Fixes

### Stok Negatif (-5)
**Cause:** Data corrupted dari testing  
**Fix:** Run `npx tsx scripts/fix-negative-stock.ts`

### PWA Cache Stuck
**Cause:** Service worker tidak update  
**Fix:** Clear cache & unregister service worker

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more.

## 📝 License

Private - Donattour System

---

**Developed with ❤️ by Bayuence**
