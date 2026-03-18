import type { StrengthProjection } from './types'

export const STRENGTH_PROJECTIONS: StrengthProjection[] = [
  // Week 3
  { week: 3, bench: { weight: 60, reps: 6, sets: 3 }, squat: { weight: 56, reps: 6, sets: 4 }, deadlift: { weight: 90, reps: 5, sets: 3 }, ohp: { weight: 30, reps: 6, sets: 3 } },
  // Week 4
  { week: 4, bench: { weight: 62.5, reps: 6, sets: 3 }, squat: { weight: 58.5, reps: 6, sets: 4 }, deadlift: { weight: 92.5, reps: 5, sets: 3 }, ohp: { weight: 31.25, reps: 6, sets: 3 } },
  // Week 5
  { week: 5, bench: { weight: 65, reps: 6, sets: 3 }, squat: { weight: 61, reps: 6, sets: 4 }, deadlift: { weight: 95, reps: 5, sets: 3 }, ohp: { weight: 32.5, reps: 6, sets: 3 } },
  // Week 6 (Deload)
  { week: 6, bench: { weight: 65, reps: 4, sets: 2 }, squat: { weight: 61, reps: 4, sets: 2 }, deadlift: { weight: 95, reps: 3, sets: 2 }, ohp: { weight: 32.5, reps: 4, sets: 2 } },
  // Week 7
  { week: 7, bench: { weight: 67.5, reps: 6, sets: 3 }, squat: { weight: 63.5, reps: 6, sets: 4 }, deadlift: { weight: 97.5, reps: 5, sets: 3 }, ohp: { weight: 33.75, reps: 6, sets: 3 } },
  // Week 8
  { week: 8, bench: { weight: 70, reps: 6, sets: 3 }, squat: { weight: 66, reps: 6, sets: 4 }, deadlift: { weight: 100, reps: 5, sets: 3 }, ohp: { weight: 35, reps: 6, sets: 3 } },
  // Week 9
  { week: 9, bench: { weight: 72.5, reps: 6, sets: 3 }, squat: { weight: 68.5, reps: 6, sets: 4 }, deadlift: { weight: 102.5, reps: 5, sets: 3 }, ohp: { weight: 36.25, reps: 6, sets: 3 } },
  // Week 10 (Deload)
  { week: 10, bench: { weight: 72.5, reps: 4, sets: 2 }, squat: { weight: 68.5, reps: 4, sets: 2 }, deadlift: { weight: 102.5, reps: 3, sets: 2 }, ohp: { weight: 36.25, reps: 4, sets: 2 } },
  // Week 11
  { week: 11, bench: { weight: 75, reps: 6, sets: 3 }, squat: { weight: 71, reps: 6, sets: 4 }, deadlift: { weight: 105, reps: 5, sets: 3 }, ohp: { weight: 37.5, reps: 6, sets: 3 } },
  // Week 12
  { week: 12, bench: { weight: 76.25, reps: 6, sets: 3 }, squat: { weight: 73.5, reps: 6, sets: 4 }, deadlift: { weight: 107.5, reps: 5, sets: 3 }, ohp: { weight: 38.75, reps: 6, sets: 3 } },
  // Week 13
  { week: 13, bench: { weight: 77.5, reps: 6, sets: 3 }, squat: { weight: 76, reps: 6, sets: 4 }, deadlift: { weight: 110, reps: 5, sets: 3 }, ohp: { weight: 40, reps: 6, sets: 3 } },
  // Week 14 (Deload)
  { week: 14, bench: { weight: 77.5, reps: 4, sets: 2 }, squat: { weight: 76, reps: 4, sets: 2 }, deadlift: { weight: 110, reps: 3, sets: 2 }, ohp: { weight: 40, reps: 4, sets: 2 } },
  // Week 15
  { week: 15, bench: { weight: 78.75, reps: 6, sets: 3 }, squat: { weight: 78.5, reps: 6, sets: 4 }, deadlift: { weight: 112.5, reps: 5, sets: 3 }, ohp: { weight: 41.25, reps: 6, sets: 3 } },
  // Week 16
  { week: 16, bench: { weight: 80, reps: 5, sets: 3 }, squat: { weight: 80, reps: 6, sets: 4 }, deadlift: { weight: 115, reps: 5, sets: 3 }, ohp: { weight: 42.5, reps: 5, sets: 3 } },
  // Week 17
  { week: 17, bench: { weight: 81.25, reps: 5, sets: 3 }, squat: { weight: 82.5, reps: 5, sets: 4 }, deadlift: { weight: 117.5, reps: 5, sets: 3 }, ohp: { weight: 43.75, reps: 5, sets: 3 } },
  // Week 18 (Deload)
  { week: 18, bench: { weight: 81.25, reps: 3, sets: 2 }, squat: { weight: 82.5, reps: 3, sets: 2 }, deadlift: { weight: 117.5, reps: 3, sets: 2 }, ohp: { weight: 43.75, reps: 3, sets: 2 } },
  // Week 19
  { week: 19, bench: { weight: 82.5, reps: 5, sets: 3 }, squat: { weight: 85, reps: 5, sets: 4 }, deadlift: { weight: 120, reps: 5, sets: 3 }, ohp: { weight: 45, reps: 5, sets: 3 } },
  // Week 20
  { week: 20, bench: { weight: 83.75, reps: 5, sets: 3 }, squat: { weight: 87.5, reps: 5, sets: 4 }, deadlift: { weight: 122.5, reps: 5, sets: 3 }, ohp: { weight: 45, reps: 6, sets: 3 } },
  // Week 21
  { week: 21, bench: { weight: 85, reps: 5, sets: 3 }, squat: { weight: 90, reps: 5, sets: 4 }, deadlift: { weight: 125, reps: 5, sets: 3 }, ohp: { weight: 46.25, reps: 5, sets: 3 } },
  // Week 22 (Deload)
  { week: 22, bench: { weight: 85, reps: 3, sets: 2 }, squat: { weight: 90, reps: 3, sets: 2 }, deadlift: { weight: 125, reps: 3, sets: 2 }, ohp: { weight: 46.25, reps: 3, sets: 2 } },
]
