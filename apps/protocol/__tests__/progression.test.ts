import { describe, it, expect } from 'vitest'
import { getProjectedWeight, getPullupPhase } from '@/lib/progression'

describe('getProjectedWeight', () => {
  it('returns 60kg bench for week 3', () => {
    expect(getProjectedWeight('bench', 3).weight).toBe(60)
  })
  it('returns 85kg bench for week 21', () => {
    expect(getProjectedWeight('bench', 21).weight).toBe(85)
  })
  it('returns 2 sets for deload week 6', () => {
    expect(getProjectedWeight('bench', 6).sets).toBe(2)
  })
  it('returns 90kg squat for week 21', () => {
    expect(getProjectedWeight('squat', 21).weight).toBe(90)
  })
})

describe('getPullupPhase', () => {
  it('returns band-assisted for week 5', () => {
    expect(getPullupPhase(5).phase).toBe('Band-Assisted')
  })
  it('returns mixed for week 10', () => {
    expect(getPullupPhase(10).phase).toBe('Mixed BW + Band')
  })
  it('returns weighted for week 20', () => {
    expect(getPullupPhase(20).phase).toBe('Bodyweight + Weighted')
  })
})
