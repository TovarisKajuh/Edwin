import { describe, it, expect } from 'vitest';
import { detectIntent } from '../intent-detector';

describe('Intent Detector', () => {
  // ── Needs Solution ────────────────────────────────────────────

  it('should detect hunger as needs_solution', () => {
    expect(detectIntent("I'm hungry")).toMatchObject({ category: 'needs_solution' });
    expect(detectIntent("I'm starving")).toMatchObject({ category: 'needs_solution' });
    expect(detectIntent("so hungry right now")).toMatchObject({ category: 'needs_solution' });
  });

  it('should detect practical problems as needs_solution', () => {
    expect(detectIntent("my car won't start")).toMatchObject({ category: 'needs_solution' });
    expect(detectIntent("the wifi isn't working")).toMatchObject({ category: 'needs_solution' });
    expect(detectIntent("laptop is dead")).toMatchObject({ category: 'needs_solution' });
  });

  it('should detect food questions as needs_solution', () => {
    expect(detectIntent("what should I eat?")).toMatchObject({ category: 'needs_solution' });
    expect(detectIntent("what should I have for dinner")).toMatchObject({ category: 'needs_solution' });
  });

  // ── Needs Activity ────────────────────────────────────────────

  it('should detect boredom as needs_activity', () => {
    expect(detectIntent("I'm bored")).toMatchObject({ category: 'needs_activity' });
    expect(detectIntent("nothing to do today")).toMatchObject({ category: 'needs_activity' });
    expect(detectIntent("what should I do?")).toMatchObject({ category: 'needs_activity' });
  });

  it('should detect free time as needs_activity', () => {
    expect(detectIntent("I have a free afternoon")).toMatchObject({ category: 'needs_activity' });
    expect(detectIntent("got some time before dinner")).toMatchObject({ category: 'needs_activity' });
  });

  it('should detect nice weather as needs_activity', () => {
    expect(detectIntent("it's so nice outside")).toMatchObject({ category: 'needs_activity' });
    expect(detectIntent("beautiful day today")).toMatchObject({ category: 'needs_activity' });
  });

  // ── Needs Help ────────────────────────────────────────────────

  it('should detect struggle as needs_help', () => {
    expect(detectIntent("this contract is killing me")).toMatchObject({ category: 'needs_help' });
    expect(detectIntent("I can't figure out the invoice")).toMatchObject({ category: 'needs_help' });
    expect(detectIntent("struggling with the supplier")).toMatchObject({ category: 'needs_help' });
  });

  it('should detect questions as needs_help', () => {
    expect(detectIntent("how do I negotiate this?")).toMatchObject({ category: 'needs_help' });
    expect(detectIntent("what's the best way to approach them?")).toMatchObject({ category: 'needs_help' });
  });

  it('should detect overwhelm as needs_help', () => {
    expect(detectIntent("this is too complicated")).toMatchObject({ category: 'needs_help' });
    expect(detectIntent("I have no idea how to do this")).toMatchObject({ category: 'needs_help' });
  });

  // ── Needs Comfort ─────────────────────────────────────────────

  it('should detect bad day as needs_comfort', () => {
    expect(detectIntent("rough day")).toMatchObject({ category: 'needs_comfort' });
    expect(detectIntent("terrible day at work")).toMatchObject({ category: 'needs_comfort' });
    expect(detectIntent("worst day this week")).toMatchObject({ category: 'needs_comfort' });
  });

  it('should detect loneliness as needs_comfort', () => {
    expect(detectIntent("I'm missing home")).toMatchObject({ category: 'needs_comfort' });
    expect(detectIntent("feeling lonely")).toMatchObject({ category: 'needs_comfort' });
  });

  it('should detect anxiety as needs_comfort', () => {
    expect(detectIntent("I'm worried about the meeting")).toMatchObject({ category: 'needs_comfort' });
    expect(detectIntent("nervous about tomorrow")).toMatchObject({ category: 'needs_comfort' });
  });

  // ── Needs Rest ────────────────────────────────────────────────

  it('should detect exhaustion as needs_rest', () => {
    expect(detectIntent("I'm exhausted")).toMatchObject({ category: 'needs_rest' });
    expect(detectIntent("I'm wiped out")).toMatchObject({ category: 'needs_rest' });
    expect(detectIntent("so drained")).toMatchObject({ category: 'needs_rest' });
  });

  it('should detect mental fatigue as needs_rest', () => {
    expect(detectIntent("my brain is fried")).toMatchObject({ category: 'needs_rest' });
    expect(detectIntent("I'm mentally done for today")).toMatchObject({ category: 'needs_rest' });
  });

  // ── No Implicit Request ───────────────────────────────────────

  it('should return null for normal conversation', () => {
    expect(detectIntent("I have a meeting at 3pm")).toBeNull();
    expect(detectIntent("The supplier called today")).toBeNull();
    expect(detectIntent("I went to the gym this morning")).toBeNull();
    expect(detectIntent("Good morning")).toBeNull();
  });

  // ── Hint Quality ──────────────────────────────────────────────

  it('should provide actionable hints', () => {
    const intent = detectIntent("I'm starving");
    expect(intent).toBeDefined();
    expect(intent!.hint).toContain('meal');
    expect(intent!.hint).toContain('suggest');
  });

  it('should provide empathy-first hints for comfort', () => {
    const intent = detectIntent("rough day");
    expect(intent).toBeDefined();
    expect(intent!.hint).toContain('empathize');
  });
});
