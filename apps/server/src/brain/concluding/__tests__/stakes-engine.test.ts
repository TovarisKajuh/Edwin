import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../../db/database';
import { MemoryStore } from '../../../memory/store';
import {
  classifyStakes,
  evaluateProposal,
  trackProposalResponse,
  getAutoApprovedCategories,
  createProposal,
  getPendingProposals,
  formatStakesGuidance,
  type StakesInput,
} from '../stakes-engine';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Stakes Engine', () => {
  // ── Stakes Classification ─────────────────────────────────────

  describe('classifyStakes', () => {
    it('should classify cheap, reversible, routine actions as low', () => {
      const result = classifyStakes({
        estimatedCost: 8,
        isReversible: true,
        isFinancial: false,
        isRoutine: true,
        category: 'supplement_reorder',
        description: 'Reorder creatine',
      });
      expect(result).toBe('low');
    });

    it('should classify mid-range actions as medium', () => {
      const result = classifyStakes({
        estimatedCost: 30,
        isReversible: true,
        isFinancial: false,
        isRoutine: false,
        category: 'booking',
        description: 'Book haircut',
      });
      expect(result).toBe('medium');
    });

    it('should classify expensive actions as high', () => {
      const result = classifyStakes({
        estimatedCost: 100,
        isReversible: true,
        isFinancial: false,
        isRoutine: false,
        category: 'purchase',
        description: 'Buy office chair',
      });
      expect(result).toBe('high');
    });

    it('should classify financial moves as high regardless of amount', () => {
      const result = classifyStakes({
        estimatedCost: 15,
        isReversible: true,
        isFinancial: true,
        isRoutine: false,
        category: 'transfer',
        description: 'Transfer to savings',
      });
      expect(result).toBe('high');
    });

    it('should classify irreversible actions above €20 as high', () => {
      const result = classifyStakes({
        estimatedCost: 25,
        isReversible: false,
        isFinancial: false,
        isRoutine: false,
        category: 'booking',
        description: 'Non-refundable hotel booking',
      });
      expect(result).toBe('high');
    });

    it('should classify free routine actions as low', () => {
      const result = classifyStakes({
        estimatedCost: 0,
        isReversible: true,
        isFinancial: false,
        isRoutine: true,
        category: 'alarm',
        description: 'Set morning alarm',
      });
      expect(result).toBe('low');
    });
  });

  // ── Proposal Evaluation ───────────────────────────────────────

  describe('evaluateProposal', () => {
    it('should act on low stakes', () => {
      const input: StakesInput = {
        estimatedCost: 5,
        isReversible: true,
        isFinancial: false,
        isRoutine: true,
        category: 'supplement_reorder',
        description: 'Reorder creatine',
      };
      const result = evaluateProposal(input, new Set());

      expect(result.approach).toBe('act');
      expect(result.requiresConfirmation).toBe(false);
    });

    it('should propose on medium stakes', () => {
      const input: StakesInput = {
        estimatedCost: 45,
        isReversible: true,
        isFinancial: false,
        isRoutine: false,
        category: 'booking',
        description: 'Book haircut',
      };
      const result = evaluateProposal(input, new Set());

      expect(result.approach).toBe('propose');
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should discuss high stakes', () => {
      const input: StakesInput = {
        estimatedCost: 200,
        isReversible: false,
        isFinancial: true,
        isRoutine: false,
        category: 'transfer',
        description: 'Move money to savings',
      };
      const result = evaluateProposal(input, new Set());

      expect(result.approach).toBe('discuss');
      expect(result.requiresConfirmation).toBe(true);
    });

    it('should auto-approve if category is pre-approved', () => {
      const autoApproved = new Set(['supplement_reorder']);
      const input: StakesInput = {
        estimatedCost: 30, // Would normally be medium
        isReversible: true,
        isFinancial: false,
        isRoutine: true,
        category: 'supplement_reorder',
        description: 'Reorder creatine',
      };
      const result = evaluateProposal(input, autoApproved);

      expect(result.approach).toBe('act');
      expect(result.requiresConfirmation).toBe(false);
      expect(result.reason).toContain('Auto-approved');
    });
  });

  // ── Approval Pattern Tracking ─────────────────────────────────

  describe('trackProposalResponse', () => {
    it('should track approvals', () => {
      trackProposalResponse(store, 'supplement_reorder', true);
      trackProposalResponse(store, 'supplement_reorder', true);

      const row = store.getIdentity('auto_approval', 'approval_count/supplement_reorder');
      expect(row?.value).toBe('2');
    });

    it('should track declines', () => {
      trackProposalResponse(store, 'booking', false);

      const row = store.getIdentity('auto_approval', 'decline_count/booking');
      expect(row?.value).toBe('1');
    });

    it('should auto-approve after 3 consecutive approvals', () => {
      trackProposalResponse(store, 'supplement_reorder', true);
      trackProposalResponse(store, 'supplement_reorder', true);
      trackProposalResponse(store, 'supplement_reorder', true);

      const autoApproved = getAutoApprovedCategories(store);
      expect(autoApproved.has('supplement_reorder')).toBe(true);
    });

    it('should not auto-approve if there are declines', () => {
      trackProposalResponse(store, 'booking', true);
      trackProposalResponse(store, 'booking', false);
      trackProposalResponse(store, 'booking', true);
      trackProposalResponse(store, 'booking', true);

      const autoApproved = getAutoApprovedCategories(store);
      expect(autoApproved.has('booking')).toBe(false);
    });

    it('should track multiple categories independently', () => {
      trackProposalResponse(store, 'supplement_reorder', true);
      trackProposalResponse(store, 'supplement_reorder', true);
      trackProposalResponse(store, 'supplement_reorder', true);

      trackProposalResponse(store, 'booking', true);

      const autoApproved = getAutoApprovedCategories(store);
      expect(autoApproved.has('supplement_reorder')).toBe(true);
      expect(autoApproved.has('booking')).toBe(false);
    });
  });

  // ── Proposal Management ───────────────────────────────────────

  describe('createProposal / getPendingProposals', () => {
    it('should create and retrieve proposals', () => {
      createProposal(store, 'Book Maria for Saturday', 'medium', 'booking');

      const pending = getPendingProposals(store);
      expect(pending).toHaveLength(1);
      expect(pending[0].description).toBe('Book Maria for Saturday');
      expect(pending[0].category).toBe('booking');
      expect(pending[0].stakesLevel).toBe('medium');
    });

    it('should not include completed proposals', () => {
      const id = createProposal(store, 'Order supplements', 'low', 'supplement_reorder');
      store.markActionDone(id);

      const pending = getPendingProposals(store);
      expect(pending).toHaveLength(0);
    });

    it('should only return proposals (not reminders or notifications)', () => {
      createProposal(store, 'Book haircut', 'medium', 'booking');
      store.addScheduledAction('reminder', 'Call electrician', new Date().toISOString(), 'medium');
      store.addScheduledAction('notification', 'Good morning', new Date().toISOString(), 'low');

      const pending = getPendingProposals(store);
      expect(pending).toHaveLength(1);
      expect(pending[0].description).toBe('Book haircut');
    });
  });

  // ── Formatting ────────────────────────────────────────────────

  describe('formatStakesGuidance', () => {
    it('should include all three levels', () => {
      const result = formatStakesGuidance(new Set());

      expect(result).toContain('LOW stakes');
      expect(result).toContain('MEDIUM stakes');
      expect(result).toContain('HIGH stakes');
    });

    it('should include auto-approved categories', () => {
      const autoApproved = new Set(['supplement_reorder', 'alarm']);
      const result = formatStakesGuidance(autoApproved);

      expect(result).toContain('AUTO-APPROVED');
      expect(result).toContain('supplement_reorder');
      expect(result).toContain('alarm');
    });

    it('should not include auto-approved section when empty', () => {
      const result = formatStakesGuidance(new Set());
      expect(result).not.toContain('AUTO-APPROVED');
    });
  });

  // ── Realistic Scenarios ────────────────────────────────────────

  describe('realistic scenarios', () => {
    it('Edwin learns Jan always approves supplement reorders', () => {
      // Jan approves 3 supplement reorders in a row
      for (let i = 0; i < 3; i++) {
        createProposal(store, 'Reorder creatine', 'low', 'supplement_reorder');
        trackProposalResponse(store, 'supplement_reorder', true);
      }

      const autoApproved = getAutoApprovedCategories(store);
      expect(autoApproved.has('supplement_reorder')).toBe(true);

      // Now Edwin should act without asking
      const eval1 = evaluateProposal({
        estimatedCost: 25,
        isReversible: true,
        isFinancial: false,
        isRoutine: true,
        category: 'supplement_reorder',
        description: 'Reorder protein powder',
      }, autoApproved);

      expect(eval1.approach).toBe('act');
      expect(eval1.requiresConfirmation).toBe(false);
    });

    it('booking flow: propose → approve → execute', () => {
      const id = createProposal(store, 'Book Maria for Saturday 10am, €45', 'medium', 'booking');

      // Pending
      let pending = getPendingProposals(store);
      expect(pending).toHaveLength(1);

      // Jan approves
      trackProposalResponse(store, 'booking', true);
      store.markActionDone(id);

      // No longer pending
      pending = getPendingProposals(store);
      expect(pending).toHaveLength(0);
    });
  });
});
