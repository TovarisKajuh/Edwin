import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';
import {
  detectLocationChange,
  storeLocation,
  getCurrentLocation,
  formatLocationForContext,
  detectAndStoreLocation,
  DEFAULT_LOCATION,
} from '../location';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Location Awareness', () => {
  // ── Detection ─────────────────────────────────────────────────

  describe('detectLocationChange', () => {
    it('should detect "I\'m in Vienna"', () => {
      const loc = detectLocationChange("I'm in Vienna today");
      expect(loc).not.toBeNull();
      expect(loc!.city).toBe('Vienna');
      expect(loc!.country).toBe('Austria');
      expect(loc!.locationType).toBe('work');
    });

    it('should detect "Just landed in Berlin"', () => {
      const loc = detectLocationChange('Just landed in Berlin');
      expect(loc).not.toBeNull();
      expect(loc!.city).toBe('Berlin');
      expect(loc!.country).toBe('Germany');
      expect(loc!.locationType).toBe('travel');
    });

    it('should detect "heading to Maribor"', () => {
      const loc = detectLocationChange('heading to Maribor for the weekend');
      expect(loc).not.toBeNull();
      expect(loc!.city).toBe('Maribor');
      expect(loc!.country).toBe('Slovenia');
    });

    it('should detect "I am in Graz"', () => {
      const loc = detectLocationChange('I am in Graz right now');
      expect(loc).not.toBeNull();
      expect(loc!.city).toBe('Graz');
      expect(loc!.locationType).toBe('home');
    });

    it('should return null for messages without location', () => {
      expect(detectLocationChange('The weather is nice today')).toBeNull();
      expect(detectLocationChange('I need to finish the report')).toBeNull();
      expect(detectLocationChange('Good morning')).toBeNull();
    });

    it('should return null for unknown cities', () => {
      expect(detectLocationChange("I'm in Timbuktu")).toBeNull();
    });

    it('should detect city when mentioned with location indicators', () => {
      const loc = detectLocationChange('I arrived in Salzburg this morning');
      expect(loc).not.toBeNull();
      expect(loc!.city).toBe('Salzburg');
    });

    it('should have high confidence for direct statements', () => {
      const loc = detectLocationChange("I'm in Vienna today");
      expect(loc!.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  // ── Storage & Retrieval ───────────────────────────────────────

  describe('storeLocation / getCurrentLocation', () => {
    it('should return default location when no location stored', () => {
      const loc = getCurrentLocation(store);
      expect(loc.city).toBe('Graz');
      expect(loc.country).toBe('Austria');
      expect(loc.locationType).toBe('home');
    });

    it('should store and retrieve a location', () => {
      storeLocation(store, {
        city: 'Vienna',
        country: 'Austria',
        locationType: 'work',
        confidence: 0.9,
        updatedAt: new Date().toISOString(),
      });

      const loc = getCurrentLocation(store);
      expect(loc.city).toBe('Vienna');
      expect(loc.country).toBe('Austria');
      expect(loc.locationType).toBe('work');
    });

    it('should return the most recent location', () => {
      storeLocation(store, {
        city: 'Vienna',
        country: 'Austria',
        locationType: 'work',
        confidence: 0.9,
        updatedAt: new Date().toISOString(),
      });

      storeLocation(store, {
        city: 'Berlin',
        country: 'Germany',
        locationType: 'travel',
        confidence: 0.9,
        updatedAt: new Date().toISOString(),
      });

      const loc = getCurrentLocation(store);
      expect(loc.city).toBe('Berlin');
    });
  });

  // ── Formatting ────────────────────────────────────────────────

  describe('formatLocationForContext', () => {
    it('should format home location simply', () => {
      const result = formatLocationForContext({
        city: 'Graz',
        country: 'Austria',
        locationType: 'home',
        confidence: 1.0,
        updatedAt: new Date().toISOString(),
      });
      expect(result).toContain('Graz');
      expect(result).toContain('home base');
    });

    it('should note travel with adjustment prompt', () => {
      const result = formatLocationForContext({
        city: 'Berlin',
        country: 'Germany',
        locationType: 'travel',
        confidence: 0.9,
        updatedAt: new Date().toISOString(),
      });
      expect(result).toContain('Berlin');
      expect(result).toContain('traveling');
      expect(result).toContain('adjust');
    });

    it('should note work location', () => {
      const result = formatLocationForContext({
        city: 'Vienna',
        country: 'Austria',
        locationType: 'work',
        confidence: 0.9,
        updatedAt: new Date().toISOString(),
      });
      expect(result).toContain('Vienna');
      expect(result).toContain('work');
    });
  });

  // ── Detect and Store ──────────────────────────────────────────

  describe('detectAndStoreLocation', () => {
    it('should detect, store, and return the location', () => {
      const loc = detectAndStoreLocation(store, "I'm in Vienna for work today");

      expect(loc).not.toBeNull();
      expect(loc!.city).toBe('Vienna');

      // Should be stored
      const current = getCurrentLocation(store);
      expect(current.city).toBe('Vienna');
    });

    it('should return null when no location detected', () => {
      const loc = detectAndStoreLocation(store, 'The weather is nice');
      expect(loc).toBeNull();

      // Should still be default
      const current = getCurrentLocation(store);
      expect(current.city).toBe('Graz');
    });
  });

  // ── Realistic Scenarios ────────────────────────────────────────

  describe('realistic scenarios', () => {
    it('travel sequence', () => {
      // Start in Graz
      let loc = getCurrentLocation(store);
      expect(loc.city).toBe('Graz');

      // Travel to Vienna
      detectAndStoreLocation(store, "I'm heading to Vienna for a meeting");
      loc = getCurrentLocation(store);
      expect(loc.city).toBe('Vienna');
      expect(loc.locationType).toBe('work');

      // Then to Berlin
      detectAndStoreLocation(store, 'Just landed in Berlin');
      loc = getCurrentLocation(store);
      expect(loc.city).toBe('Berlin');
      expect(loc.locationType).toBe('travel');

      // Back home
      detectAndStoreLocation(store, "I'm back in Graz");
      loc = getCurrentLocation(store);
      expect(loc.city).toBe('Graz');
      expect(loc.locationType).toBe('home');
    });

    it('context formatting through a trip', () => {
      // At home
      const homeCtx = formatLocationForContext(getCurrentLocation(store));
      expect(homeCtx).toContain('home base');

      // Vienna work trip
      detectAndStoreLocation(store, "I'm in Vienna");
      const viennaCtx = formatLocationForContext(getCurrentLocation(store));
      expect(viennaCtx).toContain('work');
      expect(viennaCtx).toContain('adjust');
    });
  });
});
