'use client'

import Link from 'next/link'
import type { TimeBlock as TimeBlockType } from '@/data/types'
import { CATEGORY_COLORS } from '@/data/constants'
import { formatDate, getDayOfWeek, getWeekNumber } from '@/lib/dates'
import { getEffectiveCalories } from '@/lib/phase'
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
  const week = getWeekNumber(date)
  const cals = getEffectiveCalories(week, dayOfWeek)

  // Find training block
  const trainingBlock = blocks.find((b) => b.category === 'training')
  const trainingName = trainingBlock
    ? trainingBlock.title.split(' — ')[0]
    : dayOfWeek >= 6
      ? 'Rest'
      : null

  // Get unique categories
  const uniqueCategories = [...new Set(blocks.map((b) => b.category))]

  return (
    <Link
      href={`/day/${dateStr}`}
      className={`flex flex-col rounded-2xl bg-[#12121e] border p-4 hover:border-white/[0.12] transition-all duration-200 cursor-pointer min-h-[240px] ${
        isToday ? 'ring-1 ring-[#6b8aff]/40 border-white/[0.12]' : 'border-white/[0.06]'
      }`}
    >
      {/* Day abbreviation */}
      <div className="text-xs font-medium uppercase tracking-widest text-[#7a7a95]">
        {DAY_ABBRS[dayOfWeek]}
      </div>

      {/* Date number */}
      <div className={`text-2xl font-bold mt-1 ${isToday ? 'text-[#f0f0f5]' : 'text-[#f0f0f5]'}`}>
        {dayNum}
      </div>

      {/* Divider */}
      <div className="border-t border-white/[0.04] my-3" />

      {/* Training indicator */}
      {trainingName && (
        <div className="flex items-center gap-2 mb-1">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: CATEGORY_COLORS.training }}
          />
          <span className="text-sm font-medium text-[#f0f0f5] truncate">{trainingName}</span>
        </div>
      )}

      {/* Calorie target */}
      <div className="text-sm font-mono text-[#7a7a95]">
        {cals.toLocaleString()} kcal
      </div>

      {/* Spacer to push category dots + badges to bottom */}
      <div className="flex-1" />

      {/* Category dots */}
      <div className="flex gap-1 mt-3">
        {uniqueCategories.map((cat) => (
          <span
            key={cat}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: CATEGORY_COLORS[cat] ?? '#71717a' }}
          />
        ))}
      </div>

      {/* Block count */}
      <div className="text-xs text-[#4a4a65] mt-1">
        {blocks.length} blocks
      </div>

      {/* Special badges */}
      {(specialMarkers.deload || specialMarkers.dietBreak || specialMarkers.refeed || specialMarkers.bloodwork) && (
        <div className="flex items-center gap-1 mt-2 flex-wrap">
          {specialMarkers.deload && <DeloadBadge />}
          {specialMarkers.dietBreak && <DietBreakBadge />}
          {specialMarkers.refeed && <RefeedDot />}
          {specialMarkers.bloodwork && <BloodworkPin />}
        </div>
      )}
    </Link>
  )
}
