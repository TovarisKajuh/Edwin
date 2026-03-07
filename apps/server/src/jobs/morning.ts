import type { BrainPipeline } from '../brain/pipeline.js';
import { textToSpeech } from '../voice/speak.js';

export async function runMorningBriefing(pipeline: BrainPipeline): Promise<{ text: string; audio: ArrayBuffer }> {
  const text = await pipeline.generateBriefing();
  const audio = await textToSpeech(text);
  console.log('[Morning Briefing]', text);
  return { text, audio };
}
