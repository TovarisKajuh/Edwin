import type { DashboardNewsItem } from '@edwin/shared';

function RelevanceDot({ score }: { score: number }) {
  const color = score >= 0.7 ? 'bg-red-500' : score >= 0.4 ? 'bg-amber-500' : 'bg-zinc-500';
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} />;
}

export function NewsTicker({ items }: { items: DashboardNewsItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">No news right now.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <RelevanceDot score={item.relevance} />
          <div className="min-w-0 flex-1">
            <a href={item.link} target="_blank" rel="noopener noreferrer"
              className="block truncate text-sm text-zinc-300 hover:text-amber-400 transition-colors">
              {item.title}
            </a>
            <p className="text-xs text-zinc-500">{item.source}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
