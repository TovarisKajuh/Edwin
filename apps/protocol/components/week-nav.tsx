'use client'

import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK } from '@/data/constants'
import { getWeekNumber } from '@/lib/dates'

interface WeekNavProps {
  week: number
  canGoPrev: boolean
  canGoNext: boolean
  goToPrev: () => void
  goToNext: () => void
  goToWeek: (w: number) => void
  isCurrentWeek: boolean
}

export function WeekNav({
  week,
  canGoPrev,
  canGoNext,
  goToPrev,
  goToNext,
  goToWeek,
  isCurrentWeek,
}: WeekNavProps) {
  const progress =
    ((week - PROTOCOL_START_WEEK) / (PROTOCOL_END_WEEK - PROTOCOL_START_WEEK)) * 100

  const today = new Date()
  const currentWeek = getWeekNumber(today)
  const showToday =
    !isCurrentWeek &&
    currentWeek >= PROTOCOL_START_WEEK &&
    currentWeek <= PROTOCOL_END_WEEK

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrev}
          disabled={!canGoPrev}
          className="p-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Previous week"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M12 5l-5 5 5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-base font-semibold text-zinc-100">Week {week}</span>
          {showToday && (
            <button
              onClick={() => goToWeek(currentWeek)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
            >
              Today
            </button>
          )}
        </div>

        <button
          onClick={goToNext}
          disabled={!canGoNext}
          className="p-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label="Next week"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M8 5l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
