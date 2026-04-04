import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/context/auth-context'
import { Toaster } from 'sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Donattour System',
  description: 'Sistem Manajemen Donattour yang dibangun oleh encedev',
  generator: 'encedev',
  icons: {
    icon: [
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
    apple: '/apple-icon.png',
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
