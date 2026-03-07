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
    ].join('\n'),
  ];

  // 7. Memory snapshot (if provided)
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

  return sections.join('\n\n');
}
