import type { FastifyInstance } from 'fastify';
import type { MemoryStore } from '../memory/store.js';
import { generateMorningBriefing } from '../jobs/morning.js';
import { textToSpeech } from '../voice/speak.js';

export async function briefingRoutes(server: FastifyInstance, store: MemoryStore) {
  /** Serve today's briefing — cached if available, regenerate if not */
  server.get('/api/briefing', async () => {
    // Check for cached briefing first
    const cached = store.getTodayBriefing();

    if (cached) {
      return {
        text: cached.description,
        audio: cached.response ?? undefined,
      };
    }

    // No cached briefing — generate fresh
    const text = await generateMorningBriefing(store);
    const audioBuffer = await textToSpeech(text);
    const audio = audioBuffer ? Buffer.from(audioBuffer).toString('base64') : undefined;

    // Cache it as a briefing for today
    store.addScheduledAction('briefing', text, new Date().toISOString(), 'low', audio ?? null);

    return { text, audio };
  });

  /** Check if there's a pending (unread) briefing today — used by frontend to trigger incoming call */
  server.get('/api/briefing/status', async () => {
    return store.getPendingBriefingStatus();
  });
}
