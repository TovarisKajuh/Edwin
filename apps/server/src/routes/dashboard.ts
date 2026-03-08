import type { FastifyInstance } from 'fastify';
import type { MemoryStore } from '../memory/store.js';
import type { DashboardData } from '@edwin/shared';
import { getTimeOfDay } from '../soul/personality.js';
import { calculatePriorities } from '../brain/thinking/priority-engine.js';
import { getWeather, formatWeatherForDashboard } from '../integrations/weather.js';

export async function dashboardRoutes(server: FastifyInstance, store: MemoryStore) {
  server.get('/api/dashboard', async () => {
    const now = new Date();
    const hour = now.getHours();

    let greeting: string;
    if (hour < 12) greeting = 'Good morning, sir.';
    else if (hour < 17) greeting = 'Good afternoon, sir.';
    else greeting = 'Good evening, sir.';

    // Get prioritized pending actions
    const timeOfDay = getTimeOfDay(hour, now.getMinutes());
    const emotions = store.getObservationsByCategory('emotional_state');
    const currentMood = emotions.length > 0 ? emotions[0].content : null;
    const priorities = calculatePriorities(store, timeOfDay, currentMood);

    const pendingActions = priorities
      .filter((p) => p.source === 'action')
      .map((p) => ({
        id: parseInt(p.id.split(':')[1], 10),
        description: p.description,
        stakesLevel: p.priority === 'critical' ? 'high' as const
          : p.priority === 'high' ? 'medium' as const
          : 'low' as const,
        status: 'pending' as const,
      }));

    // Weather (best-effort, don't block dashboard)
    let weather: DashboardData['weather'];
    try {
      const report = await getWeather();
      weather = formatWeatherForDashboard(report);
    } catch {
      // Weather is nice-to-have
    }

    const data: DashboardData = {
      greeting,
      date: now.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      weather,
      schedule: [],
      pendingActions,
    };
    return data;
  });
}
