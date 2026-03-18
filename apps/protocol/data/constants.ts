export const PROTOCOL_START_DATE = new Date(Date.UTC(2026, 2, 23)) // March 23, 2026 UTC
export const PROTOCOL_START_WEEK = 3
export const PROTOCOL_END_WEEK = 22
export const TOTAL_WEEKS = PROTOCOL_END_WEEK - PROTOCOL_START_WEEK + 1 // 20

export const STARTING_WEIGHT = 92.5
export const STARTING_BF = 26.5
export const STARTING_FAT_MASS = STARTING_WEIGHT * (STARTING_BF / 100)
export const LEAN_MASS = STARTING_WEIGHT - STARTING_FAT_MASS

export const YOHIMBINE_WORK_CAP = 5
export const YOHIMBINE_SAFETY_MG_PER_KG = 0.2
export const PROTEIN_TARGET = 195

export const DELOAD_WEEKS = [6, 10, 14, 18, 22] as const
export const DIET_BREAK_WEEKS = [10, 18] as const
export const BLOODWORK_WEEKS = [12, 16, 21] as const
export const REFEED_START_WEEK = 5

export const DIET_BREAK_CALORIES: Record<number, number> = {
  10: 2800,
  18: 2700,
}

export const YOHIMBINE_GYM_DOSE: Record<number, number> = {
  3: 5, 4: 5,
  5: 10, 6: 10,
  7: 15, 8: 15,
  9: 20, 10: 20,
  11: 20, 12: 20, 13: 20, 14: 20,
  15: 20, 16: 20, 17: 20, 18: 20,
  19: 20, 20: 20, 21: 20, 22: 20,
}

export const CATEGORY_COLORS: Record<string, string> = {
  training: '#3b82f6',
  nutrition: '#22c55e',
  supplements: '#a855f7',
  peptides: '#6366f1',
  cardio: '#f97316',
  skincare: '#6b7280',
  monitoring: '#eab308',
  sleep: '#334155',
}
