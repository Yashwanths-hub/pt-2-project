import { useEffect, useRef } from 'react'
import { AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react'
import './AlertLog.css'

const LEVEL_CONFIG = {
  yellow: { icon: AlertTriangle, color: 'var(--color-yellow)', label: 'Fatigue Onset' },
  red:    { icon: AlertOctagon,  color: 'var(--color-red)',    label: 'Failure Risk' },
  normal: { icon: CheckCircle,   color: 'var(--color-green)',  label: 'Normal' },
}

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function AlertItem({ alert, index }) {
  const cfg = LEVEL_CONFIG[alert.alert_level] || LEVEL_CONFIG.normal
  const Icon = cfg.icon
  return (
    <div
      className="alert-item animate-fade-in"
      style={{ '--delay': `${index * 30}ms` }}
    >
      <div className="alert-item-icon" style={{ color: cfg.color }}>
        <Icon size={16} />
      </div>
      <div className="alert-item-body">
        <div className="alert-item-title" style={{ color: cfg.color }}>
          {cfg.label}
        </div>
        <div className="alert-item-msg">{alert.message}</div>
      </div>
      <div className="alert-item-meta">
        <div className="alert-item-rep">Rep {alert.rep}</div>
        <div className="alert-item-time">{formatTime(alert.timestamp)}</div>
      </div>
    </div>
  )
}

export default function AlertLog({ alerts = [] }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [alerts.length])

  const sorted = [...alerts].sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div className="alert-log">
      {sorted.length === 0 ? (
        <div className="alert-log-empty">
          <CheckCircle size={32} style={{ color: 'var(--color-text-muted)' }} />
          <p>No alerts yet — system is monitoring</p>
        </div>
      ) : (
        sorted.map((alert, i) => (
          <AlertItem key={`${alert.timestamp}-${i}`} alert={alert} index={i} />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
