/**
 * Tool definitions for Claude — Session 12.
 *
 * These tools let Edwin actively remember, recall, schedule, and query
 * during conversations. Instead of passively receiving context, Edwin
 * can reach into his memory, store new facts, and set reminders.
 */

import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';

export const EDWIN_TOOLS: Tool[] = [
  {
    name: 'remember',
    description:
      'Store something important about Jan — a fact, preference, commitment, or emotional state. ' +
      'Use this whenever Jan tells you something worth remembering for future conversations. ' +
      'Do NOT announce that you are using this tool — just remember silently.',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['fact', 'preference', 'commitment', 'follow_up', 'emotional_state'],
          description: 'What kind of information this is.',
        },
        content: {
          type: 'string',
          description: 'The information to remember, in natural language.',
        },
        confidence: {
          type: 'number',
          description: 'How confident you are: 1.0 = Jan explicitly said it, 0.7 = you observed it, 0.5 = you inferred it.',
        },
      },
      required: ['category', 'content', 'confidence'],
    },
  },
  {
    name: 'recall',
    description:
      'Search Edwin\'s memory for information about a topic. Use this when Jan asks about something ' +
      'you should know, or when you need context to give a better answer. ' +
      'Do NOT announce that you are searching — just recall and use the information naturally.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'What to search for in memory (e.g., "gym", "solar contract", "sleep schedule").',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'schedule_reminder',
    description:
      'Set a reminder for Jan at a specific time. Use when Jan says "remind me" or when you ' +
      'decide Jan needs a reminder based on context. ' +
      'Do NOT use this for vague future events — only for specific, actionable reminders.',
    input_schema: {
      type: 'object' as const,
      properties: {
        description: {
          type: 'string',
          description: 'What to remind Jan about.',
        },
        trigger_time: {
          type: 'string',
          description: 'ISO 8601 datetime for when to trigger (e.g., "2026-03-09T14:00:00"). Use Europe/Vienna timezone.',
        },
        stakes_level: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'How important: low = nice to know, medium = should not miss, high = critical.',
        },
      },
      required: ['description', 'trigger_time'],
    },
  },
  {
    name: 'list_pending',
    description:
      'List all pending reminders and scheduled actions. Use when Jan asks "what do I have coming up" ' +
      'or "any reminders" or when you need to check what\'s already scheduled.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of items to return. Default 10.',
        },
      },
      required: [],
    },
  },
];
