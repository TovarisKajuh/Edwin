'use client'

import Link from 'next/link'
import type { TimeBlock as TimeBlockType } from '@/data/types'
import { formatDate } from '@/lib/dates'
import { TimeBlock } from './time-block'
import { DeloadBadge, DietBreakBadge, RefeedDot, BloodworkPin } from './special-markers'

interface SpecialMarkers {
  deload: boolean
  dietBreak: boolean
  refeed: boolean
  bloodwork: boolean
}

interface DayColumnProps {
  date: Date
  blocks: TimeBlockType[]
  isToday: boolean
  specialMarkers: SpecialMarkers
}

const DAY_ABBRS = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function DayColumn({ date, blocks, isToday, specialMarkers }: DayColumnProps) {
  const dayOfWeek = date.getUTCDay() === 0 ? 7 : date.getUTCDay()
  const dayNum = date.getUTCDate()
  const dateStr = formatDate(date)

  return (
    <Link
      href={`/day/${dateStr}`}
      className={`flex flex-col rounded-lg bg-zinc-900/50 border transition-colors hover:border-zinc-700 min-w-0 ${
        isToday ? 'ring-1 ring-zinc-500 border-zinc-700' : 'border-zinc-800/50'
      }`}
    >
      {/* Header */}
      <div className="px-2 py-1.5 border-b border-zinc-800/50 text-center">
        <div className="text-[10px] text-zinc-500 uppercase">{DAY_ABBRS[dayOfWeek]}</div>
        <div className={`text-sm font-semibold ${isToday ? 'text-zinc-100' : 'text-zinc-300'}`}>
          {dayNum}
        </div>
      </div>

      {/* Special markers */}
      {(specialMarkers.deload || specialMarkers.dietBreak || specialMarkers.refeed || specialMarkers.bloodwork) && (
        <div className="flex items-center justify-center gap-1 px-1 py-1 flex-wrap">
          {specialMarkers.deload && <DeloadBadge />}
          {specialMarkers.dietBreak && <DietBreakBadge />}
          {specialMarkers.refeed && <RefeedDot />}
          {specialMarkers.bloodwork && <BloodworkPin />}
        </div>
      )}

      {/* Compact block stack */}
      <div className="flex-1 overflow-y-auto px-1 py-1 space-y-px max-h-[480px]">
        {blocks.map((block) => (
          <TimeBlock
            key={block.id}
            block={block}
            compact
            onClick={() => {
              // Navigation handled by the Link wrapper
            }}
          />
        ))}
      </div>
    </Link>
  )
}
