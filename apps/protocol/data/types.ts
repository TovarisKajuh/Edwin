export type Mode = 'home_workout' | 'travel_workout' | 'home_rest' | 'travel_rest'

export function isWorkoutMode(mode: Mode): boolean {
  return mode === 'home_workout' || mode === 'travel_workout'
}

export function isTravelMode(mode: Mode): boolean {
  return mode === 'travel_workout' || mode === 'travel_rest'
}

export interface MealVariation {
  id: string
  name: string
  slot: string
  ingredients: { name: string; amount: string; protein: number; fat: number; carbs: number }[]
  totalProtein: number
  totalFat: number
  totalCarbs: number
  totalKcal: number
  prepTime: string
  mealPrep: boolean
  travelFriendly: boolean
  zincDayCompatible: boolean
  phaseScaling?: string
  supplements: string[]
  berberine: boolean
  notes: string
}

export type Category =
  | 'training'
  | 'nutrition'
  | 'supplements'
  | 'peptides'
  | 'cardio'
  | 'skincare'
  | 'monitoring'
  | 'sleep'

export interface Phase {
  name: string
  weeks: [number, number]
  calories: number
  protein: number
  fat: number
  carbs: number
  cardioMinGym: [number, number]
  cardioMinWork: [number, number]
  psychologyBrief: string
  estimatedWeightStart: number
  estimatedBfStart: number
}

export interface Exercise {
  name: string
  startWeight: number
  sets: number
  repTarget: string
  progressionRule: string
  explanation: string
}

export interface TrainingDay {
  name: string
  dayOfWeek: number
  muscles: string
  exercises: Exercise[]
  travelExercises: Exercise[]
  deloadModifier: string
  totalSets: number
  travelSets: number
  estimatedMinutes: number
  travelMinutes: number
}

export interface DoseSchedule {
  weeks: [number, number]
  dose: string
  frequency?: string
}

export interface Compound {
  name: string
  category: 'supplement' | 'peptide' | 'medication' | 'skincare'
  doses: DoseSchedule[]
  timing: string
  withFood: boolean | 'requires_fat'
  weekdaysOnly: boolean
  loadingPhase?: { weeks: [number, number]; frequency: string }
  titration?: { week: number; dose: number }[]
  safetyNotes: string[]
  mechanism: string
  whyInProtocol: string
}

export interface MealSlot {
  name: string
  time: string
  timeTravel: string
  baseCalories: number
  baseCaloriesTravel: number
  protein: number
  proteinTravel: number
  fat: number
  fatTravel: number
  baseCarbs: number
  baseCarbsTravel: number
  notes: string
  notesTravel: string
  exampleMeals: string[]
  exampleMealsTravel: string[]
  supplementsWithMeal: string[]
  isIsotretinoinMeal: boolean
}

export interface MealDetail {
  calories: number
  protein: number
  fat: number
  carbs: number
  exampleMeals: string[]
  supplementsWithMeal: { name: string; dose: string; why: string }[]
  costNote?: string
  isIsotretinoinMeal: boolean
}

export interface TrainingDetail {
  dayName: string
  muscles: string
  exercises: {
    name: string
    weight: number
    sets: number
    reps: string
    startWeight: number
    progressionNote: string
  }[]
  totalSets: number
  estimatedMinutes: number
  deloadNote?: string
  alternativeNote?: string
}

export interface Explanation {
  what: string
  doseToday: string
  whyToday: string
  mechanism: string
  phaseNote: string
}

export interface TimeBlock {
  id: string
  time: string
  endTime: string
  title: string
  category: Category
  explanation: Explanation
  edwinNote?: string
  warning?: string
  mealDetail?: MealDetail
  trainingDetail?: TrainingDetail
}

export interface WeekProjection {
  week: number
  weight: number
  bf: number
  calories: number
  phase: string
  special: string
}

export interface StrengthProjection {
  week: number
  bench: { weight: number; reps: number; sets: number }
  squat: { weight: number; reps: number; sets: number }
  deadlift: { weight: number; reps: number; sets: number }
  ohp: { weight: number; reps: number; sets: number }
}
