import type { FastifyInstance } from 'fastify';
import type { MemoryStore } from '../memory/store.js';
import type { DashboardData } from '@edwin/shared';
import { getTimeOfDay } from '../soul/personality.js';
import { calculatePriorities } from '../brain/thinking/priority-engine.js';
import { getWeather, formatWeatherForDashboard } from '../integrations/weather.js';
import { getTodayEvents, formatEventsForDashboard } from '../integrations/calendar.js';
import { getGoals, calculateProgress } from '../tracking/goals.js';
import { getHabitStats, isHabitDoneToday, type HabitName } from '../tracking/habits.js';
import { getUpcomingBills } from '../tracking/finances.js';
import { getNews, scoreRelevance } from '../integrations/news.js';
import { getConversationCount } from '../memory/relationship.js';

const TRACKED_HABITS: HabitName[] = ['gym', 'sleep', 'supplements', 'diet', 'hydration', 'reading', 'meditation'];

export async function dashboardRoutes(server: FastifyInstance, store: MemoryStore) {
  server.get('/api/dashboard', async () => {
    const now = new Date();
    const hour = now.getHours();
    const todayStr = now.toISOString().slice(0, 10);

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

    // Goals
    const goals = getGoals(store).map((g) => {
      const progress = calculateProgress(g);
      return {
        id: g.id,
        name: g.name,
        category: g.category,
        progress: progress.percentage,
        onTrack: progress.onTrack,
      };
    });

    // Habits
    const habits = TRACKED_HABITS.map((name) => {
      try {
        const stats = getHabitStats(store, name);
        const doneToday = isHabitDoneToday(store, name, todayStr);
        return {
          name,
          streak: stats.streak.current,
          status: doneToday ? 'done' as const : 'pending' as const,
          goal: stats.goal,
          completedThisWeek: stats.thisWeek.completed,
        };
      } catch {
        return { name, streak: 0, status: 'pending' as const, goal: null, completedThisWeek: 0 };
      }
    });

    // News (from cache if available, with 2s timeout to never block dashboard)
    let recentNews: DashboardData['recentNews'] = [];
    try {
      const feed = await Promise.race([
        getNews(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
      ]);
      if (feed) {
        recentNews = feed.items.slice(0, 5).map((item) => ({
          title: item.title,
          source: item.source,
          relevance: scoreRelevance(item),
          link: item.link,
        }));
      }
    } catch {
      // News is nice-to-have
    }

    // Bills due in next 7 days
    const upcomingBills = getUpcomingBills(store, todayStr, 7);
    const pendingBills = upcomingBills.map((b) => {
      const dueDate = new Date(b.nextDue + 'T00:00:00Z');
      const dueIn = Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / 86400000));
      return { name: b.name, amount: b.amount, dueIn };
    });

    // Quick stats
    const schedule = formatEventsForDashboard(getTodayEvents(store));
    const maxStreak = Math.max(0, ...habits.map((h) => h.streak));

    const data: DashboardData = {
      greeting,
      date: now.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      weather,
      schedule,
      pendingActions,
      goals,
      habits,
      recentNews,
      financeSummary: { pendingBills },
      quickStats: {
        conversationsToday: getConversationCount(store),
        activeGoals: goals.length,
        upcomingEvents: schedule.length,
        currentStreak: maxStreak,
      },
    };
    return data;
  });
}
