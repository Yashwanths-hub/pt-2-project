import { useState, useEffect } from 'react'
import { API_BASE } from '../utils/config'
import './History.css'

function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

function formatDuration(sec) {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}m ${s}s`
}

export default function History() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('http://localhost:8000/sessions')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch sessions')
        return res.json()
      })
      .then(data => {
        // Sort newest first
        const sorted = data.sort((a, b) => b.start_time - a.start_time)
        setSessions(sorted)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Session History</h1>
        <p className="page-subtitle">Review past workouts and alert events.</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="history-empty">Loading history...</div>
        ) : error ? (
          <div className="history-empty" style={{ color: 'var(--color-red)' }}>{error}</div>
        ) : sessions.length === 0 ? (
          <div className="history-empty">No sessions recorded yet.</div>
        ) : (
          <div className="table-container">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Total Reps</th>
                  <th>Peak Force</th>
                  <th>Alerts</th>
                  <th>Max Level</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td className="font-mono text-sm text-secondary">{s.id}</td>
                    <td>{formatTime(s.start_time)}</td>
                    <td>{formatDuration(s.duration_seconds)}</td>
                    <td>{s.total_reps}</td>
                    <td>{s.peak_force ? `${s.peak_force.toFixed(1)} N` : '—'}</td>
                    <td>
                      {s.alert_count > 0 ? (
                        <span className="text-yellow font-semibold">{s.alert_count}</span>
                      ) : (
                        <span className="text-muted">0</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${s.max_alert_level}`}>
                        {s.max_alert_level}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
