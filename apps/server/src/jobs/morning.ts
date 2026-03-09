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
import { getTodayEvents, formatEventsForBriefing } from '../integrations/calendar.js';
import { getNews, formatNewsForBriefing } from '../integrations/news.js';

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
  todayEvents: string[];
  newsItems: string[];
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

  // ── Today's Calendar Events ──────────────────────────────────────
  const todayCalEvents = getTodayEvents(store);
  const todayEvents = formatEventsForBriefing(todayCalEvents);

  // ── Industry News ─────────────────────────────────────────────────
  let newsItems: string[] = [];
  try {
    const feed = await getNews();
    newsItems = formatNewsForBriefing(feed);
  } catch {
    // News is nice-to-have
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
    todayEvents,
    newsItems,
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

  // Today's schedule
  if (ctx.todayEvents.length > 0) {
    sections.push('');
    sections.push('TODAY\'S SCHEDULE:');
    for (const e of ctx.todayEvents) {
      sections.push(`  - ${e}`);
    }
  }

  // Weather
  if (ctx.weather) {
    sections.push('');
    sections.push('WEATHER:');
    sections.push(`  ${ctx.weather}`);
  }

  // Industry news
  if (ctx.newsItems.length > 0) {
    sections.push('');
    sections.push('INDUSTRY NEWS (mention only if genuinely relevant):');
    for (const n of ctx.newsItems) {
      sections.push(`  - ${n}`);
    }
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
    'Generate a comprehensive morning briefing for Jan. Address him as "sir".',
    'This briefing will be read aloud — write it as natural spoken language, 800-1200 words.',
    '',
    'Structure (flow naturally between sections, not as a rigid list):',
    '1. A warm, personalized greeting to start the day — set the tone immediately',
    ctx.yesterdaySummaries.length > 0
      ? '2. Yesterday deep recap — what happened, what got done, what didn\'t, what carried over. Be specific.'
      : '2. Skip yesterday recap (no conversations recorded)',
    '3. Today\'s full schedule — walk through the day chronologically if events exist',
    '4. All priorities with context — not just "do X" but WHY it matters today, what\'s at stake',
    '5. Commitments and follow-ups — anything Jan promised, anything pending from others',
    '6. Weather woven naturally into the day plan (e.g., "It\'s going to be 22°C and clear — perfect for...")',
    '7. Industry news if genuinely relevant — only mention if it affects Jan\'s business or interests',
    '8. Motivational framework for the day — what would make today a win? What\'s the one thing?',
    '9. Specific action items — concrete next steps Jan should take, in order of importance',
    '',
    'Rules:',
    '- Write 800-1200 words. This is a 5-7 minute spoken briefing, not a text notification.',
    '- Be specific — reference real data, real names, real numbers. No generic platitudes.',
    '- If there are no priorities or commitments, dig into patterns, goals, and what Jan should be working toward.',
    isSunday
      ? '- It\'s Sunday — be gentle, restful. No pushing. Let Jan recharge. Suggest recovery, reflection, light planning for the week ahead.'
      : '- It\'s a ' + ctx.dayType + ' — be energizing and motivating. Push Jan toward action.',
    ctx.recentMood
      ? `- Jan's recent mood: ${ctx.recentMood}. Calibrate your tone accordingly — if he's been low, be warmer; if he's been productive, build on that momentum.`
      : '- No recent mood data. Default to warm and energizing.',
    '- Do NOT use asterisks, bullet points, numbered lists, or roleplay formatting.',
    '- Write in flowing paragraphs, as Edwin would naturally speak aloud.',
    '- Use paragraph breaks between major sections for readability.',
    '- Be Edwin — the wise butler who knows everything about Jan\'s life, not a news anchor reading a script.',
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
    { maxTokens: 2500 },
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

  // Generate TTS audio
  const audio = await textToSpeech(text);
  const audioBase64 = audio ? Buffer.from(audio).toString('base64') : null;

  // Store as briefing (not notification) with cached audio in response field
  store.addScheduledAction(
    'briefing',
    text,
    new Date().toISOString(),
    'low',
    audioBase64,
  );

  // Push to Jan's devices — URL is '/' so incoming call overlay triggers at app root
  sendPushToAll(store, {
    title: 'Edwin — Good Morning, Sir',
    body: text.slice(0, 200),
    url: '/',
    tag: 'morning-briefing',
    actions: [
      { action: 'listen', title: 'Listen to Briefing' },
      { action: 'snooze', title: 'Snooze 10min' },
    ],
    requireInteraction: true,
  }).catch((err) => console.error('[Morning Briefing] Push failed:', err));

  console.log('[Morning Briefing]', text.slice(0, 100) + '...');
  return { text, audio };
}
