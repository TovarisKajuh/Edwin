import type { FastifyInstance } from 'fastify';
import type { BrainPipeline } from '../brain/pipeline.js';
import { textToSpeech } from '../voice/speak.js';

export async function briefingRoutes(server: FastifyInstance, pipeline: BrainPipeline) {
  server.get('/api/briefing', async () => {
    const text = await pipeline.generateBriefing();
    const audioBuffer = await textToSpeech(text);
    return {
      text,
      audio: Buffer.from(audioBuffer).toString('base64'),
    };
  });
}
