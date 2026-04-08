'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

/**
 * PWAInstaller - Versi CERDAS (Smart & Silent)
 * Otomatis mendeteksi update, mengunduh di latar belakang, 
 * dan memuat ulang halaman secara otomatis tanpa bertanya ke pengguna.
 */
export default function PWAInstaller() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let checkInterval: NodeJS.Timeout | null = null

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js', {
          updateViaCache: 'none',
        })

        console.log('✅ Service Worker registered:', reg.scope)

        // ─── FUNGSI EKSEKUSI UPDATE OTOMATIS ─────────────────
        const applySilentUpdate = (worker: ServiceWorker) => {
          console.log('🔄 Menerapkan update otomatis...')
          
          // Beri tahu pengguna via toast halus (tidak mengganggu)
          toast.info('Sistem diperbarui secara otomatis', {
            description: 'Memuat fitur terbaru Donattour...',
            duration: 3000
          })

          // Beri jeda sebentar agar toast terlihat, lalu skip waiting
          setTimeout(() => {
            worker.postMessage('SKIP_WAITING')
          }, 1000)
        }

        // Handler saat SW baru ditemukan (sedang installing)
        const handleUpdateFound = () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            // SW baru sudah ter-install dan siap dipicu
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              applySilentUpdate(newWorker)
            }
          })
        }

        reg.addEventListener('updatefound', handleUpdateFound)

        // Jika SW baru sudah waiting sejak halaman dibuka (pernah ter-install tapi gagal reload)
        if (reg.waiting && navigator.serviceWorker.controller) {
          applySilentUpdate(reg.waiting)
        }

        // ─── CEK UPDATE BERKALA (Setiap 5 Menit) ─────────────
        checkInterval = setInterval(() => {
          console.log('🔍 Mengetes update sistem...')
          reg.update().catch(() => {})
        }, 5 * 60 * 1000)

        // Cek pertama kali setelah 10 detik
        setTimeout(() => reg.update().catch(() => {}), 10000)

      } catch (err) {
        console.warn('❌ Service Worker registration failed:', err)
      }
    }

    // Pemicu Reload: Saat SW baru mengambil alih kontrol
    const onControllerChange = () => {
      console.log('🚀 Versi baru siap, memuat ulang aplikasi...')
      window.location.reload()
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    registerSW()

    return () => {
      if (checkInterval) clearInterval(checkInterval)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  return null // Tidak merender apapun (semua berjalan di latar belakang)
}
