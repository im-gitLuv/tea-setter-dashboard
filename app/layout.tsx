import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TEA Setter Dashboard',
  description: 'Talk English Academy — Sales Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a' }}>
        {children}
      </body>
    </html>
  )
}
