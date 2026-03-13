import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'TradeForge – Crypto Sim Trading',
  description: 'Paper trade crypto. Win contests. Upgrade to Pro.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        <div className="min-h-screen bg-crypto-dark-bg text-crypto-dark-text">
          <Navigation />
          {children}
        </div>
      </body>
    </html>
  )
}
