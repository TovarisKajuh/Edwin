import type { TrainingDay } from './types'

export const TRAINING_DAYS: TrainingDay[] = [
  // Monday — Push (chest, shoulders, triceps)
  {
    name: 'Push A',
    dayOfWeek: 1,
    muscles: 'chest, shoulders, triceps',
    totalSets: 19,
    travelSets: 12,
    estimatedMinutes: 60,
    travelMinutes: 35,
    deloadModifier: 'Half sets, same weight',
    exercises: [
      {
        name: 'Barbell Bench Press',
        startWeight: 60,
        sets: 3,
        repTarget: '3x6',
        progressionRule: '+2.5kg when 3x8 achieved',
        explanation:
          'Primary horizontal press. Targets chest, front delts, and triceps. The king of upper body strength.',
      },
      {
        name: 'Seated DB Shoulder Press',
        startWeight: 22,
        sets: 3,
        repTarget: '3x8',
        progressionRule: '+2kg DBs when 3x10 achieved',
        explanation:
          'Overhead pressing for anterior and lateral deltoids. Seated to isolate shoulders.',
      },
      {
        name: 'Incline DB Press',
        startWeight: 26,
        sets: 3,
        repTarget: '3x8',
        progressionRule: '+2kg DBs when 3x10 achieved',
        explanation:
          'Upper chest emphasis at 30-45 degree incline. Fills the upper pec shelf.',
      },
      {
        name: 'Cable Lateral Raise',
        startWeight: 7,
        sets: 3,
        repTarget: '3x15',
        progressionRule: '+1.25kg when 3x20 achieved',
        explanation:
          'Isolates lateral deltoid for shoulder width. Cable provides constant tension.',
      },
      {
        name: 'Rope Tricep Pushdown',
        startWeight: 25,
        sets: 3,
        repTarget: '3x10',
        progressionRule: '+2.5kg when 3x12 achieved',
        explanation:
          'Tricep isolation. Rope allows wrist rotation for full contraction.',
      },
      {
        name: 'Overhead Cable Extension',
        startWeight: 17.5,
        sets: 2,
        repTarget: '2x10',
        progressionRule: '+2.5kg when 2x12 achieved',
        explanation:
          'Long head tricep emphasis in stretched position.',
      },
      {
        name: 'Plate Neck Curl (supine)',
        startWeight: 2.5,
        sets: 2,
        repTarget: '2x20',
        progressionRule: '+2.5kg when 2x30 achieved',
        explanation:
          'Direct neck flexor training. Start light — neck DOMS can mimic sore throat.',
      },
    ],
    travelExercises: [
      {
        name: 'Push-ups (bodyweight variations)',
        startWeight: 0,
        sets: 4,
        repTarget: '4xmax',
        progressionRule: 'Progress from standard to deficit to weighted',
        explanation:
          'No bench available. Push-up variations target the same muscles.',
      },
      {
        name: 'DB Shoulder Press (standing)',
        startWeight: 0,
        sets: 3,
        repTarget: '3x10',
        progressionRule: 'Increase reps, then add weight',
        explanation: 'Standing with whatever dumbbells available.',
      },
      {
        name: 'DB Lateral Raise',
        startWeight: 0,
        sets: 3,
        repTarget: '3x15',
        progressionRule: 'Increase reps',
        explanation: 'Dumbbells for lateral delts.',
      },
      {
        name: 'Diamond Push-ups or Band Pushdowns',
        startWeight: 0,
        sets: 2,
        repTarget: '2xmax',
        progressionRule: 'Progress reps',
        explanation: 'Tricep isolation with bodyweight.',
      },
    ],
  },

  // Tuesday — Pull (back, biceps, rear delts)
  {
    name: 'Pull',
    dayOfWeek: 2,
    muscles: 'back, biceps, rear delts',
    totalSets: 21,
    travelSets: 13,
    estimatedMinutes: 65,
    travelMinutes: 40,
    deloadModifier: 'Half sets, same weight',
    exercises: [
      {
        name: 'Conventional Deadlift',
        startWeight: 90,
        sets: 3,
        repTarget: '3x5',
        progressionRule: '+2.5kg/week on top set',
        explanation:
          'Full posterior chain compound. 1 top set + 2 backoff sets at 80kg.',
      },
      {
        name: 'Pull-ups',
        startWeight: 0,
        sets: 4,
        repTarget: '4xmax',
        progressionRule: 'Volume-based progression (see pull-up plan)',
        explanation:
          'The single best back exercise. Getting lighter = free progressive overload.',
      },
      {
        name: 'Barbell Row',
        startWeight: 60,
        sets: 3,
        repTarget: '3x8',
        progressionRule: '+2.5kg when 3x10 achieved',
        explanation:
          'Horizontal pull for mid-back thickness. Targets lats, rhomboids, rear delts.',
      },
      {
        name: 'Wide-Grip Lat Pulldown',
        startWeight: 55,
        sets: 3,
        repTarget: '3x10',
        progressionRule: '+2.5kg when 3x12 achieved',
        explanation:
          'Vertical pull for lat width. Wide grip emphasizes the stretch.',
      },
      {
        name: 'Cable Face Pull',
        startWeight: 15,
        sets: 3,
        repTarget: '3x15',
        progressionRule: '+2.5kg when 3x20 achieved',
        explanation:
          'Rear delt and external rotator work. Essential for shoulder health and posture.',
      },
      {
        name: 'EZ-Bar Curl',
        startWeight: 25,
        sets: 3,
        repTarget: '3x10',
        progressionRule: '+2.5kg when 3x12 achieved',
        explanation:
          'Bicep mass builder. EZ-bar reduces wrist strain.',
      },
      {
        name: 'DB Hammer Curl',
        startWeight: 12,
        sets: 2,
        repTarget: '2x10',
        progressionRule: '+2kg when 2x12 achieved',
        explanation:
          'Brachialis and forearm emphasis. Neutral grip.',
      },
    ],
    travelExercises: [
      {
        name: 'DB Romanian Deadlift',
        startWeight: 0,
        sets: 3,
        repTarget: '3x8',
        progressionRule: 'Increase reps, then weight',
        explanation: 'Posterior chain without a barbell.',
      },
      {
        name: 'Doorframe Pull-ups or Band Rows',
        startWeight: 0,
        sets: 4,
        repTarget: '4xmax',
        progressionRule: 'Volume progression',
        explanation: 'Any pulling surface available.',
      },
      {
        name: 'DB Row (single arm)',
        startWeight: 0,
        sets: 3,
        repTarget: '3x10',
        progressionRule: 'Increase reps, then weight',
        explanation: 'Unilateral back work with dumbbells.',
      },
      {
        name: 'DB Curl',
        startWeight: 0,
        sets: 3,
        repTarget: '3x10',
        progressionRule: 'Increase reps',
        explanation: 'Bicep isolation with available dumbbells.',
      },
    ],
  },

  // Wednesday — Legs (quads, hamstrings, calves)
  {
    name: 'Legs',
    dayOfWeek: 3,
    muscles: 'quads, hamstrings, calves',
    totalSets: 21,
    travelSets: 8,
    estimatedMinutes: 60,
    travelMinutes: 25,
    deloadModifier: 'Half sets, same weight',
    exercises: [
      {
        name: 'Barbell Back Squat',
        startWeight: 56,
        sets: 4,
        repTarget: '4x6',
        progressionRule: '+2.5kg when 4x8 achieved',
        explanation:
          'King of leg exercises. Quads, glutes, core stability. Starting conservative.',
      },
      {
        name: 'Leg Press',
        startWeight: 120,
        sets: 3,
        repTarget: '3x10',
        progressionRule: '+10kg when 3x12 achieved',
        explanation:
          'High-volume quad work without spinal loading.',
      },
      {
        name: 'Romanian Deadlift',
        startWeight: 55,
        sets: 3,
        repTarget: '3x10',
        progressionRule: '+2.5kg when 3x12 achieved',
        explanation:
          'Hamstring and glute emphasis. Hip hinge pattern.',
      },
      {
        name: 'Lying Leg Curl',
        startWeight: 25,
        sets: 3,
        repTarget: '3x10',
        progressionRule: '+2.5kg when 3x12 achieved',
        explanation:
          'Isolated hamstring work. Knee flexion focus.',
      },
      {
        name: 'Leg Extension',
        startWeight: 30,
        sets: 2,
        repTarget: '2x12',
        progressionRule: '+2.5kg when 2x15 achieved',
        explanation:
          'Quad isolation for definition. Higher reps for joint health.',
      },
      {
        name: 'Standing Calf Raise',
        startWeight: 60,
        sets: 4,
        repTarget: '4x12',
        progressionRule: '+5kg when 4x15 achieved',
        explanation:
          'Gastrocnemius emphasis. Full ROM with pause at bottom stretch.',
      },
      {
        name: 'Neck Extension (prone)',
        startWeight: 2.5,
        sets: 2,
        repTarget: '2x20',
        progressionRule: '+2.5kg when 2x30 achieved',
        explanation:
          'Neck extensor training. Complements Monday\'s flexion work.',
      },
    ],
    travelExercises: [
      {
        name: 'Goblet Squat',
        startWeight: 0,
        sets: 3,
        repTarget: '3x10',
        progressionRule: 'Increase reps',
        explanation: 'Quad work with available dumbbell.',
      },
      {
        name: 'DB Romanian Deadlift',
        startWeight: 0,
        sets: 2,
        repTarget: '2x8',
        progressionRule: 'Increase reps',
        explanation: 'Hamstring work.',
      },
      {
        name: 'Bodyweight Calf Raises',
        startWeight: 0,
        sets: 3,
        repTarget: '3x20',
        progressionRule: 'Add weight via backpack',
        explanation: 'High rep calves anywhere.',
      },
    ],
  },

  // Thursday — Upper Looksmax (lateral delts, traps, neck, forearms)
  {
    name: 'Upper Looksmax',
    dayOfWeek: 4,
    muscles: 'lateral delts, traps, neck, forearms',
    totalSets: 30,
    travelSets: 16,
    estimatedMinutes: 55,
    travelMinutes: 30,
    deloadModifier: 'Half sets, same weight',
    exercises: [
      {
        name: 'Wide-Grip Upright Row',
        startWeight: 30,
        sets: 3,
        repTarget: '3x12',
        progressionRule: '+2.5kg when 3x15 achieved',
        explanation:
          'Lateral delt and trap compound. Elbows stay below shoulder height for safety.',
      },
      {
        name: 'DB Lateral Raise',
        startWeight: 8,
        sets: 4,
        repTarget: '4x15',
        progressionRule: '+1kg when 4x20 achieved',
        explanation:
          'Highest-ROI exercise for shoulder width. Slight forward lean targets lateral head.',
      },
      {
        name: 'Leaning Cable Lateral Raise',
        startWeight: 5,
        sets: 3,
        repTarget: '3x15',
        progressionRule: '+1.25kg when 3x20 achieved',
        explanation:
          'Single-arm cable work for constant tension throughout ROM.',
      },
      {
        name: 'Barbell Shrug',
        startWeight: 70,
        sets: 3,
        repTarget: '3x12',
        progressionRule: '+5kg when 3x15 achieved',
        explanation:
          'Upper trap mass. 2-second squeeze at top.',
      },
      {
        name: 'Plate Neck Curl (supine)',
        startWeight: 2.5,
        sets: 3,
        repTarget: '3x25',
        progressionRule: '+2.5kg when 3x35 achieved',
        explanation:
          'Neck flexion. One of the fastest-responding muscle groups — expect +1.5 inches in 22 weeks.',
      },
      {
        name: 'Neck Extension (prone)',
        startWeight: 2.5,
        sets: 3,
        repTarget: '3x25',
        progressionRule: '+2.5kg when 3x35 achieved',
        explanation:
          'Neck extension for thickness. Paired with flexion for balanced development.',
      },
      {
        name: 'Lateral Neck Flexion',
        startWeight: 2.5,
        sets: 2,
        repTarget: '2x15',
        progressionRule: '+2.5kg when 2x20 achieved',
        explanation:
          'Side neck work. Each side separately.',
      },
      {
        name: 'Reverse EZ-Bar Curl',
        startWeight: 20,
        sets: 3,
        repTarget: '3x10',
        progressionRule: '+2.5kg when 3x12 achieved',
        explanation:
          'Brachioradialis and forearm extensors. Visible forearm development.',
      },
      {
        name: 'Behind-Back Wrist Curl',
        startWeight: 15,
        sets: 3,
        repTarget: '3x15',
        progressionRule: '+2.5kg when 3x20 achieved',
        explanation:
          'Forearm flexors for grip strength and forearm size.',
      },
      {
        name: "Farmer's Walk",
        startWeight: 30,
        sets: 3,
        repTarget: '3x40m',
        progressionRule: '+5kg when completing easily',
        explanation:
          'Grip, traps, core stability finisher. 40 meters per set.',
      },
    ],
    travelExercises: [
      {
        name: 'DB Lateral Raise',
        startWeight: 0,
        sets: 4,
        repTarget: '4x15',
        progressionRule: 'Increase reps',
        explanation: 'Priority: shoulder width.',
      },
      {
        name: 'DB Shrug',
        startWeight: 0,
        sets: 3,
        repTarget: '3x12',
        progressionRule: 'Increase reps, then weight',
        explanation: 'Trap work with dumbbells.',
      },
      {
        name: 'Neck Curl (towel + weight)',
        startWeight: 0,
        sets: 3,
        repTarget: '3x25',
        progressionRule: 'Add weight',
        explanation: 'Neck work anywhere with a plate and towel.',
      },
      {
        name: 'Neck Extension',
        startWeight: 0,
        sets: 3,
        repTarget: '3x25',
        progressionRule: 'Add weight',
        explanation: 'Neck extension with plate.',
      },
      {
        name: 'Reverse DB Curl',
        startWeight: 0,
        sets: 3,
        repTarget: '3x10',
        progressionRule: 'Increase reps',
        explanation: 'Forearm work.',
      },
    ],
  },

  // Friday — Push B / Full Body
  {
    name: 'Push B',
    dayOfWeek: 5,
    muscles: 'shoulders, upper chest, triceps',
    totalSets: 15,
    travelSets: 9,
    estimatedMinutes: 45,
    travelMinutes: 25,
    deloadModifier: 'Half sets, same weight',
    exercises: [
      {
        name: 'Standing OHP',
        startWeight: 30,
        sets: 3,
        repTarget: '3x6',
        progressionRule: '+2.5kg when 3x8 achieved',
        explanation:
          'Overhead pressing strength. Tests true shoulder power.',
      },
      {
        name: 'Incline Barbell Bench',
        startWeight: 50,
        sets: 3,
        repTarget: '3x8',
        progressionRule: '+2.5kg when 3x10 achieved',
        explanation:
          'Upper chest emphasis with barbell.',
      },
      {
        name: 'Cable Flye',
        startWeight: 12,
        sets: 3,
        repTarget: '3x12',
        progressionRule: '+2.5kg when 3x15 achieved',
        explanation:
          'Chest isolation with constant cable tension.',
      },
      {
        name: 'DB Lateral Raise',
        startWeight: 8,
        sets: 3,
        repTarget: '3x15',
        progressionRule: '+1kg when 3x20 achieved',
        explanation:
          'Extra lateral delt volume.',
      },
      {
        name: 'Skullcrusher',
        startWeight: 20,
        sets: 3,
        repTarget: '3x10',
        progressionRule: '+2.5kg when 3x12 achieved',
        explanation:
          'Long head tricep emphasis.',
      },
    ],
    travelExercises: [
      {
        name: 'Pike Push-ups',
        startWeight: 0,
        sets: 3,
        repTarget: '3x8',
        progressionRule: 'Progress to deficit',
        explanation: 'OHP substitute with bodyweight.',
      },
      {
        name: 'Push-ups (incline or deficit)',
        startWeight: 0,
        sets: 3,
        repTarget: '3xmax',
        progressionRule: 'Progress variations',
        explanation: 'Chest work.',
      },
      {
        name: 'DB Lateral Raise',
        startWeight: 0,
        sets: 3,
        repTarget: '3x15',
        progressionRule: 'Increase reps',
        explanation: 'Shoulder width priority.',
      },
    ],
  },
]

/**
 * Full Body alternative for Friday — used when fatigued.
 * Not part of TRAINING_DAYS array; referenced by schedule resolver.
 */
export const FRIDAY_FULL_BODY: {
  name: string
  exercises: {
    name: string
    startWeight: number
    sets: number
    repTarget: string
    progressionRule: string
    explanation: string
  }[]
  totalSets: number
  estimatedMinutes: number
} = {
  name: 'Full Body (recovery)',
  totalSets: 11,
  estimatedMinutes: 35,
  exercises: [
    {
      name: 'Goblet Squat',
      startWeight: 20,
      sets: 2,
      repTarget: '2x10',
      progressionRule: 'Maintain form',
      explanation: 'Light quad maintenance.',
    },
    {
      name: 'DB Bench Press',
      startWeight: 28,
      sets: 2,
      repTarget: '2x10',
      progressionRule: 'Maintain form',
      explanation: 'Horizontal press at RPE 6-7.',
    },
    {
      name: 'Cable Row',
      startWeight: 50,
      sets: 2,
      repTarget: '2x12',
      progressionRule: 'Maintain form',
      explanation: 'Horizontal pull for back.',
    },
    {
      name: 'DB Lateral Raise',
      startWeight: 8,
      sets: 2,
      repTarget: '2x15',
      progressionRule: 'Maintain form',
      explanation: 'Lateral delt maintenance.',
    },
    {
      name: 'Pull-ups',
      startWeight: 0,
      sets: 3,
      repTarget: '3xmax',
      progressionRule: 'Volume progression',
      explanation: 'Extra pull-up volume on recovery day.',
    },
  ],
}
