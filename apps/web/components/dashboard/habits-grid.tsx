import type { DashboardHabit } from '@edwin/shared';

const STATUS_STYLES = {
  done: 'border-green-800/60 bg-green-900/20',
  pending: 'border-white/[0.05] bg-white/[0.03]',
  missed: 'border-red-800/60 bg-red-900/20',
};

const STATUS_DOT = {
  done: 'bg-green-500',
  pending: 'bg-amber-500',
  missed: 'bg-red-500',
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function HabitsGrid({ habits }: { habits: DashboardHabit[] }) {
  if (habits.length === 0) {
    return <p className="text-sm text-[#7a7b90]">No habits tracked yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {habits.map((habit) => (
        <div key={habit.name}
          className={`rounded-[12px] border px-3 py-2 ${STATUS_STYLES[habit.status]}`}>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${STATUS_DOT[habit.status]}`} />
            <span className="text-sm font-medium text-[#f0f0f5]">{capitalize(habit.name)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            {habit.streak >= 3 && <span className="text-xs">🔥</span>}
            <span className="text-xs text-[#7a7b90]">
              {habit.streak > 0 ? `${habit.streak}d streak` : 'No streak'}
            </span>
          </div>
          {habit.goal !== null && (
            <p className="mt-0.5 text-xs text-[#45465a]">
              {habit.completedThisWeek}/{habit.goal} this week
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
