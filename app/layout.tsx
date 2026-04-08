import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/context/auth-context'
import { Toaster } from 'sonner'
import PWAInstaller from '@/app/components/PWAInstaller'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f97316' },
    { media: '(prefers-color-scheme: dark)', color: '#f97316' },
  ],
}

export const metadata: Metadata = {
  title: 'Donattour System',
  description: 'Sistem Manajemen Donattour yang dibangun oleh encedev',
  generator: 'encedev',
  manifest: '/manifest.json',
  metadataBase: new URL('https://donattour.com'),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DonattourSystem',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      {
        url: '/logo-donattour.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/logo-donattour.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/logo-donattour.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <PWAInstaller />
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="top-center"
          richColors
          closeButton
          duration={4000}
          toastOptions={{
            style: {
              fontFamily: 'inherit',
              borderRadius: '16px',
              fontSize: '13px',
              fontWeight: '600',
              boxShadow: '0 20px 40px -8px rgba(0,0,0,0.15)',
              border: '1px solid rgba(0,0,0,0.06)',
              padding: '14px 16px',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
