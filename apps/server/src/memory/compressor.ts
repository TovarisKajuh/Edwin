import { callClaude } from '../brain/reasoning.js';
import { MemoryStore } from './store.js';

/**
 * Memory Compression System
 *
 * Nothing in Edwin's memory ever gets deleted. Old observations get
 * compressed into summaries. Daily → weekly → monthly. The raw data
 * stays in the DB, marked as 'compressed', but the summaries carry
 * the knowledge forward efficiently.
 */

// ── Conversation Summarization ──────────────────────────────────────

const CONVERSATION_SUMMARY_PROMPT = `Summarize this conversation between Edwin and Jan in 2-3 sentences. Focus on: what was discussed, any decisions made, Jan's mood, and anything Edwin should remember. Write from Edwin's perspective.

Output only the summary text, no JSON, no formatting.`;

/**
 * Summarize a conversation and store the summary.
 * Called when a conversation ends or reaches a message threshold.
 */
export async function summarizeConversation(
  store: MemoryStore,
  conversationId: number,
): Promise<string | null> {
  try {
    const messages = store.getMessages(conversationId);
    if (messages.length < 2) return null;

    const conversationText = messages
      .map((m) => `${m.role === 'jan' ? 'Jan' : 'Edwin'}: ${m.content}`)
      .join('\n');

    const summary = await callClaude(CONVERSATION_SUMMARY_PROMPT, [
      { role: 'user', content: conversationText },
    ]);

    store.setConversationSummary(conversationId, summary);
    console.log(`[compressor] Summarized conversation ${conversationId}`);
    return summary;
  } catch (err) {
    console.error('[compressor] Conversation summarization failed:', err);
    return null;
  }
}

// ── Daily Compression ───────────────────────────────────────────────

const DAILY_COMPRESSION_PROMPT = `You are compressing Edwin's daily observations about Jan into a single daily summary. Combine all observations into a concise narrative summary (3-5 sentences) that captures the key events, mood, and patterns of the day. Write from Edwin's perspective.

Output only the summary text, no JSON, no formatting.`;

/**
 * Compress today's observations into a single daily summary observation.
 * Original observations are marked as 'compressed' (source field) but NOT deleted.
 */
export async function compressDaily(
  store: MemoryStore,
  date?: string,
): Promise<string | null> {
  try {
    const targetDate = date ?? new Date().toISOString().slice(0, 10);
    const observations = store.getObservationsForDate(targetDate);

    if (observations.length < 3) return null; // Not enough to compress

    const obsText = observations
      .map((o) => `[${o.category}] ${o.content} (confidence: ${o.confidence})`)
      .join('\n');

    const summary = await callClaude(DAILY_COMPRESSION_PROMPT, [
      { role: 'user', content: `Date: ${targetDate}\n\nObservations:\n${obsText}` },
    ]);

    // Store the daily summary as a new observation
    store.addObservation(
      'daily_summary',
      `[${targetDate}] ${summary}`,
      1.0,
      'observed',
    );

    // Mark original observations as compressed (not deleted!)
    store.markObservationsCompressed(observations.map((o) => o.id));

    console.log(`[compressor] Compressed ${observations.length} observations for ${targetDate}`);
    return summary;
  } catch (err) {
    console.error('[compressor] Daily compression failed:', err);
    return null;
  }
}

// ── Weekly Compression ──────────────────────────────────────────────

const WEEKLY_COMPRESSION_PROMPT = `You are compressing Edwin's weekly observations about Jan into a structured weekly summary. Analyze the daily summaries and observations to identify:
- highlights: Key accomplishments and events
- concerns: Worrying patterns or issues
- patterns: Behavioral patterns (sleep, gym, spending, mood)
- mood_trend: Overall emotional trajectory for the week

Output JSON:
{"highlights": "...", "concerns": "...", "patterns": "...", "mood_trend": "..."}`;

interface WeeklySummaryResult {
  highlights: string;
  concerns: string;
  patterns: string;
  mood_trend: string;
}

/**
 * Compress a week's daily summaries into a weekly summary.
 * Stored in the weekly_summaries table for long-term recall.
 */
export async function compressWeekly(
  store: MemoryStore,
  weekStart: string,
): Promise<WeeklySummaryResult | null> {
  try {
    // Get daily summaries and remaining observations for the week
    const weekEnd = getWeekEnd(weekStart);
    const dailySummaries = store.getObservationsByDateRange(weekStart, weekEnd, 'daily_summary');
    const remainingObs = store.getObservationsByDateRange(weekStart, weekEnd);

    if (dailySummaries.length === 0 && remainingObs.length === 0) return null;

    const content = [
      ...dailySummaries.map((o) => o.content),
      ...remainingObs
        .filter((o) => o.category !== 'daily_summary')
        .map((o) => `[${o.category}] ${o.content}`),
    ].join('\n');

    const response = await callClaude(WEEKLY_COMPRESSION_PROMPT, [
      { role: 'user', content: `Week of ${weekStart}:\n\n${content}` },
    ]);

    let result: WeeklySummaryResult;
    try {
      result = JSON.parse(response);
    } catch {
      console.error('[compressor] Weekly compression returned non-JSON:', response.slice(0, 200));
      return null;
    }

    store.addWeeklySummary(
      weekStart,
      result.highlights,
      result.concerns,
      result.patterns,
      result.mood_trend,
    );

    console.log(`[compressor] Created weekly summary for week of ${weekStart}`);
    return result;
  } catch (err) {
    console.error('[compressor] Weekly compression failed:', err);
    return null;
  }
}

// ── Observation Promotion ───────────────────────────────────────────

/**
 * Check if any observations appear frequently enough to be promoted
 * to the identity table as permanent knowledge about Jan.
 *
 * Criteria: 3+ similar observations in the same category → promote to identity.
 * Example: 3 observations about "Jan skips gym" → identity: habits/gym_skip_pattern
 */
export function promoteObservations(store: MemoryStore): number {
  const candidates = store.getPromotionCandidates(3);
  let promoted = 0;

  for (const candidate of candidates) {
    // Check if this identity already exists
    const existing = store.getIdentity(candidate.category, candidate.key);
    if (existing) continue;

    store.setIdentity(
      candidate.category,
      candidate.key,
      candidate.value,
      'inferred',
      candidate.confidence,
    );

    // Mark the source observations as compressed
    store.markObservationsCompressed(candidate.observationIds);
    promoted++;
  }

  if (promoted > 0) {
    console.log(`[compressor] Promoted ${promoted} observations to identity`);
  }
  return promoted;
}

// ── Helpers ─────────────────────────────────────────────────────────

function getWeekEnd(weekStart: string): string {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + 6);
  return date.toISOString().slice(0, 10);
}
