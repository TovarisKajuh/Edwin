import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'Protocol — 22 Week Recomposition',
  description: 'Hour-by-hour timetable for the 22-week body recomposition protocol',
}

const EDWIN_URL = process.env.NEXT_PUBLIC_EDWIN_URL || 'https://edwin-app.vercel.app';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="font-sans antialiased bg-[#0b0d19] text-[#f0f0f5] min-h-screen">
        <a
          href={EDWIN_URL}
          className="fixed top-4 left-4 z-50 flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#151729]/60 px-3 py-1.5 text-xs text-[#7a7b90] backdrop-blur-xl transition-colors hover:text-amber-400 hover:border-amber-400/30"
        >
          <span>&larr;</span>
          <span>Edwin</span>
        </a>
        {children}
      </body>
    </html>
  )
}
