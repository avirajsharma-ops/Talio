import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import '../styles/mobile-responsive.css'
import '../styles/mobile-fix.css'
import '../styles/card-redesign.css'
import '../styles/theme.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from '@/components/Providers'
import ErrorPageCache from '@/components/ErrorPageCache'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Talio HRMS - Human Resource Management System',
  description: 'Complete HRMS solution for managing employees, attendance, payroll, and more',
  manifest: '/manifest.json',

  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Talio HRMS',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Talio HRMS',
    'application-name': 'Talio HRMS',
    'msapplication-TileColor': '#ffffff',
    'msapplication-TileImage': '/icons/icon-144x144.png',
  },
}
export const viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}


export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* FCM Handler - For Android App Token Registration */}
        <script src="/fcm-handler.js" defer></script>
        {/* Patch for Next.js dev overlay removeChild error */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if (typeof Node !== 'undefined') {
              const originalRemoveChild = Node.prototype.removeChild;
              Node.prototype.removeChild = function(child) {
                if (child.parentNode !== this) {
                  if (console) console.warn('removeChild: node is not a child', child);
                  return child;
                }
                return originalRemoveChild.apply(this, arguments);
              };
            }
          `
        }} />
      </head>

      <body className={inter.className} suppressHydrationWarning>
        {/* Socket.IO Client - Load globally for messaging system */}
        <Script 
          src="https://cdn.socket.io/4.8.1/socket.io.min.js" 
          integrity="sha384-mkQ3/7FUtcGyoppY6bz/PORYoGqOl7/aSUMn2ymDOJcapfS6PHqxhRTMh1RR0Q6+" 
          crossOrigin="anonymous"
          strategy="beforeInteractive"
        />
        
        {/* PWA Window Controls Overlay - Draggable title bar region */}
        <div className="pwa-titlebar-drag" aria-hidden="true" />
        <Providers>
          <ErrorPageCache />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontSize: '14px',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}

