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
      <div className="rounded-xl bg-[#12121e] border border-white/[0.06] px-4 py-3 flex items-center gap-4 flex-wrap mb-6">
        <span className="text-sm font-bold text-[#f0f0f5]">
          {phase.name}
        </span>
        <span className="text-xs font-mono text-[#7a7a95]">
          ~{weight}kg &middot; {bf}% BF &middot; {cals.toLocaleString()} kcal
        </span>
        <div className="flex items-center gap-2">
          {deload && <DeloadBadge />}
          {dietBreak && <DietBreakBadge />}
          {bloodwork && <BloodworkPin />}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-[#12121e] border border-white/[0.06] p-6 mb-6">
      {/* Top row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-[#f0f0f5]">
          {phase.name}
        </h2>
        <span className="text-xs uppercase tracking-widest text-[#7a7a95] bg-[#1a1a2e] px-3 py-1 rounded-full font-medium">
          Week {weekInProtocol} of {totalWeeks}
        </span>
        <div className="flex items-center gap-2">
          {deload && <DeloadBadge />}
          {dietBreak && <DietBreakBadge />}
          {bloodwork && <BloodworkPin />}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="rounded-xl bg-[#0f0f1a] px-5 py-4 text-center">
          <div className="text-4xl font-mono font-bold text-[#f0f0f5]">{weight}</div>
          <div className="text-xs text-[#7a7a95] mt-1">kg</div>
        </div>
        <div className="rounded-xl bg-[#0f0f1a] px-5 py-4 text-center">
          <div className="text-4xl font-mono font-bold text-[#f0f0f5]">{bf}</div>
          <div className="text-xs text-[#7a7a95] mt-1">% body fat</div>
        </div>
        <div className="rounded-xl bg-[#0f0f1a] px-5 py-4 text-center">
          <div className="text-4xl font-mono font-bold text-[#f0f0f5]">{cals.toLocaleString()}</div>
          <div className="text-xs text-[#7a7a95] mt-1">kcal</div>
        </div>
      </div>

      {/* Psychology brief */}
      <div className="text-sm text-[#7a7a95] leading-relaxed mt-4">
        {/* Mobile: collapsible */}
        <div className="md:hidden">
          <p className={expanded ? '' : 'line-clamp-2'}>{phase.psychologyBrief}</p>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[#4a4a65] hover:text-[#7a7a95] text-xs mt-0.5 cursor-pointer transition-colors duration-200"
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
