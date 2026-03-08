import type { ScheduleItem } from '@edwin/shared';

export function ScheduleTimeline({ schedule }: { schedule: ScheduleItem[] }) {
  if (schedule.length === 0) {
    return <p className="text-sm text-zinc-500">No scheduled items today, sir.</p>;
  }

  return (
    <div className="space-y-3">
      {schedule.map((item) => (
        <div key={item.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <span className="text-xs font-medium text-amber-400">{item.time}</span>
            <div className="mt-1 h-full w-px bg-zinc-700" />
          </div>
          <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2">
            <p className="text-sm text-zinc-200">{item.title}</p>
            <p className="text-xs text-zinc-500">{item.type}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
