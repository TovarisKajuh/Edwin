import type { TimeOfDay, DayType } from '@edwin/shared';
import { getTimeOfDay, getDayType } from '../soul/personality.js';
import { MemoryStore } from '../memory/store.js';
import { checkHealth, formatHealthWarnings } from './self-awareness.js';
import { computeSoulDirectives, formatSoulDirectives } from '../soul/soul-filter.js';
import { buildReasoningBrief, formatReasoningBrief } from './reasoning-context.js';

export interface BrainContext {
  timeOfDay: TimeOfDay;
  dayType: DayType;
  memorySnapshot: string;
  recentContext: string;
  healthWarnings: string | null;
  soulDirectives: string;
  reasoningBrief: string;
  conversationHistory: { role: string; content: string }[];
}

export function buildContext(
  store: MemoryStore,
  conversationId?: number,
): BrainContext {
  const now = new Date();
  const timeOfDay = getTimeOfDay(now.getHours(), now.getMinutes());
  const dayType = getDayType(now.getDay());

  const memorySnapshot = store.buildMemorySnapshot();

  // Build conversation history if we have a conversation
  let conversationHistory: { role: string; content: string }[] = [];
  if (conversationId !== undefined) {
    const messages = store.getMessages(conversationId);
    conversationHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  // Build recent context string from last 10 messages
  const recentMessages = store.getRecentMessages(10);
  const recentContext = recentMessages
    .reverse() // oldest first for readability
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  // Check Edwin's self-awareness (infrastructure health)
  const warnings = checkHealth(store);
  const healthWarnings = formatHealthWarnings(warnings);

  // Compute dynamic soul directives based on memory + context
  const directives = computeSoulDirectives(store, timeOfDay, dayType);
  const soulDirectives = formatSoulDirectives(directives);

  // Build reasoning brief — synthesized awareness for multi-step thinking
  const brief = buildReasoningBrief(store, timeOfDay, dayType);
  const reasoningBrief = formatReasoningBrief(brief);

  return {
    timeOfDay,
    dayType,
    memorySnapshot,
    recentContext,
    healthWarnings,
    soulDirectives,
    reasoningBrief,
    conversationHistory,
  };
}
