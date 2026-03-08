/**
 * Financial Awareness — Session 33.
 *
 * Edwin tracks spending, bills, and budgets:
 *   - Expense logging with category and amount
 *   - Spending summaries (weekly, monthly, by category)
 *   - Bill tracking with due date reminders
 *   - Budget comparison and pattern flagging
 *
 * Expenses stored as observations with category 'financial'.
 * Bills stored in the 'bills' table.
 */

import { MemoryStore } from '../memory/store.js';

// ── Types ────────────────────────────────────────────────────────

export type ExpenseCategory = 'food' | 'transport' | 'shopping' | 'entertainment' | 'health' | 'business' | 'housing' | 'subscriptions' | 'other';

export interface Expense {
  amount: number;      // EUR
  category: ExpenseCategory;
  description: string;
  date?: string;       // YYYY-MM-DD
}

export interface SpendingSummary {
  period: string;
  total: number;
  byCategory: Record<string, number>;
  expenses: { amount: number; category: string; description: string; date: string }[];
}

export interface BillRecord {
  id: number;
  name: string;
  amount: number | null;
  currency: string;
  dueDay: number | null;
  frequency: string | null;
  autoPay: boolean;
  lastPaid: string | null;
  nextDue: string | null;
}

// ── Constants ────────────────────────────────────────────────────

const VALID_CATEGORIES: ExpenseCategory[] = [
  'food', 'transport', 'shopping', 'entertainment', 'health', 'business', 'housing', 'subscriptions', 'other',
];

const MONTHLY_BUDGETS: Record<ExpenseCategory, number> = {
  food: 400,
  transport: 150,
  shopping: 200,
  entertainment: 100,
  health: 100,
  business: 500,
  housing: 800,
  subscriptions: 50,
  other: 150,
};

// ── Expense Logging ──────────────────────────────────────────────

/**
 * Log an expense.
 */
export function logExpense(store: MemoryStore, expense: Expense): string {
  if (!VALID_CATEGORIES.includes(expense.category)) {
    throw new Error(`Invalid category: ${expense.category}. Valid: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (expense.amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const date = expense.date || todayStr();
  const content = `[expense] €${expense.amount.toFixed(2)} ${expense.category}: ${expense.description} (${date})`;
  store.addObservation('financial', content, 1.0, 'told');

  // Check budget status
  const monthlySpent = getMonthlySpendingByCategory(store, expense.category, date);
  const budget = MONTHLY_BUDGETS[expense.category];
  const percentage = Math.round((monthlySpent / budget) * 100);

  if (percentage >= 100) {
    return `Logged €${expense.amount.toFixed(2)} for ${expense.category}. You've spent €${monthlySpent.toFixed(2)} this month — over budget (€${budget}).`;
  }
  if (percentage >= 80) {
    return `Logged €${expense.amount.toFixed(2)} for ${expense.category}. You've spent €${monthlySpent.toFixed(2)}/${budget} this month (${percentage}%). Getting close, sir.`;
  }

  return `Logged €${expense.amount.toFixed(2)} for ${expense.category}. Monthly total: €${monthlySpent.toFixed(2)}/${budget}.`;
}

// ── Spending Queries ─────────────────────────────────────────────

/**
 * Get spending summary for a date range.
 */
export function getSpendingSummary(
  store: MemoryStore,
  period: 'week' | 'month',
  referenceDate?: string,
): SpendingSummary {
  const date = referenceDate || todayStr();
  const { from, to } = period === 'week' ? getWeekRange(date) : getMonthRange(date);

  const allExpenses = getAllExpenses(store);
  const filtered = allExpenses.filter((e) => e.date >= from && e.date <= to);

  const byCategory: Record<string, number> = {};
  let total = 0;

  for (const exp of filtered) {
    byCategory[exp.category] = (byCategory[exp.category] || 0) + exp.amount;
    total += exp.amount;
  }

  return {
    period: `${from} to ${to}`,
    total,
    byCategory,
    expenses: filtered,
  };
}

/**
 * Format spending summary for Claude.
 */
export function formatSpendingSummary(summary: SpendingSummary): string {
  if (summary.expenses.length === 0) {
    return `No expenses logged for ${summary.period}.`;
  }

  const lines = [`Spending (${summary.period}): €${summary.total.toFixed(2)} total`];

  const sortedCategories = Object.entries(summary.byCategory)
    .sort(([, a], [, b]) => b - a);

  for (const [cat, amount] of sortedCategories) {
    const budget = MONTHLY_BUDGETS[cat as ExpenseCategory] || 0;
    const budgetInfo = budget > 0 ? ` (budget: €${budget}/month)` : '';
    lines.push(`  ${capitalise(cat)}: €${amount.toFixed(2)}${budgetInfo}`);
  }

  return lines.join('\n');
}

/**
 * Format financial awareness for the system prompt.
 */
export function formatFinancialContext(store: MemoryStore, referenceDate?: string): string | null {
  const date = referenceDate || todayStr();
  const weekSummary = getSpendingSummary(store, 'week', date);
  const monthSummary = getSpendingSummary(store, 'month', date);

  if (weekSummary.expenses.length === 0 && monthSummary.expenses.length === 0) {
    return null;
  }

  const lines = ['[FINANCIAL AWARENESS]'];

  if (weekSummary.expenses.length > 0) {
    lines.push(`This week: €${weekSummary.total.toFixed(2)}`);
  }

  if (monthSummary.expenses.length > 0) {
    lines.push(`This month: €${monthSummary.total.toFixed(2)}`);

    // Flag categories over budget
    for (const [cat, amount] of Object.entries(monthSummary.byCategory)) {
      const budget = MONTHLY_BUDGETS[cat as ExpenseCategory] || 0;
      if (budget > 0 && amount > budget) {
        lines.push(`  ⚠ ${capitalise(cat)}: €${amount.toFixed(2)}/€${budget} — OVER BUDGET`);
      } else if (budget > 0 && amount > budget * 0.8) {
        lines.push(`  ${capitalise(cat)}: €${amount.toFixed(2)}/€${budget} — approaching limit`);
      }
    }
  }

  // Check upcoming bills
  const upcomingBills = getUpcomingBills(store, date, 3);
  if (upcomingBills.length > 0) {
    lines.push('Upcoming bills:');
    for (const bill of upcomingBills) {
      const amountStr = bill.amount ? `€${bill.amount.toFixed(2)}` : 'amount TBD';
      const autoStr = bill.autoPay ? ' (auto-pay)' : '';
      lines.push(`  - ${bill.name}: ${amountStr}, due ${bill.nextDue}${autoStr}`);
    }
  }

  return lines.join('\n');
}

// ── Bill Management ──────────────────────────────────────────────

/**
 * Add a bill to tracking.
 */
export function addBill(
  store: MemoryStore,
  name: string,
  amount: number | null,
  dueDay: number | null,
  frequency: string = 'monthly',
  autoPay: boolean = false,
): number {
  const db = store.raw();
  const nextDue = dueDay ? calculateNextDueDate(dueDay) : null;
  const result = db.prepare(`
    INSERT INTO bills (name, amount, due_day, frequency, auto_pay, next_due)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, amount, dueDay, frequency, autoPay ? 1 : 0, nextDue);
  return Number(result.lastInsertRowid);
}

/**
 * Mark a bill as paid.
 */
export function markBillPaid(store: MemoryStore, billId: number): void {
  const db = store.raw();
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId) as {
    due_day: number | null; frequency: string | null;
  } | undefined;

  if (!bill) throw new Error(`Bill not found: ${billId}`);

  const nextDue = bill.due_day ? calculateNextDueDate(bill.due_day) : null;
  db.prepare(`
    UPDATE bills
    SET last_paid = CURRENT_TIMESTAMP, next_due = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(nextDue, billId);
}

/**
 * Get all bills.
 */
export function getAllBills(store: MemoryStore): BillRecord[] {
  const db = store.raw();
  const rows = db.prepare('SELECT * FROM bills ORDER BY next_due ASC').all() as {
    id: number; name: string; amount: number | null; currency: string;
    due_day: number | null; frequency: string | null; auto_pay: number;
    last_paid: string | null; next_due: string | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    currency: r.currency,
    dueDay: r.due_day,
    frequency: r.frequency,
    autoPay: r.auto_pay === 1,
    lastPaid: r.last_paid,
    nextDue: r.next_due,
  }));
}

/**
 * Get bills due within N days from reference date.
 */
export function getUpcomingBills(store: MemoryStore, referenceDate: string, daysAhead: number): BillRecord[] {
  const all = getAllBills(store);
  const refDate = new Date(referenceDate + 'T23:59:59Z');
  const limit = new Date(refDate.getTime() + daysAhead * 86400000);

  return all.filter((b) => {
    if (!b.nextDue) return false;
    const due = new Date(b.nextDue + 'T00:00:00Z');
    return due >= new Date(referenceDate + 'T00:00:00Z') && due <= limit;
  });
}

/**
 * Format bills for Claude.
 */
export function formatBillsForClaude(bills: BillRecord[]): string {
  if (bills.length === 0) {
    return 'No bills tracked.';
  }

  const lines = ['Bills:'];
  for (const bill of bills) {
    const amountStr = bill.amount ? `€${bill.amount.toFixed(2)}` : 'TBD';
    const autoStr = bill.autoPay ? ' (auto-pay)' : '';
    const paidStr = bill.lastPaid ? ` — last paid ${bill.lastPaid.slice(0, 10)}` : '';
    const dueStr = bill.nextDue ? ` — next due ${bill.nextDue}` : '';
    lines.push(`- ${bill.name}: ${amountStr}/${bill.frequency || 'monthly'}${autoStr}${dueStr}${paidStr}`);
  }

  return lines.join('\n');
}

/**
 * Check for bills due in the next N days and create reminders.
 * Called by heartbeat.
 */
export function checkDueBills(store: MemoryStore, daysAhead: number = 3): number {
  const today = todayStr();
  const upcoming = getUpcomingBills(store, today, daysAhead);
  let created = 0;

  for (const bill of upcoming) {
    if (bill.autoPay) continue; // No reminder for auto-pay

    // Check if we already have a pending reminder for this bill
    const pending = store.getPendingActions(100);
    const alreadyReminded = pending.some(
      (a) => a.description.includes('Bill due:') && a.description.includes(bill.name),
    );

    if (alreadyReminded) continue;

    const amountStr = bill.amount ? ` (€${bill.amount.toFixed(2)})` : '';
    store.addScheduledAction(
      'reminder',
      `Bill due: ${bill.name}${amountStr} — due ${bill.nextDue}`,
      new Date().toISOString(),
      'high',
    );
    created++;
  }

  return created;
}

// ── Internal Helpers ─────────────────────────────────────────────

function getAllExpenses(store: MemoryStore): { amount: number; category: string; description: string; date: string }[] {
  const observations = store.getObservationsByCategory('financial');
  return observations
    .filter((o) => o.content.startsWith('[expense]'))
    .map((o) => {
      const match = o.content.match(/\[expense\] €([\d.]+) (\w+): (.+?) \((\d{4}-\d{2}-\d{2})\)/);
      if (!match) return null;
      return {
        amount: parseFloat(match[1]),
        category: match[2],
        description: match[3],
        date: match[4],
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getMonthlySpendingByCategory(store: MemoryStore, category: ExpenseCategory, date: string): number {
  const { from, to } = getMonthRange(date);
  const expenses = getAllExpenses(store);
  return expenses
    .filter((e) => e.category === category && e.date >= from && e.date <= to)
    .reduce((sum, e) => sum + e.amount, 0);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekRange(date: string): { from: string; to: string } {
  const d = new Date(date + 'T12:00:00Z');
  const day = d.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  };
}

function getMonthRange(date: string): { from: string; to: string } {
  const [year, month] = date.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${String(month).padStart(2, '0')}-01`,
    to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

function calculateNextDueDate(dueDay: number): string {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (thisMonth > now) {
    return thisMonth.toISOString().slice(0, 10);
  }
  // Next month
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
  return nextMonth.toISOString().slice(0, 10);
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
