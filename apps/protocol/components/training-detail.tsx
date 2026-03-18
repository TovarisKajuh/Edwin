'use client'

import type { TrainingDetail as TrainingDetailType } from '@/data/types'

interface TrainingDetailProps {
  detail: TrainingDetailType
}

export function TrainingDetail({ detail }: TrainingDetailProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-semibold text-zinc-200">{detail.dayName}</span>
        <span className="text-xs text-zinc-400">{detail.muscles}</span>
      </div>

      {detail.deloadNote && (
        <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/15 text-amber-300">
          {detail.deloadNote}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 uppercase tracking-wider">
              <th className="text-left py-1.5 pr-3 font-medium">Exercise</th>
              <th className="text-right py-1.5 px-3 font-medium">Weight</th>
              <th className="text-right py-1.5 px-3 font-medium">Sets x Reps</th>
              <th className="text-left py-1.5 pl-3 font-medium">Progression</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {detail.exercises.map((ex) => (
              <tr key={ex.name} className="text-zinc-300">
                <td className="py-2 pr-3 text-zinc-100">{ex.name}</td>
                <td className="py-2 px-3 text-right">
                  <span className="font-mono font-bold text-zinc-100">{ex.weight}kg</span>
                  {ex.startWeight !== ex.weight && (
                    <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
                      {ex.startWeight}kg &rarr; {ex.weight}kg
                    </div>
                  )}
                </td>
                <td className="py-2 px-3 text-right font-mono text-zinc-200">
                  {ex.sets}&times;{ex.reps}
                </td>
                <td className="py-2 pl-3 text-xs text-zinc-400">{ex.progressionNote}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 text-xs text-zinc-500 pt-1">
        <span>{detail.totalSets} total sets</span>
        <span>~{detail.estimatedMinutes} min</span>
      </div>

      {detail.alternativeNote && (
        <p className="text-xs text-zinc-500 italic">{detail.alternativeNote}</p>
      )}
    </div>
  )
}
