'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import type { Mode, TimeBlock as TimeBlockType } from '@/data/types'
import { generateDay } from '@/lib/generator'
import { TimeBlock } from './time-block'
import { BlockDetail } from './block-detail'

interface DayTimelineProps {
  date: Date
  mode: Mode
}

// Generate hour labels from the blocks' time range
function getHourLabels(blocks: TimeBlockType[]): number[] {
  if (blocks.length === 0) return []
  const firstHour = parseInt(blocks[0].time.split(':')[0], 10)
  const lastBlock = blocks[blocks.length - 1]
  const lastHour = parseInt(lastBlock.endTime.split(':')[0], 10)
  const hours: number[] = []
  for (let h = firstHour; h <= Math.min(lastHour, 23); h++) {
    hours.push(h)
  }
  return hours
}

export function DayTimeline({ date, mode }: DayTimelineProps) {
  const [selectedBlock, setSelectedBlock] = useState<TimeBlockType | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const blocks = useMemo(() => generateDay(date, mode), [date, mode])
  const hours = useMemo(() => getHourLabels(blocks), [blocks])

  // Auto-scroll to current time on mount if viewing today
  useEffect(() => {
    const now = new Date()
    const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`

    if (todayStr === dateStr && containerRef.current) {
      const currentHour = now.getHours()
      const target = containerRef.current.querySelector(`[data-hour="${currentHour}"]`)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [date])

  return (
    <>
      <div ref={containerRef} className="relative px-4 pb-8">
        {/* Hour gutter + blocks */}
        <div className="relative">
          {hours.map((hour) => (
            <div key={hour} data-hour={hour} className="flex items-start min-h-[2rem]">
              <div className="shrink-0 w-10 pt-0.5 font-mono text-[10px] text-zinc-600 text-right pr-3">
                {String(hour).padStart(2, '0')}
              </div>
              <div className="flex-1 border-t border-zinc-800/40" />
            </div>
          ))}

          {/* Block overlay */}
          <div className="absolute inset-0 pl-10">
            <div className="space-y-1 pt-1">
              {blocks.map((block) => (
                <TimeBlock
                  key={block.id}
                  block={block}
                  onClick={() => setSelectedBlock(block)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <BlockDetail
        block={selectedBlock}
        onClose={() => setSelectedBlock(null)}
      />
    </>
  )
}
