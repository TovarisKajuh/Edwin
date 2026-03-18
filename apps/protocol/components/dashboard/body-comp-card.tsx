'use client'

import { DashboardCard } from './dashboard-card'
import { getEstimatedWeight, getEstimatedBf } from '@/lib/body-stats'
import { getWeekNumber } from '@/lib/dates'
import { PROTOCOL_START_WEEK, PROTOCOL_END_WEEK } from '@/data/constants'

export function BodyCompCard() {
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

  // Build all 20 data points (week 3-22)
  const points: { week: number; weight: number }[] = []
  for (let w = PROTOCOL_START_WEEK; w <= PROTOCOL_END_WEEK; w++) {
    points.push({ week: w, weight: getEstimatedWeight(w) })
  }

  // SVG chart dimensions
  const chartWidth = 560
  const chartHeight = 200
  const padLeft = 40
  const padRight = 20
  const padTop = 20
  const padBottom = 30
  const plotW = chartWidth - padLeft - padRight
  const plotH = chartHeight - padTop - padBottom

  const allWeights = points.map((p) => p.weight)
  const minW = Math.floor(Math.min(...allWeights)) - 1
  const maxW = Math.ceil(Math.max(...allWeights)) + 1

  function xPos(w: number) {
    return padLeft + ((w - PROTOCOL_START_WEEK) / (PROTOCOL_END_WEEK - PROTOCOL_START_WEEK)) * plotW
  }
  function yPos(weight: number) {
    return padTop + plotH - ((weight - minW) / (maxW - minW)) * plotH
  }

  // Y-axis ticks
  const yTicks: number[] = []
  for (let v = Math.ceil(minW); v <= Math.floor(maxW); v++) {
    if (v % 5 === 0) yTicks.push(v)
  }
  // Ensure we have at least a few ticks
  if (yTicks.length < 2) {
    for (let v = Math.ceil(minW); v <= Math.floor(maxW); v += 2) {
      yTicks.push(v)
    }
  }

  // X-axis labels: specific weeks
  const xLabels = [3, 6, 10, 14, 18, 22]

  // Build polyline path
  const linePoints = points.map((p) => `${xPos(p.week)},${yPos(p.weight)}`).join(' ')

  // Build fill path (area under curve)
  const baseY = padTop + plotH
  const areaPath = [
    `M ${xPos(points[0].week)},${baseY}`,
    ...points.map((p) => `L ${xPos(p.week)},${yPos(p.weight)}`),
    `L ${xPos(points[points.length - 1].week)},${baseY}`,
    'Z',
  ].join(' ')

  // Current week X position
  const currentX = xPos(week)
  const currentY = yPos(currentWeight)

  function formatDelta(d: number) {
    if (d === 0) return '0.0'
    const sign = d < 0 ? '' : '+'
    return `${sign}${d.toFixed(1)}`
  }

  function deltaArrow(d: number) {
    return d < 0 ? '\u2193' : d > 0 ? '\u2191' : ''
  }

  function trendColor(d: number) {
    // For weight and BF, going down is good (green)
    return d <= 0 ? '#4ade80' : '#e5556a'
  }

  function trendBgColor(d: number) {
    return d <= 0 ? 'rgba(74,222,128,0.15)' : 'rgba(229,85,106,0.15)'
  }

  return (
    <DashboardCard title="Body Composition">
      {/* Hero metrics */}
      <div className="flex items-start gap-8 mb-6">
        {/* Weight */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-[48px] font-bold tracking-tight text-[#f0f0f5] leading-none">
              {currentWeight.toFixed(1)}
            </span>
            <span className="text-[12px] text-[#7a7b90]">kg</span>
          </div>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 mt-2"
            style={{ background: trendBgColor(weightDelta), color: trendColor(weightDelta) }}
          >
            {deltaArrow(weightDelta)} {formatDelta(weightDelta)}
          </span>
        </div>
        {/* BF% */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-[48px] font-bold tracking-tight text-[#f0f0f5] leading-none">
              {currentBf.toFixed(1)}
            </span>
            <span className="text-[12px] text-[#7a7b90]">% BF</span>
          </div>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-1 mt-2"
            style={{ background: trendBgColor(bfDelta), color: trendColor(bfDelta) }}
          >
            {deltaArrow(bfDelta)} {formatDelta(bfDelta)}
          </span>
        </div>
      </div>

      {/* SVG Line Chart */}
      <div className="rounded-xl bg-[#0f1020] p-3 -mx-1">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4ade80" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yTicks.map((v) => (
            <line
              key={v}
              x1={padLeft}
              y1={yPos(v)}
              x2={chartWidth - padRight}
              y2={yPos(v)}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Weight line */}
          <polyline
            points={linePoints}
            fill="none"
            stroke="#4ade80"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

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

          {/* Current week dot */}
          <circle cx={currentX} cy={currentY} r="5" fill="#fff" />
          <circle cx={currentX} cy={currentY} r="3" fill="#4ade80" />

          {/* Y-axis labels */}
          {yTicks.map((v) => (
            <text
              key={v}
              x={padLeft - 8}
              y={yPos(v) + 4}
              textAnchor="end"
              fill="#45465a"
              fontSize="11"
              fontFamily="monospace"
            >
              {v}
            </text>
          ))}

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
    </DashboardCard>
  )
}
