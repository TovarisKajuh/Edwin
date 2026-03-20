'use client'

import { DashboardCard } from './dashboard-card'
import { getWeekNumber } from '@/lib/dates'
import { getTrainingDay } from '@/lib/schedule'
import { isDeloadWeek } from '@/lib/phase'
import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK } from '@/data/constants'

const WORKOUT_LABELS = ['Push', 'Pull', 'Legs', 'Looks', 'PushB']

export function WeekVolumeCard() {
  const now = new Date()
  const rawWeek = getWeekNumber(now)
  const week =
    rawWeek >= PROTOCOL_START_WEEK && rawWeek <= PROTOCOL_END_WEEK
      ? rawWeek
      : PROTOCOL_START_WEEK

  const deload = isDeloadWeek(week)

  // Get sets per workout (index 0-4)
  const workoutSets: number[] = []
  for (let idx = 0; idx < 5; idx++) {
    const training = getTrainingDay(idx, 'home_workout', deload, week)
    workoutSets.push(training ? training.totalSets : 0)
  }

  const totalSets = workoutSets.reduce((sum, s) => sum + s, 0)
  const maxSets = Math.max(...workoutSets, 1)

  // Chart dimensions
  const chartWidth = 340
  const chartHeight = 160
  const barWidth = 44
  const gap = 14
  const totalBarsWidth = 5 * barWidth + 4 * gap
  const startX = (chartWidth - totalBarsWidth) / 2
  const padTop = 24
  const padBottom = 24
  const plotH = chartHeight - padTop - padBottom

  return (
    <DashboardCard
      title="Week Volume"
      controls={
        deload ? (
          <span className="text-[11px] font-semibold rounded-full px-2.5 py-1 bg-[#a78bfa]/15 text-[#a78bfa]">
            DELOAD
          </span>
        ) : undefined
      }
    >
      {/* Hero number */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-[48px] font-bold tracking-tight text-[#f0f0f5] leading-none">
            {totalSets}
          </span>
          <span className="text-[12px] text-[#7a7b90]">sets this week</span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="rounded-xl bg-[#0f1020] p-3 -mx-1">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          {workoutSets.map((sets, i) => {
            const x = startX + i * (barWidth + gap)
            const barH = sets > 0 ? (sets / maxSets) * plotH : 0
            const y = padTop + plotH - barH

            return (
              <g key={i}>
                {/* Bar */}
                {sets > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx={4}
                    fill="#a78bfa"
                    opacity={sets === maxSets ? 1 : 0.7}
                  />
                )}
                {/* Set count above bar */}
                {sets > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    fill="#f0f0f5"
                    fontSize="11"
                    fontWeight="600"
                  >
                    {sets}
                  </text>
                )}
                {/* Workout label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  fill="#45465a"
                  fontSize="11"
                >
                  {WORKOUT_LABELS[i]}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </DashboardCard>
  )
}
