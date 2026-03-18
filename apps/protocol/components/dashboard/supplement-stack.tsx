'use client'

import { DashboardCard } from './dashboard-card'
import { getWeekNumber, getDayOfWeek } from '@/lib/dates'
import { getSupplementsForTimeSlot } from '@/lib/supplements-for-day'
import type { TimeSlot, SupplementEntry } from '@/lib/supplements-for-day'
import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK } from '@/data/constants'

const SLOTS: { slot: TimeSlot; label: string }[] = [
  { slot: 'fasted_am', label: '6:00 AM — Fasted' },
  { slot: 'with_meal_1', label: '7:15 AM — Breakfast' },
  { slot: 'post_cardio', label: '7:05 AM — Post-Cardio' },
  { slot: 'with_meal_3', label: '12:15 PM — Lunch' },
  { slot: 'with_meal_4', label: '3:30 PM — Afternoon' },
  { slot: 'with_meal_5', label: '7:00 PM — Dinner' },
  { slot: 'late_afternoon', label: '5:00 PM — Peptides' },
  { slot: 'pre_bed', label: '9:15 PM — Pre-Bed' },
]

export function SupplementStack() {
  const now = new Date()
  const rawWeek = getWeekNumber(now)
  const week =
    rawWeek >= PROTOCOL_START_WEEK && rawWeek <= PROTOCOL_END_WEEK
      ? rawWeek
      : PROTOCOL_START_WEEK

  const dow = getDayOfWeek(now)

  // Gather all supplements for each slot
  const slotData: { label: string; supplements: SupplementEntry[] }[] = []
  const allNames = new Set<string>()

  for (const { slot, label } of SLOTS) {
    const supps = getSupplementsForTimeSlot(slot, week, 'home', dow, now)
    if (supps.length > 0) {
      slotData.push({ label, supplements: supps })
      for (const s of supps) {
        allNames.add(s.name)
      }
    }
  }

  const compoundCount = allNames.size

  return (
    <DashboardCard title="Today's Stack">
      {/* Compound count */}
      <p className="text-[13px] text-[#7a7b90] mb-4">{compoundCount} compounds</p>

      {/* Grouped list — no scroll, fills card naturally */}
      <div className="space-y-3">
        {slotData.map((group) => (
          <div key={group.label}>
            <div className="text-[11px] text-[#45465a] mb-1.5">{group.label}</div>
            <div className="space-y-1">
              {group.supplements.map((s) => (
                <div key={`${group.label}-${s.name}`} className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] text-[#f0f0f5]">{s.name}</span>
                  <span className="font-mono text-[12px] text-[#7a7b90] shrink-0">{s.dose}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  )
}
