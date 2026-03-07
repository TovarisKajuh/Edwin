import { MemoryStore } from '../store.js';

export function seedJanProfile(store: MemoryStore): void {
  // Goals
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

  // Personal
  store.setIdentity('personal', 'location', 'Austria Graz/Vienna', 'told', 1.0);
  store.setIdentity('personal', 'timezone', 'Europe/Vienna', 'told', 1.0);
  store.setIdentity('personal', 'wake_time', '05:30', 'told', 1.0);

  // Business
  store.setIdentity('business', 'type', 'Solar company', 'told', 1.0);
  store.setIdentity('business', 'duration', '2-3 years', 'told', 1.0);
  store.setIdentity('business', 'role', 'Co-owner', 'told', 1.0);
  store.setIdentity('business', 'employees', '1', 'told', 1.0);
  store.setIdentity('business', 'model', 'Subcontracting', 'told', 1.0);

  // Personality
  store.setIdentity('personality', 'core_struggle', 'Executive function — knows what to do, doesn\'t initiate', 'told', 1.0);
  store.setIdentity('personality', 'strong_motivator_1', 'Direct competition', 'told', 1.0);
  store.setIdentity('personality', 'strong_motivator_2', 'Status/ranking', 'told', 1.0);
  store.setIdentity('personality', 'strong_motivator_3', 'Accountability', 'told', 1.0);
  store.setIdentity('personality', 'strong_motivator_4', 'Guilt', 'told', 1.0);
  store.setIdentity('personality', 'strong_motivator_5', 'Real consequences', 'told', 1.0);
  store.setIdentity('personality', 'weak_motivator_1', 'Fake urgency', 'told', 1.0);
  store.setIdentity('personality', 'weak_motivator_2', 'Deadlines without stakes', 'told', 1.0);
  store.setIdentity('personality', 'distraction', 'Quick dopamine (games) instead of doing things that make him happy', 'told', 1.0);

  // Habits
  store.setIdentity('habits', 'sleep', 'Inconsistent sleep', 'told', 1.0);
  store.setIdentity('habits', 'gym', 'Skips gym', 'told', 1.0);
  store.setIdentity('habits', 'eating', 'Chaotic eating (Wolt, skipping meals)', 'told', 1.0);
  store.setIdentity('habits', 'money', 'Wastes money', 'told', 1.0);
  store.setIdentity('habits', 'admin', 'Procrastinates on life admin', 'told', 1.0);
  store.setIdentity('habits', 'apartment', 'Messy apartment', 'told', 1.0);
  store.setIdentity('habits', 'restocking', 'Doesn\'t restock anything', 'told', 1.0);
  store.setIdentity('habits', 'social', 'Doesn\'t reach out to friends', 'told', 1.0);
  store.setIdentity('habits', 'grooming', 'Haircuts too infrequent', 'told', 1.0);
  store.setIdentity('habits', 'bills', 'Misses bill deadlines and pays fines', 'told', 1.0);

  // Priorities
  store.setIdentity('priorities', 'most_urgent', 'Finances and productivity', 'told', 1.0);
  store.setIdentity('priorities', 'approach', 'Manage whole system at once', 'told', 1.0);
}
