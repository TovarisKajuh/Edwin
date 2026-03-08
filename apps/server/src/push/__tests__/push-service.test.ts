import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

import webpush from 'web-push';

let store: MemoryStore;

beforeEach(() => {
  vi.resetAllMocks();
  const db = new Database(':memory:');
  store = new MemoryStore(db);

  // Set VAPID env vars for tests
  process.env.VAPID_PUBLIC_KEY = 'test-public-key';
  process.env.VAPID_PRIVATE_KEY = 'test-private-key';
  process.env.VAPID_EMAIL = 'mailto:test@test.com';
});

describe('Push Notification System', () => {
  // ── Store Methods ──────────────────────────────────────────────

  describe('push subscription store', () => {
    it('should save a push subscription', () => {
      store.savePushSubscription('https://fcm.googleapis.com/fcm/123', 'p256dh-key', 'auth-key');

      const subs = store.getAllPushSubscriptions();
      expect(subs).toHaveLength(1);
      expect(subs[0].endpoint).toBe('https://fcm.googleapis.com/fcm/123');
      expect(subs[0].p256dh).toBe('p256dh-key');
      expect(subs[0].auth).toBe('auth-key');
    });

    it('should update existing subscription on conflict', () => {
      store.savePushSubscription('https://fcm.googleapis.com/fcm/123', 'old-p256dh', 'old-auth');
      store.savePushSubscription('https://fcm.googleapis.com/fcm/123', 'new-p256dh', 'new-auth');

      const subs = store.getAllPushSubscriptions();
      expect(subs).toHaveLength(1);
      expect(subs[0].p256dh).toBe('new-p256dh');
      expect(subs[0].auth).toBe('new-auth');
    });

    it('should store multiple subscriptions', () => {
      store.savePushSubscription('https://fcm.googleapis.com/1', 'key1', 'auth1');
      store.savePushSubscription('https://fcm.googleapis.com/2', 'key2', 'auth2');

      const subs = store.getAllPushSubscriptions();
      expect(subs).toHaveLength(2);
    });

    it('should remove a subscription', () => {
      store.savePushSubscription('https://fcm.googleapis.com/1', 'key1', 'auth1');
      store.savePushSubscription('https://fcm.googleapis.com/2', 'key2', 'auth2');

      store.removePushSubscription('https://fcm.googleapis.com/1');

      const subs = store.getAllPushSubscriptions();
      expect(subs).toHaveLength(1);
      expect(subs[0].endpoint).toBe('https://fcm.googleapis.com/2');
    });

    it('should handle removing non-existent subscription gracefully', () => {
      store.removePushSubscription('https://fcm.googleapis.com/nonexistent');
      const subs = store.getAllPushSubscriptions();
      expect(subs).toHaveLength(0);
    });

    it('should return empty list when no subscriptions', () => {
      const subs = store.getAllPushSubscriptions();
      expect(subs).toEqual([]);
    });
  });

  // ── Push Service ───────────────────────────────────────────────

  describe('sendPushToAll', () => {
    // Need to import fresh each time since the module caches `configured`
    // We'll test the store-level integration instead

    it('should send to all subscriptions via web-push', async () => {
      // Dynamic import to reset module state
      const { sendPushToAll } = await import('../push-service');

      store.savePushSubscription('https://fcm.googleapis.com/1', 'key1', 'auth1');
      store.savePushSubscription('https://fcm.googleapis.com/2', 'key2', 'auth2');

      vi.mocked(webpush.sendNotification).mockResolvedValue({} as never);

      const sent = await sendPushToAll(store, {
        title: 'Edwin',
        body: 'Hello sir',
        url: '/chat',
      });

      expect(sent).toBe(2);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no subscriptions', async () => {
      const { sendPushToAll } = await import('../push-service');

      const sent = await sendPushToAll(store, {
        title: 'Edwin',
        body: 'Hello sir',
      });

      expect(sent).toBe(0);
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('should remove stale subscriptions on 410 Gone', async () => {
      const { sendPushToAll } = await import('../push-service');

      store.savePushSubscription('https://fcm.googleapis.com/stale', 'key1', 'auth1');
      store.savePushSubscription('https://fcm.googleapis.com/active', 'key2', 'auth2');

      vi.mocked(webpush.sendNotification)
        .mockRejectedValueOnce({ statusCode: 410 })
        .mockResolvedValueOnce({} as never);

      const sent = await sendPushToAll(store, {
        title: 'Edwin',
        body: 'Test',
      });

      expect(sent).toBe(1);

      // Stale subscription should be removed
      const remaining = store.getAllPushSubscriptions();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].endpoint).toBe('https://fcm.googleapis.com/active');
    });
  });

  // ── VAPID Key ──────────────────────────────────────────────────

  describe('getVapidPublicKey', () => {
    it('should return the VAPID public key from env', async () => {
      const { getVapidPublicKey } = await import('../push-service');
      expect(getVapidPublicKey()).toBe('test-public-key');
    });

    it('should return null when not configured', async () => {
      delete process.env.VAPID_PUBLIC_KEY;
      // Need fresh import
      vi.resetModules();
      const { getVapidPublicKey } = await import('../push-service');
      expect(getVapidPublicKey()).toBeNull();
      // Restore for other tests
      process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    });
  });
});
