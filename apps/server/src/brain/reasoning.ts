import AnthropicSDK from '@anthropic-ai/sdk';
import type { Tool, MessageParam, ContentBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages.js';
import { MemoryStore } from '../memory/store.js';
import { executeTools } from './tool-executor.js';

let client: InstanceType<typeof AnthropicSDK> | null = null;

function getClient(): InstanceType<typeof AnthropicSDK> {
  if (!client) {
    client = new AnthropicSDK();
  }
  return client;
}

export interface ClaudeOptions {
  model?: string;
  maxTokens?: number;
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const FAST_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOOL_ROUNDS = 5;

/**
 * Call Claude without tools — simple request/response.
 * Used for memory extraction, profiling, compression, and other background tasks.
 */
export async function callClaude(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  options?: ClaudeOptions,
): Promise<string> {
  try {
    const response = await getClient().messages.create({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? 1024,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock?.text ?? 'I seem to have lost my words, sir. Give me a moment.';
  } catch {
    return 'I seem to have lost my words, sir. Give me a moment.';
  }
}

/**
 * Call Claude WITH tools — handles the tool use loop.
 *
 * Flow:
 * 1. Send message with tools
 * 2. If Claude responds with tool_use → execute tools, send results back
 * 3. Repeat until Claude responds with text (or max rounds reached)
 * 4. Return final text
 */
export async function callClaudeWithTools(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  tools: Tool[],
  store: MemoryStore,
  options?: ClaudeOptions,
): Promise<string> {
  try {
    // Build mutable message array for the tool loop
    const loopMessages: MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await getClient().messages.create({
        model: options?.model ?? DEFAULT_MODEL,
        max_tokens: options?.maxTokens ?? 1024,
        system: systemPrompt,
        messages: loopMessages,
        tools,
      });

      // Extract tool use blocks
      const toolUseBlocks = response.content.filter(
        (block): block is Extract<ContentBlock, { type: 'tool_use' }> =>
          block.type === 'tool_use',
      );

      // If no tool calls, extract text and return
      if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
        const textBlock = response.content.find((block) => block.type === 'text');
        return textBlock?.text ?? 'I seem to have lost my words, sir. Give me a moment.';
      }

      // Execute tools
      const toolResults = await executeTools(
        store,
        toolUseBlocks.map((block) => ({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        })),
      );

      // Add assistant's response (with tool_use blocks) to messages
      loopMessages.push({ role: 'assistant', content: response.content });

      // Add tool results
      const toolResultContent: ToolResultBlockParam[] = toolResults.map((r) => ({
        type: 'tool_result' as const,
        tool_use_id: r.tool_use_id,
        content: r.content,
        is_error: r.is_error,
      }));
      loopMessages.push({ role: 'user', content: toolResultContent });
    }

    // Max rounds exhausted — make one final call without tools to get text
    const finalResponse = await getClient().messages.create({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? 1024,
      system: systemPrompt,
      messages: loopMessages,
    });

    const textBlock = finalResponse.content.find((block) => block.type === 'text');
    return textBlock?.text ?? 'I seem to have lost my words, sir. Give me a moment.';
  } catch {
    return 'I seem to have lost my words, sir. Give me a moment.';
  }
}

/**
 * Stream Claude's response with tools — handles tool loop, streams only the final text.
 *
 * Tool calls happen silently (non-streamed). Only the final text response is streamed
 * to the user via onChunk.
 */
export async function streamClaudeWithTools(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  tools: Tool[],
  store: MemoryStore,
  onChunk: (delta: string) => void,
  options?: ClaudeOptions,
): Promise<string> {
  try {
    const loopMessages: MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Tool loop — non-streamed rounds
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await getClient().messages.create({
        model: options?.model ?? DEFAULT_MODEL,
        max_tokens: options?.maxTokens ?? 1024,
        system: systemPrompt,
        messages: loopMessages,
        tools,
      });

      const toolUseBlocks = response.content.filter(
        (block): block is Extract<ContentBlock, { type: 'tool_use' }> =>
          block.type === 'tool_use',
      );

      // No tool calls — this IS the final response, but we got it non-streamed
      // For the first message with no tools, we should have streamed it.
      // This only happens if Claude used tools in a previous round and now responds with text.
      if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
        const textBlock = response.content.find((block) => block.type === 'text');
        const text = textBlock?.text ?? 'I seem to have lost my words, sir. Give me a moment.';
        onChunk(text);
        return text;
      }

      // Execute tools
      const toolResults = await executeTools(
        store,
        toolUseBlocks.map((block) => ({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        })),
      );

      loopMessages.push({ role: 'assistant', content: response.content });
      const toolResultContent: ToolResultBlockParam[] = toolResults.map((r) => ({
        type: 'tool_result' as const,
        tool_use_id: r.tool_use_id,
        content: r.content,
        is_error: r.is_error,
      }));
      loopMessages.push({ role: 'user', content: toolResultContent });
    }

    // After tool rounds, stream the final response
    const stream = getClient().messages.stream({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? 1024,
      system: systemPrompt,
      messages: loopMessages,
    });

    let fullText = '';
    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const delta = event.delta.text;
        fullText += delta;
        onChunk(delta);
      }
    }

    return fullText || 'I seem to have lost my words, sir. Give me a moment.';
  } catch {
    return 'I seem to have lost my words, sir. Give me a moment.';
  }
}

/**
 * Stream Claude without tools — for cases where no tools are needed.
 * Kept for backward compatibility with briefing and other non-tool calls.
 */
export async function streamClaude(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  onChunk: (delta: string) => void,
  options?: ClaudeOptions,
): Promise<string> {
  try {
    const stream = getClient().messages.stream({
      model: options?.model ?? DEFAULT_MODEL,
      max_tokens: options?.maxTokens ?? 1024,
      system: systemPrompt,
      messages,
    });

    let fullText = '';
    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        const delta = event.delta.text;
        fullText += delta;
        onChunk(delta);
      }
    }

    return fullText || 'I seem to have lost my words, sir. Give me a moment.';
  } catch {
    return 'I seem to have lost my words, sir. Give me a moment.';
  }
}

/** Haiku call for voice responses only — faster for spoken conversation flow */
export async function callClaudeVoice(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number = 512,
): Promise<string> {
  return callClaude(systemPrompt, messages, { model: FAST_MODEL, maxTokens });
}
