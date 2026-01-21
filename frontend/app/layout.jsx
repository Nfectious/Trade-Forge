import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

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
      <body className={inter.className}>
        <div className="min-h-screen bg-crypto-dark-bg text-crypto-dark-text">
          <header className="border-b border-crypto-dark-border">
            <nav className="container mx-auto px-4 py-3 flex items-center gap-3">
              <Image src="/logo.png" alt="TradeForge" width={40} height={40} />
              <span className="text-xl font-bold">TradeForge</span>
              <span className="text-sm text-crypto-dark-text/60">Paper trade like a pro. Win real contests.</span>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  )
}
