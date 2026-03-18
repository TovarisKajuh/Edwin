'use client'

import Link from 'next/link'
import { DashboardCard } from './dashboard-card'
import { getWeekNumber, getDayOfWeek, formatDate } from '@/lib/dates'
import { getTrainingDay } from '@/lib/schedule'
import { getPhase, isDeloadWeek } from '@/lib/phase'
import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK } from '@/data/constants'

export function TodaysTraining() {
  const now = new Date()
  const rawWeek = getWeekNumber(now)
  const week =
    rawWeek >= PROTOCOL_START_WEEK && rawWeek <= PROTOCOL_END_WEEK
      ? rawWeek
      : PROTOCOL_START_WEEK

  const dow = getDayOfWeek(now)
  const deload = isDeloadWeek(week)
  const training = getTrainingDay(dow, 'home', deload, week)
  const phase = getPhase(week)
  const todayStr = formatDate(now)

  return (
    <DashboardCard
      title="Today's Training"
      controls={
        deload ? (
          <span className="text-[11px] font-semibold rounded-full px-2.5 py-1 bg-[#a78bfa]/15 text-[#a78bfa]">
            DELOAD
          </span>
        ) : undefined
      }
    >
      {!training ? (
        /* Rest day */
        <div>
          <p className="text-[24px] font-bold text-[#f0f0f5] mb-3">Rest Day</p>
          <p className="text-[13px] text-[#7a7b90] leading-relaxed">
            {phase.psychologyBrief}
          </p>
        </div>
      ) : (
        <div>
          {/* Subtitle */}
          <p className="text-[13px] text-[#7a7b90] mb-4">
            {training.dayName} Day — {training.muscles}
          </p>

          {/* Exercise list */}
          <div className="space-y-3.5">
            {training.exercises.map((ex) => (
              <div key={ex.name}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[14px] font-semibold text-[#f0f0f5] leading-tight">
                    {ex.name}
                  </span>
                  <div className="flex items-baseline gap-1.5 shrink-0">
                    <span className="font-mono font-bold text-[#6b8aff] text-[14px]">
                      {ex.weight > 0 ? `${ex.weight}kg` : 'BW'}
                    </span>
                    <span className="text-[12px] text-[#7a7b90]">
                      {ex.sets}x{ex.reps.replace(/^\d+x/, '')}
                    </span>
                  </div>
                </div>
                {ex.progressionNote && (
                  <p className="text-[11px] text-[#45465a] mt-0.5">
                    {ex.progressionNote}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-5 pt-3 border-t border-white/[0.04]">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#7a7b90]">
                {training.totalSets} sets, ~{training.estimatedMinutes} min
              </span>
              <Link
                href={`/day/${todayStr}`}
                className="text-[12px] text-[#7a7b90] hover:text-[#f0f0f5] transition-colors"
              >
                View full day &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </DashboardCard>
  )
}
