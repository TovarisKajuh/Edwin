'use client'

import { DashboardCard } from './dashboard-card'
import { getWeekNumber } from '@/lib/dates'
import { getTrainingDay } from '@/lib/schedule'
import { isDeloadWeek } from '@/lib/phase'
import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK } from '@/data/constants'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function WeekVolumeCard() {
  const now = new Date()
  const rawWeek = getWeekNumber(now)
  const week =
    rawWeek >= PROTOCOL_START_WEEK && rawWeek <= PROTOCOL_END_WEEK
      ? rawWeek
      : PROTOCOL_START_WEEK

  const deload = isDeloadWeek(week)

  // Get sets per day (Mon=1..Sun=7)
  const daySets: number[] = []
  for (let dow = 1; dow <= 7; dow++) {
    const training = getTrainingDay(dow, 'home', deload, week)
    daySets.push(training ? training.totalSets : 0)
  }

  const totalSets = daySets.reduce((sum, s) => sum + s, 0)
  const maxSets = Math.max(...daySets, 1)

  // Chart dimensions
  const chartWidth = 340
  const chartHeight = 160
  const barWidth = 30
  const gap = 12
  const totalBarsWidth = 7 * barWidth + 6 * gap
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
          {daySets.map((sets, i) => {
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
                {/* Rest day placeholder */}
                {sets === 0 && (
                  <rect
                    x={x}
                    y={padTop + plotH - 3}
                    width={barWidth}
                    height={3}
                    rx={1.5}
                    fill="#45465a"
                    opacity={0.4}
                  />
                )}
                {/* Set count above bar (for top bars) */}
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
                {/* Day label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  fill="#45465a"
                  fontSize="11"
                >
                  {DAY_LABELS[i]}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </DashboardCard>
  )
}
