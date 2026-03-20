'use client'
import { useState, useEffect, useCallback } from 'react'
import { TRAINING_DAYS } from '@/data/training'

const SEQUENCE_KEY = 'protocol-workout-index'
const WORKOUT_NAMES = ['Push A', 'Pull', 'Legs', 'Upper Looksmax', 'Push B']

export function useWorkoutSequence() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const stored = localStorage.getItem(SEQUENCE_KEY)
    if (stored !== null) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 4) {
        setIndex(parsed)
      }
    }
  }, [])

  const advance = useCallback(() => {
    setIndex(prev => {
      const next = (prev + 1) % 5
      localStorage.setItem(SEQUENCE_KEY, String(next))
      return next
    })
  }, [])

  const setWorkoutIndex = useCallback((i: number) => {
    const clamped = Math.max(0, Math.min(4, i))
    setIndex(clamped)
    localStorage.setItem(SEQUENCE_KEY, String(clamped))
  }, [])

  return {
    index,
    workoutName: WORKOUT_NAMES[index],
    trainingDay: TRAINING_DAYS[index],
    advance,
    setWorkoutIndex,
  }
}
