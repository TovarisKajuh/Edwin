'use client'

import { DashboardCard } from './dashboard-card'
import { getWeekNumber } from '@/lib/dates'
import { getPhase, isDeloadWeek, isBloodworkWeek } from '@/lib/phase'
import { PHASES } from '@/data/phases'
import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK } from '@/data/constants'

const PHASE_SHORT_NAMES = ['Ramp-up', 'Accel', 'Grind', 'Revel', 'Final']

export function PhaseTimeline() {
  const now = new Date()
  const rawWeek = getWeekNumber(now)
  const week =
    rawWeek >= PROTOCOL_START_WEEK && rawWeek <= PROTOCOL_END_WEEK
      ? rawWeek
      : PROTOCOL_START_WEEK

  const currentPhase = getPhase(week)
  const deload = isDeloadWeek(week)
  const bloodwork = isBloodworkWeek(week)

  const weekInProtocol = week - PROTOCOL_START_WEEK + 1
  const totalWeeks = PROTOCOL_END_WEEK - PROTOCOL_START_WEEK + 1

  // Find current phase index
  const currentPhaseIdx = PHASES.findIndex(
    (p) => week >= p.weeks[0] && week <= p.weeks[1]
  )

  return (
    <DashboardCard title="Phase">
      {/* Phase name */}
      <div className="mb-5">
        <span className="text-[28px] font-bold tracking-tight text-[#f0f0f5] leading-none uppercase">
          {currentPhase.name}
        </span>
      </div>

      {/* Progress bar with 5 segments */}
      <div className="flex gap-[2px] mb-3">
        {PHASES.map((phase, idx) => {
          const phaseWeeks = phase.weeks[1] - phase.weeks[0] + 1
          const totalProtocolWeeks = PROTOCOL_END_WEEK - PROTOCOL_START_WEEK + 1

          let bg: string
          if (idx < currentPhaseIdx) {
            bg = '#7a7b90' // past
          } else if (idx === currentPhaseIdx) {
            bg = '#a78bfa' // current
          } else {
            bg = '#0f1020' // future
          }

          // Position of white dot within current phase
          const isCurrentPhase = idx === currentPhaseIdx
          const weekWithinPhase = week - phase.weeks[0]
          const phaseDuration = phase.weeks[1] - phase.weeks[0]
          const dotPct = phaseDuration > 0 ? (weekWithinPhase / phaseDuration) * 100 : 50

          return (
            <div
              key={phase.name}
              className="relative h-[8px] rounded-full"
              style={{
                flex: phaseWeeks / totalProtocolWeeks,
                background: bg,
              }}
            >
              {isCurrentPhase && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full bg-white"
                  style={{ left: `${dotPct}%`, marginLeft: '-5px' }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Phase labels */}
      <div className="flex gap-[2px] mb-5">
        {PHASES.map((phase, idx) => {
          const phaseWeeks = phase.weeks[1] - phase.weeks[0] + 1
          const totalProtocolWeeks = PROTOCOL_END_WEEK - PROTOCOL_START_WEEK + 1

          return (
            <div
              key={phase.name}
              className="text-center"
              style={{ flex: phaseWeeks / totalProtocolWeeks }}
            >
              <span
                className={`text-[11px] ${
                  idx === currentPhaseIdx ? 'text-[#f0f0f5] font-semibold' : 'text-[#45465a]'
                }`}
              >
                {PHASE_SHORT_NAMES[idx]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Week counter + badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[12px] text-[#7a7b90]">
          Week {weekInProtocol} of {totalWeeks}
        </span>
        {deload && (
          <span className="text-[11px] font-semibold rounded-full px-2.5 py-1 bg-[#a78bfa]/15 text-[#a78bfa]">
            DELOAD
          </span>
        )}
        {bloodwork && (
          <span className="text-[11px] font-semibold rounded-full px-2.5 py-1 bg-[#e5556a]/15 text-[#e5556a]">
            BLOODWORK
          </span>
        )}
      </div>
    </DashboardCard>
  )
}
