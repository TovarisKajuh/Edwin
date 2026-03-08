/**
 * Emotional Intelligence Engine — Session 39 (upgraded).
 *
 * Edwin's emotional intelligence synthesizes mood, patterns, predictions,
 * and context to decide HOW to respond — not just what to say.
 *
 * Response modes:
 *   - Push: Jan is avoiding, needs accountability
 *   - Support: Jan is struggling, needs empathy first then help
 *   - Celebrate: Jan accomplished something, amplify the win
 *   - Distract: Jan is spiraling, break the pattern
 *   - Be present: Jan needs company, not advice
 *   - Be quiet: Jan needs space
 *
 * Mode selection is based on emotional trajectory + contextual message analysis.
 * Keyword matching uses multi-word phrases to avoid false positives.
 */

import { MemoryStore } from '../../memory/store.js';

// ── Types ────────────────────────────────────────────────────────

export type EmotionalMode = 'push' | 'support' | 'celebrate' | 'distract' | 'present' | 'quiet';

export interface EmotionalAssessment {
  currentMood: string | null;
  trajectory: 'improving' | 'stable_good' | 'stable_bad' | 'declining' | 'unknown';
  mode: EmotionalMode;
  reason: string;
  directive: string;  // instruction for Claude
  confidence: number; // 0-1
}

// ── Mood Keywords (for trajectory scoring) ──────────────────────

const NEGATIVE_MOODS = [
  'stress', 'overwhelm', 'anxious', 'anxiety', 'nervous', 'worried',
  'angry', 'furious', 'frustrat', 'annoyed', 'irritat', 'fed up',
  'sad', 'down', 'depress', 'low', 'miserable', 'unhappy',
  'lonely', 'isolat', 'disconnected',
  'tired', 'exhaust', 'drained', 'fatigue', 'burnt out', 'burnout',
  'bored', 'restless', 'unmotivat', 'apathetic',
  'distract', 'scatter', 'unfocus',
];

const POSITIVE_MOODS = [
  'energi', 'excited', 'great', 'pumped', 'fired up', 'motivated',
  'happy', 'good', 'positive', 'cheerful', 'upbeat',
  'calm', 'relaxed', 'peaceful', 'content', 'steady',
  'confident', 'proud', 'accomplished',
  'grateful', 'thankful', 'appreciat',
];

// ── Context-Aware Message Patterns ──────────────────────────────
// Multi-word phrases to avoid false positives like "lost weight" → struggle

/**
 * Achievement: Jan is sharing a WIN. These are phrases that almost
 * always indicate success, not ambiguous single words.
 */
const ACHIEVEMENT_PATTERNS = [
  // Explicit win verbs with context
  'i closed', 'i signed', 'i landed', 'i won', 'i got the', 'i nailed',
  'i crushed', 'i passed', 'i achieved', 'i finished', 'i completed',
  'i shipped', 'i launched', 'i sold',
  // Result phrases
  'just closed', 'just signed', 'just landed', 'just got the',
  'deal is done', 'contract signed', 'got the promotion', 'got promoted',
  'hit my target', 'hit the target', 'hit my goal',
  'personal best', 'new record', 'new pb',
  'day streak', 'week streak', 'month streak',
  // Emotional celebration
  'did it!', 'we did it', 'finally did it', 'made it happen',
  'biggest deal', 'biggest contract', 'biggest win',
];

/**
 * Spiral: Jan is catastrophising or in a negative thought loop.
 * These phrases indicate generalised hopelessness, not just a bad day.
 */
const SPIRAL_PATTERNS = [
  'everything is falling apart', 'nothing ever works', 'what\'s the point',
  'why even bother', 'why even try', 'all falling apart',
  'can\'t do anything right', 'hopeless', 'never going to make it',
  'always fail', 'never succeed', 'it\'s impossible',
  'i give up', 'i want to give up', 'want to quit everything',
  'nothing matters', 'waste of time', 'pointless',
  'i can\'t take it', 'i can\'t handle',
];

/**
 * Avoidance: Jan is postponing something he should do.
 * Requires "I" or action context to avoid false positives.
 */
const AVOIDANCE_PATTERNS = [
  'i\'ll skip', 'i\'m skipping', 'skipping today', 'skip the gym',
  'not going to the gym', 'not going today',
  'i\'ll do it later', 'i\'ll do it tomorrow', 'maybe tomorrow',
  'can\'t be bothered', 'not today', 'don\'t feel like it',
  'i\'ll postpone', 'postponing', 'pushing it back',
  'i\'m procrastinat', 'i keep procrastinat', 'i\'m avoiding',
];

// ── Assessment ──────────────────────────────────────────────────

/**
 * Assess Jan's emotional state and determine how Edwin should respond.
 */
export function assessEmotionalState(
  store: MemoryStore,
  currentMessage?: string,
): EmotionalAssessment {
  const moodObs = store.getObservationsByCategory('emotional_state', 5);
  const currentMood = moodObs.length > 0 ? moodObs[0].content : null;
  const trajectory = assessTrajectory(moodObs.map((o) => o.content));
  const messageLower = currentMessage?.toLowerCase() || '';

  // Priority 1: Celebration — always celebrate wins regardless of mood
  if (matchesPatterns(messageLower, ACHIEVEMENT_PATTERNS)) {
    return {
      currentMood,
      trajectory,
      mode: 'celebrate',
      reason: 'Jan achieved something or shared a win.',
      directive: 'Celebrate this win enthusiastically. Be genuinely excited. Reference how this connects to his bigger goals. Make him feel the momentum.',
      confidence: 0.9,
    };
  }

  // Priority 2: Spiral detection — break negative loops before they deepen
  if (matchesPatterns(messageLower, SPIRAL_PATTERNS)) {
    return {
      currentMood,
      trajectory,
      mode: 'distract',
      reason: 'Jan is spiraling — catastrophising or generalising negatively.',
      directive: 'Break the spiral. Don\'t argue with the negative thoughts — redirect. Suggest something concrete and immediate. Change the subject to something actionable or grounding.',
      confidence: 0.85,
    };
  }

  // Priority 3: Avoidance detection — contextual response based on trajectory
  if (matchesPatterns(messageLower, AVOIDANCE_PATTERNS)) {
    if (trajectory === 'declining' || trajectory === 'stable_bad') {
      return {
        currentMood,
        trajectory,
        mode: 'support',
        reason: 'Jan is avoiding, but trajectory is negative — push would backfire.',
        directive: 'Jan is avoiding something, but he\'s already struggling. Acknowledge the difficulty first. Then gently offer one small step forward. Don\'t pile on.',
        confidence: 0.7,
      };
    }
    return {
      currentMood,
      trajectory,
      mode: 'push',
      reason: 'Jan is avoiding — trajectory is stable enough to handle accountability.',
      directive: 'Jan is avoiding something he should do. Be direct but warm. Name what he\'s avoiding. Remind him why it matters. Don\'t accept the excuse — but don\'t be harsh.',
      confidence: 0.75,
    };
  }

  // Priority 4: Trajectory-based decisions (no strong message signal)
  switch (trajectory) {
    case 'declining':
      return {
        currentMood,
        trajectory,
        mode: 'support',
        reason: 'Jan\'s emotional trajectory is declining — needs support.',
        directive: 'Jan\'s mood has been getting worse. Lead with empathy. Ask how he\'s doing, genuinely. Don\'t push productivity — focus on wellbeing. Offer help, not tasks.',
        confidence: 0.7,
      };

    case 'stable_bad':
      return {
        currentMood,
        trajectory,
        mode: 'distract',
        reason: 'Jan has been in a bad mood for a while — need to break the pattern.',
        directive: 'Jan has been low for multiple interactions. Standard support isn\'t working. Try something different: suggest an activity, share something interesting, or propose a change of scenery. Break the pattern.',
        confidence: 0.65,
      };

    case 'improving':
      return {
        currentMood,
        trajectory,
        mode: 'present',
        reason: 'Jan\'s mood is improving — maintain the upward trend.',
        directive: 'Jan is getting better. Don\'t overload him. Be warm, be present, and let the positive momentum continue. Light encouragement, no pressure.',
        confidence: 0.7,
      };

    case 'stable_good':
      return {
        currentMood,
        trajectory,
        mode: 'push',
        reason: 'Jan is in a stable good mood — good window for challenging action.',
        directive: 'Jan is in a good place emotionally. This is a window for harder tasks, bigger goals, deeper conversations. Don\'t waste the window on small talk.',
        confidence: 0.6,
      };

    default:
      return {
        currentMood,
        trajectory,
        mode: 'present',
        reason: 'No emotional data — default to being present and warm.',
        directive: 'No mood data available. Be warm, attentive, and responsive. Read the tone of his message and calibrate accordingly.',
        confidence: 0.4,
      };
  }
}

/**
 * Assess emotional trajectory from mood history.
 */
function assessTrajectory(moodHistory: string[]): EmotionalAssessment['trajectory'] {
  if (moodHistory.length < 2) return 'unknown';

  const scores = moodHistory.map(scoreMood);

  const recent = scores.slice(0, Math.min(2, scores.length));
  const older = scores.slice(Math.min(2, scores.length));

  if (older.length === 0) {
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    if (avg > 0.3) return 'stable_good';
    if (avg < -0.3) return 'stable_bad';
    return 'unknown';
  }

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

  const diff = recentAvg - olderAvg;

  if (diff > 0.3) return 'improving';
  if (diff < -0.3) return 'declining';
  if (recentAvg > 0.2) return 'stable_good';
  if (recentAvg < -0.2) return 'stable_bad';
  return 'unknown';
}

/**
 * Score a mood string from -1 (very negative) to +1 (very positive).
 */
function scoreMood(mood: string): number {
  const lower = mood.toLowerCase();
  let score = 0;
  let matches = 0;

  for (const kw of NEGATIVE_MOODS) {
    if (lower.includes(kw)) { score -= 1; matches++; }
  }
  for (const kw of POSITIVE_MOODS) {
    if (lower.includes(kw)) { score += 1; matches++; }
  }

  if (matches === 0) return 0;
  return Math.max(-1, Math.min(1, score / matches));
}

// ── Formatting ──────────────────────────────────────────────────

/**
 * Format emotional intelligence assessment for the system prompt.
 * Returns null if no meaningful assessment.
 */
export function formatEmotionalIntelligence(assessment: EmotionalAssessment): string | null {
  if (assessment.confidence < 0.3) return null;

  const lines = [
    '[EMOTIONAL INTELLIGENCE]',
    `Mode: ${assessment.mode.toUpperCase()}`,
    `Trajectory: ${assessment.trajectory}`,
    `Reason: ${assessment.reason}`,
    '',
    assessment.directive,
  ];

  return lines.join('\n');
}

// ── Helpers ─────────────────────────────────────────────────────

/**
 * Match against multi-word phrase patterns.
 * Each pattern is a phrase that must appear as a substring.
 */
function matchesPatterns(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p));
}
