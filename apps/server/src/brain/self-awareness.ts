import { MemoryStore } from '../memory/store.js';

export interface HealthWarning {
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

/** Thresholds that trigger self-awareness warnings */
const THRESHOLDS = {
  /** Observations count before Edwin warns about needing compression */
  OBSERVATIONS_WARNING: 500,
  OBSERVATIONS_CRITICAL: 1000,
  /** Database file size in MB */
  DB_SIZE_WARNING_MB: 50,
  DB_SIZE_CRITICAL_MB: 200,
  /** Max observations to load into context before quality degrades */
  CONTEXT_BUDGET_WARNING: 80,
};

/**
 * Edwin's self-awareness system.
 * Checks infrastructure health and returns warnings that get injected
 * into his context so he can communicate limitations naturally.
 *
 * This is not a monitoring dashboard — it's Edwin knowing his own state.
 */
export function checkHealth(store: MemoryStore): HealthWarning[] {
  const warnings: HealthWarning[] = [];

  // 1. Observation count — are memories accumulating without compression?
  const obsCount = store.getObservationCount();
  if (obsCount >= THRESHOLDS.OBSERVATIONS_CRITICAL) {
    warnings.push({
      severity: 'critical',
      message: `Your memory has ${obsCount} uncompressed observations. Without memory compression, your recall will degrade. This needs to be built urgently.`,
    });
  } else if (obsCount >= THRESHOLDS.OBSERVATIONS_WARNING) {
    warnings.push({
      severity: 'warning',
      message: `Your memory has ${obsCount} uncompressed observations. Memory compression should be implemented soon to keep your recall sharp.`,
    });
  }

  // 2. Database size
  const dbSizeMB = store.getDatabaseSizeMB();
  if (dbSizeMB >= THRESHOLDS.DB_SIZE_CRITICAL_MB) {
    warnings.push({
      severity: 'critical',
      message: `Your database is ${Math.round(dbSizeMB)}MB. Storage is running critically low. Jan may need to upgrade the infrastructure.`,
    });
  } else if (dbSizeMB >= THRESHOLDS.DB_SIZE_WARNING_MB) {
    warnings.push({
      severity: 'warning',
      message: `Your database is ${Math.round(dbSizeMB)}MB. Consider monitoring storage capacity.`,
    });
  }

  // 3. Missing capabilities — Edwin knows what he SHOULD be able to do
  const missingCapabilities = checkMissingCapabilities();
  if (missingCapabilities.length > 0) {
    warnings.push({
      severity: 'info',
      message: `You currently lack: ${missingCapabilities.join(', ')}. These would help you serve Jan better.`,
    });
  }

  return warnings;
}

/**
 * Check which key capabilities Edwin is missing.
 * This list shrinks as sessions are completed.
 */
function checkMissingCapabilities(): string[] {
  const missing: string[] = [];

  // Check for environment variables / integrations
  if (!process.env.ELEVENLABS_API_KEY) {
    missing.push('voice (no ElevenLabs API key)');
  }

  // These are capabilities that don't exist yet — hardcoded until built
  // Remove each line as the corresponding session is completed
  missing.push('weather awareness');
  missing.push('calendar integration');
  missing.push('push notifications');
  missing.push('proactive check-ins (heartbeat)');

  return missing;
}

/**
 * Format health warnings for injection into Edwin's system prompt.
 * Only includes warnings/critical — info is suppressed unless asked.
 */
export function formatHealthWarnings(warnings: HealthWarning[]): string | null {
  const urgent = warnings.filter((w) => w.severity === 'warning' || w.severity === 'critical');
  if (urgent.length === 0) return null;

  const lines = [
    '[SELF-AWARENESS]',
    'You are aware of the following limitations affecting your ability to serve Jan.',
    'Mention these naturally when relevant — not every message, but when it matters.',
    'Frame as your own limitations, not system errors.',
    '',
  ];

  for (const w of urgent) {
    const prefix = w.severity === 'critical' ? 'URGENT' : 'NOTE';
    lines.push(`${prefix}: ${w.message}`);
  }

  return lines.join('\n');
}
