import cron from 'node-cron';
import type { BrainPipeline } from '../brain/pipeline.js';
import { runMorningBriefing } from './morning.js';

export function startScheduler(pipeline: BrainPipeline): void {
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

  console.log('[Scheduler] Edwin\'s scheduler is active. Morning briefing set for 05:30 Europe/Vienna.');
}
