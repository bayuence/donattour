'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * MidtransSnapWrapper
 * 
 * Komponen untuk load script Midtrans Snap dan buka popup pembayaran.
 * Komponen ini tidak render apa-apa di layar, hanya handle popup Midtrans.
 * 
 * OPTIMISASI:
 * - Script Snap.js di-preload saat halaman kasir pertama kali dibuka
 *   via preloadMidtransScript(), sehingga saat user klik "Non-Tunai",
 *   script sudah ready dan popup langsung muncul.
 * - Jika belum di-preload, akan load on-demand dengan polling.
 */

interface Props {
  snapToken: string;                    // Token dari API create-transaction
  onSuccess: (result: any) => void;     // Callback kalau pembayaran sukses
  onPending: (result: any) => void;     // Callback kalau pembayaran pending
  onError: (result: any) => void;       // Callback kalau pembayaran gagal
  onClose: () => void;                  // Callback kalau user tutup popup
}

// ═══════════════════════════════════════════════════
// PRELOAD FUNCTION — dipanggil dari page.tsx saat mount
// ═══════════════════════════════════════════════════

let _preloadPromise: Promise<void> | null = null;

/**
 * Preload script Midtrans Snap.js di background.
 * Dipanggil sekali saat halaman kasir mount, sehingga saat user
 * klik "Non-Tunai", script sudah ready dan popup instan muncul.
 */
export function preloadMidtransScript(): Promise<void> {
  // Jika sudah pernah dipanggil, return promise yang sama
  if (_preloadPromise) return _preloadPromise;

  _preloadPromise = new Promise<void>((resolve) => {
    // Sudah loaded?
    if ((window as any).snap) {
      console.log('✅ [Preload] Snap.js sudah ready');
      resolve();
      return;
    }

    const snapUrl = process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL ||
                    'https://app.sandbox.midtrans.com/snap/snap.js';
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';

    // Cek apakah script tag sudah ada
    const existingScript = document.querySelector(`script[src*="snap.js"]`);
    
    if (existingScript) {
      // Script tag ada tapi belum loaded, poll sampai ready
      console.log('⏳ [Preload] Script tag ada, menunggu window.snap ready...');
      const poll = setInterval(() => {
        if ((window as any).snap) {
          clearInterval(poll);
          console.log('✅ [Preload] Snap.js ready setelah poll');
          resolve();
        }
      }, 50);
      // Timeout 15 detik
      setTimeout(() => { clearInterval(poll); resolve(); }, 15000);
      return;
    }

    // Belum ada script tag, buat baru
    console.log('📥 [Preload] Loading Snap.js dari:', snapUrl);
    console.time('⏱️ [Preload] Snap script load time');

    const script = document.createElement('script');
    script.src = snapUrl;
    script.setAttribute('data-client-key', clientKey);
    script.async = true;

    script.onload = () => {
      console.log('✅ [Preload] Snap.js loaded');
      console.timeEnd('⏱️ [Preload] Snap script load time');
      resolve();
    };

    script.onerror = () => {
      console.error('❌ [Preload] Gagal load Snap.js');
      // Resolve anyway agar tidak block, akan retry saat popup dibuka
      resolve();
    };

    document.head.appendChild(script);
  });

  return _preloadPromise;
}

export default function MidtransSnapWrapper({
  snapToken,
  onSuccess,
  onPending,
  onError,
  onClose,
}: Props) {
  
  // Flag untuk mencegah double execution
  const hasOpened = useRef(false);
  
  const openSnapPopup = useCallback(() => {
    if (!(window as any).snap) {
      console.error('❌ window.snap tidak tersedia');
      onError({ message: 'Snap tidak tersedia' });
      return;
    }
    
    console.log('🚀 Membuka popup Snap dengan token:', snapToken);
    
    try {
      (window as any).snap.pay(snapToken, {
        onSuccess: (result: any) => {
          console.log('✅ Pembayaran sukses:', result);
          onSuccess(result);
        },
        onPending: (result: any) => {
          console.log('⏳ Pembayaran pending:', result);
          onPending(result);
        },
        onError: (result: any) => {
          console.error('❌ Pembayaran error:', result);
          onError(result);
        },
        onClose: () => {
          console.log('🚪 Popup Snap ditutup');
          onClose();
        },
      });
    } catch (error) {
      console.error('❌ Error saat membuka Snap:', error);
      onError({ message: 'Error membuka popup Snap' });
    }
  }, [snapToken, onSuccess, onPending, onError, onClose]);

  useEffect(() => {
    // Guard: jangan buka 2x untuk token yang sama
    if (hasOpened.current) {
      console.log('⏭️ Skip - popup sudah dibuka untuk token ini');
      return;
    }
    
    console.log('🎫 MidtransSnapWrapper mounted dengan token:', snapToken);
    
    // Cek apakah snap sudah ready (dari preload)
    if ((window as any).snap) {
      console.log('✅ Snap sudah ready (preloaded), langsung buka popup');
      hasOpened.current = true;
      openSnapPopup();
      return;
    }
    
    // Fallback: snap belum ready, mungkin preload belum selesai
    // Poll sampai ready
    console.log('⏳ Snap belum ready, polling...');
    const poll = setInterval(() => {
      if ((window as any).snap) {
        clearInterval(poll);
        if (!hasOpened.current) {
          console.log('✅ Snap ready setelah poll, buka popup');
          hasOpened.current = true;
          openSnapPopup();
        }
      }
    }, 50);
    
    // Timeout 10 detik
    const timeout = setTimeout(() => {
      clearInterval(poll);
      if (!hasOpened.current) {
        console.error('❌ Timeout waiting for Snap script');
        onError({ message: 'Timeout loading Midtrans. Coba lagi.' });
      }
    }, 10000);
    
    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, [snapToken, openSnapPopup, onError]);
  
  // Komponen ini tidak render apa-apa
  return null;
}
