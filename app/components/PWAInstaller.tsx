'use client'

import { RefreshCw, X, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

interface UpdateBannerProps {
  onUpdate: () => void
  onDismiss: () => void
  version?: string
}

// Banner sticky di bagian atas layar
function UpdateBanner({ onUpdate, onDismiss, version }: UpdateBannerProps) {
  const [visible, setVisible] = useState(false)

  // Animasi masuk
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] transition-transform duration-500 ease-out ${
        visible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Icon + Teks */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="shrink-0 w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-black leading-tight">
                Update Tersedia!
                {version && <span className="opacity-70 font-normal ml-1">v{version}</span>}
              </p>
              <p className="text-white/80 text-[10px] leading-tight truncate">
                Versi terbaru Donattour System dari ence sudah siap — klik Update untuk menerapkan
              </p>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onUpdate}
              className="flex items-center gap-1.5 bg-white text-amber-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full hover:bg-amber-50 active:scale-95 transition-all shadow"
            >
              <RefreshCw size={11} />
              Update Sekarang
            </button>
            <button
              onClick={onDismiss}
              title="Tutup (update akan diterapkan saat reload berikutnya)"
              className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Progress bar animasi di bawah banner */}
        <div className="h-0.5 bg-white/20">
          <div className="h-full bg-white/50 animate-pulse w-full" />
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// Main PWAInstaller Component
// ══════════════════════════════════════════════════════════════
export default function PWAInstaller() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [newVersion, setNewVersion] = useState<string | undefined>(undefined)
  const [dismissed, setDismissed] = useState(false)

  // Terapkan update: kirim SKIP_WAITING → reload
  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage('SKIP_WAITING')
    }
    setTimeout(() => window.location.reload(), 300)
  }

  // Tutup banner (update masih akan diterapkan saat reload berikutnya)
  const dismissBanner = () => {
    setDismissed(true)
  }

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    let checkInterval: NodeJS.Timeout | null = null

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/service-worker.js', {
          updateViaCache: 'none', // Browser selalu cek SW terbaru, tidak dari cache
        })

        console.log('✅ Service Worker registered:', reg.scope)

        // ─── Handler: SW baru ditemukan ─────────────────
        const handleUpdateFound = () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            // SW baru sudah ter-install, menunggu aktivasi
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🆕 Update siap!')
              setWaitingWorker(newWorker)
              setUpdateAvailable(true)
              setDismissed(false) // Tampilkan banner lagi jika sempat di-dismiss

              // Coba baca versi dari SW baru via message channel
              try {
                const channel = new MessageChannel()
                channel.port1.onmessage = (e) => {
                  if (e.data?.version) setNewVersion(e.data.version)
                }
                newWorker.postMessage('GET_VERSION', [channel.port2])
              } catch {
                // Tidak kritis, versi info opsional
              }
            }
          })
        }

        reg.addEventListener('updatefound', handleUpdateFound)

        // Jika SW baru sudah waiting sejak halaman dibuka
        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting)
          setUpdateAvailable(true)
        }

        // ─── Cek update berkala setiap 5 menit ──────────
        checkInterval = setInterval(() => {
          console.log('🔍 Checking for SW updates...')
          reg.update().catch(() => {})
        }, 5 * 60 * 1000)

        // Cek pertama kali setelah 15 detik (beri waktu app load dulu)
        setTimeout(() => reg.update().catch(() => {}), 15000)

      } catch (err) {
        console.warn('❌ Service Worker registration failed:', err)
      }
    }

    // SW baru sudah aktif (setelah SKIP_WAITING) → auto reload
    const onControllerChange = () => {
      console.log('🔄 Controller changed, reloading...')
      window.location.reload()
    }

    // Dengarkan pesan dari SW (misal: SW_UPDATED setelah activate)
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log(`✅ SW updated to v${event.data.version}`)
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    navigator.serviceWorker.addEventListener('message', onMessage)

    registerSW()

    return () => {
      if (checkInterval) clearInterval(checkInterval)
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
      navigator.serviceWorker.removeEventListener('message', onMessage)
    }
  }, [])

  // Render banner jika ada update dan belum di-dismiss
  if (!updateAvailable || dismissed) return null

  return (
    <UpdateBanner
      onUpdate={applyUpdate}
      onDismiss={dismissBanner}
      version={newVersion}
    />
  )
}
