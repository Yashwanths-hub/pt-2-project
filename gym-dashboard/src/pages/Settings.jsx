import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'

export default function Settings() {
  const [settings, setSettings] = useState({
    baseline_reps: 5,
    fatigue_drop_pct: 10,
    failure_drop_pct: 20,
    failure_variance_threshold: 0.15
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('http://localhost:8000/settings')
      .then(res => res.json())
      .then(setSettings)
      .catch()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setSettings(s => ({ ...s, [name]: parseFloat(value) }))
    setMsg('')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('http://localhost:8000/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      if (!res.ok) throw new Error('Failed to save')
      setMsg('Settings saved successfully. Will apply on next session start.')
    } catch (e) {
      setMsg('Error saving settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">Detection Thresholds</h1>
        <p className="page-subtitle">Configure the 4-stage algorithm parameters.</p>
      </div>

      <div className="card" style={{ maxWidth: 600 }}>
        <div className="grid-2">
          
          <div style={{ marginBottom: 20 }}>
            <label>Baseline Rep Count</label>
            <input 
              type="number" 
              name="baseline_reps"
              className="input" 
              value={settings.baseline_reps} 
              onChange={handleChange}
              min={2} max={10}
            />
            <div className="text-xs text-muted mt-1" style={{ marginTop: 4 }}>
              Number of initial reps used to capture baseline metrics.
            </div>
          </div>

          <div style={{ marginBottom: 20 }}></div>

          <div style={{ marginBottom: 20 }}>
            <label>Fatigue Drop Threshold (%)</label>
            <input 
              type="number" 
              name="fatigue_drop_pct"
              className="input" 
              value={settings.fatigue_drop_pct} 
              onChange={handleChange}
              min={5} max={30} step={1}
            />
            <div className="text-xs text-muted mt-1" style={{ marginTop: 4 }}>
              Force drop % that triggers Yellow alert.
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Failure Drop Threshold (%)</label>
            <input 
              type="number" 
              name="failure_drop_pct"
              className="input" 
              value={settings.failure_drop_pct} 
              onChange={handleChange}
              min={10} max={50} step={1}
            />
            <div className="text-xs text-muted mt-1" style={{ marginTop: 4 }}>
              Force drop % that triggers Red alert.
            </div>
          </div>

          <div style={{ marginBottom: 20 }} className="col-span-2">
            <label>Failure Variance Threshold</label>
            <input 
              type="number" 
              name="failure_variance_threshold"
              className="input" 
              value={settings.failure_variance_threshold} 
              onChange={handleChange}
              min={0.05} max={0.5} step={0.01}
            />
            <div className="text-xs text-muted mt-1" style={{ marginTop: 4 }}>
              Normalized variance threshold for detecting severe instability (shaking).
            </div>
          </div>

        </div>

        <div className="divider" />

        <div className="flex items-center justify-between">
          <div className="text-sm font-medium" style={{ color: msg.includes('Error') ? 'var(--color-red)' : 'var(--color-green)' }}>
            {msg}
          </div>
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
