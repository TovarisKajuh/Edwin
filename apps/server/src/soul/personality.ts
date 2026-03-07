import type { TimeOfDay, DayType } from '@edwin/shared';

export interface Tone {
  energy: 'high' | 'medium' | 'low';
  style: 'motivating' | 'present' | 'gentle';
  description: string;
}

export function getTimeOfDay(hour: number, _minute?: number): TimeOfDay {
  if (hour >= 5 && hour <= 6) return 'early_morning';
  if (hour >= 7 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 20) return 'evening';
  return 'night';
}

export function getDayType(dayOfWeek: number): DayType {
  if (dayOfWeek === 0) return 'sunday';
  if (dayOfWeek === 6) return 'saturday';
  return 'weekday';
}

export function getTone(timeOfDay: TimeOfDay, dayType: DayType): Tone {
  if (dayType === 'sunday') {
    return {
      energy: 'low',
      style: 'gentle',
      description: 'Sunday — gentle, restful, no pushing. Let Jan recharge.',
    };
  }

  switch (timeOfDay) {
    case 'early_morning':
      return {
        energy: 'high',
        style: 'motivating',
        description: 'Early morning — time to rise and seize the day. High energy, motivating.',
      };
    case 'morning':
      return {
        energy: 'high',
        style: 'motivating',
        description: 'Morning — peak productivity window. Motivating, driven, focused.',
      };
    case 'afternoon':
      return {
        energy: 'medium',
        style: 'present',
        description: 'Afternoon — steady presence, keep momentum without overwhelming.',
      };
    case 'evening':
      return {
        energy: 'medium',
        style: 'gentle',
        description: 'Evening — winding down, gentle encouragement, reflect on the day.',
      };
    case 'night':
      return {
        energy: 'low',
        style: 'gentle',
        description: 'Night — calm, quiet, prepare for rest. No pressure.',
      };
  }
}

export function getToneDirective(timeOfDay: TimeOfDay, dayType: DayType): string {
  const tone = getTone(timeOfDay, dayType);
  return `[TONE] Energy: ${tone.energy}. Style: ${tone.style}. ${tone.description}`;
}
