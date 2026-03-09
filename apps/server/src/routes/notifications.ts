import type { FastifyInstance } from 'fastify';
import type { MemoryStore } from '../memory/store.js';
import type { Notification, NotificationCountResponse } from '@edwin/shared';

export async function notificationRoutes(server: FastifyInstance, store: MemoryStore) {
  /** Get recent notifications (both read and unread) */
  server.get('/api/notifications', async () => {
    const raw = store.getNotifications(30);

    const notifications: Notification[] = raw.map((n) => ({
      id: n.id,
      message: n.description,
      timestamp: n.trigger_time,
      read: n.status !== 'pending',
      stakesLevel: (n.stakes_level as 'low' | 'medium' | 'high') || 'low',
      type: n.type === 'briefing' ? 'briefing' as const : undefined,
    }));

    return { notifications };
  });

  /** Get unread notification count */
  server.get('/api/notifications/count', async (): Promise<NotificationCountResponse> => {
    const count = store.getUnreadNotificationCount();
    return { count };
  });

  /** Mark a notification as read */
  server.post<{ Params: { id: string } }>('/api/notifications/:id/read', async (request, reply) => {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      return reply.status(400).send({ error: 'Invalid notification ID' });
    }

    const success = store.markNotificationRead(id);
    if (!success) {
      return reply.status(404).send({ error: 'Notification not found' });
    }

    return { success: true };
  });
}
