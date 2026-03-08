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
import {
  createReminder, getActiveReminders, formatRemindersForClaude,
  cancelReminder,
} from './concluding/reminders.js';
import { logHabit, getHabitStats, formatHabitStats, type HabitName } from '../tracking/habits.js';
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
      return handleScheduleReminderEnhanced(store, input);
    case 'list_reminders':
      return handleListReminders(store);
    case 'cancel_reminder':
      return handleCancelReminder(store, input);
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
    case 'log_habit':
      return handleLogHabit(store, input);
    case 'get_habit_stats':
      return handleGetHabitStats(store, input);
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

function handleScheduleReminderEnhanced(store: MemoryStore, input: ToolInput): string {
  const result = createReminder(store, {
    description: input.description as string,
    trigger_time: input.trigger_time as string | undefined,
    relative_minutes: input.relative_minutes as number | undefined,
    event_id: input.event_id as number | undefined,
    event_offset_minutes: input.event_offset_minutes as number | undefined,
    recurring_pattern: input.recurring_pattern as string | undefined,
    recurring_time: input.recurring_time as string | undefined,
    stakes_level: input.stakes_level as string | undefined,
  });

  const timeStr = new Date(result.triggerTime).toLocaleString('en-GB', { timeZone: 'Europe/Vienna' });
  const recurring = result.isRecurring ? ' (recurring)' : '';
  return `Reminder scheduled (ID ${result.id}): "${input.description}" — next: ${timeStr}${recurring}`;
}

function handleListReminders(store: MemoryStore): string {
  const reminders = getActiveReminders(store);
  return formatRemindersForClaude(reminders);
}

function handleCancelReminder(store: MemoryStore, input: ToolInput): string {
  const searchTerm = input.search_term as string;
  const result = cancelReminder(store, searchTerm);

  if (result.cancelled === 0) {
    return `No reminders found matching "${searchTerm}".`;
  }

  const descriptions = result.cancelledDescriptions.join(', ');
  const recurring = result.routinesCancelled > 0 ? ` (${result.routinesCancelled} recurring pattern(s) also cancelled)` : '';
  return `Cancelled ${result.cancelled} reminder(s): ${descriptions}${recurring}`;
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

function handleLogHabit(store: MemoryStore, input: ToolInput): string {
  return logHabit(store, {
    habit: input.habit as HabitName,
    action: input.action as 'completed' | 'skipped' | 'value',
    value: input.value as string | undefined,
    date: new Date().toISOString().slice(0, 10),
    notes: input.notes as string | undefined,
  });
}

function handleGetHabitStats(store: MemoryStore, input: ToolInput): string {
  const stats = getHabitStats(store, input.habit as HabitName);
  return formatHabitStats(stats);
}
