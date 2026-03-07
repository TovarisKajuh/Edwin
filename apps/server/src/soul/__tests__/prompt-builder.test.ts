import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../prompt-builder.js';

describe('buildSystemPrompt', () => {
  it('should always include Edwin, sir, and Jan', () => {
    const prompt = buildSystemPrompt({
      timeOfDay: 'morning',
      dayType: 'weekday',
      recentContext: '',
      memorySnapshot: '',
    });

    expect(prompt).toContain('Edwin');
    expect(prompt).toContain('sir');
    expect(prompt).toContain('Jan');
  });

  it('should contain gentle and not push hard on sunday', () => {
    const prompt = buildSystemPrompt({
      timeOfDay: 'morning',
      dayType: 'sunday',
      recentContext: '',
      memorySnapshot: '',
    });

    expect(prompt.toLowerCase()).toContain('gentle');
    expect(prompt.toLowerCase()).not.toContain('push hard');
  });

  it('should contain motivating language for early_morning weekday', () => {
    const prompt = buildSystemPrompt({
      timeOfDay: 'early_morning',
      dayType: 'weekday',
      recentContext: '',
      memorySnapshot: '',
    });

    expect(prompt.toLowerCase()).toMatch(/motivat/);
  });

  it('should include memory context when provided', () => {
    const memoryContent = 'Jan went to the gym yesterday and completed a solar installation.';
    const prompt = buildSystemPrompt({
      timeOfDay: 'afternoon',
      dayType: 'weekday',
      recentContext: '',
      memorySnapshot: memoryContent,
    });

    expect(prompt).toContain(memoryContent);
    expect(prompt).toContain('[MEMORY]');
  });

  it('should include recent context when provided', () => {
    const recentContent = 'Jan just finished a client meeting.';
    const prompt = buildSystemPrompt({
      timeOfDay: 'afternoon',
      dayType: 'weekday',
      recentContext: recentContent,
      memorySnapshot: '',
    });

    expect(prompt).toContain(recentContent);
    expect(prompt).toContain('[RECENT CONTEXT]');
  });

  it('should not include memory section when snapshot is empty', () => {
    const prompt = buildSystemPrompt({
      timeOfDay: 'morning',
      dayType: 'weekday',
      recentContext: '',
      memorySnapshot: '',
    });

    expect(prompt).not.toContain('[MEMORY]');
  });

  it('should not include recent context section when context is empty', () => {
    const prompt = buildSystemPrompt({
      timeOfDay: 'morning',
      dayType: 'weekday',
      recentContext: '',
      memorySnapshot: '',
    });

    expect(prompt).not.toContain('[RECENT CONTEXT]');
  });
});
