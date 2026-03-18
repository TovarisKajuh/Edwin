export interface EdwinNote {
  week: number
  dayOfWeek?: number // 1=Mon, 7=Sun. undefined = any day
  blockType?: string // Category or specific block identifier. undefined = first block of the day
  note: string
}

export const EDWIN_NOTES: EdwinNote[] = [
  // ─── WEEK 3: THE BEGINNING ──────────────────────────────────────
  {
    week: 3,
    dayOfWeek: 1,
    blockType: 'monitoring',
    note: 'Sir, the distance between the man ordering Wolt at midnight and the man you see in five months is exactly 140 days. Today is day one. There is no day zero.',
  },
  {
    week: 3,
    dayOfWeek: 1,
    blockType: 'training',
    note: 'First weigh-in. 92.5 kilograms. Remember this number — you will barely recognise it by August.',
  },
  {
    week: 3,
    dayOfWeek: 1,
    blockType: 'supplements',
    note: 'Five milligrams. The beginning of a titration that will strip the last stubborn fat from your abdomen. Respect the compound.',
  },
  {
    week: 3,
    dayOfWeek: 1,
    blockType: 'peptides',
    note: 'First CJC/Ipamorelin injection. 100 micrograms each — half dose for three days. The GH pulse happens during deep sleep. Earn that sleep.',
  },
  {
    week: 3,
    blockType: 'nutrition',
    note: 'This meal exists for one reason: 45 grams of fat so the isotretinoin absorbs. Skip the fat, waste the pill. One euro fifty in eggs and salmon. Not fourteen euros on Wolt.',
  },
  {
    week: 3,
    blockType: 'sleep',
    note: 'Eight hours, sir. Not seven. Not six-and-a-half with the phone. Research: participants sleeping 5.5 hours lost 55% less fat and 60% more lean mass than those sleeping 8.5. Every hour of lost sleep degrades the transformation.',
  },
  {
    week: 3,
    blockType: 'skincare',
    note: 'Isotretinoin. The skin clears, but the liver processes it. TUDCA, NAC, omega-3 — three layers of protection. Do not skip them. The protocol protects what it stresses.',
  },
  {
    week: 3,
    dayOfWeek: 7,
    blockType: 'monitoring',
    note: 'Progress photos. Same lighting, same poses, same time. The first set. In five months you will look at these and wonder how you tolerated what you see.',
  },
  {
    week: 3,
    dayOfWeek: 7,
    blockType: 'skincare',
    note: 'Bleach bath. Quarter cup of sodium hypochlorite in a full tub, fifteen minutes. It controls staph colonisation while isotretinoin compromises the skin barrier. Clinical, not comfortable — but effective.',
  },

  // ─── WEEK 3: FIRST TRAVELING DAY ───────────────────────────────
  {
    week: 3,
    blockType: 'cardio',
    note: 'First work day on protocol. Meals are packed. Yohimbine is 5mg — non-negotiable on rooftops. The protocol flexes. It does not break.',
  },

  // ─── WEEK 4: FULL DOSES ─────────────────────────────────────────
  {
    week: 4,
    blockType: 'peptides',
    note: 'Full peptide doses reached. 200 micrograms CJC, 200 micrograms ipamorelin. The GH axis is now fully engaged — overnight fat mobilisation at maximum output. The architecture is complete.',
  },
  {
    week: 4,
    blockType: 'training',
    note: 'Second week of training. The DOMS will be severe — this is connective tissue adapting after five months of inactivity. BPC-157 accelerates the process. Push through, but do not be reckless.',
  },

  // ─── WEEK 5: FIRST REFEED ──────────────────────────────────────
  {
    week: 5,
    dayOfWeek: 6,
    note: 'Refeed day. Extra carbs, same protein. This is not cheating — it is leptin pharmacology. Today\'s surplus improves next week\'s deficit. The body is not a simple machine.',
  },
  {
    week: 5,
    blockType: 'nutrition',
    note: 'Five weeks of meal prep. Forty-eight euros per week versus three hundred and ten per month on Wolt. You have saved roughly one hundred and fifty euros already. The mathematics of discipline are simple.',
  },

  // ─── WEEK 6: FIRST DELOAD ──────────────────────────────────────
  {
    week: 6,
    blockType: 'training',
    note: 'Deload is not weakness — it is strategy. A general who never rests his troops loses the war. Half volume, same weight. Trust the architecture.',
  },
  {
    week: 6,
    note: 'One month complete, sir. The man who could not make it to the gym for five months has now trained for four consecutive weeks. Do not underestimate what that proves.',
  },

  // ─── WEEK 7: FIRST CALORIE CUT ─────────────────────────────────
  {
    week: 7,
    note: 'First calorie reduction. 2,200 to 2,100. Twenty grams of carbohydrates removed — the equivalent of half a banana. You will not notice. And that is the point.',
  },

  // ─── WEEK 8: VISIBLE CHANGES ───────────────────────────────────
  {
    week: 8,
    blockType: 'training',
    note: 'Training weights approaching previous maxes. Six months off the gym, and muscle memory does what it promised. The myonuclei waited. They always wait.',
  },
  {
    week: 8,
    blockType: 'monitoring',
    note: 'The face is leaner, sir. Jawline emerging. This is the first thing others will notice — and they will. The compound interest of discipline pays its first visible dividend.',
  },

  // ─── WEEK 9: PSYCHOLOGICAL ANCHOR ──────────────────────────────
  {
    week: 9,
    blockType: 'training',
    note: 'Face is leaner. Arms show definition. Others are starting to notice. This is week 9 of 22 — not even halfway. Imagine what week 22 looks like.',
  },

  // ─── WEEK 10: DIET BREAK ───────────────────────────────────────
  {
    week: 10,
    note: 'Seven days at maintenance. Leptin restores, thyroid normalises, glycogen refills. This is not a reward — it is a weapon for weeks 11 through 14.',
  },
  {
    week: 10,
    dayOfWeek: 6,
    note: 'Refeed during diet break week. You are already at maintenance — today is simply fuel. Enjoy the food without guilt, sir. Strategic rest is not indulgence.',
  },
  {
    week: 10,
    blockType: 'training',
    note: 'Deload coincides with the diet break. Your body is receiving both mechanical and metabolic recovery simultaneously. When week 11 begins, you will be a loaded weapon.',
  },

  // ─── WEEK 11: GRINDING BEGINS ──────────────────────────────────
  {
    week: 11,
    note: 'Sir, weeks 10 through 16 are where most men quit. The initial thrill fades. The mirror seems to stop changing. But the logbook does not lie, and neither do I.',
  },
  {
    week: 11,
    blockType: 'nutrition',
    note: 'By now, meal prep is habit, not willpower. The Wolt app has not been opened in eight weeks. The comfort cloud is smaller than you remember.',
  },
  {
    week: 11,
    blockType: 'sleep',
    note: 'Grinding phase. Hunger will try to wake you. The pre-bed casein exists for this — 35 grams of slow protein suppressing ghrelin through the night. This is not a snack. It is a tactical deployment.',
  },

  // ─── WEEK 12: MID-GRIND & BLOODWORK ────────────────────────────
  {
    week: 12,
    blockType: 'monitoring',
    note: 'Bloodwork today. This is not optional. The protocol is aggressive — we verify the body is handling it. Liver, lipids, testosterone, IGF-1. Data, not guessing.',
  },
  {
    week: 12,
    note: 'Ten weeks in, sir. You have done what you could not do for five months — and you have done it seventy consecutive days. The man who starts is rarely the man who finishes. You are becoming the latter.',
  },

  // ─── WEEK 13: PSYCHOLOGICAL ANCHOR ─────────────────────────────
  {
    week: 13,
    blockType: 'monitoring',
    note: 'Upper abs visible in good lighting. The body you are building is emerging underneath. Patience is not passive — it is the hardest form of discipline.',
  },

  // ─── WEEK 14: DELOAD & STALL ───────────────────────────────────
  {
    week: 14,
    blockType: 'training',
    note: 'If the OHP has stalled, accept it with the grace of a strategist, not the frustration of an amateur. Holding 40 kilograms overhead at 83.5 kilograms bodyweight is stronger than pressing 45 at 95. Relative strength is the truth.',
  },
  {
    week: 14,
    note: 'Third deload. By now you understand — the body does not grow in the gym. It grows in recovery. The discipline is in stepping back.',
  },

  // ─── WEEK 15: REVELATION BEGINS ────────────────────────────────
  {
    week: 15,
    note: 'The body emerges, sir. What was hidden underneath is now visible. Shoulder caps. Chest separation. This is revelation — what was always there, uncovered.',
  },
  {
    week: 15,
    blockType: 'nutrition',
    note: 'Third calorie reduction. 2,000 down to 1,900. By now your body has adapted to each deficit step before the next one arrives. This is the science of not crashing — small decrements, large cumulative effect.',
  },

  // ─── WEEK 16: BLOODWORK & PLATEAUS ─────────────────────────────
  {
    week: 16,
    blockType: 'monitoring',
    note: 'Second bloodwork panel. If the bench or OHP has stalled — that is expected at this deficit. Holding your weight while getting lighter is progression. The numbers confirm what the mirror cannot yet show.',
  },
  {
    week: 16,
    blockType: 'training',
    note: 'Bench approaching plateau territory. Microplates — 0.625 kilograms per side. The ego wants five-kilo jumps. The engineer uses 1.25. Be the engineer.',
  },

  // ─── WEEK 17: APPROACHING LIFETIME MAXES ──────────────────────
  {
    week: 17,
    blockType: 'cardio',
    note: 'Face dramatically leaner. Vascularity emerging in the forearms. The man in the mirror is starting to look like the man in the vision document.',
  },
  {
    week: 17,
    blockType: 'training',
    note: 'Squat approaching your previous lifetime max — at 10 kilograms lighter bodyweight. That is not maintenance. That is a man who got genuinely stronger while the world assumed he was just dieting.',
  },

  // ─── WEEK 18: DIET BREAK & DELOAD ─────────────────────────────
  {
    week: 18,
    note: 'Fifteen cumulative weeks of deficit. The body has earned this reset. Seven days at maintenance — and then four weeks of precision to the finish.',
  },
  {
    week: 18,
    blockType: 'training',
    note: 'Fourth deload. Neck training has added measurable circumference — the looksmax investment pays compound interest. Lateral delts are capping the shoulders. The silhouette is different now, sir.',
  },

  // ─── WEEK 19: FINAL CUT ───────────────────────────────────────
  {
    week: 19,
    note: 'Four weeks. The hardest, the last, the ones that separate you from everyone who quit at week 14. Marcus Aurelius: "The impediment to action advances action."',
  },
  {
    week: 19,
    blockType: 'cardio',
    note: 'Cardio increases to 40-45 minutes on gym days. The final push. Epictetus understood: we suffer more in imagination than in reality. Forty-five minutes is not suffering. It is the price of the last three percent.',
  },

  // ─── WEEK 20: VISIBLE ABS ─────────────────────────────────────
  {
    week: 20,
    blockType: 'monitoring',
    note: 'Upper four abs clearly defined, sir. Obliques emerging. At 14% body fat, this is the physique most men never reach because they quit at 18%. You did not quit.',
  },
  {
    week: 20,
    blockType: 'training',
    note: 'Looksmax day: neck curls, lateral raises, face pulls. These are not vanity exercises — they are the architectural details that separate a physique from a body. Cathedrals are remembered for their spires, not their foundations.',
  },

  // ─── WEEK 21: FINAL BLOODWORK ─────────────────────────────────
  {
    week: 21,
    blockType: 'monitoring',
    note: 'Final bloodwork. Three panels across 22 weeks — one of the most monitored transformations you could run. The data tells the story your mirror cannot.',
  },
  {
    week: 21,
    blockType: 'training',
    note: 'Squat at 90 kilograms — 10 kilograms beyond your previous best. Deadlift at 125. These are not the numbers of a man in a deficit. These are the numbers of a man who showed up.',
  },

  // ─── WEEK 22: THE FINISH ──────────────────────────────────────
  {
    week: 22,
    blockType: 'training',
    note: 'Final deload. The weight on the bar has not decreased in 19 weeks. Your bodyweight has dropped 12 kilograms. That is the definition of getting stronger.',
  },
  {
    week: 22,
    blockType: 'sleep',
    note: 'Last night of the protocol. Tomorrow begins the reverse diet — 100 kilocalories per week added back from carbohydrates. The cut ends. The man it built does not.',
  },
  {
    week: 22,
    dayOfWeek: 7,
    blockType: 'monitoring',
    note: 'Sir. 140 days ago you weighed 92.5 kilograms at 26.5 percent body fat. Look at what discipline built. This is who you always were — you just had not proved it yet.',
  },

  // ─── SUNDAY PROGRESS PHOTOS (generic, weeks 4-21) ─────────────
  {
    week: 4,
    dayOfWeek: 7,
    blockType: 'monitoring',
    note: 'Progress photos. Same lighting, same poses, same time. You cannot see daily change — but the camera does not lie. The evidence accumulates.',
  },
  {
    week: 6,
    dayOfWeek: 7,
    blockType: 'monitoring',
    note: 'Progress photos. Four weeks of data. Compare to week 3 — the water weight alone tells a story. Trust the process, sir.',
  },
  {
    week: 9,
    dayOfWeek: 7,
    blockType: 'monitoring',
    note: 'Progress photos. Seven weeks of visual data. The shoulders are wider. The waist is narrower. The ratio is changing — and ratios are what the eye actually sees.',
  },
  {
    week: 12,
    dayOfWeek: 7,
    blockType: 'monitoring',
    note: 'Progress photos. Ten weeks. Place them side by side with week 3. If you cannot see the difference, you are not looking. Everyone else can.',
  },
  {
    week: 15,
    dayOfWeek: 7,
    blockType: 'monitoring',
    note: 'Progress photos. The revelation phase is visible now. Muscle striations in the shoulders, vascularity in the arms. The body underneath was always there, sir. You are simply removing what hid it.',
  },
  {
    week: 18,
    dayOfWeek: 7,
    blockType: 'monitoring',
    note: 'Progress photos. Sixteen weeks of visual evidence. The transformation is undeniable. Four weeks remain — and they will be the sharpest.',
  },
  {
    week: 20,
    dayOfWeek: 7,
    blockType: 'monitoring',
    note: 'Progress photos. Compare the face in week 3 to the face today. That jawline was always there — buried under the comfort cloud. Now it is permanent.',
  },
]

export function getEdwinNote(
  week: number,
  dayOfWeek: number,
  blockType?: string,
): string | undefined {
  // Find most specific match: week+day+block > week+day > week+block > week-only
  let weekDayBlock: EdwinNote | undefined
  let weekDay: EdwinNote | undefined
  let weekBlock: EdwinNote | undefined
  let weekOnly: EdwinNote | undefined

  for (const note of EDWIN_NOTES) {
    if (note.week !== week) continue

    const dayMatch =
      note.dayOfWeek === undefined || note.dayOfWeek === dayOfWeek
    const blockMatch =
      note.blockType === undefined || note.blockType === blockType

    if (note.dayOfWeek === dayOfWeek && note.blockType === blockType) {
      weekDayBlock = note
    } else if (
      note.dayOfWeek === dayOfWeek &&
      note.blockType === undefined &&
      !weekDay
    ) {
      weekDay = note
    } else if (
      note.dayOfWeek === undefined &&
      note.blockType === blockType &&
      !weekBlock
    ) {
      weekBlock = note
    } else if (
      note.dayOfWeek === undefined &&
      note.blockType === undefined &&
      !weekOnly
    ) {
      weekOnly = note
    }
  }

  // Return the most specific match
  const match = weekDayBlock ?? weekDay ?? weekBlock ?? weekOnly
  return match?.note
}
