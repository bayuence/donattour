// ============================================================================
// NETWORK DETECTOR UTILITIES
// ============================================================================
// File: lib/offline/network-detector.ts
// Description: Utility class to check and monitor online/offline status
// Version: 1.0
// Date: 2026-06-26
// ============================================================================

type NetworkListener = (isOnline: boolean) => void;

class NetworkDetector {
  private listeners: Set<NetworkListener> = new Set();
  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    if (this.initialized) return;
    
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
    this.initialized = true;
  }

  private handleNetworkChange(isOnline: boolean) {
    this.listeners.forEach((listener) => listener(isOnline));
  }

  /**
   * Get the current network status. Safely handles SSR by returning true on the server.
   */
  public get isOnline(): boolean {
    if (typeof window === 'undefined') return true;
    return navigator.onLine;
  }

  /**
   * Subscribe to online/offline events.
   * Returns an unsubscribe function.
   */
  public subscribe(listener: NetworkListener): () => void {
    if (typeof window !== 'undefined') {
      this.init();
    }
    this.listeners.add(listener);
    
    // Invoke immediately with current state
    listener(this.isOnline);

    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const networkDetector = new NetworkDetector();
