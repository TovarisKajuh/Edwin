'use client'

import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK, TOTAL_WEEKS } from '@/data/constants'
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
  const displayWeek = week - PROTOCOL_START_WEEK + 1

  const today = new Date()
  const currentWeek = getWeekNumber(today)
  const showToday =
    !isCurrentWeek &&
    currentWeek >= PROTOCOL_START_WEEK &&
    currentWeek <= PROTOCOL_END_WEEK

  return (
    <div className="flex flex-col items-center gap-3 mb-6">
      <div className="flex items-center gap-4">
        <button
          onClick={goToPrev}
          disabled={!canGoPrev}
          className="w-10 h-10 rounded-xl bg-[#12121e] border border-white/[0.06] flex items-center justify-center text-[#7a7a95] hover:text-[#f0f0f5] hover:border-white/[0.12] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
        <div className="text-center min-w-[120px]">
          <div className="text-lg font-semibold text-[#f0f0f5]">Week {displayWeek}</div>
          <div className="text-xs text-[#4a4a65]">of {TOTAL_WEEKS}</div>
        </div>
        <button
          onClick={goToNext}
          disabled={!canGoNext}
          className="w-10 h-10 rounded-xl bg-[#12121e] border border-white/[0.06] flex items-center justify-center text-[#7a7a95] hover:text-[#f0f0f5] hover:border-white/[0.12] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
      <div className="w-48 h-1 rounded-full bg-[#12121e]">
        <div
          className="h-full rounded-full bg-[#6b8aff] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Today button */}
      {showToday && (
        <button
          onClick={() => goToWeek(currentWeek)}
          className="text-xs px-3 py-1 rounded-full bg-[#1a1a2e] border border-white/[0.06] text-[#7a7a95] hover:text-[#f0f0f5] transition-colors duration-200 cursor-pointer"
        >
          Today
        </button>
      )}
    </div>
  )
}
