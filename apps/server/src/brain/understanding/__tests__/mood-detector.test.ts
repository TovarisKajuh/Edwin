import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Database } from '../../../db/database';
import { MemoryStore } from '../../../memory/store';
import { detectMood, detectAndStoreMood } from '../mood-detector';

describe('Mood Detector', () => {
  // ── Pure Detection ────────────────────────────────────────────

  describe('detectMood', () => {
    it('should detect explicit tiredness', () => {
      expect(detectMood("I'm exhausted")).toMatchObject({ mood: 'tired', confidence: 0.9 });
      expect(detectMood("feeling tired today")).toMatchObject({ mood: 'tired' });
      expect(detectMood("couldn't sleep last night")).toMatchObject({ mood: 'tired' });
    });

    it('should detect explicit stress', () => {
      expect(detectMood("I'm stressed about the contract")).toMatchObject({ mood: 'stressed' });
      expect(detectMood("feeling anxious about tomorrow")).toMatchObject({ mood: 'stressed' });
    });

    it('should detect explicit excitement/energy', () => {
      expect(detectMood("I'm feeling amazing today")).toMatchObject({ mood: 'energized' });
      expect(detectMood("feeling fantastic!")).toMatchObject({ mood: 'energized' });
      expect(detectMood("I'm pumped")).toMatchObject({ mood: 'excited' });
    });

    it('should detect frustration from swear words', () => {
      expect(detectMood("ugh, not this again")).toMatchObject({ mood: 'frustrated' });
      expect(detectMood("ffs another meeting")).toMatchObject({ mood: 'frustrated' });
    });

    it('should detect energy from "let\'s go"', () => {
      expect(detectMood("let's go!")).toMatchObject({ mood: 'energized' });
      expect(detectMood("bring it on")).toMatchObject({ mood: 'energized' });
    });

    it('should detect low mood from disengagement', () => {
      expect(detectMood("whatever")).toMatchObject({ mood: 'low' });
      expect(detectMood("don't care")).toMatchObject({ mood: 'low' });
    });

    it('should detect overwhelm', () => {
      expect(detectMood("there's too much to do")).toMatchObject({ mood: 'overwhelmed' });
      expect(detectMood("I feel overwhelmed")).toMatchObject({ mood: 'overwhelmed' });
    });

    it('should detect positive emojis', () => {
      expect(detectMood("sounds good 🔥")).toMatchObject({ mood: 'energized' });
      expect(detectMood("nice one 💪")).toMatchObject({ mood: 'energized' });
    });

    it('should detect negative emojis', () => {
      expect(detectMood("great 😤")).toMatchObject({ mood: 'frustrated' });
      expect(detectMood("okay 😞")).toMatchObject({ mood: 'frustrated' });
    });

    it('should detect tired emojis', () => {
      expect(detectMood("morning 😴")).toMatchObject({ mood: 'tired' });
      expect(detectMood("🥱")).toMatchObject({ mood: 'tired' });
    });

    it('should detect low engagement from very short replies', () => {
      expect(detectMood("ok")).toMatchObject({ mood: 'low' });
      expect(detectMood("fine")).toMatchObject({ mood: 'low' });
      expect(detectMood("k")).toMatchObject({ mood: 'low' });
    });

    it('should NOT flag short replies with exclamation as low', () => {
      expect(detectMood("yes!")).not.toMatchObject({ mood: 'low' });
    });

    it('should detect enthusiasm from ALL CAPS with exclamation', () => {
      expect(detectMood("YES LET'S GO!!!")).toMatchObject({ mood: 'energized' });
    });

    it('should detect frustration from ALL CAPS without positive words', () => {
      const result = detectMood("WHAT THE HELL!!");
      expect(result?.mood).toBe('frustrated');
    });

    it('should return null for neutral messages', () => {
      expect(detectMood("I have a meeting at 3pm")).toBeNull();
      expect(detectMood("The supplier called")).toBeNull();
      expect(detectMood("Can you remind me about the invoice?")).toBeNull();
    });

    it('should return null for moderately long neutral messages', () => {
      expect(detectMood("I need to check the solar panel specs and get back to them")).toBeNull();
    });
  });

  // ── Store Integration ─────────────────────────────────────────

  describe('detectAndStoreMood', () => {
    let db: Database;
    let store: MemoryStore;

    beforeEach(() => {
      db = new Database(':memory:');
      store = new MemoryStore(db);
    });

    afterEach(() => {
      db.close();
    });

    it('should store high-confidence mood as emotional_state observation', () => {
      const signal = detectAndStoreMood(store, "I'm feeling exhausted");
      expect(signal).toBeDefined();
      expect(signal!.mood).toBe('tired');

      const obs = store.getObservationsByCategory('emotional_state');
      expect(obs).toHaveLength(1);
      expect(obs[0].content).toContain('tired');
      expect(obs[0].source).toBe('inferred');
    });

    it('should not store low-confidence mood signals', () => {
      const signal = detectAndStoreMood(store, "ok");
      expect(signal).toBeDefined();
      expect(signal!.confidence).toBeLessThan(0.6);

      const obs = store.getObservationsByCategory('emotional_state');
      expect(obs).toHaveLength(0);
    });

    it('should deduplicate — not store same mood twice', () => {
      detectAndStoreMood(store, "I'm stressed about work");
      detectAndStoreMood(store, "feeling stressed today");

      const obs = store.getObservationsByCategory('emotional_state');
      // Both map to "Jan seems stressed" — dedup should catch it
      expect(obs).toHaveLength(1);
    });

    it('should return null for neutral messages', () => {
      const signal = detectAndStoreMood(store, "I have a meeting tomorrow");
      expect(signal).toBeNull();

      const obs = store.getObservationsByCategory('emotional_state');
      expect(obs).toHaveLength(0);
    });

    it('should store different moods separately', () => {
      detectAndStoreMood(store, "I'm exhausted");
      detectAndStoreMood(store, "ugh this is frustrating");

      const obs = store.getObservationsByCategory('emotional_state');
      expect(obs).toHaveLength(2);
    });
  });
});
