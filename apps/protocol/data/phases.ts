import type { Phase } from './types'

export const PHASES: Phase[] = [
  {
    name: 'Ramp-up',
    weeks: [3, 6],
    calories: 2200,
    protein: 195,
    fat: 70,
    carbs: 185,
    cardioMinGym: [30, 30],
    cardioMinWork: [15, 20],
    estimatedWeightStart: 92.5,
    estimatedBfStart: 26.5,
    psychologyBrief:
      'Rebuilding the machine. Neural strength recovery first \u2014 60-80% of previous weights return through motor pattern recall before any hypertrophy. BPC-157 and TB-500 accelerate connective tissue adaptation. Expect significant DOMS weeks 3-4.',
  },
  {
    name: 'Acceleration',
    weeks: [7, 10],
    calories: 2100,
    protein: 195,
    fat: 68,
    carbs: 165,
    cardioMinGym: [35, 35],
    cardioMinWork: [20, 20],
    estimatedWeightStart: 88.5,
    estimatedBfStart: 23,
    psychologyBrief:
      'The visible shift. Face leans out first, then arms and shoulders. Others start commenting. Training weights approaching previous maxes. First calorie reduction at week 7.',
  },
  {
    name: 'Grinding',
    weeks: [11, 14],
    calories: 2000,
    protein: 195,
    fat: 65,
    carbs: 150,
    cardioMinGym: [35, 40],
    cardioMinWork: [20, 20],
    estimatedWeightStart: 85.5,
    estimatedBfStart: 19.5,
    psychologyBrief:
      'The hardest psychological stretch. Weeks 10-16 are where most men quit. Hunger hormones chronically elevated. Mirror seems unchanged day-to-day. Trust the logbook. Take progress photos every Sunday.',
  },
  {
    name: 'Revelation',
    weeks: [15, 18],
    calories: 1900,
    protein: 195,
    fat: 65,
    carbs: 130,
    cardioMinGym: [40, 40],
    cardioMinWork: [20, 20],
    estimatedWeightStart: 83,
    estimatedBfStart: 17,
    psychologyBrief:
      'The body emerges. Shoulder caps, chest separation, forearm vascularity. Neck +1.5 inches from 12 weeks of direct work. Squat and deadlift may exceed lifetime maxes.',
  },
  {
    name: 'Final Cut',
    weeks: [19, 22],
    calories: 1850,
    protein: 195,
    fat: 63,
    carbs: 120,
    cardioMinGym: [40, 45],
    cardioMinWork: [20, 20],
    estimatedWeightStart: 81,
    estimatedBfStart: 14,
    psychologyBrief:
      'Precision to the finish line. Body fat approaching 13-14%. Hunger is chronic. Sleep may be disrupted. Reduce volume slightly, maintain intensity at all costs. Intensity preserves muscle.',
  },
]
