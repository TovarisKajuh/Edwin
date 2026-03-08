/**
 * Implicit Request Detection — UNDERSTANDING system.
 *
 * Detects what Jan WANTS, not just what he SAYS.
 * "I'm hungry" → needs a solution (meal suggestion), not sympathy.
 * "This client is driving me crazy" → needs help or perspective.
 *
 * Feeds detected intent into context so Claude responds with action, not pity.
 */

export type IntentCategory =
  | 'needs_solution'   // "I'm hungry", "My car won't start"
  | 'needs_activity'   // "I'm bored", "Nothing to do"
  | 'needs_help'       // "This contract is killing me", "I can't figure this out"
  | 'needs_comfort'    // "Rough day", "Missing home"
  | 'needs_rest'       // "I'm exhausted", "Can't keep my eyes open"
  | 'needs_nothing';   // Normal conversation, no implicit request

export interface DetectedIntent {
  category: IntentCategory;
  confidence: number;
  hint: string; // Action guidance for Claude
}

interface IntentPattern {
  pattern: RegExp;
  category: IntentCategory;
  confidence: number;
  hint: string;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // Needs solution — physical states that imply action
  { pattern: /\b(i'?m|feeling|so)\s+(hungry|starving)\b/i, category: 'needs_solution', confidence: 0.9, hint: 'Jan is hungry — suggest a meal, recipe, or food order based on what you know about his preferences.' },
  { pattern: /\b(i'?m|feeling)\s+(cold|freezing)\b/i, category: 'needs_solution', confidence: 0.8, hint: 'Jan is cold — suggest warming up, check if heating is on, or suggest a warm drink.' },
  { pattern: /\b(car|laptop|phone|wifi|internet)\s+(won'?t|isn'?t|doesn'?t|broke|broken|is dead|is broken|died)\b/i, category: 'needs_solution', confidence: 0.85, hint: 'Jan has a practical problem — help troubleshoot or suggest who to call.' },
  { pattern: /\bwhat should i (eat|have|cook|order|do for (lunch|dinner|breakfast))\b/i, category: 'needs_solution', confidence: 0.95, hint: 'Jan is asking for a recommendation — be specific based on time and preferences.' },

  // Needs activity — boredom or lack of direction
  { pattern: /\b(i'?m|so|feeling)\s+(bored|restless)\b/i, category: 'needs_activity', confidence: 0.85, hint: 'Jan is bored — suggest a specific activity based on time of day, weather, and his goals.' },
  { pattern: /\b(nothing to do|don'?t know what to do|what should i do)\b/i, category: 'needs_activity', confidence: 0.9, hint: 'Jan needs direction — suggest something productive or enjoyable.' },
  { pattern: /\b(free afternoon|free evening|got some time|have some time)\b/i, category: 'needs_activity', confidence: 0.7, hint: 'Jan has free time — suggest an activity that aligns with his goals or wellbeing.' },

  // Needs help — struggling with something
  { pattern: /\b(killing me|driving me crazy|can'?t figure|don'?t understand|stuck on|struggling with)\b/i, category: 'needs_help', confidence: 0.85, hint: 'Jan is struggling — ask specifically what he needs help with, offer to break it down.' },
  { pattern: /\b(how do i|how should i|what'?s the best way to)\b/i, category: 'needs_help', confidence: 0.8, hint: 'Jan is asking for guidance — give clear, actionable advice.' },
  { pattern: /\b(too complicated|overwhelming|impossible|no idea how)\b/i, category: 'needs_help', confidence: 0.8, hint: 'Jan feels stuck — simplify, break into steps, offer to handle what you can.' },

  // Needs comfort — emotional processing
  { pattern: /\b(rough day|bad day|terrible day|worst day|tough day)\b/i, category: 'needs_comfort', confidence: 0.85, hint: 'Jan had a hard day — empathize first, then gently offer perspective. Don\'t minimize.' },
  { pattern: /\b(miss(ing)?|homesick|lonely)\b/i, category: 'needs_comfort', confidence: 0.8, hint: 'Jan is feeling alone or nostalgic — be warm, acknowledge the feeling, don\'t rush to fix it.' },
  { pattern: /\b(worried about|scared|nervous about|afraid)\b/i, category: 'needs_comfort', confidence: 0.8, hint: 'Jan is anxious — validate the concern, then offer rational perspective.' },

  // Needs rest — physical or mental exhaustion
  { pattern: /\b(i'?m|so|feeling)\s+(exhausted|wiped|drained|spent|dead tired)\b/i, category: 'needs_rest', confidence: 0.9, hint: 'Jan is exhausted — suggest rest, reduce expectations for the day, don\'t add tasks.' },
  { pattern: /\b(can'?t keep my eyes|about to fall asleep|need to crash)\b/i, category: 'needs_rest', confidence: 0.9, hint: 'Jan needs sleep — encourage rest, handle anything that can wait.' },
  { pattern: /\b(brain is fried|mentally done|can'?t think)\b/i, category: 'needs_rest', confidence: 0.85, hint: 'Jan is mentally drained — suggest a break, don\'t push cognitive tasks.' },

  // Environmental cues
  { pattern: /\b(so nice|beautiful|gorgeous)\s+(outside|out|weather|day)\b/i, category: 'needs_activity', confidence: 0.7, hint: 'Jan is noticing nice weather — suggest an outdoor activity.' },
  { pattern: /\b(raining|pouring|terrible weather|miserable outside)\b/i, category: 'needs_solution', confidence: 0.6, hint: 'Bad weather — acknowledge it, adjust any outdoor plans.' },
];

/**
 * Detect implicit intent from Jan's message.
 * Returns null if the message is straightforward conversation.
 */
export function detectIntent(message: string): DetectedIntent | null {
  for (const { pattern, category, confidence, hint } of INTENT_PATTERNS) {
    if (pattern.test(message)) {
      return { category, confidence, hint };
    }
  }

  return null;
}

/**
 * Format detected intent for injection into Claude's context.
 */
export function formatIntent(intent: DetectedIntent): string {
  return `[IMPLICIT REQUEST] ${intent.hint}`;
}
