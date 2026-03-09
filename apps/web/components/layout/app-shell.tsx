'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar, BottomNav } from './nav';
import { PushPrompt } from '../push-prompt';
import { LockScreen } from '../lock-screen';
import { NotificationToast } from '../notifications/toast';
import { IncomingCall } from '../notifications/incoming-call';
import { getAccessKey } from '@/lib/auth';
import { getNotificationCount, getBriefingStatus, markNotificationRead } from '@/lib/api';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingBriefing, setPendingBriefing] = useState<{ id: number } | null>(null);
  const lastCountRef = useRef<number>(0);
  const briefingCheckedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const key = getAccessKey();
    setAuthenticated(!!key);
  }, []);

  // Check for pending briefing on app open (once after auth)
  useEffect(() => {
    if (!authenticated || briefingCheckedRef.current) return;
    briefingCheckedRef.current = true;

    getBriefingStatus()
      .then((status) => {
        if (status.pending && status.id) {
          setPendingBriefing({ id: status.id });
        }
      })
      .catch(() => {});
  }, [authenticated]);

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

  const handleBriefingAccept = useCallback(() => {
    if (pendingBriefing) {
      markNotificationRead(pendingBriefing.id).catch(() => {});
    }
    setPendingBriefing(null);
    router.push('/briefing');
  }, [pendingBriefing, router]);

  const handleBriefingDecline = useCallback(() => {
    if (pendingBriefing) {
      markNotificationRead(pendingBriefing.id).catch(() => {});
    }
    setPendingBriefing(null);
  }, [pendingBriefing]);

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
      {pendingBriefing && (
        <IncomingCall
          title="Edwin"
          subtitle="Morning Briefing"
          onAccept={handleBriefingAccept}
          onDecline={handleBriefingDecline}
        />
      )}
      {toast && (
        <NotificationToast
          message={toast}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
