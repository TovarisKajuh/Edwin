'use client'

import { BodyCompCard } from '@/components/dashboard/body-comp-card'
import { ProtocolCalendar } from '@/components/dashboard/protocol-calendar'
import { WeekVolumeCard } from '@/components/dashboard/week-volume-card'
import { TodaysTraining } from '@/components/dashboard/todays-training'
import { MacroSplitCard } from '@/components/dashboard/macro-split-card'
import { PhaseTimeline } from '@/components/dashboard/phase-timeline'
import { SupplementStack } from '@/components/dashboard/supplement-stack'
import { formatDate } from '@/lib/dates'

export default function Dashboard() {
  const todayLink = `/day/${formatDate(new Date())}`

  return (
    <main className="min-h-screen p-6 max-w-[1400px] mx-auto">
      {/* Navigation header */}
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-[20px] font-bold text-[#f0f0f5]">Protocol</h1>
        <nav className="inline-flex rounded-full bg-[#151729]/60 backdrop-blur-xl border border-white/[0.05] p-1">
          <span className="px-4 py-1.5 rounded-full text-[12px] font-medium bg-white text-[#0b0d19]">Dashboard</span>
          <a href={todayLink} className="px-4 py-1.5 rounded-full text-[12px] font-medium text-[#7a7b90] hover:text-[#f0f0f5] transition-colors">Today</a>
        </nav>
        <div className="text-[12px] text-[#7a7b90]">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </header>

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
