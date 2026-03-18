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
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link href="/" className="text-zinc-400 hover:text-zinc-200 text-sm">
            &larr; Week {week}
          </Link>
          <h1 className="text-base font-semibold">
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
      <div className="max-w-4xl mx-auto">
        <PhaseHeader week={week} compact />
        <DayTimeline date={date} mode={mode} />
      </div>
    </main>
  )
}
