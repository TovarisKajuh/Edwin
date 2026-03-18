import { STRENGTH_PROJECTIONS } from '@/data/strength-projections'
import { PULLUP_PHASES } from '@/data/pullup-progression'

export function getProjectedWeight(
  lift: 'bench' | 'squat' | 'deadlift' | 'ohp',
  week: number,
): { weight: number; reps: number; sets: number } {
  const projection = STRENGTH_PROJECTIONS.find((p) => p.week === week)
  if (!projection) throw new Error(`No strength projection for week ${week}`)
  return projection[lift]
}

export function getPullupPhase(week: number) {
  const phase = PULLUP_PHASES.find((p) => week >= p.weeks[0] && week <= p.weeks[1])
  if (!phase) throw new Error(`No pull-up phase for week ${week}`)
  return phase
}
