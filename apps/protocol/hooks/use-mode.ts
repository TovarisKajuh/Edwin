'use client'
import { useState, useEffect } from 'react'
import type { Mode } from '@/data/types'

export function useMode(dateStr: string): [Mode, (mode: Mode) => void] {
  const key = `protocol-mode-${dateStr}`
  const [mode, setModeState] = useState<Mode>('home')

  useEffect(() => {
    const stored = localStorage.getItem(key)
    if (stored === 'home' || stored === 'traveling') {
      setModeState(stored)
    }
  }, [key])

  const setMode = (newMode: Mode) => {
    setModeState(newMode)
    localStorage.setItem(key, newMode)
  }

  return [mode, setMode]
}
