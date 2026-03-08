import { describe, it, expect } from 'vitest';
import {
  selectChannel,
  inferUrgency,
  needsResponse,
  type ChannelInput,
} from '../channel-selector';

const baseInput: ChannelInput = {
  messageLength: 80,
  urgency: 'normal',
  needsResponse: false,
  stakesLevel: 'low',
  timeOfDay: 'afternoon',
  isQuietMode: false,
};

describe('Channel Selector', () => {
  // ── Quiet Mode ─────────────────────────────────────────────────

  describe('quiet mode', () => {
    it('should be silent in quiet mode', () => {
      const result = selectChannel({ ...baseInput, isQuietMode: true });
      expect(result.channel).toBe('silent');
    });

    it('should let critical through quiet mode', () => {
      const result = selectChannel({
        ...baseInput,
        isQuietMode: true,
        urgency: 'critical',
      });
      expect(result.channel).toBe('push');
    });
  });

  // ── Night Time ─────────────────────────────────────────────────

  describe('night time', () => {
    it('should be silent at night for normal urgency', () => {
      const result = selectChannel({ ...baseInput, timeOfDay: 'night' });
      expect(result.channel).toBe('silent');
    });

    it('should push critical items at night', () => {
      const result = selectChannel({
        ...baseInput,
        timeOfDay: 'night',
        urgency: 'critical',
      });
      expect(result.channel).toBe('push');
    });

    it('should be silent for high urgency at night (only critical gets through)', () => {
      const result = selectChannel({
        ...baseInput,
        timeOfDay: 'night',
        urgency: 'high',
      });
      expect(result.channel).toBe('silent');
    });
  });

  // ── Stakes & Response ──────────────────────────────────────────

  describe('stakes and response', () => {
    it('should use chat for high-stakes items needing response', () => {
      const result = selectChannel({
        ...baseInput,
        stakesLevel: 'high',
        needsResponse: true,
      });
      expect(result.channel).toBe('chat');
    });

    it('should use chat for any item needing response', () => {
      const result = selectChannel({
        ...baseInput,
        needsResponse: true,
      });
      expect(result.channel).toBe('chat');
    });

    it('should push high-stakes items that don\'t need response', () => {
      const result = selectChannel({
        ...baseInput,
        stakesLevel: 'high',
        urgency: 'high',
        needsResponse: false,
      });
      expect(result.channel).toBe('push');
    });
  });

  // ── Urgency ────────────────────────────────────────────────────

  describe('urgency', () => {
    it('should push critical urgency items', () => {
      const result = selectChannel({ ...baseInput, urgency: 'critical' });
      expect(result.channel).toBe('push');
    });

    it('should push high urgency items', () => {
      const result = selectChannel({ ...baseInput, urgency: 'high' });
      expect(result.channel).toBe('push');
    });
  });

  // ── Message Length ─────────────────────────────────────────────

  describe('message length', () => {
    it('should push short messages', () => {
      const result = selectChannel({ ...baseInput, messageLength: 50 });
      expect(result.channel).toBe('push');
    });

    it('should use chat for long messages', () => {
      const result = selectChannel({ ...baseInput, messageLength: 250 });
      expect(result.channel).toBe('chat');
    });
  });

  // ── Evening ────────────────────────────────────────────────────

  describe('evening', () => {
    it('should prefer push in evening to avoid engagement', () => {
      const result = selectChannel({
        ...baseInput,
        timeOfDay: 'evening',
        messageLength: 150,
      });
      expect(result.channel).toBe('push');
    });
  });

  // ── Default ────────────────────────────────────────────────────

  describe('default', () => {
    it('should default to push for normal messages', () => {
      const result = selectChannel(baseInput);
      expect(result.channel).toBe('push');
    });
  });

  // ── Urgency Inference ──────────────────────────────────────────

  describe('inferUrgency', () => {
    it('should return critical for overdue high-stakes items', () => {
      expect(inferUrgency('high', -1)).toBe('critical');
    });

    it('should return high for overdue low-stakes items', () => {
      expect(inferUrgency('low', -1)).toBe('high');
    });

    it('should return critical when due within 1 hour', () => {
      expect(inferUrgency('low', 0.5)).toBe('critical');
    });

    it('should return high when due within 3 hours', () => {
      expect(inferUrgency('low', 2)).toBe('high');
    });

    it('should map stakes to base urgency when no time pressure', () => {
      expect(inferUrgency('high')).toBe('high');
      expect(inferUrgency('medium')).toBe('normal');
      expect(inferUrgency('low')).toBe('low');
    });
  });

  // ── Response Detection ─────────────────────────────────────────

  describe('needsResponse', () => {
    it('should detect questions', () => {
      expect(needsResponse('Did you finish the report?')).toBe(true);
    });

    it('should detect proposals', () => {
      expect(needsResponse('Shall I book the appointment?')).toBe(true);
      expect(needsResponse('Would you like me to remind you?')).toBe(true);
    });

    it('should detect confirmation requests', () => {
      expect(needsResponse('Please confirm the payment.')).toBe(true);
    });

    it('should return false for statements', () => {
      expect(needsResponse('The weather is nice today.')).toBe(false);
      expect(needsResponse('Your gym session is in 2 hours.')).toBe(false);
    });

    it('should detect "okay?" and "sound good"', () => {
      expect(needsResponse('I\'ll set the alarm for 6am, okay?')).toBe(true);
      expect(needsResponse('Does that sound good?')).toBe(true);
    });
  });

  // ── Realistic Scenarios ────────────────────────────────────────

  describe('realistic scenarios', () => {
    it('overdue bill reminder → push', () => {
      const result = selectChannel({
        messageLength: 60,
        urgency: inferUrgency('high', -24),
        needsResponse: false,
        stakesLevel: 'high',
        timeOfDay: 'morning',
        isQuietMode: false,
      });
      expect(result.channel).toBe('push');
    });

    it('booking proposal → chat', () => {
      const result = selectChannel({
        messageLength: 120,
        urgency: 'normal',
        needsResponse: true,
        stakesLevel: 'medium',
        timeOfDay: 'afternoon',
        isQuietMode: false,
      });
      expect(result.channel).toBe('chat');
    });

    it('late night low priority → silent', () => {
      const result = selectChannel({
        messageLength: 80,
        urgency: 'low',
        needsResponse: false,
        stakesLevel: 'low',
        timeOfDay: 'night',
        isQuietMode: false,
      });
      expect(result.channel).toBe('silent');
    });

    it('jan cooking dinner (quiet mode) → silent', () => {
      const result = selectChannel({
        messageLength: 100,
        urgency: 'normal',
        needsResponse: false,
        stakesLevel: 'medium',
        timeOfDay: 'evening',
        isQuietMode: true,
      });
      expect(result.channel).toBe('silent');
    });
  });
});
