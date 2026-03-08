import type { TimeOfDay, DayType } from '@edwin/shared';
import { getTimeOfDay, getDayType } from '../soul/personality.js';
import { MemoryStore } from '../memory/store.js';
import { checkHealth, formatHealthWarnings } from './self-awareness.js';
import { computeSoulDirectives, formatSoulDirectives } from '../soul/soul-filter.js';
import { buildReasoningBrief, formatReasoningBrief } from './reasoning-context.js';
import { assessCapacity, formatEvaluationContext } from './thinking/evaluator.js';
import { buildTemporalContext, formatTemporalContext } from './temporal-context.js';
import { getCurrentLocation, formatLocationForContext } from '../integrations/location.js';
import { getAutoApprovedCategories, formatStakesGuidance } from './concluding/stakes-engine.js';
import { formatHabitSummary } from '../tracking/habits.js';
import { formatFinancialContext } from '../tracking/finances.js';
import { formatSocialContext } from '../tracking/social.js';
import { formatInventoryContext } from '../tracking/inventory.js';
import { formatGoalContext } from '../tracking/goals.js';

export interface BrainContext {
  timeOfDay: TimeOfDay;
  dayType: DayType;
  memorySnapshot: string;
  recentContext: string;
  healthWarnings: string | null;
  soulDirectives: string;
  reasoningBrief: string;
  evaluationContext: string | null;
  temporalContext: string;
  locationContext: string;
  stakesGuidance: string;
  habitSummary: string | null;
  financialContext: string | null;
  socialContext: string | null;
  inventoryContext: string | null;
  goalContext: string | null;
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

  // Assess Jan's current capacity for proposals
  const capacity = assessCapacity(store, timeOfDay, dayType);
  const evaluationContext = formatEvaluationContext(capacity);

  // Build deep temporal awareness
  const temporal = buildTemporalContext(now);
  const temporalContext = formatTemporalContext(temporal);

  // Build location awareness
  const location = getCurrentLocation(store);
  const locationContext = formatLocationForContext(location);

  // Build stakes guidance (auto-approved categories from Jan's patterns)
  const autoApproved = getAutoApprovedCategories(store);
  const stakesGuidance = formatStakesGuidance(autoApproved);

  // Build habit tracking summary
  const habitSummary = formatHabitSummary(store);

  // Build financial context
  const financialCtx = formatFinancialContext(store);

  // Build social context
  const socialCtx = formatSocialContext(store);

  // Build inventory context
  const inventoryCtx = formatInventoryContext(store);

  // Build goal progress context
  const goalCtx = formatGoalContext(store);

  return {
    timeOfDay,
    dayType,
    memorySnapshot,
    recentContext,
    healthWarnings,
    soulDirectives,
    reasoningBrief,
    evaluationContext,
    temporalContext,
    locationContext,
    stakesGuidance,
    habitSummary,
    financialContext: financialCtx,
    socialContext: socialCtx,
    inventoryContext: inventoryCtx,
    goalContext: goalCtx,
    conversationHistory,
  };
}
