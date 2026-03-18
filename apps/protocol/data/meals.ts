import type { MealSlot, Mode } from './types'
import { PHASES } from './phases'
import { DIET_BREAK_CALORIES, REFEED_START_WEEK } from './constants'
import { getRefeedCalories } from '../lib/phase'

export const MEAL_SLOTS_HOME: MealSlot[] = [
  {
    name: 'Meal 1',
    time: '07:15',
    timeTravel: '06:30',
    baseCalories: 500,
    baseCaloriesTravel: 550,
    protein: 40,
    proteinTravel: 45,
    fat: 25,
    fatTravel: 28,
    baseCarbs: 35,
    baseCarbsTravel: 35,
    notes: 'ISOTRETINOIN MEAL — must have 40-50g fat',
    notesTravel: 'Larger — fuel for labor. ISOTRETINOIN MEAL',
    exampleMeals: [
      '3 whole eggs scrambled in butter + 100g smoked salmon + 1 slice sourdough + \u00BD avocado',
      '200g full-fat Greek yogurt + 30g whey + 25g almonds + 80g berries',
    ],
    exampleMealsTravel: [
      '4 eggs scrambled + 2 slices sourdough + 30g cheese + handful spinach',
      'Full-fat Greek yogurt bowl + nuts + berries + whey',
    ],
    supplementsWithMeal: [
      'Isotretinoin 40mg',
      'Omega-3 4g',
      'Enclomiphene 12.5mg (Mon-Fri)',
      'Berberine 500mg',
      'NAC 600mg',
      'Creatine 5g',
      'HMB 1g',
      'Zinc 50mg (every other day)',
    ],
    isIsotretinoinMeal: true,
  },
  {
    name: 'Meal 2',
    time: '10:00',
    timeTravel: '10:00',
    baseCalories: 400,
    baseCaloriesTravel: 450,
    protein: 40,
    proteinTravel: 40,
    fat: 12,
    fatTravel: 12,
    baseCarbs: 35,
    baseCarbsTravel: 40,
    notes: 'Pre-training',
    notesTravel: 'On-site, pre-packed',
    exampleMeals: [
      '200g chicken breast + 150g rice + mixed greens + olive oil drizzle',
      '200g turkey breast + 150g sweet potato + steamed vegetables',
    ],
    exampleMealsTravel: [
      '200g chicken breast + rice + vegetables in container',
      'Pre-made wrap with turkey, cheese, lettuce',
    ],
    supplementsWithMeal: [],
    isIsotretinoinMeal: false,
  },
  {
    name: 'Meal 3',
    time: '12:15',
    timeTravel: '13:00',
    baseCalories: 450,
    baseCaloriesTravel: 400,
    protein: 45,
    proteinTravel: 40,
    fat: 10,
    fatTravel: 10,
    baseCarbs: 45,
    baseCarbsTravel: 35,
    notes: 'Post-training',
    notesTravel: 'On-site, pre-packed',
    exampleMeals: [
      '200g lean ground beef + 200g sweet potato + steamed broccoli',
      '250g chicken thigh + 180g rice + vegetables',
    ],
    exampleMealsTravel: [
      '2 cans tuna + 2 wraps + mixed greens',
      'Protein shake + banana + handful nuts',
    ],
    supplementsWithMeal: ['HMB 1g', 'Berberine 500mg'],
    isIsotretinoinMeal: false,
  },
  {
    name: 'Meal 4',
    time: '15:30',
    timeTravel: '15:30',
    baseCalories: 350,
    baseCaloriesTravel: 350,
    protein: 35,
    proteinTravel: 35,
    fat: 10,
    fatTravel: 10,
    baseCarbs: 25,
    baseCarbsTravel: 25,
    notes: 'Afternoon',
    notesTravel: 'On-site or post-work',
    exampleMeals: [
      '1 can tuna + 2 rice cakes + 1 tbsp mayo + cucumber',
      '175g cottage cheese + 100g berries + 15g nuts',
    ],
    exampleMealsTravel: [
      'Protein bar (check macros)',
      'Pre-made cottage cheese container + fruit',
    ],
    supplementsWithMeal: ['HMB 1g', 'Berberine 500mg'],
    isIsotretinoinMeal: false,
  },
  {
    name: 'Meal 5',
    time: '19:00',
    timeTravel: '19:00',
    baseCalories: 400,
    baseCaloriesTravel: 450,
    protein: 40,
    proteinTravel: 40,
    fat: 12,
    fatTravel: 12,
    baseCarbs: 35,
    baseCarbsTravel: 40,
    notes: 'Dinner',
    notesTravel: 'Dinner at home',
    exampleMeals: [
      '200g salmon fillet + 150g roasted potatoes + asparagus',
      '200g chicken breast + 60g dry whole wheat pasta + marinara',
    ],
    exampleMealsTravel: [
      '200g salmon + 150g roasted potatoes + asparagus',
      'Chicken stir-fry with rice and vegetables',
    ],
    supplementsWithMeal: ['NAC 600mg'],
    isIsotretinoinMeal: false,
  },
  {
    name: 'Pre-bed',
    time: '21:00',
    timeTravel: '21:00',
    baseCalories: 200,
    baseCaloriesTravel: 200,
    protein: 35,
    proteinTravel: 35,
    fat: 3,
    fatTravel: 3,
    baseCarbs: 5,
    baseCarbsTravel: 5,
    notes: 'Optional — casein/yogurt',
    notesTravel: 'Casein/yogurt',
    exampleMeals: [
      '30g casein shake in 250ml water',
      '200g fat-free Greek yogurt with cinnamon',
    ],
    exampleMealsTravel: [
      '30g casein shake in water',
      '200g fat-free Greek yogurt',
    ],
    supplementsWithMeal: [],
    isIsotretinoinMeal: false,
  },
]

export const MEAL_SLOTS_TRAVEL: MealSlot[] = MEAL_SLOTS_HOME.map((slot) => ({
  ...slot,
  time: slot.timeTravel,
  baseCalories: slot.baseCaloriesTravel,
  protein: slot.proteinTravel,
  fat: slot.fatTravel,
  baseCarbs: slot.baseCarbsTravel,
  notes: slot.notesTravel,
  exampleMeals: slot.exampleMealsTravel,
}))

function getPhaseForWeek(week: number) {
  return PHASES.find((p) => week >= p.weeks[0] && week <= p.weeks[1]) ?? PHASES[0]
}

/** Ramp-up baseline carbs */
const HOME_BASELINE_CARBS = 185
const TRAVEL_BASELINE_CARBS = 195

export function getMealMacros(
  slotIndex: number,
  week: number,
  mode: Mode,
  isRefeed: boolean,
  isDietBreak: boolean
): { calories: number; protein: number; fat: number; carbs: number } {
  const slots = mode === 'home' ? MEAL_SLOTS_HOME : MEAL_SLOTS_TRAVEL
  const slot = slots[slotIndex]
  if (!slot) throw new Error(`Invalid slot index: ${slotIndex}`)

  const baseCarbs = mode === 'home' ? slot.baseCarbs : slot.baseCarbsTravel
  const baseProtein = mode === 'home' ? slot.protein : slot.proteinTravel
  const baseFat = mode === 'home' ? slot.fat : slot.fatTravel

  const phase = getPhaseForWeek(week)
  const baselineCarbs = mode === 'home' ? HOME_BASELINE_CARBS : TRAVEL_BASELINE_CARBS
  const carbReduction = baselineCarbs - phase.carbs

  let carbs = baseCarbs
  // Only adjust carbs for meals 2-5 (slotIndex 1-4), not meal 1 or pre-bed
  if (slotIndex >= 1 && slotIndex <= 4) {
    carbs = Math.max(0, baseCarbs - carbReduction / 4)
  }

  let protein = baseProtein
  let fat = baseFat

  // Refeed: add extra carbs to reach maintenance target (distributed across meals 2-5)
  if (isRefeed && week >= REFEED_START_WEEK && slotIndex >= 1 && slotIndex <= 4) {
    const refeedTarget = getRefeedCalories(week)
    const extraCalories = refeedTarget - phase.calories
    const extraCarbsTotal = extraCalories / 4 // all extra from carbs (g)
    carbs += extraCarbsTotal / 4 // split across 4 meals
  }

  // Diet break: add extra carbs to reach maintenance target
  if (isDietBreak && slotIndex >= 1 && slotIndex <= 4) {
    const dietBreakCals = DIET_BREAK_CALORIES[week]
    if (dietBreakCals) {
      const extraCalories = dietBreakCals - phase.calories
      const extraCarbsTotal = extraCalories / 4 // all from carbs
      carbs += extraCarbsTotal / 4 // split across 4 meals
    }
  }

  carbs = Math.round(carbs)
  const calories = protein * 4 + fat * 9 + carbs * 4

  return { calories, protein, fat, carbs }
}

export function getWeeklyCostNote(week: number): string {
  const phase = getPhaseForWeek(week)
  const phaseIndex = PHASES.indexOf(phase)

  // Deterministic cost based on phase (no Math.random in pure functions)
  if (phaseIndex <= 2) {
    // Phases 1-3: more carbs = slightly more expensive (~€50/week)
    return `This week's meal prep grocery list: ~\u20AC50. That's what you used to spend on 4 Wolt orders.`
  }
  // Phases 4-5: fewer carbs = slightly cheaper (~€46/week)
  return `This week's meal prep grocery list: ~\u20AC46. That's what you used to spend on 4 Wolt orders.`
}
