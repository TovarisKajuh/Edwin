import type { FastifyInstance } from 'fastify';
import type { MemoryStore } from '../memory/store.js';
import { getVapidPublicKey } from '../push/push-service.js';

interface SubscribeBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function pushRoutes(server: FastifyInstance, store: MemoryStore) {
  /** Get VAPID public key for client-side subscription */
  server.get('/api/push/vapid-key', async (_, reply) => {
    const key = getVapidPublicKey();
    if (!key) {
      return reply.status(503).send({ error: 'Push notifications not configured' });
    }
    return { publicKey: key };
  });

  /** Store a push subscription */
  server.post<{ Body: SubscribeBody }>('/api/push/subscribe', async (request, reply) => {
    const { endpoint, keys } = request.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return reply.status(400).send({ error: 'Invalid subscription data' });
    }

    store.savePushSubscription(endpoint, keys.p256dh, keys.auth);
    return { success: true };
  });

  /** Unsubscribe from push */
  server.post<{ Body: { endpoint: string } }>('/api/push/unsubscribe', async (request, reply) => {
    const { endpoint } = request.body;

    if (!endpoint) {
      return reply.status(400).send({ error: 'Missing endpoint' });
    }

    store.removePushSubscription(endpoint);
    return { success: true };
  });
}
