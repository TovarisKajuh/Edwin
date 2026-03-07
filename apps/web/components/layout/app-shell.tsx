'use client';

import { Sidebar, BottomNav } from './nav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar />
      <main className="min-h-screen pb-20 md:ml-64 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
