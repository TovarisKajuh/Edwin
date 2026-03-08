import { describe, it, expect, beforeEach } from 'vitest';
import { Database } from '../../db/database';
import { MemoryStore } from '../../memory/store';
import {
  addPerson,
  updatePerson,
  recordContact,
  findPerson,
  getAllPeople,
  getOverduePeople,
  getPeopleByContactGap,
  detectAndUpdateContacts,
  formatPeopleForClaude,
  formatSocialContext,
  checkSocialGaps,
} from '../social';

let store: MemoryStore;

beforeEach(() => {
  const db = new Database(':memory:');
  store = new MemoryStore(db);
});

describe('People & Social Tracking', () => {
  // ── People Management ────────────────────────────────────────

  describe('addPerson', () => {
    it('should add a person', () => {
      const id = addPerson(store, 'Markus', 'friend');
      expect(id).toBeGreaterThan(0);

      const people = getAllPeople(store);
      expect(people).toHaveLength(1);
      expect(people[0].name).toBe('Markus');
      expect(people[0].relationship).toBe('friend');
    });

    it('should add a person with all details', () => {
      addPerson(store, 'Lisa', 'colleague', {
        contactFrequencyGoal: 'monthly',
        phone: '+43 664 1234567',
        notes: 'Works in marketing',
      });

      const people = getAllPeople(store);
      expect(people[0].contactFrequencyGoal).toBe('monthly');
      expect(people[0].phone).toBe('+43 664 1234567');
      expect(people[0].notes).toBe('Works in marketing');
    });

    it('should add a person without relationship', () => {
      addPerson(store, 'Unknown Guy');

      const people = getAllPeople(store);
      expect(people[0].relationship).toBeNull();
    });
  });

  describe('updatePerson', () => {
    it('should update a person\'s details', () => {
      const id = addPerson(store, 'Markus', 'acquaintance');
      updatePerson(store, id, { relationship: 'friend', contactFrequencyGoal: 'weekly' });

      const person = findPerson(store, 'Markus');
      expect(person!.relationship).toBe('friend');
      expect(person!.contactFrequencyGoal).toBe('weekly');
    });
  });

  describe('recordContact', () => {
    it('should update last_contact date', () => {
      const id = addPerson(store, 'Markus', 'friend');
      recordContact(store, id, '2026-03-09');

      const person = findPerson(store, 'Markus');
      expect(person!.lastContact).toBe('2026-03-09');
    });
  });

  describe('findPerson', () => {
    it('should find by partial name', () => {
      addPerson(store, 'Markus Weber', 'friend');

      const person = findPerson(store, 'markus');
      expect(person).not.toBeNull();
      expect(person!.name).toBe('Markus Weber');
    });

    it('should return null for unknown name', () => {
      const person = findPerson(store, 'nobody');
      expect(person).toBeNull();
    });
  });

  // ── Contact Gap Detection ────────────────────────────────────

  describe('getOverduePeople', () => {
    it('should detect overdue contacts', () => {
      const id = addPerson(store, 'Markus', 'friend', { contactFrequencyGoal: 'weekly' });
      // Last contact 10 days ago (overdue for weekly)
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
      recordContact(store, id, tenDaysAgo);

      const overdue = getOverduePeople(store);
      expect(overdue).toHaveLength(1);
      expect(overdue[0].name).toBe('Markus');
      expect(overdue[0].isOverdue).toBe(true);
    });

    it('should not flag recent contacts', () => {
      const id = addPerson(store, 'Lisa', 'friend', { contactFrequencyGoal: 'weekly' });
      recordContact(store, id, new Date().toISOString().slice(0, 10));

      const overdue = getOverduePeople(store);
      expect(overdue).toHaveLength(0);
    });

    it('should not flag people without contact goals', () => {
      addPerson(store, 'Random Guy');

      const overdue = getOverduePeople(store);
      expect(overdue).toHaveLength(0);
    });
  });

  describe('getPeopleByContactGap', () => {
    it('should sort by longest gap first', () => {
      const id1 = addPerson(store, 'Old Friend', 'friend');
      const id2 = addPerson(store, 'Recent Friend', 'friend');

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);

      recordContact(store, id1, thirtyDaysAgo);
      recordContact(store, id2, twoDaysAgo);

      const sorted = getPeopleByContactGap(store);
      expect(sorted[0].name).toBe('Old Friend');
      expect(sorted[1].name).toBe('Recent Friend');
    });
  });

  // ── Contact Detection ────────────────────────────────────────

  describe('detectAndUpdateContacts', () => {
    it('should detect and update contact from conversation', () => {
      addPerson(store, 'Markus', 'friend');

      const updated = detectAndUpdateContacts(store, 'Had lunch with Markus today, great catch up', '2026-03-09');

      expect(updated).toEqual(['Markus']);

      const person = findPerson(store, 'Markus');
      expect(person!.lastContact).toBe('2026-03-09');
    });

    it('should detect multiple people', () => {
      addPerson(store, 'Markus', 'friend');
      addPerson(store, 'Lisa', 'colleague');

      const updated = detectAndUpdateContacts(store, 'Had dinner with Markus and Lisa last night', '2026-03-09');

      expect(updated).toHaveLength(2);
      expect(updated).toContain('Markus');
      expect(updated).toContain('Lisa');
    });

    it('should not update if no social context', () => {
      addPerson(store, 'Markus', 'friend');

      // Just mentioning a name without contact context should not update
      const updated = detectAndUpdateContacts(store, 'I need to ask Markus about the project');

      expect(updated).toHaveLength(0);
    });

    it('should handle case-insensitive matching', () => {
      addPerson(store, 'Markus', 'friend');

      const updated = detectAndUpdateContacts(store, 'called markus yesterday', '2026-03-09');
      expect(updated).toEqual(['Markus']);
    });

    it('should return empty for unknown names', () => {
      addPerson(store, 'Markus', 'friend');

      const updated = detectAndUpdateContacts(store, 'Had coffee with Stefan');
      expect(updated).toHaveLength(0);
    });
  });

  // ── Formatting ───────────────────────────────────────────────

  describe('formatPeopleForClaude', () => {
    it('should format empty list', () => {
      const result = formatPeopleForClaude([]);
      expect(result).toContain('No people tracked');
    });

    it('should format people with details', () => {
      const id = addPerson(store, 'Markus', 'friend', { contactFrequencyGoal: 'weekly' });
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
      recordContact(store, id, twoDaysAgo);

      const people = getAllPeople(store);
      const result = formatPeopleForClaude(people);

      expect(result).toContain('Markus');
      expect(result).toContain('friend');
      expect(result).toContain('day(s) ago');
    });

    it('should flag overdue contacts', () => {
      const id = addPerson(store, 'Markus', 'friend', { contactFrequencyGoal: 'weekly' });
      const twentyDaysAgo = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10);
      recordContact(store, id, twentyDaysAgo);

      const people = getAllPeople(store);
      const result = formatPeopleForClaude(people);

      expect(result).toContain('OVERDUE');
    });
  });

  describe('formatSocialContext', () => {
    it('should return null when no people', () => {
      const result = formatSocialContext(store);
      expect(result).toBeNull();
    });

    it('should return null when no overdue contacts', () => {
      const id = addPerson(store, 'Markus', 'friend', { contactFrequencyGoal: 'weekly' });
      recordContact(store, id, new Date().toISOString().slice(0, 10));

      const result = formatSocialContext(store);
      expect(result).toBeNull();
    });

    it('should include overdue contacts', () => {
      const id = addPerson(store, 'Markus', 'friend', { contactFrequencyGoal: 'weekly' });
      const twentyDaysAgo = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10);
      recordContact(store, id, twentyDaysAgo);

      const result = formatSocialContext(store);

      expect(result).toContain('SOCIAL AWARENESS');
      expect(result).toContain('Markus');
      expect(result).toContain('Overdue');
    });

    it('should include never-contacted people', () => {
      addPerson(store, 'New Guy', 'acquaintance');

      const result = formatSocialContext(store);

      expect(result).toContain('Never contacted');
      expect(result).toContain('New Guy');
    });
  });

  // ── Social Gaps ──────────────────────────────────────────────

  describe('checkSocialGaps', () => {
    it('should count overdue contacts', () => {
      const id1 = addPerson(store, 'Friend1', 'friend', { contactFrequencyGoal: 'weekly' });
      const id2 = addPerson(store, 'Friend2', 'friend', { contactFrequencyGoal: 'weekly' });

      const twentyDaysAgo = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10);
      recordContact(store, id1, twentyDaysAgo);
      recordContact(store, id2, twentyDaysAgo);

      expect(checkSocialGaps(store)).toBe(2);
    });
  });

  // ── Realistic Scenarios ──────────────────────────────────────

  describe('realistic scenarios', () => {
    it('Edwin tracks Jan\'s social circle', () => {
      addPerson(store, 'Markus', 'friend', { contactFrequencyGoal: 'weekly' });
      addPerson(store, 'Lisa', 'colleague', { contactFrequencyGoal: 'monthly' });
      addPerson(store, 'Thomas', 'friend', { contactFrequencyGoal: 'biweekly' });
      addPerson(store, 'Mama', 'family', { contactFrequencyGoal: 'weekly', phone: '+43 664 555 0000' });

      // Jan sees Markus recently
      detectAndUpdateContacts(store, 'Had beers with Markus last night');

      // Jan hasn't seen Thomas in a while
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      recordContact(store, 3, thirtyDaysAgo); // Thomas

      const overdue = getOverduePeople(store);
      expect(overdue.some((p) => p.name === 'Thomas')).toBe(true);
      expect(overdue.some((p) => p.name === 'Markus')).toBe(false);
    });

    it('Jan asks "who haven\'t I seen in a while?"', () => {
      const id1 = addPerson(store, 'Markus', 'friend');
      const id2 = addPerson(store, 'Lisa', 'colleague');
      const id3 = addPerson(store, 'Thomas', 'friend');

      recordContact(store, id1, new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10));
      recordContact(store, id2, new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10));
      recordContact(store, id3, new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10));

      const sorted = getPeopleByContactGap(store);

      expect(sorted[0].name).toBe('Thomas'); // Longest gap
      expect(sorted[1].name).toBe('Lisa');
      expect(sorted[2].name).toBe('Markus'); // Most recent
    });
  });
});
