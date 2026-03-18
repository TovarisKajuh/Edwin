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

const SECTIONS = [
  { name: 'MORNING', start: '05', end: '08' },
  { name: 'MIDDAY', start: '09', end: '13' },
  { name: 'AFTERNOON', start: '14', end: '18' },
  { name: 'EVENING', start: '19', end: '23' },
]

function getSection(time: string): string {
  const hour = time.slice(0, 2)
  for (const section of SECTIONS) {
    if (hour >= section.start && hour <= section.end) {
      return section.name
    }
  }
  return 'EVENING'
}

export function DayTimeline({ date, mode }: DayTimelineProps) {
  const [selectedBlock, setSelectedBlock] = useState<TimeBlockType | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const blocks = useMemo(() => generateDay(date, mode), [date, mode])

  // Group blocks by section
  const groupedBlocks = useMemo(() => {
    const groups: { name: string; blocks: TimeBlockType[] }[] = []
    const sectionMap = new Map<string, TimeBlockType[]>()

    for (const block of blocks) {
      const sectionName = getSection(block.time)
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, [])
      }
      sectionMap.get(sectionName)!.push(block)
    }

    for (const section of SECTIONS) {
      const sectionBlocks = sectionMap.get(section.name)
      if (sectionBlocks && sectionBlocks.length > 0) {
        groups.push({ name: section.name, blocks: sectionBlocks })
      }
    }

    return groups
  }, [blocks])

  // Auto-scroll to current time on mount if viewing today
  useEffect(() => {
    const now = new Date()
    const todayStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
    const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`

    if (todayStr === dateStr && containerRef.current) {
      const currentHour = now.getHours()
      const currentSection = getSection(String(currentHour).padStart(2, '0'))
      const target = containerRef.current.querySelector(`[data-section="${currentSection}"]`)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [date])

  return (
    <>
      <div ref={containerRef} className="px-4 pb-8">
        {groupedBlocks.map((group) => (
          <div key={group.name} data-section={group.name}>
            {/* Section header */}
            <div className="mt-6 mb-3">
              <div className="border-t border-white/[0.04]" />
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4a4a65] mt-3">
                {group.name}
              </div>
            </div>

            {/* Blocks */}
            <div className="space-y-2">
              {group.blocks.map((block) => (
                <TimeBlock
                  key={block.id}
                  block={block}
                  onClick={() => setSelectedBlock(block)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <BlockDetail
        block={selectedBlock}
        onClose={() => setSelectedBlock(null)}
      />
    </>
  )
}
