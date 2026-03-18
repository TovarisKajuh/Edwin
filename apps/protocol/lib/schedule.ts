import type { TrainingDetail } from '@/data/types'
import { TRAINING_DAYS } from '@/data/training'
import { getProjectedWeight } from '@/lib/progression'
import { isDeloadWeek } from '@/lib/phase'

/** Map dayOfWeek to the main lift that uses strength projections */
const MAIN_LIFT_MAP: Record<number, 'bench' | 'squat' | 'deadlift' | 'ohp'> = {
  1: 'bench',    // Monday — Bench Press
  2: 'deadlift', // Tuesday — Deadlift
  3: 'squat',    // Wednesday — Squat
  5: 'ohp',      // Friday — OHP
}

export function getTrainingDay(
  dayOfWeek: number,
  mode: 'home' | 'traveling',
  isDeload: boolean,
  week: number,
): TrainingDetail | null {
  // Saturday (6) and Sunday (7) — rest days
  if (dayOfWeek === 6 || dayOfWeek === 7) return null

  const template = TRAINING_DAYS.find((t) => t.dayOfWeek === dayOfWeek)
  if (!template) return null

  const sourceExercises = mode === 'traveling' ? template.travelExercises : template.exercises

  const exercises = sourceExercises.map((ex) => {
    let weight = ex.startWeight
    let sets = ex.sets
    const reps = ex.repTarget

    // For the first exercise on days that have a main lift projection,
    // use projected weight from the strength table
    const mainLift = MAIN_LIFT_MAP[dayOfWeek]
    if (mainLift && mode === 'home') {
      // Match the main lift: first exercise on each day
      const isMainLift =
        (dayOfWeek === 1 && ex.name === 'Barbell Bench Press') ||
        (dayOfWeek === 2 && ex.name === 'Conventional Deadlift') ||
        (dayOfWeek === 3 && ex.name === 'Barbell Back Squat') ||
        (dayOfWeek === 5 && ex.name === 'Standing OHP')

      if (isMainLift) {
        const projection = getProjectedWeight(mainLift, week)
        weight = projection.weight
        sets = projection.sets
      }
    }

    // Deload: halve the sets, keep weight the same
    if (isDeload) {
      sets = Math.ceil(sets / 2)
    }

    return {
      name: ex.name,
      weight,
      sets,
      reps,
      startWeight: ex.startWeight,
      progressionNote: ex.progressionRule,
    }
  })

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0)
  const baseMinutes = mode === 'traveling' ? template.travelMinutes : template.estimatedMinutes
  // Rough scaling: if sets are halved (deload), time scales proportionally
  const estimatedMinutes = isDeload
    ? Math.round(baseMinutes * (totalSets / (mode === 'traveling' ? template.travelSets : template.totalSets)))
    : baseMinutes

  const result: TrainingDetail = {
    dayName: template.name,
    muscles: template.muscles,
    exercises,
    totalSets,
    estimatedMinutes,
  }

  if (isDeload) {
    result.deloadNote =
      'Deload week: sets halved, weight maintained. Focus on recovery and form.'
  }

  if (dayOfWeek === 5) {
    result.alternativeNote =
      'If fatigued, switch to Full Body: Goblet Squat 2x10, DB Bench 2x10, Cable Row 2x12, DB Lateral Raise 2x15, Pull-ups 3xmax (11 sets, ~35 min).'
  }

  return result
}
