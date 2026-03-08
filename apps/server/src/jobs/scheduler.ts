import cron from 'node-cron';
import type { BrainPipeline } from '../brain/pipeline.js';
import type { MemoryStore } from '../memory/store.js';
import { runMorningBriefing } from './morning.js';
import { compressDaily, compressWeekly, promoteObservations } from '../memory/compressor.js';
import { detectAndStorePatterns } from '../brain/understanding/pattern-detector.js';

export function startScheduler(pipeline: BrainPipeline, store: MemoryStore): void {
  // Morning briefing at 05:30
  cron.schedule('30 5 * * *', async () => {
    console.log('[Scheduler] Running morning briefing...');
    try {
      await runMorningBriefing(pipeline);
      console.log('[Scheduler] Morning briefing complete.');
    } catch (error) {
      console.error('[Scheduler] Morning briefing failed:', error);
    }
  }, {
    timezone: 'Europe/Vienna',
  });

  // Daily pattern detection at 23:30 — analyze the week's observations for patterns
  cron.schedule('30 23 * * *', async () => {
    console.log('[Scheduler] Running pattern detection...');
    try {
      const count = await detectAndStorePatterns(store, 7);
      console.log(`[Scheduler] Pattern detection complete. ${count} new pattern(s) found.`);
    } catch (error) {
      console.error('[Scheduler] Pattern detection failed:', error);
    }
  }, {
    timezone: 'Europe/Vienna',
  });

  // Daily compression at 23:45 — compress today's observations into a summary
  cron.schedule('45 23 * * *', async () => {
    console.log('[Scheduler] Running daily compression...');
    try {
      await compressDaily(store);
      promoteObservations(store);
      console.log('[Scheduler] Daily compression complete.');
    } catch (error) {
      console.error('[Scheduler] Daily compression failed:', error);
    }
  }, {
    timezone: 'Europe/Vienna',
  });

  // Weekly compression on Sunday at 23:55 — compress week's summaries
  cron.schedule('55 23 * * 0', async () => {
    console.log('[Scheduler] Running weekly compression...');
    try {
      // Calculate the Monday of this week
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const weekStart = monday.toISOString().slice(0, 10);

      await compressWeekly(store, weekStart);
      console.log('[Scheduler] Weekly compression complete.');
    } catch (error) {
      console.error('[Scheduler] Weekly compression failed:', error);
    }
  }, {
    timezone: 'Europe/Vienna',
  });

  console.log('[Scheduler] Edwin\'s scheduler is active. Morning 05:30, patterns 23:30, compression 23:45, weekly Sunday 23:55 (Europe/Vienna).');
}
