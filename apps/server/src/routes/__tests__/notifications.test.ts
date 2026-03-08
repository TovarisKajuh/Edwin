import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('Notification System', () => {
  // ── Store Methods ──────────────────────────────────────────────

  describe('getNotifications', () => {
    it('should return empty list when no notifications', () => {
      const notifications = store.getNotifications();
      expect(notifications).toEqual([]);
    });

    it('should return only notification-type actions', () => {
      const now = new Date().toISOString();
      store.addScheduledAction('notification', 'Edwin says hello', now, 'low');
      store.addScheduledAction('reminder', 'Call the dentist', now, 'medium');
      store.addScheduledAction('notification', 'Time for gym', now, 'low');

      const notifications = store.getNotifications();
      expect(notifications).toHaveLength(2);
      expect(notifications.every((n) => n.description !== 'Call the dentist')).toBe(true);
    });

    it('should return most recent first', () => {
      const earlier = new Date(Date.now() - 3600000).toISOString();
      const later = new Date().toISOString();
      store.addScheduledAction('notification', 'Earlier message', earlier, 'low');
      store.addScheduledAction('notification', 'Later message', later, 'low');

      const notifications = store.getNotifications();
      expect(notifications[0].description).toBe('Later message');
      expect(notifications[1].description).toBe('Earlier message');
    });

    it('should respect limit parameter', () => {
      const now = new Date().toISOString();
      for (let i = 0; i < 5; i++) {
        store.addScheduledAction('notification', `Message ${i}`, now, 'low');
      }

      const notifications = store.getNotifications(3);
      expect(notifications).toHaveLength(3);
    });

    it('should include both read and unread notifications', () => {
      const now = new Date().toISOString();
      const id1 = store.addScheduledAction('notification', 'Unread', now, 'low');
      const id2 = store.addScheduledAction('notification', 'Read', now, 'low');
      store.markNotificationRead(id2);

      const notifications = store.getNotifications();
      expect(notifications).toHaveLength(2);
      expect(notifications.some((n) => n.status === 'pending')).toBe(true);
      expect(notifications.some((n) => n.status === 'done')).toBe(true);
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return 0 when no notifications', () => {
      expect(store.getUnreadNotificationCount()).toBe(0);
    });

    it('should count only pending notifications', () => {
      const now = new Date().toISOString();
      const id1 = store.addScheduledAction('notification', 'Unread 1', now, 'low');
      store.addScheduledAction('notification', 'Unread 2', now, 'low');
      store.markNotificationRead(id1);

      expect(store.getUnreadNotificationCount()).toBe(1);
    });

    it('should not count non-notification types', () => {
      const now = new Date().toISOString();
      store.addScheduledAction('reminder', 'A reminder', now, 'medium');
      store.addScheduledAction('notification', 'A notification', now, 'low');

      expect(store.getUnreadNotificationCount()).toBe(1);
    });
  });

  describe('markNotificationRead', () => {
    it('should mark notification as read', () => {
      const now = new Date().toISOString();
      const id = store.addScheduledAction('notification', 'Test', now, 'low');

      expect(store.getUnreadNotificationCount()).toBe(1);

      const success = store.markNotificationRead(id);
      expect(success).toBe(true);
      expect(store.getUnreadNotificationCount()).toBe(0);
    });

    it('should return false for non-existent notification', () => {
      const success = store.markNotificationRead(9999);
      expect(success).toBe(false);
    });

    it('should not mark non-notification types', () => {
      const now = new Date().toISOString();
      const id = store.addScheduledAction('reminder', 'A reminder', now, 'medium');

      const success = store.markNotificationRead(id);
      expect(success).toBe(false);
    });

    it('should be idempotent — marking already-read notification succeeds', () => {
      const now = new Date().toISOString();
      const id = store.addScheduledAction('notification', 'Test', now, 'low');
      store.markNotificationRead(id);

      // Second mark should still work (status already 'done', update still runs)
      const success = store.markNotificationRead(id);
      // changes = 1 because the UPDATE still touches the row
      expect(success).toBe(true);
    });
  });

  // ── Integration Scenarios ──────────────────────────────────────

  describe('notification lifecycle', () => {
    it('heartbeat creates notification → shows as unread → mark read → count decreases', () => {
      const now = new Date().toISOString();

      // Heartbeat creates a notification (simulating outreach)
      store.addScheduledAction('notification', 'Sir, don\'t forget the supplier call.', now, 'low');

      // Should show as unread
      expect(store.getUnreadNotificationCount()).toBe(1);

      const notifications = store.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].status).toBe('pending');

      // Mark as read
      store.markNotificationRead(notifications[0].id);
      expect(store.getUnreadNotificationCount()).toBe(0);

      // Notification still appears in list but as read
      const after = store.getNotifications();
      expect(after).toHaveLength(1);
      expect(after[0].status).toBe('done');
    });

    it('morning briefing notification shows up in notification list', () => {
      const now = new Date().toISOString();
      store.addScheduledAction(
        'notification',
        'Good morning, sir. You have a call with the supplier today and the Q1 report is due.',
        now,
        'low',
      );

      const notifications = store.getNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].description).toContain('supplier');
      expect(notifications[0].description).toContain('Q1 report');
    });

    it('multiple heartbeat notifications accumulate correctly', () => {
      const t1 = new Date(Date.now() - 7200000).toISOString(); // 2h ago
      const t2 = new Date(Date.now() - 3600000).toISOString(); // 1h ago
      const t3 = new Date().toISOString(); // now

      store.addScheduledAction('notification', 'Morning briefing', t1, 'low');
      store.addScheduledAction('notification', 'Reminder: call supplier', t2, 'medium');
      store.addScheduledAction('notification', 'Sir, the gym window is closing.', t3, 'low');

      expect(store.getUnreadNotificationCount()).toBe(3);

      const notifications = store.getNotifications();
      expect(notifications).toHaveLength(3);
      // Most recent first
      expect(notifications[0].description).toContain('gym');
      expect(notifications[2].description).toContain('Morning');
    });
  });
});
