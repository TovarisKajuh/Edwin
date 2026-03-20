import type { PendingAction } from '@edwin/shared';

const STAKES_COLORS = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-[#7a7b90]',
};

export function ActionsPanel({ actions }: { actions: PendingAction[] }) {
  if (actions.length === 0) {
    return <p className="text-sm text-[#7a7b90]">All clear for now, sir.</p>;
  }

  return (
    <ul className="space-y-2">
      {actions.map((action) => (
        <li key={action.id} className="flex items-start gap-3 rounded-[12px] border border-white/[0.05] bg-white/[0.03] px-3 py-2">
          <span className={`mt-0.5 text-xs font-semibold uppercase ${STAKES_COLORS[action.stakesLevel]}`}>
            {action.stakesLevel}
          </span>
          <span className="text-sm text-[#f0f0f5]/80">{action.description}</span>
        </li>
      ))}
    </ul>
  );
}
