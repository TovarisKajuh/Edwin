import { MemoryStore } from '../../memory/store.js';

/**
 * Context Interpreter — reads between the lines.
 *
 * Compares Jan's current message against his communication baseline
 * to detect deflection, disengagement, or unusual patterns.
 * Feeds signals into the soul filter for nuanced response calibration.
 */

export type ContextSignal =
  | 'deflecting'      // "fine", "ok" in response to a meaningful question
  | 'disengaged'      // Shorter than usual replies, dropping off
  | 'engaged'         // Longer than usual, detailed, invested
  | 'venting'         // Long emotional message, needs to be heard
  | 'avoidant'        // Changed topic suddenly, avoiding something
  | 'normal';         // Nothing unusual

export interface ContextInterpretation {
  signal: ContextSignal;
  confidence: number;
  note: string;
}

// Deflection words — replies that might mean "I don't want to talk about it"
const DEFLECTION_WORDS = /^(fine|ok|okay|sure|whatever|yeah|yep|k|mhm|alright|good)\.?$/i;

// Venting indicators — long emotional outpouring
const VENTING_WORDS = /\b(always|never|every time|so sick of|can'?t believe|i swear|for the love of|why does|why do)\b/i;

/**
 * Interpret the context of Jan's message by comparing against recent patterns.
 *
 * @param message - Jan's current message
 * @param conversationHistory - Recent messages in this conversation
 * @param store - Memory store for baseline data
 */
export function interpretContext(
  message: string,
  conversationHistory: { role: string; content: string }[],
  store: MemoryStore,
): ContextInterpretation {
  const wordCount = message.trim().split(/\s+/).length;

  // ── Check for deflection ──────────────────────────────────────
  // "fine" / "ok" after Edwin asked a meaningful question
  if (DEFLECTION_WORDS.test(message.trim())) {
    const lastEdwinMessage = getLastEdwinMessage(conversationHistory);
    if (lastEdwinMessage && isQuestion(lastEdwinMessage)) {
      return {
        signal: 'deflecting',
        confidence: 0.75,
        note: 'Jan gave a minimal response to a question — might be deflecting.',
      };
    }
  }

  // ── Check for venting ─────────────────────────────────────────
  if (wordCount > 30 && VENTING_WORDS.test(message)) {
    return {
      signal: 'venting',
      confidence: 0.8,
      note: 'Jan is venting — let him express, don\'t interrupt with solutions yet.',
    };
  }

  // ── Check engagement level against baseline ───────────────────
  const baseline = getMessageLengthBaseline(store);

  if (baseline > 0) {
    const ratio = wordCount / baseline;

    // Much shorter than usual → disengaged
    if (ratio < 0.3 && wordCount <= 5) {
      return {
        signal: 'disengaged',
        confidence: 0.6,
        note: 'Jan\'s replies are much shorter than usual — might be distracted, busy, or unhappy.',
      };
    }

    // Much longer than usual → engaged or venting
    if (ratio > 2.5 && wordCount > 20) {
      return {
        signal: 'engaged',
        confidence: 0.65,
        note: 'Jan is more talkative than usual — he\'s invested in this topic.',
      };
    }
  }

  // ── Check for topic avoidance ─────────────────────────────────
  // If Edwin asked about something specific and Jan changed topic completely
  const lastEdwin = getLastEdwinMessage(conversationHistory);
  if (lastEdwin && isQuestion(lastEdwin) && wordCount > 5) {
    const questionTopics = extractKeywords(lastEdwin);
    const replyTopics = extractKeywords(message);
    const overlap = questionTopics.filter((t) => replyTopics.includes(t));

    if (overlap.length === 0 && questionTopics.length > 0) {
      return {
        signal: 'avoidant',
        confidence: 0.55,
        note: 'Jan changed the topic without addressing Edwin\'s question — might be avoiding it.',
      };
    }
  }

  return { signal: 'normal', confidence: 1.0, note: '' };
}

/**
 * Format context interpretation for injection into the prompt.
 * Only injected when something noteworthy is detected.
 */
export function formatContextInterpretation(interp: ContextInterpretation): string | null {
  if (interp.signal === 'normal') return null;
  return `[CONTEXT SIGNAL] ${interp.note}`;
}

// ── Helpers ─────────────────────────────────────────────────────

function getLastEdwinMessage(history: { role: string; content: string }[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === 'edwin') return history[i].content;
  }
  return null;
}

function isQuestion(text: string): boolean {
  return text.includes('?') || /\b(how|what|when|where|why|did you|have you|are you|do you)\b/i.test(text);
}

function getMessageLengthBaseline(store: MemoryStore): number {
  const recentMessages = store.getRecentMessages(20);
  const janMessages = recentMessages.filter((m) => m.role === 'jan');
  if (janMessages.length < 3) return 0; // Not enough data for baseline

  const totalWords = janMessages.reduce(
    (sum, m) => sum + m.content.trim().split(/\s+/).length,
    0,
  );
  return totalWords / janMessages.length;
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'it', 'its', 'this', 'that',
    'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her', 'us',
    'my', 'your', 'his', 'our', 'their', 'and', 'or', 'but', 'not',
    'so', 'if', 'sir', 'jan', 'how', 'what', 'when', 'where', 'why',
    'about', 'just', 'then', 'than', 'very', 'really', 'went', 'going',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}
