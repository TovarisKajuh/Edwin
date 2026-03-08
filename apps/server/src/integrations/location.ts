/**
 * Location Awareness — Session 28.
 *
 * Edwin knows where Jan is. Not GPS — conversational location awareness.
 * "I'm in Vienna today" → Edwin adjusts weather, suggestions, tone.
 * Default: Graz, Austria (home base).
 *
 * Location is stored as an observation and retrieved on demand.
 * The most recent location observation is considered current.
 */

import { MemoryStore } from '../memory/store.js';

// ── Types ────────────────────────────────────────────────────────

export interface KnownLocation {
  city: string;
  country: string;
  locationType: 'home' | 'work' | 'travel' | 'unknown';
  confidence: number;
  updatedAt: string;
}

// ── Known Locations ──────────────────────────────────────────────

export const DEFAULT_LOCATION: KnownLocation = {
  city: 'Graz',
  country: 'Austria',
  locationType: 'home',
  confidence: 0.5,
  updatedAt: new Date().toISOString(),
};

// Cities Jan is likely to visit (for inference)
const KNOWN_CITIES: Record<string, { country: string; locationType: 'home' | 'work' | 'travel' }> = {
  'graz': { country: 'Austria', locationType: 'home' },
  'vienna': { country: 'Austria', locationType: 'work' },
  'wien': { country: 'Austria', locationType: 'work' },
  'maribor': { country: 'Slovenia', locationType: 'travel' },
  'berlin': { country: 'Germany', locationType: 'travel' },
  'munich': { country: 'Germany', locationType: 'travel' },
  'münchen': { country: 'Germany', locationType: 'travel' },
  'zurich': { country: 'Switzerland', locationType: 'travel' },
  'zürich': { country: 'Switzerland', locationType: 'travel' },
  'salzburg': { country: 'Austria', locationType: 'travel' },
  'innsbruck': { country: 'Austria', locationType: 'travel' },
  'linz': { country: 'Austria', locationType: 'travel' },
  'ljubljana': { country: 'Slovenia', locationType: 'travel' },
  'zagreb': { country: 'Croatia', locationType: 'travel' },
  'budapest': { country: 'Hungary', locationType: 'travel' },
  'prague': { country: 'Czech Republic', locationType: 'travel' },
  'bratislava': { country: 'Slovakia', locationType: 'travel' },
};

// ── Location Detection ───────────────────────────────────────────

/**
 * Try to detect a location change from a user message.
 * Returns the new location if detected, null otherwise.
 */
export function detectLocationChange(message: string): KnownLocation | null {
  const lower = message.toLowerCase();

  // Direct location statements
  const patterns = [
    /(?:i'?m|i am|we'?re|we are|just arrived|just landed|heading to|going to|staying in|in)\s+(\w+(?:\s+\w+)?)\s*(?:today|tonight|now|right now|at the moment)?/i,
    /(?:at|in)\s+(\w+(?:\s+\w+)?)\s+(?:right now|at the moment|today|currently)/i,
    /(?:traveling|travelling|flying|driving|going)\s+to\s+(\w+(?:\s+\w+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const cityCandidate = match[1].toLowerCase().trim();
      const known = KNOWN_CITIES[cityCandidate];
      if (known) {
        return {
          city: cityCandidate.charAt(0).toUpperCase() + cityCandidate.slice(1),
          country: known.country,
          locationType: known.locationType,
          confidence: 0.9,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  }

  // Check if any known city is mentioned in the message
  for (const [city, info] of Object.entries(KNOWN_CITIES)) {
    if (lower.includes(city)) {
      // Only trigger on likely location-indicating contexts
      const locationIndicators = ['in ', 'at ', 'to ', 'from ', 'arrived', 'landed', 'staying', 'visiting'];
      const hasIndicator = locationIndicators.some((ind) => {
        const idx = lower.indexOf(city);
        const before = lower.slice(Math.max(0, idx - 15), idx);
        return before.includes(ind);
      });

      if (hasIndicator) {
        return {
          city: city.charAt(0).toUpperCase() + city.slice(1),
          country: info.country,
          locationType: info.locationType,
          confidence: 0.7,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  }

  return null;
}

/**
 * Store a location change as an observation.
 */
export function storeLocation(store: MemoryStore, location: KnownLocation): void {
  const content = `Jan is currently in ${location.city}, ${location.country} (${location.locationType})`;
  store.addObservation('location', content, location.confidence, location.confidence >= 0.9 ? 'told' : 'inferred');
}

/**
 * Get Jan's current known location from memory.
 */
export function getCurrentLocation(store: MemoryStore): KnownLocation {
  const locationObs = store.getObservationsByCategory('location', 1);

  if (locationObs.length === 0) {
    return DEFAULT_LOCATION;
  }

  const latest = locationObs[0];
  return parseLocationObservation(latest.content, latest.observed_at);
}

/**
 * Parse a stored location observation back into a KnownLocation.
 */
function parseLocationObservation(content: string, observedAt: string): KnownLocation {
  // Format: "Jan is currently in City, Country (type)"
  const match = content.match(/in\s+(.+),\s+(.+)\s+\((\w+)\)/);
  if (!match) return { ...DEFAULT_LOCATION, updatedAt: observedAt };

  return {
    city: match[1],
    country: match[2],
    locationType: match[3] as KnownLocation['locationType'],
    confidence: 0.8,
    updatedAt: observedAt,
  };
}

/**
 * Format location for Claude's context.
 */
export function formatLocationForContext(location: KnownLocation): string {
  const atHome = location.locationType === 'home';
  if (atHome) {
    return `[LOCATION] ${location.city}, ${location.country} (home base)`;
  }

  const type = location.locationType === 'work' ? 'for work' : 'traveling';
  return `[LOCATION] ${location.city}, ${location.country} (${type}) — adjust suggestions accordingly`;
}

/**
 * Detect and store location from a message automatically.
 * Called from the pipeline for every user message.
 */
export function detectAndStoreLocation(store: MemoryStore, message: string): KnownLocation | null {
  const location = detectLocationChange(message);
  if (location) {
    storeLocation(store, location);
    return location;
  }
  return null;
}
