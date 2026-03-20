'use client'
import { useState, useEffect } from 'react'
import type { Mode } from '@/data/types'

const VALID_MODES: Mode[] = ['home_workout', 'travel_workout', 'home_rest', 'travel_rest']

export function useMode(dateStr: string): [Mode, (mode: Mode) => void] {
  const key = `protocol-mode-${dateStr}`
  const [mode, setModeState] = useState<Mode>('home_workout')

  useEffect(() => {
    const stored = localStorage.getItem(key)
    if (stored && VALID_MODES.includes(stored as Mode)) {
      setModeState(stored as Mode)
    }
  }, [key])

  const setMode = (newMode: Mode) => {
    setModeState(newMode)
    localStorage.setItem(key, newMode)
  }

  return [mode, setMode]
}
