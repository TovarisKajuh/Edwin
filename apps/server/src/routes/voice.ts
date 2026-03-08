import type { FastifyInstance } from 'fastify';
import type { BrainPipeline } from '../brain/pipeline.js';
import { textToSpeech } from '../voice/speak.js';
import { transcribeAudio } from '../voice/transcribe.js';
import type { VoiceRequest } from '@edwin/shared';

export async function voiceRoutes(server: FastifyInstance, pipeline: BrainPipeline) {
  // Existing text-based voice endpoint
  server.post<{ Body: VoiceRequest }>('/api/voice', async (request, reply) => {
    const { transcript, conversationId } = request.body;
    const result = await pipeline.process(transcript, 'voice', conversationId);

    reply.header('X-Edwin-Message', encodeURIComponent(result.message));
    reply.header('X-Edwin-Conversation-Id', result.conversationId.toString());

    const audioBuffer = await textToSpeech(result.message);
    if (audioBuffer) {
      reply.type('audio/mpeg');
      return reply.send(Buffer.from(audioBuffer));
    }

    // Browser TTS mode: return JSON, frontend speaks it
    return { message: result.message, conversationId: result.conversationId };
  });

  // Audio upload endpoint — transcribe + process + TTS response
  server.post('/api/voice/audio', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No audio file provided' });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);
    const mimeType = data.mimetype || 'audio/webm';

    console.log('[Voice/Audio] Received', audioBuffer.length, 'bytes,', mimeType);

    // Transcribe
    const transcript = await transcribeAudio(audioBuffer, mimeType);
    if (!transcript.trim()) {
      return reply.code(400).send({ error: 'Could not transcribe audio' });
    }

    // Parse conversationId from form field if provided
    const fields = data.fields as Record<string, { value?: string } | undefined>;
    const convIdStr = fields?.conversationId?.value;
    const conversationId = convIdStr ? parseInt(convIdStr) : undefined;

    // Process through Edwin's brain
    const result = await pipeline.process(transcript, 'voice', conversationId);

    reply.header('X-Edwin-Transcript', encodeURIComponent(transcript));
    reply.header('X-Edwin-Message', encodeURIComponent(result.message));
    reply.header('X-Edwin-Conversation-Id', result.conversationId.toString());

    // TTS response
    const ttsBuffer = await textToSpeech(result.message);
    if (ttsBuffer) {
      reply.type('audio/mpeg');
      return reply.send(Buffer.from(ttsBuffer));
    }

    return { transcript, message: result.message, conversationId: result.conversationId };
  });
}
