import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts'

const ALERT_COLORS = {
  normal: '#a78bfa',
  yellow: '#f59e0b',
  red: '#ef4444',
  safe: '#71717a',
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1a1c24',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: '0.75rem',
        color: '#f0f1f5',
      }}>
        <div style={{ color: '#8b8fa8', marginBottom: 4 }}>t={label}</div>
        <div style={{ color: '#818cf8', fontWeight: 600 }}>
          Force: {payload[0]?.value?.toFixed(1)} N
        </div>
      </div>
    )
  }
  return null
}

export default function ForceGraph({ data = [], alertLevel = 'normal', baselineForce = null }) {
  const strokeColor = ALERT_COLORS[alertLevel] || ALERT_COLORS.normal

  // Keep only last 120 samples (~6 seconds at 20Hz)
  const displayData = useMemo(() => {
    const sliced = data.slice(-120)
    return sliced.map((d, i) => ({ ...d, idx: i }))
  }, [data])

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayData} margin={{ top: 8, right: 20, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="forceGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.6} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
          />
          <XAxis
            dataKey="idx"
            hide
          />
          <YAxis
            domain={[0, 320]}
            tick={{ fill: '#5a5e72', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}N`}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} />
          {baselineForce && (
            <ReferenceLine
              y={baselineForce}
              stroke="rgba(167,139,250,0.5)"
              strokeDasharray="4 4"
              label={{
                value: `Baseline ${baselineForce.toFixed(0)}N`,
                fill: '#a78bfa',
                fontSize: 11,
                position: 'insideTopLeft',
              }}
            />
          )}
          {/* Fatigue zone */}
          {baselineForce && (
            <ReferenceLine
              y={baselineForce * 0.9}
              stroke="rgba(245,158,11,0.3)"
              strokeDasharray="2 4"
            />
          )}
          {/* Failure zone */}
          {baselineForce && (
            <ReferenceLine
              y={baselineForce * 0.8}
              stroke="rgba(239,68,68,0.3)"
              strokeDasharray="2 4"
            />
          )}
          <Line
            type="monotone"
            dataKey="force"
            stroke={`url(#forceGradient)`}
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 4, fill: strokeColor, stroke: 'transparent' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
