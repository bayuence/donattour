'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { pwaLogger } from '@/lib/utils/logger'
import { initSyncManager } from '@/lib/offline/sync'

/**
 * PWAInstaller — Auto Update + Notifikasi "diperbarui oleh Ence"
 *
 * Cara kerja:
 * 1. Daftarkan Service Worker
 * 2. Cek update setiap 5 menit (+ 10 detik setelah load pertama)
 * 3. Jika ada versi baru: tampilkan notif → langsung apply → reload otomatis
 * 4. Pengguna TIDAK perlu menyetujui apapun
 */
export default function PWAInstaller() {
  useEffect(() => {
    // Temporarily disabled PWA auto-update to prevent infinite reload loop
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let checkInterval: NodeJS.Timeout | null = null
    let reloadScheduled = false

    // PWA auto-update DISABLED to prevent infinite reload loops
    // Users should manually update or update via deploy
    
    return () => {
      if (checkInterval) clearInterval(checkInterval);
    }
  }, [])

  return null
}
