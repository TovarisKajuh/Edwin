/**
 * Follow-up Engine — Session 22.
 *
 * Edwin follows up on commitments and checks in throughout the day.
 * "Did you make it to the gym, sir?"
 * "How did the meeting go?"
 * "You said you'd call the electrician — did that happen?"
 *
 * Rules:
 *   - Commitments made today → check back end of day or next morning
 *   - "Tomorrow" commitments → check back the next afternoon
 *   - Open-ended commitments → check back in 2-3 days
 *   - Don't follow up more than once per commitment
 *
 * No Claude call — just scans and scheduling. The heartbeat's outreach
 * evaluation handles the actual message generation.
 */

import type { MemoryStore } from '../memory/store.js';
import type { TimeOfDay } from '@edwin/shared';

export interface FollowUpCandidate {
  observationId: number;
  content: string;
  type: 'commitment' | 'follow_up' | 'wellbeing';
  ageHours: number;
  reason: string;
}

/**
 * Scan for commitments and follow-ups that need checking.
 * Returns candidates that should be turned into follow-up messages.
 */
export function scanForFollowUps(
  store: MemoryStore,
  timeOfDay: TimeOfDay,
): FollowUpCandidate[] {
  const now = new Date();
  const candidates: FollowUpCandidate[] = [];

  // ── Commitment follow-ups ──────────────────────────────────────
  const commitments = store.getObservationsByCategory('commitment', 20);
  const existingFollowUps = store.getObservationsByCategory('follow_up', 50);
  const recentNotifications = store.getNotifications(50);

  for (const commitment of commitments) {
    const ageMs = now.getTime() - new Date(commitment.observed_at).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    // Skip if already followed up on this commitment
    if (hasBeenFollowedUp(commitment.content, existingFollowUps, recentNotifications)) {
      continue;
    }

    const candidate = evaluateCommitmentTiming(commitment, ageHours, timeOfDay);
    if (candidate) {
      candidates.push(candidate);
    }
  }

  // ── Follow-up observations (explicit things Edwin should check) ──
  const followUpObs = store.getObservationsByCategory('follow_up', 10);
  for (const followUp of followUpObs) {
    const ageMs = now.getTime() - new Date(followUp.observed_at).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    // Follow-ups are already marked for checking — just check timing
    if (ageHours >= 4 && !hasBeenFollowedUp(followUp.content, [], recentNotifications)) {
      candidates.push({
        observationId: followUp.id,
        content: followUp.content,
        type: 'follow_up',
        ageHours,
        reason: `Follow-up pending for ${Math.round(ageHours)}h`,
      });
    }
  }

  // ── Wellbeing check (mood trend) ───────────────────────────────
  const wellbeingCandidate = checkWellbeing(store, timeOfDay);
  if (wellbeingCandidate) {
    candidates.push(wellbeingCandidate);
  }

  return candidates;
}

/**
 * Evaluate whether a commitment is ready for follow-up based on timing.
 */
function evaluateCommitmentTiming(
  commitment: { id: number; content: string; observed_at: string },
  ageHours: number,
  timeOfDay: TimeOfDay,
): FollowUpCandidate | null {
  const contentLower = commitment.content.toLowerCase();

  // "Today" commitments — follow up in the evening or next morning
  if (contentLower.includes('today') || contentLower.includes('this morning') || contentLower.includes('this afternoon')) {
    if (ageHours >= 6 && (timeOfDay === 'evening' || timeOfDay === 'night')) {
      return {
        observationId: commitment.id,
        content: commitment.content,
        type: 'commitment',
        ageHours,
        reason: 'Same-day commitment — evening check-in',
      };
    }
    // Next morning if missed evening
    if (ageHours >= 16 && (timeOfDay === 'morning' || timeOfDay === 'early_morning')) {
      return {
        observationId: commitment.id,
        content: commitment.content,
        type: 'commitment',
        ageHours,
        reason: 'Yesterday\'s commitment — morning follow-up',
      };
    }
    return null;
  }

  // "Tomorrow" commitments — follow up the next afternoon
  if (contentLower.includes('tomorrow')) {
    if (ageHours >= 24 && timeOfDay === 'afternoon') {
      return {
        observationId: commitment.id,
        content: commitment.content,
        type: 'commitment',
        ageHours,
        reason: 'Tomorrow commitment — afternoon check',
      };
    }
    return null;
  }

  // Day-specific commitments (Monday, Tuesday, etc.)
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const mentionedDay = days.find((d) => contentLower.includes(d));
  if (mentionedDay) {
    // Follow up after the mentioned day, in the evening or next morning
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sun
    const targetDay = days.indexOf(mentionedDay);
    const adjustedTarget = targetDay === 6 ? 0 : targetDay + 1; // our array is Mon=0, but Date.getDay is Sun=0
    // Simplification: follow up if commitment is 24+ hours old and it's afternoon/evening
    if (ageHours >= 24 && (timeOfDay === 'afternoon' || timeOfDay === 'evening')) {
      return {
        observationId: commitment.id,
        content: commitment.content,
        type: 'commitment',
        ageHours,
        reason: `${mentionedDay} commitment — checking in`,
      };
    }
    return null;
  }

  // Open-ended commitments — follow up after 2-3 days
  if (ageHours >= 48 && ageHours <= 96) {
    if (timeOfDay === 'afternoon' || timeOfDay === 'morning') {
      return {
        observationId: commitment.id,
        content: commitment.content,
        type: 'commitment',
        ageHours,
        reason: `Open commitment (${Math.round(ageHours / 24)}d old) — periodic check`,
      };
    }
  }

  return null;
}

/**
 * Check if a commitment has already been followed up on.
 * Prevents double follow-ups by checking:
 * 1. Existing follow_up observations mentioning similar content
 * 2. Recent notifications that reference the commitment
 */
function hasBeenFollowedUp(
  commitmentContent: string,
  followUpObs: { content: string }[],
  recentNotifications: { description: string }[],
): boolean {
  const keywords = extractKeywords(commitmentContent);
  if (keywords.length === 0) return false;

  // Check follow-up observations
  for (const fu of followUpObs) {
    if (contentOverlaps(keywords, fu.content)) {
      return true;
    }
  }

  // Check recent notifications for follow-up messages
  for (const notif of recentNotifications) {
    const lower = notif.description.toLowerCase();
    // Only match notifications that look like follow-ups
    if ((lower.includes('did you') || lower.includes('how did') || lower.includes('how\'s') || lower.includes('check'))
      && contentOverlaps(keywords, notif.description)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract meaningful keywords from content for overlap detection.
 */
const STOP_WORDS = new Set(['jan', 'will', 'said', 'would', 'going', 'the', 'this', 'that', 'with', 'for', 'has', 'have', 'was']);

function extractKeywords(content: string): string[] {
  return content
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function contentOverlaps(keywords: string[], text: string): boolean {
  const textLower = text.toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (textLower.includes(kw)) matches++;
  }
  // At least 2 keyword matches, or 50%+ overlap
  return matches >= 2 || (keywords.length > 0 && matches / keywords.length >= 0.5);
}

/**
 * Check for wellbeing follow-up based on mood trends.
 * Only triggers if recent mood is concerning.
 */
function checkWellbeing(
  store: MemoryStore,
  timeOfDay: TimeOfDay,
): FollowUpCandidate | null {
  // Only check wellbeing in afternoon (not morning — too early; not evening — too late)
  if (timeOfDay !== 'afternoon') return null;

  const emotions = store.getObservationsByCategory('emotional_state', 3);
  if (emotions.length < 2) return null;

  const concerningKeywords = ['stress', 'overwhelm', 'exhaust', 'depress', 'sad', 'anxious', 'lonely', 'isolat'];
  const concerningCount = emotions.filter((e) =>
    concerningKeywords.some((kw) => e.content.toLowerCase().includes(kw)),
  ).length;

  // Multiple concerning mood observations → check in
  if (concerningCount >= 2) {
    return {
      observationId: emotions[0].id,
      content: emotions[0].content,
      type: 'wellbeing',
      ageHours: 0,
      reason: `${concerningCount} concerning mood signals — wellbeing check`,
    };
  }

  return null;
}

/**
 * Format follow-up candidates into context for the heartbeat's outreach evaluation.
 */
export function formatFollowUps(candidates: FollowUpCandidate[]): string[] {
  return candidates.map((c) => {
    switch (c.type) {
      case 'commitment':
        return `FOLLOW-UP DUE: "${c.content}" (${c.reason})`;
      case 'follow_up':
        return `CHECK NEEDED: ${c.content} (${c.reason})`;
      case 'wellbeing':
        return `WELLBEING CHECK: Recent mood concerning — ${c.content}`;
      default:
        return `FOLLOW-UP: ${c.content}`;
    }
  });
}
