/**
 * Production-ready Logger
 * 
 * Mengurangi noise di console dengan hanya menampilkan log penting
 * di production, dan log lengkap di development.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

class Logger {
  private prefix: string;

  constructor(prefix: string = '') {
    this.prefix = prefix;
  }

  private shouldLog(level: LogLevel): boolean {
    if (isProduction) {
      // Di production, hanya tampilkan warn dan error
      return level === 'warn' || level === 'error';
    }
    // Di development, tampilkan semua
    return true;
  }

  debug(...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(`🔍 ${this.prefix}`, ...args);
    }
  }

  info(...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(`ℹ️ ${this.prefix}`, ...args);
    }
  }

  success(...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(`✅ ${this.prefix}`, ...args);
    }
  }

  warn(...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️ ${this.prefix}`, ...args);
    }
  }

  error(...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(`❌ ${this.prefix}`, ...args);
    }
  }

  // Khusus untuk realtime subscriptions
  realtime(message: string, data?: any) {
    if (isDevelopment) {
      console.log(`🔌 [Realtime] ${message}`, data || '');
    }
  }

  // Khusus untuk offline/sync operations
  sync(message: string, data?: any) {
    if (isDevelopment) {
      console.log(`🔄 [Sync] ${message}`, data || '');
    }
  }

  // Khusus untuk PWA/Service Worker
  pwa(message: string, data?: any) {
    if (isDevelopment) {
      console.log(`📱 [PWA] ${message}`, data || '');
    }
  }
}

// Export singleton instances
export const logger = new Logger();
export const realtimeLogger = {
  log: (msg: string, data?: any) => isDevelopment && console.log(`🔌 ${msg}`, data || ''),
  success: (msg: string) => isDevelopment && console.log(`✅ ${msg}`),
  error: (msg: string, err?: any) => console.error(`❌ ${msg}`, err || ''),
};

export const syncLogger = {
  log: (msg: string, data?: any) => isDevelopment && console.log(`🔄 ${msg}`, data || ''),
  success: (msg: string) => isDevelopment && console.log(`✅ ${msg}`),
  error: (msg: string, err?: any) => console.error(`❌ ${msg}`, err || ''),
};

export const pwaLogger = {
  log: (msg: string, data?: any) => isDevelopment && console.log(`📱 [PWA] ${msg}`, data || ''),
  success: (msg: string) => isDevelopment && console.log(`✅ [PWA] ${msg}`),
  error: (msg: string, err?: any) => console.error(`❌ [PWA] ${msg}`, err || ''),
};

export default Logger;
