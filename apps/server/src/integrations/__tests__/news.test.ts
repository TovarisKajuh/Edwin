import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getNews,
  formatNewsForClaude,
  formatNewsForBriefing,
  clearNewsCache,
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

      // Should only fetch once per feed URL (2 feeds), not 6
      expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(2);
    });

    it('should handle feed failures gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const feed = await getNews();
      expect(feed.items).toEqual([]);
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
