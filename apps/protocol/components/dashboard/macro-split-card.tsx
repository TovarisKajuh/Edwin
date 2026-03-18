'use client'

import { DashboardCard } from './dashboard-card'
import { getWeekNumber, getDayOfWeek } from '@/lib/dates'
import { getPhase, getEffectiveCalories } from '@/lib/phase'
import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK } from '@/data/constants'

export function MacroSplitCard() {
  const now = new Date()
  const rawWeek = getWeekNumber(now)
  const week =
    rawWeek >= PROTOCOL_START_WEEK && rawWeek <= PROTOCOL_END_WEEK
      ? rawWeek
      : PROTOCOL_START_WEEK

  const dow = getDayOfWeek(now)
  const phase = getPhase(week)
  const calories = getEffectiveCalories(week, dow)

  const protein = phase.protein
  const fat = phase.fat
  const carbs = phase.carbs

  const proteinCals = protein * 4
  const fatCals = fat * 9
  const carbCals = carbs * 4
  const totalMacroCals = proteinCals + fatCals + carbCals

  // Donut chart using SVG circle stroke-dasharray
  const size = 140
  const strokeWidth = 20
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const proteinPct = proteinCals / totalMacroCals
  const fatPct = fatCals / totalMacroCals
  const carbPct = carbCals / totalMacroCals

  const proteinLen = proteinPct * circumference
  const fatLen = fatPct * circumference
  const carbLen = carbPct * circumference

  // Offsets: each segment starts after the previous one
  // SVG circle starts at 3 o'clock, so rotate -90deg to start at top
  const proteinOffset = 0
  const fatOffset = proteinLen
  const carbOffset = proteinLen + fatLen

  const macros = [
    { label: `${protein}g protein`, color: '#4ade80', pct: proteinPct },
    { label: `${fat}g fat`, color: '#facc15', pct: fatPct },
    { label: `${carbs}g carbs`, color: '#a78bfa', pct: carbPct },
  ]

  return (
    <DashboardCard title="Macro Split">
      {/* Hero calories */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-[48px] font-bold tracking-tight text-[#f0f0f5] leading-none">
            {calories.toLocaleString()}
          </span>
          <span className="text-[12px] text-[#7a7b90]">kcal</span>
        </div>
      </div>

      {/* Donut chart */}
      <div className="flex justify-center mb-4">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#0f1020"
            strokeWidth={strokeWidth}
          />
          {/* Protein segment (green) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#4ade80"
            strokeWidth={strokeWidth}
            strokeDasharray={`${proteinLen} ${circumference - proteinLen}`}
            strokeDashoffset={-proteinOffset}
            strokeLinecap="butt"
          />
          {/* Fat segment (yellow) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#facc15"
            strokeWidth={strokeWidth}
            strokeDasharray={`${fatLen} ${circumference - fatLen}`}
            strokeDashoffset={-fatOffset}
            strokeLinecap="butt"
          />
          {/* Carbs segment (purple) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#a78bfa"
            strokeWidth={strokeWidth}
            strokeDasharray={`${carbLen} ${circumference - carbLen}`}
            strokeDashoffset={-carbOffset}
            strokeLinecap="butt"
          />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {macros.map((m) => (
          <div key={m.label} className="flex items-center gap-2">
            <span
              className="w-[8px] h-[8px] rounded-full shrink-0"
              style={{ background: m.color }}
            />
            <span className="text-[13px] text-[#7a7b90]">{m.label}</span>
            <span className="text-[11px] text-[#45465a] ml-auto">
              {Math.round(m.pct * 100)}%
            </span>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}
