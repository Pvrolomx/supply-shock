import './globals.css'

export const metadata = {
  title: 'Supply Shock - Weak Signals #2',
  description: 'Supply Chain Disruption Detector',
  manifest: '/manifest.json',
  themeColor: '#1a1a2e',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  )
}
