export interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  style: string;
  elevenLabsVoiceId: string;
}

export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: 'butler',
    name: 'The Butler',
    description: 'Calm, dignified, British. The quintessential Alfred.',
    style: 'Measured pace, warm baritone, understated authority.',
    elevenLabsVoiceId: '',
  },
];

export function getActiveVoice(): VoiceProfile {
  return VOICE_PROFILES[0];
}
