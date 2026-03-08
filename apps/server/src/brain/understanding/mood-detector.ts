import { MemoryStore } from '../../memory/store.js';

/**
 * Real-time mood detection from Jan's messages.
 * Rule-based, no Claude call — runs instantly on every message.
 * Stores detected mood as emotional_state observation.
 */

export type Mood =
  | 'energized'
  | 'neutral'
  | 'tired'
  | 'stressed'
  | 'frustrated'
  | 'excited'
  | 'low'
  | 'overwhelmed';

export interface MoodSignal {
  mood: Mood;
  confidence: number;
  reason: string;
}

// ── Signal Patterns ─────────────────────────────────────────────

const EXPLICIT_MOOD_PATTERNS: { pattern: RegExp; mood: Mood; confidence: number }[] = [
  // Explicit statements
  { pattern: /\b(i'?m|feeling|feel)\s+(tired|exhausted|drained|wiped)\b/i, mood: 'tired', confidence: 0.9 },
  { pattern: /\b(i'?m|feeling|feel)\s+(stressed|anxious|tense|worried)\b/i, mood: 'stressed', confidence: 0.9 },
  { pattern: /\b(i'?m|feeling|feel)\s+(great|amazing|fantastic|wonderful|awesome)\b/i, mood: 'energized', confidence: 0.9 },
  { pattern: /\b(i'?m|feeling|feel)\s+(frustrated|annoyed|pissed|angry|mad)\b/i, mood: 'frustrated', confidence: 0.9 },
  { pattern: /\b(i'?m|feeling|feel)\s+(excited|pumped|hyped|fired up)\b/i, mood: 'excited', confidence: 0.9 },
  { pattern: /\b(i'?m|feeling|feel)\s+(overwhelmed|swamped|buried)\b/i, mood: 'overwhelmed', confidence: 0.9 },
  { pattern: /\b(i'?m|feeling|feel)\s+(down|low|sad|meh|blah)\b/i, mood: 'low', confidence: 0.85 },

  // Emotional keywords
  { pattern: /\b(ugh+|argh+|ffs|fuck|shit|damn)\b/i, mood: 'frustrated', confidence: 0.75 },
  { pattern: /\b(let'?s go|hell yeah|bring it|game on|ready)\b/i, mood: 'energized', confidence: 0.8 },
  { pattern: /\b(whatever|don'?t care|can'?t be bothered|who cares)\b/i, mood: 'low', confidence: 0.7 },
  { pattern: /\b(too much|can'?t handle|drowning|so much to do)\b/i, mood: 'overwhelmed', confidence: 0.8 },
  { pattern: /\b(couldn'?t sleep|insomnia|barely slept|up all night)\b/i, mood: 'tired', confidence: 0.85 },
];

const POSITIVE_EMOJIS = /(?:😊|😄|😃|🎉|🔥|💪|🙌|✨|🚀|😁|😎|🤩)/u;
const NEGATIVE_EMOJIS = /(?:😤|😞|😢|😩|😫|😡|🤬|😔|😰|😥)/u;
const TIRED_EMOJIS = /(?:😴|🥱|😪|💤)/u;

/**
 * Detect mood from a single message. Returns null if no clear signal.
 */
export function detectMood(message: string): MoodSignal | null {
  // 1. Check explicit mood patterns (highest priority)
  for (const { pattern, mood, confidence } of EXPLICIT_MOOD_PATTERNS) {
    if (pattern.test(message)) {
      return { mood, confidence, reason: `Explicit pattern: "${message.slice(0, 50)}"` };
    }
  }

  // 2. Check emoji signals
  if (TIRED_EMOJIS.test(message)) {
    return { mood: 'tired', confidence: 0.7, reason: 'Tired emoji detected' };
  }
  if (NEGATIVE_EMOJIS.test(message)) {
    return { mood: 'frustrated', confidence: 0.65, reason: 'Negative emoji detected' };
  }
  if (POSITIVE_EMOJIS.test(message)) {
    return { mood: 'energized', confidence: 0.65, reason: 'Positive emoji detected' };
  }

  // 3. Check message length/energy signals
  const wordCount = message.trim().split(/\s+/).length;
  const hasUppercase = /[A-Z]{3,}/.test(message); // SHOUTING
  const hasExclamation = (message.match(/!/g) || []).length;

  // Very short replies suggest low engagement
  if (wordCount <= 2 && !hasExclamation) {
    return { mood: 'low', confidence: 0.5, reason: 'Very short reply' };
  }

  // ALL CAPS with exclamation = energized or frustrated
  if (hasUppercase && hasExclamation >= 2) {
    // Could be either — lean toward energized if positive words present
    if (/\b(yes|go|let|amazing|great)\b/i.test(message)) {
      return { mood: 'energized', confidence: 0.7, reason: 'Enthusiastic caps + exclamation' };
    }
    return { mood: 'frustrated', confidence: 0.6, reason: 'Caps + exclamation' };
  }

  // Multiple exclamation marks = high energy
  if (hasExclamation >= 3) {
    return { mood: 'excited', confidence: 0.6, reason: 'Multiple exclamation marks' };
  }

  return null;
}

/**
 * Detect mood and store it as an observation if significant.
 * Called on every message from Jan in the pipeline.
 */
export function detectAndStoreMood(
  store: MemoryStore,
  message: string,
): MoodSignal | null {
  const signal = detectMood(message);
  if (!signal) return null;

  // Only store if confidence is high enough
  if (signal.confidence < 0.6) return signal;

  // Format the mood description for storage
  const moodDescription = formatMoodDescription(signal.mood, message);

  // Dedup: don't store if we just detected the same mood
  if (!store.hasRecentObservation('emotional_state', moodDescription)) {
    store.addObservation(
      'emotional_state',
      moodDescription,
      signal.confidence,
      'inferred',
    );
  }

  return signal;
}

function formatMoodDescription(mood: Mood, _message: string): string {
  switch (mood) {
    case 'energized': return 'Jan seems energized and motivated';
    case 'excited': return 'Jan is excited';
    case 'neutral': return 'Jan seems neutral';
    case 'tired': return 'Jan seems tired';
    case 'stressed': return 'Jan seems stressed';
    case 'frustrated': return 'Jan seems frustrated';
    case 'low': return 'Jan seems low energy or disengaged';
    case 'overwhelmed': return 'Jan feels overwhelmed';
  }
}
