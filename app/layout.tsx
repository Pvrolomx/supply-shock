import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Supply Shock - Weak Signals #2',
  description: 'Supply Chain Disruption Detector - Anticipate 2-4 weeks',
  manifest: '/manifest.json',
  themeColor: '#1a1a2e',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>{children}</body>
    </html>
  )
}
