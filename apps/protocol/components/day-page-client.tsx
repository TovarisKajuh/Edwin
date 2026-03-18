'use client'

import { useMode } from '@/hooks/use-mode'
import { ModeToggle } from '@/components/mode-toggle'
import { DayTimeline } from '@/components/day-timeline'
import { getWeekNumber, parseDate, getDayOfWeek } from '@/lib/dates'
import { getPhase, getEffectiveCalories } from '@/lib/phase'
import { getEstimatedWeight, getEstimatedBf } from '@/lib/body-stats'
import Link from 'next/link'

interface DayPageClientProps {
  dateStr: string
}

export function DayPageClient({ dateStr }: DayPageClientProps) {
  const date = parseDate(dateStr)
  const week = getWeekNumber(date)
  const [mode, setMode] = useMode(dateStr)
  const phase = getPhase(week)

  return (
    <main className="min-h-screen">
      <div className="sticky top-0 z-10 bg-[#0a0a14]/90 backdrop-blur-xl border-b border-white/[0.04] px-4 py-3">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <Link
            href="/"
            className="text-[#7a7a95] hover:text-[#f0f0f5] text-sm transition-colors duration-200"
          >
            &larr; Dashboard
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
        <div className="text-[13px] text-[#7a7b90] px-4 py-3 flex items-center gap-3 flex-wrap mb-6">
          <span className="font-bold text-[#f0f0f5]">{phase.name.toUpperCase()}</span>
          <span>Wk {week - 2}/20</span>
          <span className="font-mono">~{getEstimatedWeight(week)}kg</span>
          <span className="font-mono">{getEstimatedBf(week)}% BF</span>
          <span className="font-mono">{getEffectiveCalories(week, getDayOfWeek(date))} kcal</span>
        </div>
        <DayTimeline date={date} mode={mode} />
      </div>
    </main>
  )
}
