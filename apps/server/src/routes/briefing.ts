import type { FastifyInstance } from 'fastify';
import type { MemoryStore } from '../memory/store.js';
import { generateMorningBriefing, buildBriefingContext } from '../jobs/morning.js';
import { textToSpeech } from '../voice/speak.js';

export async function briefingRoutes(server: FastifyInstance, store: MemoryStore) {
  server.get('/api/briefing', async () => {
    const context = await buildBriefingContext(store);
    const text = await generateMorningBriefing(store);
    const audioBuffer = await textToSpeech(text);

    return {
      text,
      audio: audioBuffer ? Buffer.from(audioBuffer).toString('base64') : undefined,
      context: {
        dayName: context.dayName,
        date: context.dateStr,
        dayType: context.dayType,
        priorityCount: context.priorities.length,
        commitmentCount: context.pendingCommitments.length,
        followUpCount: context.followUps.length,
        hasYesterdayData: context.yesterdaySummaries.length > 0,
        recentMood: context.recentMood,
      },
    };
  });
}
