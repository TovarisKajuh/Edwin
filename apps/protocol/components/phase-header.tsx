'use client'

import { useState } from 'react'
import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK } from '@/data/constants'
import { getPhase, isDeloadWeek, isDietBreakWeek, isBloodworkWeek } from '@/lib/phase'
import { getEstimatedWeight, getEstimatedBf } from '@/lib/body-stats'
import { getEffectiveCalories } from '@/lib/phase'
import { DeloadBadge, DietBreakBadge, BloodworkPin } from './special-markers'

interface PhaseHeaderProps {
  week: number
  compact?: boolean
}

export function PhaseHeader({ week, compact }: PhaseHeaderProps) {
  const [expanded, setExpanded] = useState(false)

  const phase = getPhase(week)
  const weight = getEstimatedWeight(week)
  const bf = getEstimatedBf(week)
  const cals = getEffectiveCalories(week, 1) // Monday baseline
  const totalWeeks = PROTOCOL_END_WEEK - PROTOCOL_START_WEEK + 1
  const weekInProtocol = week - PROTOCOL_START_WEEK + 1

  const deload = isDeloadWeek(week)
  const dietBreak = isDietBreakWeek(week)
  const bloodwork = isBloodworkWeek(week)

  if (compact) {
    return (
      <div className="px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-bold uppercase tracking-wider text-zinc-300">
          {phase.name}
        </span>
        <span className="text-zinc-500">
          Wk {weekInProtocol}/{totalWeeks}
        </span>
        <span className="font-mono text-zinc-400">
          ~{weight}kg &middot; {bf}% BF
        </span>
        <span className="font-mono text-zinc-400">{cals.toLocaleString()} kcal</span>
        {deload && <DeloadBadge />}
        {dietBreak && <DietBreakBadge />}
        {bloodwork && <BloodworkPin />}
      </div>
    )
  }

  return (
    <div className="space-y-2 mt-2">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-2xl font-bold uppercase tracking-wider text-zinc-100">
          {phase.name}
        </h2>
        <span className="text-xs bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full font-medium">
          Week {weekInProtocol} of {totalWeeks}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-mono text-sm text-zinc-400">
          ~{weight} kg &middot; {bf}% BF
        </span>
        <span className="font-mono text-sm text-zinc-400">
          {cals.toLocaleString()} kcal
        </span>
        <div className="flex items-center gap-2">
          {deload && <DeloadBadge />}
          {dietBreak && <DietBreakBadge />}
          {bloodwork && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <BloodworkPin /> Bloodwork this week
            </span>
          )}
        </div>
      </div>

      {/* Psychology brief */}
      <div className="text-sm text-zinc-500 leading-relaxed">
        {/* Mobile: collapsible */}
        <div className="md:hidden">
          <p className={expanded ? '' : 'line-clamp-2'}>{phase.psychologyBrief}</p>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-zinc-400 hover:text-zinc-300 text-xs mt-0.5 cursor-pointer"
          >
            {expanded ? 'Show less' : '...more'}
          </button>
        </div>
        {/* Desktop: always shown */}
        <p className="hidden md:block">{phase.psychologyBrief}</p>
      </div>
    </div>
  )
}
