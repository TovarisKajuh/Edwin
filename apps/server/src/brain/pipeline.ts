import type { Channel } from '@edwin/shared';
import { MemoryStore } from '../memory/store.js';
import { extractMemories } from '../memory/extractor.js';
import { buildSystemPrompt } from '../soul/prompt-builder.js';
import { buildContext } from './context.js';
import { callClaudeWithTools, streamClaudeWithTools } from './reasoning.js';
import { detectAndStoreMood } from './understanding/mood-detector.js';
import { detectIntent, formatIntent } from './understanding/intent-detector.js';
import { interpretContext, formatContextInterpretation } from './understanding/context-interpreter.js';
import { detectAndStoreLocation } from '../integrations/location.js';
import { detectAndUpdateContacts } from '../tracking/social.js';
import { assessEmotionalState, formatEmotionalIntelligence } from './understanding/emotional-intelligence.js';
import { EDWIN_TOOLS } from './tools.js';
import { generateMorningBriefing } from '../jobs/morning.js';

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

    // 2.5. Detect mood, intent, location, and social contact from Jan's message
    detectAndStoreMood(this.store, userMessage);
    detectAndStoreLocation(this.store, userMessage);
    detectAndUpdateContacts(this.store, userMessage);
    const intent = detectIntent(userMessage);

    // 3. Build context
    const ctx = buildContext(this.store, conversationId);

    // 3.5. Interpret conversational context (deflection, venting, etc.)
    const contextInterp = interpretContext(userMessage, ctx.conversationHistory, this.store);
    const contextSignal = formatContextInterpretation(contextInterp);

    // 3.7. Emotional intelligence assessment
    const eiAssessment = assessEmotionalState(this.store, userMessage);
    const eiDirective = formatEmotionalIntelligence(eiAssessment);

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
      reasoningBrief: ctx.reasoningBrief,
      evaluationContext: ctx.evaluationContext,
      temporalContext: ctx.temporalContext,
      locationContext: ctx.locationContext,
      stakesGuidance: ctx.stakesGuidance,
      habitSummary: ctx.habitSummary,
      financialContext: ctx.financialContext,
      socialContext: ctx.socialContext,
      inventoryContext: ctx.inventoryContext,
      goalContext: ctx.goalContext,
      emotionalIntelligence: eiDirective,
    });

    // 5. Format conversation history for Claude
    const messages = ctx.conversationHistory.map((m) => ({
      role: (m.role === 'jan' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));

    // 6. Call Claude with tools (2048 tokens for multi-step reasoning)
    const response = await callClaudeWithTools(
      systemPrompt, messages, EDWIN_TOOLS, this.store, { maxTokens: 2048 },
    );

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
   * Tool calls happen silently; only the final text response is streamed.
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

    // 2.5. Detect mood, intent, location, and social contact from Jan's message
    detectAndStoreMood(this.store, userMessage);
    detectAndStoreLocation(this.store, userMessage);
    detectAndUpdateContacts(this.store, userMessage);
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
      reasoningBrief: ctx.reasoningBrief,
      evaluationContext: ctx.evaluationContext,
      temporalContext: ctx.temporalContext,
      locationContext: ctx.locationContext,
    });

    // 5. Format conversation history
    const messages = ctx.conversationHistory.map((m) => ({
      role: (m.role === 'jan' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));

    // 6. Stream Claude's response with tools (2048 tokens for multi-step reasoning)
    const response = await streamClaudeWithTools(
      systemPrompt, messages, EDWIN_TOOLS, this.store, onChunk, { maxTokens: 2048 },
    );

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
    return generateMorningBriefing(this.store);
  }
}
