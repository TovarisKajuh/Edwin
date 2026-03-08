/**
 * Morning Briefing — Session 19.
 *
 * Edwin's morning briefing is a personalized, context-rich wake-up call.
 * It references yesterday, today's plan, pending commitments, patterns,
 * and sets the tone for the day.
 *
 * Format:
 *   Greeting (personalized, energizing)
 *   Yesterday recap (1-2 sentences)
 *   Today's priorities (top 3 items)
 *   Commitments due today
 *   Motivational close (calibrated to current patterns)
 *
 * Runs at 05:30 Vienna time, stored as notification.
 */

import { MemoryStore } from '../memory/store.js';
import { callClaude } from '../brain/reasoning.js';
import { getTimeOfDay, getDayType } from '../soul/personality.js';
import { getTopPriorities, formatPriorities } from '../brain/thinking/priority-engine.js';
import { textToSpeech } from '../voice/speak.js';
import { sendPushToAll } from '../push/push-service.js';
import { getWeather, formatWeatherForClaude } from '../integrations/weather.js';

export interface BriefingContext {
  dayName: string;
  dateStr: string;
  dayType: string;
  yesterdaySummaries: string[];
  pendingCommitments: string[];
  followUps: string[];
  priorities: string[];
  patterns: string[];
  recentMood: string | null;
  weather: string | null;
}

/**
 * Gather all context Edwin needs for the morning briefing.
 * Includes weather fetch — the only async part.
 */
export async function buildBriefingContext(store: MemoryStore): Promise<BriefingContext> {
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = dayNames[now.getDay()];
  const dateStr = now.toISOString().slice(0, 10);
  const dayType = getDayType(now.getDay());

  // ── Yesterday's conversations ──────────────────────────────────
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const yesterdayConvos = store.getConversationSummariesForDate(yesterdayStr);
  const yesterdaySummaries = yesterdayConvos.map((c) => c.summary);

  // Also check for yesterday's daily_summary (from compression)
  const dailySummaries = store.getObservationsByDateRange(yesterdayStr, yesterdayStr, 'daily_summary');
  for (const ds of dailySummaries) {
    yesterdaySummaries.push(ds.content);
  }

  // ── Pending commitments ────────────────────────────────────────
  const commitments = store.getObservationsByCategory('commitment', 10);
  const pendingCommitments = commitments.map((c) => c.content);

  // ── Follow-ups ─────────────────────────────────────────────────
  const followUps = store.getObservationsByCategory('follow_up', 5);
  const followUpTexts = followUps.map((f) => f.content);

  // ── Today's priorities ─────────────────────────────────────────
  const timeOfDay = getTimeOfDay(now.getHours(), now.getMinutes());
  const recentMood = store.getObservationsByCategory('emotional_state');
  const moodText = recentMood.length > 0 ? recentMood[0].content : null;

  const topPriorities = getTopPriorities(store, timeOfDay, moodText);
  const priorities = formatPriorities(topPriorities);

  // ── Relevant patterns ──────────────────────────────────────────
  const patternObs = store.getObservationsByCategory('pattern', 10);

  // Filter patterns relevant to today's day name
  const dayLower = dayName.toLowerCase();
  const relevantPatterns = patternObs.filter((p) => {
    const contentLower = p.content.toLowerCase();
    return contentLower.includes(dayLower)
      || contentLower.includes(dayType)
      || contentLower.includes('morning')
      || contentLower.includes('daily');
  });

  // If no day-specific patterns, take top 3 general patterns
  const patterns = relevantPatterns.length > 0
    ? relevantPatterns.slice(0, 5).map((p) => p.content)
    : patternObs.slice(0, 3).map((p) => p.content);

  // ── Weather ──────────────────────────────────────────────────────
  let weather: string | null = null;
  try {
    const report = await getWeather();
    weather = formatWeatherForClaude(report);
  } catch {
    // Weather is nice-to-have, not critical
  }

  return {
    dayName,
    dateStr,
    dayType,
    yesterdaySummaries,
    pendingCommitments,
    followUps: followUpTexts,
    priorities,
    patterns,
    recentMood: moodText,
    weather,
  };
}

/**
 * Format briefing context into a prompt for Claude.
 */
export function formatBriefingPrompt(ctx: BriefingContext): string {
  const sections: string[] = [];

  sections.push(`Today is ${ctx.dayName}, ${ctx.dateStr}.`);

  // Yesterday
  if (ctx.yesterdaySummaries.length > 0) {
    sections.push('');
    sections.push('YESTERDAY:');
    for (const s of ctx.yesterdaySummaries) {
      sections.push(`  ${s}`);
    }
  }

  // Commitments
  if (ctx.pendingCommitments.length > 0) {
    sections.push('');
    sections.push('PENDING COMMITMENTS:');
    for (const c of ctx.pendingCommitments) {
      sections.push(`  - ${c}`);
    }
  }

  // Follow-ups
  if (ctx.followUps.length > 0) {
    sections.push('');
    sections.push('FOLLOW-UPS TO CHECK:');
    for (const f of ctx.followUps) {
      sections.push(`  - ${f}`);
    }
  }

  // Priorities
  if (ctx.priorities.length > 0) {
    sections.push('');
    sections.push('TODAY\'S PRIORITIES (most important first):');
    for (const p of ctx.priorities) {
      sections.push(`  - ${p}`);
    }
  }

  // Patterns
  if (ctx.patterns.length > 0) {
    sections.push('');
    sections.push('RELEVANT PATTERNS:');
    for (const p of ctx.patterns) {
      sections.push(`  - ${p}`);
    }
  }

  // Weather
  if (ctx.weather) {
    sections.push('');
    sections.push('WEATHER:');
    sections.push(`  ${ctx.weather}`);
  }

  // Mood
  if (ctx.recentMood) {
    sections.push('');
    sections.push(`LAST KNOWN MOOD: ${ctx.recentMood}`);
  }

  return sections.join('\n');
}

/**
 * Build the system prompt for briefing generation.
 */
function buildBriefingSystemPrompt(ctx: BriefingContext): string {
  const isSunday = ctx.dayType === 'sunday';

  return [
    'You are Edwin, a personal life companion for Jan.',
    'Generate a morning briefing for Jan. Address him as "sir".',
    '',
    'Format:',
    '1. A warm, personalized greeting to start the day',
    ctx.yesterdaySummaries.length > 0
      ? '2. Brief recap of yesterday (1-2 sentences referencing what actually happened)'
      : '2. Skip yesterday recap (no conversations recorded)',
    '3. Today\'s top priorities (up to 3 — from the priority list, or infer from commitments)',
    '4. Any commitments or follow-ups due today',
    '5. Weather mention if available (naturally woven in, not a separate section)',
    '6. A motivational close that sets the right tone',
    '',
    'Rules:',
    '- Keep the entire briefing under 150 words',
    '- Be specific — reference real data, not generic platitudes',
    '- If there are no priorities or commitments, focus on patterns and encouragement',
    isSunday
      ? '- It\'s Sunday — be gentle, restful. No pushing. Let Jan recharge.'
      : '- It\'s a ' + ctx.dayType + ' — be energizing and motivating.',
    ctx.recentMood
      ? `- Jan's recent mood: ${ctx.recentMood}. Calibrate your tone accordingly.`
      : '- No recent mood data. Default to warm and energizing.',
    '- Do NOT use asterisks or roleplay formatting',
    '- Write naturally, as Edwin would speak aloud',
  ].join('\n');
}

/**
 * Generate the morning briefing via Claude with full context.
 */
export async function generateMorningBriefing(store: MemoryStore): Promise<string> {
  const ctx = await buildBriefingContext(store);
  const systemPrompt = buildBriefingSystemPrompt(ctx);
  const contextPrompt = formatBriefingPrompt(ctx);

  const briefing = await callClaude(
    systemPrompt,
    [{ role: 'user', content: contextPrompt }],
    { maxTokens: 400 },
  );

  return briefing;
}

/**
 * Run the full morning briefing flow:
 * 1. Generate briefing with full context
 * 2. Store as notification
 * 3. Generate TTS audio
 * 4. Return both
 */
export async function runMorningBriefing(
  store: MemoryStore,
): Promise<{ text: string; audio: ArrayBuffer | null }> {
  const text = await generateMorningBriefing(store);

  // Store as notification so it shows up in Jan's app
  store.addScheduledAction(
    'notification',
    text,
    new Date().toISOString(),
    'low',
  );

  // Push to Jan's devices (fire-and-forget)
  sendPushToAll(store, {
    title: 'Edwin — Morning Briefing',
    body: text.slice(0, 200),
    url: '/',
  }).catch((err) => console.error('[Morning Briefing] Push failed:', err));

  const audio = await textToSpeech(text);
  console.log('[Morning Briefing]', text);
  return { text, audio };
}
