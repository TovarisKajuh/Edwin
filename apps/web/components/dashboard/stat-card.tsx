interface StatCardProps {
  label: string;
  value: number;
  icon: string;
}

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="rounded-[20px] border border-white/[0.05] bg-[#151729]/60 p-6 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <span className="text-lg">{icon}</span>
        <div>
          <p className="text-2xl font-semibold text-[#f0f0f5]">{value}</p>
          <p className="text-xs text-[#7a7b90]">{label}</p>
        </div>
      </div>
    </div>
  );
}
