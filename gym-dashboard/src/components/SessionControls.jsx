import { useState, useEffect } from 'react'
import { Play, Square, RotateCcw, Timer } from 'lucide-react'
import './SessionControls.css'

function pad(n) {
  return String(Math.floor(n)).padStart(2, '0')
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${pad(m)}:${pad(s)}`
}

export default function SessionControls({ isRunning, onStart, onStop, startTime }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isRunning || !startTime) {
      setElapsed(0)
      return
    }
    const base = Math.floor(Date.now() / 1000 - startTime)
    setElapsed(base)
    const id = setInterval(() => {
      setElapsed(Math.floor(Date.now() / 1000 - startTime))
    }, 1000)
    return () => clearInterval(id)
  }, [isRunning, startTime])

  return (
    <div className="session-controls">
      {/* Timer */}
      <div className="session-timer">
        <Timer size={16} style={{ color: 'var(--color-text-muted)' }} />
        <span className={`timer-value ${isRunning ? 'timer-value--active' : ''}`}>
          {formatDuration(elapsed)}
        </span>
        <span className="timer-label">{isRunning ? 'Recording' : 'Stopped'}</span>
      </div>

      {/* Controls */}
      <div className="session-btns">
        {!isRunning ? (
          <button
            id="btn-start-session"
            className="btn btn-success btn-lg"
            onClick={onStart}
          >
            <Play size={18} />
            Start Session
          </button>
        ) : (
          <button
            id="btn-stop-session"
            className="btn btn-danger btn-lg"
            onClick={onStop}
          >
            <Square size={18} />
            Stop Session
          </button>
        )}
      </div>

      {/* Status pill */}
      <div className={`status-pill ${isRunning ? 'status-pill--live' : ''}`}>
        <span className="status-dot" />
        {isRunning ? 'Live' : 'Idle'}
      </div>
    </div>
  )
}
