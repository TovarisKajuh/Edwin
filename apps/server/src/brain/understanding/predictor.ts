/**
 * Behavioral Predictor — Session 15.
 *
 * Predicts what Jan is likely to do or need, based on:
 * - Known patterns (from pattern detector)
 * - Current time/day
 * - Recent mood and behavior
 * - Commitments and pending actions
 *
 * Predictions feed into the reasoning context so Edwin can
 * proactively suggest, intervene, or prepare.
 */

import type { TimeOfDay, DayType } from '@edwin/shared';
import { MemoryStore } from '../../memory/store.js';

export type PredictionType = 'risk' | 'need' | 'mood' | 'timing';

export interface Prediction {
  type: PredictionType;
  description: string;
  confidence: number; // 0..1
  actionable: boolean; // true = Edwin should proactively mention this
  source: string; // which pattern/data drove this prediction
}

/**
 * Generate predictions based on current state and known patterns.
 * Called during context building — must be fast (no Claude calls).
 */
export function generatePredictions(
  store: MemoryStore,
  timeOfDay: TimeOfDay,
  dayType: DayType,
): Prediction[] {
  const predictions: Prediction[] = [];
  const now = new Date();
  const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const hour = now.getHours();

  // Get known patterns and recent observations
  const patterns = store.getObservationsByCategory('pattern', 20);
  const recentFacts = store.getObservationsByCategory('fact', 20);
  const emotions = store.getObservationsByCategory('emotional_state');
  const commitments = store.getObservationsByCategory('commitment');

  // ── Pattern-based predictions ──────────────────────────────────
  for (const pattern of patterns) {
    const content = pattern.content.toLowerCase();

    // Temporal pattern: "skips gym on wednesdays" → predict risk on wednesday
    const dayMatch = matchDayPattern(content, dayName);
    if (dayMatch) {
      predictions.push({
        type: 'risk',
        description: dayMatch.prediction,
        confidence: pattern.confidence * 0.8,
        actionable: true,
        source: pattern.content,
      });
    }

    // Causal pattern: "stress → food delivery" → predict if mood matches trigger
    const causalPred = matchCausalPattern(content, emotions);
    if (causalPred) {
      predictions.push({
        type: 'risk',
        description: causalPred.prediction,
        confidence: pattern.confidence * 0.7,
        actionable: true,
        source: pattern.content,
      });
    }
  }

  // ── Time-based need predictions ────────────────────────────────
  const mealPrediction = predictMealNeed(hour, recentFacts);
  if (mealPrediction) {
    predictions.push(mealPrediction);
  }

  // ── Commitment risk predictions ────────────────────────────────
  for (const commitment of commitments.slice(0, 5)) {
    const commitPred = predictCommitmentRisk(commitment.content, patterns, dayName, timeOfDay);
    if (commitPred) {
      predictions.push(commitPred);
    }
  }

  // ── Mood trajectory predictions ────────────────────────────────
  const moodPred = predictMoodTrajectory(emotions, patterns, timeOfDay);
  if (moodPred) {
    predictions.push(moodPred);
  }

  // Filter low-confidence predictions and deduplicate
  return predictions
    .filter((p) => p.confidence >= 0.4)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5); // Max 5 predictions per context build
}

/**
 * Check if a temporal pattern applies to today's day of the week.
 */
function matchDayPattern(
  patternContent: string,
  today: string,
): { prediction: string } | null {
  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (const day of dayNames) {
    if (patternContent.includes(day) && today === day) {
      // Pattern mentions today — generate prediction
      // Extract the behavior from the pattern
      if (patternContent.includes('skip') || patternContent.includes('avoid') || patternContent.includes('miss')) {
        return { prediction: `Risk: Jan may skip or avoid something today (${day}). Consider preemptive motivation.` };
      }
      if (patternContent.includes('more') || patternContent.includes('better') || patternContent.includes('increase')) {
        return { prediction: `Opportunity: Jan tends to perform better on ${day}s. Leverage this momentum.` };
      }
      // Generic day-specific pattern
      return { prediction: `Pattern active today (${day}): ${patternContent}` };
    }
  }
  return null;
}

/**
 * Check if a causal pattern's trigger condition matches current state.
 */
function matchCausalPattern(
  patternContent: string,
  emotions: Array<{ content: string }>,
): { prediction: string } | null {
  if (emotions.length === 0) return null;
  const recentMood = emotions[0].content.toLowerCase();

  // Pattern like "when stressed, orders food delivery"
  const triggers: Array<{ keywords: string[]; label: string }> = [
    { keywords: ['stress', 'overwhelm', 'pressur'], label: 'stressed' },
    { keywords: ['tired', 'exhaust', 'drained'], label: 'tired' },
    { keywords: ['bored', 'unmotivat'], label: 'bored' },
    { keywords: ['anxious', 'nervous', 'worried'], label: 'anxious' },
    { keywords: ['happy', 'excited', 'energi'], label: 'positive' },
  ];

  for (const trigger of triggers) {
    // Check if pattern mentions this trigger AND mood matches
    const patternMentionsTrigger = trigger.keywords.some((kw) => patternContent.includes(kw));
    const moodMatchesTrigger = trigger.keywords.some((kw) => recentMood.includes(kw));

    if (patternMentionsTrigger && moodMatchesTrigger) {
      return {
        prediction: `Causal risk: Jan is ${trigger.label} — pattern suggests: ${patternContent}`,
      };
    }
  }
  return null;
}

/**
 * Predict if Jan might need a meal based on time and recent mentions.
 */
function predictMealNeed(
  hour: number,
  recentFacts: Array<{ content: string; observed_at: string | null }>,
): Prediction | null {
  // Only predict during meal windows
  const mealWindows = [
    { start: 11, end: 14, meal: 'lunch' },
    { start: 17, end: 20, meal: 'dinner' },
  ];

  const window = mealWindows.find((w) => hour >= w.start && hour <= w.end);
  if (!window) return null;

  // Check if food/eating/cooking was mentioned in last few hours
  const foodKeywords = ['eat', 'food', 'lunch', 'dinner', 'cook', 'meal', 'restaurant', 'order', 'wolt', 'delivery'];
  const recentHours = 3;
  const cutoff = Date.now() - recentHours * 3600000;

  const recentFoodMention = recentFacts.some((f) => {
    const obsTime = f.observed_at ? new Date(f.observed_at).getTime() : 0;
    return obsTime > cutoff && foodKeywords.some((kw) => f.content.toLowerCase().includes(kw));
  });

  if (!recentFoodMention) {
    return {
      type: 'need',
      description: `Jan may not have had ${window.meal} yet. Consider suggesting food.`,
      confidence: 0.5,
      actionable: true,
      source: `No food mentions in last ${recentHours}h during ${window.meal} window`,
    };
  }
  return null;
}

/**
 * Check if a commitment is at risk based on patterns.
 */
function predictCommitmentRisk(
  commitmentContent: string,
  patterns: Array<{ content: string; confidence: number }>,
  today: string,
  _timeOfDay: TimeOfDay,
): Prediction | null {
  const commitLower = commitmentContent.toLowerCase();

  for (const pattern of patterns) {
    const patternLower = pattern.content.toLowerCase();

    // If pattern mentions skipping something that's in the commitment
    const skipWords = ['skip', 'avoid', 'miss', 'forget', 'cancel'];
    const hasSkipPattern = skipWords.some((w) => patternLower.includes(w));

    if (!hasSkipPattern) continue;

    // Check if commitment and pattern share significant words
    const stopWords = new Set([
      'jan', 'the', 'today', 'tomorrow', 'this', 'that', 'will', 'would',
      'said', 'told', 'tends', 'going', 'have', 'has', 'had', 'been',
      'week', 'day', 'time', 'more', 'not', 'does', 'when',
    ]);
    const commitWords = new Set(commitLower.split(/\W+/).filter((w) => w.length > 2 && !stopWords.has(w)));
    const patternWords = new Set(patternLower.split(/\W+/).filter((w) => w.length > 2 && !stopWords.has(w)));
    let overlap = 0;
    for (const w of commitWords) {
      if (patternWords.has(w)) overlap++;
    }

    if (overlap >= 1) {
      // Check if pattern is day-specific and matches today
      const daySpecific = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        .some((d) => patternLower.includes(d));

      if (daySpecific && !patternLower.includes(today)) continue; // Day-specific but not today

      return {
        type: 'risk',
        description: `Commitment at risk: "${commitmentContent}" — pattern says: ${pattern.content}`,
        confidence: pattern.confidence * 0.7,
        actionable: true,
        source: pattern.content,
      };
    }
  }
  return null;
}

/**
 * Predict mood trajectory based on current mood and patterns.
 */
function predictMoodTrajectory(
  emotions: Array<{ content: string }>,
  patterns: Array<{ content: string; confidence: number }>,
  timeOfDay: TimeOfDay,
): Prediction | null {
  if (emotions.length === 0) return null;
  const recentMood = emotions[0].content.toLowerCase();

  // Check for mood-related trends in patterns
  for (const pattern of patterns) {
    const patternLower = pattern.content.toLowerCase();

    if (patternLower.includes('mood') && patternLower.includes('declin')) {
      return {
        type: 'mood',
        description: 'Mood trend is declining. Consider checking in warmly.',
        confidence: pattern.confidence * 0.6,
        actionable: true,
        source: pattern.content,
      };
    }

    if (patternLower.includes('mood') && (patternLower.includes('improv') || patternLower.includes('better'))) {
      return {
        type: 'mood',
        description: 'Mood trend is improving. Maintain positive momentum.',
        confidence: pattern.confidence * 0.6,
        actionable: false,
        source: pattern.content,
      };
    }
  }

  // If currently stressed/negative + evening → predict bad night if no exercise
  if (timeOfDay === 'evening') {
    const negativeKeywords = ['stress', 'frustrat', 'anxious', 'overwhelm'];
    const isNegative = negativeKeywords.some((kw) => recentMood.includes(kw));

    if (isNegative) {
      return {
        type: 'mood',
        description: 'Jan is in a negative state going into the evening. Suggest unwinding activity.',
        confidence: 0.5,
        actionable: true,
        source: 'Negative mood + evening timing',
      };
    }
  }

  return null;
}

/**
 * Format predictions for inclusion in the reasoning brief.
 */
export function formatPredictions(predictions: Prediction[]): string[] {
  if (predictions.length === 0) return [];

  return predictions
    .filter((p) => p.actionable)
    .map((p) => {
      const conf = Math.round(p.confidence * 100);
      return `[${conf}%] ${p.description}`;
    });
}
