'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DashboardData } from '@edwin/shared';
import { getDashboard, testPush } from '@/lib/api';
import { WeatherCard } from '@/components/dashboard/weather-card';
import { StatCard } from '@/components/dashboard/stat-card';
import { ScheduleTimeline } from '@/components/dashboard/schedule-timeline';
import { GoalsRow } from '@/components/dashboard/goals-row';
import { ActionsPanel } from '@/components/dashboard/actions-panel';

import { BillsPanel } from '@/components/dashboard/bills-panel';
import { HabitsGrid } from '@/components/dashboard/habits-grid';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    return getDashboard()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const { containerRef, refreshing, pullDistance } = usePullToRefresh({
    onRefresh: loadData,
  });

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-light text-zinc-100 md:text-3xl">
            Good to see you, sir.
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Edwin is having trouble connecting. Please ensure the server is running.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-lg text-zinc-500">Edwin is waking up...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="mx-auto max-w-6xl p-4 pt-6 md:p-8">
      {/* Pull-to-refresh indicator (mobile only) */}
      {(pullDistance > 0 || refreshing) && (
        <div className="mb-4 flex justify-center md:hidden" style={{ height: pullDistance }}>
          <div className={`flex items-center gap-2 text-sm text-amber-400 ${refreshing ? 'animate-pulse' : ''}`}>
            {refreshing ? 'Refreshing...' : pullDistance >= 80 ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        </div>
      )}
      {/* Header */}
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-light text-zinc-100 md:text-3xl">
            {data.greeting}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{data.date}</p>
        </div>
        <button
          onClick={() => testPush().then((r) => alert(r.sent > 0 ? 'Push sent!' : 'No subscriptions found.')).catch(() => alert('Push failed.'))}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-amber-400 hover:text-amber-400 active:scale-95"
        >
          Test Push
        </button>
      </header>

      {/* Row 1: Weather + Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <div className="md:col-span-1">
          <WeatherCard weather={data.weather} />
        </div>
        <div className="grid grid-cols-2 gap-4 md:col-span-4 md:grid-cols-4">
          <StatCard label="Conversations" value={data.quickStats.conversationsToday} icon="💬" />
          <StatCard label="Active Goals" value={data.quickStats.activeGoals} icon="🎯" />
          <StatCard label="Today&rsquo;s Events" value={data.quickStats.upcomingEvents} icon="📅" />
          <StatCard label="Best Streak" value={data.quickStats.currentStreak} icon="🔥" />
        </div>
      </div>

      {/* Row 2: Goals */}
      {data.goals.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">
            Goals
          </h2>
          <GoalsRow goals={data.goals} />
        </section>
      )}

      {/* Row 3: Schedule + Actions | Bills + Habits */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Left: Schedule + Actions stacked */}
        <div className="space-y-6">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">
              Today&apos;s Schedule
            </h2>
            <ScheduleTimeline schedule={data.schedule} />
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">
              Pending Actions
            </h2>
            <ActionsPanel actions={data.pendingActions} />
          </section>
        </div>

        {/* Right: Bills + Habits stacked */}
        <div className="space-y-6">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">
              Upcoming Bills
            </h2>
            <BillsPanel bills={data.financeSummary.pendingBills} />
          </section>

          <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-400">
              Habits
            </h2>
            <HabitsGrid habits={data.habits} />
          </section>
        </div>
      </div>
    </div>
  );
}
