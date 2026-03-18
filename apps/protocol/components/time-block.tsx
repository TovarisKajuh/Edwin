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
        className={`w-full text-left px-2 py-1 rounded-sm transition-colors hover:bg-zinc-800 cursor-pointer ${
          block.warning ? 'bg-red-950/30' : 'bg-zinc-900'
        }`}
        style={{ borderLeft: `3px solid ${color}` }}
      >
        <span className="font-mono text-[10px] text-zinc-500">{block.time}</span>
        <span className="text-xs text-zinc-300 ml-1.5 truncate">{block.title}</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 rounded-lg transition-colors hover:bg-zinc-800/80 cursor-pointer ${
        block.warning ? 'bg-red-950/30' : 'bg-zinc-900'
      }`}
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-zinc-400 shrink-0">
          {block.time} – {block.endTime}
        </span>
        <span
          className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium"
          style={{ color, backgroundColor: `${color}20` }}
        >
          {block.category}
        </span>
      </div>
      <p className="text-sm text-zinc-100 mt-1 leading-snug">{block.title}</p>
    </button>
  )
}
