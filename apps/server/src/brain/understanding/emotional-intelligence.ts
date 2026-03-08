/**
 * Emotional Intelligence Engine — Session 39.
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
 * Mode selection is based on emotional trajectory, not just current state.
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

// ── Mood Keywords ───────────────────────────────────────────────

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

const ACHIEVEMENT_KEYWORDS = [
  'did it', 'nailed', 'crushed', 'closed the deal', 'signed', 'landed',
  'finished', 'completed', 'achieved', 'hit my target', 'hit the target',
  'won', 'passed', 'got the', 'promotion', 'contract', 'sold',
  'personal best', 'new record', 'streak',
];

const AVOIDANCE_KEYWORDS = [
  'skip', 'didn\'t', 'postpone', 'later', 'tomorrow', 'maybe',
  'can\'t be bothered', 'not today', 'whatever', 'meh', 'don\'t care',
  'procrastinat', 'avoid',
];

const SPIRAL_KEYWORDS = [
  'everything is', 'nothing works', 'what\'s the point', 'why bother',
  'all falling apart', 'can\'t do anything', 'hopeless', 'never going to',
  'always', 'never', 'impossible', 'give up', 'waste',
];

// ── Assessment ──────────────────────────────────────────────────

/**
 * Assess Jan's emotional state and determine how Edwin should respond.
 */
export function assessEmotionalState(
  store: MemoryStore,
  currentMessage?: string,
): EmotionalAssessment {
  // Get mood history (most recent first)
  const moodObs = store.getObservationsByCategory('emotional_state', 5);
  const currentMood = moodObs.length > 0 ? moodObs[0].content : null;

  // Determine trajectory
  const trajectory = assessTrajectory(moodObs.map((o) => o.content));

  // Determine mode based on message content + mood + trajectory
  const messageLower = currentMessage?.toLowerCase() || '';
  const moodLower = currentMood?.toLowerCase() || '';

  // Check for celebration opportunity
  if (hasKeywords(messageLower, ACHIEVEMENT_KEYWORDS)) {
    return {
      currentMood,
      trajectory,
      mode: 'celebrate',
      reason: 'Jan achieved something or shared a win.',
      directive: 'Celebrate this win enthusiastically. Be genuinely excited. Reference how this connects to his bigger goals. Make him feel the momentum.',
      confidence: 0.9,
    };
  }

  // Check for spiraling
  if (hasKeywords(messageLower, SPIRAL_KEYWORDS)) {
    return {
      currentMood,
      trajectory,
      mode: 'distract',
      reason: 'Jan is spiraling — catastrophising or generalising negatively.',
      directive: 'Break the spiral. Don\'t argue with the negative thoughts — redirect. Suggest something concrete and immediate. Change the subject to something actionable or grounding.',
      confidence: 0.85,
    };
  }

  // Check for avoidance
  if (hasKeywords(messageLower, AVOIDANCE_KEYWORDS)) {
    // If trajectory is declining, be supportive not pushy
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
    // Otherwise, push
    return {
      currentMood,
      trajectory,
      mode: 'push',
      reason: 'Jan is avoiding — trajectory is stable enough to handle accountability.',
      directive: 'Jan is avoiding something he should do. Be direct but warm. Name what he\'s avoiding. Remind him why it matters. Don\'t accept the excuse — but don\'t be harsh.',
      confidence: 0.75,
    };
  }

  // Trajectory-based decisions
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
      // Escalate approach — stable bad means current strategy isn't working
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
      // No mood data
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

  // Compare recent to older
  const recent = scores.slice(0, Math.min(2, scores.length));
  const older = scores.slice(Math.min(2, scores.length));

  if (older.length === 0) {
    // Only have recent data
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

function hasKeywords(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}
