/**
 * News & Industry Context — Session 29.
 *
 * Edwin stays informed about things that matter to Jan:
 * - Solar industry news (Jan's business)
 * - Austrian business context
 * - EU energy policy
 *
 * Uses RSS feeds (free, no API key needed).
 * Results cached daily to avoid excessive fetching.
 * Curated, not overwhelming — 1-3 items per day, only if genuinely relevant.
 */

// ── Types ────────────────────────────────────────────────────────

export interface NewsItem {
  title: string;
  source: string;
  link: string;
  publishedAt: string;
  summary: string | null;
}

export interface NewsFeed {
  items: NewsItem[];
  fetchedAt: string;
}

// ── Cache ────────────────────────────────────────────────────────

const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
let cachedFeed: NewsFeed | null = null;

// ── RSS Feeds ────────────────────────────────────────────────────

const RSS_FEEDS = [
  {
    url: 'https://www.pv-magazine.com/feed/',
    source: 'PV Magazine',
    topic: 'solar',
  },
  {
    url: 'https://renewablesnow.com/news/feed/',
    source: 'Renewables Now',
    topic: 'renewables',
  },
];

// ── RSS Parser (minimal, no dependencies) ────────────────────────

function parseRSSItems(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];

  // Simple regex-based RSS parser — works for standard RSS 2.0 feeds
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const pubDate = extractTag(itemXml, 'pubDate');
    const description = extractTag(itemXml, 'description');

    if (title) {
      items.push({
        title: cleanHtml(title),
        source,
        link: link || '',
        publishedAt: pubDate || new Date().toISOString(),
        summary: description ? cleanHtml(description).slice(0, 200) : null,
      });
    }
  }

  return items;
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '') // Strip HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Relevance Filter ─────────────────────────────────────────────

const RELEVANCE_KEYWORDS = [
  'solar', 'photovoltaic', 'pv', 'renewable', 'energy',
  'austria', 'austrian', 'eu ', 'european',
  'tariff', 'subsidy', 'incentive', 'regulation',
  'installation', 'rooftop', 'panel', 'inverter',
  'battery', 'storage', 'grid',
  'electricity', 'power', 'clean energy',
];

function isRelevant(item: NewsItem): boolean {
  const text = `${item.title} ${item.summary || ''}`.toLowerCase();
  return RELEVANCE_KEYWORDS.some((kw) => text.includes(kw));
}

// ── API ──────────────────────────────────────────────────────────

/**
 * Fetch news from RSS feeds with 12-hour caching.
 * Returns curated, relevant items only.
 */
export async function getNews(): Promise<NewsFeed> {
  // Return cache if fresh
  if (cachedFeed) {
    const age = Date.now() - new Date(cachedFeed.fetchedAt).getTime();
    if (age < CACHE_DURATION_MS) {
      return cachedFeed;
    }
  }

  const allItems: NewsItem[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const response = await fetch(feed.url, {
        headers: { 'User-Agent': 'Edwin/1.0 (personal assistant)' },
      });
      if (!response.ok) continue;

      const xml = await response.text();
      const items = parseRSSItems(xml, feed.source);
      allItems.push(...items);
    } catch {
      // Individual feed failures are fine — we have multiple sources
    }
  }

  // Filter for relevance and sort by date (newest first)
  const relevant = allItems
    .filter(isRelevant)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 5); // Keep top 5 relevant items

  const newsFeed: NewsFeed = {
    items: relevant,
    fetchedAt: new Date().toISOString(),
  };

  cachedFeed = newsFeed;
  return newsFeed;
}

// ── Formatting ───────────────────────────────────────────────────

/**
 * Format news for Claude's tool response.
 */
export function formatNewsForClaude(feed: NewsFeed): string {
  if (feed.items.length === 0) {
    return 'No relevant industry news right now.';
  }

  const lines = ['Relevant news:'];
  for (const item of feed.items.slice(0, 3)) { // Max 3 for tool response
    const summary = item.summary ? ` — ${item.summary}` : '';
    lines.push(`  - [${item.source}] ${item.title}${summary}`);
  }

  return lines.join('\n');
}

/**
 * Format news for morning briefing (max 2 items, brief).
 */
export function formatNewsForBriefing(feed: NewsFeed): string[] {
  return feed.items.slice(0, 2).map((item) => {
    const summary = item.summary ? `: ${item.summary.slice(0, 100)}` : '';
    return `[${item.source}] ${item.title}${summary}`;
  });
}

/**
 * Clear the news cache (for testing).
 */
export function clearNewsCache(): void {
  cachedFeed = null;
}
