'use client'

export function DeloadBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-400">
      Deload
    </span>
  )
}

export function DietBreakBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-green-500/20 text-green-400">
      Maintenance
    </span>
  )
}

export function RefeedDot() {
  return <span className="inline-block w-2 h-2 rounded-full bg-orange-500" title="Refeed Saturday" />
}

export function BloodworkPin() {
  return (
    <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="Bloodwork" />
  )
}

export function TodayRing({ children }: { children: React.ReactNode }) {
  return <div className="ring-2 ring-zinc-400 rounded-lg">{children}</div>
}
