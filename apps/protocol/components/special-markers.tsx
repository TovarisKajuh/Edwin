'use client'

export function DeloadBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
      Deload
    </span>
  )
}

export function DietBreakBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20">
      Maintenance
    </span>
  )
}

export function RefeedDot() {
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-400" title="Refeed Saturday" />
}

export function BloodworkPin() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
      Blood
    </span>
  )
}

export function TodayRing({ children }: { children: React.ReactNode }) {
  return <div className="ring-1 ring-[#6b8aff]/40 rounded-2xl">{children}</div>
}
