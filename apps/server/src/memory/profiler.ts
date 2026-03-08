import { callClaude } from '../brain/reasoning.js';
import { MemoryStore } from './store.js';

/**
 * Categories that warrant multi-dimensional profiling.
 * Preferences and emotional states are already self-contained.
 * Follow-ups are action items, not facts to analyze.
 */
const PROFILABLE_CATEGORIES = ['fact', 'commitment'] as const;

interface DimensionalInsight {
  dimension: string;
  category: 'fact' | 'commitment' | 'follow_up';
  content: string;
  confidence: number;
}

interface ProfileResult {
  insights: DimensionalInsight[];
}

const PROFILER_SYSTEM_PROMPT = `You are Edwin's KNOWING system — the part of his brain that understands implications. When Edwin learns a fact about Jan, you analyze what it MEANS across multiple dimensions.

You receive:
1. A newly learned observation
2. Jan's identity profile (goals, habits, personality, business)
3. Recent observations for pattern context

Your job: fan the observation out into dimensional insights. Not every observation needs all dimensions — only include dimensions that are genuinely relevant.

Dimensions to consider:
- health: Physical health, fitness, sleep, nutrition implications
- financial: Spending, saving, budget, investment implications
- behavioral: Pattern detection — is this recurring? Breaking a streak? New behavior?
- mood: Emotional signal — what does this suggest about Jan's state?
- accountability: Should Edwin act on this? Nudge, remind, praise, or challenge?
- goal_alignment: Does this advance or hinder any of Jan's stated goals?

Rules:
- Only include dimensions that are genuinely relevant. "Jan has a meeting Thursday" has NO health dimension.
- Be specific. Not "this affects health" but "gym attendance missed — 3rd skip this week based on recent observations"
- Cross-reference with Jan's profile. "Jan skipped the gym" is more meaningful when you know his habit pattern is "skips gym."
- Each insight should be actionable or informative for Edwin, not generic.
- Write from Edwin's perspective (third person about Jan).
- confidence: 0.5-1.0 based on how certain the inference is.
- category: what kind of observation this insight is (fact, commitment, or follow_up).

Output JSON only:
{"insights": [{"dimension": "health", "category": "fact", "content": "...", "confidence": 0.7}, ...]}
Return empty insights array if the observation doesn't warrant deeper analysis.`;

/**
 * Profile a set of newly extracted observations for multi-dimensional insights.
 * Takes raw facts and understands their deeper implications by cross-referencing
 * Jan's identity profile and recent observation patterns.
 *
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function profileObservations(
  store: MemoryStore,
  observations: { category: string; content: string }[],
): Promise<void> {
  // Filter to only profilable categories
  const toProfile = observations.filter((o) =>
    (PROFILABLE_CATEGORIES as readonly string[]).includes(o.category),
  );

  if (toProfile.length === 0) return;

  try {
    // Build context: Jan's identity + recent observations
    const identitySnapshot = store.buildIdentitySnapshot();
    const recentObs = store.getActiveObservations(20);
    const recentContext = recentObs.length > 0
      ? '\nRecent observations:\n' + recentObs.map((o) => `- (${o.category}) ${o.content}`).join('\n')
      : '';

    // Profile all new observations in a single Claude call
    const observationsText = toProfile
      .map((o) => `[${o.category}] ${o.content}`)
      .join('\n');

    const response = await callClaude(PROFILER_SYSTEM_PROMPT, [
      {
        role: 'user',
        content: `NEW OBSERVATIONS:\n${observationsText}\n\nJAN'S PROFILE:\n${identitySnapshot}${recentContext}`,
      },
    ]);

    let result: ProfileResult;
    try {
      result = JSON.parse(response);
    } catch {
      console.error('[profiler] Claude returned non-JSON:', response.slice(0, 200));
      return;
    }

    if (!result.insights || !Array.isArray(result.insights)) {
      return;
    }

    const validCategories = ['fact', 'commitment', 'follow_up'];
    let stored = 0;

    for (const insight of result.insights) {
      if (!validCategories.includes(insight.category)) continue;
      if (!insight.content || !insight.dimension) continue;

      // Dedup: skip if this exact insight already exists
      if (store.hasRecentObservation(insight.category, insight.content)) continue;

      store.addObservation(
        insight.category,
        insight.content,
        insight.confidence ?? 0.5,
        'inferred',
      );
      stored++;
    }

    if (stored > 0) {
      console.log(`[profiler] Stored ${stored} dimensional insights`);
    }
  } catch (err) {
    console.error('[profiler] Failed:', err);
  }
}
