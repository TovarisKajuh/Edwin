'use client'

import type { MealDetail as MealDetailType } from '@/data/types'

interface MealDetailProps {
  detail: MealDetailType
}

export function MealDetail({ detail }: MealDetailProps) {
  return (
    <div className="space-y-4">
      {detail.isIsotretinoinMeal && (
        <div className="rounded-lg bg-red-950/20 border border-red-500/20 px-3 py-2 text-xs text-red-300">
          40-50g fat required for isotretinoin absorption
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <MacroBox label="Calories" value={detail.calories} unit="kcal" highlight />
        <MacroBox label="Protein" value={detail.protein} unit="g" />
        <MacroBox label="Fat" value={detail.fat} unit="g" />
        <MacroBox label="Carbs" value={detail.carbs} unit="g" />
      </div>

      {detail.exampleMeals.length > 0 && (
        <div>
          <h4 className="text-xs text-[#7a7a95] uppercase tracking-wider mb-1.5 font-medium">
            Example meals
          </h4>
          <ul className="space-y-1">
            {detail.exampleMeals.map((meal, i) => (
              <li key={i} className="text-sm text-[#7a7a95]">
                {meal}
              </li>
            ))}
          </ul>
        </div>
      )}

      {detail.supplementsWithMeal.length > 0 && (
        <div>
          <h4 className="text-xs text-[#7a7a95] uppercase tracking-wider mb-1.5 font-medium">
            Supplements with meal
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {detail.supplementsWithMeal.map((supp) => (
              <span
                key={supp.name}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[#1a1a2e] border border-white/[0.06] text-[#f0f0f5]"
                title={supp.why}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#c084fc]" />
                <span className="font-medium">{supp.name}</span>
                <span className="font-mono text-[#7a7a95]">{supp.dose}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {detail.costNote && (
        <p className="text-xs text-[#4a4a65] mt-2">{detail.costNote}</p>
      )}
    </div>
  )
}

function MacroBox({
  label,
  value,
  unit,
  highlight,
}: {
  label: string
  value: number
  unit: string
  highlight?: boolean
}) {
  return (
    <div className="rounded-xl bg-[#0f0f1a] p-4 text-center">
      <div
        className={`text-2xl font-mono font-bold ${highlight ? 'text-[#4ade80]' : 'text-[#f0f0f5]'}`}
      >
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-[#7a7a95] mt-1">
        {label} <span className="text-[#4a4a65]">{unit}</span>
      </div>
    </div>
  )
}
