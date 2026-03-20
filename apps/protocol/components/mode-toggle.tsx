'use client'

import type { Mode } from '@/data/types'

const OPTIONS: { value: Mode; label: string; icon: string }[] = [
  { value: 'home_workout', label: 'Home', icon: '\u{1F3CB}\u{FE0F}' },
  { value: 'home_rest', label: 'Home Rest', icon: '\u{1F3E0}' },
  { value: 'travel_workout', label: 'Travel', icon: '\u{1F527}' },
  { value: 'travel_rest', label: 'Travel Rest', icon: '\u{1F634}' },
]

interface ModeToggleProps {
  mode: Mode
  onModeChange: (mode: Mode) => void
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="inline-grid grid-cols-2 gap-1 rounded-2xl bg-[#0f1020] p-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onModeChange(opt.value)}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all duration-200 cursor-pointer ${
            mode === opt.value
              ? 'bg-white text-[#0b0d19]'
              : 'text-[#7a7b90] hover:text-[#f0f0f5]'
          }`}
        >
          {opt.icon} {opt.label}
        </button>
      ))}
    </div>
  )
}
