/**
 * Channel Selector — Session 24.
 *
 * Edwin picks the RIGHT delivery channel for each communication.
 * Not everything is a chat message. Some things are notifications.
 * Some are silence. Edwin picks intelligently.
 *
 * Channels:
 *   push   — Quick reminders, time-sensitive, brief updates
 *   chat   — Suggestions needing response, proposals, conversations
 *   silent — Nothing meaningful, too late, Jan said "not right now"
 *
 * Selection factors:
 *   - Urgency (high → push, low → can wait)
 *   - Length (short → push, long → chat)
 *   - Response needed? (yes → chat, no → push)
 *   - Time of day (late → only urgent push)
 *   - Stakes (high → chat for confirmation)
 */

import type { TimeOfDay, StakesLevel } from '@edwin/shared';

export type DeliveryChannel = 'push' | 'chat' | 'dashboard' | 'silent';

export interface ChannelInput {
  messageLength: number;
  urgency: 'critical' | 'high' | 'normal' | 'low';
  needsResponse: boolean;
  stakesLevel: StakesLevel;
  timeOfDay: TimeOfDay;
  isQuietMode: boolean; // Jan said "not right now" or similar
}

export interface ChannelDecision {
  channel: DeliveryChannel;
  reason: string;
}

/**
 * Select the appropriate delivery channel for a message.
 */
export function selectChannel(input: ChannelInput): ChannelDecision {
  // Rule 1: Quiet mode — only critical gets through
  if (input.isQuietMode) {
    if (input.urgency === 'critical') {
      return { channel: 'push', reason: 'Critical item overrides quiet mode' };
    }
    return { channel: 'silent', reason: 'Jan is in quiet mode' };
  }

  // Rule 2: Night time — only critical/high urgency
  if (input.timeOfDay === 'night') {
    if (input.urgency === 'critical') {
      return { channel: 'push', reason: 'Critical item at night' };
    }
    return { channel: 'silent', reason: 'Too late — save for morning' };
  }

  // Rule 3: High stakes needing response → always chat
  if (input.stakesLevel === 'high' && input.needsResponse) {
    return { channel: 'chat', reason: 'High-stakes item needing confirmation' };
  }

  // Rule 4: Needs response → chat
  if (input.needsResponse) {
    return { channel: 'chat', reason: 'Requires Jan\'s input' };
  }

  // Rule 5: Critical/high urgency → push
  if (input.urgency === 'critical' || input.urgency === 'high') {
    return { channel: 'push', reason: 'Time-sensitive notification' };
  }

  // Rule 6: Short messages → push
  if (input.messageLength <= 100) {
    return { channel: 'push', reason: 'Brief update — notification' };
  }

  // Rule 7: Long messages → chat (so Jan can read at leisure)
  if (input.messageLength > 200) {
    return { channel: 'chat', reason: 'Longer message — chat for readability' };
  }

  // Rule 8: Evening → prefer push (wind-down, don't start conversations)
  if (input.timeOfDay === 'evening') {
    return { channel: 'push', reason: 'Evening — notification to avoid engagement' };
  }

  // Default: push notification for low-friction delivery
  return { channel: 'push', reason: 'Default — low-friction notification' };
}

/**
 * Determine urgency from stakes level and time sensitivity.
 */
export function inferUrgency(
  stakesLevel: StakesLevel,
  hoursUntilDue?: number,
): 'critical' | 'high' | 'normal' | 'low' {
  // Overdue
  if (hoursUntilDue !== undefined && hoursUntilDue < 0) {
    return stakesLevel === 'high' ? 'critical' : 'high';
  }

  // Due within 1 hour
  if (hoursUntilDue !== undefined && hoursUntilDue <= 1) {
    return 'critical';
  }

  // Due within 3 hours
  if (hoursUntilDue !== undefined && hoursUntilDue <= 3) {
    return 'high';
  }

  // Map stakes to base urgency
  switch (stakesLevel) {
    case 'high': return 'high';
    case 'medium': return 'normal';
    case 'low': return 'low';
  }
}

/**
 * Determine if a message needs a response based on content.
 */
export function needsResponse(message: string): boolean {
  const lower = message.toLowerCase();

  // Questions
  if (message.includes('?')) return true;

  // Proposals
  if (lower.includes('shall i') || lower.includes('would you like')
    || lower.includes('should i') || lower.includes('do you want')
    || lower.includes('okay?') || lower.includes('sound good')) {
    return true;
  }

  // Confirmation requests
  if (lower.includes('confirm') || lower.includes('approve')
    || lower.includes('authorize') || lower.includes('go ahead')) {
    return true;
  }

  return false;
}
