import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';
import {
  logExpense,
  getSpendingSummary,
  formatSpendingSummary,
  formatFinancialContext,
  addBill,
  markBillPaid,
  getAllBills,
  getUpcomingBills,
  formatBillsForClaude,
  checkDueBills,
} from '../finances';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Financial Awareness', () => {
  // ── Expense Logging ──────────────────────────────────────────

  describe('logExpense', () => {
    it('should log an expense', () => {
      const result = logExpense(store, {
        amount: 30,
        category: 'food',
        description: 'Wolt delivery',
        date: '2026-03-09',
      });

      expect(result).toContain('€30.00');
      expect(result).toContain('food');

      const obs = store.getObservationsByCategory('financial');
      expect(obs).toHaveLength(1);
      expect(obs[0].content).toContain('[expense] €30.00 food: Wolt delivery');
    });

    it('should reject invalid categories', () => {
      expect(() => logExpense(store, {
        amount: 10,
        category: 'gambling' as any,
        description: 'casino',
      })).toThrow('Invalid category');
    });

    it('should reject zero or negative amounts', () => {
      expect(() => logExpense(store, {
        amount: 0,
        category: 'food',
        description: 'free',
      })).toThrow('Amount must be positive');
    });

    it('should warn when approaching budget', () => {
      // Log expenses to reach 80% of food budget (€400)
      logExpense(store, { amount: 200, category: 'food', description: 'groceries', date: '2026-03-01' });
      logExpense(store, { amount: 100, category: 'food', description: 'restaurants', date: '2026-03-05' });
      const result = logExpense(store, { amount: 30, category: 'food', description: 'Wolt', date: '2026-03-09' });

      expect(result).toContain('Getting close');
    });

    it('should flag over budget', () => {
      logExpense(store, { amount: 250, category: 'food', description: 'groceries', date: '2026-03-01' });
      logExpense(store, { amount: 100, category: 'food', description: 'restaurants', date: '2026-03-05' });
      const result = logExpense(store, { amount: 60, category: 'food', description: 'Wolt', date: '2026-03-09' });

      expect(result).toContain('over budget');
    });
  });

  // ── Spending Summary ─────────────────────────────────────────

  describe('getSpendingSummary', () => {
    it('should return empty summary when no expenses', () => {
      const summary = getSpendingSummary(store, 'week', '2026-03-09');
      expect(summary.total).toBe(0);
      expect(summary.expenses).toHaveLength(0);
    });

    it('should summarise weekly spending', () => {
      logExpense(store, { amount: 30, category: 'food', description: 'Wolt', date: '2026-03-09' });
      logExpense(store, { amount: 50, category: 'transport', description: 'Fuel', date: '2026-03-10' });
      logExpense(store, { amount: 20, category: 'food', description: 'Billa', date: '2026-03-11' });

      const summary = getSpendingSummary(store, 'week', '2026-03-11');

      expect(summary.total).toBe(100);
      expect(summary.byCategory.food).toBe(50);
      expect(summary.byCategory.transport).toBe(50);
    });

    it('should summarise monthly spending', () => {
      logExpense(store, { amount: 100, category: 'food', description: 'Groceries', date: '2026-03-01' });
      logExpense(store, { amount: 50, category: 'food', description: 'Wolt', date: '2026-03-15' });
      logExpense(store, { amount: 200, category: 'housing', description: 'Utilities', date: '2026-03-10' });

      const summary = getSpendingSummary(store, 'month', '2026-03-15');

      expect(summary.total).toBe(350);
      expect(summary.byCategory.food).toBe(150);
      expect(summary.byCategory.housing).toBe(200);
    });

    it('should not include expenses from other periods', () => {
      logExpense(store, { amount: 100, category: 'food', description: 'Feb expense', date: '2026-02-28' });
      logExpense(store, { amount: 50, category: 'food', description: 'Mar expense', date: '2026-03-01' });

      const summary = getSpendingSummary(store, 'month', '2026-03-15');

      expect(summary.total).toBe(50);
    });
  });

  describe('formatSpendingSummary', () => {
    it('should format empty summary', () => {
      const summary = getSpendingSummary(store, 'week', '2026-03-09');
      const result = formatSpendingSummary(summary);
      expect(result).toContain('No expenses');
    });

    it('should format spending by category', () => {
      logExpense(store, { amount: 30, category: 'food', description: 'Wolt', date: '2026-03-09' });
      logExpense(store, { amount: 50, category: 'transport', description: 'Fuel', date: '2026-03-10' });

      const summary = getSpendingSummary(store, 'week', '2026-03-10');
      const result = formatSpendingSummary(summary);

      expect(result).toContain('€80.00 total');
      expect(result).toContain('Transport: €50.00');
      expect(result).toContain('Food: €30.00');
    });
  });

  // ── Bill Management ──────────────────────────────────────────

  describe('bill management', () => {
    it('should add a bill', () => {
      const id = addBill(store, 'Electricity', 187, 15, 'monthly', false);
      expect(id).toBeGreaterThan(0);

      const bills = getAllBills(store);
      expect(bills).toHaveLength(1);
      expect(bills[0].name).toBe('Electricity');
      expect(bills[0].amount).toBe(187);
      expect(bills[0].autoPay).toBe(false);
    });

    it('should add auto-pay bill', () => {
      addBill(store, 'Netflix', 15.99, 1, 'monthly', true);

      const bills = getAllBills(store);
      expect(bills[0].autoPay).toBe(true);
    });

    it('should mark bill as paid', () => {
      const id = addBill(store, 'Electricity', 187, 15, 'monthly', false);
      markBillPaid(store, id);

      const bills = getAllBills(store);
      expect(bills[0].lastPaid).not.toBeNull();
    });

    it('should throw for non-existent bill', () => {
      expect(() => markBillPaid(store, 999)).toThrow('Bill not found');
    });

    it('should get upcoming bills', () => {
      // Use today's context — add a bill due tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDay = tomorrow.getDate();
      const todayStr = new Date().toISOString().slice(0, 10);

      addBill(store, 'Due Tomorrow', 100, tomorrowDay, 'monthly', false);
      addBill(store, 'Due Far Away', 50, ((tomorrowDay + 15) % 28) + 1, 'monthly', false);

      const upcoming = getUpcomingBills(store, todayStr, 3);
      expect(upcoming.length).toBeGreaterThanOrEqual(1);
      expect(upcoming.some((b) => b.name === 'Due Tomorrow')).toBe(true);
    });

    it('should format bills for Claude', () => {
      addBill(store, 'Electricity', 187, 15, 'monthly', false);
      addBill(store, 'Netflix', 15.99, 1, 'monthly', true);

      const bills = getAllBills(store);
      const result = formatBillsForClaude(bills);

      expect(result).toContain('Electricity');
      expect(result).toContain('€187.00');
      expect(result).toContain('Netflix');
      expect(result).toContain('auto-pay');
    });

    it('should format empty bills', () => {
      const result = formatBillsForClaude([]);
      expect(result).toContain('No bills tracked');
    });
  });

  // ── Bill Due Reminders ───────────────────────────────────────

  describe('checkDueBills', () => {
    it('should create reminder for bills due within 3 days', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDay = tomorrow.getDate();

      addBill(store, 'Electricity', 187, tomorrowDay, 'monthly', false);

      const created = checkDueBills(store, 3);
      expect(created).toBe(1);

      const pending = store.getPendingActions(10);
      const billReminder = pending.find((a) => a.description.includes('Electricity'));
      expect(billReminder).toBeDefined();
      expect(billReminder!.stakes_level).toBe('high');
    });

    it('should not create reminder for auto-pay bills', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDay = tomorrow.getDate();

      addBill(store, 'Netflix', 15.99, tomorrowDay, 'monthly', true);

      const created = checkDueBills(store, 3);
      expect(created).toBe(0);
    });

    it('should not duplicate reminders', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDay = tomorrow.getDate();

      addBill(store, 'Electricity', 187, tomorrowDay, 'monthly', false);

      checkDueBills(store, 3);
      checkDueBills(store, 3); // Second call

      const pending = store.getPendingActions(10);
      const billReminders = pending.filter((a) => a.description.includes('Electricity'));
      expect(billReminders).toHaveLength(1);
    });
  });

  // ── Financial Context ────────────────────────────────────────

  describe('formatFinancialContext', () => {
    it('should return null when no financial data', () => {
      const result = formatFinancialContext(store, '2026-03-09');
      expect(result).toBeNull();
    });

    it('should include spending summary', () => {
      logExpense(store, { amount: 30, category: 'food', description: 'Wolt', date: '2026-03-09' });
      logExpense(store, { amount: 50, category: 'food', description: 'Groceries', date: '2026-03-10' });

      const result = formatFinancialContext(store, '2026-03-10');

      expect(result).toContain('FINANCIAL AWARENESS');
      expect(result).toContain('This week');
      expect(result).toContain('This month');
    });

    it('should flag over-budget categories', () => {
      logExpense(store, { amount: 250, category: 'food', description: 'Groceries', date: '2026-03-01' });
      logExpense(store, { amount: 200, category: 'food', description: 'Restaurants', date: '2026-03-10' });

      const result = formatFinancialContext(store, '2026-03-10');

      expect(result).toContain('OVER BUDGET');
    });

    it('should include upcoming bills', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDay = tomorrow.getDate();
      const todayStr = new Date().toISOString().slice(0, 10);

      addBill(store, 'Electricity', 187, tomorrowDay, 'monthly', false);
      // Also log an expense so financial context isn't null
      logExpense(store, { amount: 10, category: 'food', description: 'Coffee', date: todayStr });

      const result = formatFinancialContext(store, todayStr);

      expect(result).toContain('Upcoming bills');
      expect(result).toContain('Electricity');
    });
  });

  // ── Realistic Scenarios ──────────────────────────────────────

  describe('realistic scenarios', () => {
    it('Jan tracks a week of spending', () => {
      logExpense(store, { amount: 12, category: 'food', description: 'Lunch at work', date: '2026-03-09' });
      logExpense(store, { amount: 28, category: 'food', description: 'Wolt pizza', date: '2026-03-10' });
      logExpense(store, { amount: 45, category: 'transport', description: 'Full tank', date: '2026-03-10' });
      logExpense(store, { amount: 15, category: 'entertainment', description: 'Movie ticket', date: '2026-03-11' });
      logExpense(store, { amount: 8.50, category: 'food', description: 'Coffee beans', date: '2026-03-12' });

      const summary = getSpendingSummary(store, 'week', '2026-03-12');
      const formatted = formatSpendingSummary(summary);

      expect(summary.total).toBeCloseTo(108.50);
      expect(formatted).toContain('Food');
      expect(formatted).toContain('Transport');
    });

    it('Edwin notices Wolt overspending', () => {
      // €400 food budget — Jan keeps ordering Wolt
      logExpense(store, { amount: 30, category: 'food', description: 'Wolt', date: '2026-03-01' });
      logExpense(store, { amount: 35, category: 'food', description: 'Wolt', date: '2026-03-03' });
      logExpense(store, { amount: 28, category: 'food', description: 'Wolt', date: '2026-03-05' });
      logExpense(store, { amount: 32, category: 'food', description: 'Wolt', date: '2026-03-07' });
      logExpense(store, { amount: 100, category: 'food', description: 'Groceries', date: '2026-03-08' });
      logExpense(store, { amount: 120, category: 'food', description: 'More groceries', date: '2026-03-09' });

      // This expense should push over 80%
      const result = logExpense(store, { amount: 25, category: 'food', description: 'Wolt again', date: '2026-03-10' });
      expect(result).toContain('Getting close');
    });

    it('bill tracking full lifecycle', () => {
      const id = addBill(store, 'Electricity', 187, 15, 'monthly', false);

      const bills = getAllBills(store);
      expect(bills).toHaveLength(1);
      expect(bills[0].lastPaid).toBeNull();

      markBillPaid(store, id);

      const updated = getAllBills(store);
      expect(updated[0].lastPaid).not.toBeNull();
    });
  });
});
