'use client';

import { useEffect, useState, useCallback } from 'react';
import { getNotificationCount } from '../../lib/api';

const POLL_INTERVAL = 30_000; // 30 seconds

export function NotificationBadge({ onClick }: { onClick: () => void }) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const c = await getNotificationCount();
      setCount(c);
    } catch {
      // Silently fail — badge just won't update
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
    >
      <span className="text-base">&#9826;</span>
      <span>Notifications</span>
      {count > 0 && (
        <span className="absolute -top-1 left-6 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-zinc-950">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}

export function NotificationBadgeMobile({ onClick, count }: { onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center gap-1 px-4 py-1 text-xs text-zinc-500 transition-colors"
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
    >
      <span className="text-lg">&#9826;</span>
      <span>Alerts</span>
      {count > 0 && (
        <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-zinc-950">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
