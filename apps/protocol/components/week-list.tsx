'use client'

import { useRef, useMemo } from 'react'
import Link from 'next/link'
import { formatDate, getDayOfWeek, getWeekNumber } from '@/lib/dates'
import { isDeloadWeek, isDietBreakWeek, isRefeedSaturday, isBloodworkWeek, getEffectiveCalories } from '@/lib/phase'
import { getTrainingDay } from '@/lib/schedule'
import { generateDay } from '@/lib/generator'
import { CATEGORY_COLORS } from '@/data/constants'
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
      const blocks = generateDay(date, 'home')
      const uniqueCategories = [...new Set(blocks.map((b) => b.category))]

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
        uniqueCategories,
      }
    })
  }, [dates, todayStr])

  return (
    <div
      className="space-y-2"
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
          className={`flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 ${
            row.isToday
              ? 'bg-[#12121e] border border-white/[0.12] ring-1 ring-[#6b8aff]/40'
              : 'bg-[#12121e] border border-white/[0.06] hover:border-white/[0.12]'
          }`}
        >
          {/* Date block */}
          <div className="shrink-0 w-12 text-center">
            <div className="text-xs font-medium uppercase tracking-widest text-[#7a7a95]">
              {row.dayName.slice(0, 3)}
            </div>
            <div className={`text-2xl font-bold ${row.isToday ? 'text-[#f0f0f5]' : 'text-[#f0f0f5]'}`}>
              {row.dayNum}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {row.trainingName && (
                <span className="text-sm font-medium text-[#f0f0f5] truncate">{row.trainingName}</span>
              )}
              {row.deload && <DeloadBadge />}
              {row.dietBreak && <DietBreakBadge />}
              {row.refeed && <RefeedDot />}
              {row.bloodwork && <BloodworkPin />}
            </div>
            <span className="font-mono text-xs text-[#7a7a95]">
              {row.calories.toLocaleString()} kcal
            </span>
          </div>

          {/* Category dots */}
          <div className="flex gap-1 shrink-0">
            {row.uniqueCategories.map((cat) => (
              <span
                key={cat}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[cat] ?? '#71717a' }}
              />
            ))}
          </div>

          {/* Arrow */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0 text-[#4a4a65]"
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
