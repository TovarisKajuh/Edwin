import { describe, it, expect } from 'vitest'
import { getSupplementsForTimeSlot } from '@/lib/supplements-for-day'

// Helper: build Date from UTC values
function utc(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d))
}

// Key dates (protocol starts week 3, Monday March 23 2026):
// Week 3 Mon = March 23, Tue = March 24, Wed = March 25, Thu = March 26
// Week 4 Mon = March 30
// Week 5 Mon = April 6
// Week 7 Mon = April 20, Thu = April 23
// Week 9 Mon = May 4
// Weekend: Sat March 28 (week 3), Sun March 29 (week 3)

describe('getSupplementsForTimeSlot', () => {
  // ─── Yohimbine ─────────────────────────────────────────────
  describe('yohimbine dosing', () => {
    it('caps at 5mg on traveling day regardless of week', () => {
      const result = getSupplementsForTimeSlot('fasted_am', 9, 'traveling', 1, utc(2026, 5, 4))
      const yoh = result.find(s => s.name === 'Yohimbine HCL')
      expect(yoh).toBeDefined()
      expect(yoh!.dose).toBe('5mg')
    })

    it('returns safety-capped dose on home day week 9 (86.5kg * 0.2 = 17)', () => {
      const result = getSupplementsForTimeSlot('fasted_am', 9, 'home', 1, utc(2026, 5, 4))
      const yoh = result.find(s => s.name === 'Yohimbine HCL')
      expect(yoh).toBeDefined()
      expect(yoh!.dose).toBe('17mg')
    })

    it('returns 5mg for week 3 home day', () => {
      const result = getSupplementsForTimeSlot('fasted_am', 3, 'home', 1, utc(2026, 3, 23))
      const yoh = result.find(s => s.name === 'Yohimbine HCL')
      expect(yoh!.dose).toBe('5mg')
    })

    it('includes TUDCA in fasted_am slot', () => {
      const result = getSupplementsForTimeSlot('fasted_am', 3, 'home', 1, utc(2026, 3, 23))
      const tudca = result.find(s => s.name === 'TUDCA')
      expect(tudca).toBeDefined()
      expect(tudca!.dose).toBe('500mg')
    })
  })

  // ─── CJC-1295 / Ipamorelin ────────────────────────────────
  describe('CJC-1295 / Ipamorelin', () => {
    it('excluded on weekends', () => {
      // Saturday March 28 (week 3, dayOfWeek 6)
      const result = getSupplementsForTimeSlot('pre_bed', 3, 'home', 6, utc(2026, 3, 28))
      const cjc = result.find(s => s.name === 'CJC-1295 no DAC')
      const ipa = result.find(s => s.name === 'Ipamorelin')
      expect(cjc).toBeUndefined()
      expect(ipa).toBeUndefined()
    })

    it('included on weekdays', () => {
      // Wednesday March 25 (week 3, dayOfWeek 3)
      const result = getSupplementsForTimeSlot('pre_bed', 3, 'home', 3, utc(2026, 3, 25))
      const cjc = result.find(s => s.name === 'CJC-1295 no DAC')
      const ipa = result.find(s => s.name === 'Ipamorelin')
      expect(cjc).toBeDefined()
      expect(ipa).toBeDefined()
    })

    it('half dose (100mcg) for first 3 days of week 3', () => {
      // Monday March 23 = protocol day 1
      const result = getSupplementsForTimeSlot('pre_bed', 3, 'home', 1, utc(2026, 3, 23))
      const cjc = result.find(s => s.name === 'CJC-1295 no DAC')
      const ipa = result.find(s => s.name === 'Ipamorelin')
      expect(cjc!.dose).toBe('100mcg SubQ')
      expect(ipa!.dose).toBe('100mcg SubQ')
    })

    it('half dose on day 3 of week 3 (Wednesday March 25)', () => {
      // Wednesday March 25 = protocol day 3
      const result = getSupplementsForTimeSlot('pre_bed', 3, 'home', 3, utc(2026, 3, 25))
      const cjc = result.find(s => s.name === 'CJC-1295 no DAC')
      expect(cjc!.dose).toBe('100mcg SubQ')
    })

    it('full dose on day 4 of week 3 (Thursday March 26)', () => {
      // Thursday March 26 = protocol day 4
      const result = getSupplementsForTimeSlot('pre_bed', 3, 'home', 4, utc(2026, 3, 26))
      const cjc = result.find(s => s.name === 'CJC-1295 no DAC')
      expect(cjc!.dose).toBe('200mcg SubQ')
    })

    it('full dose in week 4', () => {
      // Monday March 30 = week 4, protocol day 8
      const result = getSupplementsForTimeSlot('pre_bed', 4, 'home', 1, utc(2026, 3, 30))
      const cjc = result.find(s => s.name === 'CJC-1295 no DAC')
      expect(cjc!.dose).toBe('200mcg SubQ')
    })

    it('magnesium and glycine present even on weekends', () => {
      // Sunday March 29 (weekend)
      const result = getSupplementsForTimeSlot('pre_bed', 3, 'home', 7, utc(2026, 3, 29))
      const mag = result.find(s => s.name === 'Magnesium Glycinate')
      const gly = result.find(s => s.name === 'Glycine')
      expect(mag).toBeDefined()
      expect(gly).toBeDefined()
      expect(mag!.dose).toBe('400mg')
      expect(gly!.dose).toBe('3g')
    })
  })

  // ─── TB-500 ────────────────────────────────────────────────
  describe('TB-500', () => {
    it('present on Thursday during loading phase (weeks 3-6)', () => {
      // Thursday March 26 (week 3, dayOfWeek 4)
      const result = getSupplementsForTimeSlot('late_afternoon', 3, 'home', 4, utc(2026, 3, 26))
      const tb = result.find(s => s.name === 'TB-500')
      expect(tb).toBeDefined()
      expect(tb!.dose).toBe('2.5mg SubQ')
    })

    it('present on Monday during loading phase (weeks 3-6)', () => {
      // Monday March 23 (week 3, dayOfWeek 1)
      const result = getSupplementsForTimeSlot('late_afternoon', 3, 'home', 1, utc(2026, 3, 23))
      const tb = result.find(s => s.name === 'TB-500')
      expect(tb).toBeDefined()
    })

    it('excluded on Thursday after loading phase (week 7+)', () => {
      // Thursday April 23 (week 7, dayOfWeek 4)
      const result = getSupplementsForTimeSlot('late_afternoon', 7, 'home', 4, utc(2026, 4, 23))
      const tb = result.find(s => s.name === 'TB-500')
      expect(tb).toBeUndefined()
    })

    it('present on Monday after loading phase (week 7+)', () => {
      // Monday April 20 (week 7, dayOfWeek 1)
      const result = getSupplementsForTimeSlot('late_afternoon', 7, 'home', 1, utc(2026, 4, 20))
      const tb = result.find(s => s.name === 'TB-500')
      expect(tb).toBeDefined()
    })

    it('excluded on weekends', () => {
      // Saturday March 28 (weekend, dayOfWeek 6)
      const result = getSupplementsForTimeSlot('late_afternoon', 3, 'home', 6, utc(2026, 3, 28))
      expect(result).toHaveLength(0)
    })
  })

  // ─── Zinc alternating ─────────────────────────────────────
  describe('zinc alternating days', () => {
    it('present on odd protocol days (day 1 = March 23)', () => {
      // March 23 = protocol day 1 (odd)
      const result = getSupplementsForTimeSlot('with_meal_1', 3, 'home', 1, utc(2026, 3, 23))
      const zinc = result.find(s => s.name === 'Zinc')
      expect(zinc).toBeDefined()
      expect(zinc!.dose).toBe('50mg')
    })

    it('absent on even protocol days (day 2 = March 24)', () => {
      // March 24 = protocol day 2 (even)
      const result = getSupplementsForTimeSlot('with_meal_1', 3, 'home', 2, utc(2026, 3, 24))
      const zinc = result.find(s => s.name === 'Zinc')
      expect(zinc).toBeUndefined()
    })

    it('present on day 3 (March 25)', () => {
      const result = getSupplementsForTimeSlot('with_meal_1', 3, 'home', 3, utc(2026, 3, 25))
      const zinc = result.find(s => s.name === 'Zinc')
      expect(zinc).toBeDefined()
    })
  })

  // ─── BPC-157 every day ────────────────────────────────────
  describe('BPC-157', () => {
    it('present on weekdays (post_cardio)', () => {
      const result = getSupplementsForTimeSlot('post_cardio', 3, 'home', 1, utc(2026, 3, 23))
      const bpc = result.find(s => s.name === 'BPC-157')
      expect(bpc).toBeDefined()
      expect(bpc!.dose).toBe('250mcg SubQ')
    })

    it('present on weekends (post_cardio)', () => {
      // Saturday March 28
      const result = getSupplementsForTimeSlot('post_cardio', 3, 'home', 6, utc(2026, 3, 28))
      const bpc = result.find(s => s.name === 'BPC-157')
      expect(bpc).toBeDefined()
    })

    it('present on Sunday (post_cardio)', () => {
      // Sunday March 29
      const result = getSupplementsForTimeSlot('post_cardio', 3, 'home', 7, utc(2026, 3, 29))
      const bpc = result.find(s => s.name === 'BPC-157')
      expect(bpc).toBeDefined()
    })
  })

  // ─── Enclomiphene weekday-only ────────────────────────────
  describe('enclomiphene', () => {
    it('present on weekdays', () => {
      const result = getSupplementsForTimeSlot('with_meal_1', 3, 'home', 1, utc(2026, 3, 23))
      const enc = result.find(s => s.name === 'Enclomiphene')
      expect(enc).toBeDefined()
      expect(enc!.dose).toBe('12.5mg sublingual')
    })

    it('excluded on Saturday', () => {
      const result = getSupplementsForTimeSlot('with_meal_1', 3, 'home', 6, utc(2026, 3, 28))
      const enc = result.find(s => s.name === 'Enclomiphene')
      expect(enc).toBeUndefined()
    })

    it('excluded on Sunday', () => {
      const result = getSupplementsForTimeSlot('with_meal_1', 3, 'home', 7, utc(2026, 3, 29))
      const enc = result.find(s => s.name === 'Enclomiphene')
      expect(enc).toBeUndefined()
    })
  })

  // ─── Meal slot supplements ────────────────────────────────
  describe('meal slot supplements', () => {
    it('with_meal_3 includes HMB and Berberine', () => {
      const result = getSupplementsForTimeSlot('with_meal_3', 3, 'home', 1, utc(2026, 3, 23))
      expect(result).toHaveLength(2)
      expect(result.map(s => s.name)).toContain('HMB')
      expect(result.map(s => s.name)).toContain('Berberine')
    })

    it('with_meal_4 includes HMB and Berberine', () => {
      const result = getSupplementsForTimeSlot('with_meal_4', 3, 'home', 1, utc(2026, 3, 23))
      expect(result).toHaveLength(2)
      expect(result.map(s => s.name)).toContain('HMB')
      expect(result.map(s => s.name)).toContain('Berberine')
    })

    it('with_meal_5 includes NAC only', () => {
      const result = getSupplementsForTimeSlot('with_meal_5', 3, 'home', 1, utc(2026, 3, 23))
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('NAC')
      expect(result[0].dose).toBe('600mg')
    })
  })

  // ─── Late afternoon weekday compounds ─────────────────────
  describe('late_afternoon', () => {
    it('includes BPC-157 and GHK-Cu on weekdays', () => {
      const result = getSupplementsForTimeSlot('late_afternoon', 5, 'home', 3, utc(2026, 4, 8))
      const bpc = result.find(s => s.name === 'BPC-157')
      const ghk = result.find(s => s.name === 'GHK-Cu')
      expect(bpc).toBeDefined()
      expect(ghk).toBeDefined()
      expect(ghk!.dose).toBe('1.5mg SubQ')
    })

    it('empty on weekends', () => {
      const result = getSupplementsForTimeSlot('late_afternoon', 5, 'home', 6, utc(2026, 4, 11))
      expect(result).toHaveLength(0)
    })
  })
})
