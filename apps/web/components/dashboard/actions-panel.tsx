import type { PendingAction } from '@edwin/shared';

const STAKES_COLORS = {
  high: 'text-red-400',
  medium: 'text-amber-400',
  low: 'text-zinc-500',
};

export function ActionsPanel({ actions }: { actions: PendingAction[] }) {
  if (actions.length === 0) {
    return <p className="text-sm text-zinc-500">All clear for now, sir.</p>;
  }

  return (
    <ul className="space-y-2">
      {actions.map((action) => (
        <li key={action.id} className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2">
          <span className={`mt-0.5 text-xs font-semibold uppercase ${STAKES_COLORS[action.stakesLevel]}`}>
            {action.stakesLevel}
          </span>
          <span className="text-sm text-zinc-300">{action.description}</span>
        </li>
      ))}
    </ul>
  );
}
