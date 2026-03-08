'use client';

import { useEffect, useState } from 'react';
import type { DashboardData, DashboardNewsItem } from '@edwin/shared';
import { getDashboard } from '@/lib/api';

function RelevanceDot({ score }: { score: number }) {
  const color = score >= 0.7 ? 'bg-red-500' : score >= 0.4 ? 'bg-amber-500' : 'bg-zinc-500';
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />;
}

const TOPIC_COLORS: Record<string, string> = {
  'PV Magazine': 'bg-amber-900/50 text-amber-400',
  'Renewables Now': 'bg-green-900/50 text-green-400',
  'CleanTechnica': 'bg-emerald-900/50 text-emerald-400',
  'Reuters': 'bg-blue-900/50 text-blue-400',
  'Reuters Business': 'bg-blue-900/50 text-blue-400',
  'BBC World': 'bg-red-900/50 text-red-400',
  'Euronews': 'bg-indigo-900/50 text-indigo-400',
};

export default function NewsPage() {
  const [items, setItems] = useState<DashboardNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then((data: DashboardData) => setItems(data.recentNews))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-4 pt-8 md:p-8">
      <h1 className="mb-6 text-2xl font-light text-zinc-100">News</h1>

      {loading && <p className="text-sm text-zinc-500">Loading news...</p>}

      {!loading && items.length === 0 && (
        <p className="text-sm text-zinc-500">No news available right now, sir.</p>
      )}

      <div className="space-y-3">
        {items.map((item, i) => {
          const badgeClass = TOPIC_COLORS[item.source] || 'bg-zinc-800 text-zinc-400';
          return (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700"
            >
              <div className="flex items-start gap-3">
                <RelevanceDot score={item.relevance} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-200">{item.title}</p>
                  <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${badgeClass}`}>
                    {item.source}
                  </span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
