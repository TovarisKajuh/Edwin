'use client'

import { useMode } from '@/hooks/use-mode'
import { ModeToggle } from '@/components/mode-toggle'
import { DayTimeline } from '@/components/day-timeline'
import { PhaseHeader } from '@/components/phase-header'
import { getWeekNumber, parseDate } from '@/lib/dates'
import Link from 'next/link'

interface DayPageClientProps {
  dateStr: string
}

export function DayPageClient({ dateStr }: DayPageClientProps) {
  const date = parseDate(dateStr)
  const week = getWeekNumber(date)
  const [mode, setMode] = useMode(dateStr)

  return (
    <main className="min-h-screen">
      <div className="sticky top-0 z-10 bg-[#0a0a14]/90 backdrop-blur-xl border-b border-white/[0.04] px-4 py-3">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <Link
            href="/"
            className="text-[#7a7a95] hover:text-[#f0f0f5] text-sm transition-colors duration-200"
          >
            &larr; Week {week}
          </Link>
          <h1 className="text-base font-semibold text-[#f0f0f5]">
            {date.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              timeZone: 'UTC',
            })}
          </h1>
          <ModeToggle mode={mode} onModeChange={setMode} />
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <PhaseHeader week={week} compact />
        <DayTimeline date={date} mode={mode} />
      </div>
    </main>
  )
}
