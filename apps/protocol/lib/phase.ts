import type { Phase } from '@/data/types'
import { PHASES } from '@/data/phases'
import {
  DELOAD_WEEKS,
  DIET_BREAK_WEEKS,
  BLOODWORK_WEEKS,
  DIET_BREAK_CALORIES,
  REFEED_START_WEEK,
} from '@/data/constants'

export function getPhase(week: number): Phase {
  const phase = PHASES.find((p) => week >= p.weeks[0] && week <= p.weeks[1])
  if (!phase) {
    throw new Error(`No phase found for week ${week}`)
  }
  return phase
}

export function isDeloadWeek(week: number): boolean {
  return (DELOAD_WEEKS as readonly number[]).includes(week)
}

export function isDietBreakWeek(week: number): boolean {
  return (DIET_BREAK_WEEKS as readonly number[]).includes(week)
}

export function isBloodworkWeek(week: number): boolean {
  return (BLOODWORK_WEEKS as readonly number[]).includes(week)
}

export function isRefeedSaturday(week: number, dayOfWeek: number): boolean {
  if (dayOfWeek !== 6) return false
  if (week < REFEED_START_WEEK) return false
  if (isDietBreakWeek(week)) return false
  return true
}

export function getRefeedCalories(week: number): number {
  if (week <= 10) return 2900
  return 2650
}

export function getEffectiveCalories(week: number, dayOfWeek: number): number {
  if (isDietBreakWeek(week)) {
    return DIET_BREAK_CALORIES[week]
  }
  if (isRefeedSaturday(week, dayOfWeek)) {
    return getRefeedCalories(week)
  }
  return getPhase(week).calories
}
