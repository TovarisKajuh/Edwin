import { PROTOCOL_START_DATE, PROTOCOL_START_WEEK } from '@/data/constants'

const MS_PER_DAY = 24 * 60 * 60 * 1000

function toUTCMidnight(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
}

// Returns protocol week number (3-22) for a given date
export function getWeekNumber(date: Date): number {
  const startMs = PROTOCOL_START_DATE.getTime()
  const dateMs = toUTCMidnight(date)
  const daysDiff = Math.floor((dateMs - startMs) / MS_PER_DAY)
  return Math.floor(daysDiff / 7) + PROTOCOL_START_WEEK
}

// Returns array of 7 Date objects (Mon-Sun) for a given protocol week
export function getDateRange(week: number): Date[] {
  const offsetDays = (week - PROTOCOL_START_WEEK) * 7
  const startMs = PROTOCOL_START_DATE.getTime()
  return Array.from({ length: 7 }, (_, i) => {
    return new Date(startMs + (offsetDays + i) * MS_PER_DAY)
  })
}

// Returns 1-7 (Mon=1, Sun=7)
export function getDayOfWeek(date: Date): number {
  const day = date.getUTCDay() // 0=Sun, 1=Mon, ..., 6=Sat
  return day === 0 ? 7 : day
}

// Returns "YYYY-MM-DD"
export function formatDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isWeekend(date: Date): boolean {
  return getDayOfWeek(date) >= 6
}

// 1-indexed day number within the protocol (day 1 = March 23)
export function getProtocolDay(date: Date): number {
  const startMs = PROTOCOL_START_DATE.getTime()
  const dateMs = toUTCMidnight(date)
  return Math.floor((dateMs - startMs) / MS_PER_DAY) + 1
}

// Parse "YYYY-MM-DD" to Date (UTC)
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
