import type { ScheduleItem } from '@edwin/shared';

export function ScheduleTimeline({ schedule }: { schedule: ScheduleItem[] }) {
  if (schedule.length === 0) {
    return <p className="text-sm text-[#7a7b90]">No scheduled items today, sir.</p>;
  }

  return (
    <div className="space-y-3">
      {schedule.map((item) => (
        <div key={item.id} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <span className="text-xs font-medium text-amber-400">{item.time}</span>
            <div className="mt-1 h-full w-px bg-white/[0.08]" />
          </div>
          <div className="flex-1 rounded-[12px] border border-white/[0.05] bg-white/[0.03] px-3 py-2">
            <p className="text-sm text-[#f0f0f5]">{item.title}</p>
            <p className="text-xs text-[#7a7b90]">{item.type}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
