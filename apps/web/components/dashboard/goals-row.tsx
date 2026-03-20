import type { DashboardGoal } from '@edwin/shared';

function ProgressRing({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const r = 20;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <svg width="52" height="52" className="shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#1e2040" strokeWidth="4" />
      <circle
        cx="26" cy="26" r={r} fill="none"
        stroke={percentage >= 100 ? '#22c55e' : '#f59e0b'}
        strokeWidth="4" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="26" textAnchor="middle" dominantBaseline="central"
        className="fill-[#f0f0f5] text-[10px] font-medium">
        {clamped}%
      </text>
    </svg>
  );
}

export function GoalsRow({ goals }: { goals: DashboardGoal[] }) {
  if (goals.length === 0) {
    return <p className="text-sm text-[#7a7b90]">No goals set yet.</p>;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {goals.map((goal) => (
        <div key={goal.id}
          className="flex min-w-[160px] shrink-0 items-center gap-3 rounded-[20px] border border-white/[0.05] bg-[#151729]/60 p-6 backdrop-blur-xl">
          <ProgressRing percentage={goal.progress} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#f0f0f5]">{goal.name}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${goal.onTrack ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-[#7a7b90]">{goal.onTrack ? 'On track' : 'Behind'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
