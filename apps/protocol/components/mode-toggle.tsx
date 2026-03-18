'use client'

import type { Mode } from '@/data/types'

interface ModeToggleProps {
  mode: Mode
  onModeChange: (mode: Mode) => void
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="inline-flex rounded-full bg-[#12121e] border border-white/[0.06] p-1">
      <button
        onClick={() => onModeChange('home')}
        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
          mode === 'home'
            ? 'bg-white text-[#0a0a14]'
            : 'text-[#7a7a95] hover:text-[#f0f0f5]'
        }`}
      >
        Home
      </button>
      <button
        onClick={() => onModeChange('traveling')}
        className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
          mode === 'traveling'
            ? 'bg-white text-[#0a0a14]'
            : 'text-[#7a7a95] hover:text-[#f0f0f5]'
        }`}
      >
        Traveling
      </button>
    </div>
  )
}
