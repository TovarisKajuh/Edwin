import { MemoryStore } from '../store.js';

/**
 * Seed Jan's profile into Edwin's memory.
 * Called once on first boot when identity table is empty.
 *
 * This covers everything known from the vision documents.
 * The deep profiling interview will add granular details
 * (food preferences, specific friends, health data, etc.)
 * via the /api/profile/seed endpoint.
 */
export function seedJanProfile(store: MemoryStore): void {
  // ── Identity: Goals ─────────────────────────────────────────────
  store.setIdentity('goals', 'net_worth_target', '€6M by 2031', 'told', 1.0);
  store.setIdentity('goals', 'company_revenue_target', '€15M annual by 2031', 'told', 1.0);
  store.setIdentity('goals', 'physical', 'Perfect physical shape, optimal health markers', 'told', 1.0);
  store.setIdentity('goals', 'property_maribor', 'House in Maribor', 'told', 1.0);
  store.setIdentity('goals', 'property_vienna', 'Apartment in Vienna', 'told', 1.0);
  store.setIdentity('goals', 'car', 'Ferrari SF90 XX Stradale', 'told', 1.0);
  store.setIdentity('goals', 'sailboat', 'Sailboat', 'told', 1.0);
  store.setIdentity('goals', 'family', 'Child with a kind, loyal partner', 'told', 1.0);
  store.setIdentity('goals', 'network', 'Strong EU network and political connections', 'told', 1.0);
  store.setIdentity('goals', 'edwin', 'Life fully administrated by Edwin', 'told', 1.0);
  store.setIdentity('goals', 'gym_target', '4+ gym sessions per week', 'told', 1.0);
  store.setIdentity('goals', 'social_target', 'See friends at least once a week', 'told', 1.0);
  store.setIdentity('goals', 'haircut_frequency', 'Every 3 weeks', 'told', 1.0);

  // ── Identity: Personal ──────────────────────────────────────────
  store.setIdentity('personal', 'name', 'Jan', 'told', 1.0);
  store.setIdentity('personal', 'email', 'e.jandrozg@gmail.com', 'told', 1.0);
  store.setIdentity('personal', 'location', 'Austria (Graz/Vienna area)', 'told', 1.0);
  store.setIdentity('personal', 'timezone', 'Europe/Vienna', 'told', 1.0);
  store.setIdentity('personal', 'wake_time', '05:30', 'told', 1.0);
  store.setIdentity('personal', 'lights_out', '20:00', 'told', 1.0);
  store.setIdentity('personal', 'asleep_by', '21:30', 'told', 1.0);

  // ── Identity: Business ──────────────────────────────────────────
  store.setIdentity('business', 'type', 'Solar company', 'told', 1.0);
  store.setIdentity('business', 'duration', '2-3 years', 'told', 1.0);
  store.setIdentity('business', 'role', 'Co-owner', 'told', 1.0);
  store.setIdentity('business', 'employees', '1', 'told', 1.0);
  store.setIdentity('business', 'model', 'Subcontracting', 'told', 1.0);

  // ── Identity: Personality ───────────────────────────────────────
  store.setIdentity('personality', 'core_struggle', 'Executive function — knows what to do, doesn\'t initiate', 'told', 1.0);
  store.setIdentity('personality', 'strong_motivator_1', 'Direct competition', 'told', 1.0);
  store.setIdentity('personality', 'strong_motivator_2', 'Status/ranking', 'told', 1.0);
  store.setIdentity('personality', 'strong_motivator_3', 'Accountability (knowing someone can see)', 'told', 1.0);
  store.setIdentity('personality', 'strong_motivator_4', 'Guilt (honest, not manipulative)', 'told', 1.0);
  store.setIdentity('personality', 'strong_motivator_5', 'Real consequences', 'told', 1.0);
  store.setIdentity('personality', 'weak_motivator_1', 'Fake urgency', 'told', 1.0);
  store.setIdentity('personality', 'weak_motivator_2', 'Deadlines without stakes', 'told', 1.0);
  store.setIdentity('personality', 'distraction', 'Quick dopamine (games) instead of doing things that actually make him happy', 'told', 1.0);

  // ── Identity: Bad Habits ────────────────────────────────────────
  store.setIdentity('habits', 'sleep', 'Inconsistent sleep', 'told', 1.0);
  store.setIdentity('habits', 'gym', 'Skips gym', 'told', 1.0);
  store.setIdentity('habits', 'eating', 'Chaotic eating — Wolt orders, skipping meals', 'told', 1.0);
  store.setIdentity('habits', 'money', 'Wastes money on unnecessary things', 'told', 1.0);
  store.setIdentity('habits', 'admin', 'Procrastinates on life admin', 'told', 1.0);
  store.setIdentity('habits', 'apartment', 'Messy apartment', 'told', 1.0);
  store.setIdentity('habits', 'restocking', 'Doesn\'t restock anything — runs out of supplements, groceries, household items', 'told', 1.0);
  store.setIdentity('habits', 'social', 'Doesn\'t reach out to friends proactively', 'told', 1.0);
  store.setIdentity('habits', 'grooming', 'Haircuts too infrequent', 'told', 1.0);
  store.setIdentity('habits', 'bills', 'Misses bill deadlines and pays fines', 'told', 1.0);

  // ── Identity: Priorities ────────────────────────────────────────
  store.setIdentity('priorities', 'most_urgent', 'Finances and productivity', 'told', 1.0);
  store.setIdentity('priorities', 'approach', 'Manage whole system at once — not one area at a time', 'told', 1.0);

  // ── Observations: Patterns (high-confidence, from vision docs) ──
  store.addObservation('pattern', 'Jan knows what to do but struggles to initiate — the gap between knowing and doing is the core problem', 1.0, 'told');
  store.addObservation('pattern', 'Jan responds strongly to competition and status — being told others are ahead motivates him', 1.0, 'told');
  store.addObservation('pattern', 'Jan defaults to quick dopamine (games, scrolling) when not actively engaged', 1.0, 'told');
  store.addObservation('pattern', 'Jan orders Wolt when tired instead of cooking — this is both a money and health drain', 1.0, 'told');
  store.addObservation('pattern', 'Jan\'s motivation peaks in the morning after a good wake-up routine', 0.9, 'told');
  store.addObservation('pattern', 'Jan avoids life admin (bills, paperwork, appointments) until consequences hit', 1.0, 'told');
  store.addObservation('pattern', 'Jan doesn\'t restock proactively — runs out of things before acting', 1.0, 'told');
  store.addObservation('pattern', 'Jan isolates socially unless actively pushed to reach out', 1.0, 'told');

  // ── Observations: Preferences ───────────────────────────────────
  store.addObservation('preference', 'Jan prefers being told what to do over being asked to choose — reduce decision load', 1.0, 'told');
  store.addObservation('preference', 'Jan doesn\'t want to be asked obvious questions — Edwin should know what to do from the vision', 1.0, 'told');
  store.addObservation('preference', 'Mornings should be energizing and direct, evenings should be gentle, Sundays should be gentle all day', 1.0, 'told');
  store.addObservation('preference', 'Jan enjoys walks, parks, sunsets, being outdoors — but won\'t initiate these himself', 1.0, 'told');

  console.log('[seed] Jan\'s profile seeded into memory');
}
