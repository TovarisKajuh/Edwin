import type { Mode, MealVariation } from './types'
import { isTravelMode, isWorkoutMode } from './types'
import { PHASES } from './phases'
import { DIET_BREAK_CALORIES, REFEED_START_WEEK } from './constants'
import { getRefeedCalories } from '../lib/phase'

// ─── Meal Slot Target (per-mode template) ────────────────────────────

export interface MealSlotTarget {
  slotName: string
  time: string
  protein: number
  fat: number
  carbs: number
  kcal: number
  isIsotretinoinMeal: boolean
  isPostWorkout: boolean
  isPreWorkout: boolean
  carbScalable: boolean // true if carbs adjust per phase
  notes: string
}

// ─── Mode Templates ──────────────────────────────────────────────────

const HOME_WORKOUT_TEMPLATE: MealSlotTarget[] = [
  { slotName: 'Breakfast', time: '07:15', protein: 35, fat: 47, carbs: 8, kcal: 595, isIsotretinoinMeal: true, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'ISOTRETINOIN MEAL — must have 40-50g fat' },
  { slotName: 'Pre-Workout', time: '10:00', protein: 30, fat: 5, carbs: 45, kcal: 345, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: true, carbScalable: true, notes: 'Glucose carbs to fuel the session. Berberine 500mg.' },
  { slotName: 'Post-Workout', time: '12:15', protein: 40, fat: 5, carbs: 115, kcal: 665, isIsotretinoinMeal: false, isPostWorkout: true, isPreWorkout: false, carbScalable: true, notes: 'THE GLUT4 FEAST. Walk 5-10 min after.' },
  { slotName: 'Snack', time: '15:30', protein: 30, fat: 5, carbs: 7, kcal: 193, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'Protein + vegetables. No starchy carbs.' },
  { slotName: 'Dinner', time: '19:00', protein: 25, fat: 5, carbs: 7, kcal: 173, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'Protein + vegetables. Light.' },
  { slotName: 'Pre-Bed', time: '20:15', protein: 35, fat: 3, carbs: 0, kcal: 167, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'Casein/cottage cheese. 75 min before CJC/Ipa.' },
]

const TRAVEL_WORKOUT_TEMPLATE: MealSlotTarget[] = [
  { slotName: 'Breakfast', time: '06:30', protein: 35, fat: 47, carbs: 8, kcal: 595, isIsotretinoinMeal: true, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'ISOTRETINOIN MEAL — must have 40-50g fat' },
  { slotName: 'Work Lunch', time: '10:00', protein: 35, fat: 5, carbs: 10, kcal: 225, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'Protein-focused, low carb. Pre-packed.' },
  { slotName: 'Work Snack', time: '13:00', protein: 30, fat: 5, carbs: 7, kcal: 193, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'Protein + small sides. Pre-packed.' },
  { slotName: 'Pre-Workout', time: '16:30', protein: 25, fat: 5, carbs: 40, kcal: 305, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: true, carbScalable: true, notes: 'Glucose carbs before evening gym. Berberine 500mg.' },
  { slotName: 'Post-WO Dinner', time: '19:30', protein: 35, fat: 5, carbs: 125, kcal: 685, isIsotretinoinMeal: false, isPostWorkout: true, isPreWorkout: false, carbScalable: true, notes: 'GLUT4 FEAST shifted to evening. Walk after.' },
  { slotName: 'Pre-Bed', time: '20:15', protein: 35, fat: 3, carbs: 0, kcal: 167, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'Casein/cottage cheese. 75 min before CJC/Ipa.' },
]

const HOME_REST_TEMPLATE: MealSlotTarget[] = [
  { slotName: 'Breakfast', time: '08:00', protein: 35, fat: 47, carbs: 8, kcal: 595, isIsotretinoinMeal: true, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'ISOTRETINOIN MEAL — same fat requirement. Later start.' },
  { slotName: 'Lunch', time: '12:00', protein: 40, fat: 15, carbs: 35, kcal: 435, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: true, notes: 'Moderate carbs + added fat. Walk 10 min after.' },
  { slotName: 'Snack', time: '15:30', protein: 30, fat: 10, carbs: 10, kcal: 250, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'Protein + nuts/cheese.' },
  { slotName: 'Dinner', time: '19:00', protein: 35, fat: 15, carbs: 35, kcal: 415, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: true, notes: 'Moderate carbs + added fat. Walk 10 min after.' },
  { slotName: 'Pre-Bed', time: '20:15', protein: 35, fat: 3, carbs: 0, kcal: 167, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'Casein/cottage cheese. 75 min before CJC/Ipa.' },
]

const TRAVEL_REST_TEMPLATE: MealSlotTarget[] = [
  { slotName: 'Breakfast', time: '06:30', protein: 35, fat: 47, carbs: 8, kcal: 595, isIsotretinoinMeal: true, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'ISOTRETINOIN MEAL — must have 40-50g fat' },
  { slotName: 'Work Lunch', time: '10:00', protein: 40, fat: 12, carbs: 35, kcal: 408, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: true, notes: 'Moderate carbs for labor energy.' },
  { slotName: 'Work Snack', time: '13:00', protein: 30, fat: 8, carbs: 15, kcal: 252, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'Protein + small sides.' },
  { slotName: 'Dinner', time: '19:00', protein: 40, fat: 15, carbs: 45, kcal: 455, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: true, notes: 'Moderate carbs + added fat. Walk after.' },
  { slotName: 'Pre-Bed', time: '20:15', protein: 35, fat: 3, carbs: 0, kcal: 167, isIsotretinoinMeal: false, isPostWorkout: false, isPreWorkout: false, carbScalable: false, notes: 'Casein/cottage cheese. 75 min before CJC/Ipa.' },
]

export function getModeTemplate(mode: Mode): MealSlotTarget[] {
  switch (mode) {
    case 'home_workout':
      return HOME_WORKOUT_TEMPLATE
    case 'travel_workout':
      return TRAVEL_WORKOUT_TEMPLATE
    case 'home_rest':
      return HOME_REST_TEMPLATE
    case 'travel_rest':
      return TRAVEL_REST_TEMPLATE
  }
}

// ─── 18 Meal Variations ──────────────────────────────────────────────

export const BREAKFAST_VARIATIONS: MealVariation[] = [
  {
    id: 'B1',
    name: 'The Salmon Slab',
    slot: 'breakfast',
    ingredients: [
      { name: 'Smoked salmon', amount: '150g', protein: 30, fat: 6, carbs: 0 },
      { name: 'Cream cheese', amount: '50g', protein: 4, fat: 17, carbs: 2 },
      { name: 'Avocado', amount: '75g flesh', protein: 2, fat: 11, carbs: 2 },
      { name: 'Olive oil drizzle', amount: '15ml', protein: 0, fat: 14, carbs: 0 },
      { name: 'Rice cake', amount: '1', protein: 1, fat: 0, carbs: 7 },
    ],
    totalProtein: 37, totalFat: 48, totalCarbs: 11, totalKcal: 613,
    prepTime: '3 min', mealPrep: false, travelFriendly: true,
    zincDayCompatible: true,
    supplements: ['Isotretinoin 40mg', 'Omega-3 4g', 'Creatine 5g', 'NAC 600mg', 'HMB 1g'],
    berberine: false, notes: 'Zinc-day compatible (no nuts, no phytates). Lay salmon on rice cake, spread cream cheese, fan avocado.',
  },
  {
    id: 'B2',
    name: 'The Quark Bomb',
    slot: 'breakfast',
    ingredients: [
      { name: 'Full-fat quark', amount: '200g', protein: 28, fat: 10, carbs: 8 },
      { name: 'Peanut butter', amount: '30g', protein: 8, fat: 15, carbs: 4 },
      { name: 'Walnuts', amount: '25g', protein: 4, fat: 16, carbs: 2 },
      { name: 'Olive oil', amount: '5ml', protein: 0, fat: 5, carbs: 0 },
    ],
    totalProtein: 40, totalFat: 46, totalCarbs: 14, totalKcal: 630,
    prepTime: '2 min', mealPrep: false, travelFriendly: true,
    zincDayCompatible: false,
    supplements: ['Isotretinoin 40mg', 'Omega-3 4g', 'Creatine 5g', 'NAC 600mg', 'HMB 1g'],
    berberine: false, notes: 'NOT zinc-day compatible (walnuts + peanut butter = phytates). Mix PB and oil into quark, top with crushed walnuts.',
  },
  {
    id: 'B3',
    name: 'The Cheese Plate',
    slot: 'breakfast',
    ingredients: [
      { name: 'Cottage cheese (full-fat)', amount: '200g', protein: 24, fat: 8, carbs: 6 },
      { name: 'Gouda / Emmental', amount: '50g', protein: 13, fat: 15, carbs: 0 },
      { name: 'Avocado', amount: '75g flesh', protein: 2, fat: 11, carbs: 2 },
      { name: 'Olive oil', amount: '15ml', protein: 0, fat: 14, carbs: 0 },
    ],
    totalProtein: 39, totalFat: 48, totalCarbs: 8, totalKcal: 616,
    prepTime: '3 min', mealPrep: false, travelFriendly: true,
    zincDayCompatible: true,
    supplements: ['Isotretinoin 40mg', 'Omega-3 4g', 'Creatine 5g', 'NAC 600mg', 'HMB 1g'],
    berberine: false, notes: 'Zinc-day compatible (cheese + avocado + olive oil). Spoon cottage cheese, slice cheese and avocado alongside.',
  },
]

export const LUNCH_VARIATIONS: MealVariation[] = [
  {
    id: 'L1',
    name: 'Classic Chicken Rice',
    slot: 'lunch',
    ingredients: [
      { name: 'Chicken breast (cooked)', amount: '100g', protein: 31, fat: 4, carbs: 0 },
      { name: 'White rice (cooked)', amount: '160g', protein: 4, fat: 0, carbs: 45 },
      { name: 'Steamed broccoli', amount: '80g', protein: 2, fat: 0, carbs: 4 },
    ],
    totalProtein: 37, totalFat: 4, totalCarbs: 49, totalKcal: 381,
    prepTime: '5 min', mealPrep: true, travelFriendly: true,
    zincDayCompatible: true,
    phaseScaling: 'Reduce rice: Phase 3: 130g (36C), Phase 5: 100g (28C)',
    supplements: [], berberine: true,
    notes: 'From meal prep. Microwave 2 min or eat cold.',
  },
  {
    id: 'L2',
    name: 'Turkey Wrap',
    slot: 'lunch',
    ingredients: [
      { name: 'Turkey breast (cooked, sliced)', amount: '120g', protein: 35, fat: 1, carbs: 0 },
      { name: 'Large tortilla wrap', amount: '1 (65g)', protein: 6, fat: 4, carbs: 33 },
      { name: 'White rice (cooked, on side)', amount: '40g', protein: 1, fat: 0, carbs: 11 },
      { name: 'Lettuce + tomato', amount: '50g', protein: 1, fat: 0, carbs: 2 },
    ],
    totalProtein: 43, totalFat: 5, totalCarbs: 46, totalKcal: 401,
    prepTime: '5 min', mealPrep: false, travelFriendly: true,
    zincDayCompatible: true,
    phaseScaling: 'Phase 3: wrap only (33C). Phase 5: half wrap (~20C)',
    supplements: [], berberine: true,
    notes: 'Lay turkey slices on wrap, add lettuce and tomato, roll tight. Rice on the side (home only).',
  },
  {
    id: 'L3',
    name: 'Tuna Rice Bowl',
    slot: 'lunch',
    ingredients: [
      { name: 'Canned tuna in water (drained)', amount: '1 can (130g)', protein: 34, fat: 1, carbs: 0 },
      { name: 'White rice (cooked)', amount: '160g', protein: 4, fat: 0, carbs: 45 },
      { name: 'Soy sauce', amount: '10ml', protein: 1, fat: 0, carbs: 1 },
      { name: 'Cucumber slices', amount: '60g', protein: 0, fat: 0, carbs: 2 },
    ],
    totalProtein: 39, totalFat: 1, totalCarbs: 48, totalKcal: 357,
    prepTime: '3 min', mealPrep: false, travelFriendly: true,
    zincDayCompatible: true,
    phaseScaling: 'Reduce rice: Phase 3: 130g (36C), Phase 5: 100g (28C)',
    supplements: [], berberine: true,
    notes: 'Zero prep. Open can, drain, dump on rice, add soy sauce. Best travel meal.',
  },
  {
    id: 'L4',
    name: 'Beef & Potato',
    slot: 'lunch',
    ingredients: [
      { name: 'Lean beef mince 5% (cooked)', amount: '120g', protein: 25, fat: 6, carbs: 0 },
      { name: 'Boiled potato', amount: '260g', protein: 4, fat: 0, carbs: 44 },
      { name: 'Green beans (steamed)', amount: '80g', protein: 2, fat: 0, carbs: 4 },
    ],
    totalProtein: 31, totalFat: 6, totalCarbs: 48, totalKcal: 374,
    prepTime: '5 min', mealPrep: true, travelFriendly: true,
    zincDayCompatible: true,
    phaseScaling: 'Reduce potato: Phase 3: 200g (34C), Phase 5: 160g (27C)',
    supplements: [], berberine: true,
    notes: 'Season beef with paprika, garlic powder, salt. Batch cook Sunday.',
  },
]

export const DINNER_VARIATIONS: MealVariation[] = [
  {
    id: 'D1',
    name: 'Rice Mountain',
    slot: 'dinner',
    ingredients: [
      { name: 'Chicken breast (cooked)', amount: '130g', protein: 40, fat: 5, carbs: 0 },
      { name: 'White rice (cooked)', amount: '310g', protein: 8, fat: 1, carbs: 87 },
      { name: 'Banana', amount: '1 medium (120g)', protein: 1, fat: 0, carbs: 27 },
      { name: 'Steamed vegetables', amount: '80g', protein: 2, fat: 0, carbs: 4 },
    ],
    totalProtein: 51, totalFat: 6, totalCarbs: 118, totalKcal: 734,
    prepTime: '5 min', mealPrep: true, travelFriendly: true,
    zincDayCompatible: true,
    phaseScaling: 'Reduce rice: Phase 3: 230g (91C). Phase 5: 170g (75C). Keep banana.',
    supplements: ['HMB 1g'], berberine: true,
    notes: 'The default post-WO meal. Grab meal-prep chicken, microwave with rice, peel banana.',
  },
  {
    id: 'D2',
    name: 'Pasta Bolognese',
    slot: 'dinner',
    ingredients: [
      { name: 'Lean beef mince 5% (cooked)', amount: '150g', protein: 32, fat: 8, carbs: 0 },
      { name: 'Pasta (cooked)', amount: '310g', protein: 16, fat: 3, carbs: 78 },
      { name: 'Tomato passata', amount: '100g', protein: 1, fat: 0, carbs: 6 },
      { name: 'Banana', amount: '1 medium (120g)', protein: 1, fat: 0, carbs: 27 },
    ],
    totalProtein: 50, totalFat: 11, totalCarbs: 111, totalKcal: 743,
    prepTime: '15 min', mealPrep: true, travelFriendly: false,
    zincDayCompatible: true,
    phaseScaling: 'Reduce pasta: Phase 3: 230g (93C). Phase 5: 170g (78C). Keep banana.',
    supplements: ['HMB 1g'], berberine: true,
    notes: 'Home post-WO only. Cook pasta (10 min), heat pre-cooked beef mince with passata.',
  },
  {
    id: 'D3',
    name: 'Sweet Potato Chicken',
    slot: 'dinner',
    ingredients: [
      { name: 'Chicken breast (cooked)', amount: '130g', protein: 40, fat: 5, carbs: 0 },
      { name: 'Sweet potato (baked)', amount: '350g', protein: 5, fat: 0, carbs: 70 },
      { name: 'White rice (cooked)', amount: '50g', protein: 1, fat: 0, carbs: 14 },
      { name: 'Banana', amount: '1 medium (120g)', protein: 1, fat: 0, carbs: 27 },
    ],
    totalProtein: 47, totalFat: 5, totalCarbs: 111, totalKcal: 681,
    prepTime: '5 min', mealPrep: true, travelFriendly: true,
    zincDayCompatible: true,
    phaseScaling: 'Phase 3: 250g SP (50C) + 50g rice (14C) + banana = 91C. Phase 5: 170g SP (34C) + 40g rice + banana = 72C.',
    supplements: ['HMB 1g'], berberine: true,
    notes: 'Bake sweet potatoes in batch on Sunday (200C, 45 min). Reheat with chicken.',
  },
  {
    id: 'D4',
    name: 'Chicken Stir-Fry Rice',
    slot: 'dinner',
    ingredients: [
      { name: 'Chicken breast (cooked)', amount: '130g', protein: 40, fat: 5, carbs: 0 },
      { name: 'White rice (cooked)', amount: '280g', protein: 8, fat: 1, carbs: 78 },
      { name: 'Stir-fry veg (broccoli, pepper, carrot)', amount: '120g', protein: 3, fat: 0, carbs: 8 },
      { name: 'Soy sauce', amount: '15ml', protein: 1, fat: 0, carbs: 1 },
      { name: 'Banana', amount: '1 medium (120g)', protein: 1, fat: 0, carbs: 27 },
    ],
    totalProtein: 53, totalFat: 6, totalCarbs: 114, totalKcal: 726,
    prepTime: '10 min', mealPrep: true, travelFriendly: true,
    zincDayCompatible: true,
    phaseScaling: 'Reduce rice: Phase 3: 200g (93C). Phase 5: 140g (76C). Keep banana.',
    supplements: ['HMB 1g'], berberine: true,
    notes: 'Slice pre-cooked chicken. Stir-fry veg with soy sauce (3-4 min). Serve over rice.',
  },
  {
    id: 'D5',
    name: 'Potato & Turkey',
    slot: 'dinner',
    ingredients: [
      { name: 'Turkey breast (cooked)', amount: '140g', protein: 41, fat: 1, carbs: 0 },
      { name: 'Boiled potato', amount: '500g', protein: 9, fat: 1, carbs: 85 },
      { name: 'Banana', amount: '1 medium (120g)', protein: 1, fat: 0, carbs: 27 },
      { name: 'Olive oil', amount: '5ml', protein: 0, fat: 5, carbs: 0 },
      { name: 'Side salad', amount: '50g', protein: 1, fat: 0, carbs: 2 },
    ],
    totalProtein: 52, totalFat: 7, totalCarbs: 114, totalKcal: 731,
    prepTime: '5 min', mealPrep: true, travelFriendly: true,
    zincDayCompatible: true,
    phaseScaling: 'Reduce potato: Phase 3: 380g (94C). Phase 5: 280g (77C). Keep banana.',
    supplements: ['HMB 1g'], berberine: true,
    notes: 'Boil potatoes in batch on Sunday (20 min). Reheat with turkey. Drizzle olive oil.',
  },
]

export const SNACK_VARIATIONS: MealVariation[] = [
  {
    id: 'S1',
    name: 'Cottage Cheese & Cucumber',
    slot: 'snack',
    ingredients: [
      { name: 'Cottage cheese (low-fat)', amount: '250g', protein: 30, fat: 4, carbs: 8 },
      { name: 'Cucumber (sliced)', amount: '100g', protein: 1, fat: 0, carbs: 2 },
    ],
    totalProtein: 31, totalFat: 4, totalCarbs: 10, totalKcal: 198,
    prepTime: '1 min', mealPrep: false, travelFriendly: true,
    zincDayCompatible: true,
    supplements: ['HMB 1g'], berberine: false,
    notes: 'Open tub. Slice cucumber. Eat.',
  },
  {
    id: 'S2',
    name: 'Tuna & Rice Cakes',
    slot: 'snack',
    ingredients: [
      { name: 'Canned tuna in water (drained)', amount: '1 can (130g)', protein: 34, fat: 1, carbs: 0 },
      { name: 'Rice cake', amount: '1', protein: 1, fat: 0, carbs: 7 },
      { name: 'Cucumber', amount: '60g', protein: 0, fat: 0, carbs: 1 },
    ],
    totalProtein: 35, totalFat: 1, totalCarbs: 8, totalKcal: 181,
    prepTime: '2 min', mealPrep: false, travelFriendly: true,
    zincDayCompatible: true,
    supplements: ['HMB 1g'], berberine: false,
    notes: 'Best travel snack. No fridge, no prep. Open can, pile on rice cake.',
  },
  {
    id: 'S3',
    name: 'Chicken & Veggies',
    slot: 'snack',
    ingredients: [
      { name: 'Chicken breast (cooked)', amount: '100g', protein: 31, fat: 4, carbs: 0 },
      { name: 'Green beans (steamed)', amount: '80g', protein: 2, fat: 0, carbs: 4 },
      { name: 'Cherry tomatoes', amount: '50g', protein: 1, fat: 0, carbs: 2 },
    ],
    totalProtein: 34, totalFat: 4, totalCarbs: 6, totalKcal: 196,
    prepTime: '0 min', mealPrep: true, travelFriendly: true,
    zincDayCompatible: true,
    supplements: ['HMB 1g'], berberine: false,
    notes: 'From meal prep. Grab container, eat cold or microwave.',
  },
]

export const PREBED_VARIATIONS: MealVariation[] = [
  {
    id: 'PB1',
    name: 'Cottage Cheese Straight',
    slot: 'pre_bed',
    ingredients: [
      { name: 'Cottage cheese (low-fat)', amount: '280g', protein: 34, fat: 4, carbs: 8 },
      { name: 'Cinnamon', amount: 'pinch', protein: 0, fat: 0, carbs: 0 },
    ],
    totalProtein: 34, totalFat: 4, totalCarbs: 8, totalKcal: 204,
    prepTime: '1 min', mealPrep: false, travelFriendly: true,
    zincDayCompatible: true,
    supplements: ['Magnesium Glycinate 400mg', 'Glycine 3g'], berberine: false,
    notes: 'Spoon from tub. Sprinkle cinnamon. Lactose carbs are negligible for insulin.',
  },
  {
    id: 'PB2',
    name: 'The Quark Bowl',
    slot: 'pre_bed',
    ingredients: [
      { name: 'Quark (low-fat)', amount: '250g', protein: 35, fat: 1, carbs: 10 },
      { name: 'Cinnamon', amount: 'pinch', protein: 0, fat: 0, carbs: 0 },
    ],
    totalProtein: 35, totalFat: 1, totalCarbs: 10, totalKcal: 189,
    prepTime: '1 min', mealPrep: false, travelFriendly: true,
    zincDayCompatible: true,
    supplements: ['Magnesium Glycinate 400mg', 'Glycine 3g'], berberine: false,
    notes: 'Eat from tub with a spoon. Add cinnamon if you want.',
  },
  {
    id: 'PB3',
    name: 'Casein Shake',
    slot: 'pre_bed',
    ingredients: [
      { name: 'Casein powder', amount: '40g (1 scoop)', protein: 33, fat: 1, carbs: 3 },
      { name: 'Water', amount: '300ml', protein: 0, fat: 0, carbs: 0 },
    ],
    totalProtein: 33, totalFat: 1, totalCarbs: 3, totalKcal: 153,
    prepTime: '30 sec', mealPrep: false, travelFriendly: true,
    zincDayCompatible: true,
    supplements: ['Magnesium Glycinate 400mg', 'Glycine 3g'], berberine: false,
    notes: 'Fastest option. Scoop, shake, drink. No dishes.',
  },
]

// ─── All Variations Indexed ──────────────────────────────────────────

export const ALL_VARIATIONS: Record<string, MealVariation[]> = {
  breakfast: BREAKFAST_VARIATIONS,
  lunch: LUNCH_VARIATIONS,
  dinner: DINNER_VARIATIONS,
  snack: SNACK_VARIATIONS,
  pre_bed: PREBED_VARIATIONS,
}

// ─── Meal Selection ──────────────────────────────────────────────────

/**
 * Select a meal variation for a given slot based on rotation.
 * protocolDay is 1-indexed. zincDay = true on odd protocol days.
 */
export function selectMealVariation(slot: string, protocolDay: number, zincDay: boolean): MealVariation {
  const variations = ALL_VARIATIONS[slot]
  if (!variations || variations.length === 0) {
    throw new Error(`No variations for slot: ${slot}`)
  }

  if (slot === 'breakfast') {
    // On zinc days, filter to zinc-compatible breakfasts only (B1 or B3)
    const compatible = zincDay ? variations.filter(v => v.zincDayCompatible) : variations
    const pool = compatible.length > 0 ? compatible : variations
    return pool[(protocolDay - 1) % pool.length]
  }

  return variations[(protocolDay - 1) % variations.length]
}

// ─── Macro Calculation ───────────────────────────────────────────────

function getPhaseForWeek(week: number) {
  return PHASES.find((p) => week >= p.weeks[0] && week <= p.weeks[1]) ?? PHASES[0]
}

/**
 * Get adjusted macros for a meal slot, accounting for phase carb scaling.
 *
 * For workout modes: the post-WO meal carbs scale per phase.
 *   Phase 1: 115C (home) / 125C (travel)
 *   Phases 2-5: reduce by 10C per phase
 * Pre-WO also scales: 45C (home) / 40C (travel) in Phase 1,
 *   reduce proportionally.
 *
 * For rest modes: lunch and dinner carbs scale per phase.
 */
export function getMealMacros(
  slotTarget: MealSlotTarget,
  week: number,
  mode: Mode,
  isRefeed: boolean,
  isDietBreak: boolean,
): { calories: number; protein: number; fat: number; carbs: number } {
  const phase = getPhaseForWeek(week)
  let { protein, fat, carbs } = slotTarget

  if (slotTarget.carbScalable) {
    // Phase 1 total workout carbs = 182 (home) or 190 (travel)
    // Phase 1 total rest carbs = 88 (home) or 105 (travel)
    // Each subsequent phase reduces total carbs (from phases.ts)
    // We distribute the reduction proportionally to scalable slots

    const template = getModeTemplate(mode)
    const totalScalableCarbs = template
      .filter(s => s.carbScalable)
      .reduce((sum, s) => sum + s.carbs, 0)
    const totalTemplateCarbs = template.reduce((sum, s) => sum + s.carbs, 0)

    // Phase 1 reference carbs per mode
    const phase1Carbs = isWorkoutMode(mode)
      ? (isTravelMode(mode) ? 190 : 182)
      : (isTravelMode(mode) ? 105 : 88)

    // Target carbs for current phase — use phase.carbs as the overall target for workout modes
    // For rest modes, scale proportionally from phase 1
    let targetTotalCarbs: number
    if (isWorkoutMode(mode)) {
      // Workout mode: phase.carbs is the target (185, 165, 150, 130, 120)
      // But that's the home_workout base. Travel gets a small bump.
      targetTotalCarbs = isTravelMode(mode) ? phase.carbs + 8 : phase.carbs
    } else {
      // Rest mode: scale proportionally to the phase carb reduction
      const ratio = phase.carbs / 185 // 185 = Phase 1 home workout carbs
      targetTotalCarbs = Math.round(phase1Carbs * ratio)
    }

    // Non-scalable carbs stay fixed
    const fixedCarbs = totalTemplateCarbs - totalScalableCarbs
    const availableScalableCarbs = Math.max(0, targetTotalCarbs - fixedCarbs)

    // This slot's share of the scalable carbs
    const slotShare = slotTarget.carbs / totalScalableCarbs
    carbs = Math.round(availableScalableCarbs * slotShare)
  }

  // Refeed: add extra carbs to scalable slots
  if (isRefeed && week >= REFEED_START_WEEK && slotTarget.carbScalable) {
    const refeedTarget = getRefeedCalories(week)
    const currentPhaseCals = phase.calories
    const extraCalories = refeedTarget - currentPhaseCals
    const extraCarbsTotal = extraCalories / 4 // all extra from carbs
    const template = getModeTemplate(mode)
    const scalableSlots = template.filter(s => s.carbScalable).length
    carbs += Math.round(extraCarbsTotal / scalableSlots / 4)
  }

  // Diet break: add extra carbs
  if (isDietBreak && slotTarget.carbScalable) {
    const dietBreakCals = DIET_BREAK_CALORIES[week]
    if (dietBreakCals) {
      const extraCalories = dietBreakCals - phase.calories
      const extraCarbsTotal = extraCalories / 4
      const template = getModeTemplate(mode)
      const scalableSlots = template.filter(s => s.carbScalable).length
      carbs += Math.round(extraCarbsTotal / scalableSlots / 4)
    }
  }

  const calories = protein * 4 + fat * 9 + carbs * 4
  return { calories, protein, fat, carbs }
}

// ─── Weekly Cost Note ────────────────────────────────────────────────

export function getWeeklyCostNote(week: number): string {
  const phase = getPhaseForWeek(week)
  const phaseIndex = PHASES.indexOf(phase)
  if (phaseIndex <= 2) {
    return `This week's meal prep grocery list: ~\u20AC50. That's what you used to spend on 4 Wolt orders.`
  }
  return `This week's meal prep grocery list: ~\u20AC46. That's what you used to spend on 4 Wolt orders.`
}
