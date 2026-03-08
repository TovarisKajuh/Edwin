import { callClaude } from '../brain/reasoning.js';
import { MemoryStore } from './store.js';
import { profileObservations } from './profiler.js';
import { addMilestone, type MilestoneType } from './relationship.js';

const VALID_CATEGORIES = ['fact', 'commitment', 'preference', 'emotional_state', 'follow_up'] as const;
type ExtractionCategory = (typeof VALID_CATEGORIES)[number];

const VALID_MILESTONE_TYPES = ['achievement', 'struggle', 'humor', 'growth', 'connection'] as const;

interface Extraction {
  category: ExtractionCategory;
  content: string;
  confidence: number;
  /** If this new info supersedes an existing observation, its ID */
  supersedes?: number;
}

interface MilestoneExtraction {
  type: MilestoneType;
  content: string;
}

interface ExtractionResult {
  extractions: Extraction[];
  milestones?: MilestoneExtraction[];
}

/**
 * Nothing in Edwin's memory ever gets deleted.
 * Old observations get compressed into summaries (Session 5).
 * When new info contradicts old info, the old observation is marked
 * as superseded — not deleted, just no longer active.
 */

const EXTRACTION_SYSTEM_PROMPT = `You extract structured facts AND detect significant moments from conversations between Edwin (a personal life companion) and Jan (his user). Output JSON only, no other text.

## PART 1: Memory Extraction
Extract any of the following:
- fact: Something Jan stated as true ("I have a meeting Thursday", "I weigh 82kg", "My car needs service")
- commitment: Something Jan said he will do ("I'll go to the gym tomorrow", "I'll call the electrician")
- preference: A like, dislike, or preference Jan expressed ("I prefer morning workouts", "I hate video calls")
- emotional_state: How Jan seems emotionally ("stressed about work", "excited about the deal", "tired")
- follow_up: Something Edwin should check back on later ("Ask how the client meeting went", "Check if Jan went to the gym")

EXISTING MEMORIES are listed below. If the conversation contains information that UPDATES or CONTRADICTS an existing memory, include its ID in "supersedes" so the old one gets replaced.
Examples of superseding:
- Existing: [id:5] "Jan weighs 83kg" → Jan says "I'm 81kg now" → new extraction supersedes id 5
- Existing: [id:12] "Meeting is Thursday" → Jan says "Actually it's Wednesday" → supersedes id 12
- Existing: [id:8] "Jan will go to the gym" → Jan says "I went to the gym" → supersedes id 8 (commitment fulfilled)
Do NOT supersede if the new info is simply additional (e.g., two different meetings are not contradictions).

## PART 2: Milestone Detection
Identify significant moments worth remembering permanently. These are NOT ordinary facts — they are meaningful events in Jan's life that Edwin should remember forever. Types:
- achievement: Big wins, contracts, personal bests, career victories, financial milestones ("Closed the biggest deal of my career", "Hit a 30-day gym streak")
- struggle: Setbacks, losses, tough days, failures ("Lost our biggest client", "Got rejected from the investment round")
- growth: Personal growth moments, mindset shifts, new habits sticking ("I realized I need to stop procrastinating", "First month of consistent morning routine")
- humor: Genuinely funny exchanges, inside jokes worth remembering ("That hilarious coffee machine incident")
- connection: Moments where Jan and Edwin's relationship deepened, genuine appreciation ("Thank you Edwin, you really helped me today")

Only flag TRUE milestones — not every conversation has one. Most don't. A milestone is something Jan or Edwin would reference months later: "Remember when you..."

## Rules
- Only extract what is clearly stated or strongly implied. Do not invent or speculate.
- Write each extraction from Edwin's perspective (third person about Jan).
- Keep extractions concise — one clear fact per entry.
- Set confidence between 0.5 and 1.0 based on how certain the information is.
- If the conversation contains nothing worth extracting, return empty arrays.
- Milestones should be summarised in 1-2 sentences max.

## Output format
{"extractions": [{"category": "fact", "content": "...", "confidence": 0.9, "supersedes": 5}, ...], "milestones": [{"type": "achievement", "content": "Jan closed the biggest solar contract of his career"}, ...]}
(omit "supersedes" if this is new information; omit "milestones" if none detected)`;

/**
 * Extract memories from a conversation and store them as observations.
 * Includes existing observations in the prompt so Claude can detect
 * contradictions and mark old ones as superseded.
 * Fire-and-forget — errors are logged but never thrown.
 */
export async function extractMemories(
  store: MemoryStore,
  messages: { role: 'jan' | 'edwin'; content: string }[],
): Promise<void> {
  try {
    // Format conversation for Claude
    const conversationText = messages
      .map((m) => `${m.role === 'jan' ? 'Jan' : 'Edwin'}: ${m.content}`)
      .join('\n');

    // Include recent active observations so Claude can detect contradictions
    const recentObs = store.getActiveObservations(30);
    let existingMemories = '';
    if (recentObs.length > 0) {
      existingMemories = '\n\nEXISTING MEMORIES:\n' + recentObs
        .map((o) => `[id:${o.id}] (${o.category}) ${o.content}`)
        .join('\n');
    }

    const response = await callClaude(EXTRACTION_SYSTEM_PROMPT, [
      { role: 'user', content: conversationText + existingMemories },
    ]);

    // Parse the JSON response
    let result: ExtractionResult;
    try {
      result = JSON.parse(response);
    } catch {
      console.error('[memory-extraction] Claude returned non-JSON:', response.slice(0, 200));
      return;
    }

    if (!result.extractions || !Array.isArray(result.extractions)) {
      return;
    }

    // Store each valid extraction (with dedup and superseding)
    let stored = 0;
    let superseded = 0;
    const newObservations: { category: string; content: string }[] = [];

    for (const extraction of result.extractions) {
      if (!isValidCategory(extraction.category)) {
        continue;
      }

      // Dedup: skip if exact same observation already exists
      if (store.hasRecentObservation(extraction.category, extraction.content)) {
        continue;
      }

      // If this supersedes an existing observation, mark the old one
      if (extraction.supersedes != null) {
        const oldObs = store.getObservation(extraction.supersedes);
        if (oldObs && oldObs.source !== 'superseded') {
          store.supersedeObservation(extraction.supersedes, extraction.content);
          superseded++;
        }
      }

      store.addObservation(
        extraction.category,
        extraction.content,
        extraction.confidence ?? 0.5,
        'observed',
      );
      newObservations.push({ category: extraction.category, content: extraction.content });
      stored++;
    }

    if (stored > 0 || superseded > 0) {
      console.log(`[memory-extraction] Stored ${stored}, superseded ${superseded}`);
    }

    // Profile new observations for multi-dimensional insights (fire-and-forget)
    if (newObservations.length > 0) {
      profileObservations(store, newObservations).catch((err) => {
        console.error('[memory-extraction] Profiling failed:', err);
      });
    }

    // Store milestones detected by Claude (permanent relationship memory)
    if (result.milestones && Array.isArray(result.milestones)) {
      let milestoneCount = 0;
      for (const m of result.milestones) {
        if (isValidMilestoneType(m.type) && m.content) {
          addMilestone(store, m.type, m.content);
          milestoneCount++;
        }
      }
      if (milestoneCount > 0) {
        console.log(`[memory-extraction] ${milestoneCount} milestone(s) detected`);
      }
    }
  } catch (err) {
    console.error('[memory-extraction] Failed:', err);
  }
}

function isValidCategory(category: string): category is ExtractionCategory {
  return VALID_CATEGORIES.includes(category as ExtractionCategory);
}

function isValidMilestoneType(type: string): type is MilestoneType {
  return VALID_MILESTONE_TYPES.includes(type as typeof VALID_MILESTONE_TYPES[number]);
}
