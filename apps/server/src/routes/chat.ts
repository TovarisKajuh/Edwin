import type { FastifyInstance } from 'fastify';
import type { BrainPipeline } from '../brain/pipeline.js';
import { textToSpeech } from '../voice/speak.js';
import type { ChatRequest, ChatResponse } from '@edwin/shared';

export async function chatRoutes(server: FastifyInstance, pipeline: BrainPipeline) {
  // Non-streaming endpoint (used by voice — needs complete text for TTS)
  server.post<{ Body: ChatRequest }>('/api/chat', async (request) => {
    const { message, conversationId } = request.body;
    const result = await pipeline.process(message, 'chat', conversationId);

    let audioBase64: string | undefined;
    try {
      const audioBuffer = await textToSpeech(result.message);
      if (audioBuffer) {
        audioBase64 = Buffer.from(audioBuffer).toString('base64');
      }
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

  // Streaming endpoint — SSE, first token in <500ms
  server.post<{ Body: ChatRequest }>('/api/chat/stream', async (request, reply) => {
    const { message, conversationId } = request.body;

    // Hijack before writing — tells Fastify we're handling the response ourselves
    reply.hijack();

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3000',
      'Access-Control-Allow-Credentials': 'true',
    });

    try {
      const result = await pipeline.processStreaming(
        message,
        'chat',
        (delta) => {
          reply.raw.write(`data: ${JSON.stringify({ delta })}\n\n`);
        },
        conversationId,
      );

      reply.raw.write(`data: ${JSON.stringify({ done: true, conversationId: result.conversationId })}\n\n`);
    } catch (err) {
      console.error('[chat/stream] Streaming failed:', err);
      reply.raw.write(`data: ${JSON.stringify({ delta: 'I seem to be having trouble, sir. Please try again.' })}\n\n`);
      reply.raw.write(`data: ${JSON.stringify({ done: true, conversationId: conversationId ?? 0 })}\n\n`);
    }

    reply.raw.end();
  });
}
