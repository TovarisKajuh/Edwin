import AnthropicSDK from '@anthropic-ai/sdk';

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

/** Haiku call for voice responses only — faster for spoken conversation flow */
export async function callClaudeVoice(
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens: number = 512,
): Promise<string> {
  return callClaude(systemPrompt, messages, { model: FAST_MODEL, maxTokens });
}
