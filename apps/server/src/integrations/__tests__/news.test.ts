import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getNews,
  formatNewsForClaude,
  formatNewsForBriefing,
  clearNewsCache,
  scoreRelevance,
  type NewsItem,
  type NewsFeed,
} from '../news';

const mockSolarItem: NewsItem = {
  title: 'EU Solar Tariffs Rise 12% in Q1 2026',
  source: 'PV Magazine',
  link: 'https://pv-magazine.com/article/1',
  publishedAt: '2026-03-08T09:00:00Z',
  summary: 'The European Union has approved new solar panel tariffs affecting imports from China.',
};

const mockRenewableItem: NewsItem = {
  title: 'Austria Hits 40% Renewable Energy Mix',
  source: 'Renewables Now',
  link: 'https://renewablesnow.com/article/2',
  publishedAt: '2026-03-07T14:00:00Z',
  summary: 'Austria reached a milestone in renewable energy adoption.',
};

const mockIrrelevantItem: NewsItem = {
  title: 'New Cat Cafe Opens in Tokyo',
  source: 'Random News',
  link: 'https://example.com/cats',
  publishedAt: '2026-03-08T12:00:00Z',
  summary: 'A delightful new cat cafe has opened in Shibuya.',
};

describe('News Integration', () => {
  beforeEach(() => {
    clearNewsCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearNewsCache();
  });

  // ── Formatting ────────────────────────────────────────────────

  describe('formatNewsForClaude', () => {
    it('should format news items', () => {
      const feed: NewsFeed = {
        items: [mockSolarItem, mockRenewableItem],
        fetchedAt: new Date().toISOString(),
      };

      const result = formatNewsForClaude(feed);

      expect(result).toContain('Relevant news:');
      expect(result).toContain('EU Solar Tariffs');
      expect(result).toContain('PV Magazine');
      expect(result).toContain('Austria Hits 40%');
    });

    it('should show max 3 items', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        ...mockSolarItem,
        title: `Solar News ${i + 1}`,
      }));

      const result = formatNewsForClaude({ items, fetchedAt: new Date().toISOString() });

      // Count occurrences of "Solar News"
      const matches = result.match(/Solar News/g);
      expect(matches?.length).toBe(3);
    });

    it('should handle empty news', () => {
      const result = formatNewsForClaude({ items: [], fetchedAt: new Date().toISOString() });
      expect(result).toContain('No relevant industry news');
    });
  });

  describe('formatNewsForBriefing', () => {
    it('should return max 2 items for briefing', () => {
      const items = Array.from({ length: 5 }, (_, i) => ({
        ...mockSolarItem,
        title: `Solar News ${i + 1}`,
      }));

      const result = formatNewsForBriefing({ items, fetchedAt: new Date().toISOString() });

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('Solar News 1');
      expect(result[1]).toContain('Solar News 2');
    });

    it('should include source and truncated summary', () => {
      const result = formatNewsForBriefing({
        items: [mockSolarItem],
        fetchedAt: new Date().toISOString(),
      });

      expect(result[0]).toContain('[PV Magazine]');
      expect(result[0]).toContain('EU Solar Tariffs');
    });
  });

  // ── Relevance Scoring ────────────────────────────────────────

  describe('scoreRelevance', () => {
    it('should score solar industry news higher than general news', () => {
      const solarItem = { title: 'New solar panel efficiency record', summary: 'Breakthrough in photovoltaic cells' };
      const generalItem = { title: 'Local sports team wins', summary: 'Football results' };
      expect(scoreRelevance(solarItem)).toBeGreaterThan(scoreRelevance(generalItem));
    });

    it('should score Austria/EU news with moderate relevance', () => {
      const item = { title: 'EU announces new energy policy', summary: 'European Commission proposes renewable targets' };
      expect(scoreRelevance(item)).toBeGreaterThan(0.3);
    });

    it('should score breaking world news as high relevance', () => {
      const item = { title: 'Major earthquake strikes Turkey', summary: 'Magnitude 7.2 earthquake, casualties reported' };
      expect(scoreRelevance(item)).toBeGreaterThan(0.5);
    });

    it('should return 0 for irrelevant celebrity gossip', () => {
      const item = { title: 'Celebrity spotted at restaurant', summary: '' };
      expect(scoreRelevance(item)).toBeLessThan(0.1);
    });

    it('should give highest score to direct solar/PV keywords', () => {
      const item = { title: 'Photovoltaic installation boom in Austria', summary: 'PV installations doubled' };
      expect(scoreRelevance(item)).toBe(1.0);
    });

    it('should not false-positive on short keywords inside longer words', () => {
      // "ai" inside "paid", "pv" inside "preview", "eu" inside "neutral"
      const paidItem = { title: 'Company paid dividends to shareholders', summary: '' };
      const previewItem = { title: 'Movie preview released today', summary: '' };
      expect(scoreRelevance(paidItem)).toBe(0);
      expect(scoreRelevance(previewItem)).toBe(0);
    });

    it('should score renewable energy news high but below solar', () => {
      const item = { title: 'Battery storage costs decline', summary: 'Grid-scale battery prices fall 20%' };
      const score = scoreRelevance(item);
      expect(score).toBeGreaterThanOrEqual(0.8);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  // ── Fetching ──────────────────────────────────────────────────

  describe('getNews', () => {
    it('should fetch and parse RSS feeds', async () => {
      const mockRSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<item>
<title>Solar panel efficiency reaches new record</title>
<link>https://example.com/solar-record</link>
<pubDate>Sat, 07 Mar 2026 10:00:00 GMT</pubDate>
<description>A new solar cell design has achieved 33% efficiency.</description>
</item>
<item>
<title>Cat videos trending on social media</title>
<link>https://example.com/cats</link>
<pubDate>Sat, 07 Mar 2026 09:00:00 GMT</pubDate>
<description>Cute cats are taking over the internet again.</description>
</item>
</channel>
</rss>`;

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => mockRSS,
      } as Response);

      const feed = await getNews();

      // Only the solar article should be relevant
      expect(feed.items.length).toBeGreaterThanOrEqual(1);
      expect(feed.items.some((i) => i.title.includes('Solar'))).toBe(true);
      // Cat article should be filtered out
      expect(feed.items.some((i) => i.title.includes('Cat'))).toBe(false);
    });

    it('should cache results', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => '<rss><channel></channel></rss>',
      } as Response);

      await getNews();
      await getNews();
      await getNews();

      // Should only fetch once per feed URL (7 feeds), not 21
      expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(7);
    });

    it('should handle feed failures gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const feed = await getNews();
      expect(feed.items).toEqual([]);
    });

    it('should fetch from all 7 feeds', async () => {
      const mockRSS = `<?xml version="1.0"?>
<rss version="2.0">
<channel>
<item>
<title>Solar panel news</title>
<link>https://example.com/solar</link>
<description>Solar energy update.</description>
</item>
</channel>
</rss>`;

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => mockRSS,
      } as Response);

      await getNews();

      // Should call fetch once per feed (7 feeds)
      expect(fetchSpy.mock.calls.length).toBe(7);
    });

    it('should handle CDATA sections in RSS', async () => {
      const mockRSS = `<?xml version="1.0"?>
<rss version="2.0">
<channel>
<item>
<title><![CDATA[EU approves solar energy subsidies]]></title>
<link>https://example.com/eu-solar</link>
<description><![CDATA[New subsidies for rooftop solar installations.]]></description>
</item>
</channel>
</rss>`;

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => mockRSS,
      } as Response);

      const feed = await getNews();

      expect(feed.items.some((i) => i.title.includes('EU approves solar'))).toBe(true);
    });
  });
});
