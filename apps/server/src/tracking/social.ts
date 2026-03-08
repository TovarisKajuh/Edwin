/**
 * People & Social Tracking — Session 34.
 *
 * Edwin tracks Jan's social life:
 *   - Known people with relationship type and contact frequency goals
 *   - Automatic last_contact updates from conversation mentions
 *   - Contact gap detection and proactive suggestions
 *   - Social health awareness in system prompt
 */

import { MemoryStore } from '../memory/store.js';

// ── Types ────────────────────────────────────────────────────────

export type RelationshipType = 'friend' | 'family' | 'colleague' | 'business' | 'partner' | 'acquaintance';

export interface PersonRecord {
  id: number;
  name: string;
  relationship: RelationshipType | null;
  lastContact: string | null;
  contactFrequencyGoal: string | null; // 'weekly', 'biweekly', 'monthly', 'quarterly'
  notes: string | null;
  phone: string | null;
  daysSinceContact: number | null;
  isOverdue: boolean;
}

// ── Constants ────────────────────────────────────────────────────

const FREQUENCY_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  quarterly: 90,
};

// ── People Management ────────────────────────────────────────────

/**
 * Add a person to Jan's circle.
 */
export function addPerson(
  store: MemoryStore,
  name: string,
  relationship?: RelationshipType,
  options?: { contactFrequencyGoal?: string; phone?: string; notes?: string },
): number {
  const db = store.raw();
  const result = db.prepare(`
    INSERT INTO people (name, relationship, contact_frequency_goal, phone, notes)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    name,
    relationship || null,
    options?.contactFrequencyGoal || null,
    options?.phone || null,
    options?.notes || null,
  );
  return Number(result.lastInsertRowid);
}

/**
 * Update a person's details.
 */
export function updatePerson(
  store: MemoryStore,
  personId: number,
  updates: { relationship?: string; contactFrequencyGoal?: string; phone?: string; notes?: string },
): void {
  const db = store.raw();
  const sets: string[] = [];
  const values: (string | null)[] = [];

  if (updates.relationship !== undefined) { sets.push('relationship = ?'); values.push(updates.relationship); }
  if (updates.contactFrequencyGoal !== undefined) { sets.push('contact_frequency_goal = ?'); values.push(updates.contactFrequencyGoal); }
  if (updates.phone !== undefined) { sets.push('phone = ?'); values.push(updates.phone); }
  if (updates.notes !== undefined) { sets.push('notes = ?'); values.push(updates.notes); }

  if (sets.length === 0) return;

  sets.push('updated_at = CURRENT_TIMESTAMP');
  values.push(String(personId));

  db.prepare(`UPDATE people SET ${sets.join(', ')} WHERE id = ?`).run(...values);
}

/**
 * Record contact with a person (updates last_contact).
 */
export function recordContact(store: MemoryStore, personId: number, date?: string): void {
  const db = store.raw();
  const contactDate = date || new Date().toISOString().slice(0, 10);
  db.prepare(`
    UPDATE people SET last_contact = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(contactDate, personId);
}

/**
 * Find a person by name (case-insensitive partial match).
 */
export function findPerson(store: MemoryStore, name: string): PersonRecord | null {
  const db = store.raw();
  const row = db.prepare(`
    SELECT * FROM people WHERE LOWER(name) LIKE LOWER(?) LIMIT 1
  `).get(`%${name}%`) as PersonRow | undefined;

  if (!row) return null;
  return toPersonRecord(row);
}

/**
 * Get all known people.
 */
export function getAllPeople(store: MemoryStore): PersonRecord[] {
  const db = store.raw();
  const rows = db.prepare('SELECT * FROM people ORDER BY name ASC').all() as PersonRow[];
  return rows.map(toPersonRecord);
}

/**
 * Get people who are overdue for contact.
 */
export function getOverduePeople(store: MemoryStore): PersonRecord[] {
  return getAllPeople(store).filter((p) => p.isOverdue);
}

/**
 * Get people sorted by how long since last contact.
 */
export function getPeopleByContactGap(store: MemoryStore): PersonRecord[] {
  const people = getAllPeople(store).filter((p) => p.daysSinceContact !== null);
  return people.sort((a, b) => (b.daysSinceContact || 0) - (a.daysSinceContact || 0));
}

// ── Contact Detection ────────────────────────────────────────────

/**
 * Detect mentions of known people in a message and update last_contact.
 * Returns names that were detected and updated.
 */
export function detectAndUpdateContacts(
  store: MemoryStore,
  message: string,
  date?: string,
): string[] {
  const people = getAllPeople(store);
  const lowerMsg = message.toLowerCase();
  const updated: string[] = [];

  // Social context keywords — only update if the message implies actual contact
  const contactKeywords = [
    'met', 'saw', 'had lunch', 'had dinner', 'had coffee', 'drinks with',
    'called', 'spoke to', 'spoke with', 'talked to', 'talked with',
    'hung out', 'visited', 'went out', 'catch up', 'caught up',
    'meeting with', 'dinner with', 'lunch with', 'coffee with',
    'texted', 'messaged', 'rang', 'phoned',
  ];

  const hasContactContext = contactKeywords.some((k) => lowerMsg.includes(k));
  if (!hasContactContext) return updated;

  for (const person of people) {
    if (lowerMsg.includes(person.name.toLowerCase())) {
      recordContact(store, person.id, date);
      updated.push(person.name);
    }
  }

  return updated;
}

// ── Formatting ───────────────────────────────────────────────────

/**
 * Format people list for Claude.
 */
export function formatPeopleForClaude(people: PersonRecord[]): string {
  if (people.length === 0) {
    return 'No people tracked yet.';
  }

  const lines = ['Known contacts:'];
  for (const p of people) {
    const relStr = p.relationship ? ` (${p.relationship})` : '';
    const lastStr = p.daysSinceContact !== null ? ` — last contact: ${p.daysSinceContact} day(s) ago` : ' — never contacted';
    const overdueStr = p.isOverdue ? ' ⚠ OVERDUE' : '';
    lines.push(`- ${p.name}${relStr}${lastStr}${overdueStr}`);
  }

  return lines.join('\n');
}

/**
 * Format social awareness for the system prompt.
 */
export function formatSocialContext(store: MemoryStore): string | null {
  const people = getAllPeople(store);
  if (people.length === 0) return null;

  const overdue = people.filter((p) => p.isOverdue);
  const noContact = people.filter((p) => p.lastContact === null);

  if (overdue.length === 0 && noContact.length === 0) return null;

  const lines = ['[SOCIAL AWARENESS]'];

  if (overdue.length > 0) {
    lines.push('Overdue contacts:');
    for (const p of overdue) {
      lines.push(`  - ${p.name} (${p.relationship || 'contact'}): ${p.daysSinceContact} days since last contact, goal: ${p.contactFrequencyGoal}`);
    }
  }

  if (noContact.length > 0) {
    const names = noContact.map((p) => p.name).join(', ');
    lines.push(`Never contacted: ${names}`);
  }

  return lines.join('\n');
}

/**
 * Check for social gaps (called by heartbeat).
 * Returns the number of overdue contacts found.
 */
export function checkSocialGaps(store: MemoryStore): number {
  return getOverduePeople(store).length;
}

// ── Internal Helpers ─────────────────────────────────────────────

interface PersonRow {
  id: number;
  name: string;
  relationship: string | null;
  last_contact: string | null;
  contact_frequency_goal: string | null;
  notes: string | null;
  phone: string | null;
}

function toPersonRecord(row: PersonRow): PersonRecord {
  const daysSinceContact = row.last_contact
    ? Math.floor((Date.now() - new Date(row.last_contact).getTime()) / 86400000)
    : null;

  const isOverdue = (() => {
    if (!row.contact_frequency_goal || daysSinceContact === null) return false;
    const maxDays = FREQUENCY_DAYS[row.contact_frequency_goal] || 30;
    return daysSinceContact > maxDays;
  })();

  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship as RelationshipType | null,
    lastContact: row.last_contact,
    contactFrequencyGoal: row.contact_frequency_goal,
    notes: row.notes,
    phone: row.phone,
    daysSinceContact,
    isOverdue,
  };
}
