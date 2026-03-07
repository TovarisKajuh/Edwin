import type { FastifyInstance } from 'fastify';
import type { BrainPipeline } from '../brain/pipeline.js';
import { textToSpeech } from '../voice/speak.js';
import type { ChatRequest, ChatResponse } from '@edwin/shared';

export async function chatRoutes(server: FastifyInstance, pipeline: BrainPipeline) {
  server.post<{ Body: ChatRequest }>('/api/chat', async (request) => {
    const { message, conversationId } = request.body;
    const result = await pipeline.process(message, 'chat', conversationId);

    let audioBase64: string | undefined;
    try {
      const audioBuffer = await textToSpeech(result.message);
      audioBase64 = Buffer.from(audioBuffer).toString('base64');
    } catch {
      // Voice is optional — chat still works without it
    }

    const response: ChatResponse = {
      message: result.message,
      conversationId: result.conversationId,
      audioUrl: audioBase64 ? `data:audio/mpeg;base64,${audioBase64}` : undefined,
    };
    return response;
  });
}
