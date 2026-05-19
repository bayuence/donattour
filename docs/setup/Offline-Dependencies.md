# 📦 Install Offline Dependencies

## Required Package

Untuk mengaktifkan fitur offline transaction, install package berikut:

```bash
npm install @tanstack/react-query-persist-client
```

## Verification

Setelah install, verifikasi dengan:

```bash
npm list @tanstack/react-query-persist-client
```

Output yang diharapkan:
```
donattoursystem@0.1.0
└── @tanstack/react-query-persist-client@5.x.x
```

## Next Steps

Setelah install, restart development server:

```bash
npm run dev
```

Fitur offline akan otomatis aktif! ✅

## Testing

1. Buka aplikasi di browser
2. Buka DevTools → Application → IndexedDB
3. Anda akan melihat database `donattour_offline_db` dengan stores:
   - `query_cache` - TanStack Query cache
   - `offline_queue` - Pending mutations
   - `offline_transactions` - Offline transactions
   - `offline_products` - Product cache
   - `offline_settings` - App settings

## Troubleshooting

Jika ada error setelah install:

1. Clear node_modules dan reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

2. Clear Next.js cache:
```bash
rm -rf .next
npm run dev
```

3. Clear browser cache dan IndexedDB:
   - DevTools → Application → Clear storage → Clear site data
