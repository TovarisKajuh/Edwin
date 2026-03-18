'use client'

import type { Mode } from '@/data/types'

interface ModeToggleProps {
  mode: Mode
  onModeChange: (mode: Mode) => void
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-full bg-zinc-800 p-0.5">
      <button
        onClick={() => onModeChange('home')}
        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${
          mode === 'home'
            ? 'bg-zinc-700 text-white'
            : 'text-zinc-400 hover:text-zinc-300'
        }`}
      >
        Home
      </button>
      <button
        onClick={() => onModeChange('traveling')}
        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors cursor-pointer ${
          mode === 'traveling'
            ? 'bg-zinc-700 text-white'
            : 'text-zinc-400 hover:text-zinc-300'
        }`}
      >
        Traveling
      </button>
    </div>
  )
}
