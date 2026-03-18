'use client'

import { useWeekNav } from '@/hooks/use-week-nav'
import { WeekNav } from '@/components/week-nav'
import { PhaseHeader } from '@/components/phase-header'
import { WeekView } from '@/components/week-view'
import { WeekList } from '@/components/week-list'

export default function HomePage() {
  const weekNav = useWeekNav()

  return (
    <main className="min-h-screen max-w-6xl mx-auto px-4 py-6">
      <WeekNav {...weekNav} />
      <PhaseHeader week={weekNav.week} />
      <div className="hidden md:block mt-4">
        <WeekView week={weekNav.week} dates={weekNav.dates} />
      </div>
      <div className="md:hidden mt-4">
        <WeekList
          week={weekNav.week}
          dates={weekNav.dates}
          onSwipeLeft={weekNav.goToNext}
          onSwipeRight={weekNav.goToPrev}
        />
      </div>
    </main>
  )
}
