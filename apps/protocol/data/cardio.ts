import type { Mode } from './types'
import { isTravelMode } from './types'
import { PHASES } from './phases'

export interface CardioSession {
  durationMin: [number, number]
  hrZone: [number, number]
  modality: string
  explanation: string
  stackExplanation: string
}

function getPhaseForWeek(week: number) {
  return PHASES.find((p) => week >= p.weeks[0] && week <= p.weeks[1]) ?? PHASES[0]
}

const STACK_EXPLANATION =
  'Three synergistic mechanisms peak during fasted morning cardio: ' +
  '(1) Overnight GH pulse from CJC-1295/Ipamorelin mobilized fatty acids from adipose tissue. ' +
  '(2) Yohimbine blocks alpha-2 receptors on stubborn fat cells that normally resist lipolysis. ' +
  '(3) Fasted state keeps insulin low, permitting maximum fatty acid oxidation. ' +
  'This is the peak fat-burning window of the day.'

export function getCardioSession(week: number, mode: Mode): CardioSession {
  const phase = getPhaseForWeek(week)
  const isTravel = isTravelMode(mode)
  const durationMin: [number, number] =
    isTravel ? [...phase.cardioMinWork] : [...phase.cardioMinGym]

  const modality = isTravel
    ? 'Brisk walk or skip'
    : 'Incline treadmill walk (preferred), stationary bike, or light jog'

  const explanation = isTravel
    ? `${durationMin[0]}-${durationMin[1]} minutes on travel days. ` +
      'Physical labor already provides significant caloric expenditure. ' +
      'This session is supplementary — skip if total daily steps exceed 15,000.'
    : `${durationMin[0]}-${durationMin[1]} minutes of steady-state cardio in heart rate zone 2. ` +
      'Performed fasted with yohimbine to maximize stubborn fat oxidation. ' +
      'Keep intensity low enough to hold a conversation — fat oxidation drops sharply above zone 2.'

  return {
    durationMin,
    hrZone: [113, 134],
    modality,
    explanation,
    stackExplanation: STACK_EXPLANATION,
  }
}

export const STALL_PROTOCOL = [
  '1. Verify tracking accuracy \u2014 this resolves most stalls',
  '2. Add 2,000-2,500 daily steps (incidental walking, not formal cardio) \u2014 ~100kcal extra',
  '3. Extend cardio by 5-10 minutes per session',
  '4. Reduce calories by 100kcal from carbs \u2014 only after activity increases tried',
  'Always prefer adding activity over removing food \u2014 food supports training, adherence, and micronutrients.',
]
