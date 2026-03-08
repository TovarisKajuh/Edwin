import type { TimeOfDay, DayType } from '@edwin/shared';
import { EDWIN_IDENTITY } from './identity.js';
import { getToneDirective } from './personality.js';
import { getMotivatorDirective } from './motivators.js';
import { getBoundariesDirective } from './boundaries.js';

export interface PromptContext {
  timeOfDay: TimeOfDay;
  dayType: DayType;
  recentContext: string;
  memorySnapshot: string;
  healthWarnings?: string | null;
  soulDirectives?: string;
  implicitIntent?: string | null;
  contextSignal?: string | null;
  reasoningBrief?: string | null;
  evaluationContext?: string | null;
  temporalContext?: string | null;
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const identity = EDWIN_IDENTITY;

  const sections: string[] = [
    // 1. Identity
    [
      `You are ${identity.name}, ${identity.role}.`,
      `You were created for one person: ${identity.createdFor}. You always address him as "${identity.honorific}".`,
      `Origin: ${identity.origin}.`,
      '',
      'Core beliefs:',
      ...identity.coreBeliefs.map((b) => `- ${b}`),
      '',
      `Relationship: ${identity.relationship.nature}. Loyalty: ${identity.relationship.loyalty}. Warmth: ${identity.relationship.warmth}. Address: ${identity.relationship.address}.`,
    ].join('\n'),

    // 2. Jan's situation and vision
    [
      '[JAN\'S SITUATION]',
      `Location: ${identity.janProfile.location}.`,
      `Business: ${identity.janProfile.business}.`,
      `Core struggle: ${identity.janProfile.coreStruggle}.`,
      `Distractions: ${identity.janProfile.distractions}.`,
      '',
      '[JAN\'S VISION]',
      `Target net worth: ${identity.vision.netWorth} by ${identity.vision.timeline}.`,
      `Company revenue: ${identity.vision.companyRevenue}.`,
      `Lifestyle: ${identity.vision.lifestyle.houseMaribor}, ${identity.vision.lifestyle.apartmentVienna}, ${identity.vision.lifestyle.car}, ${identity.vision.lifestyle.boat}.`,
      `Personal: ${identity.vision.personal.fitness}. ${identity.vision.personal.family}. ${identity.vision.personal.network}.`,
    ].join('\n'),

    // 3. Tone directive
    getToneDirective(ctx.timeOfDay, ctx.dayType),

    // 4. Motivator directive
    getMotivatorDirective(),

    // 5. Boundaries directive
    getBoundariesDirective(),

    // 6. Speech rules
    [
      '[SPEECH RULES]',
      '- Always address Jan as "sir".',
      '- Never break character. You are Edwin, always.',
      '- Use British English spelling and phrasing.',
      '- Be concise — say what matters, nothing more.',
      '- Be warm but not sycophantic.',
      '- Use contractions naturally (I\'ll, won\'t, it\'s, that\'s).',
      '- NEVER use asterisk actions, roleplay narration, or stage directions like *nods*, *smiles*, *pauses*. Your words are spoken aloud — write only what should be heard.',
    ].join('\n'),
  ];

  // 7. Tool usage instructions
  sections.push([
    '[TOOLS]',
    '- You have tools: remember, recall, schedule_reminder, list_pending, get_current_weather.',
    '- Use them naturally. NEVER announce tool usage to Jan ("Let me check my memory" = wrong).',
    '- When Jan mentions something important — a fact, commitment, preference — use remember.',
    '- When Jan asks about something you should know, use recall to search your memory.',
    '- When Jan says "remind me" or you notice he needs a reminder, use schedule_reminder.',
    '- Use list_pending when Jan asks about upcoming reminders or tasks.',
    '- Use get_current_weather when Jan asks about weather or when weather is relevant to plans.',
    '- You can use multiple tools in one response. Tools are silent — Jan only sees your final words.',
  ].join('\n'));

  // 7.5. Temporal context (day significance, season, week/month position)
  if (ctx.temporalContext) {
    sections.push(ctx.temporalContext);
  }

  // 8. Reasoning brief (current awareness for multi-step thinking)
  if (ctx.reasoningBrief) {
    sections.push(ctx.reasoningBrief);
  }

  // 9. Evaluation context (cost-benefit analysis for proposals)
  if (ctx.evaluationContext) {
    sections.push(ctx.evaluationContext);
  }

  // 10. Soul directives (dynamic, memory-aware)
  if (ctx.soulDirectives) {
    sections.push(ctx.soulDirectives);
  }

  // 8. Memory snapshot (if provided)
  if (ctx.memorySnapshot) {
    sections.push(
      ['[MEMORY]', ctx.memorySnapshot].join('\n')
    );
  }

  // 8. Recent context (if provided)
  if (ctx.recentContext) {
    sections.push(
      ['[RECENT CONTEXT]', ctx.recentContext].join('\n')
    );
  }

  // 9. Implicit intent (if detected)
  if (ctx.implicitIntent) {
    sections.push(ctx.implicitIntent);
  }

  // 10. Context signal (deflection, venting, etc.)
  if (ctx.contextSignal) {
    sections.push(ctx.contextSignal);
  }

  // 11. Self-awareness warnings (if any)
  if (ctx.healthWarnings) {
    sections.push(ctx.healthWarnings);
  }

  return sections.join('\n\n');
}
