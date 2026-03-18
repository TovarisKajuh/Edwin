'use client'

import { useMemo } from 'react'
import { generateDay } from '@/lib/generator'
import { formatDate, getDayOfWeek } from '@/lib/dates'
import { isDeloadWeek, isDietBreakWeek, isRefeedSaturday, isBloodworkWeek } from '@/lib/phase'
import { getWeekNumber } from '@/lib/dates'
import { DayColumn } from './day-column'

interface WeekViewProps {
  week: number
  dates: Date[]
}

export function WeekView({ week, dates }: WeekViewProps) {
  const todayStr = formatDate(new Date())

  const columns = useMemo(() => {
    return dates.map((date) => {
      const blocks = generateDay(date, 'home')
      const dayOfWeek = getDayOfWeek(date)
      const dateStr = formatDate(date)
      const wk = getWeekNumber(date)

      return {
        date,
        dateStr,
        blocks,
        isToday: dateStr === todayStr,
        specialMarkers: {
          deload: isDeloadWeek(wk),
          dietBreak: isDietBreakWeek(wk),
          refeed: isRefeedSaturday(wk, dayOfWeek),
          bloodwork: isBloodworkWeek(wk) && dayOfWeek === 1,
        },
      }
    })
  }, [dates, todayStr])

  return (
    <div className="grid grid-cols-7 gap-3">
      {columns.map((col) => (
        <DayColumn
          key={col.dateStr}
          date={col.date}
          blocks={col.blocks}
          isToday={col.isToday}
          specialMarkers={col.specialMarkers}
        />
      ))}
    </div>
  )
}
