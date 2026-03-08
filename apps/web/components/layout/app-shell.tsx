'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar, BottomNav } from './nav';
import { PushPrompt } from '../push-prompt';
import { LockScreen } from '../lock-screen';
import { NotificationToast } from '../notifications/toast';
import { getAccessKey } from '@/lib/auth';
import { getNotificationCount } from '@/lib/api';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const lastCountRef = useRef<number>(0);

  useEffect(() => {
    const key = getAccessKey();
    setAuthenticated(!!key);
  }, []);

  // Poll for new notifications when app is open
  const checkForNew = useCallback(async () => {
    try {
      const count = await getNotificationCount();
      if (count > lastCountRef.current && lastCountRef.current > 0) {
        setToast('Edwin has something for you.');
      }
      lastCountRef.current = count;
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    checkForNew();
    const interval = setInterval(checkForNew, 60_000);
    return () => clearInterval(interval);
  }, [authenticated, checkForNew]);

  // Loading state
  if (authenticated === null) {
    return <div className="min-h-screen bg-[#09090b]" />;
  }

  if (!authenticated) {
    return <LockScreen onUnlock={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />
      <main className="min-h-screen pb-20 md:ml-64 md:pb-0">
        {children}
      </main>
      <BottomNav />
      <PushPrompt />
      {toast && (
        <NotificationToast
          message={toast}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
