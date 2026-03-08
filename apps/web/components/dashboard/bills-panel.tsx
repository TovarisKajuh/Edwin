interface Bill {
  name: string;
  amount: number | null;
  dueIn: number;
}

export function BillsPanel({ bills }: { bills: Bill[] }) {
  if (bills.length === 0) {
    return <p className="text-sm text-zinc-500">No bills due this week.</p>;
  }

  return (
    <ul className="space-y-2">
      {bills.map((bill, i) => {
        const urgency = bill.dueIn <= 0 ? 'text-red-400' : bill.dueIn <= 3 ? 'text-amber-400' : 'text-zinc-400';
        const dueLabel = bill.dueIn <= 0 ? 'Overdue' : bill.dueIn === 1 ? 'Due tomorrow' : `Due in ${bill.dueIn} days`;
        return (
          <li key={i} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-800/50 px-3 py-2">
            <div>
              <p className="text-sm text-zinc-300">{bill.name}</p>
              <p className={`text-xs ${urgency}`}>{dueLabel}</p>
            </div>
            {bill.amount !== null && (
              <span className="text-sm font-medium text-zinc-200">&euro;{bill.amount.toFixed(0)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
