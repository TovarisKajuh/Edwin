import type { FastifyInstance } from 'fastify';
import { MemoryStore } from '../memory/store.js';

/**
 * Profile routes — deep profiling interview data ingestion.
 *
 * POST /api/profile/seed — Bulk import identity + observations from
 * a structured deep profile interview. All entries are stored as
 * source='told' with confidence=1.0.
 *
 * GET /api/profile — Return current identity + recent observations.
 */

interface SeedEntry {
  type: 'identity' | 'observation';
  category: string;
  key?: string;       // Required for identity
  value?: string;     // Required for identity
  content?: string;   // Required for observation
  confidence?: number;
}

interface SeedBody {
  entries: SeedEntry[];
}

export async function profileRoutes(server: FastifyInstance, store: MemoryStore) {
  // ── GET /api/profile — Current profile snapshot ─────────────────
  server.get('/api/profile', async () => {
    const identity = store.getAllIdentity();
    const patterns = store.getObservationsByCategory('pattern', 20);
    const preferences = store.getObservationsByCategory('preference', 20);
    const facts = store.getObservationsByCategory('fact', 20);

    return {
      identity: identity.map((i) => ({
        category: i.category,
        key: i.key,
        value: i.value,
        source: i.source,
      })),
      patterns: patterns.map((o) => o.content),
      preferences: preferences.map((o) => o.content),
      facts: facts.map((o) => o.content),
    };
  });

  // ── POST /api/profile/seed — Bulk import from deep interview ────
  server.post<{ Body: SeedBody }>('/api/profile/seed', async (request) => {
    const { entries } = request.body;

    if (!entries || !Array.isArray(entries)) {
      return { error: 'entries array required', stored: 0 };
    }

    let identityCount = 0;
    let observationCount = 0;
    let skipped = 0;

    for (const entry of entries) {
      if (entry.type === 'identity') {
        if (!entry.category || !entry.key || !entry.value) {
          skipped++;
          continue;
        }
        store.setIdentity(entry.category, entry.key, entry.value, 'told', entry.confidence ?? 1.0);
        identityCount++;
      } else if (entry.type === 'observation') {
        if (!entry.category || !entry.content) {
          skipped++;
          continue;
        }
        // Dedup
        if (store.hasRecentObservation(entry.category, entry.content)) {
          skipped++;
          continue;
        }
        store.addObservation(entry.category, entry.content, entry.confidence ?? 1.0, 'told');
        observationCount++;
      } else {
        skipped++;
      }
    }

    console.log(`[profile-seed] Identity: ${identityCount}, Observations: ${observationCount}, Skipped: ${skipped}`);

    return {
      stored: identityCount + observationCount,
      identity: identityCount,
      observations: observationCount,
      skipped,
    };
  });
}
