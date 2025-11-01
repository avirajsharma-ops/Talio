import { Inter } from 'next/font/google'
import './globals.css'
import '../styles/mobile-responsive.css'
import '../styles/mobile-fix.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Tailo HRMS - Human Resource Management System',
  description: 'Complete HRMS solution for managing employees, attendance, payroll, and more',
  manifest: '/manifest.json',
  themeColor: [
    { media: '(min-width: 769px)', color: '#101827' },
    '#ffffff',
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'light-content',
    title: 'Tailo HRMS',
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
    'apple-mobile-web-app-title': 'Tailo HRMS',
    'application-name': 'Tailo HRMS',
    'msapplication-TileColor': '#5F9EA0',
    'msapplication-TileImage': '/icons/icon-144x144.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="theme-color" content="#101827" media="(min-width: 769px)" />

        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="light-content" />
        <meta name="apple-mobile-web-app-title" content="Tailo HRMS" />
        <meta name="application-name" content="Tailo HRMS" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  )
}

