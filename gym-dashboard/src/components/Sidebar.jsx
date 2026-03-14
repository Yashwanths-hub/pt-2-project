import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  History,
  Settings,
  Zap,
  Wifi,
  WifiOff,
} from 'lucide-react'
import './Sidebar.css'

const navItems = [
  { to: '/',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history',  icon: History,         label: 'History'   },
  { to: '/settings', icon: Settings,        label: 'Settings'  },
]

export default function Sidebar({ isConnected }) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={20} strokeWidth={2.5} />
        </div>
        <div>
          <div className="sidebar-logo-name">GymSafe</div>
          <div className="sidebar-logo-sub">Injury Detection</div>
        </div>
      </div>

      <div className="sidebar-divider" />

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      {/* Connection badge */}
      <div className="sidebar-footer">
        <div className={`conn-badge ${isConnected ? 'conn-badge--on' : 'conn-badge--off'}`}>
          {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span>{isConnected ? 'Live' : 'Offline'}</span>
        </div>
        <div className="sidebar-footer-text">Load Cell Stream</div>
      </div>
    </aside>
  )
}
