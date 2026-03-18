'use client'

import { useState, useEffect, useCallback } from 'react'
import type { TimeBlock } from '@/data/types'
import { CATEGORY_COLORS } from '@/data/constants'
import { TrainingDetail } from './training-detail'
import { MealDetail } from './meal-detail'

interface BlockDetailProps {
  block: TimeBlock | null
  onClose: () => void
}

export function BlockDetail({ block, onClose }: BlockDetailProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!block) return
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [block, handleKeyDown])

  if (!block) return null

  const color = CATEGORY_COLORS[block.category] ?? '#71717a'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Mobile: bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="bg-[#0a0a14] rounded-t-3xl max-h-[85vh] overflow-y-auto border-t border-white/[0.06]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/[0.12]" />
          </div>
          <PanelContent block={block} color={color} onClose={onClose} />
        </div>
      </div>

      {/* Desktop: right panel */}
      <div className="hidden md:block fixed right-0 top-0 bottom-0 z-50 w-[480px] bg-[#0a0a14] border-l border-white/[0.06] overflow-y-auto">
        <PanelContent block={block} color={color} onClose={onClose} />
      </div>
    </>
  )
}

function PanelContent({
  block,
  color,
  onClose,
}: {
  block: TimeBlock
  color: string
  onClose: () => void
}) {
  const [mechanismExpanded, setMechanismExpanded] = useState(false)

  return (
    <div className="px-5 py-4 space-y-5">
      {/* Header card */}
      <div className="rounded-xl bg-[#12121e] p-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-[#12121e] border border-white/[0.06] flex items-center justify-center text-[#7a7a95] hover:text-[#f0f0f5] hover:border-white/[0.12] transition-all duration-200 cursor-pointer"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2 2l10 10M12 2L2 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className="flex items-center gap-2 mb-2">
          <span
            className="shrink-0 w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color }}
          >
            {block.category}
          </span>
        </div>
        <h2 className="text-lg font-semibold text-[#f0f0f5] leading-snug pr-10">
          {block.title}
        </h2>
        <span className="font-mono text-sm text-[#7a7a95] mt-1 block">
          {block.time} – {block.endTime}
        </span>
      </div>

      {/* What */}
      <p className="text-sm text-[#f0f0f5] leading-relaxed">{block.explanation.what}</p>

      {/* Dose Today */}
      {block.explanation.doseToday && (
        <div className="font-mono text-sm text-[#f0f0f5] bg-[#12121e] rounded-lg px-4 py-3">
          {block.explanation.doseToday}
        </div>
      )}

      {/* Why Today */}
      {block.explanation.whyToday && (
        <p className="text-sm text-[#7a7a95] leading-relaxed">{block.explanation.whyToday}</p>
      )}

      {/* Mechanism — collapsed by default */}
      {block.explanation.mechanism && (
        <div>
          <button
            onClick={() => setMechanismExpanded(!mechanismExpanded)}
            className="text-xs text-[#4a4a65] hover:text-[#7a7a95] transition-colors duration-200 cursor-pointer"
          >
            How it works {mechanismExpanded ? '▾' : '▸'}
          </button>
          {mechanismExpanded && (
            <p className="text-sm text-[#4a4a65] italic mt-2 leading-relaxed">
              {block.explanation.mechanism}
            </p>
          )}
        </div>
      )}

      {/* Phase Note */}
      {block.explanation.phaseNote && (
        <p className="text-xs text-[#4a4a65] italic">{block.explanation.phaseNote}</p>
      )}

      {/* Edwin Note */}
      {block.edwinNote && (
        <div className="rounded-xl bg-amber-950/15 border border-amber-500/20 p-4">
          <span className="text-[10px] uppercase tracking-widest text-amber-400/60 font-semibold">
            Edwin
          </span>
          <p className="text-sm text-amber-200 italic mt-1">{block.edwinNote}</p>
        </div>
      )}

      {/* Warning */}
      {block.warning && (
        <div className="rounded-xl bg-red-950/20 border border-red-500/20 p-4 text-red-300">
          <p className="text-sm font-medium">{block.warning}</p>
        </div>
      )}

      {/* Training Detail */}
      {block.trainingDetail && <TrainingDetail detail={block.trainingDetail} />}

      {/* Meal Detail */}
      {block.mealDetail && <MealDetail detail={block.mealDetail} />}
    </div>
  )
}
