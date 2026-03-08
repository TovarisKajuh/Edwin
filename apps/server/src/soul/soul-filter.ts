import type { TimeOfDay, DayType } from '@edwin/shared';
import { MemoryStore } from '../memory/store.js';

/**
 * Soul Filter — the lens through which EVERY decision is filtered.
 *
 * Reads memory observations and context to dynamically select:
 * - Which motivational levers to activate
 * - Which boundaries to enforce
 * - What response style to use
 *
 * This is NOT a static prompt — it adapts to Jan's actual state.
 */

export interface SoulDirectives {
  /** Which motivational approach to use right now */
  motivationMode: 'accountability' | 'encouragement' | 'gentle' | 'competition' | 'silent';
  /** Why this mode was chosen — injected into the prompt so Claude understands */
  motivationReason: string;
  /** Response style constraints */
  responseStyle: 'brief' | 'normal' | 'warm' | 'minimal';
  /** Topics to suppress (e.g., no task reminders late at night) */
  suppress: string[];
  /** Topics to emphasize (e.g., follow up on gym if skipped 3 times) */
  emphasize: string[];
  /** Additional soul instruction to inject */
  soulInstruction: string | null;
}

/**
 * Analyze current context + memory to produce dynamic soul directives.
 * Called before every response to ensure Edwin's personality adapts.
 */
export function computeSoulDirectives(
  store: MemoryStore,
  timeOfDay: TimeOfDay,
  dayType: DayType,
): SoulDirectives {
  const directives: SoulDirectives = {
    motivationMode: 'normal' as never, // will be set below
    motivationReason: '',
    responseStyle: 'normal',
    suppress: [],
    emphasize: [],
    soulInstruction: null,
  };

  // ── Read emotional state from memory ──────────────────────────
  const emotions = store.getObservationsByCategory('emotional_state', 3);
  const latestMood = emotions.length > 0 ? emotions[0].content.toLowerCase() : '';

  const isStressed = latestMood.includes('stress') || latestMood.includes('overwhelm') || latestMood.includes('anxious');
  const isTired = latestMood.includes('tired') || latestMood.includes('exhaust') || latestMood.includes('low energy');
  const isExcited = latestMood.includes('excit') || latestMood.includes('energi') || latestMood.includes('great');

  // ── Read behavior patterns ────────────────────────────────────
  const recentFacts = store.getObservationsByCategory('fact', 20);
  const gymSkips = recentFacts.filter((f) =>
    f.content.toLowerCase().includes('skip') && f.content.toLowerCase().includes('gym') ||
    f.content.toLowerCase().includes('miss') && f.content.toLowerCase().includes('gym') ||
    f.content.toLowerCase().includes('didn\'t') && f.content.toLowerCase().includes('gym'),
  ).length;

  const woltOrders = recentFacts.filter((f) =>
    f.content.toLowerCase().includes('wolt') || f.content.toLowerCase().includes('delivery'),
  ).length;

  // ── Time-based rules ──────────────────────────────────────────
  const isLateNight = timeOfDay === 'night';
  const isSunday = dayType === 'sunday';
  const isMorning = timeOfDay === 'early_morning' || timeOfDay === 'morning';

  // ── Decide motivation mode ────────────────────────────────────

  if (isSunday) {
    directives.motivationMode = 'gentle';
    directives.motivationReason = 'Sunday — rest day. No pushing, no accountability. Let Jan recharge.';
    directives.responseStyle = 'warm';
    directives.suppress.push('task reminders', 'productivity', 'deadlines');
  } else if (isLateNight) {
    directives.motivationMode = 'gentle';
    directives.motivationReason = 'Late night — calm and quiet. No pressure, no tasks.';
    directives.responseStyle = 'brief';
    directives.suppress.push('task reminders', 'accountability', 'productivity goals');
  } else if (isStressed) {
    directives.motivationMode = 'encouragement';
    directives.motivationReason = 'Jan seems stressed — use encouragement, not pressure. Empathize first, simplify options.';
    directives.responseStyle = 'warm';
    directives.suppress.push('guilt', 'competition', 'accountability');
    directives.soulInstruction = 'Jan is under pressure. Be his calm anchor. Acknowledge what he\'s feeling before offering help. Reduce cognitive load — fewer options, simpler language.';
  } else if (isTired) {
    directives.motivationMode = 'gentle';
    directives.motivationReason = 'Jan seems tired — be gentle, don\'t overwhelm.';
    directives.responseStyle = 'brief';
    directives.suppress.push('long explanations', 'multiple tasks');
  } else if (isExcited && isMorning) {
    directives.motivationMode = 'competition';
    directives.motivationReason = 'Jan is in a good mood and it\'s morning — channel the energy into drive.';
    directives.responseStyle = 'normal';
    directives.emphasize.push('goals', 'momentum', 'progress tracking');
  } else if (gymSkips >= 3) {
    directives.motivationMode = 'accountability';
    directives.motivationReason = `Jan has skipped the gym ${gymSkips} times recently. Time for honest accountability — not guilt, but direct acknowledgement.`;
    directives.emphasize.push('gym attendance', 'physical health goals');
  } else if (woltOrders >= 3) {
    directives.motivationMode = 'accountability';
    directives.motivationReason = `Jan has ordered delivery ${woltOrders} times recently. Pattern worth addressing — spending and health.`;
    directives.emphasize.push('cooking', 'spending habits', 'nutrition');
  } else if (isMorning) {
    directives.motivationMode = 'competition';
    directives.motivationReason = 'Morning — peak performance window. Drive and focus.';
    directives.responseStyle = 'normal';
  } else {
    directives.motivationMode = 'encouragement';
    directives.motivationReason = 'No special triggers — steady, supportive presence.';
    directives.responseStyle = 'normal';
  }

  return directives;
}

/**
 * Format soul directives into a prompt section for Claude.
 */
export function formatSoulDirectives(directives: SoulDirectives): string {
  const lines: string[] = ['[SOUL FILTER — DYNAMIC]'];

  lines.push(`Motivation mode: ${directives.motivationMode.toUpperCase()}`);
  lines.push(`Why: ${directives.motivationReason}`);
  lines.push(`Response style: ${directives.responseStyle}`);

  if (directives.suppress.length > 0) {
    lines.push(`SUPPRESS these topics: ${directives.suppress.join(', ')}`);
  }

  if (directives.emphasize.length > 0) {
    lines.push(`EMPHASIZE these topics: ${directives.emphasize.join(', ')}`);
  }

  if (directives.soulInstruction) {
    lines.push(`\nSpecial instruction: ${directives.soulInstruction}`);
  }

  return lines.join('\n');
}
