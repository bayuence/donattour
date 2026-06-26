import { useEffect, useState } from 'react';
import { preloadPublicData } from '@/lib/offline/auto-seed';

interface PWAPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: PWAPromptEvent;
  }
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<PWAPromptEvent | null>(null);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'installed' | 'error'>('idle');

  // Detect PWA installation
  useEffect(() => {
    const isInStandaloneMode = () => {
      if (typeof window === 'undefined') return false;
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in window.navigator && (window.navigator as any).standalone) ||
        document.referrer.includes('android-app://')
      );
    };

    setIsPWAInstalled(isInStandaloneMode());

    const handleDisplayModeChange = () => {
      setIsPWAInstalled(isInStandaloneMode());
    };

    window.matchMedia('(display-mode: standalone)').addEventListener('change', handleDisplayModeChange);
    return () => {
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: PWAPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('[PWA] Install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Auto-preload data when PWA is installed
  useEffect(() => {
    if (isPWAInstalled && typeof window !== 'undefined' && navigator.onLine) {
      console.log('[PWA] PWA installed, starting data preload...');
      
      // Delay preload to avoid blocking initial load
      const timer = setTimeout(() => {
        preloadPublicData().then(() => {
          console.log('[PWA] Data preload completed');
        });
      }, 5000); // 5 detik setelah install

      return () => clearTimeout(timer);
    }
  }, [isPWAInstalled]);

  // Install PWA
  const installPWA = async () => {
    if (!deferredPrompt) {
      console.error('[PWA] No install prompt available');
      setInstallStatus('error');
      return false;
    }

    try {
      setInstallStatus('installing');
      
      // Show install prompt
      deferredPrompt.prompt();
      
      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('[PWA] User accepted install');
        setInstallStatus('installed');
        setIsPWAInstalled(true);
        
        // Preload data after installation
        setTimeout(() => {
          preloadPublicData();
        }, 3000);
        
        return true;
      } else {
        console.log('[PWA] User dismissed install');
        setInstallStatus('idle');
        return false;
      }
    } catch (error) {
      console.error('[PWA] Install failed:', error);
      setInstallStatus('error');
      return false;
    }
  };

  // Check if install is available
  const canInstall = deferredPrompt !== null && !isPWAInstalled;

  return {
    canInstall,
    isPWAInstalled,
    installStatus,
    installPWA,
  };
}