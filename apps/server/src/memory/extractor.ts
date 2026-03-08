import { callClaude } from '../brain/reasoning.js';
import { MemoryStore } from './store.js';

const VALID_CATEGORIES = ['fact', 'commitment', 'preference', 'emotional_state', 'follow_up'] as const;
type ExtractionCategory = (typeof VALID_CATEGORIES)[number];

interface Extraction {
  category: ExtractionCategory;
  content: string;
  confidence: number;
}

interface ExtractionResult {
  extractions: Extraction[];
}

/** Days until expiry per observation category */
const EXPIRY_DAYS: Record<ExtractionCategory, number> = {
  fact: 90,
  commitment: 3,
  preference: 180,
  emotional_state: 1,
  follow_up: 7,
};

const EXTRACTION_SYSTEM_PROMPT = `You extract structured facts from conversations between Edwin (a personal life companion) and Jan (his user). Output JSON only, no other text.

Analyze the conversation and extract any of the following:
- fact: Something Jan stated as true ("I have a meeting Thursday", "I weigh 82kg", "My car needs service")
- commitment: Something Jan said he will do ("I'll go to the gym tomorrow", "I'll call the electrician")
- preference: A like, dislike, or preference Jan expressed ("I prefer morning workouts", "I hate video calls")
- emotional_state: How Jan seems emotionally ("stressed about work", "excited about the deal", "tired")
- follow_up: Something Edwin should check back on later ("Ask how the client meeting went", "Check if Jan went to the gym")

Rules:
- Only extract what is clearly stated or strongly implied. Do not invent or speculate.
- Write each extraction from Edwin's perspective (third person about Jan).
- Keep extractions concise — one clear fact per entry.
- Set confidence between 0.5 and 1.0 based on how certain the information is.
- If the conversation contains nothing worth extracting, return an empty array.

Output format:
{"extractions": [{"category": "fact", "content": "...", "confidence": 0.9}, ...]}`;

/**
 * Extract memories from a conversation and store them as observations.
 * Uses a fast Claude call (Haiku) to analyze recent messages.
 * Fire-and-forget — errors are caught and logged, never thrown.
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

    const response = await callClaude(EXTRACTION_SYSTEM_PROMPT, [
      { role: 'user', content: conversationText },
    ]);

    // Parse the JSON response
    let result: ExtractionResult;
    try {
      result = JSON.parse(response);
    } catch {
      // Claude returned non-JSON — nothing to extract
      return;
    }

    if (!result.extractions || !Array.isArray(result.extractions)) {
      return;
    }

    // Store each valid extraction as an observation
    for (const extraction of result.extractions) {
      if (!isValidCategory(extraction.category)) {
        continue;
      }

      const expiryDays = EXPIRY_DAYS[extraction.category];
      const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

      store.addObservation(
        extraction.category,
        extraction.content,
        extraction.confidence ?? 0.5,
        'observed',
        expiresAt,
      );
    }
  } catch {
    // Fire-and-forget: never let extraction failure affect the main pipeline
  }
}

function isValidCategory(category: string): category is ExtractionCategory {
  return VALID_CATEGORIES.includes(category as ExtractionCategory);
}
