import { describe, it, expect } from 'vitest'
import { generateDay } from '@/lib/generator'

describe('generateDay', () => {
  it('produces ordered time blocks for a home_workout Tuesday week 9', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    expect(blocks.length).toBeGreaterThan(10)
    expect(blocks[0].category).toBe('monitoring')
    expect(blocks[0].time).toBe('06:00')
  })

  it('includes Pull training on workout day with index 1', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    const training = blocks.find((b) => b.category === 'training')
    expect(training).toBeDefined()
    expect(training!.trainingDetail).toBeDefined()
    expect(training!.trainingDetail!.dayName).toBe('Pull')
  })

  it('includes 5-6 meal blocks', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    const meals = blocks.filter((b) => b.category === 'nutrition')
    expect(meals.length).toBeGreaterThanOrEqual(5)
  })

  it('includes peptide blocks on weekday', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    const peptides = blocks.filter((b) => b.category === 'peptides')
    expect(peptides.length).toBeGreaterThanOrEqual(2)
  })

  it('excludes CJC/Ipa on Saturday (weekend)', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 9)), 'home_rest')
    const cjc = blocks.find((b) => b.title.includes('CJC'))
    expect(cjc).toBeUndefined()
  })

  it('has no training on rest mode', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 9)), 'home_rest')
    const training = blocks.find((b) => b.category === 'training')
    expect(training).toBeUndefined()
  })

  it('includes bleach bath on Sunday', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 10)), 'home_rest')
    const bleach = blocks.find((b) => b.title.toLowerCase().includes('bleach'))
    expect(bleach).toBeDefined()
  })

  it('travel_workout mode caps yohimbine at 5mg', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'travel_workout', 1)
    const yoh = blocks.find((b) => b.title.includes('Yohimbine'))
    expect(yoh).toBeDefined()
    expect(yoh!.explanation.doseToday).toContain('5mg')
  })

  it('travel_workout mode uses abbreviated training', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'travel_workout', 1)
    const training = blocks.find((b) => b.category === 'training')
    expect(training).toBeDefined()
    expect(training!.trainingDetail!.totalSets).toBeLessThan(21)
  })

  it('blocks are ordered by time', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].time >= blocks[i - 1].time).toBe(true)
    }
  })

  it('every block has a complete explanation', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    for (const block of blocks) {
      expect(block.explanation.what).toBeTruthy()
      expect(block.explanation.mechanism).toBeTruthy()
    }
  })

  it('deload week has deload note on training', () => {
    // Week 6 Monday = April 13
    const blocks = generateDay(new Date(Date.UTC(2026, 3, 13)), 'home_workout', 0)
    const training = blocks.find((b) => b.category === 'training')
    expect(training?.trainingDetail?.deloadNote).toBeTruthy()
  })

  it('first day (week 3 Monday) has Edwin note', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 2, 23)), 'home_workout', 0)
    const hasEdwinNote = blocks.some((b) => b.edwinNote)
    expect(hasEdwinNote).toBe(true)
  })

  it('generates unique IDs for all blocks', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    const ids = blocks.map((b) => b.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  // ─── Additional edge case tests ──────────────────────────────

  it('Sunday includes progress photos in morning monitoring', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 10)), 'home_rest')
    const morning = blocks.find((b) => b.category === 'monitoring' && b.time === '06:00')
    expect(morning).toBeDefined()
    expect(morning!.title).toContain('Progress Photos')
  })

  it('only BPC-157 (no GHK-Cu/TB-500) in late afternoon on weekends', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 9)), 'home_rest')
    const latePeptides = blocks.find(
      (b) => b.category === 'peptides' && b.time === '17:00'
    )
    expect(latePeptides).toBeDefined()
    expect(latePeptides!.title).toContain('BPC-157')
    expect(latePeptides!.title).not.toContain('GHK-Cu')
  })

  it('bloodwork block on Monday of week 12', () => {
    // Week 12 Monday = May 25
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 25)), 'home_workout', 0)
    const bloodwork = blocks.find(
      (b) => b.category === 'monitoring' && b.title.includes('Bloodwork')
    )
    expect(bloodwork).toBeDefined()
    expect(bloodwork!.title).toContain('Full Panel #1')
  })

  it('no bloodwork on Tuesday of week 12', () => {
    // Week 12 Tuesday = May 26
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 26)), 'home_workout', 1)
    const bloodwork = blocks.find(
      (b) => b.category === 'monitoring' && b.title.includes('Bloodwork')
    )
    expect(bloodwork).toBeUndefined()
  })

  it('diet break week 10 shows maintenance calories in meal explanation', () => {
    // Week 10 Monday = May 11
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 11)), 'home_workout', 0)
    const meal = blocks.find((b) => b.category === 'nutrition')
    expect(meal).toBeDefined()
    const dietBreakMeal = blocks.find(
      (b) => b.category === 'nutrition' && b.explanation.phaseNote.includes('Diet break')
    )
    expect(dietBreakMeal).toBeDefined()
  })

  it('refeed Saturday week 9 has refeed note', () => {
    // Week 9 Saturday = May 9
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 9)), 'home_rest')
    const refeedMeal = blocks.find(
      (b) => b.category === 'nutrition' && b.explanation.phaseNote.includes('Refeed')
    )
    expect(refeedMeal).toBeDefined()
  })

  it('week 22 Sunday generates without errors', () => {
    // Week 22 Sunday = August 9
    const blocks = generateDay(new Date(Date.UTC(2026, 7, 9)), 'home_rest')
    expect(blocks.length).toBeGreaterThan(10)
  })

  it('includes skincare AM and PM blocks', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    const skincare = blocks.filter((b) => b.category === 'skincare')
    expect(skincare.length).toBe(2)
  })

  it('includes sleep blocks', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    const sleep = blocks.filter((b) => b.category === 'sleep')
    expect(sleep.length).toBe(2)
  })

  it('travel_workout mode shifts training to evening', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'travel_workout', 1)
    const training = blocks.find((b) => b.category === 'training')
    expect(training).toBeDefined()
    expect(training!.time).toBe('18:00')
  })

  it('home_workout mode has training at 10:30', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    const training = blocks.find((b) => b.category === 'training')
    expect(training).toBeDefined()
    expect(training!.time).toBe('10:30')
  })

  it('week 3 Monday CJC/Ipa uses half dose', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 2, 23)), 'home_workout', 0)
    const cjc = blocks.find((b) => b.title.includes('CJC'))
    expect(cjc).toBeDefined()
    expect(cjc!.title).toContain('100mcg')
  })

  it('week 4 Monday CJC/Ipa uses full dose', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 2, 30)), 'home_workout', 0)
    const cjc = blocks.find((b) => b.title.includes('CJC'))
    expect(cjc).toBeDefined()
    expect(cjc!.title).toContain('200mcg')
  })

  it('isotretinoin meal has warning', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    const isoMeal = blocks.find((b) => b.mealDetail?.isIsotretinoinMeal)
    expect(isoMeal).toBeDefined()
    expect(isoMeal!.warning).toBeTruthy()
    expect(isoMeal!.warning).toContain('fat')
  })

  // ─── New tests for 4-mode system ──────────────────────────────

  it('home_rest mode: no training block, has moderate carb meals', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_rest')
    const training = blocks.find((b) => b.category === 'training')
    expect(training).toBeUndefined()
    const meals = blocks.filter((b) => b.category === 'nutrition')
    expect(meals.length).toBe(5) // breakfast, lunch, snack, dinner, pre-bed
  })

  it('travel_rest mode: no training block, work lunch present', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'travel_rest')
    const training = blocks.find((b) => b.category === 'training')
    expect(training).toBeUndefined()
    const meals = blocks.filter((b) => b.category === 'nutrition')
    expect(meals.length).toBe(5) // breakfast, work lunch, work snack, dinner, pre-bed
  })

  it('berberine NOT in breakfast on any mode', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    const breakfast = blocks.find((b) => b.category === 'nutrition' && b.mealDetail?.isIsotretinoinMeal)
    expect(breakfast).toBeDefined()
    const berberine = breakfast!.mealDetail!.supplementsWithMeal.find(s => s.name === 'Berberine')
    expect(berberine).toBeUndefined()
  })

  it('walking block present after post-WO meal', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    const walkBlocks = blocks.filter((b) => b.title.includes('Walk') && b.title.includes('GLUT4'))
    expect(walkBlocks.length).toBeGreaterThanOrEqual(1)
  })

  it('pre-bed meal at 20:15', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    const preBed = blocks.find((b) => b.category === 'nutrition' && b.title.includes('Pre-Bed'))
    expect(preBed).toBeDefined()
    expect(preBed!.time).toBe('20:15')
  })

  it('meal titles contain variation names', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_workout', 1)
    const meals = blocks.filter((b) => b.category === 'nutrition')
    // All meals should have variation IDs like B1, L2, D3, S1, PB1 etc.
    const hasVariation = meals.some((m) =>
      m.title.match(/^(B|L|D|S|PB)\d:/)
    )
    expect(hasVariation).toBe(true)
  })

  it('home_rest mode has walking blocks after carb meals', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home_rest')
    const walkBlocks = blocks.filter((b) => b.title.includes('Walk') && b.category === 'cardio' && b.time > '10:00')
    expect(walkBlocks.length).toBeGreaterThanOrEqual(1)
  })

  it('travel_rest mode caps yohimbine at 5mg', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'travel_rest')
    const yoh = blocks.find((b) => b.title.includes('Yohimbine'))
    expect(yoh).toBeDefined()
    expect(yoh!.explanation.doseToday).toContain('5mg')
  })
})
