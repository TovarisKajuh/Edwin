/**
 * Pattern Detector — Session 14.
 *
 * Detects behavioral patterns from observations over time:
 * - Temporal: "Jan skips gym on Wednesdays"
 * - Causal: "stress → Wolt ordering"
 * - Absence: "hasn't mentioned friends in 2 weeks"
 * - Trends: "gym attendance declining"
 *
 * Runs as a daily cron. Uses Claude (Haiku) to analyze observations
 * and detect patterns a rule-based system would miss.
 */

import { MemoryStore } from '../../memory/store.js';
import { callClaude } from '../reasoning.js';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

export interface DetectedPattern {
  type: 'temporal' | 'causal' | 'absence' | 'trend';
  description: string;
  confidence: number;
}

/**
 * Detect patterns from the last N days of observations.
 * Runs daily — analyzes recent observations to find behavioral patterns.
 */
export async function detectPatterns(
  store: MemoryStore,
  daysBack: number = 7,
): Promise<DetectedPattern[]> {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);

  const observations = store.getObservationsByDateRange(startDate, endDate);

  // Need at least 5 observations to detect meaningful patterns
  if (observations.length < 5) {
    return [];
  }

  // Get existing patterns to avoid duplicates
  const existingPatterns = store.getObservationsByCategory('pattern', 50);
  const existingDescriptions = existingPatterns.map((p) => p.content.toLowerCase());

  // Format observations for Claude
  const obsLines = observations.map((o) => {
    const date = o.observed_at ? o.observed_at.slice(0, 10) : 'unknown';
    const day = o.observed_at ? new Date(o.observed_at).toLocaleDateString('en-GB', { weekday: 'short' }) : '';
    return `[${date} ${day}] (${o.category}) ${o.content}`;
  });

  const prompt = [
    `Analyze these observations about Jan from the last ${daysBack} days and detect behavioral patterns.`,
    '',
    'Observations:',
    ...obsLines,
    '',
    'Look for:',
    '1. TEMPORAL: Things that happen at specific times/days (e.g., "skips gym on Wednesdays")',
    '2. CAUSAL: A leads to B (e.g., "stress leads to food delivery orders")',
    '3. ABSENCE: Things that haven\'t happened but should (e.g., "hasn\'t mentioned exercise in a week")',
    '4. TREND: Directional changes (e.g., "mood has been declining", "gym attendance increasing")',
    '',
    'Rules:',
    '- Only report patterns you see EVIDENCE for in the data. Do not speculate.',
    '- A pattern needs at least 2 data points.',
    '- Be specific — "skips gym on Wednesdays" not "sometimes skips gym".',
    '- Each pattern is one concise sentence.',
    '',
    existingDescriptions.length > 0
      ? `Already known patterns (do NOT repeat these):\n${existingDescriptions.map((d) => `- ${d}`).join('\n')}\n`
      : '',
    'Respond in this exact format (one pattern per line, no other text):',
    'TYPE|CONFIDENCE|DESCRIPTION',
    '',
    'Example:',
    'temporal|0.8|Jan tends to skip the gym on Wednesdays',
    'causal|0.7|When Jan is stressed, he orders food delivery instead of cooking',
    '',
    'If no patterns are detected, respond with: NONE',
  ].join('\n');

  const response = await callClaude(
    'You are a behavioral pattern analyzer. Be precise and evidence-based. Output only the requested format.',
    [{ role: 'user', content: prompt }],
    { model: HAIKU_MODEL, maxTokens: 512 },
  );

  return parsePatternResponse(response, existingDescriptions);
}

/** Stop words to ignore when comparing pattern similarity. */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'about', 'than',
  'that', 'this', 'it', 'and', 'or', 'but', 'not', 'no', 'so', 'if',
  'he', 'his', 'him', 'jan', 'tends', 'seems', 'appears',
]);

/** Strip basic English suffixes to normalize words for comparison. */
function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 3 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/**
 * Jaccard similarity on stemmed significant words.
 * Returns 0..1 — higher means more similar.
 * Threshold of 0.4 catches rephrases while allowing genuinely different patterns.
 */
function wordSimilarity(a: string, b: string): number {
  const extract = (s: string) => new Set(
    s.split(/\W+/).map(stem).filter((w) => w.length > 1 && !STOP_WORDS.has(w)),
  );
  const wordsA = extract(a);
  const wordsB = extract(b);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  return intersection / (wordsA.size + wordsB.size - intersection);
}

/**
 * Parse Claude's pattern response into structured DetectedPattern objects.
 */
function parsePatternResponse(response: string, existingDescriptions: string[]): DetectedPattern[] {
  if (response.trim() === 'NONE' || response.includes('lost my words')) {
    return [];
  }

  const patterns: DetectedPattern[] = [];
  const lines = response.trim().split('\n');

  for (const line of lines) {
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length !== 3) continue;

    const [typeStr, confStr, description] = parts;
    const type = typeStr.toLowerCase() as DetectedPattern['type'];
    const confidence = parseFloat(confStr);

    if (!['temporal', 'causal', 'absence', 'trend'].includes(type)) continue;
    if (isNaN(confidence) || confidence < 0.5) continue;
    if (!description || description.length < 10) continue;

    // Skip if too similar to existing pattern (word-overlap similarity)
    const descLower = description.toLowerCase();
    if (existingDescriptions.some((e) => wordSimilarity(e, descLower) >= 0.4)) continue;

    patterns.push({ type, description, confidence });
  }

  return patterns;
}

/**
 * Run pattern detection and store results.
 * Called by the daily cron job.
 */
export async function detectAndStorePatterns(
  store: MemoryStore,
  daysBack: number = 7,
): Promise<number> {
  const patterns = await detectPatterns(store, daysBack);

  for (const pattern of patterns) {
    // Check deduplication
    if (!store.hasRecentObservation('pattern', pattern.description)) {
      store.addObservation('pattern', pattern.description, pattern.confidence, 'inferred');
    }
  }

  return patterns.length;
}
