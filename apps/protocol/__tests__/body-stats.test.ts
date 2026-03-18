import { describe, it, expect } from 'vitest'
import { getEstimatedWeight, getEstimatedBf, getYohimbineGymDose } from '@/lib/body-stats'

describe('getEstimatedWeight', () => {
  it('returns 92.5 for week 3', () => { expect(getEstimatedWeight(3)).toBe(92.5) })
  it('returns 86 for week 10', () => { expect(getEstimatedWeight(10)).toBe(86) })
  it('returns 80 for week 21', () => { expect(getEstimatedWeight(21)).toBe(80) })
})

describe('getEstimatedBf', () => {
  it('returns 26.5 for week 3', () => { expect(getEstimatedBf(3)).toBe(26.5) })
  it('returns 13 for week 21', () => { expect(getEstimatedBf(21)).toBe(13) })
})

describe('getYohimbineGymDose', () => {
  it('returns 5 for week 3', () => { expect(getYohimbineGymDose(3)).toBe(5) })
  it('returns 15 for week 7', () => { expect(getYohimbineGymDose(7)).toBe(15) })
  it('caps at 17 for week 9 (86.5kg * 0.2 = 17.3, floor = 17)', () => {
    expect(getYohimbineGymDose(9)).toBe(17)
  })
  it('caps at 16 for week 19 (81kg * 0.2 = 16.2, floor = 16)', () => {
    expect(getYohimbineGymDose(19)).toBe(16)
  })
  it('returns 10 for week 5', () => { expect(getYohimbineGymDose(5)).toBe(10) })
})
