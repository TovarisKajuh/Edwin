'use client'

interface DashboardCardProps {
  title: string
  controls?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function DashboardCard({ title, controls, children, className = '' }: DashboardCardProps) {
  return (
    <div className={`rounded-[20px] bg-[#151729] p-6 ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[17px] font-semibold text-[#f0f0f5]">{title}</h3>
        {controls}
      </div>
      {children}
    </div>
  )
}
