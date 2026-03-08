'use client';

import { useState, useEffect } from 'react';
import { Sidebar, BottomNav } from './nav';
import { PushPrompt } from '../push-prompt';
import { LockScreen } from '../lock-screen';
import { getAccessKey } from '@/lib/auth';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if access key exists in localStorage
    const key = getAccessKey();
    setAuthenticated(!!key);
  }, []);

  // Loading state — avoid flash
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
    </div>
  );
}
