import type { FastifyInstance } from 'fastify';
import type { MemoryStore } from '../memory/store.js';
import { getLatestWeeklyReview } from '../jobs/weekly-review.js';

export async function reviewRoutes(server: FastifyInstance, store: MemoryStore) {
  server.get('/api/review/weekly', async () => {
    const review = getLatestWeeklyReview(store);

    if (!review) {
      return { available: false, message: 'No weekly review available yet.' };
    }

    return {
      available: true,
      weekStart: review.weekStart,
      highlights: review.highlights,
      concerns: review.concerns,
      patterns: review.patterns,
      moodTrend: review.moodTrend,
      fullReview: review.fullReview,
    };
  });
}
