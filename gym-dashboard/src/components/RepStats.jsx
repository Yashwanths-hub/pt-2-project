import { Activity, TrendingDown, Clock, AlertTriangle, Target } from 'lucide-react'

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="stat-card" style={{ borderColor: color ? `${color}33` : undefined }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <div className="stat-label">{label}</div>
        {Icon && (
          <Icon
            size={16}
            style={{ color: color || 'var(--color-text-muted)', opacity: 0.8 }}
          />
        )}
      </div>
      <div
        className="stat-value"
        style={{ color: color || 'var(--color-text-primary)' }}
      >
        {value ?? '—'}
      </div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export default function RepStats({ data }) {
  const {
    currentRep = 0,
    peakForce = null,
    baselineForce = null,
    alertCount = 0,
    currentForce = 0,
    isBaselineCaptured = false,
  } = data || {}

  const drop =
    baselineForce && peakForce
      ? (((baselineForce - peakForce) / baselineForce) * 100).toFixed(1)
      : null

  return (
    <div className="grid-4" style={{ gap: 12 }}>
      <StatCard
        label="Current Rep"
        value={currentRep || '—'}
        sub={isBaselineCaptured ? 'Monitoring active' : 'Calibrating…'}
        icon={Activity}
        color="var(--color-brand-light)"
      />
      <StatCard
        label="Live Force"
        value={`${currentForce.toFixed(1)} N`}
        sub="Real-time reading"
        icon={Target}
      />
      <StatCard
        label="Baseline Force"
        value={baselineForce ? `${baselineForce.toFixed(1)} N` : '—'}
        sub={isBaselineCaptured ? 'Captured from reps 1–5' : 'Not yet captured'}
        icon={TrendingDown}
        color={isBaselineCaptured ? 'var(--color-brand-light)' : undefined}
      />
      <StatCard
        label="Force Drop"
        value={drop !== null ? `${drop}%` : '—'}
        sub="vs baseline"
        color={
          drop === null
            ? undefined
            : drop >= 20
            ? 'var(--color-red)'
            : drop >= 10
            ? 'var(--color-yellow)'
            : 'var(--color-green)'
        }
        icon={TrendingDown}
      />
      <StatCard
        label="Alert Count"
        value={alertCount}
        sub="Yellow + Red events"
        icon={AlertTriangle}
        color={alertCount > 0 ? 'var(--color-yellow)' : undefined}
      />
    </div>
  )
}
