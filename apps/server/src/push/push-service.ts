/**
 * Push Notification Service — Session 21.
 *
 * Sends Web Push notifications to all subscribed devices.
 * Edwin can reach Jan even when the browser tab is closed.
 */

import webpush from 'web-push';
import type { MemoryStore } from '../memory/store.js';

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL || 'mailto:edwin@example.com';

  if (!publicKey || !privateKey) {
    console.warn('[Push] VAPID keys not configured — push notifications disabled.');
    return false;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a push notification to all subscribed devices.
 * Silently removes stale subscriptions (410 Gone).
 */
export async function sendPushToAll(
  store: MemoryStore,
  payload: PushPayload,
): Promise<number> {
  if (!ensureConfigured()) return 0;

  const subscriptions = store.getAllPushSubscriptions();
  if (subscriptions.length === 0) return 0;

  let sent = 0;

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };

    try {
      await webpush.sendNotification(
        pushSubscription,
        JSON.stringify(payload),
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired — remove it
        store.removePushSubscription(sub.endpoint);
        console.log('[Push] Removed stale subscription.');
      } else {
        console.error('[Push] Failed to send:', err);
      }
    }
  }

  if (sent > 0) {
    console.log(`[Push] Sent to ${sent}/${subscriptions.length} device(s).`);
  }

  return sent;
}

/** Get the VAPID public key for client-side subscription */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}
