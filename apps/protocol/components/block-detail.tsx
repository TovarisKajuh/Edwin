'use client'

import { useEffect, useCallback } from 'react'
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
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Mobile: bottom sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
        <div className="bg-zinc-900 rounded-t-2xl max-h-[85vh] overflow-y-auto border-t border-zinc-800">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-zinc-700" />
          </div>
          <PanelContent block={block} color={color} onClose={onClose} />
        </div>
      </div>

      {/* Desktop: right panel */}
      <div className="hidden md:block fixed right-0 top-0 bottom-0 z-50 w-[480px] bg-zinc-900 border-l border-zinc-800 overflow-y-auto">
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
  return (
    <div className="px-5 py-4 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="shrink-0 mt-1.5 w-2 h-2 rounded-full"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-zinc-100 leading-snug">
              {block.title}
            </h2>
            <span className="font-mono text-sm text-zinc-400">
              {block.time} – {block.endTime}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* What */}
      <Section label="What">
        <p className="text-sm text-zinc-100">{block.explanation.what}</p>
      </Section>

      {/* Dose Today */}
      {block.explanation.doseToday && (
        <Section label="Dose today">
          <div className="font-mono text-sm text-zinc-200 bg-zinc-800/50 rounded px-3 py-2">
            {block.explanation.doseToday}
          </div>
        </Section>
      )}

      {/* Why Today */}
      {block.explanation.whyToday && (
        <Section label="Why today">
          <p className="text-sm text-zinc-300">{block.explanation.whyToday}</p>
        </Section>
      )}

      {/* Mechanism */}
      {block.explanation.mechanism && (
        <Section label="Mechanism">
          <p className="text-sm text-zinc-400 italic">{block.explanation.mechanism}</p>
        </Section>
      )}

      {/* Phase Note */}
      {block.explanation.phaseNote && (
        <Section label="Phase note">
          <p className="text-sm text-zinc-500 italic">{block.explanation.phaseNote}</p>
        </Section>
      )}

      {/* Edwin Note */}
      {block.edwinNote && (
        <div className="bg-zinc-800 border-l-4 border-amber-500 px-4 py-3 rounded-r-md">
          <span className="text-[10px] uppercase tracking-wider text-amber-500 font-semibold">
            Edwin
          </span>
          <p className="text-sm text-amber-200 italic mt-1">{block.edwinNote}</p>
        </div>
      )}

      {/* Warning */}
      {block.warning && (
        <div className="bg-red-950/40 border-l-4 border-red-500 px-4 py-3 rounded-r-md">
          <p className="text-sm text-red-300 font-medium">{block.warning}</p>
        </div>
      )}

      {/* Training Detail */}
      {block.trainingDetail && (
        <Section label="Training">
          <TrainingDetail detail={block.trainingDetail} />
        </Section>
      )}

      {/* Meal Detail */}
      {block.mealDetail && (
        <Section label="Nutrition">
          <MealDetail detail={block.mealDetail} />
        </Section>
      )}
    </div>
  )
}

function Section({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider text-zinc-600 mb-1.5 font-medium">
        {label}
      </h3>
      {children}
    </div>
  )
}
