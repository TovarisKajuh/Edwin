import { YOHIMBINE_WORK_CAP } from '@/data/constants'
import { getYohimbineGymDose } from '@/lib/body-stats'
import { getProtocolDay, isWeekend } from '@/lib/dates'

export type TimeSlot =
  | 'fasted_am'
  | 'with_meal_1'
  | 'post_cardio'
  | 'with_meal_3'
  | 'with_meal_4'
  | 'with_meal_5'
  | 'late_afternoon'
  | 'pre_bed'

export type Mode = 'home' | 'traveling'

export interface SupplementEntry {
  name: string
  dose: string
  why: string
}

export function getSupplementsForTimeSlot(
  slot: TimeSlot,
  week: number,
  mode: Mode,
  dayOfWeek: number,
  date: Date,
): SupplementEntry[] {
  const weekend = isWeekend(date)
  const weekday = !weekend
  const protocolDay = getProtocolDay(date)

  switch (slot) {
    case 'fasted_am':
      return getFastedAm(week, mode)

    case 'with_meal_1':
      return getMeal1(weekday, protocolDay)

    case 'post_cardio':
      return getPostCardio()

    case 'with_meal_3':
      return getMeal3(mode)

    case 'with_meal_4':
      return getMeal4()

    case 'with_meal_5':
      return getMeal5()

    case 'late_afternoon':
      return getLateAfternoon(weekday, dayOfWeek, week)

    case 'pre_bed':
      return getPreBed(weekday, week, date)

    default:
      return []
  }
}

// ─── Slot builders ──────────────────────────────────────────────

function getFastedAm(week: number, mode: Mode): SupplementEntry[] {
  const yohimbineDose = mode === 'traveling'
    ? YOHIMBINE_WORK_CAP
    : getYohimbineGymDose(week)

  return [
    { name: 'TUDCA', dose: '500mg', why: 'Liver protection (empty stomach for bile acid signaling)' },
    { name: 'Yohimbine HCL', dose: `${yohimbineDose}mg`, why: 'Fasted fat mobilization — alpha-2 receptor blockade' },
  ]
}

function getMeal1(weekday: boolean, protocolDay: number): SupplementEntry[] {
  const items: SupplementEntry[] = [
    { name: 'Isotretinoin', dose: '40mg', why: 'Acne treatment (requires 40-50g fat in this meal)' },
    { name: 'Omega-3', dose: '4g fish oil', why: 'Anti-inflammatory + isotretinoin lipid management' },
    { name: 'NAC', dose: '600mg', why: 'Liver protection + antioxidant (dose 1 of 2)' },
    { name: 'Creatine', dose: '5g', why: 'Strength maintenance during deficit' },
    { name: 'Berberine', dose: '500mg', why: 'Blood sugar management (dose 1 of 3)' },
    { name: 'HMB', dose: '1g', why: 'Anti-catabolic protection (dose 1 of 3)' },
  ]

  if (weekday) {
    items.push({
      name: 'Enclomiphene',
      dose: '12.5mg sublingual',
      why: 'Testosterone support (weekdays only)',
    })
  }

  // Zinc every other protocol day (odd days)
  if (protocolDay % 2 === 1) {
    items.push({
      name: 'Zinc',
      dose: '50mg',
      why: 'Testosterone + immune support (every other day)',
    })
  }

  return items
}

function getPostCardio(): SupplementEntry[] {
  return [
    { name: 'BPC-157', dose: '250mcg SubQ', why: 'Connective tissue protection (dose 1 of 2)' },
  ]
}

function getMeal3(mode: Mode): SupplementEntry[] {
  const items: SupplementEntry[] = [
    { name: 'HMB', dose: '1g', why: 'Anti-catabolic protection (dose 2 of 3)' },
    { name: 'Berberine', dose: '500mg', why: 'Blood sugar management (dose 2 of 3)' },
  ]
  // Magnesium Citrate on traveling days only (heavy labor increases magnesium depletion)
  if (mode === 'traveling') {
    items.push({ name: 'Magnesium Citrate', dose: '200mg', why: 'Extra magnesium for heavy labor day sweat losses' })
  }
  return items
}

function getMeal4(): SupplementEntry[] {
  return [
    { name: 'HMB', dose: '1g', why: 'Anti-catabolic protection (dose 3 of 3)' },
    { name: 'Berberine', dose: '500mg', why: 'Blood sugar management (dose 3 of 3)' },
  ]
}

function getMeal5(): SupplementEntry[] {
  return [
    { name: 'NAC', dose: '600mg', why: 'Liver protection + antioxidant (dose 2 of 2)' },
  ]
}

function getLateAfternoon(weekday: boolean, dayOfWeek: number, week: number): SupplementEntry[] {
  if (!weekday) return []

  const items: SupplementEntry[] = [
    { name: 'BPC-157', dose: '250mcg SubQ', why: 'Connective tissue protection (dose 2 of 2)' },
    { name: 'GHK-Cu', dose: '1.5mg SubQ', why: 'Skin healing + tissue recovery' },
  ]

  // TB-500: loading weeks 3-6 = Mon+Thu, maintenance weeks 7+ = Mon only
  const isLoadingPhase = week >= 3 && week <= 6
  const isTb500Day = isLoadingPhase
    ? (dayOfWeek === 1 || dayOfWeek === 4)
    : dayOfWeek === 1

  if (isTb500Day) {
    items.push({
      name: 'TB-500',
      dose: '2.5mg SubQ',
      why: isLoadingPhase
        ? 'Connective tissue repair — loading phase (Mon+Thu)'
        : 'Connective tissue repair — maintenance (Mon only)',
    })
  }

  return items
}

function getPreBed(weekday: boolean, week: number, date: Date): SupplementEntry[] {
  // Magnesium and glycine are daily (not weekday-only)
  const items: SupplementEntry[] = [
    { name: 'Magnesium Glycinate', dose: '400mg', why: 'Sleep quality + muscle relaxation' },
    { name: 'Glycine', dose: '3g', why: 'Core temp reduction for faster sleep onset' },
  ]

  // CJC-1295 and Ipamorelin are weekdays only
  if (weekday) {
    const protocolDay = getProtocolDay(date)
    const isHalfDose = week === 3 && protocolDay <= 3

    const peptideDose = isHalfDose ? '100mcg SubQ' : '200mcg SubQ'
    const doseNote = isHalfDose ? ' (half dose — tolerance assessment)' : ''

    items.push(
      { name: 'CJC-1295 no DAC', dose: peptideDose, why: `GH pulse for overnight fat mobilization${doseNote}` },
      { name: 'Ipamorelin', dose: peptideDose, why: `GH secretagogue — synergistic with CJC-1295${doseNote}` },
    )
  }

  return items
}
