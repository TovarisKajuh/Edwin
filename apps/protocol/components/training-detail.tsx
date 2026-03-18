'use client'

import type { TrainingDetail as TrainingDetailType } from '@/data/types'

interface TrainingDetailProps {
  detail: TrainingDetailType
}

export function TrainingDetail({ detail }: TrainingDetailProps) {
  return (
    <div className="rounded-xl bg-[#12121e] border border-white/[0.06] p-4 mt-4">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xs text-[#7a7a95] uppercase tracking-wider font-medium">
          {detail.dayName} — {detail.muscles}
        </span>
      </div>

      {detail.deloadNote && (
        <div className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-3">
          {detail.deloadNote}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] text-[#4a4a65] uppercase tracking-widest">
              <th className="text-left py-1.5 pr-3 font-medium">Exercise</th>
              <th className="text-right py-1.5 px-3 font-medium">Weight</th>
              <th className="text-right py-1.5 px-3 font-medium">Sets x Reps</th>
              <th className="text-left py-1.5 pl-3 font-medium">Progression</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {detail.exercises.map((ex) => (
              <tr key={ex.name} className="text-[#f0f0f5]">
                <td className="py-2 pr-3">{ex.name}</td>
                <td className="py-2 px-3 text-right">
                  <span className="font-mono font-semibold text-[#6b8aff]">{ex.weight}kg</span>
                  {ex.startWeight !== ex.weight && (
                    <div className="font-mono text-[10px] text-[#7a7a95] mt-0.5">
                      {ex.startWeight}kg &rarr; {ex.weight}kg
                    </div>
                  )}
                </td>
                <td className="py-2 px-3 text-right font-mono text-[#f0f0f5]">
                  {ex.sets}&times;{ex.reps}
                </td>
                <td className="py-2 pl-3 text-xs text-[#4a4a65]">{ex.progressionNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 text-xs text-[#4a4a65] pt-3 border-t border-white/[0.04] mt-3">
        <span>{detail.totalSets} total sets</span>
        <span>~{detail.estimatedMinutes} min</span>
      </div>

      {detail.alternativeNote && (
        <p className="text-xs text-[#7a7a95] italic mt-3">{detail.alternativeNote}</p>
      )}
    </div>
  )
}
