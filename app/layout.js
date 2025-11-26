import { Inter } from 'next/font/google'
import './globals.css'
import './maya-styles.css'
import '../styles/mobile-responsive.css'
import '../styles/mobile-fix.css'
import '../styles/card-redesign.css'
import '../styles/theme.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from '@/components/Providers'
import ErrorPageCache from '@/components/ErrorPageCache'
import { MayaShell } from '@/components/maya/MayaShell'
import { MayaAiDots } from '@/components/maya/MayaAiDots'
import { MayaPipWindow } from '@/components/maya/MayaPipWindow'
import { MayaRuntimeLoader } from '@/components/maya/MayaRuntimeLoader'

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
    <html lang="en">
      <head>
        {/* Socket.IO Client - Load globally for messaging system */}
        <script src="https://cdn.socket.io/4.8.1/socket.io.min.js" integrity="sha384-mkQ3/7FUtcGyoppY6bz/PORYoGqOl7/aSUMn2ymDOJcapfS6PHqxhRTMh1RR0Q6+" crossOrigin="anonymous"></script>

        {/* FCM Handler - For Android App Token Registration */}
        <script src="/fcm-handler.js"></script>

        {/* MAYA Fonts and Icons - Desktop Only */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/uicons-regular-rounded/css/uicons-regular-rounded.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn-uicons.flaticon.com/uicons-solid-rounded/css/uicons-solid-rounded.css"
        />
        {/* Detect mobile and hide MAYA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                               window.matchMedia('(display-mode: standalone)').matches ||
                               window.navigator.standalone ||
                               document.referrer.includes('android-app://');
                if (isMobile) {
                  window.__MAYA_DISABLED__ = true;
                }
              })();
            `,
          }}
        />
      </head>

      <body className={inter.className}>
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
          {/* MAYA AI Assistant - Desktop Only */}
          <MayaRuntimeLoader />
          <MayaShell />
          <MayaAiDots />
          <MayaPipWindow />
        </Providers>
      </body>
    </html>
  )
}

