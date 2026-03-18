'use client'

import { useRef, useMemo } from 'react'
import Link from 'next/link'
import { formatDate, getDayOfWeek, getWeekNumber } from '@/lib/dates'
import { getPhase, isDeloadWeek, isDietBreakWeek, isRefeedSaturday, isBloodworkWeek, getEffectiveCalories } from '@/lib/phase'
import { getTrainingDay } from '@/lib/schedule'
import { DeloadBadge, DietBreakBadge, RefeedDot, BloodworkPin } from './special-markers'

interface WeekListProps {
  week: number
  dates: Date[]
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function WeekList({ week, dates, onSwipeLeft, onSwipeRight }: WeekListProps) {
  const touchStartX = useRef(0)
  const todayStr = formatDate(new Date())

  const rows = useMemo(() => {
    return dates.map((date) => {
      const dateStr = formatDate(date)
      const dayOfWeek = getDayOfWeek(date)
      const wk = getWeekNumber(date)
      const deload = isDeloadWeek(wk)
      const training = dayOfWeek <= 5 ? getTrainingDay(dayOfWeek, 'home', deload, wk) : null
      const cals = getEffectiveCalories(wk, dayOfWeek)

      return {
        date,
        dateStr,
        dayOfWeek,
        dayName: DAY_NAMES[dayOfWeek],
        dayNum: date.getUTCDate(),
        month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
        trainingName: training?.dayName ?? (dayOfWeek >= 6 ? 'Rest' : null),
        calories: cals,
        isToday: dateStr === todayStr,
        deload: isDeloadWeek(wk),
        dietBreak: isDietBreakWeek(wk),
        refeed: isRefeedSaturday(wk, dayOfWeek),
        bloodwork: isBloodworkWeek(wk) && dayOfWeek === 1,
      }
    })
  }, [dates, todayStr])

  return (
    <div
      className="space-y-1"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchStartX.current
        if (dx > 50) onSwipeRight()
        else if (dx < -50) onSwipeLeft()
      }}
    >
      {rows.map((row) => (
        <Link
          key={row.dateStr}
          href={`/day/${row.dateStr}`}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            row.isToday
              ? 'bg-zinc-800/50 border border-zinc-700'
              : 'bg-zinc-900/50 border border-zinc-800/30 hover:border-zinc-700'
          }`}
        >
          {/* Date block */}
          <div className="shrink-0 w-12 text-center">
            <div className="text-[10px] text-zinc-500 uppercase">{row.dayName.slice(0, 3)}</div>
            <div className={`text-lg font-semibold ${row.isToday ? 'text-zinc-100' : 'text-zinc-300'}`}>
              {row.dayNum}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {row.trainingName && (
                <span className="text-sm text-zinc-200 truncate">{row.trainingName}</span>
              )}
              {row.deload && <DeloadBadge />}
              {row.dietBreak && <DietBreakBadge />}
              {row.refeed && <RefeedDot />}
              {row.bloodwork && <BloodworkPin />}
            </div>
            <span className="font-mono text-xs text-zinc-500">
              {row.calories.toLocaleString()} kcal
            </span>
          </div>

          {/* Arrow */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-zinc-600"
          >
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      ))}
    </div>
  )
}
