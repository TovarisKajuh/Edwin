'use client'

import { BodyCompCard } from '@/components/dashboard/body-comp-card'
import { ProtocolCalendar } from '@/components/dashboard/protocol-calendar'
import { WeekVolumeCard } from '@/components/dashboard/week-volume-card'
import { TodaysTraining } from '@/components/dashboard/todays-training'
import { MacroSplitCard } from '@/components/dashboard/macro-split-card'
import { PhaseTimeline } from '@/components/dashboard/phase-timeline'
import { SupplementStack } from '@/components/dashboard/supplement-stack'

export default function Dashboard() {
  return (
    <main className="min-h-screen p-6 max-w-[1400px] mx-auto">
      {/* Top row: 5:3:4 ratio */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5">
          <BodyCompCard />
        </div>
        <div className="col-span-12 lg:col-span-3">
          <ProtocolCalendar />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <WeekVolumeCard />
        </div>
      </div>
      {/* Bottom row: equal quarters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <TodaysTraining />
        <MacroSplitCard />
        <PhaseTimeline />
        <SupplementStack />
      </div>
    </main>
  )
}
