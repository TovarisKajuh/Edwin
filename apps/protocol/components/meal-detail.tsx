'use client'

import type { MealDetail as MealDetailType } from '@/data/types'

interface MealDetailProps {
  detail: MealDetailType
}

export function MealDetail({ detail }: MealDetailProps) {
  return (
    <div className="space-y-4">
      {detail.isIsotretinoinMeal && (
        <div className="bg-red-950/40 border-l-4 border-red-500 px-4 py-2.5 rounded-r-md">
          <p className="text-sm text-red-300 font-medium">
            40-50g fat required for isotretinoin absorption
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <MacroBox label="Calories" value={detail.calories} unit="kcal" large />
        <MacroBox label="Protein" value={detail.protein} unit="g" />
        <MacroBox label="Fat" value={detail.fat} unit="g" />
        <MacroBox label="Carbs" value={detail.carbs} unit="g" />
      </div>

      {detail.exampleMeals.length > 0 && (
        <div>
          <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Example meals</h4>
          <ul className="space-y-1">
            {detail.exampleMeals.map((meal, i) => (
              <li key={i} className="text-sm text-zinc-300">
                {meal}
              </li>
            ))}
          </ul>
        </div>
      )}

      {detail.supplementsWithMeal.length > 0 && (
        <div>
          <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5">
            Supplements with meal
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {detail.supplementsWithMeal.map((supp) => (
              <span
                key={supp.name}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-zinc-800 text-zinc-300"
                title={supp.why}
              >
                <span className="font-medium">{supp.name}</span>
                <span className="font-mono text-zinc-400">{supp.dose}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {detail.costNote && (
        <p className="text-xs text-zinc-500">{detail.costNote}</p>
      )}
    </div>
  )
}

function MacroBox({
  label,
  value,
  unit,
  large,
}: {
  label: string
  value: number
  unit: string
  large?: boolean
}) {
  return (
    <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className={`font-mono font-bold text-zinc-100 ${large ? 'text-xl' : 'text-base'}`}>
        {value.toLocaleString()}
        <span className="text-xs text-zinc-400 font-normal ml-0.5">{unit}</span>
      </div>
    </div>
  )
}
