'use client'

import { useEffect } from 'react'

export default function PWAInstaller() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((reg) => {
          console.log('✅ Service Worker registered:', reg.scope)
        })
        .catch((err) => {
          console.warn('❌ Service Worker registration failed:', err)
        })
    }
  }, [])

  return null
}
