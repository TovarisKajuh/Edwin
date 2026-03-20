interface Bill {
  name: string;
  amount: number | null;
  dueIn: number;
}

export function BillsPanel({ bills }: { bills: Bill[] }) {
  if (bills.length === 0) {
    return <p className="text-sm text-[#7a7b90]">No bills due this week.</p>;
  }

  return (
    <ul className="space-y-2">
      {bills.map((bill) => {
        const urgency = bill.dueIn <= 0 ? 'text-red-400' : bill.dueIn <= 3 ? 'text-amber-400' : 'text-[#7a7b90]';
        const dueLabel = bill.dueIn <= 0 ? 'Overdue' : bill.dueIn === 1 ? 'Due tomorrow' : `Due in ${bill.dueIn} days`;
        return (
          <li key={bill.name} className="flex items-center justify-between rounded-[12px] border border-white/[0.05] bg-white/[0.03] px-3 py-2">
            <div>
              <p className="text-sm text-[#f0f0f5]/80">{bill.name}</p>
              <p className={`text-xs ${urgency}`}>{dueLabel}</p>
            </div>
            {bill.amount !== null && (
              <span className="text-sm font-medium text-[#f0f0f5]">&euro;{bill.amount.toFixed(0)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
