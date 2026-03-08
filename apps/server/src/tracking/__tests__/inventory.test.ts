import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';
import {
  addItem,
  updateItemQuantity,
  findItem,
  getInventory,
  getLowStockItems,
  formatInventoryForClaude,
  formatInventoryContext,
  checkInventoryLevels,
} from '../inventory';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Inventory & Restocking', () => {
  // ── Item Management ──────────────────────────────────────────

  describe('addItem', () => {
    it('should add a basic item', () => {
      const id = addItem(store, 'Creatine', 'supplements');
      expect(id).toBeGreaterThan(0);

      const items = getInventory(store);
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Creatine');
      expect(items[0].category).toBe('supplements');
      expect(items[0].quantity).toBe(0);
    });

    it('should add item with quantity and threshold', () => {
      addItem(store, 'Creatine', 'supplements', {
        quantity: 30,
        reorderThreshold: 5,
        reorderLink: 'https://shop.example.com/creatine',
      });

      const items = getInventory(store);
      expect(items[0].quantity).toBe(30);
      expect(items[0].reorderThreshold).toBe(5);
      expect(items[0].reorderLink).toBe('https://shop.example.com/creatine');
      expect(items[0].lastRestocked).not.toBeNull();
    });

    it('should not set lastRestocked when quantity is 0', () => {
      addItem(store, 'Empty Item', 'household');

      const items = getInventory(store);
      expect(items[0].lastRestocked).toBeNull();
    });
  });

  describe('updateItemQuantity', () => {
    it('should update quantity (consume)', () => {
      const id = addItem(store, 'Creatine', 'supplements', { quantity: 30 });
      const result = updateItemQuantity(store, id, 25);

      expect(result).toContain('25 remaining');

      const item = findItem(store, 'Creatine');
      expect(item!.quantity).toBe(25);
    });

    it('should update quantity (restock)', () => {
      const id = addItem(store, 'Creatine', 'supplements', { quantity: 5 });
      const result = updateItemQuantity(store, id, 30);

      expect(result).toContain('Restocked');
      expect(result).toContain('5 → 30');

      const item = findItem(store, 'Creatine');
      expect(item!.quantity).toBe(30);
      expect(item!.lastRestocked).not.toBeNull();
    });

    it('should report empty items', () => {
      const id = addItem(store, 'Creatine', 'supplements', { quantity: 1 });
      const result = updateItemQuantity(store, id, 0);

      expect(result).toContain('empty');
      expect(result).toContain('restock');
    });

    it('should throw for non-existent item', () => {
      expect(() => updateItemQuantity(store, 999, 10)).toThrow('Item not found');
    });
  });

  describe('findItem', () => {
    it('should find by partial name', () => {
      addItem(store, 'Creatine Monohydrate', 'supplements', { quantity: 30 });

      const item = findItem(store, 'creatine');
      expect(item).not.toBeNull();
      expect(item!.name).toBe('Creatine Monohydrate');
    });

    it('should return null for unknown item', () => {
      const item = findItem(store, 'nonexistent');
      expect(item).toBeNull();
    });
  });

  // ── Inventory Queries ────────────────────────────────────────

  describe('getInventory', () => {
    it('should get all items', () => {
      addItem(store, 'Creatine', 'supplements', { quantity: 30 });
      addItem(store, 'Toilet paper', 'household', { quantity: 12 });
      addItem(store, 'Magnesium', 'supplements', { quantity: 60 });

      const items = getInventory(store);
      expect(items).toHaveLength(3);
    });

    it('should filter by category', () => {
      addItem(store, 'Creatine', 'supplements', { quantity: 30 });
      addItem(store, 'Toilet paper', 'household', { quantity: 12 });
      addItem(store, 'Magnesium', 'supplements', { quantity: 60 });

      const supplements = getInventory(store, 'supplements');
      expect(supplements).toHaveLength(2);
      expect(supplements.every((i) => i.category === 'supplements')).toBe(true);
    });
  });

  describe('getLowStockItems', () => {
    it('should return items below reorder threshold', () => {
      addItem(store, 'Creatine', 'supplements', { quantity: 3, reorderThreshold: 5 });
      addItem(store, 'Magnesium', 'supplements', { quantity: 50, reorderThreshold: 10 });

      const low = getLowStockItems(store);
      expect(low).toHaveLength(1);
      expect(low[0].name).toBe('Creatine');
    });

    it('should include items at exact threshold', () => {
      addItem(store, 'Creatine', 'supplements', { quantity: 5, reorderThreshold: 5 });

      const low = getLowStockItems(store);
      expect(low).toHaveLength(1);
    });

    it('should not include items without threshold', () => {
      addItem(store, 'Random Item', 'household', { quantity: 0 });

      const low = getLowStockItems(store);
      expect(low).toHaveLength(0);
    });
  });

  // ── Formatting ───────────────────────────────────────────────

  describe('formatInventoryForClaude', () => {
    it('should format empty inventory', () => {
      const result = formatInventoryForClaude([]);
      expect(result).toContain('No items tracked');
    });

    it('should format inventory with categories', () => {
      addItem(store, 'Creatine', 'supplements', { quantity: 30, reorderThreshold: 5 });
      addItem(store, 'Toilet paper', 'household', { quantity: 4, reorderThreshold: 6 });

      const items = getInventory(store);
      const result = formatInventoryForClaude(items);

      expect(result).toContain('Inventory');
      expect(result).toContain('Creatine');
      expect(result).toContain('Toilet paper');
    });

    it('should flag low stock items', () => {
      addItem(store, 'Creatine', 'supplements', { quantity: 3, reorderThreshold: 5 });

      const items = getInventory(store);
      const result = formatInventoryForClaude(items);

      expect(result).toContain('LOW');
    });
  });

  describe('formatInventoryContext', () => {
    it('should return null when nothing low', () => {
      addItem(store, 'Creatine', 'supplements', { quantity: 30, reorderThreshold: 5 });

      const result = formatInventoryContext(store);
      expect(result).toBeNull();
    });

    it('should include low stock alerts', () => {
      addItem(store, 'Creatine', 'supplements', { quantity: 3, reorderThreshold: 5 });

      const result = formatInventoryContext(store);

      expect(result).toContain('INVENTORY ALERTS');
      expect(result).toContain('Creatine');
      expect(result).toContain('3 remaining');
    });
  });

  // ── Inventory Checks ────────────────────────────────────────

  describe('checkInventoryLevels', () => {
    it('should create reminders for low stock', () => {
      addItem(store, 'Creatine', 'supplements', { quantity: 3, reorderThreshold: 5 });

      const count = checkInventoryLevels(store);
      expect(count).toBe(1);

      const pending = store.getPendingActions(10);
      const restockReminder = pending.find((a) => a.description.includes('Creatine'));
      expect(restockReminder).toBeDefined();
    });

    it('should not duplicate reminders', () => {
      addItem(store, 'Creatine', 'supplements', { quantity: 3, reorderThreshold: 5 });

      checkInventoryLevels(store);
      checkInventoryLevels(store);

      const pending = store.getPendingActions(10);
      const restockReminders = pending.filter((a) => a.description.includes('Creatine'));
      expect(restockReminders).toHaveLength(1);
    });

    it('should use low stakes for supplements', () => {
      addItem(store, 'Creatine', 'supplements', { quantity: 3, reorderThreshold: 5 });
      checkInventoryLevels(store);

      const pending = store.getPendingActions(10);
      expect(pending[0].stakes_level).toBe('low');
    });

    it('should use medium stakes for non-supplements', () => {
      addItem(store, 'Toilet paper', 'household', { quantity: 1, reorderThreshold: 3 });
      checkInventoryLevels(store);

      const pending = store.getPendingActions(10);
      expect(pending[0].stakes_level).toBe('medium');
    });
  });

  // ── Realistic Scenarios ──────────────────────────────────────

  describe('realistic scenarios', () => {
    it('Jan\'s supplement tracking', () => {
      addItem(store, 'Creatine', 'supplements', { quantity: 30, reorderThreshold: 5, reorderLink: 'https://example.com/creatine' });
      addItem(store, 'Magnesium', 'supplements', { quantity: 60, reorderThreshold: 10 });
      addItem(store, 'Protein Powder', 'supplements', { quantity: 2, reorderThreshold: 3 });

      const low = getLowStockItems(store);
      expect(low).toHaveLength(1);
      expect(low[0].name).toBe('Protein Powder');

      const all = getInventory(store, 'supplements');
      expect(all).toHaveLength(3);
    });

    it('restock flow: consume → alert → restock', () => {
      const id = addItem(store, 'Creatine', 'supplements', { quantity: 10, reorderThreshold: 5 });

      // Daily consumption
      updateItemQuantity(store, id, 8);
      updateItemQuantity(store, id, 6);
      updateItemQuantity(store, id, 4);

      // Now below threshold
      const low = getLowStockItems(store);
      expect(low).toHaveLength(1);

      // Heartbeat creates reminder
      checkInventoryLevels(store);
      const pending = store.getPendingActions(10);
      expect(pending.some((a) => a.description.includes('Creatine'))).toBe(true);

      // Jan restocks
      const result = updateItemQuantity(store, id, 30);
      expect(result).toContain('Restocked');

      // No longer low stock
      expect(getLowStockItems(store)).toHaveLength(0);
    });
  });
});
