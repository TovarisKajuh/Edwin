import type { Mode, TimeBlock, Explanation, MealDetail, TrainingDetail, Category } from '@/data/types'
import { isWorkoutMode, isTravelMode } from '@/data/types'
import { getModeTemplate, getMealMacros, selectMealVariation, getWeeklyCostNote } from '@/data/meals'
import { SKINCARE_AM, SKINCARE_PM, BLEACH_BATH } from '@/data/skincare'
import { DAILY_CHECKS, BLOODWORK_PANELS } from '@/data/monitoring'
import { getCardioSession } from '@/data/cardio'
import { getEdwinNote } from '@/data/edwin-notes'
import { SUPPLEMENTS } from '@/data/supplements'
import {
  YOHIMBINE_WORK_CAP,
  YOHIMBINE_GYM_DOSE,
  YOHIMBINE_SAFETY_MG_PER_KG,
} from '@/data/constants'
import { getWeekNumber, getDayOfWeek, getProtocolDay, formatDate, isWeekend as isWeekendFn } from '@/lib/dates'
import { getPhase, isDeloadWeek, isDietBreakWeek, isBloodworkWeek, isRefeedSaturday, getEffectiveCalories } from '@/lib/phase'
import { getEstimatedWeight, getEstimatedBf, getYohimbineGymDose } from '@/lib/body-stats'
import { getTrainingDay } from '@/lib/schedule'
import { getSupplementsForTimeSlot } from '@/lib/supplements-for-day'

// ─── Helpers ─────────────────────────────────────────────────────

function makeId(date: Date, time: string, category: string, index?: number): string {
  const dateStr = formatDate(date)
  const suffix = index !== undefined ? `-${index}` : ''
  return `${dateStr}-${time.replace(':', '')}-${category}${suffix}`
}

function makeExplanation(overrides: Partial<Explanation> & { what: string; mechanism: string }): Explanation {
  return {
    what: overrides.what,
    doseToday: overrides.doseToday ?? '',
    whyToday: overrides.whyToday ?? '',
    mechanism: overrides.mechanism,
    phaseNote: overrides.phaseNote ?? '',
  }
}

function compoundLookup(name: string) {
  return SUPPLEMENTS.find((s) => s.name === name)
}

// ─── Core Generator ─────────────────────────────────────────────

export function generateDay(date: Date, mode: Mode, workoutIndex?: number): TimeBlock[] {
  // 1. Determine context
  const week = getWeekNumber(date)
  const phase = getPhase(week)
  const dayOfWeek = getDayOfWeek(date)
  const protocolDay = getProtocolDay(date)
  const weekend = isWeekendFn(date)
  const isSunday = dayOfWeek === 7
  const weekday = !weekend
  const deload = isDeloadWeek(week)
  const dietBreak = isDietBreakWeek(week)
  const refeedSat = isRefeedSaturday(week, dayOfWeek)
  const bloodwork = isBloodworkWeek(week) && dayOfWeek === 1
  const estWeight = getEstimatedWeight(week)
  const estBf = getEstimatedBf(week)
  const effectiveCals = getEffectiveCalories(week, dayOfWeek)

  const isWorkout = isWorkoutMode(mode)
  const isTravel = isTravelMode(mode)
  const zincDay = protocolDay % 2 === 1

  const phaseContext = `Week ${week}, ${phase.name} phase. ~${estWeight}kg / ~${estBf}% BF. Target ${effectiveCals}kcal.`

  const blocks: TimeBlock[] = []

  function edwinNote(category: string): string | undefined {
    return getEdwinNote(week, dayOfWeek, category)
  }

  // 2. Build blocks in chronological order

  // ─── 06:00 Monitoring: Wake + Weigh-in + HRV ─────────────────
  {
    const checks = DAILY_CHECKS.items
    let title = 'Wake + Weigh-in + HRV'
    if (isSunday) title = 'Wake + Weigh-in + HRV + Progress Photos'

    blocks.push({
      id: makeId(date, '06:00', 'monitoring'),
      time: '06:00',
      endTime: '06:05',
      title,
      category: 'monitoring',
      explanation: makeExplanation({
        what: checks.map((c) => `${c.name}: ${c.instructions}`).join('. '),
        doseToday: isSunday
          ? 'Weigh-in + HRV + progress photos (same lighting, same poses)'
          : 'Weigh-in + HRV reading',
        whyToday: phaseContext,
        mechanism:
          'Daily fluctuations of 1-3kg are normal from water, sodium, and bowel contents. Only the 7-day rolling average matters. HRV trending down over 3-5 days signals accumulated fatigue.',
        phaseNote: phase.psychologyBrief,
      }),
      edwinNote: edwinNote('monitoring'),
    })
  }

  // ─── 06:05 Monitoring: Subjective Wellness ────────────────────
  {
    blocks.push({
      id: makeId(date, '06:05', 'monitoring'),
      time: '06:05',
      endTime: '06:10',
      title: 'Subjective Wellness (1-10: Energy, Mood, Sleep, Motivation, Soreness)',
      category: 'monitoring',
      explanation: makeExplanation({
        what: 'Rate each metric 1-10. Track trends over the week. If energy consistently <=4/10 for a full week, trigger recovery protocol.',
        doseToday: '5 metrics, 1-10 scale each',
        whyToday: phaseContext,
        mechanism:
          'Subjective markers often predict overtraining before objective markers. The combination of energy, mood, sleep quality, motivation, and soreness provides a multi-dimensional fatigue picture.',
        phaseNote: phase.psychologyBrief,
      }),
    })
  }

  // ─── Bloodwork (if applicable) ────────────────────────────────
  if (bloodwork) {
    const panel = BLOODWORK_PANELS[week]
    if (panel) {
      blocks.push({
        id: makeId(date, '06:08', 'monitoring', 2),
        time: '06:08',
        endTime: '06:10',
        title: `Bloodwork: ${panel.name}`,
        category: 'monitoring',
        explanation: makeExplanation({
          what: `Blood draw for ${panel.name}. Markers: ${panel.markers.map((m) => m.name).join(', ')}.`,
          doseToday: `${panel.markers.length} markers`,
          whyToday: `Week ${week} scheduled bloodwork. ${phaseContext}`,
          mechanism: panel.markers.map((m) => `${m.name}: ${m.why}. Alert: ${m.alert}`).join('. '),
          phaseNote: phase.psychologyBrief,
        }),
        edwinNote: edwinNote('monitoring'),
        warning: 'Fasting blood draw — do not eat before the draw. Take TUDCA and yohimbine AFTER blood is drawn.',
      })
    }
  }

  // ─── 06:10 Supplements: TUDCA + Yohimbine (fasted) ───────────
  {
    const fastedSupps = getSupplementsForTimeSlot('fasted_am', week, mode, dayOfWeek, date)
    const yohEntry = fastedSupps.find((s) => s.name === 'Yohimbine HCL')
    const tudcaEntry = fastedSupps.find((s) => s.name === 'TUDCA')

    const yohDose = yohEntry?.dose ?? '5mg'
    const scheduledDose = YOHIMBINE_GYM_DOSE[week] ?? 5
    const actualDose = isTravel ? YOHIMBINE_WORK_CAP : getYohimbineGymDose(week)

    let yohDoseDetail: string
    if (isTravel) {
      yohDoseDetail = `Yohimbine ${yohDose} (traveling cap: 5mg absolute — elevated HR + heights + heat)`
    } else if (actualDose < scheduledDose) {
      yohDoseDetail = `Yohimbine ${yohDose} (scheduled ${scheduledDose}mg, capped at ${actualDose}mg for ${estWeight}kg x 0.2mg/kg safety ceiling)`
    } else {
      yohDoseDetail = `Yohimbine ${yohDose}`
    }

    const yohCompound = compoundLookup('Yohimbine HCL')
    const tudcaCompound = compoundLookup('TUDCA')

    blocks.push({
      id: makeId(date, '06:10', 'supplements'),
      time: '06:10',
      endTime: '06:15',
      title: `TUDCA ${tudcaEntry?.dose ?? '500mg'} + Yohimbine ${yohDose} (fasted)`,
      category: 'supplements',
      explanation: makeExplanation({
        what: `Take TUDCA 500mg and Yohimbine HCL ${yohDose} on an empty stomach. FASTED ONLY — insulin negates yohimbine entirely.`,
        doseToday: `TUDCA 500mg + ${yohDoseDetail}`,
        whyToday: phaseContext,
        mechanism: `${tudcaCompound?.mechanism ?? ''} ${yohCompound?.mechanism ?? ''}`,
        phaseNote: phase.psychologyBrief,
      }),
      edwinNote: edwinNote('supplements'),
      warning: 'FASTED ONLY — eating before cardio negates yohimbine mechanism entirely. Never exceed 0.2mg/kg bodyweight.',
    })
  }

  // ─── 06:15 Skincare: AM Routine ───────────────────────────────
  {
    const steps = SKINCARE_AM.map((s) => `${s.product} (${s.area}): ${s.instructions}`).join('. ')
    blocks.push({
      id: makeId(date, '06:15', 'skincare'),
      time: '06:15',
      endTime: '06:30',
      title: 'AM Skincare: Nizoral, moisturizer, SPF50',
      category: 'skincare',
      explanation: makeExplanation({
        what: steps,
        doseToday: SKINCARE_AM.map((s) => s.product).join(' + '),
        whyToday: phaseContext,
        mechanism: SKINCARE_AM.map((s) => `${s.product}: ${s.mechanism}`).join(' '),
        phaseNote: 'Isotretinoin makes skin photosensitive and dry. The AM routine protects and hydrates.',
      }),
      edwinNote: edwinNote('skincare'),
    })
  }

  // ─── 06:30 Cardio: Fasted Zone 2 ─────────────────────────────
  {
    const cardio = getCardioSession(week, mode)
    const durationStr = `${cardio.durationMin[0]}-${cardio.durationMin[1]}min`
    const cardioTime = isTravel ? '06:15' : '06:30'
    const cardioEndTime = isTravel ? '06:35' : '07:05'
    const cardioTitle = isTravel
      ? `Fasted Zone 2 Cardio — ${durationStr} (abbreviated or skip)`
      : `Fasted Zone 2 Cardio — ${durationStr}`

    blocks.push({
      id: makeId(date, cardioTime, 'cardio'),
      time: cardioTime,
      endTime: cardioEndTime,
      title: cardioTitle,
      category: 'cardio',
      explanation: makeExplanation({
        what: `${cardio.modality}. HR zone: ${cardio.hrZone[0]}-${cardio.hrZone[1]} bpm.`,
        doseToday: `${durationStr} steady-state, HR ${cardio.hrZone[0]}-${cardio.hrZone[1]} bpm`,
        whyToday: phaseContext,
        mechanism: cardio.stackExplanation,
        phaseNote: cardio.explanation,
      }),
      edwinNote: edwinNote('cardio'),
    })
  }

  // ─── 07:05 Peptides: BPC-157 #1 ──────────────────────────────
  {
    const postCardioSupps = getSupplementsForTimeSlot('post_cardio', week, mode, dayOfWeek, date)
    const bpcEntry = postCardioSupps.find((s) => s.name === 'BPC-157')
    const bpcCompound = compoundLookup('BPC-157')

    if (bpcEntry) {
      blocks.push({
        id: makeId(date, '07:05', 'peptides'),
        time: '07:05',
        endTime: '07:10',
        title: `BPC-157 ${bpcEntry.dose} #1`,
        category: 'peptides',
        explanation: makeExplanation({
          what: `Inject BPC-157 ${bpcEntry.dose} subcutaneously in abdomen. Rotate injection sites.`,
          doseToday: `BPC-157 ${bpcEntry.dose} (dose 1 of 2, ~8-12h apart)`,
          whyToday: phaseContext,
          mechanism: bpcCompound?.mechanism ?? 'Pentadecapeptide for connective tissue healing.',
          phaseNote: bpcCompound?.whyInProtocol ?? '',
        }),
        edwinNote: edwinNote('peptides'),
      })
    }
  }

  // ─── Meal blocks ──────────────────────────────────────────────
  const template = getModeTemplate(mode)

  for (let i = 0; i < template.length; i++) {
    const slotTarget = template[i]
    const macros = getMealMacros(slotTarget, week, mode, refeedSat, dietBreak)
    const mealTime = slotTarget.time
    const nextTime = i < template.length - 1 ? template[i + 1].time : '20:30'

    // Determine variation slot type for selection
    let variationSlot: string
    if (slotTarget.isIsotretinoinMeal) {
      variationSlot = 'breakfast'
    } else if (slotTarget.isPostWorkout) {
      variationSlot = 'dinner'
    } else if (slotTarget.isPreWorkout) {
      variationSlot = 'lunch'
    } else if (slotTarget.slotName === 'Pre-Bed') {
      variationSlot = 'pre_bed'
    } else if (slotTarget.slotName === 'Snack' || slotTarget.slotName === 'Work Snack') {
      variationSlot = 'snack'
    } else if (slotTarget.slotName === 'Dinner' || slotTarget.slotName === 'Lunch' || slotTarget.slotName === 'Work Lunch') {
      // Rest day lunch/dinner or travel work lunch — use lunch or dinner variations
      if (slotTarget.slotName === 'Dinner') {
        variationSlot = 'dinner'
      } else {
        variationSlot = 'lunch'
      }
    } else {
      variationSlot = 'snack'
    }

    const variation = selectMealVariation(variationSlot, protocolDay, zincDay)

    // Override template protein/fat with actual variation values (carbs stay phase-scaled)
    macros.protein = variation.totalProtein
    macros.fat = variation.totalFat
    macros.calories = macros.protein * 4 + macros.fat * 9 + macros.carbs * 4

    // Build supplements for this meal
    // Determine which supplement slot this corresponds to
    let mealSupps: { name: string; dose: string; why: string }[] = []
    if (i === 0) {
      // First meal = breakfast = with_meal_1
      const supps = getSupplementsForTimeSlot('with_meal_1', week, mode, dayOfWeek, date)
      mealSupps = supps.map((s) => ({ name: s.name, dose: s.dose, why: s.why }))
    } else if (slotTarget.slotName === 'Pre-Bed') {
      // Pre-bed supplements are handled in separate blocks
      mealSupps = []
    } else {
      // For other meals: check if berberine should be added (carbs > 25g)
      const baseMealSupps: { name: string; dose: string; why: string }[] = []

      // HMB with protein meals (up to 3 doses per day)
      // Dose 1 is with breakfast, doses 2 & 3 with later meals
      if (i === 1 || i === 2) {
        baseMealSupps.push({ name: 'HMB', dose: '1g', why: `Anti-catabolic protection (dose ${i + 1} of 3)` })
      } else if (i === 3 && template.length >= 5) {
        baseMealSupps.push({ name: 'HMB', dose: '1g', why: 'Anti-catabolic protection (dose 3 of 3)' })
      }

      // Berberine ONLY with meals that have >25g carbs
      if (macros.carbs > 25) {
        baseMealSupps.push({ name: 'Berberine', dose: '500mg', why: 'AMPK activation — glucose partitioning to muscle (carb meal)' })
      }

      // NAC dose 2 with dinner (the last main meal before pre-bed)
      const isLastMainMeal = i === template.length - 2 // second to last (before pre-bed)
      if (isLastMainMeal) {
        baseMealSupps.push({ name: 'NAC', dose: '600mg', why: 'Liver protection + antioxidant (dose 2 of 2)' })
      }

      // Mag citrate on travel days with a mid-day meal
      if (isTravel && (i === 1 || i === 2)) {
        baseMealSupps.push({ name: 'Magnesium Citrate', dose: '200mg', why: 'Extra magnesium for labor day sweat losses' })
      }

      mealSupps = baseMealSupps
    }

    // Build meal notes
    let mealNotes = slotTarget.notes
    if (dietBreak) mealNotes += ' [DIET BREAK — maintenance calories]'
    if (refeedSat) mealNotes += ' [REFEED — extra carbs from leptin protocol]'
    if (isTravel && i >= 1 && i <= 3) mealNotes += ' + electrolytes (sodium/potassium from lite salt)'

    // Build title with variation name
    const variationLabel = `${variation.id}: ${variation.name}`
    const isotoNote = slotTarget.isIsotretinoinMeal ? ' (Isotretinoin)' : ''
    const glut4Note = slotTarget.isPostWorkout ? ' GLUT4 Feast' : ''
    const optionalNote = slotTarget.slotName === 'Pre-Bed' ? ' (optional)' : ''
    const title = `${variationLabel} — ${slotTarget.slotName}${isotoNote}${glut4Note} ~${macros.calories}kcal${optionalNote}`

    // Build ingredient list as example meals
    const ingredientList = variation.ingredients.map(
      (ing) => `${ing.amount} ${ing.name} (P${ing.protein}/F${ing.fat}/C${ing.carbs})`
    )

    const mealDetail: MealDetail = {
      calories: macros.calories,
      protein: macros.protein,
      fat: macros.fat,
      carbs: macros.carbs,
      exampleMeals: ingredientList,
      supplementsWithMeal: mealSupps,
      isIsotretinoinMeal: slotTarget.isIsotretinoinMeal,
    }

    if (dietBreak) {
      mealDetail.costNote = 'Diet break week — maintenance calories for metabolic recovery.'
    } else if (isSunday && i === 0) {
      mealDetail.costNote = getWeeklyCostNote(week) + ' 2 hours of prep today eliminates 7 days of decisions.'
    }

    let mealWarning: string | undefined
    if (slotTarget.isIsotretinoinMeal) {
      mealWarning = 'This meal MUST contain 40-50g fat for isotretinoin absorption. Without adequate fat, oral bioavailability drops 40-50%.'
    }

    // Build explanation
    let mechanism: string
    if (slotTarget.isIsotretinoinMeal) {
      mechanism = 'Isotretinoin is fat-soluble. Without 40-50g dietary fat in the same meal, oral bioavailability drops by 40-50%. The high-fat breakfast is structured specifically to maximize absorption.'
    } else if (slotTarget.isPostWorkout) {
      mechanism = 'GLUT4 transporters are at the muscle cell surface after training. 60-75% of daily carbs concentrated in this meal. Glucose goes to muscle, not fat. Walk 5-10 min after to extend GLUT4 activation.'
    } else if (slotTarget.isPreWorkout) {
      mechanism = 'Glucose-based carbs to fuel the training session. Berberine activates AMPK for better glucose uptake. Low fat to speed digestion before training.'
    } else if (slotTarget.slotName === 'Pre-Bed') {
      mechanism = 'Slow-digesting protein (casein/cottage cheese) provides sustained amino acid supply during 8 hours of sleep. 40g casein before sleep increases overnight MPS by ~22%. Must be at 20:15 — 75 min before CJC/Ipa at 21:30.'
    } else if (!isWorkout && macros.carbs > 25) {
      mechanism = 'Rest day moderate carbs with berberine and a post-meal walk for partial GLUT4 activation. No training advantage, but walking + berberine still improves glucose partitioning.'
    } else {
      mechanism = 'Protein for MPS stimulation. Minimal carbs — no GLUT4 advantage without training or walking.'
    }

    blocks.push({
      id: makeId(date, mealTime, 'nutrition', i),
      time: mealTime,
      endTime: nextTime,
      title,
      category: 'nutrition',
      explanation: makeExplanation({
        what: `${variation.name}: ${variation.ingredients.map(ing => `${ing.amount} ${ing.name}`).join(', ')}. ${macros.protein}g protein, ${macros.fat}g fat, ${macros.carbs}g carbs = ${macros.calories}kcal. ${mealNotes}`,
        doseToday: `${macros.calories}kcal (P${macros.protein}/F${macros.fat}/C${macros.carbs})${mealSupps.length > 0 ? ' + ' + mealSupps.map((s) => `${s.name} ${s.dose}`).join(', ') : ''}`,
        whyToday: phaseContext,
        mechanism,
        phaseNote: dietBreak
          ? 'Diet break: maintenance calories to restore leptin, thyroid, and glycogen.'
          : refeedSat
            ? 'Refeed Saturday: extra carbs restore leptin signaling and muscle glycogen.'
            : phase.psychologyBrief,
      }),
      edwinNote: i === 0 ? edwinNote('nutrition') : undefined,
      warning: mealWarning,
      mealDetail,
    })

    // ─── Walking block after post-WO meal ──────────────────────
    if (slotTarget.isPostWorkout) {
      const walkTime = mealTime.replace(/:(\d\d)$/, (_, min) => {
        const newMin = parseInt(min) + 15
        return `:${String(newMin).padStart(2, '0')}`
      })
      blocks.push({
        id: makeId(date, walkTime, 'cardio', 10 + i),
        time: walkTime,
        endTime: walkTime.replace(/:(\d\d)$/, (_, min) => {
          const newMin = parseInt(min) + 10
          return `:${String(newMin).padStart(2, '0')}`
        }),
        title: 'Walk 5-10 min — GLUT4 activation',
        category: 'cardio',
        explanation: makeExplanation({
          what: 'Casual walk after the high-carb meal. Muscle contraction from walking activates GLUT4 in leg muscles, extending glucose-to-muscle bias.',
          doseToday: '5-10 min walk',
          whyToday: phaseContext,
          mechanism: 'Walking activates GLUT4 transporters in leg muscles (the largest muscle group). This provides preferential glucose uptake toward muscle even as the post-workout GLUT4 window closes.',
          phaseNote: '',
        }),
      })
    }

    // ─── Walking block after rest-day carb meals (>25g carbs) ──
    if (!isWorkout && !slotTarget.isIsotretinoinMeal && macros.carbs > 25 && slotTarget.slotName !== 'Pre-Bed') {
      const walkMin = parseInt(mealTime.split(':')[1]) + 15
      const walkHour = parseInt(mealTime.split(':')[0]) + Math.floor(walkMin / 60)
      const walkMinFinal = walkMin % 60
      const walkTimeStr = `${String(walkHour).padStart(2, '0')}:${String(walkMinFinal).padStart(2, '0')}`

      blocks.push({
        id: makeId(date, walkTimeStr, 'cardio', 20 + i),
        time: walkTimeStr,
        endTime: `${String(walkHour).padStart(2, '0')}:${String(walkMinFinal + 10).padStart(2, '0')}`,
        title: 'Walk 10 min — partial GLUT4 activation',
        category: 'cardio',
        explanation: makeExplanation({
          what: 'Walk after carb-containing rest day meal. No training GLUT4 advantage, but walking provides partial activation.',
          doseToday: '10 min walk',
          whyToday: phaseContext,
          mechanism: 'On rest days, walking after carb meals is especially important since there is no training-induced GLUT4 advantage. Walking provides at least some preferential glucose uptake toward muscle.',
          phaseNote: '',
        }),
      })
    }
  }

  // ─── Training block (workout modes only) ──────────────────────
  if (isWorkout && workoutIndex !== undefined) {
    const trainingDetail = getTrainingDay(workoutIndex, mode, deload, week)

    if (trainingDetail) {
      const trainingTime = isTravel ? '18:00' : '10:30'
      const trainingEndTime = isTravel
        ? `${18 + Math.ceil(trainingDetail.estimatedMinutes / 60)}:${String(trainingDetail.estimatedMinutes % 60).padStart(2, '0')}`
        : '12:00'

      let trainingTitle = `${trainingDetail.dayName} Day — ${trainingDetail.muscles}`
      if (deload) trainingTitle += ' [DELOAD]'
      if (isTravel) trainingTitle += ' (abbreviated)'

      blocks.push({
        id: makeId(date, trainingTime, 'training'),
        time: trainingTime,
        endTime: trainingEndTime,
        title: trainingTitle,
        category: 'training',
        explanation: makeExplanation({
          what: `${trainingDetail.dayName}: ${trainingDetail.exercises.map((e) => `${e.name} ${e.sets}x${e.reps.replace(/\d+x/, '')} @ ${e.weight}kg`).join(', ')}. ${trainingDetail.totalSets} total sets, ~${trainingDetail.estimatedMinutes}min.`,
          doseToday: `${trainingDetail.totalSets} sets, ~${trainingDetail.estimatedMinutes} minutes${deload ? ' (deload: sets halved, weight maintained)' : ''}`,
          whyToday: phaseContext,
          mechanism:
            'Resistance training during a deficit preserves lean mass by maintaining the mechanical tension signal that tells the body muscle tissue is needed. Volume is the primary hypertrophy driver; intensity (load) is the primary strength driver. During a deficit, intensity is prioritized over volume.',
          phaseNote: deload
            ? 'Deload week: sets halved, weight maintained. Focus on recovery and form. The body does not grow in the gym — it grows in recovery.'
            : phase.psychologyBrief,
        }),
        edwinNote: edwinNote('training'),
        trainingDetail,
      })
    }
  }

  // ─── 17:00 Peptides: BPC-157 #2 + GHK-Cu + TB-500 (weekdays), BPC-157 #2 only (weekends) ─
  if (weekday) {
    const lateSupps = getSupplementsForTimeSlot('late_afternoon', week, mode, dayOfWeek, date)
    if (lateSupps.length > 0) {
      const titleParts = lateSupps.map((s) => `${s.name} ${s.dose}`).join(' + ')
      const ghkCompound = compoundLookup('GHK-Cu')
      const tb500Compound = compoundLookup('TB-500')
      const bpcCompound = compoundLookup('BPC-157')

      blocks.push({
        id: makeId(date, '17:00', 'peptides'),
        time: '17:00',
        endTime: '17:10',
        title: titleParts,
        category: 'peptides',
        explanation: makeExplanation({
          what: `Inject subcutaneously: ${titleParts}. Rotate injection sites.`,
          doseToday: lateSupps.map((s) => `${s.name} ${s.dose}`).join(', '),
          whyToday: phaseContext,
          mechanism: [
            bpcCompound?.mechanism,
            ghkCompound?.mechanism,
            lateSupps.find((s) => s.name === 'TB-500') ? tb500Compound?.mechanism : null,
          ]
            .filter(Boolean)
            .join(' '),
          phaseNote: bpcCompound?.whyInProtocol ?? '',
        }),
      })
    }
  } else {
    // Weekend: BPC-157 is twice daily EVERY day (not weekday-only)
    const bpcCompound = compoundLookup('BPC-157')
    blocks.push({
      id: makeId(date, '17:00', 'peptides'),
      time: '17:00',
      endTime: '17:05',
      title: 'BPC-157 250mcg SubQ #2',
      category: 'peptides',
      explanation: makeExplanation({
        what: 'BPC-157 250mcg subcutaneous injection — second dose of the day. Rotate injection site from morning dose.',
        doseToday: 'BPC-157 250mcg SubQ (abdomen)',
        whyToday: `Weekend dose. BPC-157 is taken every day including weekends — twice daily, ~8-12 hours apart. Unlike CJC/Ipa and GHK-Cu, BPC-157 does not need receptor sensitivity breaks.`,
        mechanism: bpcCompound?.mechanism ?? '',
        phaseNote: bpcCompound?.whyInProtocol ?? '',
      }),
    })
  }

  // ─── 20:30 Skincare: PM Routine ───────────────────────────────
  {
    const pmSteps = SKINCARE_PM.map((s) => `${s.product} (${s.area}): ${s.instructions}`).join('. ')
    let pmTitle = 'PM Skincare: PanOxyl/LRP, Tretinoin, moisturizer, azelaic acid'
    let pmExtra = ''
    if (isSunday) {
      pmTitle += ' + Bleach Bath'
      pmExtra = ` ${BLEACH_BATH.instructions}`
    }

    blocks.push({
      id: makeId(date, '20:30', 'skincare'),
      time: '20:30',
      endTime: '21:00',
      title: pmTitle,
      category: 'skincare',
      explanation: makeExplanation({
        what: `${pmSteps}${pmExtra}`,
        doseToday: SKINCARE_PM.map((s) => s.product).join(' + ') + (isSunday ? ' + bleach bath' : ''),
        whyToday: phaseContext,
        mechanism:
          SKINCARE_PM.map((s) => `${s.product}: ${s.mechanism}`).join(' ') +
          (isSunday ? ` Bleach bath: ${BLEACH_BATH.mechanism}` : ''),
        phaseNote: 'Skin management during isotretinoin course. PM routine treats active areas and supports barrier repair.',
      }),
      edwinNote: edwinNote('skincare'),
    })
  }

  // ─── 21:15 Supplements: Pre-bed (Magnesium + Glycine) ────────
  {
    const preBedSupps = getSupplementsForTimeSlot('pre_bed', week, mode, dayOfWeek, date)
    const magGlycine = preBedSupps.filter((s) => s.name === 'Magnesium Glycinate' || s.name === 'Glycine')
    const peptides = preBedSupps.filter((s) => s.name === 'CJC-1295 no DAC' || s.name === 'Ipamorelin')

    const magCompound = compoundLookup('Magnesium Glycinate')
    const glycineCompound = compoundLookup('Glycine')

    blocks.push({
      id: makeId(date, '21:15', 'supplements'),
      time: '21:15',
      endTime: '21:30',
      title: `Magnesium 400mg + Glycine 3g`,
      category: 'supplements',
      explanation: makeExplanation({
        what: 'Take Magnesium Glycinate 400mg and Glycine 3g. Sleep optimization stack.',
        doseToday: magGlycine.map((s) => `${s.name} ${s.dose}`).join(' + '),
        whyToday: phaseContext,
        mechanism: `${magCompound?.mechanism ?? ''} ${glycineCompound?.mechanism ?? ''}`,
        phaseNote:
          'Sleep is the highest-leverage recovery variable. Participants sleeping 5.5 hours lost 55% less fat and 60% more lean mass than those sleeping 8.5 hours.',
      }),
    })

    // ─── 21:30 Peptides: CJC-1295 + Ipamorelin (weekdays only) ──
    if (peptides.length > 0) {
      const cjcCompound = compoundLookup('CJC-1295 no DAC')
      const ipaCompound = compoundLookup('Ipamorelin')
      const cjcEntry = peptides.find((s) => s.name === 'CJC-1295 no DAC')
      const ipaEntry = peptides.find((s) => s.name === 'Ipamorelin')
      const isHalfDose = week === 3 && protocolDay <= 3

      blocks.push({
        id: makeId(date, '21:30', 'peptides'),
        time: '21:30',
        endTime: '21:35',
        title: `CJC-1295 ${cjcEntry?.dose ?? '200mcg'} + Ipamorelin ${ipaEntry?.dose ?? '200mcg'}`,
        category: 'peptides',
        explanation: makeExplanation({
          what: `Inject CJC-1295 no DAC ${cjcEntry?.dose} and Ipamorelin ${ipaEntry?.dose} SubQ. Same syringe. Must be >=60 minutes after last food (pre-bed at 20:15 = 75 min gap).`,
          doseToday: `CJC-1295 ${cjcEntry?.dose} + Ipamorelin ${ipaEntry?.dose}${isHalfDose ? ' (half dose — tolerance assessment, first 3 days)' : ''}`,
          whyToday: phaseContext,
          mechanism: `${cjcCompound?.mechanism ?? ''} ${ipaCompound?.mechanism ?? ''}`,
          phaseNote: cjcCompound?.whyInProtocol ?? '',
        }),
        edwinNote: edwinNote('peptides'),
        warning: 'Must be >=60 minutes after last food. Pre-bed protein at 20:15 provides 75 min gap. Insulin suppresses GH release. Weekdays only for receptor sensitivity recovery.',
      })
    }
  }

  // ─── 21:30 Sleep: Wind down ───────────────────────────────────
  {
    blocks.push({
      id: makeId(date, '21:30', 'sleep'),
      time: '21:30',
      endTime: '22:00',
      title: 'Wind down — dim lights, no screens, 18-20C',
      category: 'sleep',
      explanation: makeExplanation({
        what: 'Dim all lights. No screens (phone, laptop, TV). Room temperature 18-20C. This is the transition from waking to sleep architecture.',
        doseToday: '30 minutes wind-down protocol',
        whyToday: phaseContext,
        mechanism:
          'Blue light from screens suppresses melatonin production by up to 50%. Cool room temperature (18-20C) facilitates the core body temperature drop required for sleep onset. Combined with glycine (which also lowers core temp), this creates optimal conditions for deep sleep.',
        phaseNote:
          'Sleep quality directly determines body composition outcomes. Every hour of lost sleep degrades the transformation.',
      }),
      edwinNote: edwinNote('sleep'),
    })
  }

  // ─── 22:00 Sleep: Target 8 hours ──────────────────────────────
  {
    blocks.push({
      id: makeId(date, '22:00', 'sleep'),
      time: '22:00',
      endTime: '06:00',
      title: 'Sleep — target 8 hours',
      category: 'sleep',
      explanation: makeExplanation({
        what: 'Aim for 8 hours of sleep. The overnight GH pulse from CJC/Ipamorelin peaks during deep sleep phases 3-4. This is when fat mobilization and muscle recovery are maximized.',
        doseToday: '8 hours target (22:00-06:00)',
        whyToday: phaseContext,
        mechanism:
          'Growth hormone is released in pulses during slow-wave (deep) sleep. The CJC-1295/Ipamorelin injection 30-60 minutes before sleep amplifies this pulse. Mobilized fatty acids are then available for oxidation during the fasted morning cardio window.',
        phaseNote: phase.psychologyBrief,
      }),
    })
  }

  // ─── Sort by time, then by a stable secondary key ─────────────
  blocks.sort((a, b) => {
    if (a.time < b.time) return -1
    if (a.time > b.time) return 1
    const priority: Record<Category, number> = {
      monitoring: 0,
      supplements: 1,
      skincare: 2,
      cardio: 3,
      peptides: 4,
      nutrition: 5,
      training: 6,
      sleep: 7,
    }
    return (priority[a.category] ?? 99) - (priority[b.category] ?? 99)
  })

  // ─── Deduplicate IDs (append counter for collisions) ──────────
  const seen = new Map<string, number>()
  for (const block of blocks) {
    const count = seen.get(block.id) ?? 0
    if (count > 0) {
      block.id = `${block.id}-${count}`
    }
    seen.set(block.id, count + 1)
  }

  return blocks
}
