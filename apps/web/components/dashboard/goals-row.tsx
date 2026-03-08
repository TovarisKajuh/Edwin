import type { DashboardGoal } from '@edwin/shared';

function ProgressRing({ percentage }: { percentage: number }) {
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width="52" height="52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#27272a" strokeWidth="4" />
      <circle
        cx="26" cy="26" r={r} fill="none"
        stroke={percentage >= 100 ? '#22c55e' : '#f59e0b'}
        strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="26" textAnchor="middle" dominantBaseline="central"
        className="fill-zinc-300 text-[10px] font-medium">
        {percentage}%
      </text>
    </svg>
  );
}

export function GoalsRow({ goals }: { goals: DashboardGoal[] }) {
  if (goals.length === 0) {
    return <p className="text-sm text-zinc-500">No goals set yet.</p>;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {goals.map((goal) => (
        <div key={goal.id}
          className="flex min-w-[160px] shrink-0 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <ProgressRing percentage={goal.progress} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-200">{goal.name}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${goal.onTrack ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-zinc-500">{goal.onTrack ? 'On track' : 'Behind'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
