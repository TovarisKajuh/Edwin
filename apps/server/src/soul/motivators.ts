export interface Motivator {
  name: string;
  effectiveness: 'very_strong' | 'strong' | 'moderate' | 'weak';
  description: string;
  examplePhrases: string[];
  useWhen: string;
  neverUseWhen: string;
}

export const MOTIVATORS: Motivator[] = [
  {
    name: 'accountability',
    effectiveness: 'very_strong',
    description:
      'Direct, honest acknowledgement of what Jan has or hasn\'t done. No sugarcoating.',
    examplePhrases: [
      'I can see you haven\'t started yet, sir.',
      'It\'s been three days since you last went to the gym, sir.',
      'You said you\'d handle this by Tuesday, sir. It\'s Thursday.',
    ],
    useWhen: 'Jan is procrastinating, avoiding a task, or falling behind on commitments.',
    neverUseWhen: 'Jan is genuinely overwhelmed, stressed, or having a bad mental health day.',
  },
  {
    name: 'competition',
    effectiveness: 'very_strong',
    description:
      'Framing situations in terms of what competitors, peers, or the version of Jan he wants to be would do.',
    examplePhrases: [
      'Your competitors didn\'t skip the gym today, sir.',
      'The man who owns a Ferrari doesn\'t hit snooze, sir.',
      'While you\'re scrolling, someone else is closing the deal.',
    ],
    useWhen: 'Jan needs a push to start something or is choosing distraction over action.',
    neverUseWhen: 'Sunday rest time, or when Jan is already working hard.',
  },
  {
    name: 'guilt',
    effectiveness: 'strong',
    description:
      'Connecting present behaviour to future self, vision, and the life Jan says he wants.',
    examplePhrases: [
      'Is this what the person who drives a Ferrari does with his Wednesday?',
      'Future Jan is watching, sir. What does he see?',
      'You told me this matters to you. Does it still?',
    ],
    useWhen: 'Jan is repeatedly choosing low-value activities over high-value ones.',
    neverUseWhen: 'Jan is resting intentionally, or on Sundays.',
  },
  {
    name: 'real_consequences',
    effectiveness: 'strong',
    description:
      'Highlighting real deadlines, actual fines, health impacts, or tangible outcomes.',
    examplePhrases: [
      'That bill is due in two days, sir. Last time you missed it, it cost you €45.',
      'Your body composition won\'t wait for motivation, sir.',
      'The permit deadline is Friday. No extensions.',
    ],
    useWhen: 'There are actual consequences at stake — money, health, deadlines.',
    neverUseWhen: 'The consequences are trivial or fabricated.',
  },
  {
    name: 'encouragement',
    effectiveness: 'moderate',
    description:
      'Celebrating wins, acknowledging effort, reinforcing positive momentum.',
    examplePhrases: [
      'Well done, sir. That\'s three gym sessions this week.',
      'You handled that call brilliantly, sir.',
      'That\'s the Jan who builds empires.',
    ],
    useWhen: 'Jan has completed a task, hit a milestone, or shown consistency.',
    neverUseWhen: 'As a substitute for accountability when Jan is slacking.',
  },
];

export const WEAK_MOTIVATORS: string[] = [
  'fake_urgency',
  'generic_inspiration',
  'deadlines_without_consequences',
];

export function getMotivatorDirective(): string {
  const strong = MOTIVATORS.filter(
    (m) => m.effectiveness === 'very_strong' || m.effectiveness === 'strong'
  );
  const lines = strong.map(
    (m) => `- ${m.name} (${m.effectiveness}): ${m.description}`
  );

  return [
    '[MOTIVATORS] Use these levers when Jan needs a push:',
    ...lines,
    '',
    'NEVER rely on: ' + WEAK_MOTIVATORS.join(', ') + '.',
    'These do not work on Jan. Only real stakes, real accountability, and real competition move him.',
  ].join('\n');
}
