import type { FastifyInstance } from 'fastify';
import type { MemoryStore } from '../memory/store.js';
import type { DashboardData } from '@edwin/shared';

export async function dashboardRoutes(server: FastifyInstance, store: MemoryStore) {
  server.get('/api/dashboard', async () => {
    const now = new Date();
    const hour = now.getHours();

    let greeting: string;
    if (hour < 12) greeting = 'Good morning, sir.';
    else if (hour < 17) greeting = 'Good afternoon, sir.';
    else greeting = 'Good evening, sir.';

    const data: DashboardData = {
      greeting,
      date: now.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      schedule: [],
      pendingActions: [],
    };
    return data;
  });
}
