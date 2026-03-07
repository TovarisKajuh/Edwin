'use client';

import { useEffect, useState } from 'react';
import type { DashboardData } from '@edwin/shared';
import { getDashboard } from '@/lib/api';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

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
    <div className="mx-auto max-w-4xl p-6 pt-8 md:p-10">
      <header className="mb-8">
        <h1 className="text-2xl font-light text-zinc-100 md:text-3xl">
          {data.greeting}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">{data.date}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Today's Schedule */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">
            Today&apos;s Schedule
          </h2>
          {data.schedule.length === 0 ? (
            <p className="text-sm text-zinc-500">No scheduled items yet, sir.</p>
          ) : (
            <ul className="space-y-3">
              {data.schedule.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <span className="mt-0.5 text-xs text-amber-400">{item.time}</span>
                  <span className="text-sm text-zinc-300">{item.title}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pending Actions */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">
            Pending Actions
          </h2>
          {data.pendingActions.length === 0 ? (
            <p className="text-sm text-zinc-500">All clear for now, sir.</p>
          ) : (
            <ul className="space-y-3">
              {data.pendingActions.map((action) => (
                <li key={action.id} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 text-xs font-medium uppercase ${
                      action.stakesLevel === 'high'
                        ? 'text-red-400'
                        : action.stakesLevel === 'medium'
                          ? 'text-amber-400'
                          : 'text-zinc-500'
                    }`}
                  >
                    {action.stakesLevel}
                  </span>
                  <span className="text-sm text-zinc-300">{action.description}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
