/**
 * Tool Executor — handles Edwin's tool calls during conversations.
 *
 * When Claude decides to use a tool (remember, recall, schedule_reminder,
 * list_pending, get_current_weather), this module executes it against the
 * memory store and returns the result for Claude to continue reasoning.
 */

import { MemoryStore } from '../memory/store.js';
import { getWeather, formatWeatherForClaude } from '../integrations/weather.js';
import {
  getTodayEvents, getWeekEvents, getUpcomingEvents,
  createEvent, formatEventsForClaude,
} from '../integrations/calendar.js';
import { getNews, formatNewsForClaude } from '../integrations/news.js';
import type { Source } from '@edwin/shared';

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

interface ToolInput {
  [key: string]: unknown;
}

export async function executeTools(
  store: MemoryStore,
  toolCalls: { id: string; name: string; input: ToolInput }[],
): Promise<ToolResult[]> {
  return Promise.all(
    toolCalls.map(async (call) => {
      try {
        const result = await executeSingleTool(store, call.name, call.input);
        return { tool_use_id: call.id, content: result };
      } catch (err) {
        return {
          tool_use_id: call.id,
          content: `Tool error: ${(err as Error).message}`,
          is_error: true,
        };
      }
    }),
  );
}

async function executeSingleTool(store: MemoryStore, name: string, input: ToolInput): Promise<string> {
  switch (name) {
    case 'remember':
      return handleRemember(store, input);
    case 'recall':
      return handleRecall(store, input);
    case 'schedule_reminder':
      return handleScheduleReminder(store, input);
    case 'list_pending':
      return handleListPending(store, input);
    case 'get_current_weather':
      return handleGetCurrentWeather();
    case 'get_schedule':
      return handleGetSchedule(store, input);
    case 'create_event':
      return handleCreateEvent(store, input);
    case 'get_news':
      return handleGetNews();
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

async function handleGetCurrentWeather(): Promise<string> {
  const report = await getWeather();
  return formatWeatherForClaude(report);
}

function handleGetSchedule(store: MemoryStore, input: ToolInput): string {
  const range = (input.range as string) || 'today';

  switch (range) {
    case 'today': {
      const events = getTodayEvents(store);
      return formatEventsForClaude(events, 'Today\'s schedule');
    }
    case 'week': {
      const events = getWeekEvents(store);
      return formatEventsForClaude(events, 'This week\'s schedule');
    }
    case 'upcoming': {
      const events = getUpcomingEvents(store, 10);
      return formatEventsForClaude(events, 'Upcoming events');
    }
    default:
      throw new Error(`Invalid schedule range: ${range}`);
  }
}

function handleCreateEvent(store: MemoryStore, input: ToolInput): string {
  const title = input.title as string;
  const startTime = input.start_time as string;
  const endTime = input.end_time as string | undefined;
  const description = input.description as string | undefined;
  const location = input.location as string | undefined;

  // Validate start time
  const parsed = new Date(startTime);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid start_time: ${startTime}`);
  }

  const event = createEvent(store, title, startTime, endTime, { description, location });
  const timeStr = parsed.toLocaleString('en-GB', { timeZone: 'Europe/Vienna' });
  return `Event created (ID ${event.id}): "${title}" at ${timeStr}`;
}

async function handleGetNews(): Promise<string> {
  const feed = await getNews();
  return formatNewsForClaude(feed);
}
