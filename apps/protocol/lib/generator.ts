import type { Mode, TimeBlock, Explanation, MealDetail, TrainingDetail, Category } from '@/data/types'
import { MEAL_SLOTS_HOME, MEAL_SLOTS_TRAVEL, getMealMacros, getWeeklyCostNote } from '@/data/meals'
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

export function generateDay(date: Date, mode: Mode): TimeBlock[] {
  // 1. Determine context
  const week = getWeekNumber(date)
  const phase = getPhase(week)
  const dayOfWeek = getDayOfWeek(date)
  const protocolDay = getProtocolDay(date)
  const weekend = isWeekendFn(date)
  const isSunday = dayOfWeek === 7
  const isSaturday = dayOfWeek === 6
  const weekday = !weekend
  const deload = isDeloadWeek(week)
  const dietBreak = isDietBreakWeek(week)
  const refeedSat = isRefeedSaturday(week, dayOfWeek)
  const bloodwork = isBloodworkWeek(week) && dayOfWeek === 1
  const estWeight = getEstimatedWeight(week)
  const estBf = getEstimatedBf(week)
  const effectiveCals = getEffectiveCalories(week, dayOfWeek)

  const phaseContext = `Week ${week}, ${phase.name} phase. ~${estWeight}kg / ~${estBf}% BF. Target ${effectiveCals}kcal.`

  const blocks: TimeBlock[] = []

  // Helper to find an Edwin note for a block
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
    const safetyCap = Math.floor(estWeight * YOHIMBINE_SAFETY_MG_PER_KG)
    const actualDose = mode === 'traveling' ? YOHIMBINE_WORK_CAP : getYohimbineGymDose(week)

    let yohDoseDetail: string
    if (mode === 'traveling') {
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
    const cardioTime = mode === 'traveling' ? '06:15' : '06:30'
    const cardioEndTime = mode === 'traveling' ? '06:35' : '07:05'
    const cardioTitle =
      mode === 'traveling'
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
  const slots = mode === 'home' ? MEAL_SLOTS_HOME : MEAL_SLOTS_TRAVEL
  const mealTimings = mode === 'home'
    ? ['07:15', '10:00', '12:15', '15:30', '19:00', '21:00']
    : ['06:30', '10:00', '13:00', '15:30', '19:00', '21:00']

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i]
    const macros = getMealMacros(i, week, mode, refeedSat, dietBreak)
    const mealTime = mealTimings[i]
    const nextTime = i < mealTimings.length - 1 ? mealTimings[i + 1] : '21:15'

    // Get supplements for this meal
    const mealSlotMap: Record<number, 'with_meal_1' | 'with_meal_3' | 'with_meal_4' | 'with_meal_5'> = {
      0: 'with_meal_1',
      2: 'with_meal_3',
      3: 'with_meal_4',
      4: 'with_meal_5',
    }
    const suppSlot = mealSlotMap[i]
    const mealSupps = suppSlot
      ? getSupplementsForTimeSlot(suppSlot, week, mode, dayOfWeek, date)
      : []

    // Weekend: filter out Enclomiphene from meal 1
    // (already handled by getSupplementsForTimeSlot which checks weekday)

    let mealNotes = mode === 'home' ? slot.notes : slot.notesTravel
    if (dietBreak) mealNotes += ' [DIET BREAK — maintenance calories]'
    if (refeedSat) mealNotes += ' [REFEED — extra carbs from leptin protocol]'
    if (mode === 'traveling' && i >= 1 && i <= 3) mealNotes += ' + electrolytes (sodium/potassium from lite salt)'

    const isotoNote = slot.isIsotretinoinMeal ? ' (ISOTRETINOIN MEAL)' : ''
    const optionalNote = slot.name === 'Pre-bed' ? ' (optional)' : ''
    const title = `${slot.name} — ${slot.notes.split(' — ')[0]}${isotoNote} ~${macros.calories}cal${optionalNote}`

    const exampleMeals = mode === 'home' ? slot.exampleMeals : slot.exampleMealsTravel

    const mealDetail: MealDetail = {
      calories: macros.calories,
      protein: macros.protein,
      fat: macros.fat,
      carbs: macros.carbs,
      exampleMeals,
      supplementsWithMeal: mealSupps.map((s) => ({ name: s.name, dose: s.dose, why: s.why })),
      isIsotretinoinMeal: slot.isIsotretinoinMeal,
    }

    if (dietBreak) {
      mealDetail.costNote = 'Diet break week — maintenance calories for metabolic recovery.'
    } else if (isSunday && i === 0) {
      // Sunday meal 1: weekly cost note + meal prep reminder
      mealDetail.costNote = getWeeklyCostNote(week) + ' 2 hours of prep today eliminates 7 days of decisions.'
    }

    let mealWarning: string | undefined
    if (slot.isIsotretinoinMeal) {
      mealWarning = 'This meal MUST contain 40-50g fat for isotretinoin absorption. Without adequate fat, oral bioavailability drops 40-50%.'
    }

    blocks.push({
      id: makeId(date, mealTime, 'nutrition', i),
      time: mealTime,
      endTime: nextTime,
      title,
      category: 'nutrition',
      explanation: makeExplanation({
        what: `${slot.name}: ${macros.protein}g protein, ${macros.fat}g fat, ${macros.carbs}g carbs = ${macros.calories}kcal. ${mealNotes}`,
        doseToday: `${macros.calories}kcal (P${macros.protein}/F${macros.fat}/C${macros.carbs})${mealSupps.length > 0 ? ' + ' + mealSupps.map((s) => `${s.name} ${s.dose}`).join(', ') : ''}`,
        whyToday: phaseContext,
        mechanism:
          slot.isIsotretinoinMeal
            ? 'Isotretinoin is fat-soluble. Without 40-50g dietary fat in the same meal, oral bioavailability drops by 40-50%. The high-fat breakfast is structured specifically to maximize absorption.'
            : `Meal timing supports training performance and recovery. Protein target: 195g/day distributed across 5-6 meals for maximum muscle protein synthesis stimulation.`,
        phaseNote: dietBreak
          ? 'Diet break: maintenance calories to restore leptin, thyroid, and glycogen.'
          : refeedSat
            ? 'Refeed Saturday: extra carbs restore leptin signaling and muscle glycogen.'
            : phase.psychologyBrief,
      }),
      edwinNote: edwinNote('nutrition'),
      warning: mealWarning,
      mealDetail,
    })
  }

  // ─── 10:30 Training (weekdays only) ──────────────────────────
  if (weekday) {
    const trainingDetail = getTrainingDay(dayOfWeek, mode, deload, week)

    if (trainingDetail) {
      const trainingTime = mode === 'traveling' ? '18:00' : '10:30'
      const trainingEndTime = mode === 'traveling'
        ? `${18 + Math.ceil(trainingDetail.estimatedMinutes / 60)}:${String(trainingDetail.estimatedMinutes % 60).padStart(2, '0')}`
        : '12:00'

      let trainingTitle = `${trainingDetail.dayName} Day — ${trainingDetail.muscles}`
      if (deload) trainingTitle += ' [DELOAD]'
      if (mode === 'traveling') trainingTitle += ' (abbreviated)'

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
          what: `Inject CJC-1295 no DAC ${cjcEntry?.dose} and Ipamorelin ${ipaEntry?.dose} SubQ. Same syringe. Must be >=60 minutes after last food.`,
          doseToday: `CJC-1295 ${cjcEntry?.dose} + Ipamorelin ${ipaEntry?.dose}${isHalfDose ? ' (half dose — tolerance assessment, first 3 days)' : ''}`,
          whyToday: phaseContext,
          mechanism: `${cjcCompound?.mechanism ?? ''} ${ipaCompound?.mechanism ?? ''}`,
          phaseNote: cjcCompound?.whyInProtocol ?? '',
        }),
        edwinNote: edwinNote('peptides'),
        warning: 'Must be >=60 minutes after last food. Insulin suppresses GH release. Weekdays only for receptor sensitivity recovery.',
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
    // Same time: maintain insertion order via category priority
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
