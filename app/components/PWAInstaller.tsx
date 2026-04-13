'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

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
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let checkInterval: NodeJS.Timeout | null = null
    let reloadScheduled = false

    // ─────────────────────────────────────────────────────────────
    // Tampilkan notifikasi update bergaya "oleh Ence" dan reload
    // ─────────────────────────────────────────────────────────────
    const applyUpdateAndReload = (worker: ServiceWorker) => {
      if (reloadScheduled) return // Hindari double-reload
      reloadScheduled = true

      console.log('🔄 [PWA] Update baru ditemukan, menerapkan...')

      // Tampilkan notif premium — pengguna tahu siapa yang update
      toast.success('✨ Aplikasi Diperbarui!', {
        description: '🚀 Update terbaru dari ence sudah diterapkan. Memuat ulang...',
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
          color: '#fff',
          border: 'none',
          fontWeight: '700',
        },
      })

      // Terapkan SW baru setelah 1.5 detik (beri waktu toast terlihat)
      setTimeout(() => {
        worker.postMessage('SKIP_WAITING')
      }, 1500)
    }

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js', {
          updateViaCache: 'none', // PENTING: jangan cache file SW itu sendiri
        })

        console.log('✅ [PWA] Service Worker terdaftar:', reg.scope)

        // Tangani SW baru yang sedang di-install
        const handleUpdateFound = () => {
          const newWorker = reg.installing
          if (!newWorker) return

          console.log('📦 [PWA] SW baru sedang di-install...')

          newWorker.addEventListener('statechange', () => {
            // Saat SW baru sudah ter-install & ada SW lama yang aktif
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              applyUpdateAndReload(newWorker)
            }
          })
        }

        reg.addEventListener('updatefound', handleUpdateFound)

        // Kasus: SW baru sudah waiting tapi belum diaktifkan (misalnya tab baru dibuka)
        if (reg.waiting && navigator.serviceWorker.controller) {
          console.log('⏳ [PWA] SW baru sudah menunggu, menerapkan...')
          applyUpdateAndReload(reg.waiting)
        }

        // ── Cek update berkala ────────────────────────────────────
        // Cek pertama: 10 detik setelah load (agar tidak block render awal)
        setTimeout(() => {
          reg.update().catch(() => {})
        }, 10_000)

        // Cek berikutnya: setiap 5 menit
        checkInterval = setInterval(() => {
          console.log('🔍 [PWA] Memeriksa pembaruan...')
          reg.update().catch(() => {})
        }, 5 * 60 * 1000)

      } catch (err) {
        console.warn('❌ [PWA] Gagal mendaftarkan Service Worker:', err)
      }
    }

    // ── Reload saat SW baru mengambil alih kontrol ───────────────
    // Ini dijalankan setelah SKIP_WAITING berhasil
    const onControllerChange = () => {
      console.log('🚀 [PWA] SW baru aktif, memuat ulang aplikasi...')
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    registerSW()

    return () => {
      if (checkInterval) clearInterval(checkInterval)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  return null
}
