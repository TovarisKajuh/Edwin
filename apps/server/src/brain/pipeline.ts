import type { Channel } from '@edwin/shared';
import { MemoryStore } from '../memory/store.js';
import { buildSystemPrompt } from '../soul/prompt-builder.js';
import { buildContext } from './context.js';
import { callClaude } from './reasoning.js';

export interface PipelineResponse {
  message: string;
  conversationId: number;
}

export class BrainPipeline {
  private store: MemoryStore;

  constructor(store: MemoryStore) {
    this.store = store;
  }

  async process(
    userMessage: string,
    channel: Channel,
    existingConversationId?: number,
  ): Promise<PipelineResponse> {
    // 1. Get or create conversation
    let conversationId = existingConversationId;
    if (conversationId === undefined) {
      const active = this.store.getActiveConversation(channel);
      conversationId = active?.id ?? this.store.startConversation(channel);
    }

    // 2. Store Jan's message
    this.store.addMessage(conversationId, 'jan', userMessage);

    // 3. Build context
    const ctx = buildContext(this.store, conversationId);

    // 4. Build system prompt
    const systemPrompt = buildSystemPrompt({
      timeOfDay: ctx.timeOfDay,
      dayType: ctx.dayType,
      recentContext: ctx.recentContext,
      memorySnapshot: ctx.memorySnapshot,
    });

    // 5. Format conversation history for Claude
    const messages = ctx.conversationHistory.map((m) => ({
      role: (m.role === 'jan' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));

    // 6. Call Claude
    const response = await callClaude(systemPrompt, messages);

    // 7. Store Edwin's response
    this.store.addMessage(conversationId, 'edwin', response);

    // 8. Return result
    return { message: response, conversationId };
  }

  async generateBriefing(): Promise<string> {
    // 1. Build context (no conversation)
    const ctx = buildContext(this.store);

    // 2. Build system prompt
    const systemPrompt = buildSystemPrompt({
      timeOfDay: ctx.timeOfDay,
      dayType: ctx.dayType,
      recentContext: ctx.recentContext,
      memorySnapshot: ctx.memorySnapshot,
    });

    // 3. Call Claude with briefing prompt
    const briefingPrompt =
      'Generate a morning briefing for Jan. Include: a greeting using "sir", ' +
      'context about the day ahead, a motivating thought, and one key focus area. ' +
      'Keep it under 100 words.';

    const response = await callClaude(systemPrompt, [
      { role: 'user', content: briefingPrompt },
    ]);

    return response;
  }
}
