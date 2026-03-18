'use client'
import { useState, useMemo } from 'react'
import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK } from '@/data/constants'
import { getWeekNumber, getDateRange } from '@/lib/dates'

export function useWeekNav() {
  const today = new Date()
  const currentWeek = getWeekNumber(today)
  const defaultWeek =
    currentWeek >= PROTOCOL_START_WEEK && currentWeek <= PROTOCOL_END_WEEK
      ? currentWeek
      : PROTOCOL_START_WEEK

  const [week, setWeek] = useState(defaultWeek)

  const dates = useMemo(() => getDateRange(week), [week])

  const canGoPrev = week > PROTOCOL_START_WEEK
  const canGoNext = week < PROTOCOL_END_WEEK
  const goToPrev = () => { if (canGoPrev) setWeek(w => w - 1) }
  const goToNext = () => { if (canGoNext) setWeek(w => w + 1) }
  const goToWeek = (w: number) => setWeek(Math.max(PROTOCOL_START_WEEK, Math.min(PROTOCOL_END_WEEK, w)))
  const isCurrentWeek = week === currentWeek

  return { week, dates, canGoPrev, canGoNext, goToPrev, goToNext, goToWeek, isCurrentWeek }
}
