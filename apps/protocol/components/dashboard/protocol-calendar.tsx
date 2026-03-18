'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardCard } from './dashboard-card'
import { getWeekNumber, getDateRange, formatDate, getDayOfWeek, getProtocolDay } from '@/lib/dates'
import { isDeloadWeek, isDietBreakWeek, isBloodworkWeek, isRefeedSaturday } from '@/lib/phase'
import { getEstimatedWeight } from '@/lib/body-stats'
import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK } from '@/data/constants'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function ProtocolCalendar() {
  const router = useRouter()

  const now = new Date()
  const rawWeek = getWeekNumber(now)
  const currentWeek =
    rawWeek >= PROTOCOL_START_WEEK && rawWeek <= PROTOCOL_END_WEEK
      ? rawWeek
      : PROTOCOL_START_WEEK

  const todayStr = formatDate(now)
  const protocolDay = getProtocolDay(now)
  const totalDays = (PROTOCOL_END_WEEK - PROTOCOL_START_WEEK + 1) * 7

  // Build weeks data
  const weeks = useMemo(() => {
    const result: {
      week: number
      dates: Date[]
      deload: boolean
      dietBreak: boolean
    }[] = []
    for (let w = PROTOCOL_START_WEEK; w <= PROTOCOL_END_WEEK; w++) {
      result.push({
        week: w,
        dates: getDateRange(w),
        deload: isDeloadWeek(w),
        dietBreak: isDietBreakWeek(w),
      })
    }
    return result
  }, [])

  // Weight loss so far
  const startWeight = 92.5
  const currentWeight = currentWeek >= PROTOCOL_START_WEEK && currentWeek <= PROTOCOL_END_WEEK
    ? getEstimatedWeight(currentWeek)
    : startWeight
  const weightLost = startWeight - currentWeight

  return (
    <DashboardCard title="Protocol Calendar">
      {/* Day headers */}
      <div className="grid grid-cols-[24px_repeat(7,1fr)] gap-[2px] mb-1">
        <div /> {/* Spacer for week label column */}
        {DAY_LABELS.map((label, i) => (
          <div key={i} className="text-center text-[9px] text-[#45465a] font-medium">
            {label}
          </div>
        ))}
      </div>

      {/* Full calendar grid — no scroll, all 20 weeks visible */}
      <div>
        {weeks.map((wk) => {
          const isCurrentWk = wk.week === currentWeek
          let rowBg = ''
          if (wk.deload) rowBg = 'bg-[#a78bfa]/10'
          else if (wk.dietBreak) rowBg = 'bg-[#4ade80]/10'

          return (
            <div
              key={wk.week}
              className={`grid grid-cols-[24px_repeat(7,1fr)] gap-[2px] mb-[2px] rounded-lg ${rowBg}`}
            >
              {/* Week label */}
              <div className="flex items-center justify-center text-[9px] text-[#45465a] font-mono">
                W{wk.week}
              </div>

              {/* Day buttons */}
              {wk.dates.map((date) => {
                const dateStr = formatDate(date)
                const dow = getDayOfWeek(date)
                const isToday = dateStr === todayStr
                const isPast = dateStr < todayStr
                const isWeekday = dow >= 1 && dow <= 5
                const hasTraining = isWeekday
                const hasRefeed = isRefeedSaturday(wk.week, dow)
                const hasBloodwork = isBloodworkWeek(wk.week) && dow === 1
                const dayNum = date.getUTCDate()

                let btnBg = 'bg-[#0f1020]'
                let txtColor = isPast ? 'text-[#55566a]' : 'text-[#7a7b90]'

                if (isCurrentWk) {
                  btnBg = 'bg-[#a78bfa]'
                  txtColor = 'text-white'
                }

                const ring = isToday ? 'ring-2 ring-white/30' : ''

                return (
                  <button
                    key={dateStr}
                    onClick={() => router.push(`/day/${dateStr}`)}
                    className={`relative w-full aspect-square rounded-md ${btnBg} ${txtColor} ${ring} text-[11px] font-medium flex flex-col items-center justify-center cursor-pointer hover:opacity-80 transition-opacity min-h-[28px]`}
                  >
                    <span>{dayNum}</span>
                    {/* Dots row */}
                    <div className="flex gap-[2px] mt-[1px]">
                      {hasTraining && (
                        <span className="block w-[3px] h-[3px] rounded-full bg-[#6b8aff]" />
                      )}
                      {hasRefeed && (
                        <span className="block w-[3px] h-[3px] rounded-full bg-[#fb923c]" />
                      )}
                      {hasBloodwork && (
                        <span className="block w-[3px] h-[3px] rounded-full bg-[#e5556a]" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Hero stat */}
      <div className="mt-4 pt-4 border-t border-white/[0.04]">
        <div className="flex items-baseline gap-3">
          <span className="text-[28px] font-bold tracking-tight text-[#f0f0f5] leading-none">
            Day {Math.max(1, Math.min(protocolDay, totalDays))} of {totalDays}
          </span>
        </div>
        {weightLost > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 mt-2 bg-green-500/15 text-[#4ade80]">
            {'\u2193'} {weightLost.toFixed(1)} kg so far
          </span>
        )}
      </div>
    </DashboardCard>
  )
}
