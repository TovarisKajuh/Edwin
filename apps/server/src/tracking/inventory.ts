/**
 * Inventory & Restocking — Session 35.
 *
 * Edwin tracks Jan's consumables:
 *   - Supplements, groceries, household items
 *   - Quantity tracking with reorder thresholds
 *   - Depletion prediction based on usage rate
 *   - Stakes-based restock proposals
 */

import { MemoryStore } from '../memory/store.js';

// ── Types ────────────────────────────────────────────────────────

export type ItemCategory = 'supplements' | 'groceries' | 'household' | 'personal_care' | 'office';

export interface InventoryItem {
  id: number;
  name: string;
  category: ItemCategory | null;
  quantity: number;
  reorderThreshold: number | null;
  reorderLink: string | null;
  lastRestocked: string | null;
  needsReorder: boolean;
  daysUntilDepletion: number | null;
}

// ── Item Management ──────────────────────────────────────────────

/**
 * Add a new item to track.
 */
export function addItem(
  store: MemoryStore,
  name: string,
  category?: ItemCategory,
  options?: { quantity?: number; reorderThreshold?: number; reorderLink?: string },
): number {
  const db = store.raw();
  const result = db.prepare(`
    INSERT INTO items (name, category, quantity, reorder_threshold, reorder_link, last_restocked)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    name,
    category || null,
    options?.quantity ?? 0,
    options?.reorderThreshold ?? null,
    options?.reorderLink ?? null,
    options?.quantity && options.quantity > 0 ? new Date().toISOString().slice(0, 10) : null,
  );
  return Number(result.lastInsertRowid);
}

/**
 * Update item quantity (restock or consume).
 */
export function updateItemQuantity(
  store: MemoryStore,
  itemId: number,
  newQuantity: number,
): string {
  const db = store.raw();
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(itemId) as ItemRow | undefined;

  if (!item) throw new Error(`Item not found: ${itemId}`);

  const isRestock = newQuantity > item.quantity;
  const updates: string[] = ['quantity = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const values: (string | number)[] = [newQuantity];

  if (isRestock) {
    updates.push('last_restocked = ?');
    values.push(new Date().toISOString().slice(0, 10));
  }

  values.push(itemId);
  db.prepare(`UPDATE items SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  if (isRestock) {
    return `Restocked ${item.name}: ${item.quantity} → ${newQuantity}.`;
  }
  if (newQuantity === 0) {
    return `${item.name} is now empty. Time to restock.`;
  }
  return `Updated ${item.name}: ${newQuantity} remaining.`;
}

/**
 * Find an item by name (case-insensitive partial match).
 */
export function findItem(store: MemoryStore, name: string): InventoryItem | null {
  const db = store.raw();
  const row = db.prepare(`
    SELECT * FROM items WHERE LOWER(name) LIKE LOWER(?) LIMIT 1
  `).get(`%${name}%`) as ItemRow | undefined;

  if (!row) return null;
  return toInventoryItem(row);
}

// ── Inventory Queries ────────────────────────────────────────────

/**
 * Get all items, optionally filtered by category.
 */
export function getInventory(store: MemoryStore, category?: ItemCategory): InventoryItem[] {
  const db = store.raw();
  let rows: ItemRow[];

  if (category) {
    rows = db.prepare('SELECT * FROM items WHERE category = ? ORDER BY name ASC').all(category) as ItemRow[];
  } else {
    rows = db.prepare('SELECT * FROM items ORDER BY category ASC, name ASC').all() as ItemRow[];
  }

  return rows.map(toInventoryItem);
}

/**
 * Get items that need reordering (quantity <= threshold).
 */
export function getLowStockItems(store: MemoryStore): InventoryItem[] {
  return getInventory(store).filter((item) => item.needsReorder);
}

// ── Depletion Prediction ─────────────────────────────────────────

/**
 * Estimate days until depletion based on usage rate.
 * Usage rate calculated from restock history (if available).
 */
function estimateDaysUntilDepletion(item: ItemRow): number | null {
  if (item.quantity === 0) return 0;
  if (!item.last_restocked || !item.reorder_threshold) return null;

  // Estimate daily usage from time since last restock
  const lastRestock = new Date(item.last_restocked);
  const daysSinceRestock = Math.max(1, Math.floor((Date.now() - lastRestock.getTime()) / 86400000));

  // Assume they started with a full stock (rough estimate)
  // If they restocked to, say, 30 units and now have 20, that's 10 used in N days
  // We don't know the original quantity, so use a simple heuristic:
  // If reorder_threshold is set, assume original quantity was 2x threshold
  const estimatedOriginal = item.reorder_threshold * 2;
  const estimatedUsed = Math.max(0, estimatedOriginal - item.quantity);

  if (estimatedUsed === 0) return null;

  const dailyUsage = estimatedUsed / daysSinceRestock;
  if (dailyUsage === 0) return null;

  return Math.round(item.quantity / dailyUsage);
}

// ── Formatting ───────────────────────────────────────────────────

/**
 * Format inventory for Claude.
 */
export function formatInventoryForClaude(items: InventoryItem[]): string {
  if (items.length === 0) {
    return 'No items tracked.';
  }

  const lines = ['Inventory:'];
  let currentCategory: string | null = null;

  for (const item of items) {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      lines.push(`\n${capitalise(currentCategory || 'Other')}:`);
    }

    const qty = item.quantity;
    const threshold = item.reorderThreshold !== null ? `/${item.reorderThreshold} threshold` : '';
    const lowStock = item.needsReorder ? ' ⚠ LOW' : '';
    const depletion = item.daysUntilDepletion !== null && item.daysUntilDepletion <= 7
      ? ` (~${item.daysUntilDepletion} days left)`
      : '';

    lines.push(`  - ${item.name}: ${qty}${threshold}${lowStock}${depletion}`);
  }

  return lines.join('\n');
}

/**
 * Format inventory context for system prompt.
 */
export function formatInventoryContext(store: MemoryStore): string | null {
  const lowStock = getLowStockItems(store);
  if (lowStock.length === 0) return null;

  const lines = ['[INVENTORY ALERTS]'];
  for (const item of lowStock) {
    const depletion = item.daysUntilDepletion !== null
      ? ` (~${item.daysUntilDepletion} days left)`
      : '';
    const link = item.reorderLink ? ' — reorder link available' : '';
    lines.push(`  - ${item.name}: ${item.quantity} remaining (threshold: ${item.reorderThreshold})${depletion}${link}`);
  }

  return lines.join('\n');
}

/**
 * Check inventory levels (called by heartbeat).
 * Returns number of items needing restock.
 */
export function checkInventoryLevels(store: MemoryStore): number {
  const lowStock = getLowStockItems(store);

  for (const item of lowStock) {
    // Check if we already have a pending reminder for this item
    const pending = store.getPendingActions(100);
    const alreadyReminded = pending.some(
      (a) => a.description.includes('Restock:') && a.description.includes(item.name),
    );

    if (alreadyReminded) continue;

    const depletion = item.daysUntilDepletion !== null
      ? ` (~${item.daysUntilDepletion} days left)`
      : '';
    store.addScheduledAction(
      'reminder',
      `Restock: ${item.name} is low (${item.quantity} remaining)${depletion}`,
      new Date().toISOString(),
      item.category === 'supplements' ? 'low' : 'medium',
    );
  }

  return lowStock.length;
}

// ── Internal Helpers ─────────────────────────────────────────────

interface ItemRow {
  id: number;
  name: string;
  category: string | null;
  quantity: number;
  reorder_threshold: number | null;
  reorder_link: string | null;
  last_restocked: string | null;
  created_at: string;
  updated_at: string;
}

function toInventoryItem(row: ItemRow): InventoryItem {
  const needsReorder = row.reorder_threshold !== null && row.quantity <= row.reorder_threshold;
  const daysUntilDepletion = estimateDaysUntilDepletion(row);

  return {
    id: row.id,
    name: row.name,
    category: row.category as ItemCategory | null,
    quantity: row.quantity,
    reorderThreshold: row.reorder_threshold,
    reorderLink: row.reorder_link,
    lastRestocked: row.last_restocked,
    needsReorder,
    daysUntilDepletion,
  };
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
