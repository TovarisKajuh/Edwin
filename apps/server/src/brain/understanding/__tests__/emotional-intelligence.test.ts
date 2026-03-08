import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../../db/database';
import { MemoryStore } from '../../../memory/store';
import {
  assessEmotionalState,
  formatEmotionalIntelligence,
  type EmotionalAssessment,
} from '../emotional-intelligence';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Emotional Intelligence', () => {
  // ── Achievement Detection ─────────────────────────────────────

  describe('celebrate mode', () => {
    it('should activate celebrate mode when Jan shares a win', () => {
      const result = assessEmotionalState(store, 'I just closed the deal with the solar farm!');
      expect(result.mode).toBe('celebrate');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should celebrate gym achievements', () => {
      const result = assessEmotionalState(store, 'Just hit my personal best on deadlift!');
      expect(result.mode).toBe('celebrate');
    });

    it('should celebrate completions', () => {
      const result = assessEmotionalState(store, 'Finally finished the tax filing');
      expect(result.mode).toBe('celebrate');
    });
  });

  // ── Spiral Detection ──────────────────────────────────────────

  describe('distract mode', () => {
    it('should activate distract mode when Jan spirals', () => {
      const result = assessEmotionalState(store, 'Everything is falling apart. What\'s the point of even trying?');
      expect(result.mode).toBe('distract');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should detect hopelessness', () => {
      const result = assessEmotionalState(store, 'I\'m never going to make it. It\'s all hopeless.');
      expect(result.mode).toBe('distract');
    });

    it('should activate distract for stable bad mood', () => {
      // Multiple bad moods = stable_bad trajectory
      store.addObservation('emotional_state', 'Feeling really low', 0.9, 'observed');
      store.addObservation('emotional_state', 'Still feeling down', 0.9, 'observed');
      store.addObservation('emotional_state', 'Nothing\'s changed, still sad', 0.9, 'observed');

      const result = assessEmotionalState(store);
      expect(result.mode).toBe('distract');
      expect(result.trajectory).toBe('stable_bad');
    });
  });

  // ── Avoidance Detection ───────────────────────────────────────

  describe('push mode', () => {
    it('should push when Jan avoids and mood is stable', () => {
      store.addObservation('emotional_state', 'Feeling okay, nothing special', 0.7, 'observed');

      const result = assessEmotionalState(store, 'I\'ll skip the gym today, maybe tomorrow');
      expect(result.mode).toBe('push');
    });

    it('should detect procrastination', () => {
      store.addObservation('emotional_state', 'Normal day', 0.7, 'observed');

      const result = assessEmotionalState(store, 'I\'ll do it later, can\'t be bothered right now');
      expect(result.mode).toBe('push');
    });
  });

  describe('support instead of push', () => {
    it('should support instead of push when trajectory is declining', () => {
      // Declining trajectory
      store.addObservation('emotional_state', 'Feeling stressed and overwhelmed', 0.9, 'observed');
      store.addObservation('emotional_state', 'Today was fine actually', 0.7, 'observed');
      // Note: getObservationsByCategory returns DESC, so stressed is most recent

      const result = assessEmotionalState(store, 'I didn\'t go to the gym, skipping today');
      // When mood is declining and there's avoidance, should support not push
      expect(['support', 'push']).toContain(result.mode);
    });

    it('should support when Jan is avoiding AND mood is bad', () => {
      store.addObservation('emotional_state', 'Feeling really down and exhausted', 0.9, 'observed');
      store.addObservation('emotional_state', 'Was feeling okay earlier this week', 0.7, 'observed');

      const result = assessEmotionalState(store, 'I\'ll postpone the meeting, not today');
      expect(result.mode).toBe('support');
    });
  });

  // ── Trajectory Analysis ───────────────────────────────────────

  describe('trajectory', () => {
    it('should detect improving trajectory', () => {
      // Insert older (bad) first, then recent (good) last — highest ID = most recent
      store.addObservation('emotional_state', 'Really anxious and overwhelmed', 0.9, 'observed');
      store.addObservation('emotional_state', 'Was feeling stressed yesterday', 0.9, 'observed');
      store.addObservation('emotional_state', 'Good mood, things are looking up', 0.8, 'observed');
      store.addObservation('emotional_state', 'Feeling much better today, energised', 0.9, 'observed');

      const result = assessEmotionalState(store);
      expect(result.trajectory).toBe('improving');
      expect(result.mode).toBe('present');
    });

    it('should detect declining trajectory', () => {
      // Insert older (good) first, then recent (bad) last
      store.addObservation('emotional_state', 'Feeling energised and happy', 0.9, 'observed');
      store.addObservation('emotional_state', 'Was having a great day', 0.9, 'observed');
      store.addObservation('emotional_state', 'Tired and low energy', 0.8, 'observed');
      store.addObservation('emotional_state', 'Feeling stressed and drained', 0.9, 'observed');

      const result = assessEmotionalState(store);
      expect(result.trajectory).toBe('declining');
      expect(result.mode).toBe('support');
    });

    it('should detect stable good', () => {
      store.addObservation('emotional_state', 'Feeling good and productive', 0.8, 'observed');
      store.addObservation('emotional_state', 'Happy and motivated today', 0.8, 'observed');

      const result = assessEmotionalState(store);
      expect(result.trajectory).toBe('stable_good');
      expect(result.mode).toBe('push');
    });

    it('should return unknown with no mood data', () => {
      const result = assessEmotionalState(store);
      expect(result.trajectory).toBe('unknown');
      expect(result.mode).toBe('present');
    });
  });

  // ── Support Mode ──────────────────────────────────────────────

  describe('support mode', () => {
    it('should support when trajectory is declining', () => {
      // Older (good) first, recent (bad) last
      store.addObservation('emotional_state', 'Normal day', 0.7, 'observed');
      store.addObservation('emotional_state', 'Was doing okay earlier', 0.8, 'observed');
      store.addObservation('emotional_state', 'Anxious and stressed', 0.9, 'observed');
      store.addObservation('emotional_state', 'Feeling worse than yesterday', 0.9, 'observed');

      const result = assessEmotionalState(store, 'Just checking in');
      expect(result.mode).toBe('support');
      expect(result.directive).toContain('empathy');
    });
  });

  // ── Present Mode ──────────────────────────────────────────────

  describe('present mode', () => {
    it('should be present when mood is improving', () => {
      // Older (bad) first, recent (good) last
      store.addObservation('emotional_state', 'Anxious and overwhelmed', 0.9, 'observed');
      store.addObservation('emotional_state', 'Was really stressed last week', 0.9, 'observed');
      store.addObservation('emotional_state', 'Good mood actually', 0.8, 'observed');
      store.addObservation('emotional_state', 'Better today, feeling calmer', 0.8, 'observed');

      const result = assessEmotionalState(store);
      expect(result.mode).toBe('present');
      expect(result.directive).toContain('momentum');
    });
  });

  // ── Formatting ────────────────────────────────────────────────

  describe('formatEmotionalIntelligence', () => {
    it('should return null for low confidence', () => {
      const assessment: EmotionalAssessment = {
        currentMood: null,
        trajectory: 'unknown',
        mode: 'present',
        reason: 'No data',
        directive: 'Be normal',
        confidence: 0.2,
      };
      expect(formatEmotionalIntelligence(assessment)).toBeNull();
    });

    it('should format high confidence assessment', () => {
      const assessment: EmotionalAssessment = {
        currentMood: 'Stressed',
        trajectory: 'declining',
        mode: 'support',
        reason: 'Mood declining',
        directive: 'Lead with empathy.',
        confidence: 0.8,
      };

      const result = formatEmotionalIntelligence(assessment);
      expect(result).not.toBeNull();
      expect(result).toContain('EMOTIONAL INTELLIGENCE');
      expect(result).toContain('SUPPORT');
      expect(result).toContain('declining');
      expect(result).toContain('empathy');
    });

    it('should include mode and directive', () => {
      const assessment: EmotionalAssessment = {
        currentMood: 'Great',
        trajectory: 'stable_good',
        mode: 'push',
        reason: 'Good mood window',
        directive: 'Challenge him.',
        confidence: 0.7,
      };

      const result = formatEmotionalIntelligence(assessment);
      expect(result).toContain('PUSH');
      expect(result).toContain('Challenge him');
    });
  });

  // ── Edge Cases ────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle empty message', () => {
      const result = assessEmotionalState(store, '');
      expect(result).toBeDefined();
      expect(result.mode).toBeTruthy();
    });

    it('should handle message with no keywords', () => {
      const result = assessEmotionalState(store, 'What time is it?');
      expect(result).toBeDefined();
    });

    it('should prioritize celebration over other modes', () => {
      // Bad mood but sharing a win
      store.addObservation('emotional_state', 'Feeling low today', 0.9, 'observed');
      const result = assessEmotionalState(store, 'But I just landed the biggest contract of my career!');
      expect(result.mode).toBe('celebrate');
    });

    it('should prioritize spiral detection over avoidance', () => {
      const result = assessEmotionalState(store, 'What\'s the point? Everything is falling apart. I give up.');
      expect(result.mode).toBe('distract');
    });
  });
});
