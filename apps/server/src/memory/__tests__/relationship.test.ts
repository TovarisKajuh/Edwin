import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../store';
import {
  addMilestone,
  getMilestones,
  getMilestonesByType,
  searchMilestones,
  checkAnniversaries,
  getRelationshipDuration,
  getConversationCount,
  formatRelationshipContext,
} from '../relationship';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Relationship Memory', () => {
  // ── Milestone Storage ─────────────────────────────────────────

  describe('addMilestone', () => {
    it('should store a milestone as observation', () => {
      addMilestone(store, 'achievement', 'Landed €50K solar contract', '2026-03-08');

      const milestones = getMilestones(store);
      expect(milestones.length).toBe(1);
      expect(milestones[0].type).toBe('achievement');
      expect(milestones[0].content).toContain('€50K');
      expect(milestones[0].date).toBe('2026-03-08');
    });

    it('should deduplicate identical milestones', () => {
      addMilestone(store, 'achievement', 'Won the deal', '2026-03-08');
      addMilestone(store, 'achievement', 'Won the deal', '2026-03-08');

      const milestones = getMilestones(store);
      expect(milestones.length).toBe(1);
    });

    it('should store different milestone types', () => {
      addMilestone(store, 'achievement', 'Contract signed', '2026-03-01');
      addMilestone(store, 'struggle', 'Lost a client', '2026-03-03');
      addMilestone(store, 'growth', 'Started meditating daily', '2026-03-05');
      addMilestone(store, 'humor', 'The coffee machine joke', '2026-03-06');
      addMilestone(store, 'connection', 'Jan thanked Edwin genuinely', '2026-03-07');

      const milestones = getMilestones(store);
      expect(milestones.length).toBe(5);
    });
  });

  // ── Milestone Retrieval ───────────────────────────────────────

  describe('getMilestonesByType', () => {
    it('should filter by type', () => {
      addMilestone(store, 'achievement', 'Win A', '2026-03-01');
      addMilestone(store, 'achievement', 'Win B', '2026-03-02');
      addMilestone(store, 'struggle', 'Loss A', '2026-03-03');

      const achievements = getMilestonesByType(store, 'achievement');
      expect(achievements.length).toBe(2);
      expect(achievements.every((m) => m.type === 'achievement')).toBe(true);
    });
  });

  describe('searchMilestones', () => {
    it('should find milestones by keyword', () => {
      addMilestone(store, 'achievement', 'Signed solar contract', '2026-03-01');
      addMilestone(store, 'achievement', 'Hit gym streak 30 days', '2026-03-05');
      addMilestone(store, 'struggle', 'Solar panel issue', '2026-03-03');

      const results = searchMilestones(store, 'solar');
      expect(results.length).toBe(2);
    });

    it('should return empty for no matches', () => {
      addMilestone(store, 'achievement', 'Something unrelated', '2026-03-01');
      const results = searchMilestones(store, 'nonexistent');
      expect(results.length).toBe(0);
    });
  });

  // ── Anniversaries ─────────────────────────────────────────────

  describe('checkAnniversaries', () => {
    it('should find milestones from the same date in previous years', () => {
      addMilestone(store, 'achievement', 'First big deal', '2025-03-08');

      const ref = new Date('2026-03-08T12:00:00Z');
      const anniversaries = checkAnniversaries(store, ref);
      expect(anniversaries.length).toBe(1);
      expect(anniversaries[0].content).toContain('First big deal');
    });

    it('should find milestones within 3 days', () => {
      addMilestone(store, 'achievement', 'Almost-date milestone', '2025-03-06');

      const ref = new Date('2026-03-08T12:00:00Z');
      const anniversaries = checkAnniversaries(store, ref);
      expect(anniversaries.length).toBe(1);
    });

    it('should not find same-year milestones', () => {
      addMilestone(store, 'achievement', 'This year milestone', '2026-03-08');

      const ref = new Date('2026-03-08T12:00:00Z');
      const anniversaries = checkAnniversaries(store, ref);
      expect(anniversaries.length).toBe(0);
    });

    it('should return empty when no anniversaries', () => {
      addMilestone(store, 'achievement', 'June milestone', '2025-06-15');

      const ref = new Date('2026-03-08T12:00:00Z');
      const anniversaries = checkAnniversaries(store, ref);
      expect(anniversaries.length).toBe(0);
    });
  });

  // ── Relationship Duration ─────────────────────────────────────

  describe('getRelationshipDuration', () => {
    it('should return 0 with no conversations', () => {
      const result = getRelationshipDuration(store);
      expect(result.days).toBe(0);
      expect(result.firstInteraction).toBeNull();
    });

    it('should calculate days since first conversation', () => {
      store.startConversation('chat');

      const result = getRelationshipDuration(store);
      expect(result.days).toBeGreaterThanOrEqual(0);
      expect(result.firstInteraction).not.toBeNull();
    });
  });

  describe('getConversationCount', () => {
    it('should return 0 with no conversations', () => {
      expect(getConversationCount(store)).toBe(0);
    });

    it('should count conversations', () => {
      store.startConversation('chat');
      store.startConversation('chat');
      store.startConversation('voice');

      expect(getConversationCount(store)).toBe(3);
    });
  });

  // ── Context Formatting ────────────────────────────────────────

  describe('formatRelationshipContext', () => {
    it('should return null with no milestones', () => {
      const result = formatRelationshipContext(store);
      expect(result).toBeNull();
    });

    it('should format milestones into context', () => {
      addMilestone(store, 'achievement', 'Signed solar deal', '2026-03-01');
      addMilestone(store, 'growth', 'Started morning routine', '2026-03-05');

      const result = formatRelationshipContext(store);
      expect(result).not.toBeNull();
      expect(result).toContain('SHARED HISTORY');
      expect(result).toContain('achievement');
      expect(result).toContain('growth');
    });

    it('should include relationship duration', () => {
      store.startConversation('chat');
      addMilestone(store, 'achievement', 'Test win', '2026-03-01');

      const result = formatRelationshipContext(store);
      expect(result).toContain('day(s) together');
    });

    it('should include total wins count', () => {
      addMilestone(store, 'achievement', 'Win 1', '2026-03-01');
      addMilestone(store, 'achievement', 'Win 2', '2026-03-02');
      addMilestone(store, 'achievement', 'Win 3', '2026-03-03');

      const result = formatRelationshipContext(store);
      expect(result).toContain('Total wins remembered: 3');
    });

    it('should include usage instruction', () => {
      addMilestone(store, 'achievement', 'Something', '2026-03-01');

      const result = formatRelationshipContext(store);
      expect(result).toContain('reference past wins');
    });
  });
});
