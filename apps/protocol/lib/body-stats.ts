import { YOHIMBINE_GYM_DOSE, YOHIMBINE_SAFETY_MG_PER_KG } from '@/data/constants'

const WEEK_PROJECTIONS: Record<number, { weight: number; bf: number }> = {
  3: { weight: 92.5, bf: 26.5 },
  4: { weight: 91.5, bf: 26 },
  5: { weight: 90.5, bf: 25 },
  6: { weight: 89.5, bf: 24 },
  7: { weight: 88.5, bf: 23 },
  8: { weight: 87.5, bf: 22 },
  9: { weight: 86.5, bf: 21 },
  10: { weight: 86, bf: 20.5 },
  11: { weight: 85.5, bf: 19.5 },
  12: { weight: 85, bf: 19 },
  13: { weight: 84, bf: 18 },
  14: { weight: 83.5, bf: 17.5 },
  15: { weight: 83, bf: 17 },
  16: { weight: 82.5, bf: 16 },
  17: { weight: 82, bf: 15.5 },
  18: { weight: 81.5, bf: 15 },
  19: { weight: 81, bf: 14 },
  20: { weight: 80.5, bf: 13.5 },
  21: { weight: 80, bf: 13 },
  22: { weight: 80.5, bf: 12.5 },
}

export function getEstimatedWeight(week: number): number {
  const projection = WEEK_PROJECTIONS[week]
  if (!projection) throw new Error(`No projection for week ${week}`)
  return projection.weight
}

export function getEstimatedBf(week: number): number {
  const projection = WEEK_PROJECTIONS[week]
  if (!projection) throw new Error(`No projection for week ${week}`)
  return projection.bf
}

export function getYohimbineGymDose(week: number): number {
  const scheduledDose = YOHIMBINE_GYM_DOSE[week]
  if (scheduledDose === undefined) throw new Error(`No yohimbine dose for week ${week}`)
  const estimatedWeight = getEstimatedWeight(week)
  const safetyCap = Math.floor(estimatedWeight * YOHIMBINE_SAFETY_MG_PER_KG)
  return Math.min(scheduledDose, safetyCap)
}
