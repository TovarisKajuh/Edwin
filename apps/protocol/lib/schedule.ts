import type { TrainingDetail, Mode } from '@/data/types'
import { isTravelMode } from '@/data/types'
import { TRAINING_DAYS } from '@/data/training'
import { getProjectedWeight } from '@/lib/progression'

/** Map training index to the main lift that uses strength projections */
const MAIN_LIFT_MAP: Record<number, 'bench' | 'squat' | 'deadlift' | 'ohp'> = {
  0: 'bench',    // Push A — Bench Press
  1: 'deadlift', // Pull — Deadlift
  2: 'squat',    // Legs — Squat
  4: 'ohp',      // Push B — OHP
}

/**
 * Get training detail for a given workout index (0-4) and mode.
 * Returns null if workoutIndex is undefined (rest day).
 */
export function getTrainingDay(
  workoutIndex: number | undefined,
  mode: Mode,
  isDeload: boolean,
  week: number,
): TrainingDetail | null {
  if (workoutIndex === undefined || workoutIndex < 0 || workoutIndex > 4) return null

  const template = TRAINING_DAYS[workoutIndex]
  if (!template) return null

  const isTravel = isTravelMode(mode)
  const sourceExercises = isTravel ? template.travelExercises : template.exercises

  const exercises = sourceExercises.map((ex) => {
    let weight = ex.startWeight
    let sets = ex.sets
    const reps = ex.repTarget

    // For the main lift on each training day, use projected weight
    const mainLift = MAIN_LIFT_MAP[workoutIndex]
    if (mainLift && !isTravel) {
      const isMainLift =
        (workoutIndex === 0 && ex.name === 'Barbell Bench Press') ||
        (workoutIndex === 1 && ex.name === 'Conventional Deadlift') ||
        (workoutIndex === 2 && ex.name === 'Barbell Back Squat') ||
        (workoutIndex === 4 && ex.name === 'Standing OHP')

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
  const baseMinutes = isTravel ? template.travelMinutes : template.estimatedMinutes
  const estimatedMinutes = isDeload
    ? Math.round(baseMinutes * (totalSets / (isTravel ? template.travelSets : template.totalSets)))
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

  if (workoutIndex === 4) {
    result.alternativeNote =
      'If fatigued, switch to Full Body: Goblet Squat 2x10, DB Bench 2x10, Cable Row 2x12, DB Lateral Raise 2x15, Pull-ups 3xmax (11 sets, ~35 min).'
  }

  return result
}
