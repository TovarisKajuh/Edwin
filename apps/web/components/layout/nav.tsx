'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { NotificationBadge, NotificationBadgeMobile } from '../notifications/notification-badge';
import { NotificationPanel } from '../notifications/notification-panel';
import { getNotificationCount } from '../../lib/api';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '\u25C9' },
  { href: '/chat', label: 'Chat', icon: '\u25C6' },
  { href: '/voice', label: 'Voice', icon: '\u25CF' },
  { href: '/news', label: 'News', icon: '\u25A0' },
];

export function BottomNav() {
  const pathname = usePathname();
  const [panelOpen, setPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const c = await getNotificationCount();
      setUnreadCount(c);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 px-3 py-1 text-xs transition-all active:scale-95 ${
                  isActive ? 'text-amber-400' : 'text-zinc-500'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <span className="mt-0.5 h-0.5 w-4 rounded-full bg-amber-400" />}
              </Link>
            );
          })}
          <NotificationBadgeMobile
            onClick={() => setPanelOpen(true)}
            count={unreadCount}
          />
        </div>
      </nav>
      <NotificationPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        onCountChange={setUnreadCount}
      />
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [panelOpen, setPanelOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    try {
      const c = await getNotificationCount();
      setUnreadCount(c);
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return (
    <>
      <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 border-r border-zinc-800 bg-zinc-950 md:block">
        <div className="px-6 py-8">
          <h1 className="text-2xl font-bold text-amber-400">Edwin</h1>
          <p className="mt-1 text-sm text-zinc-500">At your service, sir.</p>
        </div>
        <nav className="mt-4 flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-amber-400'
                    : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <NotificationBadge onClick={() => setPanelOpen(true)} />
        </nav>
      </aside>
      <NotificationPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        onCountChange={setUnreadCount}
      />
    </>
  );
}
