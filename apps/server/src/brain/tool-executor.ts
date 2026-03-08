/**
 * Tool Executor — handles Edwin's tool calls during conversations.
 *
 * When Claude decides to use a tool (remember, recall, schedule_reminder,
 * list_pending), this module executes it against the memory store and
 * returns the result for Claude to continue reasoning.
 */

import { MemoryStore } from '../memory/store.js';
import type { Source } from '@edwin/shared';

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

interface ToolInput {
  [key: string]: unknown;
}

export function executeTools(
  store: MemoryStore,
  toolCalls: { id: string; name: string; input: ToolInput }[],
): ToolResult[] {
  return toolCalls.map((call) => {
    try {
      const result = executeSingleTool(store, call.name, call.input);
      return { tool_use_id: call.id, content: result };
    } catch (err) {
      return {
        tool_use_id: call.id,
        content: `Tool error: ${(err as Error).message}`,
        is_error: true,
      };
    }
  });
}

function executeSingleTool(store: MemoryStore, name: string, input: ToolInput): string {
  switch (name) {
    case 'remember':
      return handleRemember(store, input);
    case 'recall':
      return handleRecall(store, input);
    case 'schedule_reminder':
      return handleScheduleReminder(store, input);
    case 'list_pending':
      return handleListPending(store, input);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function handleRemember(store: MemoryStore, input: ToolInput): string {
  const category = input.category as string;
  const content = input.content as string;
  const confidence = input.confidence as number;

  const validCategories = ['fact', 'preference', 'commitment', 'follow_up', 'emotional_state'];
  if (!validCategories.includes(category)) {
    throw new Error(`Invalid category: ${category}`);
  }

  // Determine source from confidence
  let source: Source;
  if (confidence >= 0.9) source = 'told';
  else if (confidence >= 0.6) source = 'observed';
  else source = 'inferred';

  store.addObservation(category, content, confidence, source);
  return `Remembered: ${content}`;
}

function handleRecall(store: MemoryStore, input: ToolInput): string {
  const query = input.query as string;
  const results = store.searchMemory(query, 8);

  if (results.length === 0) {
    return 'No memories found for this topic.';
  }

  const formatted = results.map((r) => {
    const date = r.date ? ` (${r.date})` : '';
    return `[${r.tier}/${r.category}] ${r.content}${date}`;
  });

  return formatted.join('\n');
}

function handleScheduleReminder(store: MemoryStore, input: ToolInput): string {
  const description = input.description as string;
  const triggerTime = input.trigger_time as string;
  const stakesLevel = (input.stakes_level as string) || 'low';

  // Validate the trigger time is parseable
  const parsed = new Date(triggerTime);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid trigger_time: ${triggerTime}`);
  }

  const id = store.addScheduledAction('reminder', description, triggerTime, stakesLevel);
  return `Reminder scheduled (ID ${id}): "${description}" at ${parsed.toLocaleString('en-GB', { timeZone: 'Europe/Vienna' })}`;
}

function handleListPending(store: MemoryStore, input: ToolInput): string {
  const limit = (input.limit as number) || 10;
  const actions = store.getPendingActions(limit);

  if (actions.length === 0) {
    return 'No pending reminders or actions.';
  }

  const formatted = actions.map((a) => {
    const time = new Date(a.trigger_time).toLocaleString('en-GB', { timeZone: 'Europe/Vienna' });
    return `- [${a.stakes_level}] ${a.description} (${time})`;
  });

  return `Pending actions:\n${formatted.join('\n')}`;
}
