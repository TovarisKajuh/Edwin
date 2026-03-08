import type { Channel } from '@edwin/shared';
import { MemoryStore } from '../memory/store.js';
import { extractMemories } from '../memory/extractor.js';
import { buildSystemPrompt } from '../soul/prompt-builder.js';
import { buildContext } from './context.js';
import { callClaude, streamClaude } from './reasoning.js';
import { detectAndStoreMood } from './understanding/mood-detector.js';
import { detectIntent, formatIntent } from './understanding/intent-detector.js';
import { interpretContext, formatContextInterpretation } from './understanding/context-interpreter.js';

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

    // 2.5. Detect mood and intent from Jan's message (instant, no Claude call)
    detectAndStoreMood(this.store, userMessage);
    const intent = detectIntent(userMessage);

    // 3. Build context
    const ctx = buildContext(this.store, conversationId);

    // 3.5. Interpret conversational context (deflection, venting, etc.)
    const contextInterp = interpretContext(userMessage, ctx.conversationHistory, this.store);
    const contextSignal = formatContextInterpretation(contextInterp);

    // 4. Build system prompt (includes self-awareness warnings)
    const systemPrompt = buildSystemPrompt({
      timeOfDay: ctx.timeOfDay,
      dayType: ctx.dayType,
      recentContext: ctx.recentContext,
      memorySnapshot: ctx.memorySnapshot,
      healthWarnings: ctx.healthWarnings,
      soulDirectives: ctx.soulDirectives,
      implicitIntent: intent ? formatIntent(intent) : null,
      contextSignal,
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

    // 8. Extract memories in background (fire-and-forget)
    const recentMessages = this.store.getMessages(conversationId).slice(-6);
    extractMemories(
      this.store,
      recentMessages.map((m) => ({ role: m.role as 'jan' | 'edwin', content: m.content })),
    ).catch((err) => {
      console.error('[pipeline] Memory extraction failed:', err);
    });

    // 9. Return result
    return { message: response, conversationId };
  }

  /**
   * Process a message with streaming — calls onChunk for each text delta.
   * Returns the full response + conversationId after stream completes.
   */
  async processStreaming(
    userMessage: string,
    channel: Channel,
    onChunk: (delta: string) => void,
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

    // 2.5. Detect mood and intent from Jan's message (instant, no Claude call)
    detectAndStoreMood(this.store, userMessage);
    const intent = detectIntent(userMessage);

    // 3. Build context
    const ctx = buildContext(this.store, conversationId);

    // 3.5. Interpret conversational context (deflection, venting, etc.)
    const contextInterp = interpretContext(userMessage, ctx.conversationHistory, this.store);
    const contextSignal = formatContextInterpretation(contextInterp);

    // 4. Build system prompt
    const systemPrompt = buildSystemPrompt({
      timeOfDay: ctx.timeOfDay,
      dayType: ctx.dayType,
      recentContext: ctx.recentContext,
      memorySnapshot: ctx.memorySnapshot,
      healthWarnings: ctx.healthWarnings,
      soulDirectives: ctx.soulDirectives,
      implicitIntent: intent ? formatIntent(intent) : null,
      contextSignal,
    });

    // 5. Format conversation history
    const messages = ctx.conversationHistory.map((m) => ({
      role: (m.role === 'jan' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));

    // 6. Stream Claude's response
    const response = await streamClaude(systemPrompt, messages, onChunk);

    // 7. Store Edwin's response
    this.store.addMessage(conversationId, 'edwin', response);

    // 8. Extract memories in background
    const recentMessages = this.store.getMessages(conversationId).slice(-6);
    extractMemories(
      this.store,
      recentMessages.map((m) => ({ role: m.role as 'jan' | 'edwin', content: m.content })),
    ).catch((err) => {
      console.error('[pipeline] Memory extraction failed:', err);
    });

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
      healthWarnings: ctx.healthWarnings,
      soulDirectives: ctx.soulDirectives,
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
