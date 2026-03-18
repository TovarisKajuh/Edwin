import { describe, it, expect } from 'vitest'
import { generateDay } from '@/lib/generator'

describe('generateDay', () => {
  it('produces ordered time blocks for a home Tuesday week 9', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home')
    expect(blocks.length).toBeGreaterThan(10)
    expect(blocks[0].category).toBe('monitoring')
    expect(blocks[0].time).toBe('06:00')
  })

  it('includes Pull training on Tuesday', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home')
    const training = blocks.find((b) => b.category === 'training')
    expect(training).toBeDefined()
    expect(training!.trainingDetail).toBeDefined()
    expect(training!.trainingDetail!.dayName).toBe('Pull')
  })

  it('includes 5-6 meal blocks', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home')
    const meals = blocks.filter((b) => b.category === 'nutrition')
    expect(meals.length).toBeGreaterThanOrEqual(5)
  })

  it('includes peptide blocks on weekday', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home')
    const peptides = blocks.filter((b) => b.category === 'peptides')
    expect(peptides.length).toBeGreaterThanOrEqual(2)
  })

  it('excludes CJC/Ipa on Saturday (weekend)', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 9)), 'home')
    const cjc = blocks.find((b) => b.title.includes('CJC'))
    expect(cjc).toBeUndefined()
  })

  it('has no training on Saturday', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 9)), 'home')
    const training = blocks.find((b) => b.category === 'training')
    expect(training).toBeUndefined()
  })

  it('includes bleach bath on Sunday', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 10)), 'home')
    const bleach = blocks.find((b) => b.title.toLowerCase().includes('bleach'))
    expect(bleach).toBeDefined()
  })

  it('traveling mode caps yohimbine at 5mg', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'traveling')
    const yoh = blocks.find((b) => b.title.includes('Yohimbine'))
    expect(yoh).toBeDefined()
    expect(yoh!.explanation.doseToday).toContain('5mg')
  })

  it('traveling mode uses abbreviated training', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'traveling')
    const training = blocks.find((b) => b.category === 'training')
    expect(training).toBeDefined()
    expect(training!.trainingDetail!.totalSets).toBeLessThan(21)
  })

  it('blocks are ordered by time', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home')
    for (let i = 1; i < blocks.length; i++) {
      expect(blocks[i].time >= blocks[i - 1].time).toBe(true)
    }
  })

  it('every block has a complete explanation', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home')
    for (const block of blocks) {
      expect(block.explanation.what).toBeTruthy()
      expect(block.explanation.mechanism).toBeTruthy()
    }
  })

  it('deload week has deload note on training', () => {
    // Week 6 Monday = April 13
    const blocks = generateDay(new Date(Date.UTC(2026, 3, 13)), 'home')
    const training = blocks.find((b) => b.category === 'training')
    expect(training?.trainingDetail?.deloadNote).toBeTruthy()
  })

  it('first day (week 3 Monday) has Edwin note', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 2, 23)), 'home')
    const hasEdwinNote = blocks.some((b) => b.edwinNote)
    expect(hasEdwinNote).toBe(true)
  })

  it('generates unique IDs for all blocks', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home')
    const ids = blocks.map((b) => b.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  // ─── Additional edge case tests ──────────────────────────────

  it('Sunday includes progress photos in morning monitoring', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 10)), 'home')
    const morning = blocks.find((b) => b.category === 'monitoring' && b.time === '06:00')
    expect(morning).toBeDefined()
    expect(morning!.title).toContain('Progress Photos')
  })

  it('no late afternoon peptides on weekends', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 9)), 'home')
    const latePeptides = blocks.find(
      (b) => b.category === 'peptides' && b.time === '17:00'
    )
    expect(latePeptides).toBeUndefined()
  })

  it('bloodwork block on Monday of week 12', () => {
    // Week 12 Monday = May 25
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 25)), 'home')
    const bloodwork = blocks.find(
      (b) => b.category === 'monitoring' && b.title.includes('Bloodwork')
    )
    expect(bloodwork).toBeDefined()
    expect(bloodwork!.title).toContain('Full Panel #1')
  })

  it('no bloodwork on Tuesday of week 12', () => {
    // Week 12 Tuesday = May 26
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 26)), 'home')
    const bloodwork = blocks.find(
      (b) => b.category === 'monitoring' && b.title.includes('Bloodwork')
    )
    expect(bloodwork).toBeUndefined()
  })

  it('diet break week 10 shows maintenance calories in meal explanation', () => {
    // Week 10 Monday = May 11
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 11)), 'home')
    const meal = blocks.find((b) => b.category === 'nutrition')
    expect(meal).toBeDefined()
    // Diet break info present somewhere in the blocks
    const dietBreakMeal = blocks.find(
      (b) => b.category === 'nutrition' && b.explanation.phaseNote.includes('Diet break')
    )
    // Meal 2+ should have diet break phase note (meal 1 is isotretinoin)
    expect(dietBreakMeal).toBeDefined()
  })

  it('refeed Saturday week 9 has refeed note', () => {
    // Week 9 Saturday = May 9
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 9)), 'home')
    const refeedMeal = blocks.find(
      (b) => b.category === 'nutrition' && b.explanation.phaseNote.includes('Refeed')
    )
    expect(refeedMeal).toBeDefined()
  })

  it('week 22 Sunday generates without errors', () => {
    // Week 22 Sunday = August 9
    const blocks = generateDay(new Date(Date.UTC(2026, 7, 9)), 'home')
    expect(blocks.length).toBeGreaterThan(10)
  })

  it('includes skincare AM and PM blocks', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home')
    const skincare = blocks.filter((b) => b.category === 'skincare')
    expect(skincare.length).toBe(2)
  })

  it('includes sleep blocks', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home')
    const sleep = blocks.filter((b) => b.category === 'sleep')
    expect(sleep.length).toBe(2)
  })

  it('traveling mode shifts training to evening', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'traveling')
    const training = blocks.find((b) => b.category === 'training')
    expect(training).toBeDefined()
    expect(training!.time).toBe('18:00')
  })

  it('home mode has training at 10:30', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home')
    const training = blocks.find((b) => b.category === 'training')
    expect(training).toBeDefined()
    expect(training!.time).toBe('10:30')
  })

  it('week 3 Monday CJC/Ipa uses half dose', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 2, 23)), 'home')
    const cjc = blocks.find((b) => b.title.includes('CJC'))
    expect(cjc).toBeDefined()
    expect(cjc!.title).toContain('100mcg')
  })

  it('week 4 Monday CJC/Ipa uses full dose', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 2, 30)), 'home')
    const cjc = blocks.find((b) => b.title.includes('CJC'))
    expect(cjc).toBeDefined()
    expect(cjc!.title).toContain('200mcg')
  })

  it('isotretinoin meal has warning', () => {
    const blocks = generateDay(new Date(Date.UTC(2026, 4, 5)), 'home')
    const isoMeal = blocks.find((b) => b.mealDetail?.isIsotretinoinMeal)
    expect(isoMeal).toBeDefined()
    expect(isoMeal!.warning).toBeTruthy()
    expect(isoMeal!.warning).toContain('fat')
  })
})
