/**
 * Stakes Engine — Session 30.
 *
 * Edwin proposes actions at the right stakes level:
 *   Low:    cost < €10, reversible, routine → almost assumes yes
 *   Medium: cost €10-50, semi-reversible → proposes, waits for confirmation
 *   High:   cost > €50, financial, irreversible → presents options, waits for authorization
 *
 * Over time, Edwin learns what Jan always says yes to and shifts
 * toward auto-approval for those categories.
 */

import type { StakesLevel } from '@edwin/shared';
import { MemoryStore } from '../../memory/store.js';

// ── Types ────────────────────────────────────────────────────────

export interface ProposalEvaluation {
  stakesLevel: StakesLevel;
  approach: 'act' | 'propose' | 'discuss';
  reason: string;
  requiresConfirmation: boolean;
}

export interface ProposalRecord {
  id: number;
  description: string;
  stakesLevel: StakesLevel;
  category: string;
  status: 'proposed' | 'accepted' | 'declined' | 'executing' | 'done';
  proposedAt: string;
  resolvedAt: string | null;
}

// ── Stakes Classification ────────────────────────────────────────

export interface StakesInput {
  estimatedCost?: number;        // in EUR
  isReversible: boolean;
  isFinancial: boolean;
  isRoutine: boolean;
  category: string;              // e.g., 'supplement_reorder', 'booking', 'transfer'
  description: string;
}

/**
 * Classify the stakes level of a proposed action.
 */
export function classifyStakes(input: StakesInput): StakesLevel {
  const cost = input.estimatedCost ?? 0;

  // High stakes: > €50, financial moves, irreversible
  if (cost > 50 || (input.isFinancial && cost > 0) || (!input.isReversible && cost > 20)) {
    return 'high';
  }

  // Low stakes: < €10, reversible, routine
  if (cost <= 10 && input.isReversible && input.isRoutine) {
    return 'low';
  }

  // Medium: everything else
  return 'medium';
}

// ── Approach Decision ────────────────────────────────────────────

/**
 * Determine how Edwin should handle a proposal based on stakes
 * and Jan's historical approval patterns.
 */
export function evaluateProposal(
  input: StakesInput,
  autoApprovedCategories: Set<string>,
): ProposalEvaluation {
  const stakesLevel = classifyStakes(input);

  // Check if this category has been auto-approved by Jan's pattern
  if (autoApprovedCategories.has(input.category)) {
    return {
      stakesLevel,
      approach: 'act',
      reason: `Auto-approved: Jan always says yes to ${input.category}`,
      requiresConfirmation: false,
    };
  }

  switch (stakesLevel) {
    case 'low':
      return {
        stakesLevel: 'low',
        approach: 'act',
        reason: 'Low stakes — acting with confidence',
        requiresConfirmation: false,
      };

    case 'medium':
      return {
        stakesLevel: 'medium',
        approach: 'propose',
        reason: 'Medium stakes — proposing and waiting for confirmation',
        requiresConfirmation: true,
      };

    case 'high':
      return {
        stakesLevel: 'high',
        approach: 'discuss',
        reason: 'High stakes — presenting options, awaiting authorization',
        requiresConfirmation: true,
      };
  }
}

// ── Approval Pattern Tracking ────────────────────────────────────

const APPROVAL_THRESHOLD = 3; // Jan needs to approve N times before auto-approval

/**
 * Track a proposal response (accepted or declined).
 */
export function trackProposalResponse(
  store: MemoryStore,
  category: string,
  accepted: boolean,
): void {
  const key = accepted ? `approval_count/${category}` : `decline_count/${category}`;
  const existing = store.getIdentity('auto_approval', key);

  const currentCount = existing ? parseInt(existing.value, 10) : 0;
  store.setIdentity('auto_approval', key, String(currentCount + 1), 'observed', 1.0);

  // Check if we should auto-approve this category now
  if (accepted) {
    const approvals = currentCount + 1;
    const declineKey = `decline_count/${category}`;
    const declineRow = store.getIdentity('auto_approval', declineKey);
    const declines = declineRow ? parseInt(declineRow.value, 10) : 0;

    // Auto-approve if approved N+ times with no declines
    if (approvals >= APPROVAL_THRESHOLD && declines === 0) {
      store.setIdentity('auto_approval', `auto_approved/${category}`, 'true', 'observed', 0.9);
    }
  }
}

/**
 * Get all auto-approved categories.
 */
export function getAutoApprovedCategories(store: MemoryStore): Set<string> {
  const categories = new Set<string>();

  // Search identity for auto_approved entries
  const identityEntries = store.getIdentityCategory('auto_approval');
  for (const entry of identityEntries) {
    if (entry.key.startsWith('auto_approved/') && entry.value === 'true') {
      const category = entry.key.replace('auto_approved/', '');
      categories.add(category);
    }
  }

  return categories;
}

// ── Proposal Status Management ───────────────────────────────────

/**
 * Create a proposal and store it as a scheduled action.
 */
export function createProposal(
  store: MemoryStore,
  description: string,
  stakesLevel: StakesLevel,
  category: string,
): number {
  return store.addScheduledAction(
    'proposal',
    `[${category}] ${description}`,
    new Date().toISOString(),
    stakesLevel,
  );
}

/**
 * Get pending proposals (unanswered).
 */
export function getPendingProposals(store: MemoryStore, limit: number = 10): ProposalRecord[] {
  const actions = store.getPendingActions(limit);
  return actions
    .filter((a) => a.type === 'proposal')
    .map((a) => ({
      id: a.id,
      description: a.description.replace(/^\[.*?\]\s*/, ''),
      stakesLevel: a.stakes_level as StakesLevel,
      category: extractCategory(a.description),
      status: 'proposed' as const,
      proposedAt: a.created_at,
      resolvedAt: null,
    }));
}

function extractCategory(description: string): string {
  const match = description.match(/^\[(.+?)\]/);
  return match ? match[1] : 'general';
}

/**
 * Format the stakes approach for Claude's system prompt.
 * This tells Claude how to handle proposals at each level.
 */
export function formatStakesGuidance(autoApproved: Set<string>): string {
  const lines = [
    '[STAKES & ACTION FRAMEWORK]',
    'When proposing actions to Jan:',
    '',
    'LOW stakes (< €10, reversible, routine):',
    '  → Act with confidence. "I\'ve ordered your creatine, arriving Thursday."',
    '  → Don\'t ask for permission on small, routine things.',
    '',
    'MEDIUM stakes (€10-50, semi-reversible):',
    '  → Propose clearly with a ready option. "Maria is available Saturday 10am, €45. Shall I book?"',
    '  → Wait for "yes" before acting.',
    '',
    'HIGH stakes (> €50, financial, irreversible):',
    '  → Present the situation and options. "Your electricity bill is €187. Pay now or schedule for Friday?"',
    '  → Wait for explicit authorization.',
  ];

  if (autoApproved.size > 0) {
    lines.push('');
    lines.push('AUTO-APPROVED (Jan always says yes to these):');
    for (const cat of autoApproved) {
      lines.push(`  - ${cat}`);
    }
  }

  return lines.join('\n');
}
