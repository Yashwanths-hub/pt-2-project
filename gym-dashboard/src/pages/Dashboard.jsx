import { useState, useEffect, useRef, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import AlertBadge from '../components/AlertBadge'
import ForceGraph from '../components/ForceGraph'
import RepStats from '../components/RepStats'
import AlertLog from '../components/AlertLog'
import SessionControls from '../components/SessionControls'
import './Dashboard.css'

const API_BASE = 'http://localhost:8000'
const WS_URL = 'ws://localhost:8000/ws/stream'

const DEFAULT_SETTINGS = {
  baseline_reps: 5,
  fatigue_drop_pct: 10.0,
  failure_drop_pct: 20.0,
  failure_variance_threshold: 0.15,
}

export default function Dashboard() {
  const [isConnected, setIsConnected] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [alertLevel, setAlertLevel] = useState('safe')
  const [forceHistory, setForceHistory] = useState([])
  const [currentRep, setCurrentRep] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [statsData, setStatsData] = useState({})
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [errorMsg, setErrorMsg] = useState('')

  const wsRef = useRef(null)
  const reconnectRef = useRef(null)

  // ---------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------
  const connectWS = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return

    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setErrorMsg('')
        // Heartbeat
        const ping = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 10000)
        ws._pingInterval = ping
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.event === 'session_ended') {
            setIsRunning(false)
            setAlertLevel('safe')
            return
          }

          if (data.force !== undefined) {
            const point = { force: data.force, timestamp: data.timestamp }
            setForceHistory((prev) => [...prev.slice(-300), point])
            setAlertLevel(data.alert_level || 'normal')
            setCurrentRep(data.rep || 0)
            setStatsData((prev) => ({
              ...prev,
              currentRep: data.rep,
              currentForce: data.force,
              baselineForce: data.baseline_force,
              alertCount: data.alert_count,
              isBaselineCaptured: data.is_baseline_captured,
            }))
          }
        } catch {}
      }

      ws.onclose = () => {
        setIsConnected(false)
        clearInterval(ws._pingInterval)
        // Auto-reconnect every 3s
        reconnectRef.current = setTimeout(connectWS, 3000)
      }

      ws.onerror = () => {
        setIsConnected(false)
      }
    } catch {
      setErrorMsg('Cannot connect to backend. Is it running on port 8000?')
    }
  }, [])

  useEffect(() => {
    connectWS()
    return () => {
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connectWS])

  // Load settings from backend
  useEffect(() => {
    fetch(`${API_BASE}/settings`)
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {})
  }, [])

  // Poll alerts while running
  useEffect(() => {
    if (!isRunning || !sessionId) return
    const id = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/alerts?session_id=${sessionId}`)
        const alertsData = await r.json()
        setAlerts(alertsData)
      } catch {}
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, sessionId])

  // ---------------------------------------------------------------
  // Session Actions
  // ---------------------------------------------------------------
  const handleStart = async () => {
    try {
      setErrorMsg('')
      const body = {
        baseline_reps: settings.baseline_reps,
        fatigue_drop_pct: settings.fatigue_drop_pct,
        failure_drop_pct: settings.failure_drop_pct,
        failure_variance_threshold: settings.failure_variance_threshold,
      }
      const r = await fetch(`${API_BASE}/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const err = await r.json()
        throw new Error(err.detail || 'Failed to start session')
      }
      const session = await r.json()
      setSessionId(session.id)
      setStartTime(session.start_time)
      setIsRunning(true)
      setForceHistory([])
      setAlerts([])
      setCurrentRep(0)
      setAlertLevel('normal')
      setStatsData({})
    } catch (e) {
      setErrorMsg(e.message)
    }
  }

  const handleStop = async () => {
    try {
      setErrorMsg('')
      await fetch(`${API_BASE}/sessions/stop`, { method: 'POST' })
      setIsRunning(false)
      setAlertLevel('safe')
    } catch (e) {
      setErrorMsg(e.message)
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar isConnected={isConnected} />

      <div className="main-content">
        <div className="page-wrapper">
          {/* Header */}
          <div className="dashboard-header">
            <div className="page-header" style={{ marginBottom: 0 }}>
              <h1 className="page-title">Live Dashboard</h1>
              <p className="page-subtitle">
                Real-time load cell monitoring &amp; fatigue detection
              </p>
            </div>
            <SessionControls
              isRunning={isRunning}
              onStart={handleStart}
              onStop={handleStop}
              startTime={startTime}
            />
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="error-banner animate-fade-in">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Alert Status */}
          <div style={{ marginBottom: 20 }}>
            <AlertBadge
              alertLevel={isRunning ? alertLevel : 'safe'}
              baseline_captured={statsData.isBaselineCaptured}
            />
          </div>

          {/* Force Graph */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">
              📈 Force Curve — Real-Time Load Cell
              {sessionId && (
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.7rem',
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  Session #{sessionId}
                </span>
              )}
            </div>
            <ForceGraph
              data={forceHistory}
              alertLevel={isRunning ? alertLevel : 'normal'}
              baselineForce={statsData.baselineForce}
            />
            <div className="graph-legend">
              <span className="legend-item legend-item--indigo">Force (N)</span>
              {statsData.baselineForce && (
                <>
                  <span className="legend-item legend-item--gray">— Baseline</span>
                  <span className="legend-item legend-item--yellow">— Fatigue Threshold</span>
                  <span className="legend-item legend-item--red">— Failure Threshold</span>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ marginBottom: 20 }}>
            <RepStats
              data={{
                ...statsData,
                peakForce: statsData.baselineForce,
              }}
            />
          </div>

          {/* Alert Log */}
          <div className="card">
            <div className="card-title">🔔 Alert Log</div>
            <AlertLog alerts={alerts} />
          </div>

          {/* Detection stages info */}
          <div className="stages-grid" style={{ marginTop: 20 }}>
            {[
              {
                n: '01',
                title: 'Baseline Capture',
                desc: `First ${settings.baseline_reps} reps establish force & timing baseline`,
                color: 'var(--color-brand-light)',
              },
              {
                n: '02',
                title: 'Continuous Analysis',
                desc: 'Each rep compared to baseline in real-time',
                color: 'var(--color-text-secondary)',
              },
              {
                n: '03',
                title: 'Fatigue Detection',
                desc: `Force drop ≥${settings.fatigue_drop_pct}% → Yellow Alert`,
                color: 'var(--color-yellow)',
              },
              {
                n: '04',
                title: 'Failure Risk',
                desc: `Force drop ≥${settings.failure_drop_pct}% → Red Alert + Alarm`,
                color: 'var(--color-red)',
              },
            ].map((stage) => (
              <div key={stage.n} className="stage-card">
                <div className="stage-number" style={{ color: stage.color }}>
                  {stage.n}
                </div>
                <div className="stage-title">{stage.title}</div>
                <div className="stage-desc">{stage.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
