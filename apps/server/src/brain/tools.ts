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
      'Set a reminder for Jan. Supports: absolute time ("at 3pm"), relative time ("in 2 hours"), ' +
      'event-based ("before the meeting"), and recurring ("every Monday"). ' +
      'Use when Jan says "remind me" or when you decide a reminder is needed.',
    input_schema: {
      type: 'object' as const,
      properties: {
        description: {
          type: 'string',
          description: 'What to remind Jan about.',
        },
        trigger_time: {
          type: 'string',
          description: 'ISO 8601 datetime for absolute time (e.g., "2026-03-09T14:00:00"). Use Europe/Vienna timezone.',
        },
        relative_minutes: {
          type: 'number',
          description: 'Minutes from now (e.g., 120 for "in 2 hours"). Use instead of trigger_time for relative reminders.',
        },
        event_id: {
          type: 'number',
          description: 'Calendar event ID to link this reminder to. Triggers before the event.',
        },
        event_offset_minutes: {
          type: 'number',
          description: 'Minutes before the linked event to trigger (default 15).',
        },
        recurring_pattern: {
          type: 'string',
          enum: ['daily', 'weekdays', 'weekly:monday', 'weekly:tuesday', 'weekly:wednesday',
                 'weekly:thursday', 'weekly:friday', 'weekly:saturday', 'weekly:sunday', 'monthly'],
          description: 'Recurring pattern. Use for "every Monday", "every day", "weekdays only".',
        },
        recurring_time: {
          type: 'string',
          description: 'HH:MM time for recurring reminders (default "09:00").',
        },
        stakes_level: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'How important: low = nice to know, medium = should not miss, high = critical.',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'list_reminders',
    description:
      'List all active reminders, including recurring ones. Use when Jan asks "what reminders do I have" ' +
      'or "any upcoming reminders".',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'cancel_reminder',
    description:
      'Cancel a reminder by description. Use when Jan says "cancel the electrician reminder" or ' +
      '"never mind about that reminder". Matches by keyword in description. ' +
      'Also cancels recurring routines if the reminder is recurring.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search_term: {
          type: 'string',
          description: 'Keyword to match against reminder descriptions (e.g., "electrician", "gym").',
        },
      },
      required: ['search_term'],
    },
  },
  {
    name: 'list_pending',
    description:
      'List all pending actions (reminders, proposals, notifications). Use when Jan asks "what do I have coming up" ' +
      'or to check scheduled items broadly.',
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
  {
    name: 'get_current_weather',
    description:
      'Get current weather and 3-day forecast for Graz, Austria (Jan\'s location). ' +
      'Use when Jan asks about weather, when suggesting outdoor activities, or when weather ' +
      'is relevant to plans. Do NOT announce the tool — just use the data naturally.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_schedule',
    description:
      'Get Jan\'s schedule — today\'s events, this week\'s events, or upcoming events. ' +
      'Use when Jan asks about his schedule, when you need to check for conflicts before ' +
      'suggesting times, or when referencing upcoming commitments.',
    input_schema: {
      type: 'object' as const,
      properties: {
        range: {
          type: 'string',
          enum: ['today', 'week', 'upcoming'],
          description: 'Time range: today = today\'s events, week = this week, upcoming = next 10 events.',
        },
      },
      required: ['range'],
    },
  },
  {
    name: 'create_event',
    description:
      'Add an event to Jan\'s calendar. Use when Jan mentions a meeting, appointment, or ' +
      'scheduled activity. For medium/high stakes, PROPOSE the event first and wait for ' +
      'confirmation before creating it.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Event title (e.g., "Client meeting", "Gym session").',
        },
        start_time: {
          type: 'string',
          description: 'ISO 8601 datetime for event start (e.g., "2026-03-09T10:00:00"). Use Europe/Vienna timezone.',
        },
        end_time: {
          type: 'string',
          description: 'ISO 8601 datetime for event end (optional).',
        },
        description: {
          type: 'string',
          description: 'Optional event description or notes.',
        },
        location: {
          type: 'string',
          description: 'Optional event location.',
        },
      },
      required: ['title', 'start_time'],
    },
  },
  {
    name: 'log_habit',
    description:
      'Log a habit event for Jan. Use when Jan mentions going to the gym, taking supplements, ' +
      'sleeping well/badly, eating healthy, drinking water, reading, or meditating. ' +
      'Edwin should log habits silently based on conversation — never ask Jan to "log" things.',
    input_schema: {
      type: 'object' as const,
      properties: {
        habit: {
          type: 'string',
          enum: ['gym', 'sleep', 'supplements', 'diet', 'hydration', 'reading', 'meditation'],
          description: 'Which habit to log.',
        },
        action: {
          type: 'string',
          enum: ['completed', 'skipped', 'value'],
          description: 'completed = did it, skipped = explicitly didn\'t, value = recording a measurement (e.g. sleep hours).',
        },
        value: {
          type: 'string',
          description: 'For value-type logs: the measurement (e.g., "7.5h" for sleep, "3L" for hydration).',
        },
        notes: {
          type: 'string',
          description: 'Optional notes (e.g., "creatine + magnesium", "leg day").',
        },
      },
      required: ['habit', 'action'],
    },
  },
  {
    name: 'get_habit_stats',
    description:
      'Get habit tracking stats for a specific habit. Shows this week vs last week, streak, and trend. ' +
      'Use when Jan asks "how\'s my gym consistency?" or "am I on track with supplements?".',
    input_schema: {
      type: 'object' as const,
      properties: {
        habit: {
          type: 'string',
          enum: ['gym', 'sleep', 'supplements', 'diet', 'hydration', 'reading', 'meditation'],
          description: 'Which habit to check stats for.',
        },
      },
      required: ['habit'],
    },
  },
  {
    name: 'log_expense',
    description:
      'Log a spending event for Jan. Use when Jan mentions buying something, paying for a service, ' +
      'or any financial transaction. Log silently — don\'t ask Jan to track spending.',
    input_schema: {
      type: 'object' as const,
      properties: {
        amount: {
          type: 'number',
          description: 'Amount in EUR.',
        },
        category: {
          type: 'string',
          enum: ['food', 'transport', 'shopping', 'entertainment', 'health', 'business', 'housing', 'subscriptions', 'other'],
          description: 'Spending category.',
        },
        description: {
          type: 'string',
          description: 'What was bought (e.g., "Wolt delivery", "fuel", "gym membership").',
        },
      },
      required: ['amount', 'category', 'description'],
    },
  },
  {
    name: 'get_spending',
    description:
      'Get spending summary for this week or month. Use when Jan asks "how much have I spent?" ' +
      'or "what\'s my food spending this month?".',
    input_schema: {
      type: 'object' as const,
      properties: {
        period: {
          type: 'string',
          enum: ['week', 'month'],
          description: 'Time period for the summary.',
        },
      },
      required: ['period'],
    },
  },
  {
    name: 'list_bills',
    description:
      'List all tracked bills with due dates and payment status. Use when Jan asks about bills ' +
      'or when discussing financial planning.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'add_person',
    description:
      'Add someone to Jan\'s contact circle. Use when Jan mentions someone new — a friend, colleague, ' +
      'family member — or when Edwin should track a relationship.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Person\'s name.' },
        relationship: {
          type: 'string',
          enum: ['friend', 'family', 'colleague', 'business', 'partner', 'acquaintance'],
          description: 'Relationship type.',
        },
        contact_frequency: {
          type: 'string',
          enum: ['weekly', 'biweekly', 'monthly', 'quarterly'],
          description: 'How often Jan should ideally be in touch.',
        },
        phone: { type: 'string', description: 'Phone number (optional).' },
        notes: { type: 'string', description: 'Notes about this person (optional).' },
      },
      required: ['name'],
    },
  },
  {
    name: 'log_contact',
    description:
      'Record that Jan had contact with someone. Use when Jan mentions meeting, calling, or ' +
      'texting someone. Updates last_contact date. Log silently.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Name of the person Jan had contact with.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_people',
    description:
      'Get Jan\'s contact list sorted by contact gap. Use when Jan asks "who haven\'t I seen?" ' +
      'or "who should I call?" Shows overdue contacts first.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'add_item',
    description:
      'Add an item to inventory tracking. Use when Jan mentions a consumable he uses regularly — ' +
      'supplements, household items, groceries.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Item name (e.g., "Creatine", "Toilet paper").' },
        category: {
          type: 'string',
          enum: ['supplements', 'groceries', 'household', 'personal_care', 'office'],
          description: 'Item category.',
        },
        quantity: { type: 'number', description: 'Current quantity.' },
        reorder_threshold: { type: 'number', description: 'Quantity below which Edwin should suggest reordering.' },
        reorder_link: { type: 'string', description: 'URL for reordering (optional).' },
      },
      required: ['name'],
    },
  },
  {
    name: 'update_inventory',
    description:
      'Update item quantity. Use when Jan restocks something or mentions consumption. ' +
      'Finds item by name and updates quantity.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Item name to update (partial match works).' },
        quantity: { type: 'number', description: 'New quantity.' },
      },
      required: ['name', 'quantity'],
    },
  },
  {
    name: 'get_inventory',
    description:
      'List tracked inventory items. Use when Jan asks "what supplements do I have?" or ' +
      '"what am I running low on?".',
    input_schema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['supplements', 'groceries', 'household', 'personal_care', 'office'],
          description: 'Filter by category (optional — omit to see all).',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_news',
    description:
      'Get relevant industry news — solar, renewables, Austrian business, EU energy policy. ' +
      'Use when Jan asks about industry news, when discussing business strategy, or to add ' +
      'real-world context to business conversations. Max 3 curated items.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
];
