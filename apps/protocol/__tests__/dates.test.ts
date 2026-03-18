import { describe, it, expect } from 'vitest'
import {
  getWeekNumber,
  getDateRange,
  getDayOfWeek,
  formatDate,
  isWeekend,
  getProtocolDay,
  parseDate,
} from '@/lib/dates'

describe('getWeekNumber', () => {
  it('returns 3 for March 23 2026 (Monday, first day)', () => {
    expect(getWeekNumber(new Date(Date.UTC(2026, 2, 23)))).toBe(3)
  })
  it('returns 3 for March 29 2026 (Sunday, last day of week 3)', () => {
    expect(getWeekNumber(new Date(Date.UTC(2026, 2, 29)))).toBe(3)
  })
  it('returns 4 for March 30 2026 — crosses DST boundary correctly', () => {
    expect(getWeekNumber(new Date(Date.UTC(2026, 2, 30)))).toBe(4)
  })
  it('returns 22 for August 9 2026 (Sunday, last day)', () => {
    expect(getWeekNumber(new Date(Date.UTC(2026, 7, 9)))).toBe(22)
  })
  it('returns 10 for May 11 2026 (Monday week 10)', () => {
    expect(getWeekNumber(new Date(Date.UTC(2026, 4, 11)))).toBe(10)
  })
})

describe('getDateRange', () => {
  it('returns 7 dates for week 3 starting March 23', () => {
    const dates = getDateRange(3)
    expect(dates).toHaveLength(7)
    expect(dates[0].getUTCDate()).toBe(23)
    expect(dates[0].getUTCMonth()).toBe(2) // March
    expect(dates[6].getUTCDate()).toBe(29)
  })
  it('returns correct dates for week 4 (crosses DST)', () => {
    const dates = getDateRange(4)
    expect(dates[0].getUTCDate()).toBe(30) // March 30
    expect(dates[6].getUTCDate()).toBe(5)  // April 5
  })
})

describe('getDayOfWeek', () => {
  it('returns 1 for Monday March 23', () => {
    expect(getDayOfWeek(new Date(Date.UTC(2026, 2, 23)))).toBe(1)
  })
  it('returns 7 for Sunday March 29', () => {
    expect(getDayOfWeek(new Date(Date.UTC(2026, 2, 29)))).toBe(7)
  })
  it('returns 6 for Saturday', () => {
    expect(getDayOfWeek(new Date(Date.UTC(2026, 2, 28)))).toBe(6)
  })
})

describe('isWeekend', () => {
  it('false for Monday', () => {
    expect(isWeekend(new Date(Date.UTC(2026, 2, 23)))).toBe(false)
  })
  it('true for Saturday', () => {
    expect(isWeekend(new Date(Date.UTC(2026, 2, 28)))).toBe(true)
  })
  it('true for Sunday', () => {
    expect(isWeekend(new Date(Date.UTC(2026, 2, 29)))).toBe(true)
  })
})

describe('formatDate', () => {
  it('formats March 23 correctly', () => {
    expect(formatDate(new Date(Date.UTC(2026, 2, 23)))).toBe('2026-03-23')
  })
})

describe('getProtocolDay', () => {
  it('returns 1 for March 23', () => {
    expect(getProtocolDay(new Date(Date.UTC(2026, 2, 23)))).toBe(1)
  })
  it('returns 140 for August 9', () => {
    expect(getProtocolDay(new Date(Date.UTC(2026, 7, 9)))).toBe(140)
  })
})

describe('parseDate', () => {
  it('parses YYYY-MM-DD to UTC date', () => {
    const d = parseDate('2026-03-23')
    expect(d.getUTCFullYear()).toBe(2026)
    expect(d.getUTCMonth()).toBe(2)
    expect(d.getUTCDate()).toBe(23)
  })
})
