'use client'

import type { TimeBlock as TimeBlockType } from '@/data/types'
import { CATEGORY_COLORS } from '@/data/constants'

interface TimeBlockProps {
  block: TimeBlockType
  compact?: boolean
  onClick: () => void
}

export function TimeBlock({ block, compact, onClick }: TimeBlockProps) {
  const color = CATEGORY_COLORS[block.category] ?? '#71717a'

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors duration-150 hover:bg-[#1a1a2e] cursor-pointer"
      >
        <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs text-[#7a7a95] truncate">{block.title}</span>
      </button>
    )
  }

  const hasWarning = !!block.warning
  const hasEdwinNote = !!block.edwinNote

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border px-4 py-3 transition-colors duration-150 cursor-pointer ${
        hasWarning
          ? 'bg-red-950/20 border-red-500/20 hover:bg-red-950/30'
          : hasEdwinNote
            ? 'bg-amber-950/10 border-white/[0.06] hover:bg-[#1a1a2e]'
            : 'bg-[#12121e] border-white/[0.06] hover:bg-[#1a1a2e]'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className="shrink-0 w-2 h-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="font-mono text-xs text-[#4a4a65]">
          {block.time} – {block.endTime}
        </span>
      </div>
      <p className="text-sm text-[#f0f0f5] mt-1 leading-snug">{block.title}</p>
    </button>
  )
}
