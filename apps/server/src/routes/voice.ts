import type { FastifyInstance } from 'fastify';
import type { BrainPipeline } from '../brain/pipeline.js';
import { textToSpeech } from '../voice/speak.js';
import type { VoiceRequest } from '@edwin/shared';

export async function voiceRoutes(server: FastifyInstance, pipeline: BrainPipeline) {
  server.post<{ Body: VoiceRequest }>('/api/voice', async (request, reply) => {
    const { transcript, conversationId } = request.body;
    const result = await pipeline.process(transcript, 'voice', conversationId);
    const audioBuffer = await textToSpeech(result.message);

    reply.header('X-Edwin-Message', encodeURIComponent(result.message));
    reply.header('X-Edwin-Conversation-Id', result.conversationId.toString());
    reply.type('audio/mpeg');
    return reply.send(Buffer.from(audioBuffer));
  });
}
