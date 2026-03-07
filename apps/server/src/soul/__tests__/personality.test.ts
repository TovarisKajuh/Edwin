import { describe, it, expect } from 'vitest';
import { getTimeOfDay, getDayType, getTone } from '../personality.js';

describe('getTimeOfDay', () => {
  it('should return early_morning for 5:30', () => {
    expect(getTimeOfDay(5, 30)).toBe('early_morning');
  });

  it('should return morning for 9:00', () => {
    expect(getTimeOfDay(9, 0)).toBe('morning');
  });

  it('should return afternoon for 14:00', () => {
    expect(getTimeOfDay(14, 0)).toBe('afternoon');
  });

  it('should return evening for 19:00', () => {
    expect(getTimeOfDay(19, 0)).toBe('evening');
  });

  it('should return night for 23:00', () => {
    expect(getTimeOfDay(23, 0)).toBe('night');
  });

  it('should return night for 3:00 (early hours)', () => {
    expect(getTimeOfDay(3)).toBe('night');
  });

  it('should return early_morning for hour 6', () => {
    expect(getTimeOfDay(6)).toBe('early_morning');
  });

  it('should return morning for hour 7', () => {
    expect(getTimeOfDay(7)).toBe('morning');
  });
});

describe('getDayType', () => {
  it('should return sunday for 0', () => {
    expect(getDayType(0)).toBe('sunday');
  });

  it('should return saturday for 6', () => {
    expect(getDayType(6)).toBe('saturday');
  });

  it('should return weekday for 1 (Monday)', () => {
    expect(getDayType(1)).toBe('weekday');
  });

  it('should return weekday for 5 (Friday)', () => {
    expect(getDayType(5)).toBe('weekday');
  });
});

describe('getTone', () => {
  it('should return high energy + motivating for early_morning weekday', () => {
    const tone = getTone('early_morning', 'weekday');
    expect(tone.energy).toBe('high');
    expect(tone.style).toBe('motivating');
  });

  it('should return high energy + motivating for morning weekday', () => {
    const tone = getTone('morning', 'weekday');
    expect(tone.energy).toBe('high');
    expect(tone.style).toBe('motivating');
  });

  it('should return low energy + gentle for morning sunday', () => {
    const tone = getTone('morning', 'sunday');
    expect(tone.energy).toBe('low');
    expect(tone.style).toBe('gentle');
  });

  it('should return low energy + gentle for night weekday', () => {
    const tone = getTone('night', 'weekday');
    expect(tone.energy).toBe('low');
    expect(tone.style).toBe('gentle');
  });

  it('should return medium energy + present for afternoon weekday', () => {
    const tone = getTone('afternoon', 'weekday');
    expect(tone.energy).toBe('medium');
    expect(tone.style).toBe('present');
  });

  it('should return medium energy + gentle for evening weekday', () => {
    const tone = getTone('evening', 'weekday');
    expect(tone.energy).toBe('medium');
    expect(tone.style).toBe('gentle');
  });

  it('should always return gentle on sunday regardless of time', () => {
    const times = ['early_morning', 'morning', 'afternoon', 'evening', 'night'] as const;
    for (const time of times) {
      const tone = getTone(time, 'sunday');
      expect(tone.style).toBe('gentle');
      expect(tone.energy).toBe('low');
    }
  });
});
