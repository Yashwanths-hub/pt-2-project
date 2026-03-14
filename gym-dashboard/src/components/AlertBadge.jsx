import './AlertBadge.css'

const ALERT_CONFIG = {
  normal: {
    label: 'Normal',
    color: 'green',
    emoji: '🟢',
    desc: 'Smooth force curve, stable timing',
  },
  yellow: {
    label: 'Fatigue Onset',
    color: 'yellow',
    emoji: '🟡',
    desc: 'Force oscillations detected — take care',
  },
  red: {
    label: 'FAILURE RISK',
    color: 'red',
    emoji: '🔴',
    desc: 'Stop now! High variance & force drop',
  },
  safe: {
    label: 'Idle',
    color: 'gray',
    emoji: '⚪',
    desc: 'No active session',
  },
}

export default function AlertBadge({ alertLevel = 'safe', baseline_captured = false }) {
  const cfg = ALERT_CONFIG[alertLevel] || ALERT_CONFIG.safe

  return (
    <div className={`alert-badge alert-badge--${cfg.color}`}>
      {/* LED orb */}
      <div className={`led led--${cfg.color}`} aria-label={`${cfg.label} indicator`} />

      {/* Text info */}
      <div className="alert-badge-body">
        <div className="alert-badge-label">{cfg.label}</div>
        <div className="alert-badge-desc">{cfg.desc}</div>
      </div>

      {/* Buzzer icon for red */}
      {alertLevel === 'red' && (
        <div className="buzzer-icon" title="Auditory Alert Active">🔔</div>
      )}

      {/* Baseline indicator */}
      {!baseline_captured && alertLevel !== 'safe' && (
        <div className="baseline-badge">Calibrating…</div>
      )}
    </div>
  )
}
