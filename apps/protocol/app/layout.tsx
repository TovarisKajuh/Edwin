import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'Protocol — 22 Week Recomposition',
  description: 'Hour-by-hour timetable for the 22-week body recomposition protocol',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="font-sans antialiased bg-[#0b0d19] text-[#f0f0f5] min-h-screen">
        {children}
      </body>
    </html>
  )
}
