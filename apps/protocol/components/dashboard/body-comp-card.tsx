'use client'

import { useState, useEffect } from 'react'
import { DashboardCard } from './dashboard-card'
import { getEstimatedWeight, getEstimatedBf } from '@/lib/body-stats'
import { getWeekNumber } from '@/lib/dates'
import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK, LEAN_MASS } from '@/data/constants'
import { STRENGTH_PROJECTIONS } from '@/data/strength-projections'

// ─── Types ──────────────────────────────────────────────────────

interface WeeklyEntry {
  week: number
  weight?: number      // kg, from scale
  bf?: number          // %, from measurement
  muscle?: number      // kg lean mass
  strength?: number    // combined 1RM total (bench+squat+deadlift+ohp)
}

type MetricFilter = 'all' | 'weight' | 'bf'

// ─── Metric ranges for normalization ────────────────────────────

const RANGES = {
  weight:   { min: 78, max: 95 },
  bf:       { min: 10, max: 28 },
  muscle:   { min: 60, max: 72 },
  strength: { min: 200, max: 350 },
}

const COLORS = {
  weight:   '#4ade80',
  bf:       '#facc15',
  muscle:   '#a78bfa',
  strength: '#22d3ee',
}

// ─── Helpers ────────────────────────────────────────────────────

function normalize(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100
}

function getStrengthTotal(week: number): number {
  const p = STRENGTH_PROJECTIONS.find((s) => s.week === week)
  if (!p) return 0
  // Estimated 1RM using Epley formula: weight * (1 + reps/30)
  const e1rm = (lift: { weight: number; reps: number }) =>
    lift.weight * (1 + lift.reps / 30)
  return e1rm(p.bench) + e1rm(p.squat) + e1rm(p.deadlift) + e1rm(p.ohp)
}

function loadEntries(): WeeklyEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('protocol-entries')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// ─── Component ──────────────────────────────────────────────────

export function BodyCompCard() {
  const [filter, setFilter] = useState<MetricFilter>('all')
  const [entries, setEntries] = useState<WeeklyEntry[]>([])

  useEffect(() => {
    setEntries(loadEntries())
  }, [])

  const now = new Date()
  const rawWeek = getWeekNumber(now)
  const week =
    rawWeek >= PROTOCOL_START_WEEK && rawWeek <= PROTOCOL_END_WEEK
      ? rawWeek
      : PROTOCOL_START_WEEK

  const currentWeight = getEstimatedWeight(week)
  const currentBf = getEstimatedBf(week)

  const prevWeek = week > PROTOCOL_START_WEEK ? week - 1 : week
  const prevWeight = getEstimatedWeight(prevWeek)
  const prevBf = getEstimatedBf(prevWeek)
  const weightDelta = currentWeight - prevWeight
  const bfDelta = currentBf - prevBf

  // Check for actual entries for current week
  const currentEntry = entries.find((e) => e.week === week)
  const displayWeight = currentEntry?.weight ?? currentWeight
  const displayBf = currentEntry?.bf ?? currentBf
  const isWeightActual = currentEntry?.weight !== undefined
  const isBfActual = currentEntry?.bf !== undefined

  // ─── Build projected data (all 20 weeks) ──────────────────────

  interface ProjectedPoint {
    week: number
    weight: number
    bf: number
    muscle: number
    strength: number
  }

  const projected: ProjectedPoint[] = []
  for (let w = PROTOCOL_START_WEEK; w <= PROTOCOL_END_WEEK; w++) {
    projected.push({
      week: w,
      weight: getEstimatedWeight(w),
      bf: getEstimatedBf(w),
      muscle: LEAN_MASS, // flat projection — maintenance assumption
      strength: getStrengthTotal(w),
    })
  }

  // ─── Build actual data from localStorage entries ──────────────

  interface ActualPoint {
    week: number
    weight?: number
    bf?: number
    muscle?: number
    strength?: number
  }

  const actual: ActualPoint[] = entries
    .filter((e) => e.week >= PROTOCOL_START_WEEK && e.week <= PROTOCOL_END_WEEK)
    .sort((a, b) => a.week - b.week)

  // ─── SVG chart ────────────────────────────────────────────────

  const chartWidth = 560
  const chartHeight = 200
  const padLeft = 20
  const padRight = 20
  const padTop = 20
  const padBottom = 30
  const plotW = chartWidth - padLeft - padRight
  const plotH = chartHeight - padTop - padBottom

  function xPos(w: number) {
    return padLeft + ((w - PROTOCOL_START_WEEK) / (PROTOCOL_END_WEEK - PROTOCOL_START_WEEK)) * plotW
  }

  function yNorm(pct: number) {
    // pct is 0-100 normalized value; map to plot area (inverted Y)
    const clamped = Math.max(0, Math.min(100, pct))
    return padTop + plotH - (clamped / 100) * plotH
  }

  // Build polyline string for a metric's projected line
  function projectedPolyline(metric: keyof typeof RANGES) {
    return projected
      .map((p) => {
        const val = metric === 'weight' ? p.weight
          : metric === 'bf' ? p.bf
          : metric === 'muscle' ? p.muscle
          : p.strength
        const norm = normalize(val, RANGES[metric].min, RANGES[metric].max)
        return `${xPos(p.week)},${yNorm(norm)}`
      })
      .join(' ')
  }

  // Build polyline string for a metric's actual line
  function actualPolyline(metric: keyof typeof RANGES) {
    const pts = actual
      .filter((a) => {
        if (metric === 'weight') return a.weight !== undefined
        if (metric === 'bf') return a.bf !== undefined
        if (metric === 'muscle') return a.muscle !== undefined
        return a.strength !== undefined
      })
      .map((a) => {
        const val = metric === 'weight' ? a.weight!
          : metric === 'bf' ? a.bf!
          : metric === 'muscle' ? a.muscle!
          : a.strength!
        const norm = normalize(val, RANGES[metric].min, RANGES[metric].max)
        return `${xPos(a.week)},${yNorm(norm)}`
      })
    return pts.length >= 2 ? pts.join(' ') : null
  }

  // X-axis labels
  const xLabels = [3, 6, 10, 14, 18, 22]

  // Current week marker
  const currentX = xPos(week)

  // Which metrics to show
  const showWeight = filter === 'all' || filter === 'weight'
  const showBf = filter === 'all' || filter === 'bf'
  const showMuscle = filter === 'all'
  const showStrength = filter === 'all'

  // Build area fill for weight projected line
  const weightAreaPath = showWeight ? (() => {
    const baseY = padTop + plotH
    const pts = projected.map((p) => {
      const norm = normalize(p.weight, RANGES.weight.min, RANGES.weight.max)
      return `L ${xPos(p.week)},${yNorm(norm)}`
    })
    return [
      `M ${xPos(projected[0].week)},${baseY}`,
      ...pts,
      `L ${xPos(projected[projected.length - 1].week)},${baseY}`,
      'Z',
    ].join(' ')
  })() : null

  function formatDelta(d: number) {
    if (d === 0) return '0.0'
    const sign = d < 0 ? '' : '+'
    return `${sign}${d.toFixed(1)}`
  }

  function deltaArrow(d: number) {
    return d < 0 ? '\u2193' : d > 0 ? '\u2191' : ''
  }

  function trendColor(d: number) {
    return d <= 0 ? '#4ade80' : '#e5556a'
  }

  function trendBgColor(d: number) {
    return d <= 0 ? 'rgba(74,222,128,0.15)' : 'rgba(229,85,106,0.15)'
  }

  return (
    <DashboardCard
      title="Body Composition"
      controls={
        <div className="inline-flex rounded-full bg-[#0f1020] p-0.5">
          <button
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${filter === 'all' ? 'bg-white text-[#0b0d19]' : 'text-[#7a7b90]'}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${filter === 'weight' ? 'bg-white text-[#0b0d19]' : 'text-[#7a7b90]'}`}
            onClick={() => setFilter('weight')}
          >
            Weight
          </button>
          <button
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-200 ${filter === 'bf' ? 'bg-white text-[#0b0d19]' : 'text-[#7a7b90]'}`}
            onClick={() => setFilter('bf')}
          >
            Body Fat
          </button>
        </div>
      }
    >
      {/* Hero metrics */}
      <div className="flex items-start gap-8 mb-6">
        {/* Weight */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-[48px] font-bold tracking-tight text-[#f0f0f5] leading-none">
              {displayWeight.toFixed(1)}
            </span>
            <span className="text-[12px] text-[#7a7b90]">kg</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1"
              style={{ background: trendBgColor(weightDelta), color: trendColor(weightDelta) }}
            >
              {deltaArrow(weightDelta)} {formatDelta(weightDelta)}
            </span>
            <span className="text-[10px] text-[#45465a]">
              {isWeightActual ? 'actual' : 'projected'}
            </span>
          </div>
        </div>
        {/* BF% */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-[48px] font-bold tracking-tight text-[#f0f0f5] leading-none">
              {displayBf.toFixed(1)}
            </span>
            <span className="text-[12px] text-[#7a7b90]">% BF</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1"
              style={{ background: trendBgColor(bfDelta), color: trendColor(bfDelta) }}
            >
              {deltaArrow(bfDelta)} {formatDelta(bfDelta)}
            </span>
            <span className="text-[10px] text-[#45465a]">
              {isBfActual ? 'actual' : 'projected'}
            </span>
          </div>
        </div>
      </div>

      {/* SVG Line Chart */}
      <div className="rounded-xl bg-[#0f1020] p-3 -mx-1">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines — 5 horizontal */}
          {[0, 25, 50, 75, 100].map((pct) => (
            <line
              key={pct}
              x1={padLeft}
              y1={yNorm(pct)}
              x2={chartWidth - padRight}
              y2={yNorm(pct)}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
          ))}

          {/* Weight area fill (only when weight is visible) */}
          {showWeight && weightAreaPath && (
            <path d={weightAreaPath} fill="url(#weightAreaGrad)" />
          )}

          {/* Projected lines (dashed) */}
          {showWeight && (
            <polyline
              points={projectedPolyline('weight')}
              fill="none"
              stroke={COLORS.weight}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
              opacity="0.6"
            />
          )}
          {showBf && (
            <polyline
              points={projectedPolyline('bf')}
              fill="none"
              stroke={COLORS.bf}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
              opacity="0.6"
            />
          )}
          {showMuscle && (
            <polyline
              points={projectedPolyline('muscle')}
              fill="none"
              stroke={COLORS.muscle}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
              opacity="0.6"
            />
          )}
          {showStrength && (
            <polyline
              points={projectedPolyline('strength')}
              fill="none"
              stroke={COLORS.strength}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
              opacity="0.6"
            />
          )}

          {/* Actual lines (solid) — only rendered if 2+ data points */}
          {showWeight && actualPolyline('weight') && (
            <polyline
              points={actualPolyline('weight')!}
              fill="none"
              stroke={COLORS.weight}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {showBf && actualPolyline('bf') && (
            <polyline
              points={actualPolyline('bf')!}
              fill="none"
              stroke={COLORS.bf}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {showMuscle && actualPolyline('muscle') && (
            <polyline
              points={actualPolyline('muscle')!}
              fill="none"
              stroke={COLORS.muscle}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {showStrength && actualPolyline('strength') && (
            <polyline
              points={actualPolyline('strength')!}
              fill="none"
              stroke={COLORS.strength}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Current week vertical dashed line */}
          <line
            x1={currentX}
            y1={padTop}
            x2={currentX}
            y2={padTop + plotH}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Current week dot (on weight projected line) */}
          {showWeight && (() => {
            const norm = normalize(currentWeight, RANGES.weight.min, RANGES.weight.max)
            const cy = yNorm(norm)
            return (
              <>
                <circle cx={currentX} cy={cy} r="5" fill="#fff" />
                <circle cx={currentX} cy={cy} r="3" fill={COLORS.weight} />
              </>
            )
          })()}

          {/* X-axis labels */}
          {xLabels.map((w) => (
            <text
              key={w}
              x={xPos(w)}
              y={chartHeight - 4}
              textAnchor="middle"
              fill="#45465a"
              fontSize="11"
            >
              W{w}
            </text>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        {showWeight && (
          <div className="flex items-center gap-1.5">
            <span className="w-[8px] h-[8px] rounded-full" style={{ background: COLORS.weight }} />
            <span className="text-[11px] text-[#7a7b90]">Weight</span>
          </div>
        )}
        {showBf && (
          <div className="flex items-center gap-1.5">
            <span className="w-[8px] h-[8px] rounded-full" style={{ background: COLORS.bf }} />
            <span className="text-[11px] text-[#7a7b90]">Body Fat</span>
          </div>
        )}
        {showMuscle && (
          <div className="flex items-center gap-1.5">
            <span className="w-[8px] h-[8px] rounded-full" style={{ background: COLORS.muscle }} />
            <span className="text-[11px] text-[#7a7b90]">Muscle</span>
          </div>
        )}
        {showStrength && (
          <div className="flex items-center gap-1.5">
            <span className="w-[8px] h-[8px] rounded-full" style={{ background: COLORS.strength }} />
            <span className="text-[11px] text-[#7a7b90]">Strength</span>
          </div>
        )}
        <span className="text-[10px] text-[#45465a] ml-auto">dashed = projected</span>
      </div>
    </DashboardCard>
  )
}
