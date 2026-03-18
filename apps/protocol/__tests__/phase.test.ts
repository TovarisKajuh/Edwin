import { describe, it, expect } from 'vitest'
import {
  getPhase,
  isDeloadWeek,
  isDietBreakWeek,
  isRefeedSaturday,
  isBloodworkWeek,
  getEffectiveCalories,
} from '@/lib/phase'

describe('getPhase', () => {
  it('returns Ramp-up for week 3', () => {
    expect(getPhase(3).name).toBe('Ramp-up')
  })
  it('returns Ramp-up for week 6', () => {
    expect(getPhase(6).name).toBe('Ramp-up')
  })
  it('returns Acceleration for week 7', () => {
    expect(getPhase(7).name).toBe('Acceleration')
  })
  it('returns Final Cut for week 22', () => {
    expect(getPhase(22).name).toBe('Final Cut')
  })
  it('throws for week outside range', () => {
    expect(() => getPhase(1)).toThrow()
  })
})

describe('isDeloadWeek', () => {
  it('true for week 6', () => {
    expect(isDeloadWeek(6)).toBe(true)
  })
  it('false for week 7', () => {
    expect(isDeloadWeek(7)).toBe(false)
  })
  it('true for week 22', () => {
    expect(isDeloadWeek(22)).toBe(true)
  })
})

describe('isDietBreakWeek', () => {
  it('true for week 10', () => {
    expect(isDietBreakWeek(10)).toBe(true)
  })
  it('true for week 18', () => {
    expect(isDietBreakWeek(18)).toBe(true)
  })
  it('false for week 11', () => {
    expect(isDietBreakWeek(11)).toBe(false)
  })
})

describe('isBloodworkWeek', () => {
  it('true for week 12', () => {
    expect(isBloodworkWeek(12)).toBe(true)
  })
  it('false for week 13', () => {
    expect(isBloodworkWeek(13)).toBe(false)
  })
})

describe('isRefeedSaturday', () => {
  it('false before week 5', () => {
    expect(isRefeedSaturday(4, 6)).toBe(false)
  })
  it('true for Saturday week 5', () => {
    expect(isRefeedSaturday(5, 6)).toBe(true)
  })
  it('false for Monday week 5', () => {
    expect(isRefeedSaturday(5, 1)).toBe(false)
  })
  it('false during diet break week 10', () => {
    expect(isRefeedSaturday(10, 6)).toBe(false)
  })
})

describe('getEffectiveCalories', () => {
  it('returns phase calories for normal week', () => {
    expect(getEffectiveCalories(9, 1)).toBe(2100)
  })
  it('returns maintenance for diet break week 10', () => {
    expect(getEffectiveCalories(10, 1)).toBe(2800)
  })
  it('returns maintenance for diet break week 18', () => {
    expect(getEffectiveCalories(18, 3)).toBe(2700)
  })
  it('returns refeed calories for Saturday week 5', () => {
    expect(getEffectiveCalories(5, 6)).toBe(2900)
  })
  it('returns late refeed calories for Saturday week 12', () => {
    expect(getEffectiveCalories(12, 6)).toBe(2650)
  })
})
